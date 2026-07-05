// ============================================================
//  H2H PAGE — leaderboard of season head-to-head records
// ============================================================

let _h2hLbYear       = '2026';
let _h2hLbEvent      = 'all';
let _h2hLbRankedOnly = true;
let _h2hLbView       = 'table';
let _h2hCmpA         = null;
let _h2hCmpB         = null;
let _h2hSearch       = '';
const _h2hDetailMode = {};   // athleteId → 'beaten' | 'lost'
let _h2hCurrentRecs  = {};   // athleteId → rec (cached for toggle re-render)

const _H2H_MIN_RACES = 3;

function _wilsonScore(wins, total) {
  if (total === 0) return 0;
  const p = wins / total;
  const z = 1.645;
  return (p + z*z/(2*total) - z * Math.sqrt((p*(1-p) + z*z/(4*total))/total)) / (1 + z*z/total);
}

function _isRankedAthlete(id) {
  return Object.values(RANKINGS).some(list =>
    Array.isArray(list) && list.some(r => r && r.athleteId === id)
  );
}

function buildH2HPage() {
  _h2hLbYear       = '2026';
  _h2hLbEvent      = 'all';
  _h2hLbRankedOnly = true;
  _h2hLbView       = 'table';
  _renderH2HPage();
}

function _renderH2HPage() {
  const main = qs('#main');
  if (!main) return;

  const { records, totalEncounters } = _computeAllH2HRecords(_h2hLbYear, _h2hLbEvent, _h2hLbRankedOnly);
  _h2hCurrentRecs = records;

  const rows = Object.entries(records)
    .filter(([, r]) => r.wins + r.losses >= _H2H_MIN_RACES)
    .sort((a, b) => {
      const sa = _wilsonScore(a[1].wins, a[1].wins + a[1].losses);
      const sb = _wilsonScore(b[1].wins, b[1].wins + b[1].losses);
      if (Math.abs(sb - sa) > 0.001) return sb - sa;
      return b[1].wins - a[1].wins;
    });

  const allYears = new Set(['2026']);
  Object.values(ATHLETES).forEach(a =>
    Object.keys(a.resultsHistory || {}).forEach(y => allYears.add(y))
  );
  const years = [...allYears].sort((a, b) => parseInt(b) - parseInt(a));
  const EVENTS = ['all', '1500m', 'Mile', '800m', '3000m', '5000m'];

  const topAthlete = rows[0] ? ATHLETES[rows[0][0]] : null;
  const topRecord  = rows[0] ? rows[0][1] : null;

  const RANK_COLORS = ['#d4a000', '#999', '#b87333'];

  main.innerHTML = `
    <div class="container">
      <div class="h2h-page">

        <div class="rankings-page-header">
          <div class="rankings-page-header-left">
            <h1 class="rankings-page-title">Head to Head</h1>
            <p class="rankings-page-intro">Season win-loss records from direct race encounters</p>
          </div>
        </div>

        <!-- Stats strip -->
        ${rows.length > 0 ? `
        <div class="h2h-stats-strip">
          <div class="h2h-stat">
            <span class="h2h-stat-n">${rows.length}</span>
            <span class="h2h-stat-l">Athletes tracked</span>
          </div>
          <div class="h2h-stat-div"></div>
          <div class="h2h-stat">
            <span class="h2h-stat-n">${totalEncounters}</span>
            <span class="h2h-stat-l">H2H encounters</span>
          </div>
          ${topAthlete ? `
          <div class="h2h-stat-div"></div>
          <div class="h2h-stat">
            <span class="h2h-stat-n">${topAthlete.name.split(' ').slice(-1)[0]}</span>
            <span class="h2h-stat-l">Current leader · ${topRecord.wins}–${topRecord.losses}</span>
          </div>` : ''}
        </div>` : ''}

        <!-- Top Rivalries -->
        ${_renderRivalriesSection(_h2hLbYear, _h2hLbEvent, _h2hLbRankedOnly)}

        <!-- Compare Tool -->
        ${_renderCompareSection()}

        <!-- Controls -->
        <div class="h2h-lb-controls">
          <div class="h2h-lb-controls-left">
            <div class="h2h-lb-ctrl-group">
              <div class="h2h-lb-ctrl-label">Season</div>
              <div class="h2h-seg">
                ${years.map(y => `
                  <button class="h2h-seg-btn${y === _h2hLbYear ? ' active' : ''}"
                    onclick="h2hLbSetYear('${y}')">${y}</button>`).join('')}
              </div>
            </div>
            <div class="h2h-lb-ctrl-group">
              <div class="h2h-lb-ctrl-label">Opponents</div>
              <div class="h2h-seg">
                <button class="h2h-seg-btn${_h2hLbRankedOnly ? ' active' : ''}" onclick="if(!_h2hLbRankedOnly)h2hLbToggleRanked()">Ranked</button>
                <button class="h2h-seg-btn${!_h2hLbRankedOnly ? ' active' : ''}" onclick="if(_h2hLbRankedOnly)h2hLbToggleRanked()">All</button>
              </div>
            </div>
            <div class="h2h-lb-ctrl-group">
              <div class="h2h-lb-ctrl-label">View</div>
              <div class="h2h-seg">
                <button class="h2h-seg-btn${_h2hLbView === 'table' ? ' active' : ''}" onclick="h2hLbSetView('table')">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor" style="vertical-align:-1px;margin-right:3px">
                    <rect x="0" y="0" width="12" height="2" rx="1"/><rect x="0" y="4" width="12" height="2" rx="1"/><rect x="0" y="8" width="12" height="2" rx="1"/>
                  </svg>List</button>
                <button class="h2h-seg-btn${_h2hLbView === 'map' ? ' active' : ''}" onclick="h2hLbSetView('map')">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" style="vertical-align:-1px;margin-right:3px">
                    <rect x="0" y="0" width="5" height="5" rx="1"/><rect x="6" y="0" width="5" height="5" rx="1"/><rect x="0" y="6" width="5" height="5" rx="1"/><rect x="6" y="6" width="5" height="5" rx="1"/>
                  </svg>Map</button>
              </div>
            </div>
            <div class="h2h-lb-ctrl-group">
              <div class="h2h-lb-ctrl-label">Event</div>
              <div class="h2h-seg">
                ${EVENTS.map(ev => `
                  <button class="h2h-seg-btn${ev === _h2hLbEvent ? ' active' : ''}"
                    onclick="h2hLbSetEvent('${ev}')">${ev === 'all' ? 'All' : ev}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="h2h-lb-ctrl-group">
            <div class="h2h-lb-ctrl-label">Search</div>
            <input class="h2h-lb-search" placeholder="Filter athletes…" autocomplete="off"
              oninput="h2hLbSearch(this.value)" value="${_h2hSearch}">
          </div>
        </div>

        <!-- Content -->
        ${_h2hLbView === 'map'
          ? _renderDominanceMap(rows)
          : `<div id="h2h-col-sentinel"></div>
            <div class="h2h-col-labels">
              <span>#</span><span>Athlete</span><span>Record</span><span>Win %</span>
            </div>
            <div class="h2h-lb-wrap">
              ${rows.length === 0
                ? `<div class="h2h-lb-empty">No head-to-head data for this selection${_h2hLbRankedOnly ? ' — try switching to "All" opponents' : ''}.</div>`
                : `<table class="h2h-lb-table">
                    <tbody>
                      ${rows.map(([id, rec], i) => {
                        const a = ATHLETES[id];
                        if (!a) return '';
                        const total    = rec.wins + rec.losses;
                        const pct      = Math.round((rec.wins / total) * 100);
                        const rankColor = RANK_COLORS[i] || null;
                        const rankClass = i === 0 ? 'h2h-lb-row--gold' : i === 1 ? 'h2h-lb-row--silver' : i === 2 ? 'h2h-lb-row--bronze' : '';
                        const _MONTHS  = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
                        const _dateVal = d => { if (!d) return 0; const [m,dy] = d.split(' '); return (_MONTHS[m]||0)*100+(parseInt(dy)||0); };
                        const _seq = [...(rec.sequence||[])].sort((a,b)=>_dateVal(a.date)-_dateVal(b.date));
                        let _streak = 0, _streakWon = null;
                        for (let si = _seq.length - 1; si >= 0; si--) {
                          if (_streakWon === null) { _streakWon = _seq[si].won; _streak = 1; }
                          else if (_seq[si].won === _streakWon) _streak++;
                          else break;
                        }

                        const beatChips = Object.values(rec.matchups)
                          .filter(m => m.wins > 0)
                          .sort((a, b) => b.wins - a.wins || (b.wins + b.losses) - (a.wins + a.losses))
                          .slice(0, 3)
                          .map(m => {
                            const n = m.fullName.split(' ').slice(-1)[0];
                            return `<span class="h2h-lb-beat-chip">${n}<span class="h2h-lb-beat-rec">&thinsp;${m.wins}–${m.losses}</span></span>`;
                          }).join('');

                        const avatar = `<div class="h2h-lb-avatar" style="background-image:url('${a.photo || '/images/default_card.png'}');background-color:${a.photoBackground || '#111'}"></div>`;

                        return `
                          <tr class="h2h-lb-row ${rankClass}" id="h2h-row-${id}" onclick="h2hToggleExpand('${id}')">
                            <td class="h2h-lb-td h2h-lb-td--rank"${rankColor ? ` style="box-shadow:inset 4px 0 0 ${rankColor}"` : ''}>
                              <span class="h2h-lb-rank-num"${rankColor ? ` style="color:${rankColor}"` : ''}>${i + 1}</span>
                            </td>
                            <td class="h2h-lb-td h2h-lb-td--athlete">
                              ${avatar}
                              <div class="h2h-lb-ath-info">
                                <div class="h2h-lb-ath-name-row">
                                  <span class="h2h-lb-name h2h-lb-name--link" onclick="event.stopPropagation();openAthleteCard('${id}',null)">${a.name}</span>
                                  ${_seq.length ? `<span class="h2h-streak-pill h2h-streak-pill--${_streakWon?'w':'l'}">${_streakWon?'W':'L'}${_streak}</span>` : ''}
                                </div>
                                <div class="h2h-lb-ath-sub">
                                  <span class="h2h-lb-country">${renderFlag(a.flag)} ${a.country || ''}</span>
                                  ${beatChips ? `<span class="h2h-lb-beat-chips">${beatChips}</span>` : ''}
                                </div>
                              </div>
                              <svg class="h2h-expand-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </td>
                            <td class="h2h-lb-td h2h-lb-td--record">
                              <div class="h2h-lb-rec">
                                <span class="h2h-lb-rec-w">${rec.wins}</span><span class="h2h-lb-rec-sep">–</span><span class="h2h-lb-rec-l">${rec.losses}</span>
                              </div>
                            </td>
                            <td class="h2h-lb-td h2h-lb-td--pct">
                              <div class="h2h-lb-pct-wrap">
                                <span class="h2h-lb-pct-val">${pct}%</span>
                                <div class="h2h-lb-pct-bar">
                                  <div class="h2h-lb-pct-fill" style="width:${pct}%"></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                          <tr class="h2h-lb-detail" id="h2h-detail-${id}" style="display:none">
                            <td colspan="4" class="h2h-lb-detail-td">
                              <div class="h2h-lb-detail-inner">${_renderExpandDetail(id, rec)}</div>
                            </td>
                          </tr>`;
                      }).join('')}
                    </tbody>
                  </table>`
              }
            </div>`
        }

      </div>
    </div>
  `;

  // Sticky column-labels: sync widths to table, then activate mask
  const sentinel  = document.getElementById('h2h-col-sentinel');
  const colLabels = document.querySelector('.h2h-col-labels');
  if (sentinel && colLabels) {
    const syncWidths = () => {
      const firstRow = document.querySelector('.h2h-lb-row');
      if (!firstRow) return;
      const widths = [...firstRow.querySelectorAll('td')]
        .map(td => Math.round(td.getBoundingClientRect().width) + 'px');
      if (widths.some(w => w !== '0px')) colLabels.style.gridTemplateColumns = widths.join(' ');
    };
    setTimeout(syncWidths, 0);
    window.addEventListener('resize', syncWidths);
    new IntersectionObserver(([entry]) => {
      colLabels.classList.toggle('is-sticky', !entry.isIntersecting);
    }, { rootMargin: '-62px 0px 0px 0px', threshold: 0 }).observe(sentinel);
  }

  if (_h2hSearch) window.h2hLbSearch(_h2hSearch);
}

window.h2hLbSetYear      = y    => { _h2hLbYear  = y;   _renderH2HPage(); };
window.h2hLbSetEvent     = ev   => { _h2hLbEvent = ev;  _renderH2HPage(); };
window.h2hLbToggleRanked = ()   => { _h2hLbRankedOnly = !_h2hLbRankedOnly; _renderH2HPage(); };
window.h2hLbSetView      = view => { _h2hLbView  = view; _renderH2HPage(); };

window.h2hToggleExpand = (id) => {
  const detail = document.getElementById('h2h-detail-' + id);
  const row    = document.getElementById('h2h-row-' + id);
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  document.querySelectorAll('.h2h-lb-detail').forEach(d => { d.style.display = 'none'; });
  document.querySelectorAll('.h2h-lb-row').forEach(r => r.classList.remove('h2h-lb-row--expanded'));
  if (!isOpen) {
    detail.style.display = 'table-row';
    row?.classList.add('h2h-lb-row--expanded');
  }
};

function _renderExpandDetail(id, rec) {
  const mode = _h2hDetailMode[id] || 'beaten';

  const all = Object.values(rec.matchups || {});
  const beaten = all.filter(m => m.wins > 0).sort((a, b) => b.wins - a.wins || (b.wins + b.losses) - (a.wins + a.losses));
  const lostTo = all.filter(m => m.losses > 0).sort((a, b) => b.losses - a.losses || (b.wins + b.losses) - (a.wins + a.losses));
  const matchups = mode === 'beaten' ? beaten : lostTo;

  const toggle = `
    <div class="h2h-detail-toggle">
      <button class="h2h-detail-tab${mode === 'beaten' ? ' active' : ''}" onclick="h2hDetailToggle('${id}','beaten')">Beaten&thinsp;·&thinsp;${beaten.length}</button>
      <button class="h2h-detail-tab${mode === 'lost' ? ' active' : ''}" onclick="h2hDetailToggle('${id}','lost')">Lost to&thinsp;·&thinsp;${lostTo.length}</button>
    </div>`;

  if (matchups.length === 0) {
    return toggle + `<div class="h2h-detail-empty">${mode === 'beaten' ? 'No wins recorded' : 'No losses recorded'}</div>`;
  }

  const cards = matchups.map(m => {
    const opp = ATHLETES[m.id];
    const avatar = `<div class="h2h-detail-avatar" style="background-image:url('${opp?.photo || '/images/default_card.png'}');background-color:${opp?.photoBackground || '#111'}"></div>`;

    const recCls = m.wins > m.losses ? 'h2h-detail-opp-rec--win'
                 : m.losses > m.wins ? 'h2h-detail-opp-rec--loss'
                 : 'h2h-detail-opp-rec--split';

    const _renderRaceRow = r => {
      const tierBadge = (r.tier || 1) >= 2
        ? `<span class="h2h-detail-tier h2h-detail-tier--${r.tier === 3 ? 'champ' : 'major'}">${r.tier === 3 ? 'WC' : 'DL'}</span>`
        : '';
      const timesHtml = (r.myTime && r.theirTime)
        ? `<span class="h2h-detail-times">${r.myTime}<span class="h2h-detail-times-sep">to</span>${r.theirTime}</span>`
        : `<span class="h2h-detail-times">${r.myTime || ''}</span>`;
      return `
      <div class="h2h-detail-race">
        <span class="h2h-detail-arrow ${r.won ? 'h2h-detail-arrow--w' : 'h2h-detail-arrow--l'}">${r.won ? 'beat' : 'lost'}</span>
        ${tierBadge}
        <span class="h2h-detail-date">${r.date || ''}</span>
        <span class="h2h-detail-event">${r.event}</span>
        <span class="h2h-detail-meet">${r.meet.length > 38 ? r.meet.slice(0, 36) + '…' : r.meet}</span>
        ${timesHtml}
      </div>`;
    };

    const byYear = {};
    m.races.forEach(r => {
      const y = r.year || '2026';
      if (!byYear[y]) byYear[y] = { wins: 0, losses: 0, races: [] };
      byYear[y].races.push(r);
      if (r.won) byYear[y].wins++; else byYear[y].losses++;
    });
    const years = Object.keys(byYear).sort((a, b) => parseInt(b) - parseInt(a));
    const multiYear = years.length > 1;

    const raceRows = years.map(yr => {
      const yd = byYear[yr];
      const header = multiYear
        ? `<div class="h2h-detail-year-hd"><span class="h2h-detail-year">${yr}</span><span class="h2h-detail-year-rec">${yd.wins}–${yd.losses}</span></div>`
        : '';
      return header + yd.races.map(_renderRaceRow).join('');
    }).join('');

    return `
      <div class="h2h-detail-opp">
        <div class="h2h-detail-opp-hd">
          ${avatar}
          <span class="h2h-detail-opp-name">${m.fullName}</span>
          <span class="h2h-detail-opp-rec ${recCls}">${m.wins}–${m.losses}</span>
        </div>
        <div class="h2h-detail-races">${raceRows}</div>
      </div>`;
  }).join('');

  return toggle + cards;
}

window.h2hDetailToggle = (id, mode) => {
  _h2hDetailMode[id] = mode;
  const inner = document.querySelector(`#h2h-detail-${id} .h2h-lb-detail-inner`);
  if (inner && _h2hCurrentRecs[id]) inner.innerHTML = _renderExpandDetail(id, _h2hCurrentRecs[id]);
};

// ── Top Rivalries ─────────────────────────────────────────────

function _findTopRivalries(year, eventFilter, rankedOnly, count = 3) {
  const pairwise = _computePairwiseH2H(year, eventFilter, rankedOnly);
  const seen = new Set();
  const pairs = [];

  Object.entries(pairwise).forEach(([id1, opponents]) => {
    Object.entries(opponents).forEach(([id2, rec]) => {
      const key = [id1, id2].sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const total = rec.wins + rec.losses;
      if (total < 2) return;
      // score = 2 * min(wins, losses): rewards both volume and closeness
      const score = total - Math.abs(rec.wins - rec.losses);
      pairs.push({ id1, id2, a1rec: rec, a2rec: pairwise[id2]?.[id1], total, score });
    });
  });

  pairs.sort((a, b) => b.score - a.score || b.total - a.total);
  return pairs.slice(0, count);
}

function _renderRivalriesSection(year, eventFilter, rankedOnly) {
  const rivalries = _findTopRivalries(year, eventFilter, rankedOnly);
  if (!rivalries.length) return '';

  const rows = rivalries.map(r => {
    const a1 = ATHLETES[r.id1], a2 = ATHLETES[r.id2];
    if (!a1 || !a2) return '';
    const rec1 = r.a1rec;
    const rec2 = r.a2rec || { wins: rec1.losses, losses: rec1.wins };
    const n1 = a1.name.split(' ').slice(-1)[0];
    const n2 = a2.name.split(' ').slice(-1)[0];
    const overallLeader = rec1.wins > rec1.losses ? n1 : rec1.losses > rec1.wins ? n2 : null;

    // Championship note: surface when major-meet record differs from overall
    const cw = rec1.champWins || 0, cl = rec1.champLosses || 0;
    const champTotal = cw + cl;
    let champNote = '';
    if (champTotal > 0) {
      const champLeader = cw > cl ? n1 : cl > cw ? n2 : null;
      if (champLeader && overallLeader && champLeader !== overallLeader) {
        champNote = `but ${champLeader} leads in majors`;
      } else if (champLeader) {
        champNote = `${champLeader} ${cw}–${cl} in majors`;
      }
    }

    // Show score from the leader's perspective so it's always X-Y where X > Y
    const scoreA = rec1.wins >= rec1.losses ? rec1.wins : rec1.losses;
    const scoreB = rec1.wins >= rec1.losses ? rec1.losses : rec1.wins;

    return `
      <div class="h2h-rivalry-row">
        <div class="h2h-rivalry-avatars">
          <div class="h2h-rivalry-avatar" style="background-image:url('${a1.photo || ''}');background-color:${a1.photoBackground || '#1a1a2e'}"></div>
          <div class="h2h-rivalry-avatar" style="background-image:url('${a2.photo || ''}');background-color:${a2.photoBackground || '#1a1a2e'}"></div>
        </div>
        <div class="h2h-rivalry-names">
          <div class="h2h-rivalry-matchup">
            <span class="${overallLeader === n1 ? 'h2h-rivalry-name--lead' : ''}">${n1}</span><span class="h2h-rivalry-matchup-vs">vs</span><span class="${overallLeader === n2 ? 'h2h-rivalry-name--lead' : ''}">${n2}</span>
          </div>
          <div class="h2h-rivalry-meta">${overallLeader ? `${overallLeader} leads` : 'tied'} · ${r.total} meetings${champNote ? ` · ${champNote}` : ''}</div>
        </div>
        <div class="h2h-rivalry-result">
          <div class="h2h-rivalry-score">${scoreA}<span class="h2h-rivalry-score-sep">–</span>${scoreB}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="h2h-rivalries-section">
      <div class="h2h-rivalries-header">
        <div class="h2h-rivalries-title"><span class="h2h-rivalries-dot"></span>Top Rivalries</div>
        <div class="h2h-rivalries-season">${year} season</div>
      </div>
      ${rows}
    </div>`;
}

// ── Dominance Map ─────────────────────────────────────────────

function _renderDominanceMap(rows) {
  if (rows.length === 0) {
    return `<div class="h2h-lb-wrap"><div class="h2h-lb-empty">No head-to-head data for this selection.</div></div>`;
  }

  const pairwise = _computePairwiseH2H(_h2hLbYear, _h2hLbEvent, _h2hLbRankedOnly);
  const orderedIds = rows.map(([id]) => id);

  const colHeaders = orderedIds.map((id, ci) => {
    const a = ATHLETES[id];
    const name = a ? a.name.split(' ').slice(-1)[0] : id;
    return `<th class="h2h-map-th" title="${a ? a.name : id}">
      <div class="h2h-map-col-label">${name}</div>
    </th>`;
  }).join('');

  const bodyRows = orderedIds.map((rowId, ri) => {
    const rowAth = ATHLETES[rowId];
    const avatar = `<div class="h2h-map-avatar" style="background-image:url('${rowAth?.photo || '/images/default_card.png'}');background-color:${rowAth?.photoBackground || '#111'}"></div>`;

    const cells = orderedIds.map(colId => {
      if (rowId === colId) return `<td class="h2h-map-cell h2h-map-cell--self"></td>`;

      const pw = pairwise[rowId]?.[colId];
      if (!pw) return `<td class="h2h-map-cell h2h-map-cell--none">–</td>`;

      const cls = pw.wins > pw.losses ? 'h2h-map-cell--win'
                : pw.losses > pw.wins ? 'h2h-map-cell--loss'
                : 'h2h-map-cell--split';
      return `<td class="h2h-map-cell ${cls}" title="${rowAth?.name || rowId} vs ${ATHLETES[colId]?.name || colId}">${pw.wins}–${pw.losses}</td>`;
    }).join('');

    return `
      <tr class="h2h-map-row">
        <td class="h2h-map-row-head">
          <div class="h2h-map-row-head-inner">
            ${avatar}
            <span class="h2h-map-row-rank">${ri + 1}</span>
            <span class="h2h-map-row-name">${rowAth ? rowAth.name.split(' ').slice(-1)[0] : rowId}</span>
          </div>
        </td>
        ${cells}
      </tr>`;
  }).join('');

  return `
    <div class="h2h-map-wrap">
      <table class="h2h-map-table">
        <thead>
          <tr>
            <th class="h2h-map-corner"></th>
            ${colHeaders}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div class="h2h-map-legend">
        <span class="h2h-map-legend-item h2h-map-legend--win">Win</span>
        <span class="h2h-map-legend-item h2h-map-legend--loss">Loss</span>
        <span class="h2h-map-legend-item h2h-map-legend--split">Split</span>
        <span class="h2h-map-legend-item h2h-map-legend--none">No meeting</span>
      </div>
    </div>`;
}

// Returns { label, cls } for a race margin, or null if times unavailable
function _normalizeEvent(e) {
  return (e || '').trim().toLowerCase().replace(/\s+/g, '');
}

function _raceMargin(myTime, theirTime) {
  const t1 = parseTimeToSecs(myTime), t2 = parseTimeToSecs(theirTime);
  if (!t1 || !t2 || !isFinite(t1) || !isFinite(t2)) return null;
  const diff = Math.abs(t1 - t2);
  if (diff <= 1.50) return { label: `+${diff.toFixed(2)}`, cls: 'close' };
  const label = diff < 60 ? `+${diff.toFixed(1)}s` : `+${Math.floor(diff / 60)}:${(diff % 60).toFixed(1).padStart(4, '0')}`;
  return { label, cls: 'dominant' };
}

// Tier 3 = World/Olympic championships, Tier 2 = Diamond League + major invitationals, Tier 1 = everything else
function _meetTier(meet) {
  const m = (meet || '').toLowerCase();
  if (/world athletics (indoor )?championships|olympic games|world championships in athletics/.test(m)) return 3;
  if (/bislett|lausanne|zurich|zürich|monaco|golden gala|golden spike|bauhaus|galan|meeting de paris|prefontaine|millrose|new balance (indoor )?grand prix|wanda diamond|diamond league|rabat|meeting international mohammed|ostrava|fbk games/.test(m)) return 2;
  return 1;
}

function _computePairwiseH2H(year, eventFilter, rankedOnly) {
  const pairwise = {};

  const getResults = a =>
    year === '2026' ? (a.results || []) : ((a.resultsHistory || {})[year] || []);

  const athletes = Object.values(ATHLETES).filter(a => getResults(a).length > 0);

  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a1 = athletes[i], a2 = athletes[j];
      if (rankedOnly && !_isRankedAthlete(a1.id) && !_isRankedAthlete(a2.id)) continue;

      const r1 = getResults(a1), r2 = getResults(a2);

      r1.forEach(race1 => {
        if (!race1.meet || !race1.event) return;
        if (!_h2hEventMatches(race1.event, eventFilter)) return;

        const match = r2.find(race2 =>
          race2.meet && race2.event &&
          race1.meet.trim().toLowerCase() === race2.meet.trim().toLowerCase() &&
          _normalizeEvent(race1.event) === _normalizeEvent(race2.event)
        );
        if (!match) return;

        const p1 = parseInt(race1.place), p2 = parseInt(match.place);
        const t1s = parseTimeToSecs(race1.time), t2s = parseTimeToSecs(match.time);

        // If both times and places exist but disagree on order → different heats → skip
        if (t1s && t2s && !isNaN(p1) && !isNaN(p2) && p1 !== p2) {
          if ((p1 < p2) !== (t1s < t2s)) return;
        }

        let a1wins = false, a2wins = false;
        if (t1s && t2s)                    { a1wins = t1s < t2s; a2wins = t2s < t1s; }
        else if (!isNaN(p1) && !isNaN(p2)) { a1wins = p1 < p2;  a2wins = p2 < p1;  }
        else return;

        if (!pairwise[a1.id]) pairwise[a1.id] = {};
        if (!pairwise[a2.id]) pairwise[a2.id] = {};
        if (!pairwise[a1.id][a2.id]) pairwise[a1.id][a2.id] = { wins: 0, losses: 0, champWins: 0, champLosses: 0 };
        if (!pairwise[a2.id][a1.id]) pairwise[a2.id][a1.id] = { wins: 0, losses: 0, champWins: 0, champLosses: 0 };

        const tier = _meetTier(race1.meet);
        if (a1wins) {
          pairwise[a1.id][a2.id].wins++;
          pairwise[a2.id][a1.id].losses++;
          if (tier >= 2) { pairwise[a1.id][a2.id].champWins++; pairwise[a2.id][a1.id].champLosses++; }
        } else if (a2wins) {
          pairwise[a2.id][a1.id].wins++;
          pairwise[a1.id][a2.id].losses++;
          if (tier >= 2) { pairwise[a2.id][a1.id].champWins++; pairwise[a1.id][a2.id].champLosses++; }
        }
      });
    }
  }

  return pairwise;
}

// ── Core computation ──────────────────────────────────────────

function _h2hEventMatches(event, filter) {
  if (filter === 'all') return true;
  const e = (event || '').toLowerCase();
  const f = filter.toLowerCase();
  if (f === '1500m') return e.includes('1500');
  if (f === 'mile')  return e.includes('mile') && !e.includes('2 mile') && !e.includes('1500');
  if (f === '800m')  return e.includes('800');
  if (f === '3000m') return e.includes('3000') && !e.includes('10000');
  if (f === '5000m') return e.includes('5000') && !e.includes('10000');
  return e.includes(f);
}

function _computeAllH2HRecords(year, eventFilter, rankedOnly) {
  const records = {};
  let totalEncounters = 0;

  const getResults = a =>
    year === '2026' ? (a.results || []) : ((a.resultsHistory || {})[year] || []);

  const athletes = Object.values(ATHLETES).filter(a => getResults(a).length > 0);

  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a1 = athletes[i], a2 = athletes[j];
      if (rankedOnly && !_isRankedAthlete(a1.id) && !_isRankedAthlete(a2.id)) continue;

      const r1 = getResults(a1), r2 = getResults(a2);

      r1.forEach(race1 => {
        if (!race1.meet || !race1.event) return;
        if (!_h2hEventMatches(race1.event, eventFilter)) return;

        const match = r2.find(race2 =>
          race2.meet && race2.event &&
          race1.meet.trim().toLowerCase() === race2.meet.trim().toLowerCase() &&
          _normalizeEvent(race1.event) === _normalizeEvent(race2.event)
        );
        if (!match) return;

        const p1 = parseInt(race1.place), p2 = parseInt(match.place);
        const t1s = parseTimeToSecs(race1.time), t2s = parseTimeToSecs(match.time);

        // If both times and places exist but disagree on order → different heats → skip
        if (t1s && t2s && !isNaN(p1) && !isNaN(p2) && p1 !== p2) {
          if ((p1 < p2) !== (t1s < t2s)) return;
        }

        let a1wins = false, a2wins = false;
        if (t1s && t2s)                    { a1wins = t1s < t2s; a2wins = t2s < t1s; }
        else if (!isNaN(p1) && !isNaN(p2)) { a1wins = p1 < p2;  a2wins = p2 < p1;  }
        else return;

        const n1 = a1.name.split(' ').slice(-1)[0];
        const n2 = a2.name.split(' ').slice(-1)[0];
        const a1ranked = _isRankedAthlete(a1.id);
        const a2ranked = _isRankedAthlete(a2.id);
        const countForA1 = !rankedOnly || a2ranked;
        const countForA2 = !rankedOnly || a1ranked;

        if (countForA1) {
          if (!records[a1.id]) records[a1.id] = { wins: 0, losses: 0, beatCounts: {}, matchups: {}, sequence: [] };
          if (!records[a1.id].matchups[a2.id]) records[a1.id].matchups[a2.id] = { fullName: a2.name, id: a2.id, wins: 0, losses: 0, races: [] };
          if (a1wins) { records[a1.id].wins++; records[a1.id].beatCounts[n2] = (records[a1.id].beatCounts[n2] || 0) + 1; records[a1.id].matchups[a2.id].wins++; }
          else if (a2wins) { records[a1.id].losses++; records[a1.id].matchups[a2.id].losses++; }
          records[a1.id].matchups[a2.id].races.push({ year, date: race1.date, meet: race1.meet, event: race1.event, won: a1wins, myTime: race1.time, theirTime: match.time, tier: _meetTier(race1.meet) });
          records[a1.id].sequence.push({ date: race1.date, won: a1wins });
        }
        if (countForA2) {
          if (!records[a2.id]) records[a2.id] = { wins: 0, losses: 0, beatCounts: {}, matchups: {}, sequence: [] };
          if (!records[a2.id].matchups[a1.id]) records[a2.id].matchups[a1.id] = { fullName: a1.name, id: a1.id, wins: 0, losses: 0, races: [] };
          if (a2wins) { records[a2.id].wins++; records[a2.id].beatCounts[n1] = (records[a2.id].beatCounts[n1] || 0) + 1; records[a2.id].matchups[a1.id].wins++; }
          else if (a1wins) { records[a2.id].losses++; records[a2.id].matchups[a1.id].losses++; }
          records[a2.id].matchups[a1.id].races.push({ year, date: race1.date, meet: race1.meet, event: race1.event, won: a2wins, myTime: match.time, theirTime: race1.time, tier: _meetTier(race1.meet) });
          records[a2.id].sequence.push({ date: race1.date, won: a2wins });
        }

        totalEncounters++;
      });
    }
  }

  return { records, totalEncounters };
}

// ── Compare Tool ──────────────────────────────────────────────

function _computePairMatchup(id1, id2) {
  const a1 = ATHLETES[id1], a2 = ATHLETES[id2];
  if (!a1 || !a2) return null;

  const getResults = (a, year) =>
    year === '2026' ? (a.results || []) : ((a.resultsHistory || {})[year] || []);

  const allYears = new Set(['2026']);
  Object.keys(a1.resultsHistory || {}).forEach(y => allYears.add(y));
  Object.keys(a2.resultsHistory || {}).forEach(y => allYears.add(y));

  const races = [];
  let wins = 0, losses = 0;

  [...allYears].sort((a, b) => parseInt(b) - parseInt(a)).forEach(year => {
    const r1 = getResults(a1, year), r2 = getResults(a2, year);
    r1.forEach(race1 => {
      if (!race1.meet || !race1.event) return;
      const match = r2.find(r => r.meet && r.event &&
        race1.meet.trim().toLowerCase() === r.meet.trim().toLowerCase() &&
        _normalizeEvent(race1.event) === _normalizeEvent(r.event)
      );
      if (!match) return;

      const p1 = parseInt(race1.place), p2 = parseInt(match.place);
      const t1s = parseTimeToSecs(race1.time), t2s = parseTimeToSecs(match.time);

      if (t1s && t2s && !isNaN(p1) && !isNaN(p2) && p1 !== p2) {
        if ((p1 < p2) !== (t1s < t2s)) return;
      }

      let won;
      if (t1s && t2s)                    won = t1s < t2s;
      else if (!isNaN(p1) && !isNaN(p2)) won = p1 < p2;
      else return;

      if (won) wins++; else losses++;
      races.push({ year, date: race1.date, meet: race1.meet, event: race1.event, won, myTime: race1.time, theirTime: match.time, tier: _meetTier(race1.meet) });
    });
  });

  return { wins, losses, races };
}

function _renderComparePicker(slot) {
  const selId    = slot === 'a' ? _h2hCmpA : _h2hCmpB;
  const otherId  = slot === 'a' ? _h2hCmpB : _h2hCmpA;
  const athlete  = selId ? ATHLETES[selId] : null;

  if (athlete) {
    return `
      <div class="h2h-cmp-selected">
        <div class="h2h-cmp-sel-avatar" style="background-image:url('${athlete.photo || '/images/default_card.png'}');background-color:${athlete.photoBackground || '#111'}"></div>
        <span class="h2h-cmp-sel-name">${athlete.name}</span>
        <button class="h2h-cmp-clear" onclick="event.stopPropagation();h2hCmpClear('${slot}')">×</button>
      </div>`;
  }

  const athletes = Object.values(ATHLETES)
    .filter(a => a.name && a.id !== otherId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const items = athletes.map(a =>
    `<div class="h2h-cmp-item" onclick="h2hCmpSelect('${slot}','${a.id}')">${a.name}</div>`
  ).join('');

  return `
    <div class="h2h-cmp-input-wrap">
      <input class="h2h-compare-input" placeholder="Search athlete…" autocomplete="off"
        oninput="h2hCmpFilter(this,'${slot}')"
        onfocus="h2hCmpShowList('${slot}')"
        onblur="setTimeout(()=>h2hCmpHideList('${slot}'),150)">
      <div class="h2h-cmp-list" id="h2h-cmp-list-${slot}" style="display:none">
        ${items}
      </div>
    </div>`;
}

function _renderCompareSection() {
  const hasResult = _h2hCmpA && _h2hCmpB;
  const body = hasResult
    ? _renderCompareMatchup()
    : `<div class="h2h-compare-empty">Select two athletes to compare their head-to-head record</div>`;

  return `
    <div class="h2h-compare-section">
      <div class="h2h-compare-hd">
        <span class="h2h-compare-title">Compare Athletes</span>
      </div>
      <div class="h2h-compare-pickers">
        <div class="h2h-compare-picker">${_renderComparePicker('a')}</div>
        <div class="h2h-compare-vs">vs</div>
        <div class="h2h-compare-picker">${_renderComparePicker('b')}</div>
      </div>
      ${body}
    </div>`;
}

function _renderCompareMatchup() {
  const a1 = ATHLETES[_h2hCmpA], a2 = ATHLETES[_h2hCmpB];
  if (!a1 || !a2) return '';

  const { wins, losses, races } = _computePairMatchup(_h2hCmpA, _h2hCmpB);
  const total = wins + losses;

  if (total === 0) {
    const n1 = a1.name.split(' ').slice(-1)[0], n2 = a2.name.split(' ').slice(-1)[0];
    return `<div class="h2h-compare-empty">No head-to-head meetings found between ${n1} and ${n2}.</div>`;
  }

  const n1 = a1.name.split(' ').slice(-1)[0], n2 = a2.name.split(' ').slice(-1)[0];
  const leader = wins > losses ? n1 : losses > wins ? n2 : null;

  // Sort all races most-recent first
  const _MO = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
  const _raceDate = r => {
    const p = (r.date || '').split(' ');
    return parseInt(r.year || 0) * 10000 + (_MO[p[0]] || 0) * 100 + (parseInt(p[1]) || 0);
  };
  const sorted = [...races].sort((a, b) => _raceDate(b) - _raceDate(a));

  // Split into recent (top 3) and earlier — only when there are enough meetings
  const RECENT_N = 3;
  const splitView = total > RECENT_N;
  const recent = splitView ? sorted.slice(0, RECENT_N) : sorted;
  const older  = splitView ? sorted.slice(RECENT_N) : [];

  const recentW = recent.filter(r => r.won).length;
  const recentL = recent.length - recentW;
  const recentLeader = recentW > recentL ? n1 : recentL > recentW ? n2 : null;

  const renderRow = (r, isRecent) => {
    const tierBadge = (r.tier || 1) >= 2
      ? `<span class="h2h-detail-tier h2h-detail-tier--${r.tier === 3 ? 'champ' : 'major'}">${r.tier === 3 ? 'WC' : 'DL'}</span>`
      : '';
    const timesHtml = (r.myTime && r.theirTime)
      ? `<span class="h2h-detail-times">${r.myTime}<span class="h2h-detail-times-sep">vs</span>${r.theirTime}</span>`
      : `<span class="h2h-detail-times">${r.myTime || ''}</span>`;
    const dateStr = r.year !== '2026' ? `${r.year} ${r.date || ''}` : (r.date || '');
    return `
      <div class="h2h-detail-race${isRecent ? ' h2h-detail-race--recent' : ''}">
        <span class="h2h-detail-arrow ${r.won ? 'h2h-detail-arrow--w' : 'h2h-detail-arrow--l'}">${r.won ? 'beat' : 'lost'}</span>
        ${tierBadge}
        <span class="h2h-detail-date">${dateStr}</span>
        <span class="h2h-detail-event">${r.event}</span>
        <span class="h2h-detail-meet">${r.meet.length > 38 ? r.meet.slice(0, 36) + '…' : r.meet}</span>
        ${timesHtml}
      </div>`;
  };

  const recentHeader = splitView
    ? `<div class="h2h-cmp-section-hd">
         <span class="h2h-cmp-section-title">Recent form</span>
         <span class="h2h-cmp-section-rec">${recentW}–${recentL}${recentLeader ? ` · ${recentLeader}` : ' · tied'}</span>
       </div>`
    : '';
  const olderHeader = older.length
    ? `<div class="h2h-cmp-section-hd h2h-cmp-section-hd--faded">
         <span class="h2h-cmp-section-title">Earlier</span>
       </div>`
    : '';

  const raceRows = recentHeader
    + recent.map(r => renderRow(r, splitView)).join('')
    + olderHeader
    + older.map(r => renderRow(r, false)).join('');

  return `
    <div class="h2h-compare-result">
      <div class="h2h-compare-summary">
        <div class="h2h-cmp-ath">
          <div class="h2h-cmp-ath-avatar" style="background-image:url('${a1.photo || '/images/default_card.png'}');background-color:${a1.photoBackground || '#111'}"></div>
          <span class="h2h-cmp-ath-name">${a1.name}</span>
        </div>
        <div class="h2h-cmp-score">
          <div class="h2h-cmp-score-main">
            <span class="${wins > losses ? 'h2h-cmp-score--lead' : ''}">${wins}</span><span class="h2h-cmp-score-sep">–</span><span class="${losses > wins ? 'h2h-cmp-score--lead' : ''}">${losses}</span>
          </div>
          <div class="h2h-cmp-score-meta">${total} meeting${total !== 1 ? 's' : ''}${leader ? ` · ${leader} leads` : ' · tied'}</div>
        </div>
        <div class="h2h-cmp-ath h2h-cmp-ath--right">
          <div class="h2h-cmp-ath-avatar" style="background-image:url('${a2.photo || '/images/default_card.png'}');background-color:${a2.photoBackground || '#111'}"></div>
          <span class="h2h-cmp-ath-name">${a2.name}</span>
        </div>
      </div>
      <div class="h2h-compare-races">${raceRows}</div>
    </div>`;
}

window.h2hCmpFilter = (input, slot) => {
  const q = input.value.toLowerCase();
  const list = document.getElementById(`h2h-cmp-list-${slot}`);
  if (!list) return;
  list.querySelectorAll('.h2h-cmp-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};

window.h2hCmpShowList = (slot) => {
  const list = document.getElementById(`h2h-cmp-list-${slot}`);
  if (list) list.style.display = '';
};

window.h2hCmpHideList = (slot) => {
  const list = document.getElementById(`h2h-cmp-list-${slot}`);
  if (list) list.style.display = 'none';
};

window.h2hCmpSelect = (slot, id) => {
  if (slot === 'a') _h2hCmpA = id; else _h2hCmpB = id;
  _renderH2HPage();
};

window.h2hCmpClear = (slot) => {
  if (slot === 'a') _h2hCmpA = null; else _h2hCmpB = null;
  _renderH2HPage();
};

window.h2hLbSearch = (q) => {
  _h2hSearch = (q || '').toLowerCase();
  document.querySelectorAll('.h2h-lb-row').forEach(row => {
    const name = (row.querySelector('.h2h-lb-name')?.textContent || '').toLowerCase();
    const show = !_h2hSearch || name.includes(_h2hSearch);
    row.style.display = show ? '' : 'none';
    const detail = document.getElementById(row.id.replace('h2h-row-', 'h2h-detail-'));
    if (detail && !show) detail.style.display = 'none';
  });
};

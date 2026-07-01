// ============================================================
//  H2H PAGE — leaderboard of season head-to-head records
// ============================================================

let _h2hLbYear       = '2026';
let _h2hLbEvent      = 'all';
let _h2hLbRankedOnly = true;
let _h2hLbView       = 'table';

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
          </div>
          <div class="h2h-lb-ctrl-group h2h-lb-ctrl-group--right">
            <div class="h2h-lb-ctrl-label">Filter by event</div>
            <div class="h2h-seg">
              ${EVENTS.map(ev => `
                <button class="h2h-seg-btn${ev === _h2hLbEvent ? ' active' : ''}"
                  onclick="h2hLbSetEvent('${ev}')">${ev === 'all' ? 'All' : ev}</button>`).join('')}
            </div>
          </div>
        </div>

        <!-- Content -->
        ${_h2hLbView === 'map'
          ? _renderDominanceMap(rows)
          : `<div class="h2h-lb-wrap">
              ${rows.length === 0
                ? `<div class="h2h-lb-empty">No head-to-head data for this selection${_h2hLbRankedOnly ? ' — try switching to "All" opponents' : ''}.</div>`
                : `<table class="h2h-lb-table">
                    <thead>
                      <tr>
                        <th class="h2h-lb-th h2h-lb-th--rank">#</th>
                        <th class="h2h-lb-th h2h-lb-th--athlete">Athlete</th>
                        <th class="h2h-lb-th h2h-lb-th--record">Record</th>
                        <th class="h2h-lb-th h2h-lb-th--pct">Win %</th>
                        <th class="h2h-lb-th h2h-lb-th--form">Form</th>
                        <th class="h2h-lb-th h2h-lb-th--wins">Key Wins</th>
                      </tr>
                    </thead>
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
                        const formDots = [...(rec.sequence||[])].sort((a,b)=>_dateVal(a.date)-_dateVal(b.date)).slice(-10)
                          .map(s=>`<span class="h2h-form-dot h2h-form-dot--${s.won?'w':'l'}" title="${s.date||''}">${s.won?'W':'L'}</span>`).join('');

                        const keyWins  = Object.entries(rec.beatCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 4)
                          .map(([n, ct]) => `<span class="h2h-lb-win-tag">${n}${ct > 1 ? `<span class="h2h-win-x"> ×${ct}</span>` : ''}</span>`).join('');

                        const avatar = a.photo
                          ? `<div class="h2h-lb-avatar" style="background-image:url('${a.photo}');background-color:${a.photoBackground || '#111'}"></div>`
                          : `<div class="h2h-lb-avatar h2h-lb-avatar--ph" style="background-color:${a.photoBackground || '#1a1a1a'}"></div>`;

                        return `
                          <tr class="h2h-lb-row ${rankClass}" id="h2h-row-${id}" onclick="h2hToggleExpand('${id}')">
                            <td class="h2h-lb-td h2h-lb-td--rank"${rankColor ? ` style="box-shadow:inset 4px 0 0 ${rankColor}"` : ''}>
                              <span class="h2h-lb-rank-num"${rankColor ? ` style="color:${rankColor}"` : ''}>${i + 1}</span>
                            </td>
                            <td class="h2h-lb-td h2h-lb-td--athlete">
                              ${avatar}
                              <div class="h2h-lb-ath-info">
                                <span class="h2h-lb-name h2h-lb-name--link" onclick="event.stopPropagation();openAthleteCard('${id}',null)">${a.name}</span>
                                <span class="h2h-lb-country">${renderFlag(a.flag)} ${a.country || ''}</span>
                              </div>
                              <svg class="h2h-expand-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </td>
                            <td class="h2h-lb-td h2h-lb-td--record">
                              <div class="h2h-lb-rec">
                                <span class="h2h-lb-rec-w">${rec.wins}</span><span class="h2h-lb-rec-sep">–</span><span class="h2h-lb-rec-l">${rec.losses}</span>
                              </div>
                              <div class="h2h-lb-rec-sub">${total} race${total === 1 ? '' : 's'}</div>
                            </td>
                            <td class="h2h-lb-td h2h-lb-td--pct">
                              <div class="h2h-lb-pct-wrap">
                                <span class="h2h-lb-pct-val">${pct}%</span>
                                <div class="h2h-lb-pct-bar">
                                  <div class="h2h-lb-pct-fill" style="width:${pct}%"></div>
                                </div>
                              </div>
                            </td>
                            <td class="h2h-lb-td h2h-lb-td--form"><div class="h2h-form-strip">${formDots}</div></td>
                            <td class="h2h-lb-td h2h-lb-td--wins">${keyWins}</td>
                          </tr>
                          <tr class="h2h-lb-detail" id="h2h-detail-${id}" style="display:none">
                            <td colspan="6" class="h2h-lb-detail-td">
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
  const matchups = Object.values(rec.matchups || {})
    .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses) || b.wins - a.wins);

  return matchups.map(m => {
    const opp = ATHLETES[m.id];
    const avatar = opp?.photo
      ? `<div class="h2h-detail-avatar" style="background-image:url('${opp.photo}');background-color:${opp.photoBackground || '#111'}"></div>`
      : `<div class="h2h-detail-avatar h2h-detail-avatar--ph" style="background-color:${opp?.photoBackground || '#222'}"></div>`;

    const recCls = m.wins > m.losses ? 'h2h-detail-opp-rec--win'
                 : m.losses > m.wins ? 'h2h-detail-opp-rec--loss'
                 : 'h2h-detail-opp-rec--split';

    const raceRows = m.races.map(r => `
      <div class="h2h-detail-race">
        <span class="h2h-detail-result ${r.won ? 'h2h-detail-result--w' : 'h2h-detail-result--l'}">${r.won ? 'W' : 'L'}</span>
        <span class="h2h-detail-date">${r.date || ''}</span>
        <span class="h2h-detail-event">${r.event}</span>
        <span class="h2h-detail-meet">${r.meet.length > 38 ? r.meet.slice(0, 36) + '…' : r.meet}</span>
        <span class="h2h-detail-time">${r.myTime}</span>
      </div>`).join('');

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
    const avatar = rowAth?.photo
      ? `<div class="h2h-map-avatar" style="background-image:url('${rowAth.photo}');background-color:${rowAth.photoBackground || '#111'}"></div>`
      : `<div class="h2h-map-avatar h2h-map-avatar--ph" style="background-color:${rowAth?.photoBackground || '#1a1a1a'}"></div>`;

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
          ${avatar}
          <span class="h2h-map-row-rank">${ri + 1}</span>
          <span class="h2h-map-row-name">${rowAth ? rowAth.name.split(' ').slice(-1)[0] : rowId}</span>
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
          race1.event.trim().toLowerCase() === race2.event.trim().toLowerCase()
        );
        if (!match) return;

        const p1 = parseInt(race1.place), p2 = parseInt(match.place);
        const t1s = parseTimeToSecs(race1.time), t2s = parseTimeToSecs(match.time);
        if (t1s && t2s && !isNaN(p1) && !isNaN(p2) && p1 !== p2) {
          if ((p1 < p2) !== (t1s < t2s)) return;
        }

        let a1wins = false, a2wins = false;
        if (!isNaN(p1) && !isNaN(p2))  { a1wins = p1 < p2; a2wins = p2 < p1; }
        else if (t1s && t2s)            { a1wins = t1s < t2s; a2wins = t2s < t1s; }
        else return;

        if (!pairwise[a1.id]) pairwise[a1.id] = {};
        if (!pairwise[a2.id]) pairwise[a2.id] = {};
        if (!pairwise[a1.id][a2.id]) pairwise[a1.id][a2.id] = { wins: 0, losses: 0 };
        if (!pairwise[a2.id][a1.id]) pairwise[a2.id][a1.id] = { wins: 0, losses: 0 };

        if (a1wins) {
          pairwise[a1.id][a2.id].wins++;
          pairwise[a2.id][a1.id].losses++;
        } else if (a2wins) {
          pairwise[a2.id][a1.id].wins++;
          pairwise[a1.id][a2.id].losses++;
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
          race1.event.trim().toLowerCase() === race2.event.trim().toLowerCase()
        );
        if (!match) return;

        const p1 = parseInt(race1.place), p2 = parseInt(match.place);
        const t1s = parseTimeToSecs(race1.time), t2s = parseTimeToSecs(match.time);
        if (t1s && t2s && !isNaN(p1) && !isNaN(p2) && p1 !== p2) {
          if ((p1 < p2) !== (t1s < t2s)) return;
        }

        let a1wins = false, a2wins = false;
        if (!isNaN(p1) && !isNaN(p2))  { a1wins = p1 < p2; a2wins = p2 < p1; }
        else if (t1s && t2s)            { a1wins = t1s < t2s; a2wins = t2s < t1s; }
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
          records[a1.id].matchups[a2.id].races.push({ date: race1.date, meet: race1.meet, event: race1.event, won: a1wins, myTime: race1.time, theirTime: match.time });
          records[a1.id].sequence.push({ date: race1.date, won: a1wins });
        }
        if (countForA2) {
          if (!records[a2.id]) records[a2.id] = { wins: 0, losses: 0, beatCounts: {}, matchups: {}, sequence: [] };
          if (!records[a2.id].matchups[a1.id]) records[a2.id].matchups[a1.id] = { fullName: a1.name, id: a1.id, wins: 0, losses: 0, races: [] };
          if (a2wins) { records[a2.id].wins++; records[a2.id].beatCounts[n1] = (records[a2.id].beatCounts[n1] || 0) + 1; records[a2.id].matchups[a1.id].wins++; }
          else if (a1wins) { records[a2.id].losses++; records[a2.id].matchups[a1.id].losses++; }
          records[a2.id].matchups[a1.id].races.push({ date: race1.date, meet: race1.meet, event: race1.event, won: a2wins, myTime: match.time, theirTime: race1.time });
          records[a2.id].sequence.push({ date: race1.date, won: a2wins });
        }

        totalEncounters++;
      });
    }
  }

  return { records, totalEncounters };
}

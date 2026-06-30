// ============================================================
//  H2H PAGE — leaderboard of season head-to-head records
// ============================================================

let _h2hLbYear       = '2026';
let _h2hLbEvent      = 'all';
let _h2hLbRankedOnly = false;

const _H2H_MIN_RACES = 3;

// Wilson score lower bound (90% CI) — penalises small samples
function _wilsonScore(wins, total) {
  if (total === 0) return 0;
  const p = wins / total;
  const z = 1.645;
  return (p + z*z/(2*total) - z * Math.sqrt((p*(1-p) + z*z/(4*total))/total)) / (1 + z*z/total);
}

// Check if an athlete appears in any ranked list
function _isRankedAthlete(id) {
  return Object.values(RANKINGS).some(list =>
    Array.isArray(list) && list.some(r => r && r.athleteId === id)
  );
}

function buildH2HPage() {
  _h2hLbYear       = '2026';
  _h2hLbEvent      = 'all';
  _h2hLbRankedOnly = false;
  _renderH2HPage();
}

function _renderH2HPage() {
  const main = qs('#main');
  if (!main) return;

  const records = _computeAllH2HRecords(_h2hLbYear, _h2hLbEvent, _h2hLbRankedOnly);

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

  main.innerHTML = `
    <div class="container">
      <div class="h2h-page">

        <div class="rankings-page-header">
          <div class="rankings-page-header-left">
            <h1 class="rankings-page-title">Head to Head</h1>
            <p class="rankings-page-intro">Season win-loss records from direct race encounters</p>
          </div>
        </div>

        <div class="h2h-lb-controls">
          <div class="h2h-lb-controls-left">
            <div class="h2h-year-tabs">
              ${years.map(y => `
                <button class="h2h-year-tab${y === _h2hLbYear ? ' active' : ''}"
                  onclick="h2hLbSetYear('${y}')">${y}</button>`
              ).join('')}
            </div>
            <button class="h2h-ranked-toggle${_h2hLbRankedOnly ? ' active' : ''}"
              onclick="h2hLbToggleRanked()">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <polygon points="6,1 7.5,4.5 11,4.8 8.5,7 9.3,10.5 6,8.5 2.7,10.5 3.5,7 1,4.8 4.5,4.5"/>
              </svg>
              Ranked opp. only
            </button>
          </div>
          <div class="h2h-lb-event-tabs">
            ${EVENTS.map(ev => `
              <button class="h2h-year-tab${ev === _h2hLbEvent ? ' active' : ''}"
                onclick="h2hLbSetEvent('${ev}')">${ev === 'all' ? 'All Events' : ev}</button>`
            ).join('')}
          </div>
        </div>

        <div class="h2h-lb-wrap">
          ${rows.length === 0
            ? `<div class="h2h-lb-empty">No head-to-head data for this selection${_h2hLbRankedOnly ? ' — try turning off "Ranked opp. only"' : ''}.</div>`
            : `<table class="h2h-lb-table">
                <thead>
                  <tr>
                    <th class="h2h-lb-th h2h-lb-th--rank">#</th>
                    <th class="h2h-lb-th h2h-lb-th--athlete">Athlete</th>
                    <th class="h2h-lb-th h2h-lb-th--record">Record</th>
                    <th class="h2h-lb-th h2h-lb-th--pct">Win %</th>
                    <th class="h2h-lb-th h2h-lb-th--races">Races</th>
                    <th class="h2h-lb-th h2h-lb-th--wins">Key Wins</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(([id, rec], i) => {
                    const a = ATHLETES[id];
                    if (!a) return '';
                    const total = rec.wins + rec.losses;
                    const pct   = Math.round((rec.wins / total) * 100);
                    const keyWins = rec.beatNames.slice(0, 4)
                      .map(n => `<span class="h2h-lb-win-tag">${n}</span>`).join('');
                    return `
                      <tr class="h2h-lb-row" onclick="openH2H('${id}', '${_h2hLbEvent === 'all' ? '' : _h2hLbEvent}')">
                        <td class="h2h-lb-td h2h-lb-td--rank">${i + 1}</td>
                        <td class="h2h-lb-td h2h-lb-td--athlete">
                          <span class="h2h-lb-flag">${renderFlag(a.flag)}</span>
                          <span class="h2h-lb-name">${a.name}</span>
                          ${a.country ? `<span class="h2h-lb-country">${a.country}</span>` : ''}
                        </td>
                        <td class="h2h-lb-td h2h-lb-td--record">
                          <span class="h2h-lb-rec-w">${rec.wins}</span><span class="h2h-lb-rec-sep">–</span><span class="h2h-lb-rec-l">${rec.losses}</span>
                        </td>
                        <td class="h2h-lb-td h2h-lb-td--pct">
                          <div class="h2h-lb-pct-wrap">
                            <span class="h2h-lb-pct-val">${pct}%</span>
                            <div class="h2h-lb-pct-bar">
                              <div class="h2h-lb-pct-fill" style="width:${pct}%"></div>
                            </div>
                          </div>
                        </td>
                        <td class="h2h-lb-td h2h-lb-td--races">${total}</td>
                        <td class="h2h-lb-td h2h-lb-td--wins">${keyWins}</td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>`
          }
        </div>

      </div>
    </div>
  `;
}

window.h2hLbSetYear      = y  => { _h2hLbYear  = y;    _renderH2HPage(); };
window.h2hLbSetEvent     = ev => { _h2hLbEvent = ev;   _renderH2HPage(); };
window.h2hLbToggleRanked = () => { _h2hLbRankedOnly = !_h2hLbRankedOnly; _renderH2HPage(); };

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

  const getResults = a =>
    year === '2026' ? (a.results || []) : ((a.resultsHistory || {})[year] || []);

  const athletes = Object.values(ATHLETES).filter(a => getResults(a).length > 0);

  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a1 = athletes[i], a2 = athletes[j];

      // Ranked-only: skip if neither athlete is ranked
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

        // Same-heat check
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

        // When ranked-only, only record results that involve a ranked opponent
        const a1ranked = _isRankedAthlete(a1.id);
        const a2ranked = _isRankedAthlete(a2.id);
        const countForA1 = !rankedOnly || a2ranked;
        const countForA2 = !rankedOnly || a1ranked;

        if (countForA1) {
          if (!records[a1.id]) records[a1.id] = { wins: 0, losses: 0, beatNames: [] };
          if (a1wins) {
            records[a1.id].wins++;
            if (!records[a1.id].beatNames.includes(n2)) records[a1.id].beatNames.push(n2);
          } else if (a2wins) {
            records[a1.id].losses++;
          }
        }
        if (countForA2) {
          if (!records[a2.id]) records[a2.id] = { wins: 0, losses: 0, beatNames: [] };
          if (a2wins) {
            records[a2.id].wins++;
            if (!records[a2.id].beatNames.includes(n1)) records[a2.id].beatNames.push(n1);
          } else if (a1wins) {
            records[a2.id].losses++;
          }
        }
      });
    }
  }

  return records;
}

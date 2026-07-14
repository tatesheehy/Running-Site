// ============================================================
//  EVENT TRACKER — buildEventTrackerPage()
// ============================================================

const EVENT_TRACKER_EVENTS = ['800m', '1500m', '5000m', '10000m'];

function buildEventTrackerPage() {
  const eventParam = getParam('event');
  const eventName = eventParam ? decodeURIComponent(eventParam) : EVENT_TRACKER_EVENTS[1];
  buildEventTrackerDetail(eventName);
}

window.eventTrackerSetEvent = function (eventName) {
  goTo(`event-tracker.html?event=${encodeURIComponent(eventName)}`);
};

function _buildEventTrackerTabsHtml(activeEvent) {
  const btns = EVENT_TRACKER_EVENTS.map(ev => `
    <button class="h2h-seg-btn${ev === activeEvent ? ' active' : ''}" onclick="eventTrackerSetEvent('${ev}')">${ev}</button>
  `).join('');
  return `<div class="h2h-seg et-tabs">${btns}</div>`;
}

// Season-best ranking: every athlete with a season result in the event,
// ranked by their fastest time (auto-derived, not the manual RANKINGS order).
function _seasonBestRanking(event) {
  // Normalize events so "1500 m" / "10,000 m" match "1500m" / "10000m";
  // the trailing " sh" on indoor marks is preserved, so they're excluded.
  const norm = s => (s || '').toLowerCase().replace(/[\s,]+/g, '');
  const target = norm(event);
  return Object.entries(ATHLETES)
    .map(([id, a]) => {
      const valid = (a.results || [])
        .filter(res => norm(res.event) === target && res.time && res.time !== 'x' && isFinite(_parseTimeSecs(res.time)))
        .sort((x, y) => _parseTimeSecs(x.time) - _parseTimeSecs(y.time));
      if (!valid.length) return null;
      const best = valid[0];
      return { id, a, time: best.time, secs: _parseTimeSecs(best.time), meet: (best.meet && best.meet !== 'x') ? best.meet : '' };
    })
    .filter(Boolean)
    .sort((x, y) => x.secs - y.secs);
}

function _seasonBestTableHtml(list, event) {
  if (!list.length) {
    return `<p style="color:var(--muted);padding:20px 0;font-size:14px;">No season-best results yet for ${event}.</p>`;
  }
  const rowsHtml = list.map((row, i) => {
    const rank = i + 1;
    const rankClass = rank === 1 ? '' : 'gray';
    return `
      <tr onclick="openAthleteCard('${row.id}', ${rank})">
        <td><span class="rank-num ${rankClass}">${rank}</span></td>
        <td class="athlete-name-cell">
          <div class="name">${row.a.name}</div>
          <div class="country">${renderFlag(row.a.flag)} ${row.a.country || ''}</div>
        </td>
        <td>${row.a.country || ''}</td>
        <td><span class="best-time">${row.time}</span></td>
        <td class="meet-cell">${row.meet}</td>
      </tr>`;
  }).join('');
  return `
    <table class="rankings-table" aria-label="${event} season best rankings">
      <thead>
        <tr>
          <th>Rank</th><th>Athlete</th><th>Country</th>
          <th>Best Time</th><th style="text-align:right">Meet</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

function _buildEventTrackerStatsHtml(eventName, sbList, totalEncounters) {
  const leader = sbList[0];
  return `
    <div class="h2h-stats-strip et-stats-strip">
      <div class="h2h-stat">
        <span class="h2h-stat-n">${sbList.length}</span>
        <span class="h2h-stat-l">Ranked athletes</span>
      </div>
      <div class="h2h-stat-div"></div>
      <div class="h2h-stat">
        <span class="h2h-stat-n">${totalEncounters}</span>
        <span class="h2h-stat-l">H2H encounters</span>
      </div>
      ${leader ? `
      <div class="h2h-stat-div"></div>
      <div class="h2h-stat">
        <span class="h2h-stat-n">${leader.a.name.split(' ').slice(-1)[0]}</span>
        <span class="h2h-stat-l">Season leader · ${leader.time || '—'}</span>
      </div>` : ''}
    </div>`;
}

function _buildEventTrackerTickerHtml(eventName) {
  const items = (typeof _buildTrendingPerformances === 'function') ? _buildTrendingPerformances(10, eventName) : [];

  const body = items.length ? (() => {
    const chips = items.map(c => {
      const a = c.athlete, r = c.result;
      const tag = (typeof _trendTypeTag === 'function') ? _trendTypeTag(c) : '';
      return `<span class="ticker-item ticker-item-link" onclick="if(window.openAthleteCard){window.openAthleteCard('${a.id}', null)}" role="button" tabindex="0">${renderFlag(a.flag)} ${a.name} <span class="ticker-sep">·</span> ${tag} ${r.time}</span>`;
    }).join('<span class="ticker-sep">·</span>');

    return `
      <div class="breaking-bar et-ticker-bar" role="marquee">
        <span class="breaking-badge">${eventName}</span>
        <div class="ticker-track">
          <div class="ticker-content">${chips}<span class="ticker-sep">·</span>${chips}<span class="ticker-sep">·</span></div>
        </div>
      </div>`;
  })() : `<div class="h2h-lb-empty">No recent ${eventName} performances tracked in the last 30 days.</div>`;

  return `
    <section class="et-section">
      <div class="et-section-header">
        <h2 class="et-section-title">Recent Performances</h2>
      </div>
      ${body}
    </section>`;
}

function _buildEventTrackerRankingsSection(eventName, sbList) {
  return `
    <section class="et-section">
      <div class="et-section-header">
        <h2 class="et-section-title">Season Best Rankings</h2>
      </div>
      ${_seasonBestTableHtml(sbList, eventName)}
    </section>`;
}

function _buildEventTrackerH2HSection(eventName, rows) {
  const tableHtml = _renderH2HLbTableHtml(rows, {
    expandable: false,
    emptyMessage: `No head-to-head data for ${eventName} yet.`,
  });

  return `
    <section class="et-section">
      <div class="et-section-header">
        <h2 class="et-section-title">Head-to-Head</h2>
        <a class="et-view-link" href="h2h.html?event=${encodeURIComponent(eventName)}">View full H2H &rarr;</a>
      </div>
      <div class="h2h-lb-wrap">${tableHtml}</div>
    </section>`;
}

function buildEventTrackerDetail(eventName) {
  const main = qs('#main');
  if (!main) return;

  const sbList = _seasonBestRanking(eventName);

  const { records, totalEncounters } = _computeAllH2HRecords('2026', eventName, 'all', 'all');
  const h2hRows = Object.entries(records)
    .filter(([, r]) => r.wins + r.losses >= _H2H_MIN_RACES)
    .sort((a, b) =>
      _wilsonScore(b[1].wins, b[1].wins + b[1].losses) - _wilsonScore(a[1].wins, a[1].wins + a[1].losses)
      || b[1].wins - a[1].wins
    );

  main.innerHTML = `
    <div class="container et-page">
      <div class="page-hero">
        <div class="page-hero-inner">
          <div>
            <div class="page-hero-eyebrow">Event Tracker</div>
            <h1 class="page-hero-title">${eventName}</h1>
            <p class="page-hero-sub">Recent form, season rankings, and head-to-head records — all in one place.</p>
          </div>
        </div>
      </div>
      <div class="et-page-header">
        ${_buildEventTrackerTabsHtml(eventName)}
      </div>

      ${_buildEventTrackerStatsHtml(eventName, sbList, totalEncounters)}
      ${_buildEventTrackerTickerHtml(eventName)}
      ${_buildEventTrackerRankingsSection(eventName, sbList)}
      ${_buildEventTrackerH2HSection(eventName, h2hRows)}
    </div>`;
}

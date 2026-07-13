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

function _buildEventTrackerStatsHtml(eventName, rankRows, totalEncounters) {
  const leader = rankRows[0];
  return `
    <div class="h2h-stats-strip et-stats-strip">
      <div class="h2h-stat">
        <span class="h2h-stat-n">${rankRows.length}</span>
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
        <span class="h2h-stat-n">${leader.name.split(' ').slice(-1)[0]}</span>
        <span class="h2h-stat-l">Season leader · ${leader.seasonBest || '—'}</span>
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

function _buildEventTrackerRankingsSection(eventName) {
  const tableHtml = (typeof buildRankingsTableHtml === 'function') ? buildRankingsTableHtml(eventName, false) : '';
  return `
    <section class="et-section">
      <div class="et-section-header">
        <h2 class="et-section-title">Season Rankings</h2>
        <a class="et-view-link" href="rankings.html?event=${encodeURIComponent(eventName)}">Full rankings &rarr;</a>
      </div>
      ${tableHtml}
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

  const rankRows = RANKINGS[eventName] || [];

  const { records, totalEncounters } = _computeAllH2HRecords('2026', eventName, 'all', 'all');
  const h2hRows = Object.entries(records)
    .filter(([, r]) => r.wins + r.losses >= _H2H_MIN_RACES)
    .sort((a, b) =>
      _wilsonScore(b[1].wins, b[1].wins + b[1].losses) - _wilsonScore(a[1].wins, a[1].wins + a[1].losses)
      || b[1].wins - a[1].wins
    );

  main.innerHTML = `
    <div class="container et-page">
      <div class="rankings-page-header et-page-header">
        <div class="rankings-page-header-main">
          <div>
            <span class="rankings-page-title-eyebrow">Event Tracker</span>
            <h1 class="rankings-page-title">${eventName}</h1>
            <p class="rankings-page-intro">Recent form, season rankings, and head-to-head records — all in one place.</p>
          </div>
          ${_buildEventTrackerTabsHtml(eventName)}
        </div>
      </div>

      ${_buildEventTrackerStatsHtml(eventName, rankRows, totalEncounters)}
      ${_buildEventTrackerTickerHtml(eventName)}
      ${_buildEventTrackerRankingsSection(eventName)}
      ${_buildEventTrackerH2HSection(eventName, h2hRows)}
    </div>`;
}

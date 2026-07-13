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
  return `<div class="h2h-seg">${btns}</div>`;
}

function _buildEventTrackerTickerHtml(eventName) {
  const items = (typeof _buildTrendingPerformances === 'function') ? _buildTrendingPerformances(10, eventName) : [];
  if (!items.length) return '';

  const chips = items.map(c => {
    const a = c.athlete, r = c.result;
    const tag = (typeof _trendTypeTag === 'function') ? _trendTypeTag(c) : '';
    return `<span class="ticker-item ticker-item-link" onclick="if(window.openAthleteCard){window.openAthleteCard('${a.id}', null)}" role="button" tabindex="0">${renderFlag(a.flag)} ${a.name} <span class="ticker-sep">·</span> ${tag} ${r.time}</span>`;
  }).join('<span class="ticker-sep">·</span>');

  const tickerContent = `
    <div class="ticker-track">
      <div class="ticker-content">${chips}<span class="ticker-sep">·</span>${chips}<span class="ticker-sep">·</span></div>
    </div>`;

  return `
    <div class="breaking-bar" role="marquee">
      <span class="breaking-badge">${eventName}</span>
      ${tickerContent}
    </div>`;
}

function _buildEventTrackerRankingsSection(eventName) {
  const tableHtml = (typeof buildRankingsTableHtml === 'function') ? buildRankingsTableHtml(eventName, false) : '';
  return `
    <section class="et-section">
      <div class="et-section-header">
        <h2 class="et-section-title">${eventName} Rankings</h2>
        <a class="et-view-link" href="rankings.html?event=${encodeURIComponent(eventName)}">Full rankings &rarr;</a>
      </div>
      ${tableHtml}
    </section>`;
}

function _buildEventTrackerH2HSection(eventName) {
  const year = '2026';
  const { records } = _computeAllH2HRecords(year, eventName, 'all', 'all');
  const rows = Object.entries(records)
    .filter(([, r]) => r.wins + r.losses >= _H2H_MIN_RACES)
    .sort((a, b) =>
      _wilsonScore(b[1].wins, b[1].wins + b[1].losses) - _wilsonScore(a[1].wins, a[1].wins + a[1].losses)
      || b[1].wins - a[1].wins
    );

  const tableHtml = _renderH2HLbTableHtml(rows, {
    expandable: false,
    emptyMessage: `No head-to-head data for ${eventName} yet.`,
  });

  return `
    <section class="et-section">
      <div class="et-section-header">
        <h2 class="et-section-title">${eventName} Head-to-Head</h2>
        <a class="et-view-link" href="h2h.html?event=${encodeURIComponent(eventName)}">View full H2H &rarr;</a>
      </div>
      <div class="h2h-lb-wrap">${tableHtml}</div>
    </section>`;
}

function buildEventTrackerDetail(eventName) {
  const main = qs('#main');
  if (!main) return;

  main.innerHTML = `
    <div class="container et-page">
      <div class="et-page-header">
        <h1 class="et-page-title">Event Tracker</h1>
      </div>
      ${_buildEventTrackerTabsHtml(eventName)}
      ${_buildEventTrackerTickerHtml(eventName)}
      ${_buildEventTrackerRankingsSection(eventName)}
      ${_buildEventTrackerH2HSection(eventName)}
    </div>`;
}

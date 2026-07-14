// ============================================================
//  COUNTRIES — aggregate rankings & athletes by country
// ============================================================

const _COUNTRY_ROW_LIMIT = 8;

// Events shown (in order) on the country detail's per-event leaderboards.
const _COUNTRY_EVENTS = ['800m', '1500m', 'Mile', '3000m', '5000m', '10000m'];

// Primary "flag color" per nation (by 2-letter flag code). Netherlands is
// forced to orange (the national sporting color) rather than its flag red.
const _COUNTRY_COLORS = {
  US: '#3C3B6E', KE: '#BB0000', FR: '#0055A4', AU: '#00843D', ES: '#AA151B',
  IE: '#169B62', GB: '#012169', SCT: '#005EB8', CA: '#D52B1E', JP: '#BC002D',
  ET: '#078930', BE: '#111111', NO: '#00205B', NL: '#FF6600', DE: '#111111',
  MA: '#C1272D', DZ: '#006233', IT: '#008C45', BI: '#1EB53A', SE: '#006AA7',
  ER: '#12AD2B', NZ: '#00247D', CH: '#D52B1E', UG: '#111111', JM: '#009B3A',
  PT: '#006600', MX: '#006847', PL: '#DC143C', AT: '#ED2939', ZA: '#007A4D',
  BW: '#75AADB', BH: '#CE1126', IN: '#FF9933', UY: '#0038A8', VC: '#0072C6',
  TH: '#A51931', HR: '#FF0000', RS: '#C6363C', GT: '#4997D0',
};

function _countryColor(flag) {
  return _COUNTRY_COLORS[flag] || 'var(--accent)';
}

// Normalize event strings: "1500 m" / "10,000 m" → "1500m" / "10000m".
// The trailing " sh" on indoor marks survives, so indoor is excluded.
const _cnorm = s => (s || '').toLowerCase().replace(/[\s,]+/g, '');

function buildCountryPage() {
  const country = getParam('country');
  if (country) buildCountryDetail(decodeURIComponent(country));
  else buildCountryHub();
}

// Group all tracked athletes by country, keeping one flag code per country.
function _countryGroups() {
  const byCountry = {};
  Object.values(ATHLETES).forEach(a => {
    const c = (a.country || '').trim();
    if (!c) return;
    if (!byCountry[c]) byCountry[c] = { flag: a.flag || '', athletes: [] };
    if (!byCountry[c].flag && a.flag) byCountry[c].flag = a.flag;
    byCountry[c].athletes.push(a);
  });
  return byCountry;
}

// ── HUB ───────────────────────────────────────────────────
function buildCountryHub() {
  const byCountry = _countryGroups();

  const rankedByCountry = {};
  (RANKINGS_EVENTS || []).forEach(ev => (ev.rows || []).forEach(r => {
    const a = r.athleteId && ATHLETES[r.athleteId];
    const c = (a && a.country) || r.country || '';
    if (!c) return;
    rankedByCountry[c] = (rankedByCountry[c] || 0) + 1;
  }));

  const countries = Object.keys(byCountry).sort((a, b) => {
    const rb = rankedByCountry[b] || 0, ra = rankedByCountry[a] || 0;
    if (rb !== ra) return rb - ra;
    return byCountry[b].athletes.length - byCountry[a].athletes.length;
  });

  const rowsHtml = countries.map((c, i) => {
    const info = byCountry[c];
    const rankedCount = rankedByCountry[c] || 0;
    const athleteCount = info.athletes.length;
    const safeHref = encodeURIComponent(c).replace(/'/g, "\\'");
    return `
      <div class="rr-soon-row" onclick="goTo('country.html?country=${safeHref}')">
        <span class="rr-soon-index">${String(i + 1).padStart(2, '0')}</span>
        <span class="rr-soon-name">${renderFlag(info.flag)} ${c}</span>
        <span class="rr-soon-desc">${athleteCount} athlete${athleteCount === 1 ? '' : 's'} tracked</span>
        <span class="rr-soon-tag${rankedCount ? ' rr-soon-tag--live' : ''}">${rankedCount ? `${rankedCount} ranked` : 'Unranked'}</span>
        <span class="rr-soon-arrow">&rarr;</span>
      </div>`;
  }).join('');

  const totalAthletes = Object.values(ATHLETES).length;

  qs('#main').innerHTML = `
    <div class="container">
      <div class="rankings-hub">
        <header class="page-hero">
          <div class="page-hero-inner">
            <div>
              <div class="page-hero-eyebrow">StatTC &middot; By Country</div>
              <h1 class="page-hero-title">Countries</h1>
              <p class="page-hero-sub">Every nation StatTC tracks, ranked by how many athletes show up on a StatTC leaderboard.</p>
            </div>
            <div class="page-hero-aside">
              <div class="page-hero-stat"><span class="page-hero-stat-num">${String(countries.length).padStart(2, '0')}</span><span class="page-hero-stat-label">Countries</span></div>
              <div class="page-hero-stat"><span class="page-hero-stat-num">${String(totalAthletes).padStart(2, '0')}</span><span class="page-hero-stat-label">Athletes</span></div>
            </div>
          </div>
        </header>
        <div class="rankings-board">
          <div class="rr-soon-panel">
            <div class="rr-soon-panel-label">All Countries</div>
            <div class="rr-soon-list">${rowsHtml}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── DETAIL: per-event leaderboards ────────────────────────
// Season best (from this-season results) per athlete for one event.
function _countrySeasonBests(athletes, event) {
  const target = _cnorm(event);
  return athletes.map(a => {
    const valid = (a.results || [])
      .filter(r => _cnorm(r.event) === target && r.time && r.time !== 'x' && isFinite(_parseTimeSecs(r.time)))
      .sort((x, y) => _parseTimeSecs(x.time) - _parseTimeSecs(y.time));
    if (!valid.length) return null;
    return { a, time: valid[0].time, secs: _parseTimeSecs(valid[0].time) };
  }).filter(Boolean).sort((x, y) => x.secs - y.secs);
}

// Personal best (lifetime, from the prs list) per athlete for one event.
function _countryPRs(athletes, event) {
  const target = _cnorm(event);
  return athletes.map(a => {
    const pr = (a.prs || []).find(p => _cnorm(p.event) === target && p.time && p.time !== 'x' && isFinite(_parseTimeSecs(p.time)));
    if (!pr) return null;
    return { a, time: pr.time, secs: _parseTimeSecs(pr.time) };
  }).filter(Boolean).sort((x, y) => x.secs - y.secs);
}

// How many rows each per-event leaderboard shows before "See all".
const _COUNTRY_GROUP_LIMIT = 6;

// One event's ranked list rendered as a labeled, collapsible compact-row group.
function _countryEventGroupHtml(event, list, groupId) {
  if (!list.length) return '';
  const rows = list.map((row, i) => {
    const rank = i + 1;
    return `
      <div class="rw-row rw-row--clickable" onclick="openAthleteCard('${row.a.id}', ${rank})">
        <span class="rw-rank ${rank === 1 ? 'rw-rank--first' : ''}">${rank}</span>
        <div class="rw-info">
          <span class="rw-name">${row.a.name}</span>
        </div>
        <span class="rw-time">${row.time}</span>
      </div>`;
  }).join('');
  const collapsible = list.length > _COUNTRY_GROUP_LIMIT;
  return `
    <div class="country-event-group">
      <div class="country-event-label">${event}</div>
      <div class="et-collapse${collapsible ? ' et-collapse--cgroup' : ''}" id="${groupId}">
        <div class="rw-list">${rows}</div>
      </div>
      ${collapsible ? `<button class="et-see-all et-see-all--sm" onclick="etToggleSection('${groupId}', this, ${list.length})">See all ${list.length}</button>` : ''}
    </div>`;
}

function _countryEventSection(title, id, athletes, rankFn) {
  const groups = _COUNTRY_EVENTS
    .map(ev => ({ ev, list: rankFn(athletes, ev) }))
    .filter(g => g.list.length);
  if (!groups.length) return '';
  const html = groups.map((g, i) => _countryEventGroupHtml(g.ev, g.list, `${id}-${i}`)).join('');
  return `
    <section class="et-section">
      <div class="et-section-header"><h2 class="et-section-title">${title}</h2></div>
      <div class="country-event-grid">${html}</div>
    </section>`;
}

// Recent notable races by this country's athletes (reuses Time Machine logic).
function _countryRecentSection(country) {
  let items = [];
  if (typeof _tmRecentPerformances === 'function') {
    // Wide window anchored to end of season so the whole year is captured
    // regardless of wall-clock; then filter to this country and take the top 8.
    const anchor = new Date('Dec 31 2026');
    items = _tmRecentPerformances('2026', anchor, 420, 'all', 500)
      .filter(c => (c.athlete.country || '') === country)
      .slice(0, 8);
  }
  if (!items.length) return '';
  return `
    <section class="et-section">
      <div class="et-section-header"><h2 class="et-section-title">Recent Races</h2></div>
      <div class="et-activity-wrap"><div class="fp-trending-list">${items.map(trendRow).join('')}</div></div>
    </section>`;
}

function buildCountryDetail(country) {
  const main = qs('#main');
  if (!main) return;

  const athletes = Object.values(ATHLETES).filter(a => (a.country || '') === country);
  if (!athletes.length) { goTo('country.html'); return; }
  const flag = (athletes.find(a => a.flag) || {}).flag || '';
  const color = _countryColor(flag);

  const roster = [...athletes].sort((a, b) => a.name.localeCompare(b.name));
  const rosterHtml = roster.map(a => `
    <div class="rw-row rw-row--clickable" onclick="openAthleteCard('${a.id}', null)">
      <span class="rw-rank">${renderFlag(a.flag)}</span>
      <div class="rw-info">
        <span class="rw-name">${a.name}</span>
        ${a.hometown && a.hometown !== 'x' ? `<span class="rw-country-sm">${a.hometown}</span>` : ''}
      </div>
    </div>`).join('');
  const rosterCollapsible = roster.length > _COUNTRY_ROW_LIMIT;

  const recentHtml = _countryRecentSection(country);
  const sbHtml = _countryEventSection('Season Bests', 'country-sb', athletes, _countrySeasonBests);
  const prHtml = _countryEventSection('Personal Bests', 'country-pr', athletes, _countryPRs);

  main.innerHTML = `
    <div class="container">
      <div class="et-page">
        <header class="page-hero" style="background:${color}">
          <div class="page-hero-inner">
            <div>
              <div class="page-hero-eyebrow"><a href="country.html" class="country-back-link">&larr; All Countries</a></div>
              <h1 class="page-hero-title">${renderFlag(flag)} ${country}</h1>
              <p class="page-hero-sub">${athletes.length} athlete${athletes.length === 1 ? '' : 's'} tracked.</p>
            </div>
          </div>
        </header>

        ${recentHtml}
        ${sbHtml}
        ${prHtml}

        <section class="et-section">
          <div class="et-section-header"><h2 class="et-section-title">Full Roster</h2></div>
          <div class="et-collapse${rosterCollapsible ? ' et-collapse--country' : ''}" id="country-roster-collapse">
            <div class="rw-list">${rosterHtml}</div>
          </div>
          ${rosterCollapsible ? `<button class="et-see-all" onclick="etToggleSection('country-roster-collapse', this, ${roster.length})">See all ${roster.length} athletes</button>` : ''}
        </section>
      </div>
    </div>
  `;
}

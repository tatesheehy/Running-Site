// ============================================================
//  RANKINGS — all rankings builders and helpers
// ============================================================

// ── RANKINGS TABLE HTML ────────────────────────────────────
function buildRankingsTableHtml(event, compact) {
  const rows = RANKINGS[event] || [];
  if (!rows.length) {
    return `<p style="color:var(--muted);padding:20px 0;font-size:14px;">No rankings data yet for ${event}.</p>`;
  }
  const rowsHtml = rows.map((r, i) => {
    const rank = i + 1;
    const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
    const name    = (a && a.name)    || r.name    || r.athleteId || '—';
    const country = (a && a.country) || r.country || '';
    const flag    = (a && a.flag)    || r.flag    || '';
    const hasCard = r.athleteId && ATHLETES[r.athleteId];
    const rankClass = rank === 1 ? '' : 'gray';
    return `
      <tr ${hasCard ? `onclick="openAthleteCard('${r.athleteId}', ${rank})"` : ''} style="${hasCard ? '' : 'cursor:default'}">
        <td><span class="rank-num ${rankClass}">${rank}</span></td>
        <td class="athlete-name-cell">
          <div class="name">${name}</div>
          <div class="country">${renderFlag(flag)} ${country}</div>
        </td>
        ${compact ? '' : `<td>${country}</td>`}
        <td><span class="best-time">${(r.seasonBest && r.seasonBest !== 'x') ? r.seasonBest : '—'}</span></td>
        <td class="meet-cell">${(r.meet && r.meet !== 'x') ? r.meet : ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="rankings-table" aria-label="${event} rankings">
      <thead>
        <tr>
          <th>Rank</th><th>Athlete</th>
          ${compact ? '' : '<th>Country</th>'}
          <th>Best Time</th><th style="text-align:right">Meet</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

// ── RANKINGS PAGE ─────────────────────────────────────────
function buildRankingsPage() {
  const eventParam = getParam('event');
  const yearParam  = getParam('year');
  const viewParam  = getParam('view');
  const weekParam  = getParam('week');

  if (viewParam === 'archive' && yearParam && eventParam && weekParam) {
    const eventName = decodeURIComponent(eventParam);
    buildRankingsDetail(eventName, {
      archiveYear:   yearParam,
      archiveWeekId: weekParam,
      backUrl:  `rankings.html?view=archive&year=${encodeURIComponent(yearParam)}&event=${encodeURIComponent(eventParam)}`,
      backLabel: eventName,
    });
  } else if (viewParam === 'archive' && yearParam && eventParam) {
    buildArchiveWeekHub(yearParam, decodeURIComponent(eventParam));
  } else if (viewParam === 'archive' && yearParam) {
    buildArchiveYearHub(yearParam);
  } else if (viewParam === 'archive') {
    buildArchiveHub();
  } else if (eventParam) {
    buildRankingsDetail(decodeURIComponent(eventParam));
  } else {
    buildRankingsHub();
  }
}

function buildRankingsHub() {
  const cardsHtml = RANKINGS_EVENTS.map((ev, i) => {
    const count = (ev.rows || []).length;
    const num = String(i + 1).padStart(2, '0');
    const photoStyle = ev.photo ? `style="background-image:url('${ev.photo}');"` : '';
    return `
      <div class="ranking-card" onclick="goTo('rankings.html?event=${encodeURIComponent(ev.name)}')">
        <div class="ranking-card-left">
          <div class="ranking-card-num">${num}</div>
          <div class="ranking-card-event">${ev.name}</div>
          ${ev.description ? `<div class="ranking-card-desc">${ev.description}</div>` : ''}
          <div class="ranking-card-cta">${count ? `${count} athletes ranked` : 'Under construction'} &rarr;</div>
        </div>
        ${ev.photo ? `<div class="ranking-card-photo" ${photoStyle}></div>` : ''}
      </div>
    `;
  }).join('');

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-hub">
        <div class="rankings-page-header">
          <div class="rankings-page-header-left">
            <h1 class="rankings-page-title">${RANKINGS_YEAR} Rankings</h1>
            ${SITE.rankingsIntro ? `<p class="rankings-page-intro">${SITE.rankingsIntro}</p>` : ''}
          </div>
          <div class="rankings-hub-actions">
            <button class="h2h-hub-btn" onclick="openH2H()">⇌ Compare Head to Head</button>
            ${RANKINGS_ARCHIVE.length ? `<a href="rankings.html?view=archive" class="rankings-archive-link"><svg width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:-2px;margin-right:6px"><path d="M1 2.5C1 1.67 1.67 1 2.5 1H5.5L7 3H12.5C13.33 3 14 3.67 14 4.5V10.5C14 11.33 13.33 12 12.5 12H2.5C1.67 12 1 11.33 1 10.5V2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>Rankings Archive &rarr;</a>` : ''}
          </div>
        </div>
        ${RANKINGS_CRITERIA ? `
        <div class="rankings-criteria">
          <button class="rankings-criteria-toggle" onclick="window.toggleCriteria()" aria-expanded="false">
            <span>How We Rank</span>
            <span class="criteria-chevron">&#9660;</span>
          </button>
          <div class="rankings-criteria-body" id="criteria-body" hidden>${RANKINGS_CRITERIA}</div>
        </div>
        ` : ''}
        <div class="rankings-cards-grid">${cardsHtml}</div>
      </div>
    </div>
  `;
}

window.toggleCriteria = function() {
  const body = document.getElementById('criteria-body');
  const btn = document.querySelector('.rankings-criteria-toggle');
  const chevron = btn.querySelector('.criteria-chevron');
  const isOpen = body.hasAttribute('hidden');
  if (isOpen) { body.removeAttribute('hidden'); } else { body.setAttribute('hidden', ''); }
  btn.setAttribute('aria-expanded', isOpen);
  chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
};

function buildArchiveHub() {
  const seasons = RANKINGS_ARCHIVE || [];

  const cardsHtml = seasons.length ? seasons.map(s => {
    const year   = s.year || '';
    const label  = s.label || `${year} Season`;
    const events = s.events || [];
    const tags   = events.map(e => `<span class="archive-event-tag">${e.name}</span>`).join('');
    return `
      <div class="archive-season-card" onclick="goTo('rankings.html?view=archive&year=${encodeURIComponent(year)}')">
        <div class="archive-season-year">${year}</div>
        <div class="archive-season-label">${label}</div>
        ${tags ? `<div class="archive-season-tags">${tags}</div>` : ''}
        <div class="archive-season-cta">${events.length} event${events.length !== 1 ? 's' : ''} &rarr;</div>
      </div>`;
  }).join('') : `<p class="archive-empty">No archived seasons yet.</p>`;

  document.getElementById('main').innerHTML = `
    <div class="archive-vintage-page">
      <div class="container">
        <div class="archive-vintage-header">
          <a href="rankings.html" class="rd-back">&larr; Return to the present</a>
          <h1 class="archive-page-title">Rankings Archive</h1>
        </div>
        <div class="archive-seasons-grid">${cardsHtml}</div>
      </div>
    </div>`;
}

function buildArchiveYearHub(year) {
  const season = (RANKINGS_ARCHIVE || []).find(s => s.year === year);
  if (!season) { goTo('rankings.html?view=archive'); return; }

  const label  = season.label || `${year} Season`;
  const events = season.events || [];

  const cardsHtml = events.length ? events.map((ev) => {
    const weekCount = (ev.weekIds || []).length;
    const nameCls = ev.name.length > 6 ? 'archive-season-year archive-season-year--event' : 'archive-season-year';
    return `
      <div class="archive-season-card" onclick="goTo('rankings.html?view=archive&year=${encodeURIComponent(year)}&event=${encodeURIComponent(ev.name)}')">
        <div class="${nameCls}">${ev.name}</div>
        <div class="archive-season-label">${ev.description || ''}</div>
        <div class="archive-season-cta">${weekCount ? `${weekCount} week${weekCount !== 1 ? 's' : ''}` : 'No weeks'} &rarr;</div>
      </div>`;
  }).join('') : `<p class="archive-empty">No events yet.</p>`;

  document.getElementById('main').innerHTML = `
    <div class="archive-vintage-page">
      <div class="container">
        <div class="archive-vintage-header">
          <a href="rankings.html?view=archive" class="rd-back">&larr; Archive</a>
          <h1 class="archive-page-title">${label}</h1>
        </div>
        <div class="archive-seasons-grid">${cardsHtml}</div>
      </div>
    </div>`;
}

function buildArchiveWeekHub(year, eventName) {
  const season = (RANKINGS_ARCHIVE || []).find(s => s.year === year);
  const ev = season ? (season.events || []).find(e => e.name === eventName) : null;
  if (!ev) { goTo(`rankings.html?view=archive&year=${encodeURIComponent(year)}`); return; }

  const weekIds  = ev.weekIds || [];
  const yearLabel = season.label || `${year} Season`;

  const liveCount = ((RANKINGS_EVENTS || []).find(e => e.name === eventName)?.rows || []).length;
  const cardsHtml = weekIds.length ? weekIds.map((wid) => {
    const w = (RANKINGS_WEEKS || {})[wid] || {};
    const count  = (w.rows || []).length || liveCount;
    const wLabel = w.label || wid;
    return `
      <div class="archive-season-card" onclick="goTo('rankings.html?view=archive&year=${encodeURIComponent(year)}&event=${encodeURIComponent(eventName)}&week=${encodeURIComponent(wid)}')">
        <div class="archive-season-year archive-season-year--week">${wLabel}</div>
        ${w.date ? `<div class="archive-season-label">${w.date}</div>` : '<div class="archive-season-label"></div>'}
        <div class="archive-season-cta">${count ? `${count} athletes` : 'No data'} &rarr;</div>
      </div>`;
  }).join('') : `<p class="archive-empty">No weeks added yet.</p>`;

  document.getElementById('main').innerHTML = `
    <div class="archive-vintage-page">
      <div class="container">
        <div class="archive-vintage-header">
          <a href="rankings.html?view=archive&year=${encodeURIComponent(year)}" class="rd-back">&larr; ${yearLabel}</a>
          <h1 class="archive-page-title">${eventName}</h1>
        </div>
        <div class="archive-seasons-grid">${cardsHtml}</div>
      </div>
    </div>`;
}

function buildRankingRow(r, rank) {
  const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
  const name    = (a && a.name)    || r.name    || r.athleteId || '—';
  const country = (a && a.country) || r.country || '';
  const flag    = (a && a.flag)    || r.flag    || '';
  const photo   = a && a.photo;
  const photoBg = (a && a.photoBackground) || '#111';
  const clickData = encodeURIComponent(JSON.stringify({athleteId: r.athleteId||'', rank: rank||0, name, country, flag, seasonBest: r.seasonBest||'', meet: r.meet||''}));
  const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
  const seasonBest = (r.seasonBest && r.seasonBest !== 'x') ? r.seasonBest : '';
  const meet = (r.meet && r.meet !== 'x') ? r.meet : '';
  return `
    <div class="rd-row${rank <= 3 && rank != null ? ' rd-row--podium' : ''}" data-country="${country}" data-athlete-id="${r.athleteId || ''}" onclick="openRankingRow('${clickData}')">
      ${rank != null ? `<div class="rd-rank ${rankClass}">${rank <= 3 ? '<svg class="rd-crown" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0 13 L4 3 L9 9 L12 0 L15 9 L20 3 L24 13 L24 15 L0 15 Z"/></svg>' : ''}${rank}</div>` : '<div class="rd-rank-empty"></div>'}
      <div class="rd-avatar ${photo ? '' : 'rd-avatar--empty no-photo'}" style="${photo ? `background-color:${photoBg};background-image:url('${photo}');background-size:cover;background-position:top center` : ''}"></div>
      <div class="rd-info">
        <div class="rd-name">${name}</div>
        <div class="rd-country">${renderFlag(flag)} ${country}</div>
      </div>
      ${rank != null ? buildMomentumHtml(r.momentum) : ''}
      <div class="rd-right">
        ${r.reason ? `<div class="rd-reason">${r.reason}</div>` : ''}
        <div class="rd-time">${seasonBest}</div>
        <div class="rd-meet">${meet}</div>
      </div>

    </div>
  `;
}

function buildRankingCard(r, rank) {
  const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
  const name    = (a && a.name)    || r.name    || r.athleteId || '—';
  const country = (a && a.country) || r.country || '';
  const flag    = (a && a.flag)    || r.flag    || '';
  const photo   = a && a.photo;
  const photoBg = (a && a.photoBackground) || '#1c1c1c';
  const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
  const seasonBest = (r.seasonBest && r.seasonBest !== 'x') ? r.seasonBest : '';
  const meet = (r.meet && r.meet !== 'x') ? r.meet : '';
  const clickData = encodeURIComponent(JSON.stringify({athleteId: r.athleteId||'', rank: rank||0, name, country, flag, seasonBest: r.seasonBest||'', meet: r.meet||''}));
  return `
    <div class="rd-card" data-country="${country}" data-athlete-id="${r.athleteId || ''}" onclick="openRankingRow('${clickData}')">
      <div class="rd-card-photo${photo ? '' : ' no-photo'}" style="${photo ? `background-color:${photoBg};background-image:url('${photo}')` : ''}">
        ${rank != null ? `<div class="rd-card-rank ${rankClass}">${rank <= 3 ? '<svg class="rd-crown" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0 13 L4 3 L9 9 L12 0 L15 9 L20 3 L24 13 L24 15 L0 15 Z"/></svg>' : ''}${rank}</div>` : ''}
      </div>
      <div class="rd-card-body">
        <div class="rd-card-name">${name}</div>
        <div class="rd-card-country">${renderFlag(flag)} ${country}</div>
        ${r.reason ? `<div class="rd-card-reason">${r.reason}</div>` : ''}
        <div class="rd-card-time">${seasonBest}</div>
        <div class="rd-card-meet">${meet}</div>
      </div>
    </div>
  `;
}

window.filterRankings = function(country) {
  document.querySelectorAll('#main .rd-row, #main .rd-card').forEach(el => {
    el.style.display = (!country || el.dataset.country === country) ? '' : 'none';
  });
};

window.toggleRdCountrySelect = function() {
  const cs = document.getElementById('rd-country-select');
  if (cs) cs.classList.toggle('open');
};

window.pickRdCountry = function(el, country) {
  const val = document.querySelector('#rd-country-select .rd-cs-val');
  if (val) val.innerHTML = el.innerHTML;
  document.querySelectorAll('.rd-cs-opt').forEach(o => o.classList.remove('rd-cs-opt--active'));
  el.classList.add('rd-cs-opt--active');
  const cs = document.getElementById('rd-country-select');
  if (cs) cs.classList.remove('open');
  filterRankings(country);
};

if (!window._rdCsOutsideClick) {
  window._rdCsOutsideClick = true;
  document.addEventListener('click', function(e) {
    const cs = document.getElementById('rd-country-select');
    if (cs && !cs.contains(e.target)) cs.classList.remove('open');
  });
}

window.toggleRdView = function(mode) {
  window._rdView = mode;
  const listWrap = document.querySelector('.rd-list-wrap');
  const gridWrap = document.querySelector('.rd-grid-wrap');
  const colLabels = document.querySelector('.rd-col-labels');
  if (listWrap) listWrap.style.display = mode === 'grid' ? 'none' : '';
  if (gridWrap) gridWrap.style.display = mode === 'grid' ? '' : 'none';
  if (colLabels) colLabels.style.display = mode === 'grid' ? 'none' : '';
  document.querySelectorAll('.rd-view-btn').forEach((btn, i) => {
    btn.classList.toggle('rd-view-btn--active', (i === 0 && mode === 'list') || (i === 1 && mode === 'grid'));
  });
};

function buildRankingsDetail(eventName, opts = {}) {
  const {
    archiveYear   = null,
    archiveWeekId = null,
    backUrl       = 'rankings.html',
    backLabel     = 'All Rankings',
  } = opts;

  let ev, weekObj;
  if (archiveYear) {
    const season = (RANKINGS_ARCHIVE || []).find(s => s.year === archiveYear);
    ev = season ? (season.events || []).find(e => e.name === eventName) : null;
    if (archiveWeekId) {
      weekObj = (RANKINGS_WEEKS || {})[archiveWeekId] || null;
    }
  } else {
    ev = RANKINGS_EVENTS.find(e => e.name === eventName);
  }
  // If the week exists but has no rows yet, fall back to the current live rankings for that event
  const liveEv = archiveYear ? RANKINGS_EVENTS.find(e => e.name === eventName) : null;
  const rows     = (weekObj && (weekObj.rows || []).length)     ? weekObj.rows     : (liveEv ? (liveEv.rows     || []) : ((ev && ev.rows)     || []));
  const sections = (weekObj && (weekObj.sections || []).length) ? weekObj.sections : (liveEv ? (liveEv.sections || []) : ((ev && ev.sections) || []));
  const weekLabel = weekObj ? (weekObj.label || null) : null;
  const displayYear = archiveYear || RANKINGS_YEAR;

  // Collect unique countries for filter pills
  const countryInfo = {};
  rows.forEach(r => {
    const a = r.athleteId && ATHLETES[r.athleteId];
    const c = (a && a.country) || r.country || '';
    const f = (a && a.flag)    || r.flag    || '';
    if (c && !countryInfo[c]) countryInfo[c] = f;
  });
  const countries = Object.keys(countryInfo).sort();
  const filterHtml = countries.length > 1
    ? `<div class="rd-filter">
        <div class="rd-cs" id="rd-country-select">
          <button class="rd-cs-btn" type="button" onclick="toggleRdCountrySelect()">
            <span class="rd-cs-val">All Countries</span>
            <svg class="rd-cs-arrow" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="rd-cs-list">
            <div class="rd-cs-opt rd-cs-opt--active" onclick="pickRdCountry(this, '')">All Countries</div>
            ${countries.map(c => `<div class="rd-cs-opt" onclick="pickRdCountry(this, '${c.replace(/'/g, "\\'")}')">${renderFlag(countryInfo[c])} ${c}</div>`).join('')}
          </div>
        </div>
      </div>`
    : '';

  const rowsHtml = rows.length
    ? rows.map((r, i) => buildRankingRow(r, i + 1)).join('')
    : `<p class="rankings-empty">No rankings data yet for this event.</p>`;

  const sectionsHtml = sections.map(sec => {
    if (!sec.entries || !sec.entries.length) return '';
    const entriesHtml = sec.entries.map(e => buildRankingRow(e, null)).join('');
    return `
      <div class="rd-section">
        <div class="rd-section-header">
          <span class="rd-section-title">${sec.title || ''}</span>
          ${sec.description ? `<span class="rd-section-desc">${sec.description}</span>` : ''}
        </div>
        <div class="rd-list">${entriesHtml}</div>
      </div>
    `;
  }).join('');

  const cardsHtml = rows.length
    ? rows.map((r, i) => buildRankingCard(r, i + 1)).join('')
    : '';

  const sectionCardsHtml = sections.map(sec => {
    if (!sec.entries || !sec.entries.length) return '';
    return `
      <div class="rd-section">
        <div class="rd-section-header">
          <span class="rd-section-title">${sec.title || ''}</span>
          ${sec.description ? `<span class="rd-section-desc">${sec.description}</span>` : ''}
        </div>
        <div class="rd-grid">${sec.entries.map(e => buildRankingCard(e, null)).join('')}</div>
      </div>
    `;
  }).join('');

  const isGrid = window._rdView === 'grid';
  const athleteCount = rows.length;
  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-detail">
        <a href="${backUrl}" class="rd-back">&larr; ${backLabel}</a>
        <div class="rd-header">
          <div class="rd-header-left">
            <div class="rd-header-meta">${displayYear} Season Rankings${archiveYear ? ' <span class="archive-stamp">Archive</span>' : ''}</div>
            <h1 class="rd-header-event">${eventName}</h1>
            ${weekLabel ? `<p class="rd-header-desc">${weekLabel}</p>` : (ev && ev.description ? `<p class="rd-header-desc">${ev.description}</p>` : '')}
          </div>
          <div class="rd-header-actions">
            ${athleteCount ? `<span class="rd-header-count">${athleteCount} athletes ranked</span>` : ''}
            <div class="rd-header-btns">
              <button class="h2h-hub-btn rd-h2h-inline" onclick="openH2H(null,'${eventName.replace(/'/g,"\\'")}')">⇌ Compare Athletes</button>
              <div class="rd-view-toggle">
                <button class="rd-view-btn${!isGrid ? ' rd-view-btn--active' : ''}" onclick="toggleRdView('list')" title="List view">
                  <svg viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="20" height="3" rx="1.5" fill="currentColor"/><rect x="0" y="6.5" width="20" height="3" rx="1.5" fill="currentColor"/><rect x="0" y="13" width="20" height="3" rx="1.5" fill="currentColor"/></svg>
                </button>
                <button class="rd-view-btn${isGrid ? ' rd-view-btn--active' : ''}" onclick="toggleRdView('grid')" title="Card view">
                  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="9" height="9" rx="1.5" fill="currentColor"/><rect x="11" y="0" width="9" height="9" rx="1.5" fill="currentColor"/><rect x="0" y="11" width="9" height="9" rx="1.5" fill="currentColor"/><rect x="11" y="11" width="9" height="9" rx="1.5" fill="currentColor"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        ${filterHtml}
        <div id="rd-col-sentinel"></div>
        <div class="rd-col-labels" style="${isGrid ? 'display:none' : ''}">
          <span>Rank</span><span>Athlete</span><span>Momentum</span><span style="text-align:right">Best / Meet</span>
        </div>
        <div class="rd-list-wrap" style="${isGrid ? 'display:none' : ''}">
          <div class="rd-list">${rowsHtml}</div>
          ${sectionsHtml}
        </div>
        <div class="rd-grid-wrap" style="${isGrid ? '' : 'display:none'}">
          <div class="rd-grid">${cardsHtml}</div>
          ${sectionCardsHtml}
        </div>
      </div>
    </div>
  `;
  // Detect when col-labels become sticky and activate the top-mask
  const sentinel = document.getElementById('rd-col-sentinel');
  const colLabels = document.querySelector('.rd-col-labels');
  if (sentinel && colLabels) {
    new IntersectionObserver(([entry]) => {
      colLabels.classList.toggle('is-sticky', !entry.isIntersecting);
    }, { rootMargin: '-62px 0px 0px 0px', threshold: 0 }).observe(sentinel);
  }

  if (!archiveYear) enrichRankingsWithWA(eventName);
}

// ── WA PERSONAL BEST ENRICHMENT ─────────────────────────────────
const _waBestCache = {};

async function fetchWAPersonalBests(waUrl, disciplines) {
  if (!waUrl) return null;
  if (_waBestCache[waUrl] !== undefined) return _waBestCache[waUrl];

  try {
    const res = await fetch(`/.netlify/functions/wa-athlete?url=${encodeURIComponent(waUrl)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const outdoor = json.outdoor || [];
    const result = {};
    for (const disc of disciplines) {
      const perf = outdoor.find(p => p.event === disc);
      if (perf) result[disc] = { mark: perf.time, venue: perf.venue };
    }
    _waBestCache[waUrl] = Object.keys(result).length ? result : null;
    return _waBestCache[waUrl];
  } catch (e) {
    _waBestCache[waUrl] = null;
    return null;
  }
}

// Event name keys match what wa-athlete.js normalizes to (e.g. '1500m', 'Mile')
const _WA_DISC = {
  '1500m': ['1500m', 'Mile'],
  '5000m': ['5000m'],
  '10000m': ['10000m'],
  '800m':  ['800m'],
  'mile':  ['Mile', '1500m'],
  'steeplechase': ['3000m SC'],
};

function getWADisciplines(eventName) {
  const norm = eventName.replace(/\s+/g, '').toLowerCase();
  for (const [key, discs] of Object.entries(_WA_DISC)) {
    if (norm.includes(key)) return discs;
  }
  return [];
}

async function enrichRankingsWithWA(eventName) {
  const disciplines = getWADisciplines(eventName);
  if (!disciplines.length) return;
  const is1500Page = eventName.toLowerCase().includes('1500');

  // Deduplicate — list + card both have data-athlete-id, only fetch each athlete once
  const seen = new Set();
  const queue = [];
  document.querySelectorAll('#main [data-athlete-id]').forEach(item => {
    const athId = item.dataset.athleteId;
    if (!athId || seen.has(athId)) return;
    seen.add(athId);
    const ath = ATHLETES[athId];
    if (ath) queue.push({ athId, ath });
  });

  // Process 3 athletes at a time, 300ms between batches
  const BATCH = 3;
  for (let i = 0; i < queue.length; i += BATCH) {
    await Promise.all(queue.slice(i, i + BATCH).map(async ({ athId, ath }) => {
      let mark = '', venue = '', isMile = false;

      const waBests = await fetchWAPersonalBests(ath.waUrl, disciplines);
      if (waBests) {
        for (const disc of disciplines) {
          if (waBests[disc]) {
            mark = waBests[disc].mark;
            venue = waBests[disc].venue;
            isMile = disc.toLowerCase().includes('mile');
            break;
          }
        }
      }

      // Fallback: local prs data
      if (!mark && ath.prs) {
        const pr = ath.prs.find(p => p.event === '1500m') || ath.prs.find(p => p.event === 'Mile');
        if (pr) { mark = pr.time; isMile = pr.event === 'Mile'; }
      }

      if (!mark) return;
      const mileBadge = (isMile && is1500Page) ? ' <span class="rd-mile-badge">Mile</span>' : '';

      // Update all DOM elements for this athlete (covers both list row and grid card)
      document.querySelectorAll(`#main [data-athlete-id="${athId}"]`).forEach(el => {
        const timeEl = el.querySelector('.rd-time');
        const meetEl = el.querySelector('.rd-meet');
        if (timeEl) timeEl.innerHTML = mark + mileBadge;
        if (meetEl) meetEl.textContent = venue || '';

        const cardTimeEl = el.querySelector('.rd-card-time');
        const cardMeetEl = el.querySelector('.rd-card-meet');
        if (cardTimeEl) cardTimeEl.innerHTML = mark + mileBadge;
        if (cardMeetEl) cardMeetEl.textContent = venue || '';
      });
    }));

    if (i + BATCH < queue.length) await new Promise(r => setTimeout(r, 300));
  }
}

// ============================================================
//  THE SPLITS — SITE LOGIC
//  Content is now loaded from _data/*.json files.
//  Edit content at yoursite.netlify.app/admin
// ============================================================

// ── UTILITIES ─────────────────────────────────────────────
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }
function getParam(name) { return new URLSearchParams(window.location.search).get(name); }
function goTo(url) { window.location.href = url; }

// ── DATA LOADING ──────────────────────────────────────────
let ARTICLES, ATHLETES, RANKINGS, RANKINGS_EVENTS, RANKINGS_CRITERIA, RANKINGS_YEAR, SITE;

async function loadData() {
  try {
    const noCache = { cache: 'no-store' };
    const [articlesData, athletesData, rankingsData, siteData] = await Promise.all([
      fetch('/_data/articles.json', noCache).then(r => r.json()),
      fetch('/_data/athletes.json', noCache).then(r => r.json()),
      fetch('/_data/rankings.json', noCache).then(r => r.json()),
      fetch('/_data/site.json', noCache).then(r => r.json()),
    ]);

    ARTICLES = articlesData.items || [];

    // Convert athletes array to object keyed by id
    ATHLETES = {};
    (athletesData.items || []).forEach(a => {
      ATHLETES[a.id] = normalizeAthlete(a);
    });

    // Convert events array to object keyed by event name
    RANKINGS = {};
    RANKINGS_EVENTS = rankingsData.events || [];
    RANKINGS_CRITERIA = rankingsData.criteria || '';
    RANKINGS_EVENTS.forEach(e => {
      RANKINGS[e.name] = e.rows || [];
    });

    RANKINGS_YEAR = rankingsData.year || '';
    SITE = siteData;

    document.documentElement.style.setProperty('--accent', SITE.accentColor || '#E8500A');

  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

// Convert flat athlete structure (from JSON/CMS) to the format the card expects
function normalizeAthlete(a) {
  return {
    ...a,
    vitals: {
      HEIGHT: a.height,
      WEIGHT: a.weight,
      AGE: a.age,
      SEASONS: a.seasons,
    },
    prs: (a.prs || []),
    extra: {
      CLUB: a.club,
      COACH: a.coach,
      HOMETOWN: a.hometown,
    },
    headline: { keyWord: a.headlineKey, rest: a.headlineRest },
    analysis: {
      reviewTitle: a.reviewTitle,
      reviewBody: a.reviewBody,
      questionTitle: a.questionTitle,
      questionBody: a.questionBody,
    },
  };
}

// ── RANKINGS TICKER ───────────────────────────────────────
function buildTickerHtml() {
  const rows = RANKINGS['1500m'] || [];
  if (!rows.length && !SITE.breakingNews) return '';

  let tickerContent = '';

  if (rows.length) {
    const items = rows.map((r, i) => {
      const rank = i + 1;
      const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
      const name = (a && a.name) || r.name || r.athleteId || '—';
      const clickAttr = r.athleteId
        ? `onclick="if(window.openAthleteCard){window.openAthleteCard('${r.athleteId}',${rank})}else{window.location.href='rankings.html'}" role="button" tabindex="0"`
        : `onclick="window.location.href='rankings.html'" role="button" tabindex="0"`;
      return `<span class="ticker-item ticker-item-link" ${clickAttr}><span class="ticker-rank">${rank}</span> ${name}</span>`;
    }).join('<span class="ticker-sep">·</span>');

    // Duplicate for seamless loop
    tickerContent = `
      <div class="ticker-track">
        <div class="ticker-content">${items}<span class="ticker-sep">·</span>${items}<span class="ticker-sep">·</span></div>
      </div>`;
  } else if (SITE.breakingNews) {
    tickerContent = `<span class="ticker-static">${SITE.breakingNews}</span>`;
  }

  return `
    <div class="breaking-bar" role="marquee">
      <a class="breaking-badge" href="rankings.html">1500m</a>
      ${tickerContent}
    </div>`;
}

// ── NAVBAR ────────────────────────────────────────────────
function buildNavbar() {
  const currentPage = document.body.dataset.page;
  const pageMap = { home: 'index.html', articles: 'articles.html', rankings: 'rankings.html', article: 'articles.html', athletes: 'athletes.html' };
  const activeHref = pageMap[currentPage] || '';

  const navLinks = [
    { label: 'Articles', href: 'articles.html' },
    { label: 'Rankings', href: 'rankings.html' },
    { label: 'Athletes', href: 'athletes.html' },
    { label: 'News', href: 'articles.html?category=News' },
    { label: 'Podcast', href: SITE.podcastUrl || '#' },
  ];

  const links = navLinks.map(l =>
    `<li><a href="${l.href}" class="${l.href.includes(activeHref) && activeHref ? 'active' : ''}">${l.label}</a></li>`
  ).join('');

  return `
    <nav class="navbar" role="navigation" aria-label="Main navigation">
      <div class="navbar-inner">
        <a href="index.html" class="navbar-brand">
          <svg class="brand-pencil" viewBox="0 0 11 21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">
            <rect x="1.75" y="0.75" width="7.5" height="2.75"/>
            <line x1="1.75" y1="4.25" x2="9.25" y2="4.25"/>
            <line x1="1.75" y1="5.25" x2="9.25" y2="5.25"/>
            <polyline points="1.75,5.25 1.75,14.5 5.5,19.75 9.25,14.5 9.25,5.25"/>
            <line x1="4" y1="5.25" x2="4" y2="14"/>
            <line x1="7" y1="5.25" x2="7" y2="14"/>
          </svg>${SITE.name}</a>
        <div class="navbar-brand-sep" aria-hidden="true"></div>
        <ul class="navbar-nav">${links}</ul>
        <button class="navbar-search-btn" onclick="openSearch()" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <a href="${SITE.subscribeUrl || '#'}" class="navbar-subscribe">${SITE.subscribeLabel || 'Subscribe'}</a>
        <button class="hamburger" onclick="toggleMobileMenu()" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
    <div class="mobile-drawer" id="mobile-drawer" aria-hidden="true">
      <div class="mobile-drawer-top">
        <a href="index.html" class="navbar-brand">
          <svg class="brand-pencil" viewBox="0 0 11 21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">
            <rect x="1.75" y="0.75" width="7.5" height="2.75"/>
            <line x1="1.75" y1="4.25" x2="9.25" y2="4.25"/>
            <line x1="1.75" y1="5.25" x2="9.25" y2="5.25"/>
            <polyline points="1.75,5.25 1.75,14.5 5.5,19.75 9.25,14.5 9.25,5.25"/>
            <line x1="4" y1="5.25" x2="4" y2="14"/>
            <line x1="7" y1="5.25" x2="7" y2="14"/>
          </svg>${SITE.name}</a>
        <button class="mobile-drawer-close" onclick="toggleMobileMenu()" aria-label="Close menu">×</button>
      </div>
      <ul class="mobile-drawer-nav">
        ${navLinks.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}
      </ul>
      <div class="mobile-drawer-footer">
        <button class="mobile-drawer-search" onclick="toggleMobileMenu();openSearch()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search
        </button>
        <a href="${SITE.subscribeUrl || '#'}" class="navbar-subscribe">${SITE.subscribeLabel || 'Subscribe'}</a>
      </div>
    </div>
    <div class="mobile-overlay" id="mobile-overlay" onclick="toggleMobileMenu()"></div>
    ${buildTickerHtml()}
    <div id="search-overlay" class="search-overlay" role="dialog" aria-label="Search">
      <div class="search-inner">
        <div class="search-header">
          <input id="search-input" type="text" placeholder="SEARCH…" autocomplete="off" oninput="handleSearchInput(this.value)">
          <button class="search-close-btn" onclick="closeSearch()" aria-label="Close search">×</button>
        </div>
        <div id="search-results-list" class="search-results-list"></div>
      </div>
    </div>
  `;
}

// ── MOBILE MENU ───────────────────────────────────────────
function toggleMobileMenu() {
  const drawer  = qs('#mobile-drawer');
  const overlay = qs('#mobile-overlay');
  if (!drawer) return;
  const open = drawer.classList.toggle('open');
  overlay.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
}
window.toggleMobileMenu = toggleMobileMenu;

// ── HEAD TO HEAD ───────────────────────────────────────────
let h2hSlots = [null, null];
let h2hEventContext = null;

function parseTimeToSecs(t) {
  if (!t) return null;
  const parts = String(t).trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function openH2H(preselectedId, eventContext) {
  h2hEventContext = eventContext || null;
  let modal = qs('#h2h-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'h2h-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="h2h-card">
        <div class="h2h-header">
          <span class="h2h-title">Head to Head</span>
          <button class="h2h-close-btn" onclick="closeH2H()" aria-label="Close">×</button>
        </div>
        <div class="h2h-pickers">
          <div class="h2h-picker" id="h2h-picker-1">
            <input class="h2h-input" id="h2h-input-1" placeholder="Search athlete…" autocomplete="off">
            <div class="h2h-dropdown" id="h2h-drop-1"></div>
          </div>
          <div class="h2h-vs">VS</div>
          <div class="h2h-picker" id="h2h-picker-2">
            <input class="h2h-input" id="h2h-input-2" placeholder="Search athlete…" autocomplete="off">
            <div class="h2h-dropdown" id="h2h-drop-2"></div>
          </div>
        </div>
        <div class="h2h-comparison" id="h2h-comparison">
          <p class="h2h-prompt">Search for two athletes above to compare them.</p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeH2H(); });
    setupH2HPickers();
  }
  h2hSlots = [null, null];
  qs('#h2h-input-1').value = '';
  qs('#h2h-input-2').value = '';
  qs('#h2h-comparison').innerHTML = '<p class="h2h-prompt">Search for two athletes above to compare them.</p>';
  const titleEl = qs('.h2h-title');
  if (titleEl) titleEl.textContent = 'Head to Head';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (preselectedId) setH2HSlot(1, preselectedId);
}

function closeH2H() {
  const modal = qs('#h2h-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function setupH2HPickers() {
  [1, 2].forEach(slot => {
    const input = qs('#h2h-input-' + slot);
    const drop  = qs('#h2h-drop-' + slot);
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
      const matches = Object.values(ATHLETES).filter(a => a.name.toLowerCase().includes(q)).slice(0, 7);
      drop.innerHTML = matches.length
        ? matches.map(a => `<div class="h2h-dd-item" onclick="setH2HSlot(${slot},'${a.id}')">${renderFlag(a.flag)} ${a.name} <span class="h2h-dd-country">${a.country}</span></div>`).join('')
        : '<div class="h2h-dd-empty">No athletes found</div>';
      drop.classList.add('open');
    });
    document.addEventListener('click', e => {
      if (!qs('#h2h-picker-' + slot)?.contains(e.target)) drop.classList.remove('open');
    });
  });
}

function setH2HSlot(slot, athleteId) {
  const a = ATHLETES[athleteId];
  if (!a) return;
  h2hSlots[slot - 1] = athleteId;
  qs('#h2h-input-' + slot).value = a.name;
  qs('#h2h-drop-' + slot).classList.remove('open');
  if (h2hSlots[0] && h2hSlots[1]) renderH2HComparison(h2hSlots[0], h2hSlots[1]);
}

function renderH2HComparison(id1, id2) {
  const a1 = ATHLETES[id1], a2 = ATHLETES[id2];
  if (!a1 || !a2) return;

  const getRankInfo = id => {
    const ranked = [];
    const sectioned = [];
    RANKINGS_EVENTS.forEach(ev => {
      const idx = (RANKINGS[ev.name] || []).findIndex(r => r.athleteId === id);
      if (idx !== -1) ranked.push({ event: ev.name, rank: idx + 1 });
      (ev.sections || []).forEach(sec => {
        if ((sec.entries || []).some(e => e.athleteId === id)) {
          sectioned.push({ event: ev.name, section: sec.title });
        }
      });
    });
    return { ranked, sectioned };
  };

  const EVENT_ORDER = ['60m','100m','200m','400m','800m','1500m','Mile','3000m','5000m','10000m','Half Marathon','Marathon','Steeplechase','60mH','110mH','400mH'];
  const a1Events = new Set((a1.prs || []).map(p => p.event));
  const a2Events = new Set((a2.prs || []).map(p => p.event));
  const shared = [...a1Events].filter(e => a2Events.has(e));

  const getPriority = (sharedEvs) => {
    const ctx = (h2hEventContext || '').toLowerCase();
    const has = ev => sharedEvs.includes(ev);
    if (ctx.includes('1500')) {
      return ['1500m', '800m', 'Mile', '3000m', '5000m'];
    } else if (ctx.includes('5000') || ctx.includes('3000')) {
      return [has('Mile') ? 'Mile' : '1500m', '3000m', '5000m', has('10000m') ? '10000m' : '800m'];
    } else if (ctx.includes('800')) {
      return ['800m', has('Mile') ? 'Mile' : '1500m'];
    } else if (ctx.includes('10000') || ctx.includes('10,000')) {
      return ['10000m', '5000m', '3000m', has('Mile') ? 'Mile' : '1500m'];
    }
    return [];
  };

  const priority = getPriority(shared);
  const allPrEvents = [
    ...priority.filter(e => shared.includes(e)),
    ...shared.filter(e => !priority.includes(e)).sort((a, b) => {
      const ai = EVENT_ORDER.indexOf(a), bi = EVENT_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }),
  ];

  const n1 = a1.name.split(' ').slice(-1)[0];
  const n2 = a2.name.split(' ').slice(-1)[0];

  // Shared 3-column PR table: a1 time | event | a2 time
  const sharedPrHtml = allPrEvents.length
    ? allPrEvents.map(ev => {
        const pr1 = (a1.prs || []).find(p => p.event === ev);
        const pr2 = (a2.prs || []).find(p => p.event === ev);
        const t1 = pr1 ? parseTimeToSecs(pr1.time) : null;
        const t2 = pr2 ? parseTimeToSecs(pr2.time) : null;
        const a1wins = t1 && t2 && t1 < t2;
        const a2wins = t1 && t2 && t2 < t1;
        return `<div class="h2h-shared-pr-row">
          <span class="h2h-spr-t${a1wins ? ' h2h-spr-win' : ''}">${pr1 ? pr1.time : '—'}</span>
          <span class="h2h-spr-ev">${ev}</span>
          <span class="h2h-spr-t h2h-spr-t--right${a2wins ? ' h2h-spr-win' : ''}">${pr2 ? pr2.time : '—'}</span>
        </div>`;
      }).join('')
    : '<div class="h2h-empty-row" style="text-align:center;padding:12px 0">No shared events to compare</div>';

  // Head-to-head race record from season results
  const r1all = a1.results || [];
  const r2all = a2.results || [];
  const h2hRaces = [];
  r1all.forEach(race1 => {
    if (!race1.meet || !race1.event) return;
    const match = r2all.find(race2 =>
      race2.meet && race2.event &&
      race1.meet.trim().toLowerCase() === race2.meet.trim().toLowerCase() &&
      race1.event.trim().toLowerCase() === race2.event.trim().toLowerCase()
    );
    if (!match) return;
    const p1 = parseInt(race1.place), p2 = parseInt(match.place);
    let a1wins = false, a2wins = false;
    if (!isNaN(p1) && !isNaN(p2)) {
      a1wins = p1 < p2; a2wins = p2 < p1;
    } else {
      const t1 = parseTimeToSecs(race1.time), t2 = parseTimeToSecs(match.time);
      if (t1 && t2) { a1wins = t1 < t2; a2wins = t2 < t1; }
    }
    h2hRaces.push({ date: race1.date, meet: race1.meet, event: race1.event,
      time1: race1.time, time2: match.time, place1: race1.place, place2: match.place,
      a1wins, a2wins });
  });
  const h2hW1 = h2hRaces.filter(r => r.a1wins).length;
  const h2hW2 = h2hRaces.filter(r => r.a2wins).length;

  const h2hRecordHtml = h2hRaces.length ? `
    <div class="h2h-record-section">
      <div class="h2h-pr-section-hdr">
        <span class="h2h-pr-ath">${n1}</span>
        <span class="h2h-pr-label">This Season</span>
        <span class="h2h-pr-ath h2h-pr-ath--right">${n2}</span>
      </div>
      <div class="h2h-record-score">
        <span class="h2h-record-wins${h2hW1 > h2hW2 ? ' h2h-record-leading' : ''}">${h2hW1}</span>
        <span class="h2h-record-label">${h2hRaces.length} race${h2hRaces.length === 1 ? '' : 's'}</span>
        <span class="h2h-record-wins${h2hW2 > h2hW1 ? ' h2h-record-leading' : ''}">${h2hW2}</span>
      </div>
      ${h2hRaces.map(r => `
        <div class="h2h-record-row">
          <span class="h2h-record-t${r.a1wins ? ' h2h-spr-win' : r.a2wins ? ' h2h-record-dim' : ''}">${r.time1 || '—'}${r.place1 ? ' <span class="h2h-record-place">(' + r.place1 + ')</span>' : ''}</span>
          <span class="h2h-record-mid">
            <span class="h2h-record-meet">${r.meet}</span>
            <span class="h2h-record-meta">${r.event}${r.date ? ' · ' + r.date : ''}</span>
          </span>
          <span class="h2h-record-t h2h-record-t--right${r.a2wins ? ' h2h-spr-win' : r.a1wins ? ' h2h-record-dim' : ''}">${r.time2 || '—'}${r.place2 ? ' <span class="h2h-record-place">(' + r.place2 + ')</span>' : ''}</span>
        </div>`).join('')}
    </div>` : '';

  const col = (a, isRight) => {
    const { ranked, sectioned } = getRankInfo(a.id);
    const photoHtml = a.photo
      ? `<img class="h2h-photo" src="${a.photo}" alt="${a.name}">`
      : `<div class="h2h-photo-ph"></div>`;

    let rankHtml;
    if (ranked.length) {
      rankHtml = ranked.map(r =>
        `<div class="h2h-rank-row"><span class="h2h-rank-num">#${r.rank}</span><span class="h2h-rank-ev">${r.event}</span></div>`
      ).join('');
    } else if (sectioned.length) {
      rankHtml = sectioned.map(s =>
        `<div class="h2h-rank-row h2h-rank-section">
          <span class="h2h-rank-tag">${s.section}</span><span class="h2h-rank-ev">${s.event}</span>
        </div>`
      ).join('');
    } else {
      rankHtml = `<div class="h2h-empty-row">No current ranking data</div>`;
    }

    return `
      <div class="h2h-col${isRight ? ' h2h-col--right' : ''}">
        <div class="h2h-photo-wrap" style="background:${a.photoBackground || '#111'}">${photoHtml}</div>
        <div class="h2h-name${isRight ? ' h2h-name--right' : ''}">${a.name}</div>
        <div class="h2h-country${isRight ? ' h2h-country--right' : ''}">${renderFlag(a.flag)} ${a.country}</div>
        ${a.event ? `<div class="h2h-event-tag${isRight ? ' h2h-event-tag--right' : ''}">${a.event}</div>` : ''}
        <div class="h2h-section-label">Rankings</div>
        <div class="h2h-ranks">${rankHtml}</div>
      </div>`;
  };

  qs('#h2h-comparison').innerHTML = `
    <div class="h2h-cols">
      ${col(a1, false)}
      <div class="h2h-col-divider"></div>
      ${col(a2, true)}
    </div>
    <div class="h2h-pr-section">
      <div class="h2h-pr-section-hdr">
        <span class="h2h-pr-ath">${n1}</span>
        <span class="h2h-pr-label">Personal Bests</span>
        <span class="h2h-pr-ath h2h-pr-ath--right">${n2}</span>
      </div>
      <div class="h2h-pr-table">${sharedPrHtml}</div>
    </div>
    ${h2hRecordHtml}`;

  const titleEl = qs('.h2h-title');
  if (titleEl) titleEl.textContent = `${n1} vs ${n2}`;

  requestAnimationFrame(() => {
    const els = qs('#h2h-comparison').querySelectorAll('.h2h-ranks');
    if (els.length === 2) {
      els[0].style.minHeight = '';
      els[1].style.minHeight = '';
      const maxH = Math.max(els[0].offsetHeight, els[1].offsetHeight);
      els[0].style.minHeight = maxH + 'px';
      els[1].style.minHeight = maxH + 'px';
    }
  });
}

window.openH2H = openH2H;
window.closeH2H = closeH2H;
window.setH2HSlot = setH2HSlot;

// ── SEARCH ────────────────────────────────────────────────
window.openSearch = function() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const input = document.getElementById('search-input');
  if (input) { input.value = ''; input.focus(); }
  const list = document.getElementById('search-results-list');
  if (list) list.innerHTML = '';
};

window.closeSearch = function() {
  const overlay = document.getElementById('search-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

window.handleSearchInput = function(query) {
  const container = document.getElementById('search-results-list');
  if (!container) return;
  const q = query.trim().toLowerCase();
  if (!q) { container.innerHTML = ''; return; }

  const results = ARTICLES.filter(a =>
    (a.title || '').toLowerCase().includes(q) ||
    (a.excerpt || '').toLowerCase().includes(q) ||
    (a.category || '').toLowerCase().includes(q) ||
    (a.author || '').toLowerCase().includes(q)
  );

  if (!results.length) {
    container.innerHTML = `<div class="search-no-results">No articles found for "${query}"</div>`;
    return;
  }

  container.innerHTML = results.map(a => `
    <div class="search-result-item" onclick="goTo('article.html?id=${a.id}');closeSearch();">
      <div class="search-result-cat">${a.category}</div>
      <div class="search-result-title">${a.title}</div>
      ${a.excerpt ? `<div class="search-result-excerpt">${a.excerpt}</div>` : ''}
      <div class="search-result-meta">${a.author} · ${a.date} · ${a.readTime}</div>
    </div>
  `).join('');
};

// ── CROP HELPERS ──────────────────────────────────────────
// Parse new-format crop string "x:20,y:10,w:60,h:40,ar:1.5"
function parseCropStr(str) {
  if (!str) return null;
  const m = String(str).match(/x:([\d.]+),y:([\d.]+),w:([\d.]+),h:([\d.]+),ar:([\d.]+)/);
  if (!m) return null;
  return { x: +m[1], y: +m[2], w: +m[3], h: +m[4], ar: +m[5] };
}

// Returns inline style for absolutely-positioned crop image
// x, y, w = percentages (0-100) of natural image; ar = image naturalWidth/naturalHeight
// containerAR = aspect ratio of the container (e.g. 16/9)
function cropImgStyle(crop, containerAR) {
  const { x, y, w, ar: iAR } = crop;
  // Image width as % of container width so the crop region fills the container
  const imgWidthPct = (10000 / w).toFixed(2);
  // Left offset so the crop region's left edge aligns with the container's left edge
  const imgLeftPct = (-(x / w) * 100).toFixed(2);
  // Top offset so the crop region's top edge aligns with the container's top edge
  // (derived from: -(y_frac * containerW / (w_frac * iAR)) / containerH = -(y * cAR) / (w * iAR))
  const imgTopPct = (-(y * containerAR * 100) / (w * iAR)).toFixed(2);
  return `width:${imgWidthPct}%;height:auto;left:${imgLeftPct}%;top:${imgTopPct}%;`;
}

// Render an image with optional precision crop, returning an HTML string.
// For new-format crop strings (x:...) uses absolute positioning inside the wrapper.
// For old-format strings ("50% 30%", "center") falls back to object-position.
function imgHTML(src, alt, cropStr, containerAR, cssClass) {
  if (!src) return `<div class="img-placeholder" style="aspect-ratio:${containerAR};"></div>`;
  const crop = parseCropStr(cropStr);
  if (crop) {
    return `<img class="cropped-img" src="${src}" alt="${alt}" loading="lazy" style="${cropImgStyle(crop, containerAR)}">`;
  }
  const pos = cropStr || 'center';
  return `<img class="${cssClass}" src="${src}" alt="${alt}" loading="lazy" style="object-position:${pos};">`;
}

// ── ARTICLE CARD HTML ──────────────────────────────────────
function articleCard(a) {
  const dest = a.type === 'rankings' ? 'rankings.html' : `article.html?id=${a.id}`;
  const img = imgHTML(a.image, a.title, a.imagePosition, 16/10, 'article-card-img');

  return `
    <article class="article-card" onclick="goTo('${dest}')">
      <div class="article-card-img-wrap">
        ${img}
        <span class="cat-tag">${a.category || 'RANKINGS'}</span>
      </div>
      <h3 class="article-card-title">${a.title}</h3>
      ${a.excerpt ? `<p class="article-card-excerpt">${a.excerpt}</p>` : ''}
      <div class="meta">
        ${a.author ? `<span class="author">${a.author}</span><span class="sep">·</span>` : ''}${a.date || ''}
        ${a.readTime ? `<span class="sep">·</span>${a.readTime}` : ''}
      </div>
    </article>
  `;
}

// ── HOME PAGE ─────────────────────────────────────────────
function buildHome() {
  const featuredRankings = ARTICLES.find(a => a.featured && a.type === 'rankings');
  const featured = ARTICLES.find(a => a.featured && a.type !== 'rankings') || ARTICLES.find(a => a.type !== 'rankings') || ARTICLES[0];
  const picks = ARTICLES.filter(a => a.editorsPick && a.type !== 'rankings').slice(0, 5);
  const latest = ARTICLES.filter(a => !a.featured).slice(0, 6);

  const picksHtml = picks.map(p => `
    <div class="ep-item" onclick="goTo('article.html?id=${p.id}')">
      <div class="ep-text">
        <div class="ep-cat">${p.category}</div>
        <div class="ep-title">${p.title}</div>
        <div class="ep-meta">${p.author} · ${p.readTime}</div>
      </div>
      ${p.image ? `<img class="ep-thumb" src="${p.image}" alt="${p.title}" loading="lazy">` : ''}
    </div>
  `).join('');

  const editorPicksLabel = SITE.editorPicksLabel || "Editors' Picks";
  const latestTitle = SITE.latestArticlesTitle || 'Latest Articles';

  const latestHtml = latest.map(a => articleCard(a)).join('');

  const firstEvent = Object.keys(RANKINGS)[0] || '';

  const eventTabsHtml = Object.keys(RANKINGS).map((ev, i) =>
    `<button class="event-tab ${i === 0 ? 'active' : ''}" data-event="${ev}">${ev}</button>`
  ).join('');

  const rankingsWidgetHtml = SITE.showRankingsWidget === false ? '' : `
    <div class="rankings-widget">
      <div class="rw-header">
        <div class="rw-title">${RANKINGS_YEAR} World Rankings</div>
        <div class="event-tabs" id="home-tabs">${eventTabsHtml}</div>
      </div>
      <div id="rankings-table-wrap">${buildRankingsTableHtml(firstEvent, true)}</div>
      <a href="rankings.html" class="view-all-link">View full rankings →</a>
    </div>
  `;

  const heroItem = featuredRankings || featured;
  const rankingsEvent = featuredRankings && featuredRankings.rankingsEvent;
  const heroDest = featuredRankings
    ? `rankings.html${rankingsEvent ? '?event=' + encodeURIComponent(rankingsEvent) : ''}`
    : `article.html?id=${heroItem.id}`;
  const heroImg = imgHTML(heroItem.image, heroItem.title, heroItem.imagePosition, 21/9, 'home-hero-img');

  const countdownHtml = buildCountdownPills();

  document.getElementById('main').innerHTML = `
    ${SITE.homeTagline || countdownHtml ? `
      <div class="container">
        ${SITE.homeTagline ? `<div class="home-tagline">${SITE.homeTagline}</div>` : ''}
        ${countdownHtml ? `<div class="home-countdown">${countdownHtml}</div>` : ''}
      </div>` : ''}

    <div class="home-hero-full" onclick="goTo('${heroDest}')">
      ${heroImg}
      <span class="cat-tag">${heroItem.category || 'RANKINGS'}</span>
      <div class="home-hero-overlay">
        <div class="container">
          <h1 class="home-hero-title">${heroItem.title}</h1>
          <div class="home-hero-meta">
            ${heroItem.author ? `By <span class="author">${heroItem.author}</span><span class="sep">·</span>` : ''}${heroItem.date || ''}
            ${heroItem.readTime ? `<span class="sep">·</span>${heroItem.readTime}` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      ${picksHtml ? `
        <div class="home-ep-row">
          <div class="ep-label">${editorPicksLabel}</div>
          <div class="home-ep-list">${picksHtml}</div>
        </div>` : ''}

      <div class="section-header">
        <h2 class="section-title">${latestTitle}</h2>
      </div>
      <div class="articles-grid">${latestHtml}</div>

      ${rankingsWidgetHtml}
    </div>
  `;

  qsa('.event-tab', qs('#home-tabs')).forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.event-tab', qs('#home-tabs')).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      qs('#rankings-table-wrap').innerHTML = buildRankingsTableHtml(btn.dataset.event, true);
    });
  });
}

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
        <td><span class="best-time">${r.seasonBest || ''}</span></td>
        <td class="meet-cell">${r.meet || ''}</td>
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

// ── ATHLETES PAGE ─────────────────────────────────────────
function buildAthletesPage() {
  const all = Object.values(ATHLETES);
  let activeSort = 'alpha';

  function sortedAthletes() {
    const list = [...all];
    if (activeSort === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name));
    if (activeSort === 'country') list.sort((a, b) => (a.country || '').localeCompare(b.country || '') || a.name.localeCompare(b.name));
    return list;
  }

  function renderGrid(list) {
    if (!list.length) return '<p class="ath-page-empty">No athletes found.</p>';
    return list.map(a => {
      const photo = a.photo || '';
      const bg = a.photoBackground || '#111';
      const prsHtml = (a.prs || []).slice(0, 3).map(pr =>
        `<div class="ath-page-pr"><span class="ath-page-pr-event">${pr.event}</span><span class="ath-page-pr-time">${pr.time}</span></div>`
      ).join('');
      return `
        <div class="ath-page-card" onclick="openAthleteCard('${a.id}', null)" role="button" tabindex="0">
          <div class="ath-page-photo" style="${photo ? `background-color:${bg};background-image:url('${photo}')` : `background:${bg}`}"></div>
          <div class="ath-page-body">
            <div class="ath-page-name">${a.name}</div>
            <div class="ath-page-country">${renderFlag(a.flag)} ${a.country}</div>
            ${prsHtml ? `<div class="ath-page-prs">${prsHtml}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="ath-page-header">
        <div class="ath-page-header-left">
          <h1 class="ath-page-title">Athletes</h1>
          <span class="ath-page-count">${all.length} athletes</span>
        </div>
        <div class="ath-page-sort-toggle">
          <button class="ath-page-sort active" data-sort="alpha" onclick="sortAthletes('alpha')">A – Z</button>
          <button class="ath-page-sort" data-sort="country" onclick="sortAthletes('country')">By Country</button>
        </div>
      </div>
      <div class="ath-page-grid" id="ath-page-grid">${renderGrid(sortedAthletes())}</div>
    </div>`;

  window.sortAthletes = function(sort) {
    activeSort = sort;
    document.querySelectorAll('.ath-page-sort').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
    qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes());
  };
}

// ── ARTICLES PAGE ─────────────────────────────────────────
const ARTICLES_PER_PAGE = 9;

function buildArticlesPage() {
  const all = ARTICLES;
  const cats = ['All', ...new Set(all.map(a => a.category))];
  let currentList = all;
  let shown = ARTICLES_PER_PAGE;

  const filterHtml = cats.map((c, i) =>
    `<button class="filter-btn ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Articles</h1>
        ${SITE.articlesIntro ? `<p class="page-intro">${SITE.articlesIntro}</p>` : ''}
      </div>
      <div class="filter-bar" id="filter-bar">${filterHtml}</div>
      <div class="articles-grid" id="articles-grid"></div>
      <div id="load-more-wrap" style="text-align:center;margin:8px 0 52px;"></div>
    </div>
  `;

  function renderGrid() {
    const visible = currentList.slice(0, shown);
    const remaining = currentList.length - shown;
    qs('#articles-grid').innerHTML = visible.length
      ? visible.map(a => articleCard(a)).join('')
      : `<p style="color:var(--muted);font-size:14px;grid-column:1/-1;padding:20px 0;">No articles in this category yet.</p>`;
    qs('#load-more-wrap').innerHTML = remaining > 0
      ? `<button class="load-more-btn">Load more <span style="color:var(--muted);font-size:13px;">(${remaining} remaining)</span></button>`
      : '';
  }

  renderGrid();

  qs('#filter-bar').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    qsa('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    currentList = cat === 'All' ? all : all.filter(a => a.category === cat);
    shown = ARTICLES_PER_PAGE;
    renderGrid();
  });

  qs('#load-more-wrap').addEventListener('click', e => {
    if (!e.target.closest('.load-more-btn')) return;
    shown += ARTICLES_PER_PAGE;
    renderGrid();
    qs('#articles-grid').children[shown - ARTICLES_PER_PAGE]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ── ARTICLE DETAIL PAGE ───────────────────────────────────
function buildArticlePage() {
  const id = getParam('id');
  const a = ARTICLES.find(x => x.id === id);

  if (!a) {
    document.getElementById('main').innerHTML = `
      <div class="container" style="padding:60px 0;">
        <p>Article not found. <a href="articles.html" style="color:var(--accent)">← Back to articles</a></p>
      </div>`;
    return;
  }

  document.title = `${a.title} — ${SITE.name}`;

  const detailCrop = parseCropStr(a.imagePosition);
  const imgHtml = a.image
    ? (detailCrop
        ? `<div class="article-detail-image-wrap"><img class="cropped-img" src="${a.image}" alt="${a.title}" style="${cropImgStyle(detailCrop, 16/9)}"></div>`
        : `<img class="article-detail-image" src="${a.image}" alt="${a.title}" style="object-position:${a.imagePosition || 'center'};">`)
    : `<div class="article-detail-image-placeholder"></div>`;

  // Render markdown body if marked is available, otherwise use as-is
  const bodyHtml = (window.marked && a.body)
    ? window.marked.parse(a.body)
    : (a.body || '');

  document.getElementById('main').innerHTML = `
    <div class="article-detail">
      <div class="article-detail-cat"><span class="cat-tag">${a.category}</span></div>
      <h1 class="article-detail-title">${a.title}</h1>
      <p class="article-detail-excerpt">${a.excerpt}</p>
      <div class="article-detail-meta">
        By <strong>${a.author}</strong> · ${a.date} · ${a.readTime}
      </div>
      ${imgHtml}
      <div class="article-body">${bodyHtml}</div>
      <div style="margin-top:48px;padding-top:24px;border-top:1px solid var(--border);">
        <a href="articles.html" style="color:var(--accent);font-size:14px;font-weight:700;">← All articles</a>
      </div>
    </div>
  `;
}

// ── RANKINGS PAGE ─────────────────────────────────────────
function buildRankingsPage() {
  const eventParam = getParam('event');
  if (eventParam) {
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
        <div class="ranking-card-photo" ${photoStyle}></div>
        <div class="ranking-card-num">${num}</div>
        <div class="ranking-card-body">
          <div class="ranking-card-event">${ev.name}</div>
          ${ev.description ? `<div class="ranking-card-desc">${ev.description}</div>` : ''}
          <div class="ranking-card-cta">${count ? `${count} athletes ranked` : 'Under construction'} &rarr;</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-hub">
        <div class="page-header">
          <h1 class="page-title">${RANKINGS_YEAR} Rankings</h1>
          ${SITE.rankingsIntro ? `<p class="page-intro">${SITE.rankingsIntro}</p>` : ''}
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
        <div class="rankings-hub-actions">
          <button class="h2h-hub-btn" onclick="openH2H()">⇌ Compare Athletes Head to Head</button>
        </div>
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

function buildMomentumHtml(val) {
  if (val == null || val === '') return '<div class="rd-momentum-col"></div>';
  const v   = Math.max(-10, Math.min(10, Number(val)));
  const pct = ((v + 10) / 20) * 100;
  const str = (v > 0 ? '+' : '') + v;
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu';
  return `
    <div class="rd-momentum-col">
      <div class="rd-momentum">
        <div class="rd-momentum-bar">
          <div class="rd-momentum-marker" style="left:${pct}%"></div>
        </div>
        <span class="rd-momentum-val ${cls}">${str}</span>
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
      ${rank != null ? `<div class="rd-rank ${rankClass}">${rank}</div>` : '<div class="rd-rank-empty"></div>'}
      <div class="rd-avatar ${photo ? '' : 'rd-avatar--empty'}" style="${photo ? `background-color:${photoBg};background-image:url('${photo}');background-size:cover;background-position:top center` : ''}"></div>
      <div class="rd-info">
        <div class="rd-name">${name}</div>
        <div class="rd-country">${renderFlag(flag)} ${country}</div>
      </div>
      ${buildMomentumHtml(r.momentum)}
      <div class="rd-right">
        ${r.reason ? `<div class="rd-reason">${r.reason}</div>` : ''}
        <div class="rd-time">${seasonBest}</div>
        <div class="rd-meet">${meet}</div>
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

function _pillForMeet(meet) {
  if (!meet || !meet.name || !meet.datetime) return '';
  const target = new Date(meet.datetime);
  const diffMs = target - Date.now();
  if (diffMs < 0 || diffMs > 60 * 24 * 3600000) return '';
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hrs  = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  let label;
  if (days > 0)       label = `${days}d ${hrs}h`;
  else if (hrs > 0)   label = `${hrs}h ${mins}m`;
  else                label = `${mins}m`;
  const style = meet.color ? ` style="background:${meet.color}"` : '';
  return `<span class="rd-countdown-pill"${style}>⏱ ${label} · ${meet.name}</span>`;
}

function buildCountdownPills() {
  const meets = (SITE && SITE.upcomingMeets) || (SITE && SITE.nextMeet ? [SITE.nextMeet] : []);
  return meets.map(_pillForMeet).filter(Boolean).join('');
}

function buildCountdownPill() {
  return buildCountdownPills();
}

function buildRankingsDetail(eventName) {
  const ev = RANKINGS_EVENTS.find(e => e.name === eventName);
  const rows = (ev && ev.rows) ? ev.rows : [];
  const sections = (ev && ev.sections) ? ev.sections : [];

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
        <div class="rd-header">
          <div class="rd-header-text">
            <a href="rankings.html" class="rd-back">&larr; All Rankings</a>
            <div class="rd-header-meta">${RANKINGS_YEAR} Season Rankings</div>
            <h1 class="rd-header-event">${eventName}</h1>
            ${ev && ev.description ? `<p class="rd-header-desc">${ev.description}</p>` : ''}
            <div class="rd-header-actions">
              ${athleteCount ? `<span class="rd-header-count">${athleteCount} athletes ranked</span>` : ''}
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
          ${ev && ev.photo ? `<div class="rd-header-photo" style="background-image:url('${ev.photo}')"></div>` : ''}
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

  enrichRankingsWithWA(eventName);
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
      <div class="rd-card-photo" style="${photo ? `background-color:${photoBg};background-image:url('${photo}')` : `background:${photoBg}`}">
        ${rank != null ? `<div class="rd-card-rank ${rankClass}">${rank}</div>` : ''}
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

// ── ATHLETE CARD MODAL ─────────────────────────────────────
function buildAthleteCardModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'athlete-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = '<div class="athlete-card" id="athlete-card-inner"></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeAthleteCard();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAthleteCard();
  });
}

function openAthleteCard(athleteId, rank) {
  const a = ATHLETES[athleteId];
  if (!a) return;

  const overlay = qs('#athlete-modal');
  const inner = qs('#athlete-card-inner');

  const photoHtml = a.photo
    ? `<img class="card-photo" src="${a.photo}" alt="${a.name}">`
    : `<div class="card-photo-placeholder"><span class="card-photo-placeholder-icon">🏃</span></div>`;

  const vitalsHtml = Object.entries(a.vitals || {}).map(([k, v]) => `
    <div class="card-vital">
      <span class="card-vital-label">${k}</span>
      <span class="card-vital-value">${v}</span>
    </div>
  `).join('');

  const prsHtml = (a.prs || []).slice(0, 4).map(pr => `
    <div class="card-pr-row">
      <span class="card-pr-event">${pr.event || ''}</span>
      <span class="card-pr-time">${pr.time || ''}</span>
    </div>
  `).join('');

  const achieveHtml = (a.achievements || []).map(ac => `
    <div class="card-achievement">
      <span class="card-achievement-icon">${ac.icon}</span>
      <span class="card-achievement-count">${ac.count}</span>
      <span class="card-achievement-label">${ac.label}</span>
    </div>
  `).join('');

  const extraHtml = Object.entries(a.extra || {}).map(([k, v]) =>
    v ? `<strong>${k}</strong> ${v}<br>` : ''
  ).join('');

  const traitsHtml = (a.traits || []).map(t => `
    <div class="card-trait">
      <div class="card-trait-icon">${t.emoji}</div>
      <div class="card-trait-label">${t.label}</div>
    </div>
  `).join('');

  const an = a.analysis || {};

  inner.innerHTML = `
    <div class="card-header">
      <div class="card-rank">${rank}</div>
      <div class="card-header-center">
        <div class="card-header-top">
          <button class="card-compare-btn" onclick="closeAthleteCard();openH2H('${athleteId}',new URLSearchParams(location.search).get('event'))" title="Compare athletes">⇌ Compare</button>
        </div>
        <div>
          <span class="card-athlete-name">${a.name}</span>
          <span class="card-athlete-country">${renderFlag(a.flag)} ${a.country}</span>
        </div>
      </div>
      <button class="card-close" onclick="closeAthleteCard()" aria-label="Close">×</button>
    </div>
    <div class="card-body">
      <div class="card-left">
        <div class="card-photo-wrap" style="background:${a.photoBackground || '#1a1a2e'};">
          <div class="card-photo-bg"></div>
          ${photoHtml}
          <span class="card-event-badge">${a.event || ''}</span>
        </div>
        <div class="card-info">
          <div class="card-vitals">${vitalsHtml}</div>
          ${prsHtml ? `<div class="card-prs"><div class="card-prs-label">Personal Records</div>${prsHtml}</div>` : ''}
          ${achieveHtml ? `<div class="card-achievements">${achieveHtml}</div>` : ''}
          ${extraHtml ? `<div class="card-extra">${extraHtml}</div>` : ''}
          ${a.ncaa ? `
            <div class="card-ncaa">
              <div class="card-ncaa-logos">
                <svg class="card-ncaa-logo" viewBox="0 0 72 28" xmlns="http://www.w3.org/2000/svg" aria-label="NCAA">
                  <rect width="72" height="28" rx="5" fill="#003087"/>
                  <text x="36" y="20" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="15" fill="#ffffff" letter-spacing="1">NCAA</text>
                </svg>
                ${a.collegeLogo ? `<img class="card-college-logo" src="${a.collegeLogo}" alt="${a.college || 'College logo'}">` : ''}
              </div>
              ${a.college ? `<div class="card-college-name">${a.college}</div>` : ''}
            </div>
          ` : ''}
          ${a.waUrl ? `<a class="card-wa-link" href="${a.waUrl}" target="_blank" rel="noopener noreferrer">World Athletics ↗</a>` : ''}
        </div>
      </div>
      <div class="card-right">
        ${a.headline ? `
          <div class="card-headline">
            <span class="hl-key">${a.headline.keyWord}</span>
            <span class="hl-rest"> ${a.headline.rest}</span>
          </div>
        ` : ''}
        ${traitsHtml ? `<div class="card-traits">${traitsHtml}</div>` : ''}
        ${(() => {
          const results = a.results || [];
          return `
          <details class="card-results">
            <summary class="card-results-toggle">
              <span class="card-results-label">2026 Season Results</span>
              <span class="card-results-count">${results.length} race${results.length === 1 ? '' : 's'}</span>
              <span class="card-results-arrow">▸</span>
            </summary>
            ${results.length > 0 ? `
            <table class="card-results-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meet</th>
                  <th>Event</th>
                  <th>Time</th>
                  <th>Pl.</th>
                </tr>
              </thead>
              <tbody>
                ${results.map(r => `
                  <tr>
                    <td class="cr-date">${r.date || ''}</td>
                    <td class="cr-meet">${r.meet || ''}</td>
                    <td class="cr-event">${r.event || ''}</td>
                    <td class="cr-time">${r.time || ''}</td>
                    <td class="cr-place">${r.place || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : `<p class="card-results-empty">No results yet this season.</p>`}
          </details>`;
        })()}
        <div class="card-analysis-label">Analysis</div>
        ${an.reviewTitle ? `
          <div class="card-analysis-section">
            <p><strong>${an.reviewTitle}:</strong> ${an.reviewBody || ''}</p>
          </div>
        ` : ''}
        ${an.questionTitle ? `
          <div class="card-analysis-section">
            <p><strong>${an.questionTitle}:</strong> <em>${an.questionBody || ''}</em></p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAthleteCard() {
  qs('#athlete-modal').classList.remove('open');
  document.body.style.overflow = '';
}

window.openAthleteCard = openAthleteCard;
window.closeAthleteCard = closeAthleteCard;
window.goTo = goTo;

// Opens full card if athlete profile exists, otherwise shows a compact mini card
window.openRankingRow = function(encodedData) {
  const r = JSON.parse(decodeURIComponent(encodedData));
  if (r.athleteId && ATHLETES[r.athleteId]) {
    openAthleteCard(r.athleteId, r.rank);
    return;
  }
  // Mini card for athletes without a full profile
  const overlay = qs('#athlete-modal');
  const inner = qs('#athlete-card-inner');
  inner.innerHTML = `
    <div class="card-header">
      <div class="card-rank">${r.rank}</div>
      <div class="card-header-center">
        <div class="card-athlete-name">${r.name}</div>
        <span class="card-athlete-country">${renderFlag(r.flag)} ${r.country}</span>
      </div>
      <button class="card-close" onclick="closeAthleteCard()" aria-label="Close">×</button>
    </div>
    <div class="mini-card-body">
      <div class="mini-card-stat">
        <div class="mini-card-stat-value">${r.seasonBest || '—'}</div>
        <div class="mini-card-stat-label">Season Best</div>
      </div>
      <div class="mini-card-stat">
        <div class="mini-card-stat-value">${r.meet || '—'}</div>
        <div class="mini-card-stat-label">Meet</div>
      </div>
      <div class="mini-card-note">Full athlete profile coming soon.</div>
    </div>
  `;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

// ── FOOTER ────────────────────────────────────────────────
function buildFooter() {
  const socials = [
    SITE.twitterUrl ? `<li><a href="${SITE.twitterUrl}" target="_blank" rel="noopener">Twitter / X</a></li>` : '',
    SITE.instagramUrl ? `<li><a href="${SITE.instagramUrl}" target="_blank" rel="noopener">Instagram</a></li>` : '',
    SITE.youtubeUrl ? `<li><a href="${SITE.youtubeUrl}" target="_blank" rel="noopener">YouTube</a></li>` : '',
  ].join('');

  return `
    <footer>
      <div class="footer-inner">
        <div class="footer-brand-wrap">
          <div class="footer-brand">
            <svg class="brand-pencil" viewBox="0 0 11 21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">
              <rect x="1.75" y="0.75" width="7.5" height="2.75"/>
              <line x1="1.75" y1="4.25" x2="9.25" y2="4.25"/>
              <line x1="1.75" y1="5.25" x2="9.25" y2="5.25"/>
              <polyline points="1.75,5.25 1.75,14.5 5.5,19.75 9.25,14.5 9.25,5.25"/>
              <line x1="4" y1="5.25" x2="4" y2="14"/>
              <line x1="7" y1="5.25" x2="7" y2="14"/>
            </svg>${SITE.name}
          </div>
          ${SITE.footerTagline ? `<div class="footer-tagline">${SITE.footerTagline}</div>` : ''}
        </div>
        <ul class="footer-links">
          <li><a href="articles.html">Articles</a></li>
          <li><a href="rankings.html">Rankings</a></li>
          ${socials}
        </ul>
        <div class="footer-copy">${SITE.footerCopyright || ''}</div>
      </div>
    </footer>
  `;
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Reading progress bar (only visible on article pages)
  const progressBar = document.createElement('div');
  progressBar.id = 'reading-progress';
  document.body.insertBefore(progressBar, document.body.firstChild);

  await loadData();

  const navTarget = qs('#nav-placeholder');
  if (navTarget) navTarget.innerHTML = buildNavbar();

  const footerTarget = qs('#footer-placeholder');
  if (footerTarget) footerTarget.outerHTML = buildFooter();

  const page = document.body.dataset.page;
  if (page === 'home')     buildHome();
  if (page === 'articles') buildArticlesPage();
  if (page === 'article')  buildArticlePage();
  if (page === 'rankings') buildRankingsPage();
  if (page === 'athletes') buildAthletesPage();

  buildAthleteCardModal();

  // Re-trigger fade-in animation whenever #main content is replaced
  const mainEl = document.getElementById('main');
  if (mainEl) {
    new MutationObserver(() => {
      mainEl.classList.remove('page-entering');
      void mainEl.offsetWidth;
      mainEl.classList.add('page-entering');
    }).observe(mainEl, { childList: true });
  }

  // Scroll handler: progress bar on article pages
  if (page === 'article') {
    window.addEventListener('scroll', () => {
      const total = document.body.scrollHeight - window.innerHeight;
      progressBar.style.width = total > 0 ? ((window.scrollY / total) * 100) + '%' : '0%';
    }, { passive: true });
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('search-overlay');
      if (overlay && overlay.classList.contains('open')) closeSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  // Close search when clicking outside the search box
  document.addEventListener('click', e => {
    const overlay = document.getElementById('search-overlay');
    if (overlay && e.target === overlay) closeSearch();
  });
});

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
  const pageMap = { home: 'index.html', articles: 'articles.html', rankings: 'rankings.html', article: 'articles.html' };
  const activeHref = pageMap[currentPage] || '';

  const navLinks = [
    { label: 'Articles', href: 'articles.html' },
    { label: 'Rankings', href: 'rankings.html' },
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

  // Returns ranked positions AND any section appearances for an athlete
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

  // Build intersection of PR events — only events both athletes have recorded
  const EVENT_ORDER = ['60m','100m','200m','400m','800m','1500m','Mile','3000m','5000m','10000m','Half Marathon','Marathon','Steeplechase','60mH','110mH','400mH'];
  const a1Events = new Set((a1.prs || []).map(p => p.event));
  const a2Events = new Set((a2.prs || []).map(p => p.event));
  const shared = [...a1Events].filter(e => a2Events.has(e));

  // Determine priority order based on event context
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

  const colPrHtml = (a, opp) => {
    if (!allPrEvents.length) return '<div class="h2h-empty-row">No PRs listed</div>';
    return allPrEvents.map(ev => {
      const pr    = (a.prs   || []).find(p => p.event === ev);
      const oppPr = (opp.prs || []).find(p => p.event === ev);
      const mine   = pr    ? parseTimeToSecs(pr.time)    : null;
      const theirs = oppPr ? parseTimeToSecs(oppPr.time) : null;
      const better = mine && theirs && mine < theirs;
      return `<div class="h2h-pr-row${better ? ' h2h-pr-win' : ''}">
        <span class="h2h-pr-ev">${ev}</span>
        <span class="h2h-pr-t">${pr ? pr.time + (better ? ' ✓' : '') : '—'}</span>
      </div>`;
    }).join('');
  };

  const col = (a, opp) => {
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
      <div class="h2h-col">
        <div class="h2h-photo-wrap" style="background:${a.photoBackground || '#111'}">${photoHtml}</div>
        <div class="h2h-name">${a.name}</div>
        <div class="h2h-country">${renderFlag(a.flag)} ${a.country}</div>
        <div class="h2h-section-label">Rankings</div>
        <div class="h2h-ranks">${rankHtml}</div>
        <div class="h2h-section-label">Personal Bests</div>
        <div class="h2h-prs">${colPrHtml(a, opp)}</div>
      </div>`;
  };

  qs('#h2h-comparison').innerHTML = `
    <div class="h2h-cols">
      ${col(a1, a2)}
      <div class="h2h-col-divider"></div>
      ${col(a2, a1)}
    </div>`;

  // Equalize heights of matching sections so dividers line up
  requestAnimationFrame(() => {
    ['h2h-ranks', 'h2h-prs'].forEach(cls => {
      const els = qs('#h2h-comparison').querySelectorAll('.' + cls);
      if (els.length === 2) {
        els[0].style.minHeight = '';
        els[1].style.minHeight = '';
        const maxH = Math.max(els[0].offsetHeight, els[1].offsetHeight);
        els[0].style.minHeight = maxH + 'px';
        els[1].style.minHeight = maxH + 'px';
      }
    });
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
  const heroImg  = imgHTML(heroItem.image, heroItem.title, heroItem.imagePosition, 16/9, 'hero-image');
  const heroHtml = `
    <div>
      <div class="hero-image-wrap" onclick="goTo('${heroDest}')" style="cursor:pointer">
        ${heroImg}
        <span class="cat-tag">${heroItem.category || 'RANKINGS'}</span>
      </div>
      <div class="hero-body">
        <h1 class="hero-title" onclick="goTo('${heroDest}')">${heroItem.title}</h1>
        <p class="hero-excerpt">${heroItem.excerpt || ''}</p>
        <div class="meta">
          ${heroItem.author ? `By <span class="author">${heroItem.author}</span><span class="sep">·</span>` : ''}${heroItem.date || ''}
          ${heroItem.readTime ? `<span class="sep">·</span>${heroItem.readTime}` : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('main').innerHTML = `
    <div class="container">
      ${SITE.homeTagline ? `<div class="home-tagline">${SITE.homeTagline}</div>` : ''}
      <section class="hero">
        ${heroHtml}
        <div class="editors-picks">
          <div class="ep-label">${editorPicksLabel}</div>
          ${picksHtml}
        </div>
      </section>

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
    <div class="rd-row${rank <= 3 && rank != null ? ' rd-row--podium' : ''}" onclick="openRankingRow('${clickData}')">
      ${rank != null ? `<div class="rd-rank ${rankClass}">${rank}</div>` : '<div class="rd-rank-empty"></div>'}
      <div class="rd-avatar ${photo ? '' : 'rd-avatar--empty'}" style="${photo ? `background-color:${photoBg};background-image:url('${photo}');background-size:cover;background-position:top center` : ''}"></div>
      <div class="rd-info">
        <div class="rd-name">${name}</div>
        <div class="rd-country">${renderFlag(flag)} ${country}</div>
      </div>
      ${buildMomentumHtml(r.momentum)}
      <div class="rd-right">
        ${r.reason
          ? `<div class="rd-reason">${r.reason}</div>`
          : `<div class="rd-time">${seasonBest}</div><div class="rd-meet">${meet}</div>`
        }
      </div>
    </div>
  `;
}

function buildRankingsDetail(eventName) {
  const ev = RANKINGS_EVENTS.find(e => e.name === eventName);
  const rows = (ev && ev.rows) ? ev.rows : [];
  const sections = (ev && ev.sections) ? ev.sections : [];

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
            </div>
          </div>
          ${ev && ev.photo ? `<div class="rd-header-photo" style="background-image:url('${ev.photo}')"></div>` : ''}
        </div>
        <div class="rd-col-labels">
          <span>Rank</span><span>Athlete</span><span>Momentum</span><span style="text-align:right">Best / Meet</span>
        </div>
        <div class="rd-list">${rowsHtml}</div>
        ${sectionsHtml}
      </div>
    </div>
  `;
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

  buildAthleteCardModal();

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

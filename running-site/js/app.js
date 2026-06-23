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
  const sg = a.stats_group || a;
  return {
    ...a,
    vitals: {
      HEIGHT: a.height,
      WEIGHT: a.weight,
      AGE: a.age,
      SEASONS: a.seasons,
    },
    stats: [
      { value: sg.stat1Value, label: sg.stat1Label, sub: sg.stat1Sub },
      { value: sg.stat2Value, label: sg.stat2Label, sub: sg.stat2Sub },
      { value: sg.stat3Value, label: sg.stat3Label, sub: sg.stat3Sub },
      { value: sg.stat4Value, label: sg.stat4Label, sub: sg.stat4Sub },
    ],
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
        <a href="index.html" class="navbar-brand">${SITE.name}</a>
        <ul class="navbar-nav">${links}</ul>
        <button class="navbar-search-btn" onclick="openSearch()" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <a href="${SITE.subscribeUrl || '#'}" class="navbar-subscribe">${SITE.subscribeLabel || 'Subscribe'}</a>
      </div>
    </nav>
    ${SITE.breakingNews ? `
    <div class="breaking-bar" role="alert">
      <span class="breaking-badge">BREAKING</span>
      <span class="breaking-text">${SITE.breakingNews}</span>
    </div>` : ''}
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
  const img = imgHTML(a.image, a.title, a.imagePosition, 16/10, 'article-card-img');

  return `
    <article class="article-card" onclick="goTo('article.html?id=${a.id}')">
      <div class="article-card-img-wrap">
        ${img}
        <span class="cat-tag">${a.category}</span>
      </div>
      <h3 class="article-card-title">${a.title}</h3>
      ${a.excerpt ? `<p class="article-card-excerpt">${a.excerpt}</p>` : ''}
      <div class="meta">
        <span class="author">${a.author}</span>
        <span class="sep">·</span>${a.date}
        <span class="sep">·</span>${a.readTime}
      </div>
    </article>
  `;
}

// ── HOME PAGE ─────────────────────────────────────────────
function buildHome() {
  const featured = ARTICLES.find(a => a.featured) || ARTICLES[0];
  const picks = ARTICLES.filter(a => a.editorsPick).slice(0, 5);
  const latest = ARTICLES.filter(a => !a.featured).slice(0, 6);

  const heroImg = imgHTML(featured.image, featured.title, featured.imagePosition, 16/9, 'hero-image');

  const picksHtml = picks.map(p => `
    <div class="ep-item" onclick="goTo('article.html?id=${p.id}')">
      <div class="ep-cat">${p.category}</div>
      <div class="ep-title">${p.title}</div>
      <div class="ep-meta">${p.author} · ${p.readTime}</div>
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

  document.getElementById('main').innerHTML = `
    <div class="container">
      ${SITE.homeTagline ? `<div class="home-tagline">${SITE.homeTagline}</div>` : ''}
      <section class="hero">
        <div>
          <div class="hero-image-wrap">
            ${heroImg}
            <span class="cat-tag">${featured.category}</span>
          </div>
          <div class="hero-body">
            <h1 class="hero-title" onclick="goTo('article.html?id=${featured.id}')">${featured.title}</h1>
            <p class="hero-excerpt">${featured.excerpt}</p>
            <div class="meta">By <span class="author">${featured.author}</span>
              <span class="sep">·</span>${featured.date}
              <span class="sep">·</span>${featured.readTime}
            </div>
          </div>
        </div>
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
  const rowsHtml = rows.map(r => {
    const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
    const name    = (a && a.name)    || r.name    || r.athleteId || '—';
    const country = (a && a.country) || r.country || '';
    const flag    = (a && a.flag)    || r.flag    || '';
    const hasCard = r.athleteId && ATHLETES[r.athleteId];
    const rankClass = r.rank === 1 ? '' : 'gray';
    return `
      <tr ${hasCard ? `onclick="openAthleteCard('${r.athleteId}', ${r.rank})"` : ''} style="${hasCard ? '' : 'cursor:default'}">
        <td><span class="rank-num ${rankClass}">${r.rank}</span></td>
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
          <div class="ranking-card-cta">${count ? `${count} athletes ranked` : 'Coming soon'} &rarr;</div>
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

function buildRankingsDetail(eventName) {
  const ev = RANKINGS_EVENTS.find(e => e.name === eventName);
  const rows = (ev && ev.rows) ? ev.rows : [];

  const rowsHtml = rows.length ? rows.map(r => {
    const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
    const name    = (a && a.name)    || r.name    || r.athleteId || '—';
    const country = (a && a.country) || r.country || '';
    const flag    = (a && a.flag)    || r.flag    || '';
    const hasFullCard = r.athleteId && ATHLETES[r.athleteId];
    const photo = a && a.photo;
    const photoBg = (a && a.photoBackground) || '#111';
    // All rows are always clickable — full card if profile exists, mini card otherwise
    const clickData = encodeURIComponent(JSON.stringify({athleteId: r.athleteId||'', rank: r.rank, name, country, flag, seasonBest: r.seasonBest||'', meet: r.meet||''}));
    return `
      <div class="rd-row" onclick="openRankingRow('${clickData}')">
        <div class="rd-rank ${r.rank === 1 ? 'gold' : ''}">${r.rank}</div>
        <div class="rd-avatar ${photo ? '' : 'rd-avatar--empty'}" style="${photo ? `background-color:${photoBg};background-image:url('${photo}');background-size:cover;background-position:top center` : ''}"></div>
        <div class="rd-info">
          <div class="rd-name">${name}</div>
          <div class="rd-country">${renderFlag(flag)} ${country}</div>
        </div>
        <div class="rd-right">
          <div class="rd-time">${r.seasonBest || ''}</div>
          <div class="rd-meet">${r.meet || ''}</div>
        </div>
      </div>
    `;
  }).join('') : `<p class="rankings-empty">No rankings data yet for this event.</p>`;

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-detail">
        <a href="rankings.html" class="rd-back">&larr; All Rankings</a>
        <div class="rd-header">
          <div class="rd-header-meta">${RANKINGS_YEAR} Season Rankings</div>
          <h1 class="rd-header-event">${eventName}</h1>
          ${ev && ev.description ? `<p class="rd-header-desc">${ev.description}</p>` : ''}
        </div>
        <div class="rd-col-labels">
          <span>Rank</span><span>Athlete</span><span style="text-align:right">Best / Meet</span>
        </div>
        <div class="rd-list">${rowsHtml}</div>
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

  const statsHtml = (a.stats || []).map(s => `
    <div class="card-stat">
      <div class="card-stat-value">${s.value}</div>
      <div class="card-stat-label">${s.label}</div>
      ${s.sub ? `<div class="card-stat-sub">${s.sub}</div>` : ''}
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
        <div class="card-header-top"><a href="#">Full Profile</a></div>
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
          <div class="card-stats-grid">${statsHtml}</div>
          ${achieveHtml ? `<div class="card-achievements">${achieveHtml}</div>` : ''}
          ${extraHtml ? `<div class="card-extra">${extraHtml}</div>` : ''}
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
          <div class="footer-brand">${SITE.name}</div>
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

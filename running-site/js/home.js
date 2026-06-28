// ============================================================
//  HOME — buildHome() and countdown helpers
// ============================================================

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
        <div class="rw-title">Latest Rankings</div>
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
    ${SITE.homeTagline ? `<div class="container"><div class="home-tagline">${SITE.homeTagline}</div></div>` : ''}
    ${countdownHtml ? `<div class="home-countdown-wrap"><div class="home-countdown">${countdownHtml}</div></div>` : ''}

    <div class="home-hero-full" onclick="goTo('${heroDest}')">
      ${heroImg}
      <span class="cat-tag">${heroItem.category || 'RANKINGS'}</span>
      <div class="home-hero-overlay">
        <div class="container">
          <h1 class="home-hero-title">${heroItem.title}</h1>
          ${heroItem.excerpt ? `<p class="home-hero-excerpt">${heroItem.excerpt}</p>` : ''}
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

      <div class="home-body">
        <div class="home-main">
          <div class="section-header">
            <h2 class="section-title">${latestTitle}</h2>
          </div>
          <div class="articles-grid">${latestHtml}</div>
        </div>
        ${rankingsWidgetHtml ? `<aside class="home-sidebar">${rankingsWidgetHtml}</aside>` : ''}
      </div>
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

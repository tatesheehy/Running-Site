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
  const content = `⏱ ${label} · ${meet.name}`;
  if (meet.url) {
    return `<a href="${meet.url}" target="_blank" rel="noopener" class="rd-countdown-pill"${style}>${content}</a>`;
  }
  return `<span class="rd-countdown-pill"${style}>${content}</span>`;
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
    <article class="article-card reveal" onclick="goTo('${dest}')">
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
  // Hero: prefer featured article, fall back to featured rankings, then first article
  const featuredRankings = ARTICLES.find(a => a.featured && a.type === 'rankings');
  const featured = ARTICLES.find(a => a.featured && a.type !== 'rankings') || ARTICLES.find(a => a.type !== 'rankings') || ARTICLES[0];
  const heroItem = featured || featuredRankings || ARTICLES[0];
  const rankingsEvent = featuredRankings && featuredRankings.rankingsEvent;
  const heroDest = heroItem?.type === 'rankings'
    ? `rankings.html${rankingsEvent ? '?event=' + encodeURIComponent(rankingsEvent) : ''}`
    : `article.html?id=${heroItem?.id}`;

  // Secondary: up to 2 non-hero articles
  const secondary = ARTICLES.filter(a => a !== heroItem).slice(0, 2);

  // Ticker: upcoming meets within 30 days
  const now = Date.now();
  const tickerMeets = (SITE.upcomingMeets || []).filter(m => {
    if (!m.name || !m.datetime) return false;
    const diff = new Date(m.datetime) - now;
    return diff > -86400000 && diff < 30 * 86400000;
  });
  const tickerItems = [];
  if (SITE.breakingNews) tickerItems.push(`<span class="fp-tick">${SITE.breakingNews}</span>`);
  tickerMeets.forEach(m => {
    const d = new Date(m.datetime);
    const label = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
    const inner = `<span class="fp-tick-dim">Next ·</span> ${m.name}, ${label}`;
    tickerItems.push(m.url
      ? `<a class="fp-tick fp-tick--link" href="${m.url}" target="_blank" rel="noopener">${inner}</a>`
      : `<span class="fp-tick">${inner}</span>`);
  });
  const tickerHtml = tickerItems.length ? `
    <div class="fp-ticker">
      <span class="fp-ticker-label">Latest</span>
      <div class="fp-ticks">${tickerItems.join('<span class="fp-tick-sep">·</span>')}</div>
    </div>` : '';

  // Hero
  const heroHtml = heroItem ? `
    <div class="fp-hero" onclick="goTo('${heroDest}')" role="button" tabindex="0">
      <div class="fp-hero-eyebrow">${heroItem.category || 'Featured'}${heroItem.date ? ` · ${heroItem.date}` : ''}</div>
      <h1 class="fp-hero-hed">${heroItem.title}</h1>
      ${heroItem.excerpt ? `<p class="fp-hero-dek">${heroItem.excerpt}</p>` : ''}
      <span class="fp-hero-read">Read ${heroItem.type === 'rankings' ? 'rankings' : 'article'} →</span>
    </div>` : '';

  // Secondary stories
  const secondaryHtml = secondary.length ? `
    <div class="fp-secondary">
      ${secondary.map(a => {
        const dest = a.type === 'rankings'
          ? `rankings.html${a.rankingsEvent ? '?event=' + encodeURIComponent(a.rankingsEvent) : ''}`
          : `article.html?id=${a.id}`;
        return `<div class="fp-sec-item" onclick="goTo('${dest}')" role="button" tabindex="0">
          <div class="fp-sec-tag">${a.category || 'Article'}</div>
          <div class="fp-sec-hed">${a.title}</div>
          ${a.excerpt ? `<div class="fp-sec-dek">${a.excerpt.slice(0, 90)}${a.excerpt.length > 90 ? '…' : ''}</div>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  // Rankings strip
  const firstEvent = Object.keys(RANKINGS)[0] || '';
  const TAB_LABELS = { '800m': '800m', '1500m': '1500m', '5000m': '5K', '10000m': '10K', 'Mile': 'Mile' };
  const tabsHtml = Object.keys(RANKINGS).map((ev, i) =>
    `<button class="fp-rank-tab ${i === 0 ? 'active' : ''}" data-event="${ev}">${TAB_LABELS[ev] || ev}</button>`
  ).join('');
  const rankingsHtml = `
    <div class="fp-rankings">
      <div class="fp-rank-hd">
        <span class="fp-rank-title">Current rankings</span>
        <div class="fp-rank-tabs" id="fp-rank-tabs">${tabsHtml}</div>
      </div>
      <div id="fp-rank-rows">${buildRankingsTableHtml(firstEvent, true)}</div>
      <a href="rankings.html" class="fp-rank-more">View all rankings →</a>
    </div>`;

  document.getElementById('main').innerHTML = `
    <div class="fp-wrap">
      ${tickerHtml}
      <div class="fp-body">
        ${heroHtml}
        ${secondaryHtml}
        ${rankingsHtml}
      </div>
    </div>`;

  qsa('.fp-rank-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.fp-rank-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      qs('#fp-rank-rows').innerHTML = buildRankingsTableHtml(btn.dataset.event, true);
    });
  });
}

// ============================================================
//  ARTICLES — buildArticlesPage(), buildArticlePage()
// ============================================================

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
      <nav class="article-breadcrumb"><a href="articles.html">Articles</a> <span>→</span> ${a.title}</nav>
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

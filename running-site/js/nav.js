// ============================================================
//  NAV — buildNavbar(), buildFooter(), toggleMobileMenu()
// ============================================================

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
  const pageMap = { home: 'index.html', articles: 'articles.html', rankings: 'rankings.html', article: 'articles.html', athletes: 'athletes.html', h2h: 'h2h.html' };
  const activeHref = pageMap[currentPage] || '';

  const navLinks = [
    { label: 'Articles', href: 'articles.html' },
    { label: 'Rankings', href: 'rankings.html' },
    { label: 'Athletes', href: 'athletes.html' },
    { label: 'H2H', href: 'h2h.html' },
    { label: 'Podcast', href: 'podcast.html' },
    { label: 'About', href: 'about.html' },
  ];

  const links = navLinks.map(l =>
    `<li><a href="${l.href}" class="${l.href.includes(activeHref) && activeHref ? 'active' : ''}">${l.label}</a></li>`
  ).join('');

  return `
    <nav class="navbar" role="navigation" aria-label="Main navigation">
      <div class="navbar-inner">
        <a href="index.html" class="navbar-brand">
          <img src="/images/stattc-logo.png" alt="${SITE.name}" class="brand-logo"></a>
        <div class="navbar-brand-sep" aria-hidden="true"></div>
        <ul class="navbar-nav">${links}</ul>
        <button class="navbar-theme-btn" onclick="toggleTheme()" aria-label="Toggle dark mode" id="theme-toggle-btn">
          <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
        <button class="navbar-search-btn" onclick="openSearch()" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <div class="nav-user-wrap">
          <button id="nav-user-btn" class="navbar-user-btn" onclick="toggleUserMenu()" aria-label="Sign in" title="Sign in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="nav-user-dot"></span>
          </button>
          <div id="user-menu" class="user-menu">
            <div class="user-menu-email" id="user-menu-email"></div>
            <button class="user-menu-item" onclick="goTo('athletes.html');closeUserMenu();setTimeout(()=>typeof _showMyAthletes==='function'&&_showMyAthletes(),300)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              My Athletes
            </button>
            <button class="user-menu-item user-menu-item--signout" onclick="authSignOut()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>
        <a href="${SITE.subscribeUrl || '#'}" class="navbar-subscribe">${SITE.subscribeLabel || 'Subscribe'}</a>
        <button class="hamburger" onclick="toggleMobileMenu()" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
    <div class="mobile-drawer" id="mobile-drawer" aria-hidden="true">
      <div class="mobile-drawer-top">
        <a href="index.html" class="navbar-brand">
          <img src="/images/stattc-logo.png" alt="${SITE.name}" class="brand-logo"></a>
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
    <div id="auth-modal" class="auth-modal" role="dialog" aria-label="Sign in">
      <div class="auth-modal-inner">
        <button class="auth-modal-close" onclick="closeAuthModal()" aria-label="Close">×</button>
        <div class="auth-brand">
          <img src="/images/stattc-logo.png" alt="${SITE.name}" class="auth-logo">
        </div>
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="signin" onclick="switchAuthTab('signin')">Sign In</button>
          <button class="auth-tab" data-tab="signup" onclick="switchAuthTab('signup')">Sign Up</button>
        </div>
        <form id="auth-form" onsubmit="handleAuthSubmit(event)">
          <input type="email" id="auth-email" placeholder="Email address" autocomplete="email" required>
          <input type="password" id="auth-password" placeholder="Password (min 6 chars)" autocomplete="current-password" required minlength="6">
          <div id="auth-error" class="auth-error"></div>
          <div id="auth-success" class="auth-success" style="display:none"></div>
          <button type="submit" id="auth-submit-btn" class="auth-submit">Sign In</button>
        </form>
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
            <img src="/images/stattc-logo.png" alt="${SITE.name}" class="brand-logo">
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

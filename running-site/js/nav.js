// ============================================================
//  NAV — buildNavbar(), buildFooter(), toggleMobileMenu()
// ============================================================

// ── NAV ICONS (17px stroke icons, inherit currentColor) ───
const _NAV_ICONS = {
  home:     '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  articles: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  rankings: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  h2h:      '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  tracker:  '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  athletes: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  podcast:  '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  about:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  timemachine: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 15.5 14"/>',
  countries: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  metrics:  '<path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 5-7"/>',
};

function _navIcon(name) {
  return `<span class="sidebar-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_NAV_ICONS[name] || ''}</svg></span>`;
}

// ── NAVBAR ────────────────────────────────────────────────
function buildNavbar() {
  const currentPage = document.body.dataset.page;
  const pageMap = { home: 'index.html', articles: 'articles.html', rankings: 'rankings.html', article: 'articles.html', athletes: 'athletes.html', athlete: 'athletes.html', h2h: 'h2h.html', 'event-tracker': 'event-tracker.html', 'time-machine': 'time-machine.html', country: 'country.html', metrics: 'metrics.html' };
  const activeHref = pageMap[currentPage] || '';

  const _RANK_EVENTS = ['800m', '1500m', '5000m', '10000m'];
  const _subEvents = base => _RANK_EVENTS.map(ev => ({ label: ev, href: `${base}?event=${encodeURIComponent(ev)}` }));
  const _curEvent = (typeof URLSearchParams !== 'undefined') ? new URLSearchParams(location.search).get('event') : null;

  // Horizontal nav links. `hint` powers the hover tooltip so unfamiliar tool
  // names (H2H, Time Machine, Event Tracker) explain themselves on hover.
  const navLinks = [
    { label: 'Home', href: 'index.html', icon: 'home', color: '#ff5200', hint: 'Dashboard & the latest' },
    { label: 'Articles', href: 'articles.html', icon: 'articles', color: '#0D9488', hint: 'News, features & opinion' },
    { label: 'Rankings', href: 'rankings.html', icon: 'rankings', color: '#2563EB', hint: 'Our ranked lists by event', children: _subEvents('rankings.html') },
    { label: 'H2H', href: 'h2h.html', icon: 'h2h', color: '#9333EA', hint: 'Compare two athletes head-to-head' },
    { label: 'Event Tracker', href: 'event-tracker.html', icon: 'tracker', color: '#16A34A', hint: 'Season-best leaderboards by event', children: _subEvents('event-tracker.html') },
    { label: 'Athletes', href: 'athletes.html', icon: 'athletes', color: '#DB2777', hint: 'Browse athlete profiles' },
    { label: 'Countries', href: 'country.html', icon: 'countries', color: '#DC2626', hint: 'Rankings & athletes by nation' },
    { label: 'Time Machine', href: 'time-machine.html', icon: 'timemachine', color: '#4F46E5', hint: 'Results & records from past seasons' },
    { label: 'Metrics', href: 'metrics.html', icon: 'metrics', color: '#0EA5E9', hint: 'Deep-dive charts & athlete comparisons' },
    { label: 'Podcast', href: 'podcast.html', icon: 'podcast', color: '#0891B2', hint: 'Episodes & audio' },
    { label: 'About', href: 'about.html', icon: 'about', color: '#CA8A04', hint: 'What StatTC is & who makes it' },
  ];

  const navLinkHtml = l => {
    const active = l.href.includes(activeHref) && activeHref ? 'active' : '';
    const styleAttr = l.color ? ` style="--link-accent:${l.color}"` : '';
    const titleAttr = l.hint ? ` title="${l.hint}"` : '';
    if (l.children && l.children.length) {
      const onSection = activeHref && l.href.split('?')[0] === activeHref;
      const subs = l.children.map(c => {
        const cActive = onSection && _curEvent && c.href.includes('event=' + encodeURIComponent(_curEvent)) ? ' active' : '';
        return `<li><a href="${c.href}" class="navlink-sublink${cActive}">${c.label}</a></li>`;
      }).join('');
      return `<li class="navlink navlink--parent${active ? ' active' : ''}"${styleAttr}>
        <a href="${l.href}" class="navlink-a"${titleAttr}><span>${l.label}</span>${_caretSvg}</a>
        <ul class="navlink-sub">${subs}</ul>
      </li>`;
    }
    return `<li class="navlink${active ? ' active' : ''}"${styleAttr}><a href="${l.href}" class="navlink-a"${titleAttr}><span>${l.label}</span></a></li>`;
  };

  const _caretSvg = '<svg class="navlink-caret" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const navLinksHtml = navLinks.map(navLinkHtml).join('');

  return `
    <nav class="navbar" role="navigation" aria-label="Main navigation">
      <div class="navbar-util">
        <a href="index.html" class="navbar-brand">
          <img src="/images/biblogo.png" alt="${SITE.name}" class="brand-logo"></a>
        <div class="navbar-search" id="nav-search">
          <svg class="navbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input class="navbar-search-input" type="text" placeholder="Search athletes, articles, rankings…" autocomplete="off"
            oninput="navbarSearch(this.value)" onfocus="navbarSearch(this.value)" aria-label="Search">
          <div class="navbar-search-results" id="navbar-search-results"></div>
        </div>
        <div class="nav-notif-wrap">
          <button class="navbar-icon-btn" onclick="toggleNotifMenu()" aria-label="Notifications" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <div id="notif-menu" class="notif-menu">No new notifications</div>
        </div>
        <button class="navbar-icon-btn" onclick="goTo('account.html')" aria-label="Settings" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <div class="nav-user-wrap">
          <button id="nav-user-btn" class="navbar-user-btn" onclick="getCurrentUser&&getCurrentUser()?goTo('account.html'):openAuthModal()" aria-label="Sign in" title="Sign in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="nav-user-dot"></span>
          </button>
          <div id="user-menu" class="user-menu">
            <div class="user-menu-email" id="user-menu-email"></div>
            <button class="user-menu-item" onclick="goTo('athletes.html');closeUserMenu();setTimeout(()=>typeof _showMyAthletes==='function'&&_showMyAthletes(),300)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              My Athletes
            </button>
            <button class="user-menu-item user-menu-item--signout" onclick="authSignOut()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>
        <button class="hamburger" onclick="toggleMobileMenu()" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="navbar-links" aria-label="Primary">
        <ul class="navlinks">${navLinksHtml}</ul>
      </div>
    </nav>
    <div class="mobile-drawer" id="mobile-drawer" aria-hidden="true">
      <div class="mobile-drawer-top">
        <a href="index.html" class="navbar-brand">
          <img src="/images/biblogo.png" alt="${SITE.name}" class="brand-logo"></a>
        <button class="mobile-drawer-close" onclick="toggleMobileMenu()" aria-label="Close menu">×</button>
      </div>
      <ul class="mobile-drawer-nav">
        ${navLinks.map(l => `<li><a href="${l.href}"${l.color ? ` style="--link-accent:${l.color}"` : ''}>${_navIcon(l.icon)}${l.label}</a></li>`).join('')}
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
          <img src="/images/biblogo.png" alt="${SITE.name}" class="auth-logo">
        </div>
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="signin" onclick="switchAuthTab('signin')">Sign In</button>
          <button class="auth-tab" data-tab="signup" onclick="switchAuthTab('signup')">Sign Up</button>
        </div>
        <form id="auth-form" onsubmit="handleAuthSubmit(event)">
          <input type="email" id="auth-email" placeholder="Email address" autocomplete="email" required oninput="authCheckReady()">
          <input type="password" id="auth-password" placeholder="Password (min 6 chars)" autocomplete="current-password" required minlength="6" oninput="authCheckReady()">
          <div id="auth-error" class="auth-error"></div>
          <div id="auth-success" class="auth-success" style="display:none"></div>
          <button type="submit" id="auth-submit-btn" class="auth-submit" disabled>Sign In</button>
        </form>
      </div>
    </div>
  `;
}

// ── BREADCRUMB ────────────────────────────────────────────
// trail: array of { label, href? }. The last item is the current page and is
// rendered as plain text. Used in page-hero eyebrows on deep/detail pages so
// visitors can see where they are and step back up the hierarchy.
window.breadcrumbHtml = function(trail) {
  if (!Array.isArray(trail) || !trail.length) return '';
  const parts = trail.map((c, i) => {
    const last = i === trail.length - 1;
    const node = (!last && c.href)
      ? `<a href="${c.href}" class="breadcrumb-link">${c.label}</a>`
      : `<span class="breadcrumb-current">${c.label}</span>`;
    const sep = last ? '' : '<span class="breadcrumb-sep">/</span>';
    return node + sep;
  }).join('');
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${parts}</nav>`;
};

// ── NOTIFICATIONS MENU ────────────────────────────────────
function toggleNotifMenu() {
  const m = qs('#notif-menu');
  if (m) m.classList.toggle('open');
}
window.toggleNotifMenu = toggleNotifMenu;

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
            <span class="footer-wordmark">${SITE.name}</span>
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

// ============================================================
//  APP — DOMContentLoaded routing init
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Reading progress bar (only visible on article pages)
  const progressBar = document.createElement('div');
  progressBar.id = 'reading-progress';
  document.body.insertBefore(progressBar, document.body.firstChild);

  showSkeleton(document.body.dataset.page);
  await loadData();

  const navTarget = qs('#nav-placeholder');
  if (navTarget) navTarget.innerHTML = buildNavbar();

  const footerTarget = qs('#footer-placeholder');
  if (footerTarget) footerTarget.outerHTML = buildFooter();

  const page = document.body.dataset.page;
  if (page === 'home')        buildHome();
  if (page === 'articles')    buildArticlesPage();
  if (page === 'article')     buildArticlePage();
  if (page === 'rankings')    buildRankingsPage();
  if (page === 'athletes')    buildAthletesPage();
  if (page === 'about')       buildAboutPage();
  if (page === 'h2h')         buildH2HPage();

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

  // Scroll reveal
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.08 });
  const observeReveal = () => qsa('.reveal').forEach(el => revealObserver.observe(el));
  observeReveal();
  new MutationObserver(observeReveal).observe(document.getElementById('main'), { childList: true, subtree: true });

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

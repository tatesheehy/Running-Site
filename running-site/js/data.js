// ============================================================
//  DATA — global variable declarations and loadData()
// ============================================================

let ARTICLES, ATHLETES, RANKINGS, RANKINGS_EVENTS, RANKINGS_CRITERIA, RANKINGS_YEAR, RANKINGS_ARCHIVE, RANKINGS_WEEKS, SITE;

async function loadData() {
  try {
    const noCache = { cache: 'no-store' };
    const [articlesData, athletesData, rankingsData, siteData, archiveData, weeksData, contributorsData] = await Promise.all([
      fetch('/_data/articles.json', noCache).then(r => r.json()),
      fetch('/_data/athletes.json', noCache).then(r => r.json()),
      fetch('/_data/rankings.json', noCache).then(r => r.json()),
      fetch('/_data/site.json', noCache).then(r => r.json()),
      fetch('/_data/rankings-archive.json', noCache).then(r => r.json()).catch(() => ({ seasons: [] })),
      fetch('/_data/rankings-weeks.json', noCache).then(r => r.json()).catch(() => ({ weeks: [] })),
      fetch('/_data/contributors.json', noCache).then(r => r.json()).catch(() => ({ items: [] })),
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
    RANKINGS_ARCHIVE = archiveData.seasons || [];
    RANKINGS_WEEKS = {};
    (weeksData.weeks || []).forEach(w => { if (w.id) RANKINGS_WEEKS[w.id] = w; });
    SITE = siteData;
    SITE.contributors = contributorsData.items || [];

    document.documentElement.style.setProperty('--accent', SITE.accentColor || '#E8500A');

  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

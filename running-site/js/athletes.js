// ============================================================
//  ATHLETES — buildAthletesPage()
// ============================================================

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
      const allPrs = (a.prs || []).map(pr =>
        `<div class="ath-flip-pr"><span class="ath-flip-pr-event">${pr.event}</span><span class="ath-flip-pr-time">${pr.time}</span></div>`
      ).join('');
      const age = a.dob ? calcAgeFromDob(a.dob) : (a.age || '');
      return `
        <div class="ath-flip-card" role="button" tabindex="0">
          <div class="ath-flip-inner">
            <div class="ath-flip-front" onclick="openAthleteCard('${a.id}', null)">
              <div class="ath-flip-photo${photo ? '' : ' no-photo'}" style="${photo ? `background-color:${bg};background-image:url('${photo}')` : ''}"></div>
              <div class="ath-flip-front-info">
                <div class="ath-page-name">${a.name}</div>
                <div class="ath-page-country">${renderFlag(a.flag)} ${a.country}</div>
              </div>
            </div>
            <div class="ath-flip-back" onclick="openAthleteCard('${a.id}', null)">
              <div class="ath-flip-back-header">
                <div class="ath-page-name">${a.name}</div>
                <div class="ath-page-country">${renderFlag(a.flag)} ${a.country}</div>
                ${age ? `<div class="ath-flip-age">Age ${age}</div>` : ''}
              </div>
              <div class="ath-flip-prs-label">Personal Bests</div>
              <div class="ath-flip-prs-wrap">
                <div class="ath-flip-prs">${allPrs || '<span class="ath-flip-no-prs">No data yet</span>'}</div>
              </div>
              <div class="ath-flip-cta">View Profile →</div>
            </div>
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

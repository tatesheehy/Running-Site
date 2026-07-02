// ============================================================
//  ATHLETES — buildAthletesPage()
// ============================================================

const _FAV_HEART = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

function buildAthletesPage() {
  const all = Object.values(ATHLETES);
  let activeSort = 'alpha';
  let activeView = 'grid';
  let myAthletesActive = false;

  function sortedAthletes() {
    const list = myAthletesActive
      ? all.filter(a => typeof isFavorited === 'function' && isFavorited(a.id))
      : [...all];
    if (activeSort === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name));
    if (activeSort === 'country') list.sort((a, b) => (a.country || '').localeCompare(b.country || '') || a.name.localeCompare(b.name));
    return list;
  }

  function renderGrid(list) {
    if (!list.length) {
      const msg = myAthletesActive
        ? '<p class="ath-page-empty">No saved athletes yet — click the heart on any athlete card to save them.</p>'
        : '<p class="ath-page-empty">No athletes found.</p>';
      return msg;
    }
    return list.map(a => {
      const photo = a.photo || '/images/default_card.png';
      const bg = a.photoBackground || '#111';
      const allPrs = (a.prs || []).map(pr =>
        `<div class="ath-flip-pr"><span class="ath-flip-pr-event">${pr.event}</span><span class="ath-flip-pr-time">${pr.time}</span></div>`
      ).join('');
      const age = a.dob ? calcAgeFromDob(a.dob) : (a.age || '');
      const faved = typeof isFavorited === 'function' && isFavorited(a.id);
      return `
        <div class="ath-flip-card" role="button" tabindex="0">
          <button class="ath-fav-btn${faved ? ' favorited' : ''}" data-fav-id="${a.id}"
            onclick="event.stopPropagation();toggleFavorite('${a.id}')" aria-label="Save ${a.name}">
            ${_FAV_HEART}
          </button>
          <div class="ath-flip-inner">
            <div class="ath-flip-front" onclick="openAthleteCard('${a.id}', null)">
              <div class="ath-flip-photo" style="background-color:${bg};background-image:url('${photo}')"></div>
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

  const loggedIn = typeof getCurrentUser === 'function' && !!getCurrentUser();

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="ath-page-header">
        <div class="ath-page-header-left">
          <h1 class="ath-page-title">Athletes</h1>
          <span class="ath-page-count">${all.length} athletes</span>
        </div>
        <div class="ath-page-sort-toggle" id="ath-sort-btns">
          <button class="ath-page-sort active" data-sort="alpha" onclick="sortAthletes('alpha')">A – Z</button>
          <button class="ath-page-sort" data-sort="country" onclick="sortAthletes('country')">By Country</button>
          <button class="ath-page-sort my-athletes-btn" id="my-athletes-btn" onclick="toggleMyAthletes()" style="${loggedIn ? '' : 'display:none'}">
            ${_FAV_HEART} My Athletes
          </button>
          <button class="ath-page-sort" id="ath-map-btn" onclick="toggleAthleteMap()">Map</button>
        </div>
      </div>
      <div id="ath-page-grid" class="ath-page-grid">${renderGrid(sortedAthletes())}</div>
    </div>`;

  window._mapRenderGrid  = list => { qs('#ath-page-grid').className = 'ath-page-grid'; qs('#ath-page-grid').innerHTML = renderGrid(list); };
  window._mapRestoreGrid = ()   => { qs('#ath-page-grid').className = 'ath-page-grid'; qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes()); };

  function setGridView() {
    activeView = 'grid';
    qs('#ath-page-grid').className = 'ath-page-grid';
    qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes());
  }

  window.sortAthletes = function(sort) {
    if (activeView === 'map') setGridView();
    myAthletesActive = false;
    qs('#my-athletes-btn')?.classList.remove('active');
    activeSort = sort;
    document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
    qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes());
  };

  window.toggleMyAthletes = window._showMyAthletes = function() {
    myAthletesActive = true;
    activeView = 'grid';
    document.querySelectorAll('.ath-page-sort').forEach(b => b.classList.remove('active'));
    qs('#my-athletes-btn')?.classList.add('active');
    qs('#ath-page-grid').className = 'ath-page-grid';
    qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes());
  };

  window._showAllAthletes = function() {
    myAthletesActive = false;
    qs('#my-athletes-btn')?.classList.remove('active');
    document.querySelector('.ath-page-sort[data-sort="alpha"]')?.classList.add('active');
    qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes());
  };

  // Re-render grid when favorites change (e.g. after auth loads)
  window._refreshMyAthletes = function() {
    if (myAthletesActive) qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes());
  };

  window.toggleAthleteMap = function() {
    const grid = qs('#ath-page-grid');
    const btn  = qs('#ath-map-btn');
    activeView = activeView === 'grid' ? 'map' : 'grid';

    if (activeView === 'map') {
      myAthletesActive = false;
      document.querySelectorAll('.ath-page-sort').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      grid.className = 'ath-map-wrap';
      grid.innerHTML = buildWorldMap(all);
      initMapInteractions(all);
    } else {
      btn.classList.remove('active');
      document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => b.classList.toggle('active', b.dataset.sort === activeSort));
      grid.className = 'ath-page-grid';
      grid.innerHTML = renderGrid(sortedAthletes());
    }
  };
}

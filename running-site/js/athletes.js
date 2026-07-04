// ============================================================
//  ATHLETES — buildAthletesPage()
// ============================================================

const _FAV_HEART = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

function buildAthletesPage() {
  const all = Object.values(ATHLETES);
  let activeSort    = 'alpha';
  let activeView    = 'grid';
  let myAthletesActive = false;
  let activeSearch  = '';
  let activeCountry = 'all';

  // Build country list sorted by count descending
  const countryCounts = {};
  all.forEach(a => { if (a.country) countryCounts[a.country] = (countryCounts[a.country] || 0) + 1; });
  const countryList = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  function sortedAthletes() {
    let list = myAthletesActive
      ? all.filter(a => typeof isFavorited === 'function' && isFavorited(a.id))
      : [...all];

    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.country || '').toLowerCase().includes(q)
      );
    }

    if (activeCountry !== 'all') {
      list = list.filter(a => a.country === activeCountry);
    }

    if (activeSort === 'alpha')   list.sort((a, b) => a.name.localeCompare(b.name));
    if (activeSort === 'country') list.sort((a, b) => (a.country || '').localeCompare(b.country || '') || a.name.localeCompare(b.name));
    return list;
  }

  function renderCountryChips() {
    const chips = countryList.map(c => {
      const flag = all.find(a => a.country === c)?.flag || '';
      const active = activeCountry === c ? ' active' : '';
      return `<button class="ath-country-chip${active}" data-country="${c}" onclick="filterByCountry('${c.replace(/'/g,"\\'")}')">
        ${flag ? renderFlag(flag) : ''} ${c}
      </button>`;
    }).join('');
    return `<button class="ath-country-chip${activeCountry === 'all' ? ' active' : ''}" data-country="all" onclick="filterByCountry('all')">All</button>${chips}`;
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

  function getResultCount() {
    const list = sortedAthletes();
    const total = myAthletesActive
      ? all.filter(a => typeof isFavorited === 'function' && isFavorited(a.id)).length
      : all.length;
    if (list.length === total) return `${total} athletes`;
    return `${list.length} of ${total}`;
  }

  function refreshGrid() {
    qs('#ath-page-grid').innerHTML = renderGrid(sortedAthletes());
    qs('#ath-page-count').textContent = getResultCount();
  }

  function refreshChips() {
    qs('#ath-country-chips').innerHTML = renderCountryChips();
  }

  const loggedIn = typeof getCurrentUser === 'function' && !!getCurrentUser();

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="ath-page-header">
        <div class="ath-page-header-left">
          <h1 class="ath-page-title">Athletes</h1>
          <span class="ath-page-count" id="ath-page-count">${getResultCount()}</span>
        </div>
        <div class="ath-page-sort-toggle" id="ath-sort-btns">
          <button class="ath-page-sort active" data-sort="alpha" onclick="sortAthletes('alpha')">A – Z</button>
          <button class="ath-page-sort" data-sort="country" onclick="sortAthletes('country')">By Country</button>
          <button class="ath-page-sort my-athletes-btn" id="my-athletes-btn" onclick="toggleMyAthletes()" style="${loggedIn ? '' : 'display:none'}">
            My Athletes
          </button>
          <button class="ath-page-sort" id="ath-map-btn" onclick="toggleAthleteMap()">Map</button>
        </div>
      </div>

      <div class="ath-filter-bar">
        <div class="ath-search-wrap">
          <svg class="ath-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/></svg>
          <input class="ath-search-input" id="ath-search-input" type="text" placeholder="Search athletes…" autocomplete="off"
            oninput="searchAthletes(this.value)" />
          <button class="ath-search-clear" id="ath-search-clear" onclick="clearSearch()" aria-label="Clear search">✕</button>
        </div>
        <div class="ath-country-chips" id="ath-country-chips">${renderCountryChips()}</div>
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

  window.searchAthletes = function(val) {
    activeSearch = val.trim();
    qs('#ath-search-clear').style.opacity = activeSearch ? '1' : '0';
    qs('#ath-search-clear').style.pointerEvents = activeSearch ? 'auto' : 'none';
    if (activeView === 'map') setGridView();
    refreshGrid();
  };

  window.clearSearch = function() {
    qs('#ath-search-input').value = '';
    window.searchAthletes('');
    qs('#ath-search-input').focus();
  };

  window.filterByCountry = function(country) {
    activeCountry = country;
    if (activeView === 'map') setGridView();
    refreshChips();
    refreshGrid();
  };

  window.sortAthletes = function(sort) {
    if (activeView === 'map') setGridView();
    myAthletesActive = false;
    qs('#my-athletes-btn')?.classList.remove('active');
    activeSort = sort;
    document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
    refreshGrid();
  };

  window.toggleMyAthletes = window._showMyAthletes = function() {
    myAthletesActive = true;
    activeView = 'grid';
    document.querySelectorAll('.ath-page-sort').forEach(b => b.classList.remove('active'));
    qs('#my-athletes-btn')?.classList.add('active');
    qs('#ath-page-grid').className = 'ath-page-grid';
    refreshGrid();
  };

  window._showAllAthletes = function() {
    myAthletesActive = false;
    qs('#my-athletes-btn')?.classList.remove('active');
    document.querySelector('.ath-page-sort[data-sort="alpha"]')?.classList.add('active');
    refreshGrid();
  };

  window._refreshMyAthletes = function() {
    if (myAthletesActive) refreshGrid();
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
      refreshGrid();
    }
  };
}

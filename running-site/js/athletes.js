// ============================================================
//  ATHLETES — buildAthletesPage()
// ============================================================

const _FAV_HEART = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

const _ICON_GRID = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/><rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/></svg>`;
const _ICON_LIST = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="0" y1="3" x2="14" y2="3"/><line x1="0" y1="7" x2="14" y2="7"/><line x1="0" y1="11" x2="14" y2="11"/></svg>`;

// Parse a time string like "3:29.87" or "1:46.23" into total seconds
function _parseTime(str) {
  if (!str || str === '—') return Infinity;
  const clean = str.replace(/[^\d:.]/g, '');
  const parts = clean.split(':');
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1] || 0);
  return parseFloat(parts[0] || 0);
}

function buildAthletesPage() {
  const all = Object.values(ATHLETES);
  let activeSort    = 'alpha';
  let activeView    = 'grid';   // 'grid' | 'list' | 'map'
  let myAthletesActive = false;
  let activeSearch  = '';
  let activeCountry = 'all';
  let activePresets = new Set();
  let listSortKey   = '1500m';
  let listSortDir   = 1;        // 1 = asc (fastest first), -1 = desc

  const PRESETS = [
    { key: 'sub330', label: 'Sub-3:30', section: 'time', fn: a => _parseTime(getPr(a, '1500m')) < _parseTime('3:30.00') },
    { key: 'sub332', label: 'Sub-3:32', section: 'time', fn: a => _parseTime(getPr(a, '1500m')) < _parseTime('3:32.00') },
    { key: 'u23',    label: 'U23',      section: 'age',  fn: a => { const ag = a.dob ? calcAgeFromDob(a.dob) : null; return ag !== null && ag <= 22; } },
  ];
  let filterPanelOpen = false;

  // Build country list sorted by count descending
  const countryCounts = {};
  all.forEach(a => { if (a.country) countryCounts[a.country] = (countryCounts[a.country] || 0) + 1; });
  const countryList = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  function getPr(a, event) {
    return (a.prs || []).find(p => p.event === event)?.time || null;
  }

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
    if (activePresets.size > 0) {
      const active = PRESETS.filter(p => activePresets.has(p.key));
      list = list.filter(a => active.every(p => p.fn(a)));
    }

    if (activeView === 'list') {
      const dir = listSortDir;
      list.sort((a, b) => {
        if (listSortKey === 'name')    return dir * a.name.localeCompare(b.name);
        if (listSortKey === 'country') return dir * (a.country || '').localeCompare(b.country || '') || a.name.localeCompare(b.name);
        if (listSortKey === 'age') {
          const ageA = a.dob ? calcAgeFromDob(a.dob) : (a.age || 0);
          const ageB = b.dob ? calcAgeFromDob(b.dob) : (b.age || 0);
          return dir * (ageA - ageB);
        }
        // PR columns — faster (lower seconds) = better = asc
        const tA = _parseTime(getPr(a, listSortKey));
        const tB = _parseTime(getPr(b, listSortKey));
        if (tA === tB) return a.name.localeCompare(b.name);
        return dir * (tA - tB);
      });
    } else {
      if (activeSort === 'alpha')   list.sort((a, b) => a.name.localeCompare(b.name));
      if (activeSort === 'country') list.sort((a, b) => (a.country || '').localeCompare(b.country || '') || a.name.localeCompare(b.name));
    }
    return list;
  }

  function activeFilterCount() {
    return (activeCountry !== 'all' ? 1 : 0) + activePresets.size;
  }

  function renderNationalityChips() {
    const chips = countryList.map(c => {
      const flag = all.find(a => a.country === c)?.flag || '';
      const active = activeCountry === c ? ' active' : '';
      return `<button class="ath-country-chip${active}" data-country="${c}" onclick="filterByCountry('${c.replace(/'/g,"\\'")}')">
        ${flag ? renderFlag(flag) : ''} ${c}
      </button>`;
    }).join('');
    return `<button class="ath-country-chip${activeCountry === 'all' ? ' active' : ''}" data-country="all" onclick="filterByCountry('all')">All</button>${chips}`;
  }

  function renderPresetSection(section) {
    return PRESETS.filter(p => p.section === section).map(p => {
      const active = activePresets.has(p.key) ? ' active' : '';
      const count = all.filter(p.fn).length;
      return `<button class="ath-preset-chip${active}" data-preset="${p.key}" onclick="filterByPreset('${p.key}')">
        ${p.label} <span class="ath-preset-count">${count}</span>
      </button>`;
    }).join('');
  }

  function renderFilterPanel() {
    const n = activeFilterCount();
    const clearBtn = n > 0 ? `<button class="ath-filter-clear-all" onclick="clearAllFilters()">Clear all</button>` : '';
    return `
      <div class="ath-filter-section">
        <div class="ath-filter-section-header">
          <span class="ath-filter-section-label">Nationality</span>
        </div>
        <div class="ath-country-chips">${renderNationalityChips()}</div>
      </div>
      <div class="ath-filter-section">
        <div class="ath-filter-section-header">
          <span class="ath-filter-section-label">Time</span>
        </div>
        <div class="ath-preset-chips">${renderPresetSection('time')}</div>
      </div>
      <div class="ath-filter-section">
        <div class="ath-filter-section-header">
          <span class="ath-filter-section-label">Age</span>
        </div>
        <div class="ath-preset-chips">${renderPresetSection('age')}</div>
      </div>
      ${clearBtn ? `<div class="ath-filter-panel-footer">${clearBtn}</div>` : ''}
    `;
  }

  function updateFilterToggle() {
    const n = activeFilterCount();
    const badge = qs('#ath-filter-badge');
    if (badge) {
      badge.textContent = n;
      badge.style.display = n > 0 ? 'inline-flex' : 'none';
    }
    qs('#ath-filter-toggle')?.classList.toggle('has-filters', n > 0);
  }

  const _CANONICAL_EVENTS = [
    { key: '60m',                         label: '60m'      },
    { key: '200 Metres Short Track',      label: '200i'     },
    { key: '200m',                        label: '200m'     },
    { key: '300 Metres Short Track',      label: '300i'     },
    { key: '300 Metres',                  label: '300m'     },
    { key: '400 Metres Short Track',      label: '400i'     },
    { key: '400m',                        label: '400m'     },
    { key: '500 Metres',                  label: '500m'     },
    { key: '600 Metres Short Track',      label: '600i'     },
    { key: '600 Metres',                  label: '600m'     },
    { key: '600 Metres Road',             label: '600 Rd'   },
    { key: '800 Metres Short Track',      label: '800i'     },
    { key: '800m',                        label: '800m'     },
    { key: '1000 Metres Short Track',     label: '1000i'    },
    { key: '1000 Metres',                 label: '1000m'    },
    { key: '1500 Metres Short Track',     label: '1500i'    },
    { key: '1500m',                       label: '1500m'    },
    { key: 'Mile Short Track',            label: 'Mi (i)'  },
    { key: 'Mile',                        label: 'Mile'     },
    { key: 'Mile Road',                   label: 'Mi Rd'   },
    { key: '2000 Metres Short Track',     label: '2000i'    },
    { key: '2000m',                       label: '2000m'    },
    { key: '2000 Metres Steeplechase',    label: '2000 SC'  },
    { key: '2 Miles Short Track',         label: '2 Mi (i)' },
    { key: '2 Miles',                     label: '2 Mi'     },
    { key: '3000 Metres Short Track',     label: '3000i'    },
    { key: '3000m',                       label: '3000m'    },
    { key: '3000m SC',                    label: '3000 SC'  },
    { key: 'Distance Medley Short Track', label: 'DM (i)'  },
    { key: 'Distance Medley',             label: 'DM'       },
    { key: '5000 Metres Short Track',     label: '5000i'    },
    { key: '5000m',                       label: '5000m'    },
    { key: '10000m',                      label: '10000m'   },
    { key: '5 Kilometres Road',           label: '5K Rd'   },
    { key: '5 Miles Road',                label: '5 Mi Rd' },
    { key: '10 Kilometres Road',          label: '10K Rd'  },
    { key: '15 Kilometres Road',          label: '15K Rd'  },
    { key: 'Half Marathon',               label: 'HM'       },
  ];

  const _allEventKeys = new Set();
  all.forEach(a => (a.prs || []).forEach(p => _allEventKeys.add(p.event)));
  const _activeEventCols = _CANONICAL_EVENTS.filter(e => _allEventKeys.has(e.key));

  const LIST_COLS = [
    { key: 'name',    label: 'Athlete', cls: 'ath-list-name'    },
    { key: 'country', label: 'Country', cls: 'ath-list-country' },
    { key: 'age',     label: 'Age',     cls: 'ath-list-age'     },
    ..._activeEventCols.map(e => ({ key: e.key, label: e.label, cls: 'ath-list-pr' })),
  ];

  function sortArrow(key) {
    if (listSortKey !== key) return `<span class="ath-list-arrow inactive">↕</span>`;
    return `<span class="ath-list-arrow">${listSortDir === 1 ? '↑' : '↓'}</span>`;
  }

  function renderList(list) {
    if (!list.length) return '<p class="ath-page-empty">No athletes found.</p>';

    const header = LIST_COLS.map(c =>
      `<th class="ath-list-th ${c.cls}" onclick="sortListBy('${c.key}')" title="Sort by ${c.label}">${c.label} ${sortArrow(c.key)}</th>`
    ).join('');

    const rows = list.map((a, i) => {
      const age = a.dob ? calcAgeFromDob(a.dob) : (a.age || '—');
      const eventCells = _activeEventCols.map(e => {
        const v = getPr(a, e.key) || '—';
        return `<td class="ath-list-td ath-list-pr${v === '—' ? ' dim' : ''}">${v}</td>`;
      }).join('');
      return `<tr class="ath-list-row" onclick="openAthleteCard('${a.id}', null)" tabindex="0">
        <td class="ath-list-td ath-list-name">
          <span class="ath-list-num">${i + 1}</span>
          ${renderFlag(a.flag)}
          <span class="ath-list-athlete-name">${a.name}</span>
        </td>
        <td class="ath-list-td ath-list-country">${a.country || '—'}</td>
        <td class="ath-list-td ath-list-age">${age}</td>
        ${eventCells}
      </tr>`;
    }).join('');

    return `<div class="ath-list-wrap">
      <table class="ath-list-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
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
    const grid = qs('#ath-page-grid');
    if (!grid) return;
    const list = sortedAthletes();
    if (activeView === 'list') {
      grid.className = 'ath-list-container';
      grid.innerHTML = renderList(list);
    } else {
      grid.className = 'ath-page-grid';
      grid.innerHTML = renderGrid(list);
    }
    const countEl = qs('#ath-page-count');
    if (countEl) countEl.textContent = getResultCount();
  }

  function refreshFilterPanel() {
    const panel = qs('#ath-filter-panel-inner');
    if (panel) panel.innerHTML = renderFilterPanel();
    updateFilterToggle();
  }

  function setViewBtns() {
    qs('#ath-grid-btn')?.classList.toggle('active', activeView === 'grid');
    qs('#ath-list-btn')?.classList.toggle('active', activeView === 'list');
  }

  const loggedIn = typeof getCurrentUser === 'function' && !!getCurrentUser();

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="ath-page-header">
        <div class="ath-page-header-left">
          <h1 class="ath-page-title">Athletes</h1>
          <span class="ath-page-count" id="ath-page-count">${getResultCount()}</span>
        </div>
        <div class="ath-page-controls">
          <div class="ath-page-sort-toggle" id="ath-sort-btns">
            <button class="ath-page-sort active" data-sort="alpha" onclick="sortAthletes('alpha')">A – Z</button>
            <button class="ath-page-sort" data-sort="country" onclick="sortAthletes('country')">By Country</button>
            <button class="ath-page-sort my-athletes-btn" id="my-athletes-btn" onclick="toggleMyAthletes()" style="${loggedIn ? '' : 'display:none'}">
              My Athletes
            </button>
            <button class="ath-page-sort" id="ath-map-btn" onclick="toggleAthleteMap()">Map</button>
          </div>
          <div class="ath-view-toggle">
            <button class="ath-view-btn active" id="ath-grid-btn" onclick="setAthleteView('grid')" title="Grid view">${_ICON_GRID}</button>
            <button class="ath-view-btn" id="ath-list-btn" onclick="setAthleteView('list')" title="List view">${_ICON_LIST}</button>
          </div>
        </div>
      </div>

      <div class="ath-filter-bar">
        <div class="ath-search-row">
          <div class="ath-search-wrap">
            <svg class="ath-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/></svg>
            <input class="ath-search-input" id="ath-search-input" type="text" placeholder="Search athletes…" autocomplete="off"
              oninput="searchAthletes(this.value)" />
            <button class="ath-search-clear" id="ath-search-clear" onclick="clearSearch()" aria-label="Clear search">✕</button>
          </div>
          <button class="ath-filter-toggle" id="ath-filter-toggle" onclick="toggleFilterPanel()">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><line x1="1" y1="3" x2="12" y2="3"/><line x1="3" y1="6.5" x2="10" y2="6.5"/><line x1="5" y1="10" x2="8" y2="10"/></svg>
            Filter
            <span class="ath-filter-badge" id="ath-filter-badge" style="display:none">0</span>
          </button>
        </div>
        <div class="ath-filter-panel" id="ath-filter-panel">
          <div class="ath-filter-panel-inner" id="ath-filter-panel-inner">${renderFilterPanel()}</div>
        </div>
      </div>

      <div id="ath-page-grid" class="ath-page-grid">${renderGrid(sortedAthletes())}</div>
    </div>`;

  window._mapRenderGrid  = list => { qs('#ath-page-grid').className = 'ath-page-grid'; qs('#ath-page-grid').innerHTML = renderGrid(list); };
  window._mapRestoreGrid = ()   => { activeView = 'grid'; setViewBtns(); refreshGrid(); };

  window.setAthleteView = function(view) {
    if (view === activeView) return;
    // Exit map if switching to grid/list
    if (activeView === 'map') {
      qs('#ath-map-btn')?.classList.remove('active');
    }
    activeView = view;
    setViewBtns();
    // In list view, A-Z / By Country sort buttons don't apply — dim them
    document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => {
      b.classList.toggle('ath-sort-inactive', view === 'list');
    });
    refreshGrid();
  };

  window.sortListBy = function(key) {
    if (listSortKey === key) {
      listSortDir = listSortDir === 1 ? -1 : 1;
    } else {
      listSortKey = key;
      listSortDir = 1;
    }
    refreshGrid();
  };

  window.searchAthletes = function(val) {
    activeSearch = val.trim();
    qs('#ath-search-clear').style.opacity = activeSearch ? '1' : '0';
    qs('#ath-search-clear').style.pointerEvents = activeSearch ? 'auto' : 'none';
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); qs('#ath-map-btn')?.classList.remove('active'); }
    refreshGrid();
  };

  window.clearSearch = function() {
    qs('#ath-search-input').value = '';
    window.searchAthletes('');
    qs('#ath-search-input').focus();
  };

  window.toggleFilterPanel = function() {
    filterPanelOpen = !filterPanelOpen;
    const panel = qs('#ath-filter-panel');
    const toggle = qs('#ath-filter-toggle');
    if (panel) panel.classList.toggle('open', filterPanelOpen);
    if (toggle) toggle.classList.toggle('open', filterPanelOpen);
  };

  window.clearAllFilters = function() {
    activeCountry = 'all';
    activePresets.clear();
    refreshFilterPanel();
    refreshGrid();
  };

  window.filterByPreset = function(key) {
    if (activePresets.has(key)) activePresets.delete(key); else activePresets.add(key);
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); qs('#ath-map-btn')?.classList.remove('active'); }
    refreshFilterPanel();
    refreshGrid();
  };

  window.filterByCountry = function(country) {
    activeCountry = country;
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); qs('#ath-map-btn')?.classList.remove('active'); }
    refreshFilterPanel();
    refreshGrid();
  };

  window.sortAthletes = function(sort) {
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); }
    if (activeView === 'list') { activeView = 'grid'; setViewBtns(); }
    myAthletesActive = false;
    qs('#my-athletes-btn')?.classList.remove('active');
    activeSort = sort;
    document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === sort);
      b.classList.remove('ath-sort-inactive');
    });
    refreshGrid();
  };

  window.toggleMyAthletes = window._showMyAthletes = function() {
    myAthletesActive = true;
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); qs('#ath-map-btn')?.classList.remove('active'); }
    document.querySelectorAll('.ath-page-sort').forEach(b => b.classList.remove('active'));
    qs('#my-athletes-btn')?.classList.add('active');
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
    const wasMap = activeView === 'map';
    activeView = wasMap ? 'grid' : 'map';

    if (activeView === 'map') {
      myAthletesActive = false;
      document.querySelectorAll('.ath-page-sort').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setViewBtns();
      grid.className = 'ath-map-wrap';
      grid.innerHTML = buildWorldMap(all);
      initMapInteractions(all);
    } else {
      btn.classList.remove('active');
      document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => b.classList.toggle('active', b.dataset.sort === activeSort));
      setViewBtns();
      refreshGrid();
    }
  };
}

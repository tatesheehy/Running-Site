// ============================================================
//  ATHLETES — buildAthletesPage()
// ============================================================

const _FAV_HEART = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

const _ICON_GRID = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/><rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/></svg>`;
const _ICON_LIST = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="0" y1="3" x2="14" y2="3"/><line x1="0" y1="7" x2="14" y2="7"/><line x1="0" y1="11" x2="14" y2="11"/></svg>`;

// Last name for alphabetizing (last whitespace-separated token of the name).
function _lastName(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

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
  let activeView    = 'grid';   // 'grid' | 'list' | 'map' | 'lists'
  let myAthletesActive = false;
  let activeListFilter = null; // list id or null
  let activeSearch  = '';
  let activeCountry = 'all';
  let activePresets = new Set();
  let ageMin = null, ageMax = null;
  let listSortKey   = '1500m';
  let listSortDir   = 1;        // 1 = asc (fastest first), -1 = desc

  const PRESETS = [
    { key: 'sub330', label: 'Sub-3:30', section: 'time', fn: a => _parseTime(getPr(a, '1500m')) < _parseTime('3:30.00') },
    { key: 'sub332', label: 'Sub-3:32', section: 'time', fn: a => _parseTime(getPr(a, '1500m')) < _parseTime('3:32.00') },
    { key: 'u23',    label: 'U23',      section: 'age',  fn: a => { const ag = a.dob ? calcAgeFromDob(a.dob) : null; return ag !== null && ag <= 22; } },
  ];
  let filterPanelOpen = false;
  let multiPrRows = [];

  function _isValidTimeInput(str) {
    return /^\d{1,2}:\d{2}(\.\d{1,3})?$/.test((str || '').trim());
  }

  function activeMultiPrRows() {
    return multiPrRows.filter(r => r.event && _isValidTimeInput(r.time));
  }

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
      : activeListFilter
      ? all.filter(a => typeof isInList === 'function' && isInList(activeListFilter, a.id))
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
    if (ageMin != null || ageMax != null) {
      list = list.filter(a => {
        const ag = a.dob ? calcAgeFromDob(a.dob) : parseInt(a.age, 10);
        if (ag == null || !isFinite(ag)) return false;
        if (ageMin != null && ag < ageMin) return false;
        if (ageMax != null && ag > ageMax) return false;
        return true;
      });
    }
    const activeMpr = activeMultiPrRows();
    if (activeMpr.length > 0) {
      list = list.filter(a => activeMpr.every(r => _parseTime(getPr(a, r.event)) < _parseTime(r.time)));
    }

    if (activeView === 'list') {
      const dir = listSortDir;
      list.sort((a, b) => {
        if (listSortKey === 'name')    return dir * _lastName(a.name).localeCompare(_lastName(b.name)) || dir * a.name.localeCompare(b.name);
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
      if (activeSort === 'alpha')   list.sort((a, b) => _lastName(a.name).localeCompare(_lastName(b.name)) || a.name.localeCompare(b.name));
      if (activeSort === 'country') list.sort((a, b) => (a.country || '').localeCompare(b.country || '') || _lastName(a.name).localeCompare(_lastName(b.name)));
    }
    return list;
  }

  function activeFilterCount() {
    return (activeCountry !== 'all' ? 1 : 0) + activePresets.size + (activeListFilter ? 1 : 0)
      + ((ageMin != null || ageMax != null) ? 1 : 0);
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

  function renderListsFilterSection() {
    const user = typeof getCurrentUser === 'function' && getCurrentUser();
    if (!user) return '';
    const lists = typeof getLists === 'function' ? getLists() : [];
    if (!lists.length) return '';
    const chips = lists.map(l => {
      const active = activeListFilter === l.id ? ' active' : '';
      return `<button class="ath-preset-chip${active}" data-list="${l.id}" onclick="filterByList('${l.id}')">${l.name}</button>`;
    }).join('');
    return `
      <div class="ath-filter-section">
        <div class="ath-filter-section-header">
          <span class="ath-filter-section-label">My Lists</span>
        </div>
        <div class="ath-preset-chips">${chips}</div>
      </div>`;
  }

  function _mprMatchText() {
    const active = activeMultiPrRows();
    if (!active.length) return '';
    const n = sortedAthletes().length;
    return `<span class="ath-mpr-match-count">${n} athlete${n === 1 ? '' : 's'} match${active.length > 1 ? ' all criteria' : ''}</span>`;
  }

  function _mprEventLabel(key) {
    const e = _CANONICAL_EVENTS.find(x => x.key === key);
    return e ? e.label : 'Event…';
  }

  function renderMultiPrRows() {
    return multiPrRows.map((r, i) => {
      const invalid = r.time && !_isValidTimeInput(r.time);
      const opts = _CANONICAL_EVENTS.map(e =>
        `<div class="ath-cs-opt${r.event === e.key ? ' ath-cs-opt--active' : ''}" data-key="${e.key}" onclick="mprPickEvent(${i}, '${e.key}')">${e.label}</div>`
      ).join('');
      return `
      <div class="ath-mpr-row">
        <div class="ath-cs ath-mpr-cs" data-idx="${i}">
          <button class="ath-cs-btn" type="button" onclick="mprToggleEventMenu(${i}, event)">
            <span class="ath-cs-val${r.event ? '' : ' ath-cs-val--ph'}">${_mprEventLabel(r.event)}</span>
            <svg class="ath-cs-arrow" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="ath-cs-list">${opts}</div>
        </div>
        <span class="ath-mpr-under">under</span>
        <input class="ath-mpr-time${invalid ? ' invalid' : ''}" type="text" inputmode="numeric" placeholder="e.g. 3:30.00"
          value="${r.time || ''}" oninput="mprSetTime(${i}, this.value)">
        <button class="ath-mpr-remove" onclick="mprRemoveRow(${i})" aria-label="Remove event">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
    }).join('');
  }

  function renderMultiPrTool() {
    return `
      <div class="h2h-compare-section">
        <div class="h2h-compare-hd">
          <span class="h2h-compare-title">Multi-PR Search Tool</span>
        </div>
        <div class="ath-mpr-tool-body">
          <p class="ath-mpr-hint">Find athletes who've run under a given time in multiple events at once — e.g. sub-3:30 1500m <em>and</em> sub-13:00 5000m.</p>
          <div class="ath-mpr-rows" id="ath-mpr-rows">${renderMultiPrRows()}</div>
          <div class="ath-mpr-tool-footer">
            <button class="ath-mpr-add" onclick="mprAddRow()">+ Add event</button>
            ${multiPrRows.length ? `<button class="ath-mpr-clear" onclick="mprClear()">Clear</button>` : ''}
            <span id="ath-mpr-match">${_mprMatchText()}</span>
          </div>
        </div>
      </div>`;
  }

  function refreshMultiPrTool() {
    const rows = qs('#ath-mpr-rows');
    if (rows) rows.innerHTML = renderMultiPrRows();
    const footer = qs('.ath-mpr-tool-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="ath-mpr-add" onclick="mprAddRow()">+ Add event</button>
        ${multiPrRows.length ? `<button class="ath-mpr-clear" onclick="mprClear()">Clear</button>` : ''}
        <span id="ath-mpr-match">${_mprMatchText()}</span>`;
    }
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
        <div class="ath-age-range">
          <input type="number" inputmode="numeric" min="12" max="70" class="sf-num" id="ath-age-min" placeholder="Min" value="${ageMin != null ? ageMin : ''}" oninput="athSetAge()">
          <span class="sf-dash">–</span>
          <input type="number" inputmode="numeric" min="12" max="70" class="sf-num" id="ath-age-max" placeholder="Max" value="${ageMax != null ? ageMax : ''}" oninput="athSetAge()">
        </div>
      </div>
      ${renderListsFilterSection()}
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
    { key: '800m',    label: '800m'   },
    { key: '1000 Metres', label: '1000m' },
    { key: '1500m',   label: '1500m'  },
    { key: 'Mile',    label: 'Mile'   },
    { key: '2000m',   label: '2000m'  },
    { key: '3000m',   label: '3000m'  },
    { key: '3000m SC', label: '3000 SC' },
    { key: '5000m',   label: '5000m'  },
    { key: '10000m',  label: '10000m' },
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
    if (!list.length) {
      return activeListFilter
        ? '<p class="ath-page-empty">This list has no athletes yet — add some from the My Lists section or an athlete card.</p>'
        : '<p class="ath-page-empty">No athletes found.</p>';
    }

    const header = LIST_COLS.map(c =>
      `<th class="ath-list-th ${c.cls}" onclick="sortListBy('${c.key}')" title="Sort by ${c.label}">${c.label} ${sortArrow(c.key)}</th>`
    ).join('');

    const rows = list.map((a, i) => {
      const age = a.dob ? calcAgeFromDob(a.dob) : (a.age || '—');
      const faved = typeof isFavorited === 'function' && isFavorited(a.id);
      const eventCells = _activeEventCols.map(e => {
        const v = getPr(a, e.key) || '—';
        return `<td class="ath-list-td ath-list-pr${v === '—' ? ' dim' : ''}">${v}</td>`;
      }).join('');
      return `<tr class="ath-list-row" onclick="openAthleteCard('${a.id}', null)" tabindex="0">
        <td class="ath-list-td ath-list-name">
          <span class="ath-list-num">${i + 1}</span>
          <button class="inline-fav-btn${faved ? ' favorited' : ''}" data-fav-id="${a.id}"
            onclick="event.stopPropagation();toggleFavorite('${a.id}')" aria-label="Save ${a.name}">${_FAV_HEART}</button>
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
        : activeListFilter
        ? '<p class="ath-page-empty">This list has no athletes yet — add some from the My Lists section or an athlete card.</p>'
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
      : activeListFilter
      ? all.filter(a => typeof isInList === 'function' && isInList(activeListFilter, a.id)).length
      : all.length;
    if (list.length === total) return `${total} athletes`;
    return `${list.length} of ${total}`;
  }

  function renderAthListsView() {
    const user = typeof getCurrentUser === 'function' && getCurrentUser();
    if (!user) {
      return `<div class="ath-lists-view-signin">
        <p class="ath-lists-view-desc">Make custom lists to group athletes however you want — by country, by event, by "athletes I've met" — then filter the grid to just that list or compare them head-to-head on the H2H page.</p>
        <p>Sign in to create and manage athlete lists.</p>
        <button onclick="openAuthModal()">Sign In</button>
      </div>`;
    }
    const lists = typeof getLists === 'function' ? getLists() : [];
    return `
      <div class="ath-lists-view">
        <p class="ath-lists-view-desc">Group athletes into custom lists — filter the grid to a list, or pick it as a category on the H2H leaderboard to compare just those athletes.</p>
        <div class="acct-list-new-row">
          <input id="acct-new-list-input" class="acct-list-new-input" type="text"
            placeholder="New list name…" maxlength="40" autocomplete="off"
            onkeydown="if(event.key==='Enter'){event.preventDefault();athListsCreate();}">
          <button class="acct-list-new-btn" onclick="athListsCreate()">Create</button>
        </div>
        <div class="acct-lists-wrap">
          ${lists.length ? lists.map(l => _renderAthListCard(l)).join('')
            : '<p class="acct-empty-state">No lists yet — create one above to group athletes for head-to-head comparisons.</p>'}
        </div>
      </div>`;
  }

  function _renderAthListCard(l) {
    const memberIds = typeof getListMemberIds === 'function' ? getListMemberIds(l.id) : [];
    const members = memberIds.map(id => ATHLETES[id]).filter(Boolean);
    const chips = members.length
      ? members.map(a => `
          <span class="acct-list-chip">
            <span class="acct-list-chip-name">${a.name}</span>
            <button class="acct-list-chip-remove" onclick="athListsRemove('${l.id}','${a.id}')" title="Remove">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </span>`).join('')
      : '<span class="acct-list-empty">No athletes yet</span>';

    return `
      <div class="acct-list-card" data-list-id="${l.id}">
        <div class="acct-list-header">
          <span class="acct-list-name" onclick="athListsRename('${l.id}')" title="Rename">${l.name}</span>
          <span class="acct-list-count">${memberIds.length}</span>
          <button class="ath-lists-view-btn" onclick="filterByList('${l.id}');setAthleteView('grid')" title="View these athletes in the grid">View</button>
          <button class="acct-list-delete" onclick="athListsDelete('${l.id}')" title="Delete list">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
        <div class="acct-list-members">${chips}</div>
        <div class="acct-list-add-row">
          <input class="acct-list-search" placeholder="Add athlete…" autocomplete="off"
            oninput="athListsSearch(this,'${l.id}')"
            onfocus="athListsShowDropdown('${l.id}')"
            onblur="setTimeout(()=>athListsHideDropdown('${l.id}'),150)">
          <div class="acct-list-search-dropdown" id="acct-list-dropdown-${l.id}" style="display:none"></div>
        </div>
      </div>`;
  }

  function refreshGrid() {
    const grid = qs('#ath-page-grid');
    if (!grid) return;
    if (activeView === 'lists') {
      grid.className = 'ath-lists-view-wrap';
      grid.innerHTML = renderAthListsView();
      const countEl = qs('#ath-page-count');
      if (countEl) countEl.textContent = typeof getLists === 'function' ? `${getLists().length} lists` : '0 lists';
      return;
    }
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
      <div class="page-hero">
        <div class="page-hero-inner">
          <div>
            <h1 class="page-hero-title">Athletes</h1>
            <p class="page-hero-sub" id="ath-page-count">${getResultCount()}</p>
          </div>
        </div>
      </div>

      ${typeof renderRecentlyViewed === 'function' ? renderRecentlyViewed({}) : ''}

      ${renderMultiPrTool()}

      <div class="ath-page-header">
        <div class="ath-page-controls">
          <div class="ath-page-sort-toggle" id="ath-sort-btns">
            <button class="ath-page-sort active" data-sort="alpha" onclick="sortAthletes('alpha')">A – Z</button>
            <button class="ath-page-sort" data-sort="country" onclick="sortAthletes('country')">By Country</button>
            <button class="ath-page-sort my-athletes-btn" id="my-athletes-btn" onclick="toggleMyAthletes()" style="${loggedIn ? '' : 'display:none'}">
              My Athletes
            </button>
            <button class="ath-page-sort my-lists-btn" id="my-lists-btn" onclick="toggleAthleteLists()">
              My Lists
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

  // Close the custom event dropdown when clicking outside it
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ath-mpr-cs')) {
      document.querySelectorAll('.ath-mpr-cs.open').forEach(w => w.classList.remove('open'));
    }
  });

  window.setAthleteView = function(view) {
    if (view === activeView) return;
    // Exit map/lists if switching to grid/list
    if (activeView === 'map') {
      qs('#ath-map-btn')?.classList.remove('active');
    }
    if (activeView === 'lists') {
      qs('#my-lists-btn')?.classList.remove('active');
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
    if (activeView === 'lists') { activeView = 'grid'; setViewBtns(); qs('#my-lists-btn')?.classList.remove('active'); }
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
    activeListFilter = null;
    ageMin = null; ageMax = null;
    multiPrRows = [];
    refreshFilterPanel();
    refreshMultiPrTool();
    refreshGrid();
  };

  // Age range inputs: update state + grid without re-rendering the panel
  // (which would steal input focus mid-type).
  window.athSetAge = function() {
    const mn = parseInt(qs('#ath-age-min')?.value, 10);
    const mx = parseInt(qs('#ath-age-max')?.value, 10);
    ageMin = isFinite(mn) ? mn : null;
    ageMax = isFinite(mx) ? mx : null;
    updateFilterToggle();
    refreshGrid();
  };

  window.mprAddRow = function() {
    multiPrRows.push({ event: '', time: '' });
    refreshMultiPrTool();
  };

  window.mprRemoveRow = function(i) {
    multiPrRows.splice(i, 1);
    refreshMultiPrTool();
    refreshGrid();
  };

  window.mprClear = function() {
    multiPrRows = [];
    refreshMultiPrTool();
    refreshGrid();
  };

  window.mprSetEvent = function(i, val) {
    if (!multiPrRows[i]) return;
    multiPrRows[i].event = val;
    const matchEl = qs('#ath-mpr-match');
    if (matchEl) matchEl.innerHTML = _mprMatchText();
    refreshGrid();
  };

  window.mprToggleEventMenu = function(i, ev) {
    if (ev) ev.stopPropagation();
    const wrap = qs(`.ath-mpr-cs[data-idx="${i}"]`);
    if (!wrap) return;
    const wasOpen = wrap.classList.contains('open');
    document.querySelectorAll('.ath-mpr-cs.open').forEach(w => w.classList.remove('open'));
    if (!wasOpen) wrap.classList.add('open');
  };

  window.mprPickEvent = function(i, key) {
    const wrap = qs(`.ath-mpr-cs[data-idx="${i}"]`);
    if (wrap) {
      wrap.classList.remove('open');
      const valEl = wrap.querySelector('.ath-cs-val');
      if (valEl) { valEl.textContent = _mprEventLabel(key); valEl.classList.remove('ath-cs-val--ph'); }
      wrap.querySelectorAll('.ath-cs-opt').forEach(o => o.classList.toggle('ath-cs-opt--active', o.dataset.key === key));
    }
    window.mprSetEvent(i, key);
  };

  window.mprSetTime = function(i, val) {
    if (!multiPrRows[i]) return;
    multiPrRows[i].time = val;
    const input = qs(`.ath-mpr-row:nth-child(${i + 1}) .ath-mpr-time`);
    if (input) input.classList.toggle('invalid', val && !_isValidTimeInput(val));
    const matchEl = qs('#ath-mpr-match');
    if (matchEl) matchEl.innerHTML = _mprMatchText();
    refreshGrid();
  };

  window.filterByPreset = function(key) {
    if (activePresets.has(key)) activePresets.delete(key); else activePresets.add(key);
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); qs('#ath-map-btn')?.classList.remove('active'); }
    if (activeView === 'lists') { activeView = 'grid'; setViewBtns(); qs('#my-lists-btn')?.classList.remove('active'); }
    refreshFilterPanel();
    refreshGrid();
  };

  window.filterByCountry = function(country) {
    activeCountry = country;
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); qs('#ath-map-btn')?.classList.remove('active'); }
    if (activeView === 'lists') { activeView = 'grid'; setViewBtns(); qs('#my-lists-btn')?.classList.remove('active'); }
    refreshFilterPanel();
    refreshGrid();
  };

  window.sortAthletes = function(sort) {
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); }
    if (activeView === 'list') { activeView = 'grid'; setViewBtns(); }
    if (activeView === 'lists') { activeView = 'grid'; setViewBtns(); qs('#my-lists-btn')?.classList.remove('active'); }
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
    if (activeView === 'lists') { activeView = 'grid'; setViewBtns(); }
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

  window.filterByList = function(listId) {
    activeListFilter = activeListFilter === listId ? null : listId;
    myAthletesActive = false;
    qs('#my-athletes-btn')?.classList.remove('active');
    document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => b.classList.remove('active'));
    if (activeView === 'map') { activeView = 'grid'; setViewBtns(); qs('#ath-map-btn')?.classList.remove('active'); }
    if (activeView === 'lists') { activeView = 'grid'; setViewBtns(); qs('#my-lists-btn')?.classList.remove('active'); }
    refreshFilterPanel();
    refreshGrid();
  };

  window._refreshAthleteListsPanel = function() {
    if (activeListFilter && typeof getLists === 'function' && !getLists().some(l => l.id === activeListFilter)) {
      activeListFilter = null;
    }
    refreshFilterPanel();
    refreshGrid();
  };

  window.toggleAthleteLists = function() {
    const btn = qs('#my-lists-btn');
    const wasLists = activeView === 'lists';
    if (wasLists) {
      activeView = 'grid';
      btn?.classList.remove('active');
      document.querySelectorAll('.ath-page-sort[data-sort]').forEach(b => b.classList.toggle('active', b.dataset.sort === activeSort));
      setViewBtns();
    } else {
      activeView = 'lists';
      myAthletesActive = false;
      document.querySelectorAll('.ath-page-sort').forEach(b => b.classList.remove('active'));
      qs('#ath-map-btn')?.classList.remove('active');
      btn?.classList.add('active');
      setViewBtns();
    }
    refreshGrid();
  };

  window.athListsCreate = async function() {
    const input = qs('#acct-new-list-input');
    const name = input?.value.trim();
    if (!name) return;
    await createList(name);
    if (input) input.value = '';
  };

  window.athListsRename = async function(listId) {
    const list = (typeof getLists === 'function' ? getLists() : []).find(l => l.id === listId);
    const next = prompt('Rename list', list ? list.name : '');
    if (next === null) return;
    await renameList(listId, next);
  };

  window.athListsDelete = async function(listId) {
    const list = (typeof getLists === 'function' ? getLists() : []).find(l => l.id === listId);
    if (!confirm(`Delete "${list ? list.name : 'this list'}"? This can't be undone.`)) return;
    await deleteList(listId);
  };

  window.athListsRemove = async function(listId, athleteId) {
    await toggleListMember(listId, athleteId);
  };

  window.athListsSearch = function(input, listId) {
    const q = input.value.trim().toLowerCase();
    const dd = document.getElementById(`acct-list-dropdown-${listId}`);
    if (!dd) return;
    if (!q) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    const memberIds = new Set(typeof getListMemberIds === 'function' ? getListMemberIds(listId) : []);
    const matches = Object.values(ATHLETES)
      .filter(a => a.name && !memberIds.has(a.id) && a.name.toLowerCase().includes(q))
      .slice(0, 8);
    dd.innerHTML = matches.length
      ? matches.map(a => `<div class="acct-list-search-item" onmousedown="event.preventDefault();athListsAddToList('${listId}','${a.id}')">${a.name}</div>`).join('')
      : '<div class="acct-list-search-empty">No matches</div>';
    dd.style.display = '';
  };

  window.athListsShowDropdown = function(listId) {
    const dd = document.getElementById(`acct-list-dropdown-${listId}`);
    if (dd && dd.innerHTML) dd.style.display = '';
  };

  window.athListsHideDropdown = function(listId) {
    const dd = document.getElementById(`acct-list-dropdown-${listId}`);
    if (dd) dd.style.display = 'none';
  };

  window.athListsAddToList = async function(listId, athleteId) {
    await toggleListMember(listId, athleteId);
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

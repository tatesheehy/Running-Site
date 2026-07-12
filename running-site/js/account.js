// ============================================================
//  ACCOUNT — buildAccountPage()
// ============================================================

function buildAccountPage() {
  const main = document.getElementById('main');

  function render() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    if (!user) {
      main.innerHTML = `
        <div class="acct-signed-out">
          <div class="acct-signed-out-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h1 class="acct-signed-out-title">Sign in to your account</h1>
          <p class="acct-signed-out-sub">Save favorite athletes, leave comments, and more.</p>
          <button onclick="openAuthModal()" class="acct-signed-out-btn">Sign In / Sign Up</button>
        </div>`;
      return;
    }

    const username = typeof getUsername === 'function' ? getUsername() : '';
    const favIds = typeof getFavoriteIds === 'function' ? getFavoriteIds() : [];
    const favAthletes = favIds.map(id => ATHLETES[id]).filter(Boolean);
    const mod = typeof isModerator === 'function' && isModerator();
    const avatarLetter = (username || user.email || '?')[0].toUpperCase();
    const lists = typeof getLists === 'function' ? getLists() : [];

    const cards = favAthletes.length
      ? favAthletes.map(a => {
          const photo = a.photo || '/images/default_card.png';
          return `
            <div class="acct-fav-card" onclick="goTo('athletes.html');setTimeout(()=>openAthleteCard('${a.id}',null),400)" role="button" tabindex="0">
              <div class="acct-fav-photo" style="background-image:url('${photo}')"></div>
              <div class="acct-fav-info">
                <div class="acct-fav-name">${a.name}</div>
                <div class="acct-fav-country">${renderFlag(a.flag)} ${a.country || ''}</div>
              </div>
              <button class="acct-fav-remove" onclick="event.stopPropagation();toggleFavorite('${a.id}')" title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>`;
        }).join('')
      : `<p class="acct-empty-state">No saved athletes yet — click the star on any athlete card to save them.</p>`;

    main.innerHTML = `
      <div class="acct-page">

        <div class="acct-profile-header">
          <div class="acct-avatar">${avatarLetter}</div>
          <div class="acct-profile-info">
            ${username ? `<div class="acct-profile-username">@${username}</div>` : ''}
            <div class="acct-profile-email">${user.email}</div>
            ${mod ? `<div class="acct-mod-badge">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l3.22 6.53L22 8.63l-5 4.87 1.18 6.88L12 17.27l-6.18 3.24L7 13.5 2 8.63l6.78-1.1z"/></svg>
              Moderator
            </div>` : ''}
          </div>
          <button class="acct-signout" onclick="authSignOut();goTo('index.html')">Sign Out</button>
        </div>

        <div class="acct-grid">

          <div class="acct-card">
            <h2 class="acct-card-title">Username</h2>
            ${username
              ? `<div class="acct-username-locked">
                   <span class="acct-username-display">@${username}</span>
                   <span class="acct-locked-badge">
                     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                     Locked
                   </span>
                 </div>
                 <p class="acct-card-hint">Usernames cannot be changed once set.</p>`
              : `<form class="acct-username-form" onsubmit="saveUsername(event)">
                   <input
                     id="acct-username-input"
                     class="acct-username-input"
                     type="text"
                     value=""
                     placeholder="Choose a username"
                     maxlength="30"
                     autocomplete="off"
                     spellcheck="false"
                   >
                   <button type="submit" class="acct-username-save">Save</button>
                 </form>
                 <p class="acct-card-hint">
                   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                   Choose carefully — this cannot be changed once set.
                 </p>
                 <p id="acct-username-msg" class="acct-username-msg"></p>`
            }
          </div>

          <div class="acct-card">
            <h2 class="acct-card-title">
              Saved Athletes
              ${favAthletes.length ? `<span class="acct-count">${favAthletes.length}</span>` : ''}
            </h2>
            <div class="acct-fav-list">${cards}</div>
          </div>

        </div>

        <div class="acct-card acct-card--full">
          <h2 class="acct-card-title">
            My Lists
            ${lists.length ? `<span class="acct-count">${lists.length}</span>` : ''}
          </h2>
          <div class="acct-list-new-row">
            <input id="acct-new-list-input" class="acct-list-new-input" type="text"
              placeholder="New list name…" maxlength="40" autocomplete="off"
              onkeydown="if(event.key==='Enter'){event.preventDefault();acctCreateList();}">
            <button class="acct-list-new-btn" onclick="acctCreateList()">Create</button>
          </div>
          <div class="acct-lists-wrap">
            ${lists.length ? lists.map(l => _renderListCard(l)).join('')
              : '<p class="acct-empty-state">No lists yet — create one to group athletes for head-to-head comparisons.</p>'}
          </div>
        </div>

${mod
          ? `<div class="acct-card acct-card--full" id="mod-users-section">
               <h2 class="acct-card-title">
                 All Users
                 <span class="acct-mod-label">Mod View</span>
               </h2>
               <div id="mod-users-table"><p class="acct-card-hint">Loading…</p></div>
             </div>`
          : ''}

      </div>`;

    window._refreshMyAthletes = render;

    if (typeof isModerator === 'function' && isModerator()) {
      _loadModUsers();
    }
  }

  function _renderListCard(l) {
    const memberIds = typeof getListMemberIds === 'function' ? getListMemberIds(l.id) : [];
    const members = memberIds.map(id => ATHLETES[id]).filter(Boolean);
    const chips = members.length
      ? members.map(a => `
          <span class="acct-list-chip">
            <span class="acct-list-chip-name">${a.name}</span>
            <button class="acct-list-chip-remove" onclick="acctRemoveFromList('${l.id}','${a.id}')" title="Remove">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </span>`).join('')
      : '<span class="acct-list-empty">No athletes yet</span>';

    return `
      <div class="acct-list-card" data-list-id="${l.id}">
        <div class="acct-list-header">
          <span class="acct-list-name" onclick="acctRenameList('${l.id}')" title="Rename">${l.name}</span>
          <span class="acct-list-count">${memberIds.length}</span>
          <button class="acct-list-delete" onclick="acctDeleteList('${l.id}')" title="Delete list">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
        <div class="acct-list-members">${chips}</div>
        <div class="acct-list-add-row">
          <input class="acct-list-search" placeholder="Add athlete…" autocomplete="off"
            oninput="acctListSearch(this,'${l.id}')"
            onfocus="acctListShowDropdown('${l.id}')"
            onblur="setTimeout(()=>acctListHideDropdown('${l.id}'),150)">
          <div class="acct-list-search-dropdown" id="acct-list-dropdown-${l.id}" style="display:none"></div>
        </div>
      </div>`;
  }

  window.acctCreateList = async function() {
    const input = document.getElementById('acct-new-list-input');
    const val = input?.value.trim();
    if (!val) return;
    await createList(val);
    if (input) input.value = '';
  };

  window.acctRenameList = async function(listId) {
    const list = (typeof getLists === 'function' ? getLists() : []).find(l => l.id === listId);
    const next = prompt('Rename list', list ? list.name : '');
    if (next === null) return;
    await renameList(listId, next);
  };

  window.acctDeleteList = async function(listId) {
    const list = (typeof getLists === 'function' ? getLists() : []).find(l => l.id === listId);
    if (!confirm(`Delete "${list ? list.name : 'this list'}"? This can't be undone.`)) return;
    await deleteList(listId);
  };

  window.acctRemoveFromList = async function(listId, athleteId) {
    await toggleListMember(listId, athleteId);
  };

  window.acctListSearch = function(input, listId) {
    const q = input.value.trim().toLowerCase();
    const dd = document.getElementById(`acct-list-dropdown-${listId}`);
    if (!dd) return;
    if (!q) { dd.innerHTML = ''; dd.style.display = 'none'; return; }
    const memberIds = new Set(typeof getListMemberIds === 'function' ? getListMemberIds(listId) : []);
    const matches = Object.values(ATHLETES)
      .filter(a => a.name && !memberIds.has(a.id) && a.name.toLowerCase().includes(q))
      .slice(0, 8);
    dd.innerHTML = matches.length
      ? matches.map(a => `<div class="acct-list-search-item" onmousedown="event.preventDefault();acctAddToList('${listId}','${a.id}')">${a.name}</div>`).join('')
      : '<div class="acct-list-search-empty">No matches</div>';
    dd.style.display = '';
  };

  window.acctListShowDropdown = function(listId) {
    const dd = document.getElementById(`acct-list-dropdown-${listId}`);
    if (dd && dd.innerHTML) dd.style.display = '';
  };

  window.acctListHideDropdown = function(listId) {
    const dd = document.getElementById(`acct-list-dropdown-${listId}`);
    if (dd) dd.style.display = 'none';
  };

  window.acctAddToList = async function(listId, athleteId) {
    await toggleListMember(listId, athleteId);
  };

  async function _loadModUsers() {
    const sb = typeof getSupabase === 'function' ? getSupabase() : null;
    const wrap = document.getElementById('mod-users-table');
    if (!sb || !wrap) return;

    const [{ data: profiles }, { data: commentRows }] = await Promise.all([
      sb.from('profiles').select('id, email, username, created_at').order('created_at', { ascending: false }),
      sb.from('comments').select('user_id'),
    ]);

    if (!profiles?.length) {
      wrap.innerHTML = '<p style="color:var(--muted);font-size:14px">No users yet.</p>';
      return;
    }

    const commentCounts = {};
    for (const c of (commentRows || [])) {
      commentCounts[c.user_id] = (commentCounts[c.user_id] || 0) + 1;
    }

    const rows = profiles.map(p => {
      const joined = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const comments = commentCounts[p.id] || 0;
      return `
        <tr class="mod-user-row">
          <td class="mod-user-email">${p.email || '—'}</td>
          <td class="mod-user-username">${p.username ? `<span style="color:var(--accent)">@${p.username}</span>` : '<span style="color:var(--muted)">—</span>'}</td>
          <td class="mod-user-comments">${comments || '—'}</td>
          <td class="mod-user-joined">${joined}</td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table class="mod-users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Username</th>
            <th>Comments</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  window.saveUsername = async function(e) {
    e.preventDefault();
    if (typeof getUsername === 'function' && getUsername()) return;
    const input = document.getElementById('acct-username-input');
    const msg   = document.getElementById('acct-username-msg');
    const val   = input?.value.trim();
    if (!val) { if (msg) { msg.textContent = 'Username cannot be empty.'; msg.className = 'acct-username-msg error'; } return; }
    if (msg) { msg.textContent = 'Saving…'; msg.className = 'acct-username-msg'; }
    const { error } = await updateUsername(val);
    if (error) {
      if (msg) { msg.textContent = error; msg.className = 'acct-username-msg error'; }
    } else {
      if (msg) { msg.textContent = 'Saved!'; msg.className = 'acct-username-msg success'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2000); }
    }
  };

  const check = setInterval(() => {
    if (typeof getCurrentUser !== 'undefined') { clearInterval(check); render(); }
  }, 50);
  setTimeout(() => { clearInterval(check); render(); }, 2000);
}

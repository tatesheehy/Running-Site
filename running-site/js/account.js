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

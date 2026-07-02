// ============================================================
//  ACCOUNT — buildAccountPage()
// ============================================================

function buildAccountPage() {
  const main = document.getElementById('main');

  function render() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    if (!user) {
      main.innerHTML = `
        <div class="container" style="max-width:480px;padding-top:80px;text-align:center">
          <h1 style="font-family:var(--font-display);font-size:28px;margin-bottom:12px">Sign in to your account</h1>
          <p style="color:var(--muted);margin-bottom:28px">Save favorite athletes and more.</p>
          <button onclick="openAuthModal()" style="background:var(--accent);color:#fff;font-family:var(--font-display);font-size:16px;font-weight:600;letter-spacing:.04em;padding:12px 32px;border:none;border-radius:var(--radius);cursor:pointer">Sign In / Sign Up</button>
        </div>`;
      return;
    }

    const username = typeof getUsername === 'function' ? getUsername() : '';
    const favIds = typeof getFavoriteIds === 'function' ? getFavoriteIds() : [];
    const favAthletes = favIds.map(id => ATHLETES[id]).filter(Boolean);

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
      : `<p style="color:var(--muted);font-size:15px">No saved athletes yet — click the heart on any athlete card to save them.</p>`;

    main.innerHTML = `
      <div class="container" style="max-width:700px;padding-top:52px">
        <div class="acct-header">
          <div>
            <h1 class="acct-title">My Account</h1>
            <p class="acct-email">${user.email}</p>
          </div>
          <button class="acct-signout" onclick="authSignOut();goTo('index.html')">Sign Out</button>
        </div>

        <div class="acct-section">
          <h2 class="acct-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Username
          </h2>
          <form class="acct-username-form" onsubmit="saveUsername(event)">
            <input
              id="acct-username-input"
              class="acct-username-input"
              type="text"
              value="${username}"
              placeholder="Choose a username"
              maxlength="30"
              autocomplete="off"
              spellcheck="false"
            >
            <button type="submit" class="acct-username-save">Save</button>
          </form>
          <p id="acct-username-msg" class="acct-username-msg"></p>
        </div>

        <div class="acct-section">
          <h2 class="acct-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Saved Athletes
            <span class="acct-count">${favAthletes.length}</span>
          </h2>
          <div class="acct-fav-list">${cards}</div>
        </div>
      </div>`;

    window._refreshMyAthletes = render;
  }

  window.saveUsername = async function(e) {
    e.preventDefault();
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

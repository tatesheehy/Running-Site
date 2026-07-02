// ============================================================
//  AUTH — Supabase auth + favorites
// ============================================================

const _SB_URL = 'https://hesvqekztpllalguhxxr.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlc3ZxZWt6dHBsbGFsZ3VoeHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5Mzk4MDgsImV4cCI6MjA5ODUxNTgwOH0.uhe8NvofdM9YlMeZJcIWf3sVRT9OU41trRCGfD8xU3U';

let _sb   = null;
let _user = null;
let _favorites = new Set();
let _authMode  = 'signin';

function _initSb() {
  if (_sb || typeof supabase === 'undefined') return;
  _sb = supabase.createClient(_SB_URL, _SB_KEY);
}

async function _loadFavorites() {
  if (!_sb || !_user) return;
  const { data } = await _sb.from('favorites').select('athlete_id');
  _favorites = new Set((data || []).map(r => r.athlete_id));
  _syncFavBtns();
}

function _syncNavUser() {
  const btn = document.getElementById('nav-user-btn');
  if (!btn) return;
  btn.classList.toggle('is-logged-in', !!_user);
  btn.title = _user ? _user.email : 'Sign in';
  const emailEl = document.getElementById('user-menu-email');
  if (emailEl) emailEl.textContent = _user ? _user.email : '';
  document.querySelectorAll('.my-athletes-btn').forEach(el => {
    el.style.display = _user ? '' : 'none';
  });
}

function _syncFavBtns() {
  document.querySelectorAll('[data-fav-id]').forEach(el => {
    el.classList.toggle('favorited', _favorites.has(el.dataset.favId));
  });
}

async function initAuth() {
  _initSb();
  if (!_sb) return;

  const { data: { session } } = await _sb.auth.getSession();
  _user = session?.user || null;
  if (_user) await _loadFavorites();
  _syncNavUser();

  _sb.auth.onAuthStateChange(async (_event, session) => {
    _user = session?.user || null;
    if (_user) {
      await _loadFavorites();
    } else {
      _favorites.clear();
      _syncFavBtns();
    }
    _syncNavUser();
  });
}

// ── Favorites ─────────────────────────────────────────────

window.isFavorited   = id => _favorites.has(id);
window.getCurrentUser = () => _user;
window.getFavoriteIds = () => [..._favorites];

window.toggleFavorite = async function(athleteId) {
  if (!_user) { openAuthModal(); return; }
  if (_favorites.has(athleteId)) {
    await _sb.from('favorites').delete().eq('user_id', _user.id).eq('athlete_id', athleteId);
    _favorites.delete(athleteId);
  } else {
    await _sb.from('favorites').insert({ user_id: _user.id, athlete_id: athleteId });
    _favorites.add(athleteId);
  }
  _syncFavBtns();
  // If My Athletes filter is active, re-render
  if (typeof _refreshMyAthletes === 'function') _refreshMyAthletes();
};

// ── Auth modal ────────────────────────────────────────────

window.openAuthModal = function() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  _setAuthMode('signin');
  setTimeout(() => document.getElementById('auth-email')?.focus(), 50);
};

window.closeAuthModal = function() {
  document.getElementById('auth-modal')?.classList.remove('open');
  document.body.style.overflow = '';
  _clearForm();
};

window.switchAuthTab = function(mode) { _setAuthMode(mode); };

function _setAuthMode(mode) {
  _authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
  const btn = document.getElementById('auth-submit-btn');
  if (btn) btn.textContent = mode === 'signin' ? 'Sign In' : 'Create Account';
  _clearForm();
}

function _clearForm() {
  const err = document.getElementById('auth-error');
  const ok  = document.getElementById('auth-success');
  if (err) err.textContent = '';
  if (ok)  { ok.textContent = ''; ok.style.display = 'none'; }
}

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  const email    = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  const errEl    = document.getElementById('auth-error');
  const okEl     = document.getElementById('auth-success');
  const btn      = document.getElementById('auth-submit-btn');
  if (!email || !password || !_sb) return;

  btn.disabled = true;
  btn.textContent = '…';
  if (errEl) errEl.textContent = '';

  const { data, error } = _authMode === 'signup'
    ? await _sb.auth.signUp({ email, password })
    : await _sb.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = _authMode === 'signin' ? 'Sign In' : 'Create Account';

  if (error) { if (errEl) errEl.textContent = error.message; return; }

  if (_authMode === 'signup' && data?.user && !data?.session) {
    if (okEl) { okEl.textContent = 'Check your email to confirm your account.'; okEl.style.display = 'block'; }
    return;
  }
  closeAuthModal();
};

// ── User menu ─────────────────────────────────────────────

window.toggleUserMenu = function() {
  if (!_user) { openAuthModal(); return; }
  document.getElementById('user-menu')?.classList.toggle('open');
};

window.closeUserMenu = function() {
  document.getElementById('user-menu')?.classList.remove('open');
};

window.authSignOut = async function() {
  if (_sb) await _sb.auth.signOut();
  closeUserMenu();
  _favorites.clear();
  _syncFavBtns();
  if (typeof _showAllAthletes === 'function') _showAllAthletes();
};

// Close user menu on outside click
document.addEventListener('click', e => {
  const menu = document.getElementById('user-menu');
  const btn  = document.getElementById('nav-user-btn');
  if (menu?.classList.contains('open') && !menu.contains(e.target) && e.target !== btn) {
    closeUserMenu();
  }
});

document.addEventListener('DOMContentLoaded', initAuth);

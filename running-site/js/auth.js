// ============================================================
//  AUTH — Supabase auth + favorites
// ============================================================

const _SB_URL = 'https://hesvqekztpllalguhxxr.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlc3ZxZWt6dHBsbGFsZ3VoeHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5Mzk4MDgsImV4cCI6MjA5ODUxNTgwOH0.uhe8NvofdM9YlMeZJcIWf3sVRT9OU41trRCGfD8xU3U';

let _sb   = null;
let _user = null;
let _favorites = new Set();
let _authMode  = 'signin';
let _lists = [];          // [{id, name, created_at}]
let _listMembers = {};    // { [list_id]: Set(athlete_id) }

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

async function _loadLists() {
  if (!_sb || !_user) return;
  const { data: lists } = await _sb.from('athlete_lists').select('*').order('created_at');
  _lists = lists || [];
  const { data: members } = await _sb.from('athlete_list_members').select('list_id, athlete_id');
  _listMembers = {};
  (members || []).forEach(m => {
    if (!_listMembers[m.list_id]) _listMembers[m.list_id] = new Set();
    _listMembers[m.list_id].add(m.athlete_id);
  });
  _syncListUI();
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

function _syncListUI() {
  if (typeof window._refreshMyAthletes === 'function') window._refreshMyAthletes();
  if (typeof window._refreshListModal === 'function') window._refreshListModal();
  if (typeof window._refreshAthleteListsPanel === 'function') window._refreshAthleteListsPanel();
}

async function initAuth() {
  _initSb();
  if (!_sb) return;

  const { data: { session } } = await _sb.auth.getSession();
  _user = session?.user || null;
  if (_user) await Promise.all([_loadFavorites(), _loadLists()]);
  _syncNavUser();

  _sb.auth.onAuthStateChange(async (_event, session) => {
    _user = session?.user || null;
    if (_user) {
      await Promise.all([_loadFavorites(), _loadLists()]);
    } else {
      _favorites.clear();
      _lists = [];
      _listMembers = {};
      _syncFavBtns();
      _syncListUI();
    }
    _syncNavUser();
  });
}

// ── Favorites ─────────────────────────────────────────────

window.isFavorited    = id => _favorites.has(id);
window.getCurrentUser = () => _user;
window.getFavoriteIds = () => [..._favorites];
window.getUsername    = () => _user?.user_metadata?.username || '';
window.getSupabase    = () => _sb;
window.isModerator    = () => !!_user && _user.email === 'tatesheehy@gmail.com';

window.updateUsername = async function(username) {
  if (!_sb || !_user) return { error: 'Not signed in' };
  const { data, error } = await _sb.auth.updateUser({ data: { username } });
  if (!error) {
    _user = data.user;
    // Keep profiles table in sync
    await _sb.from('profiles').update({ username }).eq('id', _user.id);
  }
  return { error: error?.message || null };
};

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

// ── Custom athlete lists ──────────────────────────────────

window.getLists           = () => _lists;
window.getListMemberIds   = listId => [...(_listMembers[listId] || [])];
window.getListsForAthlete = athleteId => _lists.filter(l => _listMembers[l.id]?.has(athleteId));
window.isInList           = (listId, athleteId) => !!_listMembers[listId]?.has(athleteId);

window.createList = async function(name) {
  if (!_user) { openAuthModal(); return null; }
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const { data, error } = await _sb.from('athlete_lists')
    .insert({ user_id: _user.id, name: trimmed }).select().single();
  if (error || !data) return null;
  _lists.push(data);
  _listMembers[data.id] = new Set();
  _syncListUI();
  return data;
};

window.renameList = async function(listId, newName) {
  const trimmed = (newName || '').trim();
  if (!trimmed) return false;
  const { error } = await _sb.from('athlete_lists').update({ name: trimmed }).eq('id', listId);
  if (error) return false;
  const l = _lists.find(x => x.id === listId);
  if (l) l.name = trimmed;
  _syncListUI();
  return true;
};

window.deleteList = async function(listId) {
  const { error } = await _sb.from('athlete_lists').delete().eq('id', listId);
  if (error) return false;
  _lists = _lists.filter(l => l.id !== listId);
  delete _listMembers[listId];
  _syncListUI();
  return true;
};

window.toggleListMember = async function(listId, athleteId) {
  if (!_user) { openAuthModal(); return; }
  if (!_listMembers[listId]) _listMembers[listId] = new Set();
  const set = _listMembers[listId];
  if (set.has(athleteId)) {
    const { error } = await _sb.from('athlete_list_members').delete().eq('list_id', listId).eq('athlete_id', athleteId);
    if (error) { console.error('Failed to remove athlete from list:', error); return; }
    set.delete(athleteId);
  } else {
    const { error } = await _sb.from('athlete_list_members').insert({ list_id: listId, user_id: _user.id, athlete_id: athleteId });
    if (error) { console.error('Failed to add athlete to list:', error); return; }
    set.add(athleteId);
  }
  _syncListUI();
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
    ? await _sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
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
  _lists = [];
  _listMembers = {};
  _syncFavBtns();
  _syncListUI();
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

// ============================================================
//  LISTS — custom athlete lists
// ============================================================

let _lists = [];        // [{ id, name, items: Set<athleteId> }]
let _listsLoaded = false;

async function _fetchLists() {
  const sb   = typeof getSupabase    === 'function' ? getSupabase()    : null;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!sb || !user) { _lists = []; return; }

  const [{ data: lists }, { data: items }] = await Promise.all([
    sb.from('athlete_lists').select('*').eq('user_id', user.id).order('created_at'),
    sb.from('athlete_list_items').select('*'),
  ]);

  _lists = (lists || []).map(l => ({
    ...l,
    items: new Set((items || []).filter(i => i.list_id === l.id).map(i => i.athlete_id)),
  }));
  _listsLoaded = true;
}

window.getLists      = () => _lists;
window.isInList      = (listId, athleteId) => _lists.find(l => l.id === listId)?.items.has(athleteId) ?? false;

window.loadLists = async function() {
  await _fetchLists();
};

window.createList = async function(name) {
  const sb   = typeof getSupabase    === 'function' ? getSupabase()    : null;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!sb || !user || !name.trim()) return { error: 'Invalid' };
  const { data, error } = await sb.from('athlete_lists').insert({ user_id: user.id, name: name.trim() }).select().single();
  if (!error && data) _lists.push({ ...data, items: new Set() });
  return { data, error: error?.message || null };
};

window.deleteList = async function(listId) {
  const sb = typeof getSupabase === 'function' ? getSupabase() : null;
  if (!sb) return;
  await sb.from('athlete_lists').delete().eq('id', listId);
  _lists = _lists.filter(l => l.id !== listId);
};

window.addAthleteToList = async function(listId, athleteId) {
  const sb   = typeof getSupabase    === 'function' ? getSupabase()    : null;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!sb || !user) return;
  await sb.from('athlete_list_items').insert({ list_id: listId, athlete_id: athleteId });
  _lists.find(l => l.id === listId)?.items.add(athleteId);
};

window.removeAthleteFromList = async function(listId, athleteId) {
  const sb = typeof getSupabase === 'function' ? getSupabase() : null;
  if (!sb) return;
  await sb.from('athlete_list_items').delete().eq('list_id', listId).eq('athlete_id', athleteId);
  _lists.find(l => l.id === listId)?.items.delete(athleteId);
};

// ── List picker popover (used inside athlete modal) ────────

window.toggleListPicker = async function(athleteId) {
  const existing = document.getElementById('list-picker');
  if (existing) {
    const isOpen = existing.classList.contains('open');
    existing.classList.toggle('open', !isOpen);
    if (!isOpen) _renderListPicker(athleteId);
    return;
  }
};

window._renderListPicker = function(athleteId) {
  const picker = document.getElementById('list-picker');
  if (!picker) return;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) {
    picker.innerHTML = `<div class="lp-signin">
      <button onclick="openAuthModal()" class="lp-signin-btn">Sign in to use lists</button>
    </div>`;
    return;
  }

  const rows = _lists.length
    ? _lists.map(l => {
        const inList = l.items.has(athleteId);
        return `
          <label class="lp-row">
            <input type="checkbox" class="lp-check" ${inList ? 'checked' : ''}
              onchange="window._toggleAthleteInList('${l.id}','${athleteId}',this.checked)">
            <span class="lp-name">${l.name}</span>
            <span class="lp-count">${l.items.size}</span>
          </label>`;
      }).join('')
    : `<p class="lp-empty">No lists yet.</p>`;

  picker.innerHTML = `
    <div class="lp-list">${rows}</div>
    <form class="lp-new-form" onsubmit="window._createListFromPicker(event,'${athleteId}')">
      <input class="lp-new-input" type="text" placeholder="New list…" maxlength="40" autocomplete="off">
      <button type="submit" class="lp-new-btn">+</button>
    </form>`;
};

window._toggleAthleteInList = async function(listId, athleteId, add) {
  if (add) await addAthleteToList(listId, athleteId);
  else     await removeAthleteFromList(listId, athleteId);
  _renderListPicker(athleteId);
  if (typeof window._refreshListsSection === 'function') window._refreshListsSection();
};

window._createListFromPicker = async function(e, athleteId) {
  e.preventDefault();
  const input = e.target.querySelector('.lp-new-input');
  const name = input?.value.trim();
  if (!name) return;
  const { data, error } = await createList(name);
  if (!error && data) {
    await addAthleteToList(data.id, athleteId);
  }
  if (input) input.value = '';
  _renderListPicker(athleteId);
  if (typeof window._refreshListsSection === 'function') window._refreshListsSection();
};

// Close picker when clicking outside
document.addEventListener('click', e => {
  const picker = document.getElementById('list-picker');
  if (!picker || !picker.classList.contains('open')) return;
  if (!picker.closest('.card-list-wrap')?.contains(e.target)) {
    picker.classList.remove('open');
  }
});

// Load lists once auth is ready
(function waitForAuth() {
  const check = setInterval(() => {
    if (typeof getCurrentUser !== 'undefined') {
      clearInterval(check);
      if (getCurrentUser()) loadLists();
    }
  }, 50);
  setTimeout(() => clearInterval(check), 5000);
})();

// ============================================================
//  FILTERS — shared min/max age + country filter bar, reused by
//  the Event Tracker, Country pages, Time Machine and Athletes.
// ============================================================

// Resolve an athlete's age → number, or null when unknown.
function ageOf(a) {
  if (!a) return null;
  if (a.dob) { const g = calcAgeFromDob(a.dob); return isFinite(g) ? g : null; }
  const n = parseInt(a.age != null ? a.age : (a.vitals && a.vitals.AGE), 10);
  return isFinite(n) ? n : null;
}

// True if athlete `a` passes the {minAge, maxAge, country} state. When an age
// bound is set, athletes with no age data are excluded.
function matchAthleteFilter(a, state) {
  if (!state || !a) return true;
  if (state.country && (a.country || '') !== state.country) return false;
  if (state.minAge != null || state.maxAge != null) {
    const ag = ageOf(a);
    if (ag == null) return false;
    if (state.minAge != null && ag < state.minAge) return false;
    if (state.maxAge != null && ag > state.maxAge) return false;
  }
  return true;
}

function filterStateActive(state) {
  return !!(state && (state.minAge != null || state.maxAge != null || state.country));
}

// Read the current values out of a filter bar's inputs (by prefix).
function readFilterState(prefix, hasCountry) {
  const min = parseInt((document.getElementById(prefix + '-min') || {}).value, 10);
  const max = parseInt((document.getElementById(prefix + '-max') || {}).value, 10);
  const country = hasCountry ? ((document.getElementById(prefix + '-country') || {}).value || '') : '';
  return {
    minAge: isFinite(min) ? min : null,
    maxAge: isFinite(max) ? max : null,
    country: country || '',
  };
}

// ── Styled dropdown ───────────────────────────────────────
// Site-wide custom dropdown matching the H2H list selector. Keeps a hidden
// <input> so existing DOM-reading code (readFilterState etc.) still works.
// cfg: { id, value, options:[{value,label}], onChange (global fn name), minWidth, placeholder }
function styledDropdown(cfg) {
  const esc = v => String(v == null ? '' : v).replace(/"/g, '&quot;');
  const opts = (cfg.options || []).map(o =>
    `<div class="sdrop-opt${o.value === cfg.value ? ' sdrop-opt--active' : ''}" data-value="${esc(o.value)}" onclick="sdropSelect(this)">${o.label}</div>`
  ).join('');
  const cur = (cfg.options || []).find(o => o.value === cfg.value);
  return `
    <div class="sdrop"${cfg.onChange ? ` data-onchange="${cfg.onChange}"` : ''}${cfg.minWidth ? ` style="min-width:${cfg.minWidth}"` : ''}>
      <input type="hidden"${cfg.id ? ` id="${cfg.id}"` : ''} value="${esc(cfg.value)}">
      <button class="sdrop-btn" type="button" onclick="sdropToggle(this)">
        <span class="sdrop-val">${cur ? cur.label : (cfg.placeholder || '')}</span>
        <svg class="sdrop-arrow" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="sdrop-list">${opts}</div>
    </div>`;
}

window.sdropToggle = function (btn) {
  const d = btn.closest('.sdrop');
  const isOpen = d.classList.contains('open');
  document.querySelectorAll('.sdrop.open').forEach(x => x.classList.remove('open'));
  if (!isOpen) d.classList.add('open');
};
window.sdropSelect = function (opt) {
  const d = opt.closest('.sdrop');
  const val = opt.dataset.value;
  const input = d.querySelector('input');
  if (input) input.value = val;
  d.querySelector('.sdrop-val').textContent = opt.textContent;
  d.querySelectorAll('.sdrop-opt').forEach(o => o.classList.toggle('sdrop-opt--active', o === opt));
  d.classList.remove('open');
  const fn = d.dataset.onchange;
  if (fn && typeof window[fn] === 'function') window[fn](val);
};
if (!window._sdropOutsideBound) {
  window._sdropOutsideBound = true;
  document.addEventListener('click', e => {
    if (!e.target.closest('.sdrop')) document.querySelectorAll('.sdrop.open').forEach(x => x.classList.remove('open'));
  });
}

// Render the filter bar. cfg: { prefix, onInput, onClear, country, countries, state }
function filterBarHtml(cfg) {
  const s = cfg.state || {};
  const countryField = cfg.country ? `
    <div class="sf-field">
      <span class="sf-label">Country</span>
      ${styledDropdown({
        id: cfg.prefix + '-country',
        value: s.country || '',
        onChange: cfg.onInput,
        minWidth: '150px',
        options: [{ value: '', label: 'All countries' }, ...(cfg.countries || []).map(c => ({ value: c, label: c }))],
      })}
    </div>` : '';
  return `
    <div class="sf-bar">
      ${countryField}
      <div class="sf-field">
        <span class="sf-label">Age</span>
        <div class="sf-age">
          <input type="number" inputmode="numeric" min="12" max="70" class="sf-num" id="${cfg.prefix}-min" placeholder="Min" value="${s.minAge != null ? s.minAge : ''}" oninput="${cfg.onInput}()">
          <span class="sf-dash">–</span>
          <input type="number" inputmode="numeric" min="12" max="70" class="sf-num" id="${cfg.prefix}-max" placeholder="Max" value="${s.maxAge != null ? s.maxAge : ''}" oninput="${cfg.onInput}()">
        </div>
      </div>
      <button class="sf-clear${filterStateActive(s) ? '' : ' sf-clear--hidden'}" onclick="${cfg.onClear}()">Clear</button>
    </div>`;
}

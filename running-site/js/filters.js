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

// Render the filter bar. cfg: { prefix, onInput, onClear, country, countries, state }
function filterBarHtml(cfg) {
  const s = cfg.state || {};
  const countryField = cfg.country ? `
    <div class="sf-field">
      <span class="sf-label">Country</span>
      <div class="sf-select-wrap">
        <select class="sf-select" id="${cfg.prefix}-country" onchange="${cfg.onInput}()">
          <option value="">All countries</option>
          ${(cfg.countries || []).map(c => `<option value="${c}"${s.country === c ? ' selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
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

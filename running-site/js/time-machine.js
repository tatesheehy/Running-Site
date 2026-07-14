// ============================================================
//  THE TIME MACHINE — reconstruct the state of the sport as of
//  any past date: season-best leaders, H2H records, recent form.
// ============================================================

const TM_EVENTS = ['800m', '1500m', '5000m', '10000m'];
const TM_MIN_DATE = '2018-01-01';

let _tmDate = null;    // JS Date currently being viewed
let _tmPending = null; // JS Date staged in the picker, not yet committed

// "MON DD" → month*100+day ordinal for same-season comparisons
function _tmOrd(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + ' 2000');
  return isNaN(d) ? null : (d.getMonth() + 1) * 100 + d.getDate();
}

function _tmToday() { return new Date(); }

function _tmIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _tmPrettyDate(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// "5 years, 3 months ago" style label
function _tmRelLabel(date) {
  const now = _tmToday();
  let years = now.getFullYear() - date.getFullYear();
  let months = now.getMonth() - date.getMonth();
  let days = now.getDate() - date.getDate();
  if (days < 0) { months -= 1; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  const parts = [];
  if (years) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (!years && days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  return parts.length ? parts.join(', ') + ' ago' : 'today';
}

// Results for an athlete in `year`, on or before the ordinal cutoff
function _tmResults(a, year, asOfOrd) {
  const src = (year === '2026') ? (a.results || []) : ((a.resultsHistory || {})[year] || []);
  return src.filter(r => { const o = _tmOrd(r.date); return o != null && o <= asOfOrd; });
}

// Season-best ranking for an event, as of a date (year + ordinal cutoff)
function _tmSeasonBest(event, year, asOfOrd) {
  const norm = s => (s || '').toLowerCase().replace(/[\s,]+/g, '');
  const target = norm(event);
  return Object.entries(ATHLETES)
    .map(([id, a]) => {
      const valid = _tmResults(a, year, asOfOrd)
        .map(r => ({ r, s: parseTimeToSecs(r.time) }))
        .filter(({ r, s }) => norm(r.event) === target && s != null && isFinite(s) && s > 0)
        .sort((x, y) => x.s - y.s);
      if (!valid.length) return null;
      const b = valid[0];
      return { id, a, time: b.r.time, secs: b.s, meet: (b.r.meet && b.r.meet !== 'x') ? b.r.meet : '' };
    })
    .filter(Boolean)
    .sort((x, y) => x.secs - y.secs);
}

// ── Controls ──────────────────────────────────────────────
// Picking a date/preset STAGES it (previews the date + lights up the
// "Enter the Time Machine" button); the trip only happens on Enter.
function _tmStage(d) {
  _tmPending = d;
  const dp = document.querySelector('.tm-asof-date'); if (dp) dp.textContent = _tmPrettyDate(d);
  const rl = document.querySelector('.tm-asof-rel');  if (rl) rl.textContent = _tmRelLabel(d);
  const inp = document.querySelector('.tm-date-picker input'); if (inp) inp.value = _tmIso(d);
  _tmArm();
}

// Enable/glow the Enter button only when the staged date differs from
// the one currently being shown.
function _tmArm() {
  const btn = document.getElementById('tm-enter-btn');
  if (!btn) return;
  const changed = _tmPending && _tmIso(_tmPending) !== _tmIso(_tmDate);
  btn.disabled = !changed;
  btn.classList.toggle('is-armed', !!changed);
}

window.tmSetDate = function (iso) {
  if (!iso) return;
  _tmStage(new Date(iso + 'T00:00:00'));
};

window.tmSetPreset = function (kind) {
  const d = _tmToday();
  switch (kind) {
    case '1w': d.setDate(d.getDate() - 7); break;
    case '1m': d.setMonth(d.getMonth() - 1); break;
    case '3m': d.setMonth(d.getMonth() - 3); break;
    case '6m': d.setMonth(d.getMonth() - 6); break;
    case '1y': d.setFullYear(d.getFullYear() - 1); break;
    case '2y': d.setFullYear(d.getFullYear() - 2); break;
    case '5y': d.setFullYear(d.getFullYear() - 5); break;
  }
  _tmStage(d);
};

// Commit the staged date — actually travel to it.
window.tmEnter = function () {
  if (!_tmPending) return;
  _tmDate = _tmPending;
  _tmPending = null;
  _tmRender();
};

window.tmToggleSection = function (id, btn, total) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.classList.toggle('et-open');
  btn.textContent = open ? 'Show less' : `See all ${total} athletes`;
};

const _TM_PRESETS = [
  ['1w', '1 week'], ['1m', '1 month'], ['3m', '3 months'], ['6m', '6 months'],
  ['1y', '1 year'], ['2y', '2 years'], ['5y', '5 years'],
];

function _tmControlsHtml() {
  const iso = _tmIso(_tmDate);
  const chips = _TM_PRESETS.map(([k, label]) =>
    `<button class="tm-preset" onclick="tmSetPreset('${k}')">${label} ago</button>`
  ).join('');
  return `
    <div class="tm-controls">
      <div class="tm-controls-row">
        <div class="tm-asof">
          <div class="tm-asof-label">Showing the sport as of</div>
          <div class="tm-asof-date">${_tmPrettyDate(_tmDate)}</div>
          <div class="tm-asof-rel">${_tmRelLabel(_tmDate)}</div>
        </div>
        <label class="tm-date-picker">
          <span>Jump to a date</span>
          <input type="date" value="${iso}" min="${TM_MIN_DATE}" max="${_tmIso(_tmToday())}" onchange="tmSetDate(this.value)">
        </label>
      </div>
      <div class="tm-presets">${chips}</div>
      <button class="tm-enter" id="tm-enter-btn" onclick="tmEnter()" disabled>
        Enter the Time Machine
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </div>`;
}

// ── Sections ──────────────────────────────────────────────
function _tmSeasonBestSection(year, ord) {
  const cards = TM_EVENTS.map((ev, i) => {
    const list = _tmSeasonBest(ev, year, ord);
    const collapsible = list.length > 5;
    const id = `tm-sb-${i}`;
    const body = list.length
      ? `<div class="et-collapse${collapsible ? ' et-collapse--tmsb' : ''}" id="${id}">${_seasonBestTableHtml(list, ev)}</div>
         ${collapsible ? `<button class="et-see-all et-see-all--sm" onclick="tmToggleSection('${id}', this, ${list.length})">See all ${list.length} athletes</button>` : ''}`
      : `<p class="tm-empty">No ${ev} marks recorded yet by this date.</p>`;
    const leader = list[0];
    return `
      <section class="et-section tm-sb-card">
        <div class="et-section-header">
          <h2 class="et-section-title">${ev}</h2>
          ${leader ? `<span class="tm-sb-leader">${leader.time}</span>` : ''}
        </div>
        ${body}
      </section>`;
  }).join('');
  return `
    <div class="tm-section-head"><h2 class="tm-section-title">Season Best Leaders</h2></div>
    <div class="tm-sb-grid">${cards}</div>`;
}

// ── Recent performances in the ~30 days leading up to the date ──
function _tmRecentPerformances(year, targetDate, windowDays, eventFilter, limit) {
  const src = a => (year === '2026') ? (a.results || []) : ((a.resultsHistory || {})[year] || []);
  const all = Object.values(ATHLETES);
  const endTs = targetDate.getTime();
  const startTs = endTs - windowDays * 86400000;
  const yNum = +year;
  const rdate = ds => { const d = new Date(`${ds} ${yNum}`); return isNaN(d) ? null : d.getTime(); };

  const groups = {};
  all.forEach(a => src(a).forEach(r => {
    if (!r.meet || !r.event || !r.time) return;
    const key = `${_normalizeEvent(r.event)}|${r.meet.trim().toLowerCase()}|${r.round || ''}`;
    (groups[key] = groups[key] || []).push({ athlete: a, result: r });
  }));

  const candidates = [];
  all.forEach(a => src(a).forEach(r => {
    const ts = rdate(r.date);
    if (ts == null || ts > endTs || ts < startTs) return;
    const s = parseTimeToSecs(r.time);
    if (s == null || !isFinite(s)) return;
    if (eventFilter && eventFilter !== 'all' && typeof _h2hEventMatches === 'function' && !_h2hEventMatches(r.event, eventFilter)) return;
    const place = parseInt(r.place, 10);
    const isPB = _isPbResult(a, r);
    let isDominant = false, marginLabel = '';
    if (place === 1) {
      const key = `${_normalizeEvent(r.event)}|${r.meet.trim().toLowerCase()}|${r.round || ''}`;
      const others = (groups[key] || []).filter(e => e.athlete !== a && parseTimeToSecs(e.result.time) != null);
      const nextBest = others.reduce((best, e) => (!best || parseTimeToSecs(e.result.time) < parseTimeToSecs(best.result.time)) ? e : best, null);
      if (nextBest) { const m = _raceMargin(r.time, nextBest.result.time); if (m && m.cls === 'dominant') { isDominant = true; marginLabel = m.label; } }
    }
    const tier = _meetTier(r.meet);
    const isProminent = tier >= 2 && place >= 1 && place <= 3;
    if (!isPB && !isDominant && !isProminent) return;
    const score = (isPB ? 3 : 0) + (isDominant ? 2 : 0) + (isProminent ? (tier === 3 ? 2 : 1) : 0);
    candidates.push({ athlete: a, result: r, isPB, isDominant, isProminent, tier, marginLabel, score, ts });
  }));

  const byAthlete = {};
  candidates.forEach(c => { const cur = byAthlete[c.athlete.id]; if (!cur || c.score > cur.score || (c.score === cur.score && c.ts > cur.ts)) byAthlete[c.athlete.id] = c; });
  return Object.values(byAthlete).sort((x, y) => y.ts - x.ts || y.score - x.score).slice(0, limit);
}

function _tmRecentSection(year, targetDate) {
  const items = _tmRecentPerformances(year, targetDate, 30, 'all', 8);
  const body = items.length
    ? `<div class="et-activity-wrap"><div class="fp-trending-list">${items.map(trendRow).join('')}</div></div>`
    : `<p class="tm-empty">No notable performances in the 30 days before this date.</p>`;
  return `
    <div class="tm-section-head"><h2 class="tm-section-title">Performances Around This Time</h2></div>
    <section class="et-section">${body}</section>`;
}

// ── Head-to-Head, with per-event filter tabs ──────────────
let _tmH2HEvent = 'all';

window.tmSetH2HEvent = function (ev) {
  _tmH2HEvent = ev;
  _tmRenderH2H();
};

function _tmH2HSection(year, ord, eventFilter) {
  eventFilter = eventFilter || 'all';
  const { records } = _computeAllH2HRecords(year, eventFilter, 'all', 'all', ord);
  if (typeof _h2hCurrentRecs !== 'undefined') _h2hCurrentRecs = records;
  const minRaces = typeof _H2H_MIN_RACES !== 'undefined' ? _H2H_MIN_RACES : 3;
  const rows = Object.entries(records)
    .filter(([, r]) => r.wins + r.losses >= minRaces)
    .sort((a, b) =>
      _wilsonScore(b[1].wins, b[1].wins + b[1].losses) - _wilsonScore(a[1].wins, a[1].wins + a[1].losses)
      || b[1].wins - a[1].wins);

  const collapsible = rows.length > 8;
  const table = _renderH2HLbTableHtml(rows, {
    expandable: true,
    emptyMessage: 'Not enough head-to-head races logged by this date.',
  });
  const tabs = ['all', ...TM_EVENTS].map(ev =>
    `<button class="h2h-seg-btn${eventFilter === ev ? ' active' : ''}" onclick="tmSetH2HEvent('${ev}')">${ev === 'all' ? 'All' : ev}</button>`
  ).join('');
  return `
    <div class="tm-section-head">
      <h2 class="tm-section-title">Head-to-Head Leaders</h2>
      <div class="h2h-seg tm-h2h-seg">${tabs}</div>
    </div>
    <section class="et-section">
      <div class="et-collapse${collapsible ? ' et-collapse--h2h' : ''}" id="tm-h2h-collapse">
        <div class="h2h-lb-wrap">${table}</div>
      </div>
      ${collapsible ? `<button class="et-see-all" onclick="tmToggleSection('tm-h2h-collapse', this, ${rows.length})">See all ${rows.length} athletes</button>` : ''}
    </section>`;
}

function _tmRenderH2H() {
  const slot = document.getElementById('tm-h2h-slot');
  if (!slot || !_tmDate) return;
  const year = String(_tmDate.getFullYear());
  const ord = (_tmDate.getMonth() + 1) * 100 + _tmDate.getDate();
  slot.innerHTML = _tmH2HSection(year, ord, _tmH2HEvent);
}

function _tmRender() {
  const results = document.getElementById('tm-results');
  const controls = document.getElementById('tm-controls-slot');
  if (!results) return;
  if (controls) controls.innerHTML = _tmControlsHtml();
  const year = String(_tmDate.getFullYear());
  const ord = (_tmDate.getMonth() + 1) * 100 + _tmDate.getDate();
  results.innerHTML =
    _tmRecentSection(year, _tmDate) +
    _tmSeasonBestSection(year, ord) +
    '<div id="tm-h2h-slot"></div>';
  _tmRenderH2H();
}

function buildTimeMachinePage() {
  const main = qs('#main');
  if (!main) return;

  // default view: today
  _tmDate = _tmToday();
  _tmPending = null;

  main.innerHTML = `
    <div class="container tm-page">
      <div class="page-hero">
        <div class="page-hero-inner">
          <div>
            <div class="page-hero-eyebrow">Rewind</div>
            <h1 class="page-hero-title">The Time Machine</h1>
            <p class="page-hero-sub">Go back to any date and see who led the season, the head-to-head picture, and how the sport looked at that moment.</p>
          </div>
        </div>
      </div>
      <div id="tm-controls-slot"></div>
      <div id="tm-results"></div>
    </div>`;

  _tmRender();
}

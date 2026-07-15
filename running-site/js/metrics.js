// ============================================================
//  ADVANCED METRICS — buildMetricsPage()
//  Inline-SVG charts: Aerobic Decay, Age vs Performance,
//  Season Progression. No external chart library.
// ============================================================

// Canonical track distances (metres) used across the charts.
const MX_EVENTS = [
  { key: '800m',   m: 800,   label: '800m'   },
  { key: '1500m',  m: 1500,  label: '1500m'  },
  { key: 'Mile',   m: 1609,  label: 'Mile'   },
  { key: '3000m',  m: 3000,  label: '3000m'  },
  { key: '5000m',  m: 5000,  label: '5000m'  },
  { key: '10000m', m: 10000, label: '10000m' },
];

// Distances for the aerobic-decay chart. 1500m and the Mile sit almost on
// top of each other on a log axis, so they're one node: use the 1500m PR,
// falling back to the Mile PR (its pace is still comparable per-km).
const MX_DECAY_DIST = [
  { key: '800m',   m: 800   },
  { key: '1500m',  m: 1500, alt: 'Mile', altM: 1609, label: '1500m / Mile' },
  { key: '3000m',  m: 3000  },
  { key: '5000m',  m: 5000  },
  { key: '10000m', m: 10000 },
];

const _mxNorm = s => (s || '').toLowerCase().replace(/[\s,]+/g, '');
const _mxEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const _MX_PALETTE = ['#2563EB', '#DB2777', '#16A34A', '#CA8A04', '#9333EA', '#EA580C'];

let _mxEvent = '5000m';        // drives Age vs Performance + Progression
let _mxHighlight = [];         // athlete ids highlighted on the decay chart
let _mxMode = 'pace';          // 'pace' (absolute) | 'rel' (relative to own best)
let _mxProgN = 10;             // season progression: average of the top N times

// ── time helpers ──────────────────────────────────────────
function _mxSec(t) {
  const s = (typeof _parseTimeSecs === 'function') ? _parseTimeSecs(t) : NaN;
  return (s != null && isFinite(s) && s > 0) ? s : null;
}
function _mxClock(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60), s = sec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(0).padStart(2, '0')}` : s.toFixed(1);
}
function _mxPace(sec) { // seconds per km → "m:ss"
  const m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Best PR time (secs) for an athlete at a canonical event.
function _mxPr(a, evKey) {
  const target = _mxNorm(evKey);
  let best = null;
  (a.prs || []).forEach(p => {
    if (_mxNorm(p.event) !== target) return;
    const s = _mxSec(p.time);
    if (s != null && (best == null || s < best)) best = s;
  });
  return best;
}

// Season best (secs) for an athlete at an event, from this-season results.
function _mxSeasonBest(a, evKey) {
  const target = _mxNorm(evKey);
  let best = null;
  (a.results || []).forEach(r => {
    if (_mxNorm(r.event) !== target) return;
    const s = _mxSec(r.time);
    if (s != null && (best == null || s < best)) best = s;
  });
  return best;
}

// ── generic SVG chart scaffold ────────────────────────────
const _MX_W = 760, _MX_H = 380, _MX_PAD = { t: 24, r: 24, b: 44, l: 62 };
function _mxX(v, dMin, dMax) {
  return _MX_PAD.l + (v - dMin) / (dMax - dMin || 1) * (_MX_W - _MX_PAD.l - _MX_PAD.r);
}
function _mxY(v, dMin, dMax) {
  return _MX_H - _MX_PAD.b - (v - dMin) / (dMax - dMin || 1) * (_MX_H - _MX_PAD.t - _MX_PAD.b);
}

// ── 1. AEROBIC DECAY ──────────────────────────────────────
// Each athlete's pace (sec/km) at each distance they've raced. As distance
// grows, pace slows — the "decay". A flatter line = stronger endurance
// relative to speed. The faint field shows the whole range.
function _mxDecayPoints(a) {
  const pts = [];
  MX_DECAY_DIST.forEach(ev => {
    let sec = _mxPr(a, ev.key), evLabel = ev.key, evM = ev.m;
    if (sec == null && ev.alt) {   // fall back to the near-equivalent (Mile)
      const altSec = _mxPr(a, ev.alt);
      if (altSec != null) { sec = altSec; evLabel = ev.alt; evM = ev.altM; }
    }
    if (sec != null) pts.push({ m: ev.m, ev: evLabel, sec, pace: sec / (evM / 1000) });
  });
  return pts.sort((x, y) => x.m - y.m);
}

function _mxDecaySvg() {
  const all = Object.values(ATHLETES)
    .map(a => ({ a, pts: _mxDecayPoints(a).map(p => ({ ...p })) }))
    .filter(o => o.pts.length >= 2);
  if (!all.length) return '<p class="mx-empty">Not enough multi-distance data yet.</p>';

  const rel = _mxMode === 'rel';
  // In relative mode each athlete's curve is normalized to their own fastest
  // pace, so lines can be compared by shape regardless of raw speed.
  all.forEach(o => {
    const best = Math.min(...o.pts.map(p => p.pace));
    o.pts.forEach(p => { p.val = rel ? p.pace / best : p.pace; });
  });

  // Dedicated, larger geometry for this headline chart.
  const W = 900, H = 520, PAD = { t: 30, r: 34, b: 52, l: 78 };
  const xMin = Math.log(MX_DECAY_DIST[0].m), xMax = Math.log(MX_DECAY_DIST[MX_DECAY_DIST.length - 1].m);
  let vMin = Infinity, vMax = -Infinity;
  all.forEach(o => o.pts.forEach(p => { vMin = Math.min(vMin, p.val); vMax = Math.max(vMax, p.val); }));
  const padV = (vMax - vMin) * 0.06 || (rel ? 0.02 : 5);
  vMax += padV;
  // Relative mode: pin the axis floor to each athlete's own best (+0%),
  // so the baseline never shows a negative slowdown.
  vMin = rel ? 1 : vMin - padV;

  const px = m => PAD.l + (Math.log(m) - xMin) / (xMax - xMin) * (W - PAD.l - PAD.r);
  const py = v => H - PAD.b - (v - vMin) / (vMax - vMin || 1) * (H - PAD.t - PAD.b);
  const fmtY = v => rel ? `+${Math.round((v - 1) * 100)}%` : _mxPace(v);

  // Vertical gridlines at each distance
  const vlines = MX_DECAY_DIST.map(ev => `<line class="mx-grid" x1="${px(ev.m).toFixed(1)}" y1="${PAD.t}" x2="${px(ev.m).toFixed(1)}" y2="${H - PAD.b}"/>`).join('');

  // Y gridlines / labels
  const yTicks = 6, gridY = [];
  for (let i = 0; i <= yTicks; i++) {
    const v = vMin + (vMax - vMin) * i / yTicks, y = py(v);
    gridY.push(`<line class="mx-grid" x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}"/>
      <text class="mx-axl mx-axl--lg" x="${PAD.l - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end">${fmtY(v)}</text>`);
  }
  // X labels (single row — 1500m and Mile are now one node)
  const gridX = MX_DECAY_DIST.map(ev =>
    `<text class="mx-axl mx-axl--lg" x="${px(ev.m).toFixed(1)}" y="${H - PAD.b + 22}" text-anchor="middle">${ev.label || ev.key}</text>`
  ).join('');

  const line = pts => 'M' + pts.map(p => `${px(p.m).toFixed(1)} ${py(p.val).toFixed(1)}`).join(' L');
  const field = all.map(o => `<path class="mx-decay-faint" d="${line(o.pts)}"/>`).join('');

  // Median line
  const medianPts = MX_DECAY_DIST.map(ev => {
    const vals = all.flatMap(o => o.pts.filter(p => p.m === ev.m).map(p => p.val)).sort((x, y) => x - y);
    if (!vals.length) return null;
    return { m: ev.m, val: vals[Math.floor(vals.length / 2)] };
  }).filter(Boolean);
  const median = `<path class="mx-decay-median" d="${line(medianPts)}"/>`;

  // Highlighted athletes (thicker lines, larger dots, hover tooltips)
  const hi = _mxHighlight.map((id, i) => {
    const a = ATHLETES[id];
    if (!a) return '';
    let pts = _mxDecayPoints(a).map(p => ({ ...p }));
    if (pts.length < 1) return '';
    const best = Math.min(...pts.map(p => p.pace));
    pts.forEach(p => { p.val = rel ? p.pace / best : p.pace; });
    const c = _MX_PALETTE[i % _MX_PALETTE.length];
    const dots = pts.map(p => {
      const tip = `${a.name} · ${p.ev} · ${_mxClock(p.sec)}${rel ? ` · +${Math.round((p.pace / best - 1) * 100)}% vs best` : ` · ${_mxPace(p.pace)}/km`}`;
      return `<circle class="mx-dot--hit" cx="${px(p.m).toFixed(1)}" cy="${py(p.val).toFixed(1)}" r="6" fill="${c}" data-tip="${_mxEsc(tip)}"/>`;
    }).join('');
    return `<path class="mx-decay-hi" style="stroke:${c}" d="${line(pts)}"/>${dots}`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="mx-svg mx-svg--decay" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Aerobic decay chart">
    <text class="mx-axtitle" x="18" y="${H / 2}" transform="rotate(-90 18 ${H / 2})" text-anchor="middle">${rel ? 'Slowdown vs. own best pace' : 'Pace (per km)'}</text>
    ${vlines}
    ${gridY.join('')}
    ${gridX}
    ${field}
    ${median}
    ${hi}
  </svg>`;
}

// Legend + athlete search for the decay chart
function _mxDecayControls() {
  const chips = _mxHighlight.map((id, i) => {
    const a = ATHLETES[id];
    if (!a) return '';
    const c = _MX_PALETTE[i % _MX_PALETTE.length];
    return `<span class="mx-chip" style="--c:${c}"><span class="mx-chip-dot"></span>${a.name}<button onclick="mxRemoveHighlight('${id}')" aria-label="Remove">×</button></span>`;
  }).join('');
  return `
    <div class="mx-legend">
      <span class="mx-legend-item"><span class="mx-legend-line mx-legend-line--faint"></span>Every athlete</span>
      <span class="mx-legend-item"><span class="mx-legend-line mx-legend-line--median"></span>Field median</span>
    </div>
    <div class="mx-search-wrap">
      <input class="mx-search" id="mx-decay-search" placeholder="Add an athlete to compare…" autocomplete="off"
        oninput="mxDecaySearch(this.value)" onfocus="mxDecaySearch(this.value)">
      <div class="mx-search-results" id="mx-decay-results"></div>
    </div>
    <div class="mx-chips">${chips}</div>`;
}

window.mxDecaySearch = function (q) {
  const box = document.getElementById('mx-decay-results');
  if (!box) return;
  q = (q || '').trim().toLowerCase();
  if (!q) { box.innerHTML = ''; box.classList.remove('open'); return; }
  const hits = Object.values(ATHLETES)
    .filter(a => a.name.toLowerCase().includes(q) && !_mxHighlight.includes(a.id) && _mxDecayPoints(a).length >= 1)
    .slice(0, 6);
  box.innerHTML = hits.map(a => `<div class="mx-search-opt" onclick="mxAddHighlight('${a.id}')">${renderFlag(a.flag)} ${a.name}</div>`).join('')
    || '<div class="mx-search-opt mx-search-opt--empty">No multi-distance athletes match</div>';
  box.classList.add('open');
};
window.mxAddHighlight = function (id) {
  if (!_mxHighlight.includes(id) && _mxHighlight.length < 6) _mxHighlight.push(id);
  const inp = document.getElementById('mx-decay-search'); if (inp) inp.value = '';
  const box = document.getElementById('mx-decay-results'); if (box) { box.innerHTML = ''; box.classList.remove('open'); }
  _mxRenderDecay();
};
window.mxRemoveHighlight = function (id) {
  _mxHighlight = _mxHighlight.filter(x => x !== id);
  _mxRenderDecay();
};
function _mxRenderDecay() {
  const chart = document.getElementById('mx-decay-chart'); if (chart) chart.innerHTML = _mxDecaySvg();
  const ctrls = document.getElementById('mx-decay-controls'); if (ctrls) ctrls.innerHTML = _mxDecayControls();
}

// ── 2. AGE vs PERFORMANCE ─────────────────────────────────
function _mxAgeScatterSvg(evKey) {
  const pts = [];
  Object.values(ATHLETES).forEach(a => {
    const age = (typeof ageOf === 'function') ? ageOf(a) : null;
    const sb = _mxSeasonBest(a, evKey) || _mxPr(a, evKey);
    if (age != null && sb != null) pts.push({ a, age, sb });
  });
  if (pts.length < 3) return '<p class="mx-empty">Not enough athletes with an age and a mark in this event.</p>';

  const ages = pts.map(p => p.age), secs = pts.map(p => p.sb);
  let aMin = Math.min(...ages) - 1, aMax = Math.max(...ages) + 1;
  let sMin = Math.min(...secs), sMax = Math.max(...secs);
  const sp = (sMax - sMin) * 0.08 || 2; sMin -= sp; sMax += sp;

  const px = v => _mxX(v, aMin, aMax);
  const py = v => _mxY(v, sMin, sMax);  // faster (lower secs) → higher

  const gridY = [];
  for (let i = 0; i <= 5; i++) {
    const s = sMin + (sMax - sMin) * i / 5, y = py(s);
    gridY.push(`<line class="mx-grid" x1="${_MX_PAD.l}" y1="${y.toFixed(1)}" x2="${_MX_W - _MX_PAD.r}" y2="${y.toFixed(1)}"/>
      <text class="mx-axl" x="${_MX_PAD.l - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${_mxClock(s)}</text>`);
  }
  const gridX = [];
  for (let ageT = Math.ceil(aMin); ageT <= Math.floor(aMax); ageT += 2) {
    const x = px(ageT);
    gridX.push(`<text class="mx-axl" x="${x.toFixed(1)}" y="${_MX_H - _MX_PAD.b + 18}" text-anchor="middle">${ageT}</text>`);
  }
  const dots = pts.map(p =>
    `<circle class="mx-dot" cx="${px(p.age).toFixed(1)}" cy="${py(p.sb).toFixed(1)}" r="5"
       data-tip="${_mxEsc(`${p.a.name} · age ${p.age} · ${_mxClock(p.sb)}`)}"
       onclick="openAthleteCard('${p.a.id}', null)"></circle>`
  ).join('');

  return `<svg viewBox="0 0 ${_MX_W} ${_MX_H}" class="mx-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Age versus performance">
    <text class="mx-axtitle" x="16" y="${_MX_H / 2}" transform="rotate(-90 16 ${_MX_H / 2})" text-anchor="middle">Best time</text>
    <text class="mx-axtitle" x="${_MX_W / 2}" y="${_MX_H - 6}" text-anchor="middle">Age</text>
    ${gridY.join('')}${gridX.join('')}${dots}
  </svg>`;
}

// ── 3. SEASON PROGRESSION ─────────────────────────────────
// The average of the season's N fastest marks each year — shows how the
// depth of the event (not just the single record) has progressed.
function _mxProgressionSvg(evKey) {
  const target = _mxNorm(evKey);
  const timesByYear = {};   // year → sorted array of best-per-athlete times
  Object.values(ATHLETES).forEach(a => {
    const bestIn = arr => {
      let best = null;
      (arr || []).forEach(r => {
        if (_mxNorm(r.event) !== target) return;
        const s = _mxSec(r.time);
        if (s != null && (best == null || s < best)) best = s;
      });
      return best;
    };
    const push = (year, sec) => { if (sec != null) (timesByYear[year] = timesByYear[year] || []).push(sec); };
    push('2026', bestIn(a.results));
    Object.entries(a.resultsHistory || {}).forEach(([y, arr]) => push(y, bestIn(arr)));
  });

  const N = _mxProgN;
  const byYear = {};   // year → average of top N
  Object.entries(timesByYear).forEach(([y, arr]) => {
    const top = arr.sort((x, z) => x - z).slice(0, N);
    if (top.length) byYear[y] = { avg: top.reduce((s, v) => s + v, 0) / top.length, n: top.length };
  });
  const years = Object.keys(byYear).map(Number).sort((x, y) => x - y);
  if (years.length < 2) return '<p class="mx-empty">Not enough seasons of data for this event yet.</p>';

  const yMin = years[0], yMax = years[years.length - 1];
  let sMin = Math.min(...years.map(y => byYear[y].avg)), sMax = Math.max(...years.map(y => byYear[y].avg));
  const sp = (sMax - sMin) * 0.12 || 2; sMin -= sp; sMax += sp;

  const px = v => _mxX(v, yMin, yMax);
  const py = v => _mxY(v, sMin, sMax);

  const gridY = [];
  for (let i = 0; i <= 5; i++) {
    const s = sMin + (sMax - sMin) * i / 5, y = py(s);
    gridY.push(`<line class="mx-grid" x1="${_MX_PAD.l}" y1="${y.toFixed(1)}" x2="${_MX_W - _MX_PAD.r}" y2="${y.toFixed(1)}"/>
      <text class="mx-axl" x="${_MX_PAD.l - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${_mxClock(s)}</text>`);
  }
  const gridX = years.map(y => `<text class="mx-axl" x="${px(y).toFixed(1)}" y="${_MX_H - _MX_PAD.b + 18}" text-anchor="middle">${y}</text>`).join('');
  const path = 'M' + years.map(y => `${px(y).toFixed(1)} ${py(byYear[y].avg).toFixed(1)}`).join(' L');
  const dots = years.map(y => {
    const d = byYear[y];
    const tip = `${y} · avg of top ${d.n} · ${_mxClock(d.avg)}`;
    return `<circle class="mx-dot mx-dot--line mx-dot--hit" cx="${px(y).toFixed(1)}" cy="${py(d.avg).toFixed(1)}" r="5" data-tip="${_mxEsc(tip)}"/>`;
  }).join('');

  return `<svg viewBox="0 0 ${_MX_W} ${_MX_H}" class="mx-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Season progression">
    <text class="mx-axtitle" x="16" y="${_MX_H / 2}" transform="rotate(-90 16 ${_MX_H / 2})" text-anchor="middle">Top-${N} avg time</text>
    ${gridY.join('')}${gridX}
    <path class="mx-line" d="${path}"/>${dots}
  </svg>`;
}

window.mxSetProgN = function (n) {
  _mxProgN = n;
  document.querySelectorAll('.mx-progn-btn').forEach(b => b.classList.toggle('active', +b.dataset.n === n));
  const el = document.getElementById('mx-prog-chart'); if (el) el.innerHTML = _mxProgressionSvg(_mxEvent);
};

window.mxSetMode = function (mode) {
  _mxMode = mode;
  document.querySelectorAll('.mx-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const chart = document.getElementById('mx-decay-chart'); if (chart) chart.innerHTML = _mxDecaySvg();
};

// ── page + event selector ─────────────────────────────────
window.mxSetEvent = function (ev) {
  _mxEvent = ev;
  const ageEl = document.getElementById('mx-age-chart'); if (ageEl) ageEl.innerHTML = _mxAgeScatterSvg(_mxEvent);
  const progEl = document.getElementById('mx-prog-chart'); if (progEl) progEl.innerHTML = _mxProgressionSvg(_mxEvent);
  document.querySelectorAll('.mx-event-label').forEach(el => { el.textContent = _mxEvent; });
};

function buildMetricsPage() {
  const main = qs('#main');
  if (!main) return;
  _mxEvent = '5000m';
  _mxHighlight = [];
  // Seed the decay chart with a few strong multi-distance athletes
  Object.values(ATHLETES)
    .map(a => ({ a, n: _mxDecayPoints(a).length }))
    .filter(o => o.n >= 3)
    .sort((x, y) => y.n - x.n)
    .slice(0, 3)
    .forEach(o => _mxHighlight.push(o.a.id));

  const eventDropdown = (typeof styledDropdown === 'function')
    ? styledDropdown({ value: _mxEvent, onChange: 'mxSetEvent', minWidth: '130px', options: MX_EVENTS.map(e => ({ value: e.key, label: e.label })) })
    : '';

  main.innerHTML = `
    <div class="container mx-page">
      <header class="page-hero">
        <div class="page-hero-inner">
          <div>
            <div class="page-hero-eyebrow">Deep Dive</div>
            <h1 class="page-hero-title">Advanced Metrics</h1>
            <p class="page-hero-sub">Aerobic decay across distances, the age curve of the event, and how the sport's leading times have progressed.</p>
          </div>
        </div>
      </header>

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">Aerobic Decay</h2>
          <div class="mx-mode-toggle">
            <button class="mx-mode-btn active" data-mode="pace" onclick="mxSetMode('pace')">Pace</button>
            <button class="mx-mode-btn" data-mode="rel" onclick="mxSetMode('rel')">Relative to best</button>
          </div>
        </div>
        <p class="mx-note mx-note--sub">${'Pace vs distance across the field. Add athletes to compare their decay curves — flatter = better endurance retention.'}</p>
        <div id="mx-decay-chart" class="mx-chart">${_mxDecaySvg()}</div>
        <div id="mx-decay-controls">${_mxDecayControls()}</div>
      </section>

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">Age vs Performance &middot; <span class="mx-event-label">${_mxEvent}</span></h2>
          ${eventDropdown}
        </div>
        <div id="mx-age-chart" class="mx-chart">${_mxAgeScatterSvg(_mxEvent)}</div>
        <p class="mx-note">Each dot is an athlete's best mark plotted against their age. Click a dot to open the profile.</p>
      </section>

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">Season Progression &middot; <span class="mx-event-label">${_mxEvent}</span></h2>
          <div class="mx-mode-toggle">
            <button class="mx-progn-btn mx-mode-btn" data-n="5" onclick="mxSetProgN(5)">Top 5</button>
            <button class="mx-progn-btn mx-mode-btn active" data-n="10" onclick="mxSetProgN(10)">Top 10</button>
            <button class="mx-progn-btn mx-mode-btn" data-n="25" onclick="mxSetProgN(25)">Top 25</button>
          </div>
        </div>
        <div id="mx-prog-chart" class="mx-chart">${_mxProgressionSvg(_mxEvent)}</div>
        <p class="mx-note">The average of each season's fastest marks — a measure of the event's depth over time.</p>
      </section>
      <div id="mx-tooltip" class="mx-tooltip"></div>
    </div>`;

  // Close the decay search dropdown on outside click
  if (!window._mxOutsideBound) {
    window._mxOutsideBound = true;
    document.addEventListener('click', e => {
      if (!e.target.closest('.mx-search-wrap')) {
        document.querySelectorAll('.mx-search-results.open').forEach(b => b.classList.remove('open'));
      }
    });
  }

  // Hover tooltips for chart dots (delegated so it survives chart re-renders)
  const page = main.querySelector('.mx-page');
  if (page && !page._mxTipBound) {
    page._mxTipBound = true;
    page.addEventListener('mousemove', e => {
      const tip = document.getElementById('mx-tooltip'); if (!tip) return;
      const el = e.target.closest('[data-tip]');
      if (!el) { tip.classList.remove('show'); return; }
      tip.textContent = el.getAttribute('data-tip');
      tip.classList.add('show');
      const pad = 14;
      let x = e.clientX + pad, y = e.clientY + pad;
      const r = tip.getBoundingClientRect();
      if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
      if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    page.addEventListener('mouseleave', () => {
      const tip = document.getElementById('mx-tooltip'); if (tip) tip.classList.remove('show');
    });
  }
}

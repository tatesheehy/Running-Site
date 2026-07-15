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
const _mxOrd = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const _MX_PALETTE = ['#2563EB', '#DB2777', '#16A34A', '#CA8A04', '#9333EA', '#EA580C'];

let _mxAgeEvent = '5000m';     // event for the Age vs Performance chart
let _mxProgEvent = '5000m';    // event for the Season Progression chart
let _mxHighlight = [];         // athlete ids highlighted on the decay chart
let _mxMode = 'pace';          // 'pace' (absolute) | 'rel' (relative to own best)
let _mxProgN = 25;             // season progression: average of the top N times
const _MX_PROGN_OPTS = [10, 25, 50, 100];

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
const _MX_W = 760, _MX_H = 400, _MX_PAD = { t: 34, r: 30, b: 50, l: 60 };
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
  const W = 900, H = 520, PAD = { t: 38, r: 34, b: 52, l: 64 };
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
    <text class="mx-axcap" x="8" y="18">${rel ? '% slower than own best' : 'Pace per km'}</text>
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

// ── STRENGTHS RADAR ───────────────────────────────────────
// A spider chart with one spoke per event. Each athlete's distance from the
// centre is their percentile in that event, so reaching the rim means they're
// among the fastest in the field. Overlay two athletes to see where each is
// stronger — a middle-distance shape leans one way, a distance shape the other.
let _mxRadarA = null, _mxRadarB = null;

// Percentile of every athlete in one event (fastest = 100, slowest = 0).
function _mxEventPct(evKey) {
  const rows = [];
  Object.values(ATHLETES).forEach(a => { const s = _mxPr(a, evKey); if (s != null) rows.push({ id: a.id, sec: s }); });
  rows.sort((x, y) => x.sec - y.sec);
  const n = rows.length, pct = {};
  rows.forEach((o, i) => { pct[o.id] = n > 1 ? (1 - i / (n - 1)) * 100 : 100; });
  return pct;
}

function _mxRadarSvg(idA, idB) {
  const A = ATHLETES[idA], B = ATHLETES[idB];
  if (!A && !B) return '<p class="mx-empty">Pick two athletes to compare.</p>';
  const evs = MX_EVENTS;
  const pctByEv = evs.map(ev => ({ ev, pct: _mxEventPct(ev.key) }));

  const W = 640, H = 560, cx = W / 2, cy = 288, R = 178, n = evs.length;
  const ang = i => (-90 + i * 360 / n) * Math.PI / 180;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * (v / 100), cy + Math.sin(ang(i)) * R * (v / 100)];

  const rings = [20, 40, 60, 80, 100].map(r =>
    `<path class="mx-radar-grid" d="M${evs.map((_, i) => { const [x, y] = pt(i, r); return `${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' L')} Z"/>`).join('');
  const spokes = evs.map((_, i) => { const [x, y] = pt(i, 100); return `<line class="mx-radar-grid" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const labels = evs.map((ev, i) => {
    const [x, y] = pt(i, 118), a = ang(i);
    const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
    return `<text class="mx-radar-lbl" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}">${ev.label}</text>`;
  }).join('');

  const shape = (a, color, dashed) => {
    if (!a) return '';
    const pts = pctByEv.map(({ ev, pct }, i) => ({ i, ev, v: pct[a.id] || 0 }));
    const d = 'M' + pts.map(p => { const [x, y] = pt(p.i, p.v); return `${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' L') + ' Z';
    const dots = pts.map(p => {
      const [x, y] = pt(p.i, p.v), pr = _mxPr(a, p.ev.key);
      const tip = `${a.name} · ${p.ev.label} · ${pr ? _mxClock(pr) : 'no mark'} · ${_mxOrd(Math.round(p.v))} percentile`;
      return `<circle class="mx-radar-vtx mx-dot--hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${color}" data-tip="${_mxEsc(tip)}"/>`;
    }).join('');
    return `<path class="mx-radar-shape${dashed ? ' mx-radar-shape--b' : ''}" style="stroke:${color};fill:${color}" d="${d}"/>${dots}`;
  };

  return `<svg viewBox="0 0 ${W} ${H}" class="mx-svg mx-svg--radar" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Strengths radar">
    ${rings}${spokes}${labels}
    ${shape(A, _MX_PALETTE[0], false)}
    ${shape(B, '#EA580C', true)}
  </svg>`;
}

function _mxRadarPicker(slot, id, color) {
  const a = ATHLETES[id];
  return `<div class="mx-radar-slot" style="--c:${color}">
    <span class="mx-radar-dot"></span>
    <div class="mx-search-wrap">
      <input class="mx-search" id="mx-radar-search-${slot}" placeholder="Choose athlete ${slot.toUpperCase()}…" value="${a ? _mxEsc(a.name) : ''}" autocomplete="off"
        oninput="mxRadarSearch('${slot}', this.value)" onfocus="mxRadarSearch('${slot}', this.value)">
      <div class="mx-search-results" id="mx-radar-results-${slot}"></div>
    </div>
  </div>`;
}
function _mxRadarControls() {
  return `<div class="mx-radar-pickers">
    ${_mxRadarPicker('a', _mxRadarA, _MX_PALETTE[0])}
    <span class="mx-radar-vs">vs</span>
    ${_mxRadarPicker('b', _mxRadarB, '#EA580C')}
  </div>`;
}
window.mxRadarSearch = function (slot, q) {
  const box = document.getElementById('mx-radar-results-' + slot);
  if (!box) return;
  q = (q || '').trim().toLowerCase();
  const other = slot === 'a' ? _mxRadarB : _mxRadarA;
  const hits = Object.values(ATHLETES)
    .filter(a => a.name.toLowerCase().includes(q) && a.id !== other && MX_EVENTS.reduce((n, e) => n + (_mxPr(a, e.key) != null ? 1 : 0), 0) >= 2)
    .slice(0, 6);
  box.innerHTML = hits.map(a => `<div class="mx-search-opt" onclick="mxRadarPick('${slot}','${a.id}')">${renderFlag(a.flag)} ${a.name}</div>`).join('')
    || '<div class="mx-search-opt mx-search-opt--empty">No athletes with two or more event marks</div>';
  box.classList.add('open');
};
window.mxRadarPick = function (slot, id) {
  if (slot === 'a') _mxRadarA = id; else _mxRadarB = id;
  const inp = document.getElementById('mx-radar-search-' + slot); if (inp) inp.value = ATHLETES[id] ? ATHLETES[id].name : '';
  const box = document.getElementById('mx-radar-results-' + slot); if (box) box.classList.remove('open');
  const chart = document.getElementById('mx-radar-chart'); if (chart) chart.innerHTML = _mxRadarSvg(_mxRadarA, _mxRadarB);
};

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
    <text class="mx-axcap" x="8" y="16">Best time</text>
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
    <text class="mx-axcap" x="8" y="16">Top-${N} average time</text>
    ${gridY.join('')}${gridX}
    <path class="mx-line" d="${path}"/>${dots}
  </svg>`;
}

window.mxSetProgN = function (n) {
  _mxProgN = n;
  document.querySelectorAll('.mx-progn-btn').forEach(b => b.classList.toggle('active', +b.dataset.n === n));
  const el = document.getElementById('mx-prog-chart'); if (el) el.innerHTML = _mxProgressionSvg(_mxProgEvent);
};

window.mxSetMode = function (mode) {
  _mxMode = mode;
  document.querySelectorAll('.mx-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const chart = document.getElementById('mx-decay-chart'); if (chart) chart.innerHTML = _mxDecaySvg();
};

// ── per-chart event selectors ─────────────────────────────
window.mxSetAgeEvent = function (ev) {
  _mxAgeEvent = ev;
  const el = document.getElementById('mx-age-chart'); if (el) el.innerHTML = _mxAgeScatterSvg(ev);
  const lbl = document.getElementById('mx-age-label'); if (lbl) lbl.textContent = ev;
};
window.mxSetProgEvent = function (ev) {
  _mxProgEvent = ev;
  const el = document.getElementById('mx-prog-chart'); if (el) el.innerHTML = _mxProgressionSvg(ev);
  const lbl = document.getElementById('mx-prog-label'); if (lbl) lbl.textContent = ev;
};

function buildMetricsPage() {
  const main = qs('#main');
  if (!main) return;
  _mxAgeEvent = '5000m';
  _mxProgEvent = '5000m';
  _mxProgN = 25;
  _mxMode = 'pace';
  _mxHighlight = [];    // start empty — the user adds athletes to compare
  _mxRadarA = null;
  _mxRadarB = null;

  // Deep-link from the homepage tool cards: ?a=<id>&b=<id> pre-loads both the
  // Strength Hexagon and the Aerobic Decay comparison with the same pair.
  const _pa = typeof getParam === 'function' ? getParam('a') : null;
  const _pb = typeof getParam === 'function' ? getParam('b') : null;
  if (_pa && _pb && ATHLETES[_pa] && ATHLETES[_pb]) {
    _mxRadarA = _pa; _mxRadarB = _pb;
    _mxHighlight = [_pa, _pb];
  }

  // Top-of-page stat strip — same component as Event Tracker / H2H / Athletes.
  const _mxAll = Object.values(ATHLETES);
  const _mxAnalyzed = _mxAll.filter(a => MX_EVENTS.reduce((n, e) => n + (_mxPr(a, e.key) != null ? 1 : 0), 0) >= 3).length;
  const _mxDataPoints = _mxAll.reduce((n, a) => n + MX_EVENTS.reduce((m, e) => m + (_mxPr(a, e.key) != null ? 1 : 0), 0), 0);
  const _mxStatsHtml = `
    <div class="h2h-stats-strip">
      <div class="h2h-stat">
        <span class="h2h-stat-n">${_mxAnalyzed}</span>
        <span class="h2h-stat-l">Athletes analyzed</span>
      </div>
      <div class="h2h-stat-div"></div>
      <div class="h2h-stat">
        <span class="h2h-stat-n">${MX_EVENTS.length}</span>
        <span class="h2h-stat-l">Events compared</span>
      </div>
      <div class="h2h-stat-div"></div>
      <div class="h2h-stat">
        <span class="h2h-stat-n">${_mxDataPoints}</span>
        <span class="h2h-stat-l">Personal bests charted</span>
      </div>
    </div>`;

  const eventOpts = MX_EVENTS.map(e => ({ value: e.key, label: e.label }));
  const ageDropdown = (typeof styledDropdown === 'function')
    ? styledDropdown({ value: _mxAgeEvent, onChange: 'mxSetAgeEvent', minWidth: '130px', options: eventOpts }) : '';
  const progDropdown = (typeof styledDropdown === 'function')
    ? styledDropdown({ value: _mxProgEvent, onChange: 'mxSetProgEvent', minWidth: '130px', options: eventOpts }) : '';
  const prognBtns = _MX_PROGN_OPTS.map(n =>
    `<button class="mx-progn-btn mx-mode-btn${n === _mxProgN ? ' active' : ''}" data-n="${n}" onclick="mxSetProgN(${n})">Top ${n}</button>`).join('');

  const how = (title, body) => `
    <details class="mx-how">
      <summary><svg class="mx-how-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>How does this tool work?</summary>
      <div class="mx-how-body">${body}</div>
    </details>`;

  main.innerHTML = `
    <div class="container mx-page">
      <header class="page-hero">
        <div class="page-hero-inner">
          <div>
            <div class="page-hero-eyebrow">Deep Dive</div>
            <h1 class="page-hero-title">Advanced Metrics</h1>
            <p class="page-hero-sub">Ways to look past the leaderboard: how runners fade as races get longer, where two athletes' strengths cross over, when athletes tend to peak, and how the depth of each event has shifted season to season.</p>
          </div>
        </div>
      </header>

      ${_mxStatsHtml}

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">Aerobic Decay</h2>
          <div class="mx-mode-toggle">
            <button class="mx-mode-btn active" data-mode="pace" onclick="mxSetMode('pace')">Pace</button>
            <button class="mx-mode-btn" data-mode="rel" onclick="mxSetMode('rel')">Relative to best</button>
          </div>
        </div>
        <div id="mx-decay-chart" class="mx-chart">${_mxDecaySvg()}</div>
        <div id="mx-decay-controls">${_mxDecayControls()}</div>
        ${how('decay', 'We take each athlete\'s personal best at every distance and convert it into pace per kilometre. Longer races are run slower, so the line naturally climbs from left to right. Distance is drawn on a log scale so the events sit at even spacing. In "Relative to best" mode each curve is divided by that athlete\'s own fastest pace, so everyone starts at plus 0 percent. That removes raw speed from the picture and lets you compare the shape of the decline, a 1500m specialist and a 10,000m specialist side by side.')}
      </section>

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">Strength Hexagon</h2>
        </div>
        <div id="mx-radar-controls">${_mxRadarControls()}</div>
        <div id="mx-radar-chart" class="mx-chart">${_mxRadarSvg(_mxRadarA, _mxRadarB)}</div>
        ${how('radar', 'Each spoke is an event. An athlete\'s distance from the centre is their percentile in that event, so touching the outer rim means they rank among the fastest in the field, while sitting near the middle means they either do not race it or rank lower. Percentiles come from personal bests across everyone who owns a mark in that event. Laying two athletes on top of each other shows at a glance where each one is stronger and where their profiles cross over.')}
      </section>

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">Age vs Performance &middot; <span id="mx-age-label" class="mx-event-label">${_mxAgeEvent}</span></h2>
          ${ageDropdown}
        </div>
        <div id="mx-age-chart" class="mx-chart">${_mxAgeScatterSvg(_mxAgeEvent)}</div>
        ${how('age', 'For every athlete we pull their season best in the selected event, or their lifetime best if they have not raced it this year, along with their current age. Each point is one athlete. Faster times sit higher on the chart, so the lowest cluster of dots marks the age band where runners tend to be at their best for that distance.')}
      </section>

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">Season Progression &middot; <span id="mx-prog-label" class="mx-event-label">${_mxProgEvent}</span></h2>
          ${progDropdown}
        </div>
        <div class="mx-progn-row">
          <span class="mx-progn-lbl">Sample size</span>
          <div class="mx-mode-toggle">${prognBtns}</div>
        </div>
        <div id="mx-prog-chart" class="mx-chart">${_mxProgressionSvg(_mxProgEvent)}</div>
        ${how('prog', 'For each season we find every athlete\'s best time in the event, sort them fastest to slowest, keep the fastest N, and average those. A small sample follows the very front of the field, while a larger one reaches into its depth. A line that keeps dropping means the event is getting deeper, more athletes running fast, while a flat or rising line means the depth has held steady or thinned out.')}
      </section>
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

  // Tooltip lives on <body>, not inside #main — #main keeps a transform from
  // its fade-in animation, which would otherwise make position:fixed resolve
  // against #main (offset by the sidebar) instead of the viewport.
  let tip = document.getElementById('mx-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'mx-tooltip';
    tip.className = 'mx-tooltip';
    document.body.appendChild(tip);
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

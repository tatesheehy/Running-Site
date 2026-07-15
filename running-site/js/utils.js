// ============================================================
//  UTILS — pure helpers
// ============================================================

function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }
function getParam(name) { return new URLSearchParams(window.location.search).get(name); }
function goTo(url) { window.location.href = url; }
window.goTo = goTo;

// ── AUTO-LINK ATHLETE NAMES IN PROSE ─────────────────────────
// Walks a rendered container (e.g. an article body) and wraps any exact,
// full-name mentions of a tracked athlete in a clickable span that opens
// their card — so names referenced in article prose are navigable too,
// not just names rendered from structured data (tables/rows/cards).
// Text inside existing links/buttons/scripts/inputs is left alone.
let _linkNamesRegex = null;
function _buildAthleteNameRegex() {
  if (_linkNamesRegex || typeof ATHLETES === 'undefined') return _linkNamesRegex;
  const names = Object.values(ATHLETES)
    .filter(a => a.name && a.name.trim().length > 2)
    .sort((a, b) => b.name.length - a.name.length); // longest first avoids partial-shadowing
  if (!names.length) return null;
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = names.map(a => escape(a.name)).join('|');
  _linkNamesRegex = { re: new RegExp(`\\b(${pattern})\\b`, 'g'), byName: Object.fromEntries(names.map(a => [a.name, a.id])) };
  return _linkNamesRegex;
}

function linkAthleteNamesIn(container) {
  if (!container) return;
  const built = _buildAthleteNameRegex();
  if (!built) return;
  const { re, byName } = built;
  const SKIP_TAGS = new Set(['A', 'BUTTON', 'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT']);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let el = node.parentElement;
      while (el && el !== container) {
        if (SKIP_TAGS.has(el.tagName) || el.classList.contains('in-text-athlete-link')) return NodeFilter.FILTER_REJECT;
        el = el.parentElement;
      }
      return re.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n);

  targets.forEach(node => {
    re.lastIndex = 0;
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement('span');
      span.className = 'in-text-athlete-link';
      span.textContent = m[1];
      span.setAttribute('role', 'button');
      span.setAttribute('tabindex', '0');
      span.onclick = () => openAthleteCard(byName[m[1]], null);
      frag.appendChild(span);
      last = re.lastIndex;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });
}

// ── RECENTLY VIEWED ATHLETES (localStorage, most-recent first) ──
const _RECENT_KEY = 'stattc_recent_athletes';
const _RECENT_MAX = 12;

function getRecentAthleteIds() {
  try { return JSON.parse(localStorage.getItem(_RECENT_KEY)) || []; }
  catch (e) { return []; }
}

// Record a viewed athlete: move/insert to the front, cap the list.
function recordRecentAthlete(id) {
  if (!id) return;
  try {
    const list = getRecentAthleteIds().filter(x => x !== id);
    list.unshift(id);
    localStorage.setItem(_RECENT_KEY, JSON.stringify(list.slice(0, _RECENT_MAX)));
  } catch (e) { /* storage unavailable */ }
}

// Resolve to athlete objects that still exist, optionally excluding one id.
function getRecentAthletes(excludeId) {
  if (typeof ATHLETES === 'undefined') return [];
  return getRecentAthleteIds()
    .filter(id => id !== excludeId && ATHLETES[id])
    .map(id => ATHLETES[id]);
}

// Horizontal "Recently Viewed" strip of athlete chips. Returns '' when there
// aren't enough. opts: { excludeId, limit, min }
function renderRecentlyViewed(opts) {
  opts = opts || {};
  const list = getRecentAthletes(opts.excludeId).slice(0, opts.limit || 12);
  if (list.length < (opts.min || 1)) return '';
  const cards = list.map(a => `
    <button class="rv-card" onclick="openAthleteCard('${a.id}', null)">
      <span class="rv-photo" style="background-color:${a.photoBackground || '#111'};background-image:url('${a.photo || '/images/default_card.png'}')"></span>
      <span class="rv-name">${a.name}</span>
      <span class="rv-country">${renderFlag(a.flag)} ${a.country || ''}</span>
    </button>`).join('');
  return `
    <section class="rv-section">
      <div class="rv-head">
        <span class="rv-title">Recently Viewed</span>
        <button class="rv-clear" onclick="clearRecentAthletes()">Clear</button>
      </div>
      <div class="rv-strip">${cards}</div>
    </section>`;
}

window.clearRecentAthletes = function () {
  try { localStorage.removeItem(_RECENT_KEY); } catch (e) { /* ignore */ }
  document.querySelectorAll('.rv-section').forEach(s => s.remove());
};

function calcAgeFromDob(dob) {
  const born  = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
  return age;
}

// Convert flat athlete structure (from JSON/CMS) to the format the card expects
function normalizeAthlete(a) {
  const age = a.dob ? String(calcAgeFromDob(a.dob)) : a.age;
  return {
    ...a,
    vitals: {
      AGE: age,
    },
    prs: (a.prs || []),
    extra: {},
    headline: { keyWord: a.headlineKey, rest: a.headlineRest },
    analysis: {
      reviewTitle: a.reviewTitle,
      reviewBody: a.reviewBody,
      questionTitle: a.questionTitle,
      questionBody: a.questionBody,
    },
  };
}

// ── PERSONAL BEST SELECTION ───────────────────────────────
// Recognizable distances first, roughly in order of prestige/familiarity.
const _PR_PRIORITY = ['60m', '100m', '200m', '400m', '600m', '800m', '1000m', '1500m', 'mile', '2000m', '3000m', '3000m steeplechase', '5000m', '10000m', 'half marathon', 'marathon'];

// Normalize an event label for DISPLAY: "1500 Metres" / "1500 m" → "1500m"
// (whole-word "metres"/"meters" only, so "Kilometres" is left alone).
function fmtEventLabel(event) {
  if (!event) return '';
  return String(event)
    .replace(/\bmet(er|re)s\b/gi, 'm')  // Metres / Meters → m
    .replace(/(\d)\s+m\b/gi, '$1m');    // "1500 m" → "1500m"
}

// "1500 Metres Short Track" and "1500m" are the same distance run indoors vs
// outdoors — collapse them to one canonical key so they dedupe correctly.
function _prCanonicalKey(event) {
  let s = String(event || '').trim().replace(/\s*short track$/i, '').trim();
  const m = s.match(/^(\d+)\s*(metres|meters)$/i);
  return m ? `${m[1]}m` : s.toLowerCase();
}

// Dedupes indoor/outdoor variants of the same distance (keeping the faster
// time), then surfaces the most recognizable distances first.
function pickTopPRs(prs, limit) {
  limit = limit || 4;
  const byKey = new Map();
  (prs || []).forEach(pr => {
    const key = _prCanonicalKey(pr.event);
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, pr); return; }
    const t1 = parseTimeToSecs(pr.time);
    const t2 = parseTimeToSecs(existing.time);
    if (t1 != null && (t2 == null || t1 < t2)) byKey.set(key, pr);
  });
  return [...byKey.values()].sort((a, b) => {
    const ia = _PR_PRIORITY.indexOf(_prCanonicalKey(a.event));
    const ib = _PR_PRIORITY.indexOf(_prCanonicalKey(b.event));
    return (ia === -1 ? _PR_PRIORITY.length : ia) - (ib === -1 ? _PR_PRIORITY.length : ib);
  }).slice(0, limit);
}

function buildMomentumHtml(val) {
  if (val == null || val === '') return '<div class="rd-momentum-col"></div>';
  const v   = Math.max(-10, Math.min(10, Number(val)));
  const pct = ((v + 10) / 20) * 100;
  const str = (v > 0 ? '+' : '') + v;
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu';
  return `
    <div class="rd-momentum-col">
      <div class="rd-momentum">
        <div class="rd-momentum-bar">
          <div class="rd-momentum-marker" style="left:${pct}%"></div>
        </div>
        <span class="rd-momentum-val ${cls}">${str}</span>
      </div>
    </div>`;
}

// ── CROP HELPERS ──────────────────────────────────────────
// Parse new-format crop string "x:20,y:10,w:60,h:40,ar:1.5"
function parseCropStr(str) {
  if (!str) return null;
  const m = String(str).match(/x:([\d.]+),y:([\d.]+),w:([\d.]+),h:([\d.]+),ar:([\d.]+)/);
  if (!m) return null;
  return { x: +m[1], y: +m[2], w: +m[3], h: +m[4], ar: +m[5] };
}

// Returns inline style for absolutely-positioned crop image
function cropImgStyle(crop, containerAR) {
  const { x, y, w, ar: iAR } = crop;
  const imgWidthPct = (10000 / w).toFixed(2);
  const imgLeftPct = (-(x / w) * 100).toFixed(2);
  const imgTopPct = (-(y * containerAR * 100) / (w * iAR)).toFixed(2);
  return `width:${imgWidthPct}%;height:auto;left:${imgLeftPct}%;top:${imgTopPct}%;`;
}

// Render an image with optional precision crop, returning an HTML string.
function imgHTML(src, alt, cropStr, containerAR, cssClass) {
  if (!src) return `<div class="img-placeholder" style="aspect-ratio:${containerAR};"></div>`;
  const crop = parseCropStr(cropStr);
  if (crop) {
    return `<img class="cropped-img" src="${src}" alt="${alt}" loading="lazy" style="${cropImgStyle(crop, containerAR)}">`;
  }
  const pos = cropStr || 'center';
  return `<img class="${cssClass}" src="${src}" alt="${alt}" loading="lazy" style="object-position:${pos};">`;
}

// <script> tags set via innerHTML don't execute — re-create them so embeds
// (e.g. a Getty Images widget snippet) actually run.
function runScriptsIn(container) {
  if (!container) return;
  qsa('script', container).forEach(old => {
    const s = document.createElement('script');
    [...old.attributes].forEach(attr => s.setAttribute(attr.name, attr.value));
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}

// ── SIMILAR ATHLETES ──────────────────────────────────────
function timeToSecs(t) {
  if (!t || typeof t !== 'string') return null;
  const parts = t.trim().split(':');
  if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + +parts[2];
  if (parts.length === 2) return +parts[0] * 60 + +parts[1];
  return +parts[0] || null;
}

const SIMILAR_EVENTS = new Set(['800m','1500m','Mile','3000m','5000m','10000m','3000m SC','Marathon','Half Marathon']);

// World records in seconds — used to measure how specialized an athlete is in each event
const EVENT_WR = {
  '800m': 100.91, '1500m': 206.0, 'Mile': 223.13, '3000m': 440.67,
  '5000m': 755.36, '10000m': 1571.0, 'Marathon': 7121.0, 'Half Marathon': 3518.0, '3000m SC': 485.0,
};

// Log-scale distance (km) used to compute each athlete's event "center of gravity"
const EVENT_LOG_DIST = {
  '800m': Math.log(0.8), '1500m': Math.log(1.5), 'Mile': Math.log(1.61),
  '3000m': Math.log(3), '5000m': Math.log(5), '10000m': Math.log(10),
  'Marathon': Math.log(42.2), 'Half Marathon': Math.log(21.1), '3000m SC': Math.log(3),
};

function buildProfile(athlete) {
  const prs = {}, spec = {};
  (athlete.prs || []).filter(p => SIMILAR_EVENTS.has(p.event)).forEach(p => {
    const s = timeToSecs(p.time);
    if (!s) return;
    prs[p.event] = s;
    const wr = EVENT_WR[p.event];
    spec[p.event] = wr ? wr / s : 0.8; // 1.0 = world record level
  });
  // Weighted center on log-distance scale — reveals whether athlete is a miler vs marathon runner
  let tw = 0, wdist = 0;
  Object.keys(prs).forEach(ev => {
    const ld = EVENT_LOG_DIST[ev];
    if (ld != null) { wdist += ld * (spec[ev] || 0.5); tw += (spec[ev] || 0.5); }
  });
  return { prs, spec, center: tw > 0 ? wdist / tw : null };
}

function getSimilarAthletes(athlete, count = 3) {
  const A = buildProfile(athlete);
  if (!Object.keys(A.prs).length) return [];

  return Object.values(ATHLETES)
    .filter(b => b.id !== athlete.id)
    .map(b => {
      const B = buildProfile(b);
      const shared = Object.keys(A.prs).filter(ev => B.prs[ev]);
      if (!shared.length) return null;

      // Weight each shared event by how specialized BOTH athletes are in it
      // (geometric mean of spec scores) — a 1500m shared by two milers counts
      // more than a 1500m shared by a miler and a 10K runner
      let totalW = 0, weightedDiff = 0;
      shared.forEach(ev => {
        const w = Math.sqrt(A.spec[ev] * B.spec[ev]);
        weightedDiff += (Math.abs(A.prs[ev] - B.prs[ev]) / A.prs[ev]) * w;
        totalW += w;
      });
      const timeSimilarity = weightedDiff / totalW;

      // Penalty for different event centers (miler vs 10K runner)
      const centerPenalty = (A.center != null && B.center != null)
        ? Math.abs(A.center - B.center) * 0.15
        : 0;

      return { b, score: timeSimilarity + centerPenalty };
    })
    .filter(x => x && x.score < 0.08)
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(x => x.b);
}

// ── SKELETON LOADING ──────────────────────────────────────
function showSkeleton(page) {
  const main = document.getElementById('main');
  if (!main) return;
  const s = (cls) => `<div class="skel ${cls}"></div>`;
  const cards = (n, cls) => Array(n).fill(0).map(() => s(cls)).join('');

  const skels = {
    home: `
      <div class="container">
        <div class="skel-pills-row">${s('skel-pill')}${s('skel-pill')}${s('skel-pill')}</div>
      </div>
      <div class="skel-hero-wrap">${s('skel-hero')}</div>
      <div class="container">
        <div class="skel-ep-row">${cards(3, 'skel-ep-card')}</div>
        <div class="skel-grid">${cards(6, 'skel-article-card')}</div>
      </div>`,

    athletes: `
      <div class="container">
        <div class="skel-page-hdr">${s('skel-title')}${s('skel-toggle')}</div>
        <div class="skel-athlete-grid">${cards(8, 'skel-athlete-card')}</div>
      </div>`,

    rankings: `
      <div class="container">
        <div class="skel-page-hdr">${s('skel-title')}${s('skel-toggle')}</div>
        <div class="skel-rows">${cards(10, 'skel-row')}</div>
      </div>`,

    articles: `
      <div class="container">
        <div class="skel-page-hdr">${s('skel-title')}</div>
        <div class="skel-grid">${cards(8, 'skel-article-card')}</div>
      </div>`,

    article: `
      <div class="container skel-article-wrap">
        ${s('skel-article-img')}
        ${s('skel-title')}${s('skel-line skel-line--short')}
        ${s('skel-line')}${s('skel-line')}${s('skel-line skel-line--med')}
        ${s('skel-line')}${s('skel-line')}${s('skel-line skel-line--short')}
      </div>`,
  };

  if (skels[page]) main.innerHTML = `<div class="skel-page">${skels[page]}</div>`;
}

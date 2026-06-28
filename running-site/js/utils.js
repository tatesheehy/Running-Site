// ============================================================
//  UTILS — pure helpers
// ============================================================

function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }
function getParam(name) { return new URLSearchParams(window.location.search).get(name); }
function goTo(url) { window.location.href = url; }
window.goTo = goTo;

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
    extra: {
      CLUB: a.club,
      COACH: a.coach,
    },
    headline: { keyWord: a.headlineKey, rest: a.headlineRest },
    analysis: {
      reviewTitle: a.reviewTitle,
      reviewBody: a.reviewBody,
      questionTitle: a.questionTitle,
      questionBody: a.questionBody,
    },
  };
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

// ── SIMILAR ATHLETES ──────────────────────────────────────
function timeToSecs(t) {
  if (!t || typeof t !== 'string') return null;
  const parts = t.trim().split(':');
  if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + +parts[2];
  if (parts.length === 2) return +parts[0] * 60 + +parts[1];
  return +parts[0] || null;
}

const SIMILAR_EVENTS = new Set(['800m','1500m','Mile','3000m','5000m','10000m','3000m SC','Marathon','Half Marathon']);

function getSimilarAthletes(athlete, count = 3) {
  const aPrs = {};
  (athlete.prs || []).filter(p => SIMILAR_EVENTS.has(p.event)).forEach(p => {
    const s = timeToSecs(p.time);
    if (s) aPrs[p.event] = s;
  });
  if (!Object.keys(aPrs).length) return [];

  return Object.values(ATHLETES)
    .filter(b => b.id !== athlete.id)
    .map(b => {
      const bPrs = {};
      (b.prs || []).filter(p => SIMILAR_EVENTS.has(p.event)).forEach(p => {
        const s = timeToSecs(p.time);
        if (s) bPrs[p.event] = s;
      });
      const shared = Object.keys(aPrs).filter(ev => bPrs[ev]);
      if (!shared.length) return null;
      const avgDiff = shared.reduce((sum, ev) => sum + Math.abs(aPrs[ev] - bPrs[ev]) / aPrs[ev], 0) / shared.length;
      return { b, score: avgDiff };
    })
    .filter(x => x && x.score < 0.06)
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

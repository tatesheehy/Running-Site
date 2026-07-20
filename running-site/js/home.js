// ============================================================
//  HOME — buildHome() and countdown helpers
// ============================================================

function _pillForMeet(meet) {
  if (!meet || !meet.name || !meet.datetime) return '';
  const target = new Date(meet.datetime);
  const diffMs = target - Date.now();
  if (diffMs < 0 || diffMs > 60 * 24 * 3600000) return '';
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hrs  = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  let label;
  if (days > 0)       label = `${days}d ${hrs}h`;
  else if (hrs > 0)   label = `${hrs}h ${mins}m`;
  else                label = `${mins}m`;
  const style = meet.color ? ` style="background:${meet.color}"` : '';
  const content = `⏱ ${label} · ${meet.name}`;
  if (meet.url) {
    return `<a href="${meet.url}" target="_blank" rel="noopener" class="rd-countdown-pill"${style}>${content}</a>`;
  }
  return `<span class="rd-countdown-pill"${style}>${content}</span>`;
}

function buildCountdownPills() {
  const meets = (SITE && SITE.upcomingMeets) || (SITE && SITE.nextMeet ? [SITE.nextMeet] : []);
  return meets.map(_pillForMeet).filter(Boolean).join('');
}

function buildCountdownPill() {
  return buildCountdownPills();
}

// ── ARTICLE CARD HTML ──────────────────────────────────────
function articleCard(a) {
  const dest = a.type === 'rankings' ? 'rankings.html' : `article.html?id=${a.id}`;
  const img = imgHTML(a.image, a.title, a.imagePosition, 16/10, 'article-card-img');

  return `
    <article class="article-card reveal" onclick="goTo('${dest}')">
      <div class="article-card-img-wrap">
        ${img}
        <span class="cat-tag">${a.category || 'RANKINGS'}</span>
      </div>
      <h3 class="article-card-title">${a.title}</h3>
      ${a.excerpt ? `<p class="article-card-excerpt">${a.excerpt}</p>` : ''}
      <div class="meta">
        ${a.author ? `<span class="author">${a.author}</span><span class="sep">·</span>` : ''}${a.date || ''}
        ${a.readTime ? `<span class="sep">·</span>${a.readTime}` : ''}
      </div>
    </article>
  `;
}

// ── TRENDING PERFORMANCES ──────────────────────────────────
// Surfaces recent (last 30d) results that are a PB, a dominant win,
// or a podium at a major meet. Uses parseTimeToSecs (modals.js, loaded
// on every page). _normalizeEvent/_meetTier/_raceMargin are duplicated
// from h2h.js below since h2h.js itself isn't loaded on every page.
function _normalizeEvent(e) {
  return (e || '').trim().toLowerCase().replace(/\s+/g, '');
}

function _meetTier(meet) {
  const m = (meet || '').toLowerCase();
  if (/world athletics (indoor )?championships|olympic games|world championships in athletics/.test(m)) return 3;
  if (/bislett|lausanne|zurich|zürich|monaco|golden gala|golden spike|bauhaus|galan|meeting de paris|prefontaine|millrose|new balance (indoor )?grand prix|wanda diamond|diamond league|rabat|meeting international mohammed|ostrava|fbk games/.test(m)) return 2;
  return 1;
}

function _raceMargin(myTime, theirTime) {
  const t1 = parseTimeToSecs(myTime), t2 = parseTimeToSecs(theirTime);
  if (!t1 || !t2 || !isFinite(t1) || !isFinite(t2)) return null;
  const diff = Math.abs(t1 - t2);
  if (diff <= 1.50) return { label: `+${diff.toFixed(2)}`, cls: 'close' };
  const label = diff < 60 ? `+${diff.toFixed(1)}s` : `+${Math.floor(diff / 60)}:${(diff % 60).toFixed(1).padStart(4, '0')}`;
  return { label, cls: 'dominant' };
}

const _TREND_TYPE_LABELS = { pb: 'PERSONAL BEST', dominant: 'DOMINANT WIN', prominent: 'MAJOR MEET' };

// Per-event accent colors for the Recent Activity list's left bar — lets you
// tell events apart at a glance without reading the text. Falls back to a
// neutral gray for anything not in the common-events list (field events,
// relays, road distances, etc).
const _EVENT_ACCENT = {
  '800m': '#2563EB', '1500m': '#9333EA', 'mile': '#9333EA', '3000m': '#0EA5E9',
  '5000m': '#16A34A', '10000m': '#CA8A04', 'steeplechase': '#0D9488',
  '400m': '#DB2777', '200m': '#DB2777', '100m': '#DB2777',
};
function _eventAccentColor(eventStr) {
  const key = _normalizeEvent(eventStr);
  for (const k in _EVENT_ACCENT) if (key.includes(k)) return _EVENT_ACCENT[k];
  return '#B0B0B8';
}

function _trendParseDate(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(`${dateStr} ${new Date().getFullYear()}`);
  return isNaN(d) ? 0 : d.getTime();
}

function _isPbResult(athlete, result) {
  const secs = parseTimeToSecs(result.time);
  if (secs == null) return false;
  const ev = _normalizeEvent(result.event);
  const pr = (athlete.prs || []).find(p => _normalizeEvent(p.event) === ev);
  if (!pr) return false;
  const prSecs = parseTimeToSecs(pr.time);
  if (prSecs == null) return false;
  return secs <= prSecs + 0.005;
}

function _buildTrendingPerformances(limit = 4, eventFilter = null) {
  const all = Object.values(ATHLETES);
  const cutoff = Date.now() - 30 * 86400000;

  // Group same-race finishers so we can compute winning margins
  const groups = {};
  all.forEach(a => {
    (a.results || []).forEach(r => {
      if (!r.meet || !r.event || !r.time) return;
      const key = `${_normalizeEvent(r.event)}|${r.meet.trim().toLowerCase()}|${r.round || ''}`;
      (groups[key] = groups[key] || []).push({ athlete: a, result: r });
    });
  });

  const candidates = [];
  all.forEach(a => {
    (a.results || []).forEach(r => {
      const ts = _trendParseDate(r.date);
      if (ts < cutoff) return;
      if (parseTimeToSecs(r.time) == null) return;
      if (eventFilter && typeof _h2hEventMatches === 'function' && !_h2hEventMatches(r.event, eventFilter)) return;
      const place = parseInt(r.place, 10);

      const isPB = _isPbResult(a, r);

      let isDominant = false, marginLabel = '';
      if (place === 1) {
        const key = `${_normalizeEvent(r.event)}|${r.meet.trim().toLowerCase()}|${r.round || ''}`;
        const others = (groups[key] || []).filter(e => e.athlete !== a && parseTimeToSecs(e.result.time) != null);
        const nextBest = others.reduce((best, e) =>
          (!best || parseTimeToSecs(e.result.time) < parseTimeToSecs(best.result.time)) ? e : best, null);
        if (nextBest) {
          const margin = _raceMargin(r.time, nextBest.result.time);
          if (margin && margin.cls === 'dominant') { isDominant = true; marginLabel = margin.label; }
        }
      }

      const tier = _meetTier(r.meet);
      const isProminent = tier >= 2 && place >= 1 && place <= 3;

      if (!isPB && !isDominant && !isProminent) return;

      const score = (isPB ? 3 : 0) + (isDominant ? 2 : 0) + (isProminent ? (tier === 3 ? 2 : 1) : 0);
      candidates.push({ athlete: a, result: r, isPB, isDominant, isProminent, tier, marginLabel, score, ts });
    });
  });

  // Keep only the best-scoring result per athlete so the row stays diverse
  const byAthlete = {};
  candidates.forEach(c => {
    const cur = byAthlete[c.athlete.id];
    if (!cur || c.score > cur.score || (c.score === cur.score && c.ts > cur.ts)) byAthlete[c.athlete.id] = c;
  });

  return Object.values(byAthlete)
    .sort((x, y) => y.ts - x.ts || y.score - x.score)
    .slice(0, limit);
}

function _trendTypeTag(c) {
  if (c.isPB) return _TREND_TYPE_LABELS.pb;
  if (c.isDominant) return _TREND_TYPE_LABELS.dominant;
  return _TREND_TYPE_LABELS.prominent;
}

// Compact top-5 season-best list for the home Leaderboard card. Reuses the
// Event Tracker's _seasonBestRanking so the two always show the same order.
function _homeSeasonBestRows(event) {
  const list = (typeof _seasonBestRanking === 'function' ? _seasonBestRanking(event) : []).slice(0, 5);
  if (!list.length) {
    return `<p style="color:var(--muted);padding:20px 0;font-size:14px;">No season-best results yet for ${event}.</p>`;
  }
  const rowsHtml = list.map((row, i) => {
    const rank = i + 1;
    return `
      <div class="rw-row rw-row--clickable" onclick="openAthleteCard('${row.id}', ${rank})">
        <span class="rw-rank ${rank === 1 ? 'rw-rank--first' : ''}">${rank}</span>
        <div class="rw-info">
          <span class="rw-name">${row.a.name}</span>
          <span class="rw-country-sm">${renderFlag(row.a.flag)}<span>${row.a.country || ''}</span></span>
        </div>
        ${row.time ? `<span class="rw-time">${row.time}</span>` : ''}
      </div>`;
  }).join('');
  return `<div class="rw-list">${rowsHtml}</div>`;
}

function trendRow(c) {
  const a = c.athlete, r = c.result;
  const cls = c.isPB ? 'fp-trend--pb' : c.isDominant ? 'fp-trend--dominant' : 'fp-trend--prominent';
  const evc = _eventAccentColor(r.event);
  return `
    <div class="fp-trend-row ${cls}" style="--evc:${evc}" onclick="openAthleteCard('${a.id}', null)" role="button" tabindex="0">
      <span class="fp-trend-tag">${_trendTypeTag(c)}</span>
      <span class="fp-trend-row-name">${renderFlag(a.flag)} ${a.name}</span>
      <span class="fp-trend-row-stat">${r.event.trim()} · ${r.time}${r.place ? ` · ${r.place.replace(/\.$/, '')}` : ''}</span>
      <span class="fp-trend-row-meta">${r.meet}${r.date ? ` · ${r.date}` : ''}</span>
    </div>`;
}

function buildTrendingSection() {
  const items = _buildTrendingPerformances(4);
  if (!items.length) return '';
  return `
    <div class="fp-trending">
      <div class="fp-trending-hd">
        <span class="fp-trending-title">Trending Performances</span>
      </div>
      <div class="fp-trending-list">${items.map(trendRow).join('')}</div>
    </div>`;
}

// ── "Try the tools" pair showcase ───────────────────────────
// Picks one matchup and builds every pair-dependent card for it. Called once
// on initial render and again (standalone, no page reload) whenever the user
// hits Shuffle — see shuffleHomeTools() below.
function _homeRenderPairShowcase() {
  const allAthletes = Object.values(ATHLETES);
  const _metricsReady = typeof MX_EVENTS !== 'undefined'
    && typeof _mxRadarSvg === 'function' && typeof _mxDecaySvg === 'function';

  function _homeShowcasePair() {
    // Prefer a random competitive rivalry that has actually raced (so H2H &
    // shared-race cards are populated), among strong/ranked athletes.
    try {
      if (typeof _findTopRivalries === 'function') {
        const pool = _findTopRivalries('2026', 'all', 'all', 50)
          .filter(p => ATHLETES[p.id1] && ATHLETES[p.id2]);
        if (pool.length) {
          const p = pool[Math.floor(Math.random() * pool.length)];
          return [ATHLETES[p.id1], ATHLETES[p.id2]];
        }
      }
    } catch (e) { /* fall through */ }
    // Fallback: two random athletes with enough multi-event data for the charts
    if (_metricsReady) {
      const multi = allAthletes.filter(a => MX_EVENTS.reduce((n, e) => n + (_mxPr(a, e.key) != null ? 1 : 0), 0) >= 3);
      if (multi.length >= 2) {
        const i = Math.floor(Math.random() * multi.length);
        let j = Math.floor(Math.random() * multi.length); if (j === i) j = (j + 1) % multi.length;
        return [multi[i], multi[j]];
      }
    }
    return [null, null];
  }
  const [showA, showB] = _homeShowcasePair();
  // Brand / accent tones distinguish athlete A / B across the homepage UI.
  const _cA = 'var(--brand)', _cB = '#1A1A1A';
  const _shortA = showA ? showA.name.split(' ').slice(-1)[0] : '';
  const _shortB = showB ? showB.name.split(' ').slice(-1)[0] : '';
  const _pairQ = (showA && showB) ? `?a=${encodeURIComponent(showA.id)}&b=${encodeURIComponent(showB.id)}` : '';

  // Strength Hexagon example
  let hexExampleCard = '';
  if (_metricsReady && showA && showB) {
    hexExampleCard = `
      <div class="dash-card dash-hexagon">
        <div class="dash-card-title">Strength Hexagon</div>
        <div class="dash-hex-legend">
          <span class="dash-hex-name" style="--c:${_cA}" onclick="openAthleteCard('${showA.id}', null)" role="button" tabindex="0"><span class="dash-hex-dot"></span>${showA.name}</span>
          <span class="dash-hex-vs">vs</span>
          <span class="dash-hex-name" style="--c:${_cB}" onclick="openAthleteCard('${showB.id}', null)" role="button" tabindex="0"><span class="dash-hex-dot"></span>${showB.name}</span>
        </div>
        <div class="dash-hex-svg">${_mxRadarSvg(showA.id, showB.id, '#FF5200', '#1A1A1A')}</div>
        <a href="metrics.html${_pairQ}" class="dash-link dash-card-foot">Open in Advanced Metrics →</a>
      </div>`;
  }

  // Personal Bests comparison — the pair's shared events side by side, faster
  // mark highlighted. Showcases the Multi-PR / compare tooling.
  let prCompareCard = '';
  if (showA && showB) {
    const PC_ORDER = ['800m', '1500m', 'Mile', '3000m', '5000m', '10000m'];
    const bestByEvent = a => {
      const m = {};
      (a.prs || []).forEach(p => {
        const k = _normalizeEvent(p.event);
        const s = parseTimeToSecs(p.time);
        if (s != null && (!(k in m) || s < m[k].secs)) m[k] = { time: p.time, secs: s };
      });
      return m;
    };
    const mA = bestByEvent(showA), mB = bestByEvent(showB);
    const rows = PC_ORDER.map(ev => {
      const k = _normalizeEvent(ev);
      const pa = mA[k], pb = mB[k];
      if (!pa || !pb) return null;
      const aWin = pa.secs < pb.secs, bWin = pb.secs < pa.secs;
      return `<div class="pc-row">
        <span class="pc-t${aWin ? ' pc-t--win' : ''}" style="${aWin ? `color:${_cA}` : ''}">${pa.time}</span>
        <span class="pc-ev">${ev}</span>
        <span class="pc-t pc-t--r${bWin ? ' pc-t--win' : ''}" style="${bWin ? `color:${_cB}` : ''}">${pb.time}</span>
      </div>`;
    }).filter(Boolean).join('');
    prCompareCard = `
      <div class="dash-card dash-prcompare">
        <div class="dash-card-title">Personal Bests</div>
        <div class="pc-head">
          <span class="pc-name" style="color:${_cA}" onclick="openAthleteCard('${showA.id}', null)" role="button" tabindex="0">${_shortA}</span>
          <span class="pc-head-mid">event</span>
          <span class="pc-name pc-name--r" style="color:${_cB}" onclick="openAthleteCard('${showB.id}', null)" role="button" tabindex="0">${_shortB}</span>
        </div>
        ${rows ? `<div class="pc-list">${rows}</div>` : '<p class="dash-empty">No shared events between this pair.</p>'}
        <a href="metrics.html${_pairQ}" class="dash-link dash-card-foot">Compare every mark →</a>
      </div>`;
  }

  // Head-to-Head example
  let h2hExampleCard = '';
  if (showA && showB && typeof _computePairMatchup === 'function') {
    const m = _computePairMatchup(showA.id, showB.id);
    if (m) {
      const { wins, losses, races } = m; // wins = showA's wins over showB
      const leader = wins > losses ? _shortA : losses > wins ? _shortB : null;
      const recent = races.slice(0, 3).map(r => `
        <div class="he-race">
          <span class="he-race-win" style="color:${r.won ? _cA : _cB}">${r.won ? _shortA : _shortB}</span>
          <span class="he-race-meet">${r.event.trim()} · ${r.meet}</span>
        </div>`).join('');
      h2hExampleCard = `
        <div class="dash-card dash-h2hex">
          <div class="dash-card-title">Head-to-Head</div>
          <div class="he-top">
            <span class="he-name" style="color:${_cA}" onclick="openAthleteCard('${showA.id}', null)" role="button" tabindex="0">${showA.name}</span>
            <span class="he-score">${wins}<em>–</em>${losses}</span>
            <span class="he-name he-name--r" style="color:${_cB}" onclick="openAthleteCard('${showB.id}', null)" role="button" tabindex="0">${showB.name}</span>
          </div>
          <div class="he-meta">${races.length} career meeting${races.length === 1 ? '' : 's'}${leader ? ` · ${leader} leads` : ' · all square'}</div>
          ${recent ? `<div class="he-races">${recent}</div>` : ''}
          <a href="h2h.html${_pairQ}" class="dash-link dash-card-foot">See the full head-to-head →</a>
        </div>`;
    }
  }

  // Shared Races example — runs on a GROUP of 3+ athletes (the featured pair
  // plus whoever else raced them most), showing off multi-athlete race-finding.
  function _homeSharedGroup(aId, bId) {
    const group = [aId, bId];
    if (typeof _computeSharedRaces !== 'function') return group;
    const pairShared = _computeSharedRaces([aId, bId]);
    if (!pairShared.length) return group;
    const keyOf = r => [r.meet, r.event, r.date].map(s => String(s || '').trim().toLowerCase()).join('|');
    const anchorKeys = new Set(pairShared.map(s => keyOf(s.entries.find(e => e.id === aId)?.race || {})));
    const allRaces = a => {
      const out = [...(a.results || [])];
      Object.values(a.resultsHistory || {}).forEach(list => (list || []).forEach(r => out.push(r)));
      return out;
    };
    const counts = [];
    Object.values(ATHLETES).forEach(a => {
      if (a.id === aId || a.id === bId) return;
      const seen = new Set();
      let c = 0;
      allRaces(a).forEach(r => { const k = keyOf(r); if (anchorKeys.has(k) && !seen.has(k)) { seen.add(k); c++; } });
      if (c > 0) counts.push({ id: a.id, c });
    });
    counts.sort((x, y) => y.c - x.c);
    for (const cand of counts) {           // greedily add, keeping intersection non-empty
      if (group.length >= 4) break;
      if (_computeSharedRaces([...group, cand.id]).length > 0) group.push(cand.id);
    }
    return group;
  }
  let sharedRacesCard = '';
  if (showA && showB && typeof _computeSharedRaces === 'function') {
    const grp = _homeSharedGroup(showA.id, showB.id);
    const shared = _computeSharedRaces(grp);
    const names = grp.map(id => (ATHLETES[id]?.name || '').split(' ').slice(-1)[0]);
    const nameStr = names.length <= 1 ? names[0]
      : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
    const rows = shared.slice(0, 4).map(s => {
      const winner = ATHLETES[s.entries[0].id];
      return `
        <div class="sr-row">
          <span class="sr-meet">${s.event.trim()} · ${s.meet}</span>
          <span class="sr-times"><b>${winner ? winner.name.split(' ').slice(-1)[0] : ''}</b> ${s.entries[0].race.time}</span>
        </div>`;
    }).join('');
    const q = '?' + grp.map((id, i) => `${['a', 'b', 'c', 'd', 'e'][i]}=${encodeURIComponent(id)}`).join('&');
    sharedRacesCard = `
      <div class="dash-card dash-shared">
        <div class="dash-card-title">Shared Races</div>
        ${shared.length
          ? `<div class="sr-sub">${grp.length} athletes — ${nameStr} — all lined up together ${shared.length} time${shared.length === 1 ? '' : 's'}</div><div class="sr-list">${rows}</div>`
          : `<p class="dash-empty">No single race with all of ${nameStr}.</p>`}
        <a href="h2h.html${q}" class="dash-link dash-card-foot">Find shared races →</a>
      </div>`;
  }

  // "Try" chips seeded from the featured pair, for the search hero.
  const _chip = c => `<button class="hsh-chip" onclick="homeSearchFill('${String(c).replace(/'/g, "\\'")}')">${c}</button>`;
  const chipsHtml = [showA && showA.name, showB && showB.name, '1500m']
    .filter(Boolean).map(_chip).join('');

  // Which pair every tool below is pre-loaded with (explains the examples).
  // Colored to match the A/B athlete colors used across every tool card.
  const pairLabel = (showA && showB)
    ? `<button class="ht-pair" style="color:${_cA}" onclick="openAthleteCard('${showA.id}',null)">${showA.name}</button> vs <button class="ht-pair" style="color:${_cB}" onclick="openAthleteCard('${showB.id}',null)">${showB.name}</button>`
    : '';

  return { showA, showB, hexExampleCard, prCompareCard, h2hExampleCard, sharedRacesCard, chipsHtml, pairLabel };
}

function _homeChipsInner(chipsHtml) {
  return chipsHtml ? `<span class="hsh-try">Try</span>${chipsHtml}` : '';
}
function _homePairSubInner(pairLabel) {
  return `${pairLabel ? `Live examples running on ${pairLabel}.` : 'Live, interactive examples.'} <button class="ht-shuffle" onclick="shuffleHomeTools()">Shuffle ↻</button>`;
}

// Re-picks the showcase pair and re-renders only the pair-dependent cards +
// the "Try" chips — no navigation, no full-page rebuild, scroll position and
// search state are untouched.
window.shuffleHomeTools = function () {
  const pair = _homeRenderPairShowcase();
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('home-card-h2h', pair.h2hExampleCard);
  set('home-card-pr', pair.prCompareCard);
  set('home-card-hex', pair.hexExampleCard);
  set('home-card-shared', pair.sharedRacesCard);
  set('home-pair-label', _homePairSubInner(pair.pairLabel));
  set('home-chips', _homeChipsInner(pair.chipsHtml));
  _homeWireChartTooltips();
};

// ── HOME PAGE ─────────────────────────────────────────────
function buildHome() {
  // Hero: prefer featured article, fall back to featured rankings, then first article
  const featuredRankings = ARTICLES.find(a => a.featured && a.type === 'rankings');
  const featured = ARTICLES.find(a => a.featured && a.type !== 'rankings') || ARTICLES.find(a => a.type !== 'rankings') || ARTICLES[0];
  const heroItem = featured || featuredRankings || ARTICLES[0];
  const rankingsEvent = featuredRankings && featuredRankings.rankingsEvent;
  const heroDest = heroItem?.type === 'rankings'
    ? `rankings.html${rankingsEvent ? '?event=' + encodeURIComponent(rankingsEvent) : ''}`
    : `article.html?id=${heroItem?.id}`;

  const now = Date.now();

  // ── Cinematic hero media (left side of the hero band) ────
  const heroCard = heroItem ? `
    <a class="home-hero-media${heroItem.image ? '' : ' home-hero-media--noimg'}" href="${heroDest}">
      ${heroItem.image ? `<img class="home-hero-img" src="${heroItem.image}" alt="${heroItem.title}">` : ''}
      <div class="home-hero-scrim"></div>
      <div class="home-hero-content">
        <div class="home-hero-eyebrow">${heroItem.category || 'Featured'}${heroItem.date ? ` · ${heroItem.date}` : ''}</div>
        <h1 class="home-hero-title">${heroItem.title}</h1>
        ${heroItem.excerpt ? `<p class="home-hero-dek">${heroItem.excerpt}</p>` : ''}
        <span class="home-hero-cta">Read ${heroItem.type === 'rankings' ? 'the rankings' : 'the story'} <span class="home-hero-arrow">→</span></span>
      </div>
    </a>` : '';

  // ── Row 1: upcoming meets card ────────────────────────────
  const allAthletes = Object.values(ATHLETES);

  const upcomingMeets = (SITE.upcomingMeets || [])
    .filter(m => m.name && m.datetime && new Date(m.datetime) > now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 4);
  const meetRows = upcomingMeets.map(m => {
    const d = new Date(m.datetime);
    const days = Math.ceil((d - now) / 86400000);
    const when = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`;
    const dateChip = d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    const inner = `
      <span class="dash-meet-date">${dateChip}</span>
      <span class="dash-meet-main">
        <span class="dash-meet-name">${m.name}</span>
        <span class="dash-meet-when">${when}</span>
      </span>`;
    return m.url
      ? `<a class="dash-meet-row" href="${m.url}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="dash-meet-row">${inner}</div>`;
  }).join('');
  const meetsCard = `
    <div class="dash-card dash-meets">
      <div class="dash-card-title">Upcoming Meets</div>
      ${meetRows
        ? `<div class="dash-meet-list">${meetRows}</div>`
        : '<p class="dash-empty">No meets on the calendar yet.</p>'}
    </div>`;

  // ── Barrier clubs card (career PRs under classic marks) ───
  const clubCounts = [
    { label: '800m', barrier: 'Sub-1:44', time: '1:44.00' },
    { label: '1500m', barrier: 'Sub-3:30', time: '3:30.00' },
    { label: '5000m', barrier: 'Sub-13:00', time: '13:00.00' },
    { label: '10000m', barrier: 'Sub-27:00', time: '27:00.00' },
  ].map(c => {
    const limit = parseTimeToSecs(c.time);
    const n = allAthletes.filter(a => {
      const pr = (a.prs || []).find(p => p.event === c.label);
      const s = pr ? parseTimeToSecs(pr.time) : null;
      return s != null && s < limit;
    }).length;
    return { ...c, n };
  });
  const clubMax = Math.max(1, ...clubCounts.map(c => c.n));
  const clubRows = clubCounts.map(c => {
    const href = `athletes.html?prEvent=${encodeURIComponent(c.label)}&prTime=${encodeURIComponent(c.time)}`;
    return `
      <a class="dash-club-row" href="${href}">
        <span class="dash-club-count">${c.n}</span>
        <span class="dash-club-main">
          <span class="dash-club-barrier">${c.barrier} ${c.label}</span>
          <span class="dash-club-note">athlete${c.n === 1 ? '' : 's'} with a career PR under this mark</span>
          <span class="dash-club-bar-track"><span class="dash-club-bar" style="width:${Math.max(4, Math.round(c.n / clubMax * 100))}%"></span></span>
        </span>
        <span class="dash-club-arrow">→</span>
      </a>`;
  }).join('');
  const clubsCard = `
    <div class="dash-card dash-clubs">
      <div class="dash-card-title">Barrier Clubs</div>
      <div class="dash-club-list">${clubRows}</div>
      <a href="athletes.html" class="dash-link dash-card-foot">Combine marks in Multi-PR Search →</a>
    </div>`;

  // ── H2H Leaders by event (best season win-loss record per event) ─
  const h2hMin = typeof _H2H_MIN_RACES !== 'undefined' ? _H2H_MIN_RACES : 3;
  const h2hLeadersForEvent = ev => {
    if (typeof _computeAllH2HRecords !== 'function') return [];
    const { records } = _computeAllH2HRecords('2026', ev, 'all', 'all');
    return Object.entries(records)
      .filter(([, r]) => r.wins + r.losses >= h2hMin)
      .sort((a, b) =>
        _wilsonScore(b[1].wins, b[1].wins + b[1].losses) - _wilsonScore(a[1].wins, a[1].wins + a[1].losses)
        || b[1].wins - a[1].wins)
      .slice(0, 3);
  };

  const leaderSections = ['800m', '1500m', '5000m', '10000m'].map(ev => {
    const ranked = h2hLeadersForEvent(ev);
    if (!ranked.length) return '';
    const [[topId, topRec], ...rest] = ranked;
    const topA = ATHLETES[topId];
    const runners = rest.map(([id, r]) => `
      <div class="dash-ldr-runner" onclick="event.stopPropagation();openAthleteCard('${id}', null)" role="button" tabindex="0">
        <span class="dash-ldr-rtime">${r.wins}–${r.losses}</span>
        <span class="dash-ldr-rname">${ATHLETES[id] ? ATHLETES[id].name : id}</span>
      </div>`).join('');
    return `
      <div class="dash-ldr-section">
        <a class="dash-ldr-label" href="h2h.html">${ev} · H2H Leader</a>
        <div class="dash-ldr-body" onclick="openAthleteCard('${topId}', null)" role="button" tabindex="0">
          <div class="dash-ldr-main">
            <div class="dash-ldr-hero-row">
              <span class="dash-ldr-badge">${topRec.wins}–${topRec.losses}</span>
              <span class="dash-ldr-name">${topA ? topA.name : topId}</span>
            </div>
            <div class="dash-ldr-runners">${runners}</div>
          </div>
        </div>
      </div>`;
  }).join('');
  const leadersCard = leaderSections ? `
    <div class="dash-card dash-leaders">
      <div class="dash-card-title">H2H Leaders by Event</div>
      <div class="dash-ldr-grid">${leaderSections}</div>
      <a href="h2h.html" class="dash-link dash-card-foot">Full H2H leaderboard →</a>
    </div>` : '';

  // ── Sofascore-style homepage: hero header + 3-column layout ─
  const evs = _sfEventList();
  _sfEvent = evs.includes('800m') ? '800m' : evs[0];
  _sfTab = 'leaders';
  // Composite "leaders" block (table + connected Recent/Most-wins panel).
  const _sfLeadersBlock = () => `
    <div class="sf-pgroup">
      ${_sfCenterCard(_sfEvent)}
      <div class="sf-bottom-row sf-bottom-row--2">
        ${_sfRecentCard()}
        ${_sfMostWinsCard()}
      </div>
    </div>`;
  // Section registry — the Studio reorders / hides these by id.
  const SECTIONS = {
    lead:     { label: 'Lead story', render: _sfLeadStory },
    ranking:  { label: 'Power ranking', render: _sfFeaturedRanking },
    stories:  { label: 'Latest stories', render: _sfStoriesRiver },
    nextMeet: { label: 'Next meet', render: _sfNextMeetCountdown },
    meets:    { label: 'Upcoming meets', render: _sfMeetsCard },
    barrier:  { label: 'Barrier club', render: _sfBarrierCard },
    promos:   { label: 'Promo banners', render: _sfPromosSection },
    hero:     { label: 'H2H hero', render: _sfHeroMatchup },
    leaders:  { label: 'Leaders + Recent / Most wins', render: _sfLeadersBlock },
    tools:    { label: 'Tools', render: _sfToolsSection }
  };
  // Custom user-created boxes (Studio → Boxes) live in STUDIO.blocks.
  const blocks = (window.STUDIO && window.STUDIO.blocks) || [];
  const blockMap = {};
  blocks.forEach(b => { if (b && b.id) blockMap[b.id] = b; });
  window.SF_SECTION_META = Object.assign(
    Object.fromEntries(Object.entries(SECTIONS).map(([k, v]) => [k, v.label])),
    Object.fromEntries(blocks.map(b => [b.id, (b.title || 'Custom box') + ' ✎']))
  );
  const defLayout = { left: ['nextMeet', 'meets', 'barrier', 'promos'], right: ['lead', 'ranking', 'stories', 'hero', 'leaders', 'tools'], hidden: [] };
  const layout = (window.STUDIO && window.STUDIO.layout) || defLayout;
  // Surface any newly-added built-in sections that a saved layout doesn't know about.
  (function () {
    const seen = (layout.left || []).concat(layout.right || [], layout.hidden || []);
    const missing = Object.keys(SECTIONS).filter(id => seen.indexOf(id) < 0);
    if (missing.length) layout.right = missing.concat(layout.right || []);
  })();
  const hidden = layout.hidden || [];
  const editing = !!window.STUDIO_EDIT;
  const renderOne = id => SECTIONS[id] ? SECTIONS[id].render() : (blockMap[id] ? _sfCustomBlock(blockMap[id]) : '');
  // In edit mode every box is wrapped in an editable "slot" with hover handles.
  const wrap = (id, colName) => {
    const html = renderOne(id);
    if (!editing) return html;
    const isHidden = hidden.includes(id);
    const name = (window.SF_SECTION_META && window.SF_SECTION_META[id]) || id;
    const isBlock = !!blockMap[id];
    return `<div class="sf-slot${isHidden ? ' sf-slot--hidden' : ''}" data-id="${id}" data-col="${colName}">
      <div class="sf-slot-bar">
        <span class="sf-slot-name">${name}</span>
        <span class="sf-slot-acts">
          <button type="button" data-a="up" title="Move up">↑</button>
          <button type="button" data-a="down" title="Move down">↓</button>
          <button type="button" data-a="move" title="Swap column">⇄</button>
          <button type="button" data-a="hide" title="${isHidden ? 'Show' : 'Hide'}">${isHidden ? '◍' : '○'}</button>
          ${isBlock ? '<button type="button" data-a="del" title="Delete">✕</button>' : ''}
        </span>
      </div>
      ${html}
    </div>`;
  };
  const renderCol = (ids, colName) => (ids || [])
    .filter(id => (SECTIONS[id] || blockMap[id]) && (editing || !hidden.includes(id)))
    .map(id => wrap(id, colName)).join('');

  document.getElementById('main').innerHTML = `
    <div class="fp-wrap">
      <div class="sf${editing ? ' sf--editing' : ''}">
        <nav class="sf-crumbs" aria-label="Breadcrumb">
          <a href="index.html">Athletics</a>
          <span class="sf-crumb-sep">›</span>
          <span>${_sfT('crumb.cat','Distance Running')}</span>
          <span class="sf-crumb-sep">›</span>
          <span class="sf-crumb-cur">${_sfT('crumb.season','2026 Season')}</span>
        </nav>
        <div class="sf-layout">
          <aside class="sf-col-left">${renderCol(layout.left, 'left')}</aside>
          <main class="sf-col-right">${renderCol(layout.right, 'right')}</main>
        </div>
      </div>
    </div>`;
  if (typeof _sfScaleCanvases === 'function') _sfScaleCanvases();
}
window.rebuildHome = buildHome;
window._sfCurrentPromos = function () { return _sfPromos(); };

// ── Editorial front page (The Athletic × The Ringer) ──────────
function _sfArticles() {
  return (typeof ARTICLES !== 'undefined' && Array.isArray(ARTICLES)) ? ARTICLES.filter(a => a.type !== 'rankings') : [];
}
function _sfCatKey(cat) { return String(cat || 'story').toLowerCase().replace(/[^a-z]+/g, ''); }
function _sfLead() {
  const arts = _sfArticles();
  const feat = arts.find(a => String(a.featured).toLowerCase() === 'true');
  return feat || arts[0] || null;
}
function _sfLeadStory() {
  const a = _sfLead();
  if (!a) return '';
  const dest = `article.html?id=${a.id}`;
  const img = (typeof imgHTML === 'function') ? imgHTML(a.image, a.title, a.imagePosition, 16 / 9, 'sf-lead-img')
    : (a.image ? `<img class="sf-lead-img" src="${a.image}" alt="" style="object-position:${a.imagePosition || 'center'}">` : '<div class="sf-lead-ph"></div>');
  return `<article class="sf-card sf-lead" onclick="goTo('${dest}')" role="button" tabindex="0">
    <div class="sf-lead-media">${img}</div>
    <div class="sf-lead-body">
      <span class="sf-cat sf-cat--${_sfCatKey(a.category)}">${a.category || 'STORY'}</span>
      <h2 class="sf-lead-title">${a.title}</h2>
      ${a.excerpt ? `<p class="sf-lead-dek">${a.excerpt}</p>` : ''}
      <div class="sf-byline">${a.author ? `By <b>${a.author}</b>` : ''}${a.date ? ` · ${a.date}` : ''}${a.readTime ? ` · ${a.readTime}` : ''}</div>
    </div>
  </article>`;
}
function _sfStoryCard(a) {
  const dest = `article.html?id=${a.id}`;
  const img = (typeof imgHTML === 'function') ? imgHTML(a.image, a.title, a.imagePosition, 16 / 10, 'sf-story-img')
    : (a.image ? `<img class="sf-story-img" src="${a.image}" alt="">` : '<div class="sf-story-ph"></div>');
  return `<a class="sf-story" href="${dest}">
    <div class="sf-story-media">${img}<span class="sf-cat sf-cat--${_sfCatKey(a.category)}">${a.category || 'STORY'}</span></div>
    <h3 class="sf-story-title">${a.title}</h3>
    <div class="sf-byline sf-byline--sm">${a.author || ''}${a.date ? ` · ${a.date}` : ''}</div>
  </a>`;
}
function _sfFeaturedRanking() {
  const evs = (typeof RANKINGS_EVENTS !== 'undefined' && RANKINGS_EVENTS) || [];
  const ov = window.STUDIO && window.STUDIO.content && window.STUDIO.content.featuredEvent;
  const ev = (ov && evs.find(e => e.name === ov && (e.rows || []).length)) || evs.find(e => (e.rows || []).length);
  if (!ev) return '';
  const yr = (typeof RANKINGS_YEAR !== 'undefined' && RANKINGS_YEAR) || '';
  const top = (ev.rows || []).slice(0, 3);
  const rowsHtml = top.map((r, i) => {
    const a = r.athleteId && ATHLETES[r.athleteId];
    const name = (a && a.name) || r.name || r.athleteId || '';
    const flag = (a && a.flag) || r.flag || '';
    return `<a class="sf-rk-row" href="rankings.html?event=${encodeURIComponent(ev.name)}">
      <span class="sf-rk-rank">${i + 1}</span>
      <span class="sf-rk-main">
        <span class="sf-rk-name">${name}${flag ? ` <span class="sf-rk-flag">${renderFlag(flag)}</span>` : ''}</span>
        ${r.bite ? `<span class="sf-rk-bite">${r.bite}</span>` : ''}
      </span>
    </a>`;
  }).join('');
  return `<section class="sf-rk">
    <div class="sf-rk-eyebrow">Power Ranking${yr ? ` · ${yr}` : ''}</div>
    <h2 class="sf-rk-title">${ev.name}${ev.description ? ` <span class="sf-rk-sub">${ev.description}</span>` : ''}</h2>
    <div class="sf-rk-list">${rowsHtml}</div>
    <a class="sf-rk-more" href="rankings.html?event=${encodeURIComponent(ev.name)}">See the full ${ev.name} ranking →</a>
  </section>`;
}
function _sfStoriesRiver() {
  const arts = _sfArticles();
  const lead = _sfLead();
  const rest = arts.filter(a => a !== lead).slice(0, 4);
  if (!rest.length) return '';
  return `<div class="sf-stories">
    <div class="sf-card-hd"><span>${_sfT('hd.latest', 'Latest')}</span><a class="sf-card-link" href="articles.html">All stories →</a></div>
    <div class="sf-stories-grid">${rest.map(_sfStoryCard).join('')}</div>
  </div>`;
}

// Editable text with an override layer. Returns the owner's saved copy if set,
// else the default. In edit mode it renders as an inline-editable span.
function _sfT(key, def) {
  const o = window.STUDIO && window.STUDIO.text;
  const v = (o && o[key] != null) ? o[key] : def;
  return window.STUDIO_EDIT ? `<span class="sf-t" data-t="${key}" contenteditable="true">${v}</span>` : v;
}

// Render a user-created custom box (Studio → Boxes).
function _sfBlockPara(t) {
  return String(t || '').split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}
function _sfYouTubeId(u) { const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : null; }
function _sfVimeoId(u) { const m = String(u || '').match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? m[1] : null; }
function _sfVideoInner(b) {
  const url = b.url || '';
  const yt = _sfYouTubeId(url);
  if (yt) return `<div class="sf-video"><iframe src="https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=1&modestbranding=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  const vm = _sfVimeoId(url);
  if (vm) return `<div class="sf-video"><iframe src="https://player.vimeo.com/video/${vm}?autoplay=1&muted=1&loop=1&background=1" allow="autoplay" allowfullscreen loading="lazy"></iframe></div>`;
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) return `<div class="sf-video"><video src="${url}" autoplay muted loop playsinline${b.poster ? ` poster="${b.poster}"` : ''}></video></div>`;
  return url ? `<a class="sf-video-fallback" href="${url}" target="_blank" rel="noopener">▶ ${url}</a>` : '<div class="sf-block-imgph"></div>';
}
function _sfBlockStyle(b) {
  let s = '';
  if (b.bg) s += 'background:' + b.bg + ';';
  if (b.fg) s += 'color:' + b.fg + ';';
  return s ? ` style="${s}"` : '';
}
function _sfBlockPad(b) { return b.pad === 's' ? ' sf-block--pad-s' : b.pad === 'l' ? ' sf-block--pad-l' : ''; }
function _sfCdText(iso) {
  const d = new Date(iso).getTime();
  if (isNaN(d)) return '—';
  const diff = d - Date.now();
  if (diff <= 0) return 'Now';
  return Math.floor(diff / 86400000) + 'd ' + Math.floor((diff % 86400000) / 3600000) + 'h ' + Math.floor((diff % 3600000) / 60000) + 'm';
}
if (!window._sfCdTick) {
  window._sfCdTick = setInterval(function () {
    document.querySelectorAll('.sf-cd-v[data-cd]').forEach(function (e) { e.textContent = _sfCdText(e.dataset.cd); });
  }, 30000);
}
// Live metrics computed from the dataset (for data-bound stat boxes).
function _sfMetric(key) {
  try {
    if (typeof ATHLETES === 'undefined') return '—';
    const vals = Object.values(ATHLETES);
    if (key === 'athletes') return String(vals.length);
    if (key === 'countries') { const s = new Set(); vals.forEach(a => { if (a.country) s.add(a.country); }); return String(s.size); }
    if (key === 'results') { let n = 0; vals.forEach(a => { n += (a.results || []).length; }); return String(n); }
    if (key === 'nextMeetDays') {
      const m = _sfMeets().filter(x => x.datetime && new Date(x.datetime) > Date.now()).sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];
      return m ? String(Math.max(0, Math.ceil((new Date(m.datetime) - Date.now()) / 86400000))) : '—';
    }
    if (key === 'sub330') {
      const k = _normalizeEvent('1500m'), lim = parseTimeToSecs('3:30.00'); let c = 0;
      vals.forEach(a => { let best = null; (a.prs || []).forEach(p => { if (_normalizeEvent(p.event) === k) { const t = parseTimeToSecs(p.time); if (t != null && (best == null || t < best)) best = t; } }); if (best != null && best < lim) c++; });
      return String(c);
    }
  } catch (e) {}
  return '—';
}
// Auto-generated editorial insight from the data.
function _sfInsight(kind) {
  try {
    if (kind === 'top') { const t = _buildTrendingPerformances(1)[0]; if (t) return { eyebrow: 'Performance of the week', head: t.result.time + ' — ' + t.athlete.name, sub: (t.result.event || '').trim() + ' · ' + t.result.meet }; }
    if (kind === 'mostWins') {
      let best = null;
      Object.values(ATHLETES).forEach(a => { let w = 0; (a.results || []).forEach(r => { if (parseInt(r.place) === 1 && parseTimeToSecs(r.time) != null) w++; }); if (w > 0 && (!best || w > best.w)) best = { a, w }; });
      if (best) return { eyebrow: 'Most wins · 2026', head: best.a.name, sub: best.w + ' wins this season' };
    }
    if (kind === 'barrier') return { eyebrow: 'Barrier club', head: _sfMetric('sub330') + ' under 3:30', sub: '1500 m · 2026 season' };
    if (kind === 'nextMeet') { const m = _sfMeets().filter(x => x.datetime && new Date(x.datetime) > Date.now()).sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]; if (m) return { eyebrow: 'Next up', head: m.name, sub: _sfCdText(m.datetime) + ' to go' }; }
  } catch (e) {}
  return { eyebrow: 'Insight', head: '—', sub: '' };
}
// Free-form canvas board: absolutely-positioned text/image/shape elements.
function _sfCanvasItem(c, ed) {
  const pos = `left:${c.x || 0}px;top:${c.y || 0}px;width:${c.w || 160}px;`;
  const edA = ed ? ` data-cid="${c.id}" tabindex="0"` : '';
  if (c.kind === 'image') {
    return `<img class="sf-cv-item sf-cv-img"${edA} src="${c.image || ''}" alt="" style="${pos}height:${c.h || 100}px;border-radius:${c.radius || 0}px">`;
  }
  if (c.kind === 'shape') {
    return `<div class="sf-cv-item sf-cv-shape"${edA} style="${pos}height:${c.h || 80}px;background:${c.bg || '#FF5200'};border-radius:${c.radius || 8}px"></div>`;
  }
  const style = `${pos}font-size:${c.size || 18}px;font-weight:${c.weight || 600};color:${c.color || '#111111'};text-align:${c.align || 'left'};line-height:1.25;`;
  const cont = ed ? ' data-cv-text="1"' : '';
  return `<div class="sf-cv-item sf-cv-text"${edA} style="${style}"${cont}>${c.text || 'Text'}</div>`;
}
function _sfCanvasBlock(b) {
  const ed = !!window.STUDIO_EDIT;
  const h = parseInt(b.height, 10) || 360;
  const kids = (b.children || []).map(c => _sfCanvasItem(c, ed)).join('');
  return `<div class="sf-block sf-block--canvas${ed ? ' is-editing' : ''}" data-canvas="${b.id}" style="height:${h}px"><div class="sf-cv-inner" style="height:${h}px">${kids}${ed ? '<div class="sf-cv-guides"></div>' : ''}</div></div>`;
}
// Scale each canvas to fit its column (view mode). Editing stays 1:1 and
// captures the design width so view mode can shrink proportionally on mobile.
function _sfScaleCanvases() {
  document.querySelectorAll('.sf-block--canvas').forEach(function (cv) {
    var inner = cv.querySelector('.sf-cv-inner'); if (!inner) return;
    var b = ((window.STUDIO && window.STUDIO.blocks) || []).filter(function (x) { return x.id === cv.dataset.canvas; })[0];
    var designH = (b && parseInt(b.height, 10)) || 360;
    if (window.STUDIO_EDIT) {
      inner.style.transform = ''; inner.style.width = ''; cv.style.height = designH + 'px';
      if (b) b.designW = cv.clientWidth;
      return;
    }
    var dw = (b && b.designW) || cv.clientWidth || 1;
    inner.style.width = dw + 'px';
    var scale = Math.min(1, (cv.clientWidth || dw) / dw);
    inner.style.transformOrigin = 'top left';
    inner.style.transform = 'scale(' + scale + ')';
    cv.style.height = (designH * scale) + 'px';
  });
}
if (!window._sfCanvasResizeWired) { window._sfCanvasResizeWired = true; window.addEventListener('resize', _sfScaleCanvases); }
window._sfScaleCanvases = _sfScaleCanvases;
function _sfCustomBlock(b) {
  if (!b) return '';
  if (b.type === 'canvas') return _sfCanvasBlock(b);
  const ed = !!window.STUDIO_EDIT;
  const ea = f => ed ? ` contenteditable="true" data-edit="${f}"` : '';
  const st = _sfBlockStyle(b);
  const pad = _sfBlockPad(b);

  if (b.type === 'divider') return `<div class="sf-block sf-block--divider"></div>`;
  if (b.type === 'spacer') return `<div class="sf-block sf-block--spacer" style="height:${parseInt(b.height, 10) || 24}px"></div>`;
  if (b.type === 'button') {
    const label = b.title || 'Button';
    const btn = ed
      ? `<span class="sf-block-btn"${st}${ea('title')}>${label}</span>`
      : `<a class="sf-block-btn" href="${b.href || '#'}"${st}>${label}</a>`;
    return `<div class="sf-block sf-block--button">${btn}</div>`;
  }
  if (b.type === 'stat') {
    const num = b.metric ? _sfMetric(b.metric) : (b.title || '0');
    return `<div class="sf-card sf-block sf-block--stat${pad}"${st}><div class="sf-stat-num"${b.metric ? '' : ea('title')}>${num}</div><div class="sf-stat-lbl"${ea('body')}>${b.body || ''}</div></div>`;
  }
  if (b.type === 'insight') {
    const ins = _sfInsight(b.kind || 'top');
    return `<div class="sf-card sf-block sf-block--insight${pad}"${st}><div class="sf-ins-eyebrow">${ins.eyebrow}</div><div class="sf-ins-head">${ins.head}</div>${ins.sub ? `<div class="sf-ins-sub">${ins.sub}</div>` : ''}</div>`;
  }
  if (b.type === 'countdown') {
    return `<div class="sf-card sf-block sf-block--cd${pad}"${st}>${(b.title || ed) ? `<div class="sf-cd-t"${ea('title')}>${b.title || ''}</div>` : ''}<div class="sf-cd-v" data-cd="${b.date || ''}">${_sfCdText(b.date)}</div></div>`;
  }
  if (b.type === 'video') {
    const cap = (b.title || b.caption)
      ? `<div class="sf-block-cap">${b.title ? `<div class="sf-block-cap-t">${b.title}</div>` : ''}${b.caption ? `<div class="sf-block-cap-s">${b.caption}</div>` : ''}</div>` : '';
    return `<div class="sf-card sf-block sf-block--video"${st}>${_sfVideoInner(b)}${cap}</div>`;
  }
  if (b.type === 'html') {
    return `<div class="sf-card sf-block sf-block--html${pad}"${st}>${b.html || ''}</div>`;
  }
  if (b.type === 'image') {
    const img = b.image ? `<img src="${b.image}" alt="${b.title || ''}">` : '<div class="sf-block-imgph"></div>';
    const cap = (b.title || b.caption)
      ? `<div class="sf-block-cap">${b.title ? `<div class="sf-block-cap-t">${b.title}</div>` : ''}${b.caption ? `<div class="sf-block-cap-s">${b.caption}</div>` : ''}</div>` : '';
    const inner = img + cap;
    return b.href
      ? `<a class="sf-card sf-block sf-block--image" href="${b.href}"${st}>${inner}</a>`
      : `<div class="sf-card sf-block sf-block--image"${st}>${inner}</div>`;
  }
  if (b.type === 'quote') {
    return `<div class="sf-card sf-block sf-block--quote${pad}"${st}><blockquote${ea('body')}>${_sfBlockPara(b.body)}</blockquote>${(b.title || ed) ? `<cite${ea('title')}>${b.title || ''}</cite>` : ''}</div>`;
  }
  return `<div class="sf-card sf-block sf-block--text${pad}"${st}>${(b.title || ed) ? `<div class="sf-block-h"${ea('title')}>${b.title || ''}</div>` : ''}${(b.body || ed) ? `<div class="sf-block-body"${ea('body')}>${_sfBlockPara(b.body)}</div>` : ''}</div>`;
}

// ── Promo banners — dark gradient cards that link to tools.
//    Configure via SITE.promos, or edit the defaults below. Drop your own
//    graphic in by setting `image` to an image path (leave '' for a slot). ──
function _sfPromos() {
  const sp = window.STUDIO && window.STUDIO.content && window.STUDIO.content.promos;
  if (Array.isArray(sp)) return sp;
  if (typeof SITE !== 'undefined' && Array.isArray(SITE.promos) && SITE.promos.length) return SITE.promos;
  return [
    {
      title: 'Time Machine', cta: 'Enter the Time Machine', href: 'time-machine.html',
      subtitle: 'Rewind the clock and replay any season’s rankings and results.',
      bg: 'linear-gradient(120deg, #241a12 0%, #7a3d10 55%, #1a1410 100%)', image: ''
    },
    {
      title: 'Metrics Lab', cta: 'Open Metrics', href: 'metrics.html',
      subtitle: 'Rate athletes on depth, dominance and consistency.',
      bg: 'linear-gradient(120deg, #0f1416 0%, #123a3f 60%, #0f1416 100%)', image: ''
    }
  ];
}
function _sfPromoCard(p, i) {
  const ext = /^https?:/.test(p.href || '');
  const art = p.image ? `<img src="${p.image}" alt="">` : '';
  const ed = window.STUDIO_EDIT;
  const pe = f => ed ? ` contenteditable="true" data-promo="${i}" data-pf="${f}"` : '';
  // In edit mode the promo is a div (so links don't fire) with editable text.
  const tag = ed ? 'div' : 'a';
  const attrs = ed ? '' : ` href="${p.href || '#'}"${ext ? ' target="_blank" rel="noopener"' : ''}`;
  return `
    <${tag} class="sf-promo" style="background:${p.bg || '#1a1a1a'}"${attrs}>
      <div class="sf-promo-body">
        <div class="sf-promo-title"${pe('title')}>${p.title || ''}</div>
        <div class="sf-promo-sub"${pe('subtitle')}>${p.subtitle || ''}</div>
        <span class="sf-promo-cta"><span${pe('cta')}>${p.cta || 'Explore'}</span><span class="sf-promo-arrow">↗</span></span>
      </div>
      <div class="sf-promo-art${p.image ? '' : ' sf-promo-art--ph'}">${art}</div>
    </${tag}>`;
}
function _sfPromosSection() {
  const cards = _sfPromos().map((p, i) => _sfPromoCard(p, i)).join('');
  return cards ? `<div class="sf-promos">${cards}</div>` : '';
}

// ── Bold sports landing builders ────────────────────────────
function _hpPickRivalry() {
  try {
    if (typeof _findTopRivalries === 'function') {
      const pool = _findTopRivalries('2026', 'all', 'all', 40).filter(p => ATHLETES[p.id1] && ATHLETES[p.id2]);
      if (pool.length) { const p = pool[Math.floor(Math.random() * pool.length)]; return [ATHLETES[p.id1], ATHLETES[p.id2]]; }
    }
  } catch (e) { /* fall through */ }
  const all = Object.values(ATHLETES).filter(a => (a.prs || []).length);
  if (all.length >= 2) {
    const i = Math.floor(Math.random() * all.length);
    let j = Math.floor(Math.random() * all.length); if (j === i) j = (j + 1) % all.length;
    return [all[i], all[j]];
  }
  return [null, null];
}

function _hpFeatured(A, B, m) {
  if (!A || !B) return '';
  const short = n => n.split(' ').slice(-1)[0];
  const wins = m ? m.wins : 0, losses = m ? m.losses : 0, races = m ? m.races.length : 0;
  const leader = wins > losses ? short(A.name) : losses > wins ? short(B.name) : null;
  const face = (a, side) => `
    <div class="hp-riv-face hp-riv-face--${side}" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <div class="hp-riv-photo" style="background-image:url('${a.photo || '/images/default_card.png'}');background-color:${a.photoBackground || '#1a1a2e'}"></div>
      <div class="hp-riv-name">${a.name}</div>
      <div class="hp-riv-ct">${renderFlag(a.flag)} ${a.country || ''}</div>
    </div>`;
  return `
    <div class="hp-riv-tag"><span>Featured rivalry</span><button class="hp-riv-shuffle" onclick="shuffleHomeRivalry()" title="Shuffle" aria-label="Shuffle rivalry">↻</button></div>
    <div class="hp-riv-body">
      ${face(A, 'a')}
      <span class="hp-riv-vs">VS</span>
      ${face(B, 'b')}
    </div>
    <div class="hp-riv-score"><span class="hp-riv-w hp-riv-w--a${wins >= losses ? ' hp-riv-w--lead' : ''}">${wins}</span><em>–</em><span class="hp-riv-w hp-riv-w--b${losses >= wins ? ' hp-riv-w--lead' : ''}">${losses}</span></div>
    <div class="hp-riv-meta">${races} career meeting${races === 1 ? '' : 's'}${leader ? ` · ${leader} leads` : races ? ' · all square' : ' · yet to meet'}</div>
    <a class="hp-riv-cta" href="h2h.html?a=${encodeURIComponent(A.id)}&b=${encodeURIComponent(B.id)}">See the full head-to-head →</a>`;
}

function _hpHero(A, B, m) {
  return `
    <section class="hp-hero">
      <div class="hp-hero-copy">
        <span class="hp-eyebrow">Distance running, by the numbers</span>
        <h1 class="hp-title">Every rivalry.<br>Every result.<br><span class="hp-title-accent">One place.</span></h1>
        <p class="hp-sub">Head-to-heads, world rankings, and the deep stats behind every runner — from the 800m to the marathon.</p>
        <div class="hp-cta-row">
          <a class="hp-btn hp-btn--primary" href="rankings.html">Explore rankings</a>
          <a class="hp-btn hp-btn--ghost" href="athletes.html">Browse athletes</a>
        </div>
      </div>
      <div class="hp-hero-feature" id="hp-rivalry">${_hpFeatured(A, B, m)}</div>
    </section>`;
}

function _hpTrendCard(c) {
  const a = c.athlete, r = c.result;
  const tag = c.isPB ? 'Personal Best' : c.isDominant ? 'Dominant Win' : 'Major Meet';
  const cls = c.isPB ? 'pb' : c.isDominant ? 'dom' : 'maj';
  return `
    <div class="hp-trend" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <span class="hp-trend-tag hp-trend-tag--${cls}">${tag}</span>
      <div class="hp-trend-ath">${renderFlag(a.flag)}<span>${a.name}</span></div>
      <div class="hp-trend-mark">${r.event.trim()} · <b>${r.time}</b>${r.place ? ` · ${r.place.replace(/\.$/, '')}` : ''}</div>
      <div class="hp-trend-meet">${r.meet}${r.date ? ` · ${r.date}` : ''}</div>
    </div>`;
}

function _hpTrendingSection(items) {
  if (!items || !items.length) return '';
  return `
    <section class="hp-section">
      <div class="hp-sec-hd">
        <h2 class="hp-sec-title">Trending performances</h2>
        <a class="hp-sec-link" href="event-tracker.html">See all →</a>
      </div>
      <div class="hp-trend-grid">${items.map(_hpTrendCard).join('')}</div>
    </section>`;
}

const _HP_TOOLS = [
  { t: 'Head-to-Head', d: 'Compare any two runners, race by race.', href: 'h2h.html', icon: '<path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5"/>' },
  { t: 'World Rankings', d: 'Ranked lists for every event.', href: 'rankings.html', icon: '<path d="M3 3v18h18M8 17V10M13 17V6M18 17v-4"/>' },
  { t: 'Event Tracker', d: 'Season-best leaderboards, live.', href: 'event-tracker.html', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  { t: 'Advanced Metrics', d: 'Strength hexagons & aerobic decay.', href: 'metrics.html', icon: '<polygon points="12 2 21 7 21 17 12 22 3 17 3 7"/>' },
  { t: 'Athletes', d: "Browse every runner's profile.", href: 'athletes.html', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  { t: 'Countries', d: 'Rankings & athletes by nation.', href: 'country.html', icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>' },
];

function _hpToolsSection() {
  const tiles = _HP_TOOLS.map(x => `
    <a class="hp-tool" href="${x.href}">
      <span class="hp-tool-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${x.icon}</svg></span>
      <span class="hp-tool-body">
        <span class="hp-tool-t">${x.t}</span>
        <span class="hp-tool-d">${x.d}</span>
      </span>
      <span class="hp-tool-arrow">→</span>
    </a>`).join('');
  return `
    <section class="hp-section">
      <div class="hp-sec-hd"><h2 class="hp-sec-title">Explore the tools</h2></div>
      <div class="hp-tools-grid">${tiles}</div>
    </section>`;
}

// Re-pick the featured rivalry in place (no reload).
window.shuffleHomeRivalry = function () {
  const [A, B] = _hpPickRivalry();
  const m = (A && B && typeof _computePairMatchup === 'function') ? _computePairMatchup(A.id, B.id) : null;
  const el = document.getElementById('hp-rivalry');
  if (el) el.innerHTML = _hpFeatured(A, B, m);
};

// ══════════════════════════════════════════════════════════════
//  Sofascore-style homepage builders (.sf)
// ══════════════════════════════════════════════════════════════
let _sfEvent = '800m';
let _sfTab = 'leaders';
let _sfLeadPage = 0;
let _sfH2HPage = 0;

function _sfEventList() {
  const order = ['800m', '1500m', '5000m', '10000m'];
  const ks = Object.keys(RANKINGS || {});
  const avail = ks.length ? order.filter(e => ks.includes(e)) : order;
  return avail.length ? avail : order;
}
function _sfEvShort(ev) { return ev; }
function _sfAva(a) {
  return `<span class="sf-ava sf-ava--flag">${renderFlag(a.flag)}</span>`;
}

// ── Hero header card ──
function _sfHero(event) {
  const leaders = (typeof _seasonBestRanking === 'function') ? _seasonBestRanking(event) : [];
  const top = leaders[0];
  const total = Object.keys(ATHLETES).length;
  const holder = top ? `
    <div class="sf-hero-holder" onclick="openAthleteCard('${top.id}',null)" role="button" tabindex="0">
      <div class="sf-hero-holder-lbl">World #1 · ${event}</div>
      <div class="sf-hero-holder-row">
        <span class="sf-hero-trophy">🏆</span>
        <div class="sf-hero-holder-id">
          <span class="sf-hero-holder-name">${top.a.name}</span>
          <span class="sf-hero-holder-time">${top.time}</span>
        </div>
      </div>
    </div>` : '';
  return `
    <section class="sf-hero">
      <div class="sf-hero-main">
        <div class="sf-hero-badge">🏃</div>
        <div class="sf-hero-id">
          <h1 class="sf-hero-title">Distance Running</h1>
          <div class="sf-hero-sub"><b>${total.toLocaleString()}</b> athletes tracked&nbsp;·&nbsp;2026 season</div>
        </div>
      </div>
      ${holder}
    </section>`;
}

// ── Left rail: featured rivalry (like Sofascore "Featured" match) ──
function _sfFeaturedRivalry() {
  const [A, B] = _hpPickRivalry();
  if (!A || !B) return '';
  const m = (typeof _computePairMatchup === 'function') ? _computePairMatchup(A.id, B.id) : null;
  const short = n => n.split(' ').slice(-1)[0];
  const w = m ? m.wins : 0, l = m ? m.losses : 0, races = m ? m.races.length : 0;
  const leader = w > l ? short(A.name) : l > w ? short(B.name) : null;
  return `
    <div class="sf-card sf-featured" id="sf-featured">
      <div class="sf-card-hd"><span>Featured rivalry</span><button class="sf-shuffle" onclick="sfShuffleRivalry()" title="Shuffle" aria-label="Shuffle">↻</button></div>
      <div class="sf-feat-body">
        <div class="sf-feat-side" onclick="openAthleteCard('${A.id}',null)" role="button" tabindex="0">
          ${_sfAva(A)}<div class="sf-feat-name">${short(A.name)}</div><div class="sf-feat-ct">${renderFlag(A.flag)}</div>
        </div>
        <div class="sf-feat-mid">
          <div class="sf-feat-score">${w}<em>-</em>${l}</div>
          <div class="sf-feat-note">${leader ? `${leader} leads` : races ? 'all square' : 'yet to meet'}</div>
        </div>
        <div class="sf-feat-side sf-feat-side--r" onclick="openAthleteCard('${B.id}',null)" role="button" tabindex="0">
          ${_sfAva(B)}<div class="sf-feat-name">${short(B.name)}</div><div class="sf-feat-ct">${renderFlag(B.flag)}</div>
        </div>
      </div>
      <a class="sf-feat-cta" href="h2h.html?a=${encodeURIComponent(A.id)}&b=${encodeURIComponent(B.id)}">${races} career meeting${races === 1 ? '' : 's'} · Full H2H →</a>
    </div>`;
}
window.sfShuffleRivalry = function () {
  const el = document.getElementById('sf-featured');
  if (el) el.outerHTML = _sfFeaturedRivalry();
};

// ── Left rail: upcoming meets (like Sofascore "Games") ──
function _sfMeets() {
  const m = window.STUDIO && window.STUDIO.content && window.STUDIO.content.meets;
  if (Array.isArray(m)) return m;
  return (typeof SITE !== 'undefined' && SITE.upcomingMeets) || [];
}
window._sfCurrentMeets = function () { return _sfMeets(); };
function _sfMeetsCard() {
  const now = Date.now();
  const meets = _sfMeets()
    .filter(m => m.name && m.datetime && new Date(m.datetime) > now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 6);
  const rows = meets.map(m => {
    const d = new Date(m.datetime);
    const days = Math.ceil((d - now) / 86400000);
    const when = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`;
    const date = d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    const inner = `<span class="sf-meet-date">${date}</span><span class="sf-meet-name">${m.name}</span><span class="sf-meet-when">${when}</span>`;
    return m.url
      ? `<a class="sf-meet-row" href="${m.url}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="sf-meet-row">${inner}</div>`;
  }).join('');
  return `
    <div class="sf-card">
      <div class="sf-card-hd"><span>${_sfT('hd.meets','Upcoming meets')}</span></div>
      ${rows ? `<div class="sf-meet-list">${rows}</div>` : '<p class="sf-empty">No meets scheduled.</p>'}
    </div>`;
}

// ── Hero matchup — a manually-chosen featured rivalry (SITE.featuredMatchup):
//    a clean scoreboard (name + flag each side, record in the middle, PB
//    compare row). Falls back to a random top rivalry if no config is set. ──
function _sfHeroMatchup() {
  const _base = (typeof SITE !== 'undefined' && SITE.featuredMatchup) || {};
  const _over = (window.STUDIO && window.STUDIO.content && window.STUDIO.content.featuredMatchup) || {};
  const cfg = Object.assign({}, _base, _over);
  let A = cfg && ATHLETES[cfg.a], B = cfg && ATHLETES[cfg.b];
  if (!A || !B) { const p = _hpPickRivalry(); A = p[0]; B = p[1]; }
  if (!A || !B) return '';
  const event = (cfg && cfg.event) || '';
  const label = (cfg && cfg.label) || 'Rivalry of the week';
  const meet = (cfg && cfg.meet) || '';
  const short = n => n.split(' ').slice(-1)[0];
  const m = (typeof _computePairMatchup === 'function') ? _computePairMatchup(A.id, B.id) : null;
  const w = m ? m.wins : 0, l = m ? m.losses : 0, races = m ? m.races.length : 0;
  const leader = w > l ? short(A.name) : l > w ? short(B.name) : null;
  const recLbl = (leader ? `${leader} leads` : races ? 'all square' : 'first meeting')
    + (races ? ` · ${races} meeting${races === 1 ? '' : 's'}` : '');
  // Photos are supplied via the featured-matchup config (photoA / photoB);
  // NOT pulled from athlete data. Empty slot shows a plain grey box.
  const photoA = cfg && cfg.photoA, photoB = cfg && cfg.photoB;
  const photo = (p, side) =>
    `<div class="sf-mu-photo sf-mu-photo--${side}${p ? '' : ' sf-mu-photo--ph'}">${p ? `<img src="${p}" alt="">` : ''}</div>`;

  const pbA = event ? _sfPbFor(A, event) : null, pbB = event ? _sfPbFor(B, event) : null;
  const sbA = event ? _sfSbFor(A, event) : null, sbB = event ? _sfSbFor(B, event) : null;
  const pbSb = (pb, sb) => `PB ${pb ? pb.t : '—'} · SB ${sb ? sb.t : '—'}`;

  const info = (a, side, pb, sb, rec) => `
    <div class="sf-mu-side sf-mu-side--${side}" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <span class="sf-mu-name">${a.name}</span>
      <span class="sf-mu-sub">${pbSb(pb, sb)}</span>
      <span class="sf-mu-sub">H2H ${rec}</span>
    </div>`;

  return `
    <div class="sf-card sf-card--feature sf-matchup">
      <div class="sf-mu-photos">
        ${photo(photoA, 'a')}
        ${photo(photoB, 'b')}
      </div>
      <div class="sf-mu-info">
        ${info(A, 'a', pbA, sbA, `${w}–${l}`)}
        ${info(B, 'b', pbB, sbB, `${l}–${w}`)}
      </div>
      <a class="sf-mu-cta" href="h2h.html?a=${encodeURIComponent(A.id)}&b=${encodeURIComponent(B.id)}">see H2H data</a>
    </div>`;
}
function _sfPbRank(id, event) {
  const k = _normalizeEvent(event);
  const ranked = Object.entries(ATHLETES)
    .map(([aid, a]) => {
      let best = null;
      (a.prs || []).forEach(p => {
        if (_normalizeEvent(p.event) === k) {
          const s = parseTimeToSecs(p.time);
          if (s != null && (best == null || s < best)) best = s;
        }
      });
      return best == null ? null : { aid, s: best };
    })
    .filter(Boolean)
    .sort((x, y) => x.s - y.s);
  const idx = ranked.findIndex(r => r.aid === id);
  return idx < 0 ? null : idx + 1;
}
function _sfSbFor(a, event) {
  const k = _normalizeEvent(event);
  let best = null;
  (a.results || []).forEach(r => {
    if (_normalizeEvent(r.event) === k) {
      const s = parseTimeToSecs(r.time);
      if (s != null && (best == null || s < best.s)) best = { s, t: r.time };
    }
  });
  return best;
}
function _sfTotalWins(a) {
  let w = 0;
  (a.results || []).forEach(r => { if (parseInt(r.place) === 1 && parseTimeToSecs(r.time) != null) w++; });
  return w;
}

// ── Dark spotlight — performance of the week ──
function _sfSpotlight() {
  const top = _buildTrendingPerformances(1)[0];
  if (!top) return '';
  const a = top.athlete, r = top.result;
  const badge = top.isPB ? 'PB' : top.isDominant ? 'WIN' : 'SB';
  const ev = (r.event || '').trim();
  return `
    <div class="sf-card sf-card--feature sf-spot" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <div class="sf-spot-hd">Performance of the week</div>
      <div class="sf-spot-badges">
        <span class="sf-spot-badge">${badge}</span>
        ${ev ? `<span class="sf-spot-cat">${ev}</span>` : ''}
      </div>
      <div class="sf-spot-time">${r.time}</div>
      <div class="sf-spot-name"><span class="sf-mu-flag">${renderFlag(a.flag)}</span>${a.name}</div>
      <div class="sf-spot-context">${r.meet}${r.date ? ` · ${r.date}` : ''}</div>
    </div>`;
}

// ── Next-meet countdown (hero right stack) ──
function _sfNextMeetCountdown() {
  const now = Date.now();
  const next = _sfMeets()
    .filter(m => m.name && m.datetime && new Date(m.datetime) > now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];
  if (!next) return '';
  const d = new Date(next.datetime);
  const diff = d - now;
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const date = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const loc = next.location || '';
  const cfg = (typeof SITE !== 'undefined' && SITE.featuredMatchup) || null;
  const featured = (cfg && cfg.meet && cfg.meet === next.name && cfg.event) ? `Men's ${cfg.event}` : '';
  const unit = (v, u) => `<span class="sf-next-seg"><b>${v}</b><i>${u}</i></span>`;
  const inner = `
    <div class="sf-next-lbl"><span class="sf-next-dot"></span>Next major meet</div>
    <div class="sf-next-name">${next.name}</div>
    <div class="sf-next-cd">${unit(days, 'D')}${unit(hrs, 'H')}${unit(mins, 'M')}</div>
    <div class="sf-next-foot">
      <span class="sf-next-fi">${date}${loc ? ` · ${loc}` : ''}</span>
      ${featured ? `<span class="sf-next-fi sf-next-fi--feat">Featured: ${featured}</span>` : ''}
    </div>`;
  return next.url
    ? `<a class="sf-card sf-next" href="${next.url}" target="_blank" rel="noopener">${inner}</a>`
    : `<div class="sf-card sf-next">${inner}</div>`;
}

// ── Tools section — each tool with a live, pre-filled example ──
function _sfToolIcon(svg) {
  return `<span class="sf-tool-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg></span>`;
}
const _SF_ICO = {
  h2h: '<path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5"/>',
  hex: '<polygon points="12 2 21 7 21 17 12 22 3 17 3 7"/>',
  evt: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shared: '<path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="9"/>',
};

function _sfToolCards(A, B) {
  const short = n => n.split(' ').slice(-1)[0];
  const metricsReady = typeof MX_EVENTS !== 'undefined' && typeof _mxRadarSvg === 'function';

  // 1) Head-to-Head
  let h2hCard = '';
  if (A && B && typeof _computePairMatchup === 'function') {
    const m = _computePairMatchup(A.id, B.id) || { wins: 0, losses: 0, races: [] };
    const leader = m.wins > m.losses ? short(A.name) : m.losses > m.wins ? short(B.name) : null;
    h2hCard = `
      <div class="sf-card sf-toolc">
        <div class="sf-toolc-hd">${_sfToolIcon(_SF_ICO.h2h)}Head-to-Head</div>
        <div class="sf-toolc-ex">
          <div class="sf-ex-h2h"><span class="sf-ex-nm">${short(A.name)}</span><b class="sf-ex-score">${m.wins}<em>–</em>${m.losses}</b><span class="sf-ex-nm">${short(B.name)}</span></div>
          <div class="sf-ex-sub">${m.races.length} meeting${m.races.length === 1 ? '' : 's'}${leader ? ` · ${leader} leads` : m.races.length ? ' · all square' : ''}</div>
        </div>
        <a class="sf-tool-cta" href="h2h.html?a=${encodeURIComponent(A.id)}&b=${encodeURIComponent(B.id)}">Compare these two →</a>
      </div>`;
  }

  // 2) Strength Hexagon (Metrics)
  let hexCard = '';
  if (A && B && metricsReady) {
    hexCard = `
      <div class="sf-card sf-toolc">
        <div class="sf-toolc-hd">${_sfToolIcon(_SF_ICO.hex)}Strength Hexagon</div>
        <div class="sf-toolc-ex sf-ex-hex">${_mxRadarSvg(A.id, B.id, '#FF5200', '#1A1A1A')}</div>
        <a class="sf-tool-cta" href="metrics.html?a=${encodeURIComponent(A.id)}&b=${encodeURIComponent(B.id)}">Open in Metrics →</a>
      </div>`;
  }

  // 3) Event Tracker — season-best top 3
  let evtCard = '';
  if (typeof _seasonBestRanking === 'function') {
    const ev = '1500m';
    const top = _seasonBestRanking(ev).slice(0, 3);
    evtCard = `
      <div class="sf-card sf-toolc">
        <div class="sf-toolc-hd">${_sfToolIcon(_SF_ICO.evt)}Event Tracker</div>
        <div class="sf-toolc-ex">
          <div class="sf-ex-lbl">${ev} · season best</div>
          ${top.map((r, i) => `<div class="sf-ex-lrow"><span class="sf-rank-n${i === 0 ? ' sf-rank-n--1' : ''}">${i + 1}</span><span class="sf-ex-lnm">${r.a.name}</span><span class="sf-chip">${r.time}</span></div>`).join('')}
        </div>
        <a class="sf-tool-cta" href="event-tracker.html?event=${encodeURIComponent(ev)}">Full leaderboard →</a>
      </div>`;
  }

  // 4) Shared Races
  let sharedCard = '';
  if (A && B && typeof _computeSharedRaces === 'function') {
    const shared = _computeSharedRaces([A.id, B.id]);
    const body = shared.length
      ? shared.slice(0, 3).map(s => {
          const w = ATHLETES[s.entries[0].id];
          return `<div class="sf-ex-lrow"><span class="sf-ex-lnm">${s.event.trim()} · ${s.meet}</span><span class="sf-chip">${w ? short(w.name) : ''} ${s.entries[0].race.time}</span></div>`;
        }).join('')
      : `<div class="sf-ex-sub">${short(A.name)} &amp; ${short(B.name)} haven't shared a race yet.</div>`;
    sharedCard = `
      <div class="sf-card sf-toolc">
        <div class="sf-toolc-hd">${_sfToolIcon(_SF_ICO.shared)}Shared Races</div>
        <div class="sf-toolc-ex">${body}</div>
        <a class="sf-tool-cta" href="h2h.html?a=${encodeURIComponent(A.id)}&b=${encodeURIComponent(B.id)}">Find shared races →</a>
      </div>`;
  }

  return h2hCard + hexCard + evtCard + sharedCard;
}

function _sfToolsSection() {
  const [A, B] = _hpPickRivalry();
  const pair = (A && B) ? ` · ${A.name.split(' ').slice(-1)[0]} vs ${B.name.split(' ').slice(-1)[0]}` : '';
  return `
    <section class="sf-tools-sec">
      <div class="sf-tools-hd"><span>Explore the tools<span class="sf-tools-pair">${pair}</span></span><button class="sf-shuffle" onclick="sfShuffleTools()" title="Shuffle example" aria-label="Shuffle">↻</button></div>
      <div class="sf-tools-grid" id="sf-tools-grid">${_sfToolCards(A, B)}</div>
    </section>`;
}
window.sfShuffleTools = function () {
  const [A, B] = _hpPickRivalry();
  const grid = document.getElementById('sf-tools-grid');
  if (grid) grid.innerHTML = _sfToolCards(A, B);
  const pair = document.querySelector('.sf-tools-pair');
  if (pair && A && B) pair.textContent = ` · ${A.name.split(' ').slice(-1)[0]} vs ${B.name.split(' ').slice(-1)[0]}`;
};

// ── Dense side-rail stat lists ──
function _sfMiniRow(a, chip, rank, chipCls) {
  return `
    <div class="sf-row" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <span class="sf-rank-n${rank === 1 ? ' sf-rank-n--1' : ''}">${rank}</span>
      ${_sfAva(a)}
      <div class="sf-row-id"><span class="sf-row-name">${a.name}</span><span class="sf-row-sub">${a.country || ''}</span></div>
      <span class="sf-chip${chipCls ? ' ' + chipCls : ''}">${chip}</span>
    </div>`;
}

// Most season wins (1st-place finishes across all events).
let _sfWinsPage = 0;
let _sfWinsEv = 'all';
function _sfMostWinsCard() {
  return `
    <div class="sf-card">
      <div class="sf-card-hd"><span>${_sfT('hd.wins','Most wins · 2026')}</span>
        ${_sfDropdown('sf-wins-dd', _sfWinsEv, _sfDistOptions(), 'sfSetWinsEv')}
      </div>
      <div id="sf-wins-body">${_sfMostWinsBody()}</div>
    </div>`;
}
function _sfMostWinsBody() {
  const PAGE = 8;
  const k = _sfWinsEv === 'all' ? null : _normalizeEvent(_sfWinsEv);
  const all = Object.values(ATHLETES).map(a => {
    let w = 0;
    (a.results || []).forEach(r => {
      if (parseInt(r.place) === 1 && parseTimeToSecs(r.time) != null && (!k || _normalizeEvent(r.event) === k)) w++;
    });
    return { a, w };
  }).filter(x => x.w > 0).sort((x, y) => y.w - x.w);
  if (!all.length) return '<p class="sf-empty">No wins recorded for this distance.</p>';
  const pages = Math.ceil(all.length / PAGE);
  if (_sfWinsPage >= pages) _sfWinsPage = 0;
  const start = _sfWinsPage * PAGE;
  const rows = all.slice(start, start + PAGE).map((x, i) => _sfMiniRow(x.a, x.w, start + i + 1)).join('');
  return `<div class="sf-rank">${rows}</div>${_sfPager(pages, _sfWinsPage, 'sfSetWinsPage')}`;
}
window.sfSetWinsPage = function (p) {
  _sfWinsPage = p;
  const b = document.getElementById('sf-wins-body');
  if (b) b.innerHTML = _sfMostWinsBody();
};
window.sfSetWinsEv = function (ev) {
  _sfWinsEv = ev; _sfWinsPage = 0;
  const b = document.getElementById('sf-wins-body');
  if (b) b.innerHTML = _sfMostWinsBody();
};

// Barrier club — how many athletes hold a career PR under each classic mark.
function _sfBarrierCard() {
  const clubs = [
    { label: 'Sub-1:44', ev: '800m', time: '1:44.00' },
    { label: 'Sub-3:30', ev: '1500m', time: '3:30.00' },
    { label: 'Sub-13:00', ev: '5000m', time: '13:00.00' },
    { label: 'Sub-27:00', ev: '10000m', time: '27:00.00' },
  ].map(c => {
    const lim = parseTimeToSecs(c.time);
    const n = Object.values(ATHLETES).filter(a => {
      const k = _normalizeEvent(c.ev);
      let best = null;
      (a.prs || []).forEach(p => { if (_normalizeEvent(p.event) === k) { const s = parseTimeToSecs(p.time); if (s != null && (best == null || s < best)) best = s; } });
      return best != null && best < lim;
    }).length;
    return { ...c, n };
  });
  const max = Math.max(1, ...clubs.map(c => c.n));
  const rows = clubs.map(c => {
    const href = `athletes.html?prEvent=${encodeURIComponent(c.ev)}&prTime=${encodeURIComponent(c.time)}`;
    return `
      <a class="sf-bar-row" href="${href}">
        <span class="sf-bar-lbl">${c.label}<span class="sf-bar-ev">${c.ev}</span></span>
        <span class="sf-bar-track"><span class="sf-bar-fill" style="width:${Math.round(c.n / max * 100)}%"></span></span>
        <span class="sf-bar-n">${c.n}</span>
      </a>`;
  }).join('');
  return `
    <div class="sf-card">
      <div class="sf-card-hd"><span>${_sfT('hd.barrier','Barrier club')}</span></div>
      <div class="sf-bar-list">${rows}</div>
    </div>`;
}

// ── Custom dropdown (styled to match the site, not a native <select>) ──
function _sfDistOptions() {
  return [['all', 'All distances'], ['800m', '800m'], ['1500m', '1500m'], ['mile', 'Mile'], ['3000m', '3000m'], ['5000m', '5000m'], ['10000m', '10,000m']];
}
function _sfDropdown(id, value, options, fn) {
  const cur = options.find(o => o[0] === value) || options[0];
  return `<div class="sf-dd" id="${id}" data-fn="${fn}">
    <button type="button" class="sf-dd-btn" onclick="sfDdToggle('${id}')" aria-haspopup="listbox">
      <span class="sf-dd-val">${cur[1]}</span><span class="sf-dd-caret">▾</span>
    </button>
    <div class="sf-dd-menu" role="listbox">
      ${options.map(o => `<button type="button" class="sf-dd-opt${o[0] === value ? ' active' : ''}" data-val="${o[0]}" data-label="${o[1]}" onclick="sfDdPick('${id}','${o[0]}')">${o[1]}</button>`).join('')}
    </div>
  </div>`;
}
window.sfDdToggle = function (id) {
  const dd = document.getElementById(id);
  const willOpen = !dd.classList.contains('open');
  document.querySelectorAll('.sf-dd.open').forEach(d => d.classList.remove('open'));
  if (willOpen) dd.classList.add('open');
};
window.sfDdPick = function (id, val) {
  const dd = document.getElementById(id);
  const opt = dd.querySelector(`.sf-dd-opt[data-val="${val}"]`);
  dd.querySelector('.sf-dd-val').textContent = opt.dataset.label;
  dd.querySelectorAll('.sf-dd-opt').forEach(o => o.classList.toggle('active', o.dataset.val === val));
  dd.classList.remove('open');
  const fn = dd.dataset.fn;
  if (typeof window[fn] === 'function') window[fn](val);
};
if (!window._sfDdWired) {
  window._sfDdWired = true;
  document.addEventListener('click', e => {
    if (!e.target.closest('.sf-dd')) document.querySelectorAll('.sf-dd.open').forEach(d => d.classList.remove('open'));
  });
}

// Trending performances (recent standout marks), dense list.
// Recent performances — filterable by distance, paginated.
let _sfRecentEv = 'all';
function _sfRecentRowsHtml(items, start = 0) {
  if (!items.length) return '<p class="sf-empty">Nothing recent for this distance.</p>';
  return items.map((c, i) => {
    const a = c.athlete, r = c.result;
    const badge = c.isPB ? '<span class="sf-badge sf-badge--pb">PB</span>'
      : c.isDominant ? '<span class="sf-badge sf-badge--win">W</span>' : '';
    return `
      <div class="sf-row" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
        <span class="sf-rank-n">${start + i + 1}</span>
        ${_sfAva(a)}
        <div class="sf-row-id"><span class="sf-row-name">${a.name}</span><span class="sf-row-sub">${r.event.trim()} · ${r.meet}${r.date ? ` · ${r.date}` : ''}</span></div>
        <span class="sf-recent-end">${badge}<span class="sf-chip">${r.time}</span></span>
      </div>`;
  }).join('');
}
let _sfRecentPage = 0;
function _sfRecentCard() {
  return `
    <div class="sf-card">
      <div class="sf-card-hd"><span>${_sfT('hd.recent','Recent performances')}</span>
        ${_sfDropdown('sf-recent-dd', _sfRecentEv, _sfDistOptions(), 'sfRecentSort')}
      </div>
      <div id="sf-recent-body">${_sfRecentBody()}</div>
    </div>`;
}
function _sfRecentBody() {
  const PAGE = 8;
  const all = _buildTrendingPerformances(500, _sfRecentEv === 'all' ? null : _sfRecentEv);
  const pages = Math.ceil(all.length / PAGE);
  if (_sfRecentPage >= pages) _sfRecentPage = 0;
  const start = _sfRecentPage * PAGE;
  const items = all.slice(start, start + PAGE);
  return `<div class="sf-rank">${_sfRecentRowsHtml(items, start)}</div>${_sfPager(pages, _sfRecentPage, 'sfSetRecentPage')}`;
}
function _sfRenderRecent() {
  const b = document.getElementById('sf-recent-body');
  if (b) b.innerHTML = _sfRecentBody();
}
window.sfRecentSort = function (ev) { _sfRecentEv = ev; _sfRecentPage = 0; _sfRenderRecent(); };
window.sfSetRecentPage = function (p) { _sfRecentPage = p; _sfRenderRecent(); };

// ── Center: main tabbed card (like Sofascore Standings/Stats) ──
function _sfH2HLeaders(event) {
  if (typeof _computeAllH2HRecords !== 'function') return [];
  const min = typeof _H2H_MIN_RACES !== 'undefined' ? _H2H_MIN_RACES : 3;
  const { records } = _computeAllH2HRecords('2026', event, 'all', 'all');
  return Object.entries(records)
    .filter(([, r]) => r.wins + r.losses >= min)
    .sort((a, b) => (typeof _wilsonScore === 'function'
      ? _wilsonScore(b[1].wins, b[1].wins + b[1].losses) - _wilsonScore(a[1].wins, a[1].wins + a[1].losses)
      : 0) || b[1].wins - a[1].wins)
    .map(([id, r]) => ({ id, a: ATHLETES[id], wins: r.wins, losses: r.losses }))
    .filter(x => x.a);
}

function _sfLeaderRow(r, rank) {
  return `
    <div class="sf-row" onclick="openAthleteCard('${r.id}',null)" role="button" tabindex="0">
      <span class="sf-rank-n${rank === 1 ? ' sf-rank-n--1' : ''}">${rank}</span>
      ${_sfAva(r.a)}
      <div class="sf-row-id"><span class="sf-row-name">${r.a.name}</span><span class="sf-row-sub">${r.a.country || ''}</span></div>
      <span class="sf-chip">${r.time}</span>
    </div>`;
}
function _sfH2HRow(r, rank) {
  return `
    <div class="sf-row" onclick="openAthleteCard('${r.id}',null)" role="button" tabindex="0">
      <span class="sf-rank-n${rank === 1 ? ' sf-rank-n--1' : ''}">${rank}</span>
      ${_sfAva(r.a)}
      <div class="sf-row-id"><span class="sf-row-name">${r.a.name}</span><span class="sf-row-sub">${r.a.country || ''}</span></div>
      <span class="sf-chip sf-chip--rec">${r.wins}<em>–</em>${r.losses}</span>
    </div>`;
}
function _sfTrendRow(c, rank) {
  const a = c.athlete, r = c.result;
  const tag = c.isPB ? 'PB' : c.isDominant ? 'WIN' : 'MAJOR';
  return `
    <div class="sf-row" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <span class="sf-rank-n${rank === 1 ? ' sf-rank-n--1' : ''}">${rank}</span>
      ${_sfAva(a)}
      <div class="sf-row-id"><span class="sf-row-name">${a.name}</span><span class="sf-row-sub">${r.event.trim()} · ${r.meet}</span></div>
      <span class="sf-chip">${r.time}</span>
    </div>`;
}

// Per-athlete season stats for the leaders table.
function _sfPbFor(a, event) {
  const k = _normalizeEvent(event);
  let best = null;
  (a.prs || []).forEach(p => {
    if (_normalizeEvent(p.event) === k) {
      const s = parseTimeToSecs(p.time);
      if (s != null && (best == null || s < best.s)) best = { s, t: p.time };
    }
  });
  return best;
}
function _sfSeasonCountFor(a, event) {
  const k = _normalizeEvent(event);
  let races = 0, wins = 0;
  (a.results || []).forEach(r => {
    if (_normalizeEvent(r.event) === k && parseTimeToSecs(r.time) != null) {
      races++;
      if (parseInt(r.place) === 1) wins++;
    }
  });
  return { races, wins };
}
function _sfRecordsMap(event) {
  if (typeof _computeAllH2HRecords !== 'function') return {};
  try { return _computeAllH2HRecords('2026', event, 'all', 'all').records || {}; } catch (e) { return {}; }
}
// Last 5 races in the event this season, oldest→newest, classed by finish
// (Sofascore "Last 5" form guide): win / podium / ran / did-not-finish.
const _SF_NF = new Set(['DNF', 'DNS', 'DQ', 'NM', 'NH', 'DSQ']);
function _sfFormFor(a, event) {
  const k = _normalizeEvent(event);
  const races = (a.results || [])
    .filter(r => _normalizeEvent(r.event) === k && r.date && (r.time || r.place));
  races.sort((x, y) => _trendParseDate(x.date) - _trendParseDate(y.date));
  return races.slice(-5).map(r => {
    if (_SF_NF.has(String(r.time || '').toUpperCase())) return { label: '', cls: 'd' };
    const p = parseInt(r.place);
    if (!isNaN(p)) return { label: String(p), cls: p === 1 ? 'w' : p <= 3 ? 'p' : 'o' };
    return { label: '·', cls: 'o' };
  });
}
function _sfAthCell(a) {
  return `<span class="sf-tc-ath">${_sfAva(a)}<span class="sf-tc-id"><span class="sf-row-name">${a.name}</span><span class="sf-row-sub">${a.country || ''}</span></span></span>`;
}

// Season leaders — a dense multi-column stats table (Sofascore player-stats style).
function _sfLeadersTable(event) {
  const all = (typeof _seasonBestRanking === 'function' ? _seasonBestRanking(event) : []);
  if (!all.length) return `<p class="sf-empty">No season marks yet for ${event}.</p>`;
  const PAGE = 10;
  const pages = Math.ceil(all.length / PAGE);
  if (_sfLeadPage >= pages) _sfLeadPage = 0;
  const start = _sfLeadPage * PAGE;
  const sb = all.slice(start, start + PAGE);
  const recs = _sfRecordsMap(event);
  const th = lbl => `<span class="sf-th-c">${lbl}</span>`;
  const head = `<div class="sf-thead sf-table-row sf-table-row--lead">
    <span class="sf-th-hash">#</span>
    <span></span>
    <span class="sf-th-name">Name</span>
    ${th('SB')}${th('PB')}${th('Races')}${th('1st')}${th('H2H')}
  </div>`;
  const rows = sb.map((r, i) => {
    const pb = _sfPbFor(r.a, event);
    const c = _sfSeasonCountFor(r.a, event);
    const rec = recs[r.id];
    return `<div class="sf-trow sf-table-row sf-table-row--lead${(start + i) < 3 ? ' sf-trow--top' : ''}" onclick="openAthleteCard('${r.id}',null)" role="button" tabindex="0">
      <span class="sf-tc-rank">${start + i + 1}</span>
      <span class="sf-tc-flag">${renderFlag(r.a.flag)}</span>
      <span class="sf-tc-name">${r.a.name}</span>
      <span class="sf-tc-sb"><span class="sf-chip">${r.time}</span></span>
      <span class="sf-tc-num">${pb ? pb.t : '—'}</span>
      <span class="sf-tc-num">${c.races || '—'}</span>
      <span class="sf-tc-num">${c.wins || '—'}</span>
      <span class="sf-tc-num">${rec ? `${rec.wins}-${rec.losses}` : '—'}</span>
    </div>`;
  }).join('');
  return `<div class="sf-table sf-table--lead sf-gcols">${head}${rows}</div>${_sfPager(pages, _sfLeadPage, 'sfSetLeadPage')}`;
}

// Numbered pager (‹ 1 2 … N ›). `fn` = global handler name for a page click.
function _sfPager(pages, cur, fn) {
  if (pages <= 1) return '';
  const btn = (p, label, opts = {}) =>
    `<button class="sf-pg${opts.active ? ' active' : ''}" ${opts.disabled ? 'disabled' : ''} onclick="${fn}(${p})">${label}</button>`;
  const nums = [];
  const add = p => nums.push(btn(p, p + 1, { active: p === cur }));
  const ell = () => nums.push('<span class="sf-pg-ell">…</span>');
  if (pages <= 7) { for (let p = 0; p < pages; p++) add(p); }
  else {
    add(0);
    if (cur > 2) ell();
    const s = Math.max(1, cur - 1), e = Math.min(pages - 2, cur + 1);
    for (let p = s; p <= e; p++) add(p);
    if (cur < pages - 3) ell();
    add(pages - 1);
  }
  const prev = btn(Math.max(0, cur - 1), '‹', { disabled: cur === 0 });
  const next = btn(Math.min(pages - 1, cur + 1), '›', { disabled: cur === pages - 1 });
  return `<div class="sf-pager">${prev}${nums.join('')}${next}</div>`;
}
window.sfSetLeadPage = function (p) {
  _sfLeadPage = p;
  const body = document.getElementById('sf-main-body');
  if (body) body.innerHTML = _sfBody(_sfTab, _sfEvent);
};
window.sfSetH2HPage = function (p) {
  _sfH2HPage = p;
  const body = document.getElementById('sf-main-body');
  if (body) body.innerHTML = _sfBody(_sfTab, _sfEvent);
};

// Trending — table with mark, event, meet.
function _sfTrendingTable() {
  const items = _buildTrendingPerformances(16);
  if (!items.length) return '<p class="sf-empty">Nothing notable in the last 30 days.</p>';
  const head = `<div class="sf-thead sf-table-row sf-table-row--trend"><span>#</span><span class="sf-tc-ath">Athlete</span><span>Mark</span><span>Event</span><span>Meet</span></div>`;
  const rows = items.map((c, i) => {
    const a = c.athlete, r = c.result;
    return `<div class="sf-trow sf-table-row sf-table-row--trend" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <span class="sf-tc-rank">${i + 1}</span>
      ${_sfAthCell(a)}
      <span class="sf-tc-sb"><span class="sf-chip">${r.time}</span></span>
      <span class="sf-tc-num sf-tc-l">${r.event.trim()}</span>
      <span class="sf-tc-meet">${r.meet}</span>
    </div>`;
  }).join('');
  return `<div class="sf-table sf-table--trend">${head}${rows}</div>`;
}

// H2H leaders — table with W, L, Win%, meetings.
function _sfH2HTable(event) {
  const all = _sfH2HLeaders(event);
  if (!all.length) return '<p class="sf-empty">No head-to-head records yet for ' + event + '.</p>';
  const PAGE = 10;
  const pages = Math.ceil(all.length / PAGE);
  if (_sfH2HPage >= pages) _sfH2HPage = 0;
  const start = _sfH2HPage * PAGE;
  const list = all.slice(start, start + PAGE);
  const th = lbl => `<span class="sf-th-c">${lbl}</span>`;
  const head = `<div class="sf-thead sf-table-row sf-table-row--h2h">
    <span class="sf-th-hash">#</span>
    <span></span>
    <span class="sf-th-name">Name</span>
    ${th('W')}${th('L')}${th('Win%')}${th('Meets')}
  </div>`;
  const rows = list.map((r, i) => {
    const tot = r.wins + r.losses, pct = tot ? Math.round(r.wins / tot * 100) : 0;
    return `<div class="sf-trow sf-table-row sf-table-row--h2h${(start + i) < 3 ? ' sf-trow--top' : ''}" onclick="openAthleteCard('${r.id}',null)" role="button" tabindex="0">
      <span class="sf-tc-rank">${start + i + 1}</span>
      <span class="sf-tc-flag">${renderFlag(r.a.flag)}</span>
      <span class="sf-tc-name">${r.a.name}</span>
      <span class="sf-tc-num">${r.wins}</span>
      <span class="sf-tc-num">${r.losses}</span>
      <span class="sf-tc-sb"><span class="sf-chip">${pct}%</span></span>
      <span class="sf-tc-num">${tot}</span>
    </div>`;
  }).join('');
  return `<div class="sf-table sf-table--h2h sf-gcols">${head}${rows}</div>${_sfPager(pages, _sfH2HPage, 'sfSetH2HPage')}`;
}

function _sfBody(tab, event) {
  if (tab === 'trending') return _sfTrendingTable();
  if (tab === 'h2h') return _sfH2HTable(event);
  return _sfLeadersTable(event);
}

function _sfCenterCard(event) {
  const pills = _sfEventList().map(ev =>
    `<button class="sf-pill${ev === event ? ' active' : ''}" data-ev="${ev}" onclick="sfSetEvent('${ev}')">${_sfEvShort(ev)}</button>`).join('');
  const tab = (t, label) => `<button class="sf-tab${t === _sfTab ? ' active' : ''}" data-tab="${t}" onclick="sfSetTab('${t}')">${label}</button>`;
  return `
    <div class="sf-card sf-main">
      <div class="sf-tabs" id="sf-tabs">
        ${tab('leaders', 'Season Leaders')}
        ${tab('h2h', 'H2H Leaders')}
      </div>
      <div class="sf-pillrow" id="sf-pillrow">${pills}</div>
      <div class="sf-main-body" id="sf-main-body">${_sfBody(_sfTab, event)}</div>
    </div>`;
}
window.sfSetEvent = function (ev) {
  _sfEvent = ev;
  _sfLeadPage = 0; _sfH2HPage = 0;
  document.querySelectorAll('#sf-pillrow .sf-pill').forEach(p => p.classList.toggle('active', p.dataset.ev === ev));
  const body = document.getElementById('sf-main-body');
  if (body) body.innerHTML = _sfBody(_sfTab, ev);
};
window.sfSetTab = function (t) {
  _sfTab = t;
  _sfLeadPage = 0; _sfH2HPage = 0;
  document.querySelectorAll('#sf-tabs .sf-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === t));
  const body = document.getElementById('sf-main-body');
  if (body) body.innerHTML = _sfBody(t, _sfEvent);
};

// ── Right rail: dark spotlight + latest news ──
function _sfSpotlightCard() {
  const top = _buildTrendingPerformances(1)[0];
  if (!top) return '';
  const a = top.athlete, r = top.result;
  const tag = top.isPB ? 'Personal Best' : top.isDominant ? 'Dominant Win' : 'Major Meet';
  return `
    <div class="sf-card sf-spot" onclick="openAthleteCard('${a.id}',null)" role="button" tabindex="0">
      <div class="sf-spot-foot">Performance of the week</div>
      <div class="sf-spot-tag">${tag}</div>
      <div class="sf-spot-time">${r.time}</div>
      <div class="sf-spot-name">${renderFlag(a.flag)} ${a.name}</div>
      <div class="sf-spot-meta">${r.event.trim()} · ${r.meet}${r.date ? ` · ${r.date}` : ''}</div>
    </div>`;
}
function _sfLatestCard() {
  const arts = (ARTICLES || []).slice(0, 5);
  const rows = arts.map(a => {
    const dest = a.type === 'rankings'
      ? `rankings.html${a.rankingsEvent ? '?event=' + encodeURIComponent(a.rankingsEvent) : ''}`
      : `article.html?id=${a.id}`;
    return `<div class="sf-news-row" onclick="goTo('${dest}')" role="button" tabindex="0">
      <span class="sf-news-cat">${a.category || 'News'}</span>
      <span class="sf-news-hed">${a.title}</span>
    </div>`;
  }).join('');
  return `
    <div class="sf-card">
      <div class="sf-card-hd"><span>Latest</span><a href="articles.html" class="sf-card-link">All →</a></div>
      <div class="sf-news-list">${rows || '<p class="sf-empty">No news yet.</p>'}</div>
    </div>`;
}

// ── Homepage inline live search ─────────────────────────────
// Types straight into the hero box; results drop down below it. Reuses the
// site-wide index (_buildSearchResultsHtml, modals.js) so it stays in sync with
// the overlay search everywhere else — no parallel index to maintain.
window.homeSearch = function(query) {
  const wrap = document.getElementById('home-search');
  const results = document.getElementById('home-search-results');
  if (!wrap || !results) return;
  const q = (query || '').trim();
  if (!q) { results.innerHTML = ''; wrap.classList.remove('open'); return; }
  // Natural-language "smart" answer first (H2H, leaderboards, barriers,
  // country filters), then the normal substring index below it.
  const answer = typeof _smartSearchAnswer === 'function' ? _smartSearchAnswer(q) : '';
  let base = typeof _buildSearchResultsHtml === 'function' ? _buildSearchResultsHtml(q) : '';
  // When we have a smart answer, don't also show the base "no results" empty
  // state below it (it reads as a contradiction under a successful answer).
  if (answer && base.includes('search-no-results')) base = '';
  results.innerHTML = answer + base;
  wrap.classList.add('open');
};

// Clicking a "try" chip fills the box and runs the search.
window.homeSearchFill = function(q) {
  const inp = document.querySelector('#home-search .hsh-input');
  if (!inp) return;
  inp.value = q;
  inp.focus();
  window.homeSearch(q);
};

// ── Natural-language "smart" search (rule-based intent parser) ──────────────
// Maps a typed phrase onto one of the site's existing query primitives
// (_computePairMatchup, _seasonBestRanking, PR filtering, country filtering)
// and renders an inline answer card. Deterministic, client-side, no network.
// Falls back silently (returns '') so the normal substring index still shows.

// Event vocabulary — longer/higher distances first so "10000" isn't caught by
// a "1000"/"100" rule and "1500" isn't caught by "500".
const _SS_EVENTS = [
  { re: /\b10[\s,]?000\s*m?\b|\b10\s?k\b/, ev: '10000m', label: '10,000m' },
  { re: /\b5[\s,]?000\s*m?\b|\b5\s?k\b/,   ev: '5000m',  label: '5000m' },
  { re: /\b3[\s,]?000\s*m?\b|\b3\s?k\b/,   ev: '3000m',  label: '3000m' },
  { re: /\b1500\s*m?\b/,                    ev: '1500m',  label: '1500m' },
  { re: /\bmile\b/,                         ev: 'Mile',   label: 'Mile' },
  { re: /\b800\s*m?\b/,                     ev: '800m',   label: '800m' },
  { re: /\b400\s*m?\b/,                     ev: '400m',   label: '400m' },
];
function _ssDetectEvent(q) { for (const e of _SS_EVENTS) if (e.re.test(q)) return e; return null; }

// Country / demonym vocabulary (values must match ATHLETES[].country strings).
const _SS_COUNTRIES = {
  'united states': 'United States', 'usa': 'United States', 'us': 'United States', 'american': 'United States', 'americans': 'United States',
  'kenya': 'Kenya', 'kenyan': 'Kenya', 'kenyans': 'Kenya',
  'france': 'France', 'french': 'France',
  'australia': 'Australia', 'australian': 'Australia', 'aussie': 'Australia', 'aussies': 'Australia',
  'spain': 'Spain', 'spanish': 'Spain',
  'ireland': 'Ireland', 'irish': 'Ireland',
  'great britain': 'Great Britain', 'britain': 'Great Britain', 'british': 'Great Britain', 'gb': 'Great Britain', 'uk': 'Great Britain', 'england': 'Great Britain', 'english': 'Great Britain',
  'norway': 'Norway', 'norwegian': 'Norway', 'norwegians': 'Norway',
  'netherlands': 'Netherlands', 'dutch': 'Netherlands', 'holland': 'Netherlands',
  'canada': 'Canada', 'canadian': 'Canada',
  'japan': 'Japan', 'japanese': 'Japan',
  'ethiopia': 'Ethiopia', 'ethiopian': 'Ethiopia', 'ethiopians': 'Ethiopia',
  'new zealand': 'New Zealand', 'kiwi': 'New Zealand',
  'germany': 'Germany', 'german': 'Germany',
  'italy': 'Italy', 'italian': 'Italy',
  'belgium': 'Belgium', 'belgian': 'Belgium',
  'uganda': 'Uganda', 'ugandan': 'Uganda',
  'morocco': 'Morocco', 'moroccan': 'Morocco',
};
function _ssDetectCountry(q) {
  const keys = Object.keys(_SS_COUNTRIES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (new RegExp('\\b' + k.replace(/ /g, '\\s+') + '\\b').test(q)) return _SS_COUNTRIES[k];
  }
  return null;
}

// Resolve a free-text fragment to a single athlete (full name, contains, or
// all-tokens/last-name match; prefers the most specific = shortest name).
function _ssResolveAthlete(str) {
  const s = (str || '').trim().toLowerCase().replace(/[?.!]+$/, '');
  if (s.length < 2 || typeof ATHLETES === 'undefined') return null;
  const all = Object.values(ATHLETES);
  let m = all.filter(a => a.name.toLowerCase() === s);
  if (m.length) return m[0];
  m = all.filter(a => a.name.toLowerCase().includes(s));
  if (m.length) return m.sort((a, b) => a.name.length - b.name.length)[0];
  const toks = s.split(/\s+/);
  m = all.filter(a => { const n = a.name.toLowerCase(); return toks.every(t => n.includes(t)); });
  if (m.length) return m.sort((a, b) => a.name.length - b.name.length)[0];
  return null;
}

// Best PR (seconds + display) for an athlete at a given event, or null.
function _ssBestPr(a, ev) {
  const prs = (a.prs || [])
    .filter(p => _normalizeEvent(p.event) === _normalizeEvent(ev) && parseTimeToSecs(p.time) != null)
    .map(p => ({ secs: parseTimeToSecs(p.time), time: p.time }))
    .sort((x, y) => x.secs - y.secs);
  return prs[0] || null;
}

// ── Shared row/wrapper renderers ──
function _ssAthleteRow(a, right) {
  const photo = a.photo || '/images/default_card.png';
  const bg = a.photoBackground || '#111';
  return `<div class="search-result-item search-result-athlete" onclick="openAthleteCard('${a.id}',null);closeSearch();">
    <div class="search-ath-avatar" style="background-image:url('${photo}');background-color:${bg}"></div>
    <div class="search-ath-info">
      <div class="search-result-title">${a.name}</div>
      <div class="search-result-meta">${renderFlag(a.flag)} ${a.country || ''}</div>
    </div>
    ${right ? `<div class="ss-row-right">${right}</div>` : ''}
  </div>`;
}
function _ssWrap(kicker, bodyHtml, ctaText, ctaHref) {
  return `<div class="ss-answer">
    <div class="ss-answer-kicker">${kicker}</div>
    <div class="ss-answer-body">${bodyHtml}</div>
    ${ctaHref ? `<a class="ss-answer-cta" href="${ctaHref}">${ctaText} →</a>` : ''}
  </div>`;
}

// ── The router ──
function _smartSearchAnswer(raw) {
  const q = (raw || '').trim();
  if (q.length < 3 || typeof ATHLETES === 'undefined') return '';
  const ql = q.toLowerCase();
  try {
    // 1) Head-to-head: "X vs Y", "X versus Y", "X v Y", "X against Y"
    const sides = ql.split(/\s+(?:vs\.?|versus|v\.?|against)\s+/);
    if (sides.length === 2 && typeof _computePairMatchup === 'function') {
      const a1 = _ssResolveAthlete(sides[0]), a2 = _ssResolveAthlete(sides[1]);
      if (a1 && a2 && a1.id !== a2.id) {
        const m = _computePairMatchup(a1.id, a2.id) || { wins: 0, losses: 0, races: [] };
        const short = n => n.split(' ').slice(-1)[0];
        const leader = m.wins > m.losses ? short(a1.name) : m.losses > m.wins ? short(a2.name) : null;
        const body = `
          <div class="ss-h2h">
            <div class="ss-h2h-row">
              <span class="ss-h2h-dot" style="background:var(--brand)"></span>
              <span class="ss-h2h-name">${a1.name}</span>
              <span class="ss-h2h-wins${m.wins >= m.losses ? ' ss-h2h-wins--lead' : ''}">${m.wins}</span>
            </div>
            <div class="ss-h2h-row">
              <span class="ss-h2h-dot" style="background:#1A1A1A"></span>
              <span class="ss-h2h-name">${a2.name}</span>
              <span class="ss-h2h-wins${m.losses >= m.wins ? ' ss-h2h-wins--lead' : ''}">${m.losses}</span>
            </div>
          </div>
          <div class="ss-h2h-meta">${m.races.length} career meeting${m.races.length === 1 ? '' : 's'}${leader ? ` · ${leader} leads` : m.races.length ? ' · all square' : ' · never raced'}</div>`;
        const href = `h2h.html?a=${encodeURIComponent(a1.id)}&b=${encodeURIComponent(a2.id)}`;
        return _ssWrap('Head-to-Head', body, 'Open full head-to-head', href);
      }
    }

    const evt = _ssDetectEvent(ql);
    const country = _ssDetectCountry(ql);

    // 2) Barrier / threshold: "sub 3:30", "under 13:00 5000m", "who's run below 1:44"
    const bm = ql.match(/\b(?:sub|under|below)\s*[-\s]?(\d{1,2}(?::\d{2})?(?:[.:]\d{1,2})?)/);
    if (bm) {
      const secs = parseTimeToSecs(bm[1]);
      if (secs) {
        const e = evt || _ssInferEventFromTime(secs);
        const list = Object.values(ATHLETES).map(a => {
          const pr = _ssBestPr(a, e.ev);
          return pr && pr.secs < secs ? { a, pr } : null;
        }).filter(Boolean).sort((x, y) => x.pr.secs - y.pr.secs);
        const rows = list.slice(0, 6).map(r => _ssAthleteRow(r.a, `<span class="ss-time">${r.pr.time}</span>`)).join('');
        const body = `<div class="ss-count">${list.length} athlete${list.length === 1 ? '' : 's'} with a ${e.label} PR under ${bm[1]}${evt ? '' : ` <span class="ss-guess">(assumed ${e.label})</span>`}</div>${rows || '<div class="ss-none">No one in the database yet.</div>'}`;
        const href = `athletes.html?prEvent=${encodeURIComponent(e.ev)}&prTime=${encodeURIComponent(bm[1])}`;
        return _ssWrap('Barrier Club', body, 'See all in Multi-PR Search', href);
      }
    }

    // 3) Leaderboard: "fastest 1500m", "best 5000m", "top 800m", "1500m leaders"
    const wantsBoard = /\b(fastest|quickest|best|top|leaders?|ranking|rankings)\b/.test(ql);
    if (wantsBoard && evt && typeof _seasonBestRanking === 'function') {
      let list = _seasonBestRanking(evt.ev);
      let scope = '';
      if (country) { list = list.filter(r => r.a.country === country); scope = ` (${country})`; }
      const rows = list.slice(0, 6).map(r => _ssAthleteRow(r.a, `<span class="ss-time">${r.time}</span>`)).join('');
      const body = `<div class="ss-count">Season leaders · ${evt.label}${scope}</div>${rows || '<div class="ss-none">No season marks yet.</div>'}`;
      const href = `event-tracker.html?event=${encodeURIComponent(evt.ev)}`;
      return _ssWrap('Leaderboard', body, 'Open Event Tracker', href);
    }

    // 4) Country filter: "Kenyan runners", "athletes from Norway", "Norwegian 1500m"
    if (country) {
      let members = Object.values(ATHLETES).filter(a => a.country === country);
      let rows;
      if (evt) {
        members = members.map(a => { const pr = _ssBestPr(a, evt.ev); return pr ? { a, pr } : null; })
          .filter(Boolean).sort((x, y) => x.pr.secs - y.pr.secs);
        rows = members.slice(0, 6).map(r => _ssAthleteRow(r.a, `<span class="ss-time">${r.pr.time}</span>`)).join('');
      } else {
        members = members.sort((a, b) => a.name.localeCompare(b.name)).map(a => ({ a }));
        rows = members.slice(0, 6).map(r => _ssAthleteRow(r.a)).join('');
      }
      if (members.length) {
        const body = `<div class="ss-count">${members.length} athlete${members.length === 1 ? '' : 's'} from ${country}${evt ? ` · ${evt.label}` : ''}</div>${rows}`;
        return _ssWrap('By Country', body, `Explore ${country}`, `country.html`);
      }
    }
  } catch (e) { /* fall through to plain search */ }
  return '';
}

// Rough winning-time brackets so a bare "sub 3:30" (no event) still resolves.
// Transparently labeled in the UI as an assumption.
function _ssInferEventFromTime(secs) {
  if (secs < 110) return { ev: '800m', label: '800m' };     // < 1:50
  if (secs < 260) return { ev: '1500m', label: '1500m' };   // < 4:20
  if (secs < 300) return { ev: 'Mile', label: 'Mile' };     // 4:20–5:00
  if (secs < 560) return { ev: '3000m', label: '3000m' };   // < 9:20
  if (secs < 960) return { ev: '5000m', label: '5000m' };   // < 16:00
  return { ev: '10000m', label: '10000m' };
}

// Close the dropdown on outside click (registered once).
if (!window._homeSearchOutsideClick) {
  window._homeSearchOutsideClick = true;
  document.addEventListener('click', e => {
    const wrap = document.getElementById('home-search');
    if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
  });
  // "/" focuses the search (hero box if present, else the navbar search); Esc clears.
  document.addEventListener('keydown', e => {
    const inp = document.querySelector('#home-search .hsh-input') || document.querySelector('.navbar-search-input');
    if (!inp) return;
    const typingElsewhere = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (e.key === '/' && !typingElsewhere) { e.preventDefault(); inp.focus(); }
    else if (e.key === 'Escape' && document.activeElement === inp) { inp.value = ''; inp.blur(); }
  });
}

// Hover tooltips for the homepage metric previews (Skill Hexagon + Aerobic
// Decay). Mirrors the metrics-page delegation: one shared #mx-tooltip on
// <body> (not inside #main, which carries a fade-in transform that would break
// position:fixed), with mousemove delegated per chart container.
function _homeWireChartTooltips() {
  const zones = qsa('.dash-hex-svg, .dash-aero-svg');
  if (!zones.length) return;
  let tip = document.getElementById('mx-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'mx-tooltip';
    tip.className = 'mx-tooltip';
    document.body.appendChild(tip);
  }
  zones.forEach(zone => {
    zone.addEventListener('mousemove', e => {
      const t = document.getElementById('mx-tooltip'); if (!t) return;
      const el = e.target.closest('[data-tip]');
      if (!el) { t.classList.remove('show'); return; }
      t.textContent = el.getAttribute('data-tip');
      t.classList.add('show');
      const pad = 14;
      let x = e.clientX + pad, y = e.clientY + pad;
      const r = t.getBoundingClientRect();
      if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
      if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
      t.style.left = x + 'px'; t.style.top = y + 'px';
    });
    zone.addEventListener('mouseleave', () => {
      const t = document.getElementById('mx-tooltip'); if (t) t.classList.remove('show');
    });
  });
}

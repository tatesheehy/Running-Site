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

  // ── "Try the tools" showcase ──────────────────────────────
  // Pick ONE good matchup per page-load and run every tool on it, so each card
  // is a live, pre-filled example (not an empty widget). New pair each refresh.
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
  const _cA = 'var(--brand)', _cB = 'var(--accent)';
  const _shortA = showA ? showA.name.split(' ').slice(-1)[0] : '';
  const _shortB = showB ? showB.name.split(' ').slice(-1)[0] : '';
  const _pairQ = (showA && showB) ? `?a=${encodeURIComponent(showA.id)}&b=${encodeURIComponent(showB.id)}` : '';

  // Featured Matchup board (top-right, replaces the old Season Leaders panel)
  let featuredBoard = '';
  if (showA && showB) {
    featuredBoard = `
      <div class="dash-card dash-featured">
        <div class="dash-card-title">Featured Matchup</div>
        <div class="fm-body">
          <div class="fm-side" onclick="openAthleteCard('${showA.id}', null)" role="button" tabindex="0">
            <span class="fm-dot" style="background:${_cA}"></span>
            <span class="fm-name">${showA.name}</span>
            <span class="fm-ct">${renderFlag(showA.flag)} ${showA.country || ''}</span>
          </div>
          <span class="fm-vs">VS</span>
          <div class="fm-side fm-side--b" onclick="openAthleteCard('${showB.id}', null)" role="button" tabindex="0">
            <span class="fm-dot" style="background:${_cB}"></span>
            <span class="fm-name">${showB.name}</span>
            <span class="fm-ct">${renderFlag(showB.flag)} ${showB.country || ''}</span>
          </div>
        </div>
        <p class="fm-note">Every tool below is running on this pair.</p>
        <button class="dash-card-foot fm-shuffle" onclick="location.reload()">Shuffle matchup ↻</button>
      </div>`;
  }

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
        <div class="dash-hex-svg">${_mxRadarSvg(showA.id, showB.id)}</div>
        <a href="metrics.html${_pairQ}" class="dash-link dash-card-foot">Open in Advanced Metrics →</a>
      </div>`;
  }

  // Aerobic Decay example
  let decayExampleCard = '';
  if (_metricsReady && showA && showB) {
    _mxMode = 'pace';
    _mxHighlight = [showA.id, showB.id];
    decayExampleCard = `
      <div class="dash-card dash-aero">
        <div class="dash-card-title">Aerobic Decay</div>
        <div class="dash-aero-svg">${_mxDecaySvg()}</div>
        <a href="metrics.html${_pairQ}" class="dash-link dash-card-foot">Explore the aerobic decay tool →</a>
      </div>`;
    _mxHighlight = [];
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

  // ── Row 3: recent activity (trending performances) ───────
  const trendItems = _buildTrendingPerformances(5);
  const activityCard = `
    <div class="dash-card dash-activity">
      <div class="dash-card-title">Recent Activity</div>
      ${trendItems.length
        ? `<div class="fp-trending-list">${trendItems.map(trendRow).join('')}</div>`
        : '<p class="dash-empty">No notable performances in the last 30 days.</p>'}
    </div>`;

  // ── Row 3: leaderboard (current rankings w/ event tabs) ──
  const firstEvent = Object.keys(RANKINGS)[0] || '';
  const TAB_LABELS = { '800m': '800m', '1500m': '1500m', '5000m': '5K', '10000m': '10K', 'Mile': 'Mile' };
  const tabsHtml = Object.keys(RANKINGS).map((ev, i) =>
    `<button class="fp-rank-tab ${i === 0 ? 'active' : ''}" data-event="${ev}">${TAB_LABELS[ev] || ev}</button>`
  ).join('');
  const leaderboardCard = `
    <div class="dash-card dash-leaderboard">
      <div class="dash-card-hd">
        <span class="dash-card-title">Season Leaders</span>
        <div class="fp-rank-tabs" id="fp-rank-tabs">${tabsHtml}</div>
      </div>
      <div id="fp-rank-rows">${_homeSeasonBestRows(firstEvent)}</div>
      <a href="event-tracker.html?event=${encodeURIComponent(firstEvent)}" id="fp-rank-viewall" class="dash-link dash-card-foot">Go to Event Tracker →</a>
    </div>`;

  // ── Row 3: latest updates (articles) ─────────────────────
  const updates = ARTICLES.slice(0, 4).map(a => {
    const dest = a.type === 'rankings'
      ? `rankings.html${a.rankingsEvent ? '?event=' + encodeURIComponent(a.rankingsEvent) : ''}`
      : `article.html?id=${a.id}`;
    return `<div class="dash-update-row" onclick="goTo('${dest}')" role="button" tabindex="0">
      <div class="dash-update-main">
        <span class="dash-update-tag">${a.category || 'Article'}</span>
        <span class="dash-update-hed">${a.title}</span>
      </div>
      ${a.date ? `<span class="dash-update-date">${a.date}</span>` : ''}
    </div>`;
  }).join('');
  const updatesCard = `
    <div class="dash-card dash-updates">
      <div class="dash-card-title">Latest Updates</div>
      <div class="dash-update-list">${updates || '<p class="dash-empty">No updates yet.</p>'}</div>
      <a href="articles.html" class="dash-link dash-card-foot">All articles →</a>
    </div>`;

  // ── Search-first hero ─────────────────────────────────────
  // The one thing every visitor understands: a big search box wired to the
  // shared site index (_buildSearchResultsHtml, from modals.js on every page),
  // with a few example chips seeded from the featured pair.
  const _chip = c => `<button class="hsh-chip" onclick="homeSearchFill('${String(c).replace(/'/g, "\\'")}')">${c}</button>`;
  const chipsHtml = [showA && showA.name, showB && showB.name, '1500m']
    .filter(Boolean).map(_chip).join('');

  const searchHero = `
    <section class="home-search-hero">
      <div class="hsh-band">
        <h1 class="hsh-wordmark">StatTC</h1>
        <p class="hsh-tag">Head-to-heads, rankings, and the deep stats behind distance running.</p>
        <div class="hsh-search" id="home-search">
          <svg class="hsh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="hsh-input" type="text" autocomplete="off" spellcheck="false"
            placeholder="Search any athlete, event, or story…"
            oninput="homeSearch(this.value)" onfocus="homeSearch(this.value)">
          <kbd class="hsh-kbd" aria-hidden="true">/</kbd>
          <div class="hsh-results" id="home-search-results"></div>
        </div>
        ${chipsHtml ? `<div class="hsh-chips"><span class="hsh-try">Try</span>${chipsHtml}</div>` : ''}
      </div>
    </section>`;

  // Which pair every tool below is pre-loaded with (explains the examples).
  const pairLabel = (showA && showB)
    ? `<button class="ht-pair" onclick="openAthleteCard('${showA.id}',null)">${showA.name}</button> vs <button class="ht-pair" onclick="openAthleteCard('${showB.id}',null)">${showB.name}</button>`
    : '';

  document.getElementById('main').innerHTML = `
    <div class="fp-wrap">
      <div class="fp-body">
        ${searchHero}
        <div class="home-tools">
          <div class="home-tools-hd">
            <span class="ht-kicker">Explore the tools</span>
            <p class="ht-sub">${pairLabel ? `Live examples running on ${pairLabel}.` : 'Live, interactive examples.'} <button class="ht-shuffle" onclick="location.reload()">Shuffle ↻</button></p>
          </div>
          <div class="home-split">
            <div class="home-main">
              ${h2hExampleCard}
              ${decayExampleCard}
              ${activityCard}
            </div>
            <aside class="home-rail">
              ${hexExampleCard}
              ${sharedRacesCard}
              ${meetsCard}
            </aside>
          </div>
        </div>
      </div>
    </div>`;

  qsa('.fp-rank-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.fp-rank-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      qs('#fp-rank-rows').innerHTML = _homeSeasonBestRows(btn.dataset.event);
      const viewAll = qs('#fp-rank-viewall');
      if (viewAll) viewAll.href = `event-tracker.html?event=${encodeURIComponent(btn.dataset.event)}`;
    });
  });

  _homeWireChartTooltips();
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
  results.innerHTML = typeof _buildSearchResultsHtml === 'function' ? _buildSearchResultsHtml(q) : '';
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

// Close the dropdown on outside click (registered once).
if (!window._homeSearchOutsideClick) {
  window._homeSearchOutsideClick = true;
  document.addEventListener('click', e => {
    const wrap = document.getElementById('home-search');
    if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
  });
  // "/" focuses the hero search (classic app shortcut); Esc blurs/clears it.
  document.addEventListener('keydown', e => {
    const inp = document.querySelector('#home-search .hsh-input');
    if (!inp) return;
    const typingElsewhere = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (e.key === '/' && !typingElsewhere) { e.preventDefault(); inp.focus(); }
    else if (e.key === 'Escape' && document.activeElement === inp) { inp.value = ''; window.homeSearch(''); inp.blur(); }
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

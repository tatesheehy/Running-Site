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
  return `
    <div class="fp-trend-row ${cls}" onclick="openAthleteCard('${a.id}', null)" role="button" tabindex="0">
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
      <div class="dash-card-title">Upcoming meets</div>
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
  const clubRows = clubCounts.map(c => `
      <div class="dash-club-row">
        <span class="dash-club-count">${c.n}</span>
        <span class="dash-club-main">
          <span class="dash-club-barrier">${c.barrier} ${c.label}</span>
          <span class="dash-club-note">athlete${c.n === 1 ? '' : 's'} tracked with a career PR under</span>
          <span class="dash-club-bar-track"><span class="dash-club-bar" style="width:${Math.max(4, Math.round(c.n / clubMax * 100))}%"></span></span>
        </span>
      </div>`).join('');
  const clubsCard = `
    <div class="dash-card dash-clubs">
      <div class="dash-card-title">Barrier clubs</div>
      <div class="dash-club-list">${clubRows}</div>
      <a href="athletes.html" class="dash-link dash-card-foot" style="--accent:#DB2777">Find them with Multi-PR Search →</a>
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
      <a href="h2h.html" class="dash-link dash-card-foot" style="--accent:#9333EA">Full H2H leaderboard →</a>
    </div>` : '';

  // ── Row 3: Skill Hexagon (radar) + Aerobic Decay previews ──
  // Both reuse the Advanced Metrics tools (js/metrics.js) and link there.
  const _metricsReady = typeof MX_EVENTS !== 'undefined'
    && typeof _mxRadarSvg === 'function' && typeof _mxDecaySvg === 'function';
  let skillHexCard = '';
  let aeroDecayCard = '';
  if (_metricsReady) {
    const coverage = allAthletes
      .map(a => ({ id: a.id, name: a.name, n: MX_EVENTS.reduce((c, e) => c + (_mxPr(a, e.key) != null ? 1 : 0), 0) }))
      .filter(o => o.n >= 3)
      .sort((x, y) => y.n - x.n);
    const hexA = coverage[0], hexB = coverage[1];
    if (hexA && hexB) {
      skillHexCard = `
        <div class="dash-card dash-hexagon">
          <div class="dash-card-title">Skill Hexagon</div>
          <div class="dash-hex-legend">
            <span class="dash-hex-name" style="--c:#2563EB"><span class="dash-hex-dot"></span>${hexA.name}</span>
            <span class="dash-hex-vs">vs</span>
            <span class="dash-hex-name" style="--c:#EA580C"><span class="dash-hex-dot"></span>${hexB.name}</span>
          </div>
          <div class="dash-hex-svg">${_mxRadarSvg(hexA.id, hexB.id)}</div>
          <a href="metrics.html" class="dash-link dash-card-foot" style="--accent:#0EA5E9">Compare any two athletes →</a>
        </div>`;
    }
    // Decay preview: highlight the two strongest all-rounders over the field
    _mxMode = 'pace';
    _mxHighlight = [hexA, hexB].filter(Boolean).map(o => o.id);
    aeroDecayCard = `
      <div class="dash-card dash-aero">
        <div class="dash-card-title">Aerobic Decay</div>
        <div class="dash-aero-svg">${_mxDecaySvg()}</div>
        <a href="metrics.html" class="dash-link dash-card-foot" style="--accent:#0EA5E9">Explore the aerobic decay tool →</a>
      </div>`;
    _mxHighlight = [];
  }

  // ── Row 3: recent activity (trending performances) ───────
  const trendItems = _buildTrendingPerformances(5);
  const activityCard = `
    <div class="dash-card dash-activity">
      <div class="dash-card-title">Recent activity</div>
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
      <a href="event-tracker.html?event=${encodeURIComponent(firstEvent)}" id="fp-rank-viewall" class="dash-link dash-card-foot" style="--accent:#16A34A">Go to Event Tracker →</a>
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
      <div class="dash-card-title">Latest updates</div>
      <div class="dash-update-list">${updates || '<p class="dash-empty">No updates yet.</p>'}</div>
      <a href="articles.html" class="dash-link dash-card-foot" style="--accent:#0D9488">All articles →</a>
    </div>`;

  document.getElementById('main').innerHTML = `
    <div class="fp-wrap">
      <div class="fp-body">
        <div class="home-hero">
          ${heroCard}
          <div class="home-hero-board">
            ${leaderboardCard}
          </div>
        </div>
        <div class="home-split">
          <div class="home-main">
            ${leadersCard}
            ${skillHexCard}
            ${aeroDecayCard}
            ${activityCard}
          </div>
          <aside class="home-rail">
            ${clubsCard}
            ${meetsCard}
            ${updatesCard}
          </aside>
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
}

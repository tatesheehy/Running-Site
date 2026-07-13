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

  // ── Row 1: hero card ─────────────────────────────────────
  const heroCard = heroItem ? `
    <div class="dash-card dash-card--clickable dash-hero" onclick="goTo('${heroDest}')" role="button" tabindex="0">
      ${heroItem.image ? `<div class="dash-hero-img-wrap">${imgHTML(heroItem.image, heroItem.title, heroItem.imagePosition, 16/9, 'dash-hero-img')}</div>` : ''}
      <div class="dash-hero-body">
        <div class="dash-eyebrow">${heroItem.category || 'Featured'}${heroItem.date ? ` · ${heroItem.date}` : ''}</div>
        <h1 class="dash-hero-hed">${heroItem.title}</h1>
        ${heroItem.excerpt ? `<p class="dash-hero-dek">${heroItem.excerpt}</p>` : ''}
        <span class="dash-link">Read ${heroItem.type === 'rankings' ? 'rankings' : 'article'} →</span>
      </div>
    </div>` : '';

  // ── Row 1: summary card (real site-wide numbers) ─────────
  const allAthletes = Object.values(ATHLETES);
  const liveEvents = (typeof RANKINGS_EVENTS !== 'undefined' ? RANKINGS_EVENTS : []).filter(e => (e.rows || []).length > 0).length;
  let resultsCount = 0;
  allAthletes.forEach(a => { resultsCount += (a.results || []).length; });
  const nextMeet = (SITE.upcomingMeets || [])
    .filter(m => m.name && m.datetime && new Date(m.datetime) > now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];
  const nextMeetDate = nextMeet
    ? new Date(nextMeet.datetime).toLocaleString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const summaryCard = `
    <div class="dash-card dash-summary">
      <div class="dash-card-title">At a glance</div>
      <div class="dash-sum-list">
        <div class="dash-sum-row"><span class="dash-sum-num">${allAthletes.length}</span><span class="dash-sum-label">Athletes tracked</span></div>
        <div class="dash-sum-row"><span class="dash-sum-num">${resultsCount.toLocaleString()}</span><span class="dash-sum-label">Results logged</span></div>
        <div class="dash-sum-row"><span class="dash-sum-num">${liveEvents}</span><span class="dash-sum-label">Events ranked</span></div>
        ${nextMeet ? `<div class="dash-sum-row"><span class="dash-sum-num dash-sum-num--sm">${nextMeetDate}</span><span class="dash-sum-label">${nextMeet.name}</span></div>` : ''}
      </div>
    </div>`;

  // ── Row 2: feature cards ─────────────────────────────────
  const eventChips = ['800m', '1500m', '5000m', '10000m'].map(ev =>
    `<a class="dash-chip" href="event-tracker.html?event=${encodeURIComponent(ev)}" onclick="event.stopPropagation()">${ev}</a>`
  ).join('');
  const featureCards = `
    <div class="dash-card dash-card--clickable dash-feature" onclick="goTo('h2h.html')" role="button" tabindex="0">
      <div class="dash-feature-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      </div>
      <div class="dash-feature-hed">Head to Head</div>
      <p class="dash-feature-dek">Season win-loss records from every direct race encounter — compare any two athletes.</p>
      <span class="dash-link">Explore H2H →</span>
    </div>
    <div class="dash-card dash-card--clickable dash-feature" onclick="goTo('event-tracker.html')" role="button" tabindex="0">
      <div class="dash-feature-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div class="dash-feature-hed">Event Tracker</div>
      <p class="dash-feature-dek">Recent form, season rankings and head-to-head records — one event at a time.</p>
      <div class="dash-chips">${eventChips}</div>
    </div>`;

  // ── Row 3: analytics — results logged per month (last 6) ──
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const nowMonth = new Date().getMonth();
  const monthWindow = [];
  for (let i = 5; i >= 0; i--) monthWindow.push(MONTHS[(nowMonth - i + 12) % 12]);
  const monthCounts = {};
  monthWindow.forEach(m => { monthCounts[m] = 0; });
  allAthletes.forEach(a => (a.results || []).forEach(r => {
    const tok = (r.date || '').trim().slice(0, 3).toUpperCase();
    if (tok in monthCounts) monthCounts[tok]++;
  }));
  const maxCount = Math.max(1, ...monthWindow.map(m => monthCounts[m]));
  const barsHtml = monthWindow.map(m => `
    <div class="dash-bar-col">
      <span class="dash-bar-val">${monthCounts[m]}</span>
      <div class="dash-bar-track"><div class="dash-bar" style="height:${Math.max(3, Math.round(monthCounts[m] / maxCount * 100))}%"></div></div>
      <span class="dash-bar-label">${m}</span>
    </div>`).join('');
  const analyticsCard = `
    <div class="dash-card dash-analytics">
      <div class="dash-card-title">Results logged by month</div>
      <div class="dash-bars">${barsHtml}</div>
    </div>`;

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
        <span class="dash-card-title">Leaderboard</span>
        <div class="fp-rank-tabs" id="fp-rank-tabs">${tabsHtml}</div>
      </div>
      <div id="fp-rank-rows">${buildRankingsTableHtml(firstEvent, true)}</div>
      <a href="rankings.html" class="dash-link dash-card-foot">View all rankings →</a>
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
      <a href="articles.html" class="dash-link dash-card-foot">All articles →</a>
    </div>`;

  document.getElementById('main').innerHTML = `
    <div class="fp-wrap">
      <div class="fp-body">
        <div class="dash-grid">
          ${heroCard}
          ${summaryCard}
          ${featureCards}
          ${analyticsCard}
          ${activityCard}
          ${leaderboardCard}
          ${updatesCard}
        </div>
      </div>
    </div>`;

  qsa('.fp-rank-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.fp-rank-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      qs('#fp-rank-rows').innerHTML = buildRankingsTableHtml(btn.dataset.event, true);
    });
  });
}

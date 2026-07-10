// ============================================================
//  RANKINGS — all rankings builders and helpers
// ============================================================

// ── TRAIT SYSTEM ──────────────────────────────────────────
const TRAIT_SENTIMENT = {
  'Rising':          'positive',
  'Peaking':         'positive',
  'Bouncing Back':   'positive',
  'Locked In':       'positive',
  'The Threat':      'positive',
  'Breakthrough':    'positive',
  'Comeback Season': 'positive',
  'Fading':          'warning',
  'Vulnerable':      'warning',
  'Overranked':      'warning',
  'Injury Concern':  'warning',
  'Dark Horse':      'caution',
  'Wildcard':        'caution',
  'Watch This Space':'caution',
  'Under the Radar': 'caution',
  'Need to See More':'neutral',
};

function buildTraitsHtml(traits) {
  if (!traits?.length) return '';
  const pills = traits.map(t => {
    const sentiment = TRAIT_SENTIMENT[t] || 'neutral';
    return `<span class="rd-trait rd-trait--${sentiment}">${t}</span>`;
  }).join('');
  return `<div class="rd-traits">${pills}</div>`;
}

// ── BEST TIME RESOLVER ────────────────────────────────────
function _parseTimeSecs(t) {
  if (!t || t === 'x') return Infinity;
  const parts = t.trim().split(':');
  if (parts.length === 2) return +parts[0] * 60 + +parts[1];
  if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + +parts[2];
  return Infinity;
}

// Auto-derives from athlete results for the event; falls back to rankings row seasonBest.
function _bestTime(r, a, event) {
  if (a && Array.isArray(a.results)) {
    const valid = a.results
      .filter(res => res.event === event && res.time && res.time !== 'x' && isFinite(_parseTimeSecs(res.time)))
      .sort((x, y) => _parseTimeSecs(x.time) - _parseTimeSecs(y.time));
    if (valid.length) return valid[0].time;
  }
  return (r.seasonBest && r.seasonBest !== 'x') ? r.seasonBest : '';
}

// ── RANKINGS TABLE HTML ────────────────────────────────────
function buildRankingsTableHtml(event, compact) {
  const allRows = RANKINGS[event] || [];
  if (!allRows.length) {
    return `<p style="color:var(--muted);padding:20px 0;font-size:14px;">No rankings data yet for ${event}.</p>`;
  }
  const rows = compact ? allRows.slice(0, 5) : allRows;

  if (compact) {
    const rowsHtml = rows.map((r, i) => {
      const rank = i + 1;
      const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
      const name    = (a && a.name)    || r.name    || r.athleteId || '—';
      const country = (a && a.country) || r.country || '';
      const flag    = (a && a.flag)    || r.flag    || '';
      const hasCard = r.athleteId && ATHLETES[r.athleteId];
      const time    = _bestTime(r, a, event);
      return `
        <div class="rw-row ${hasCard ? 'rw-row--clickable' : ''}" ${hasCard ? `onclick="openAthleteCard('${r.athleteId}', ${rank})"` : ''}>
          <span class="rw-rank ${rank === 1 ? 'rw-rank--first' : ''}">${rank}</span>
          <div class="rw-info">
            <span class="rw-name">${name}</span>
            <span class="rw-country-sm">${renderFlag(flag)}<span>${country}</span></span>
          </div>
          ${time ? `<span class="rw-time">${time}</span>` : ''}
        </div>
      `;
    }).join('');
    return `<div class="rw-list">${rowsHtml}</div>`;
  }

  const rowsHtml = rows.map((r, i) => {
    const rank = i + 1;
    const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
    const name    = (a && a.name)    || r.name    || r.athleteId || '—';
    const country = (a && a.country) || r.country || '';
    const flag    = (a && a.flag)    || r.flag    || '';
    const hasCard = r.athleteId && ATHLETES[r.athleteId];
    const rankClass = rank === 1 ? '' : 'gray';
    return `
      <tr ${hasCard ? `onclick="openAthleteCard('${r.athleteId}', ${rank})"` : ''} style="${hasCard ? '' : 'cursor:default'}">
        <td><span class="rank-num ${rankClass}">${rank}</span></td>
        <td class="athlete-name-cell">
          <div class="name">${name}</div>
          <div class="country">${renderFlag(flag)} ${country}</div>
        </td>
        <td>${country}</td>
        <td><span class="best-time">${_bestTime(r, a, event) || '—'}</span></td>
        <td class="meet-cell">${(r.meet && r.meet !== 'x') ? r.meet : ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="rankings-table" aria-label="${event} rankings">
      <thead>
        <tr>
          <th>Rank</th><th>Athlete</th><th>Country</th>
          <th>Best Time</th><th style="text-align:right">Meet</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

// ── RANKINGS PAGE ─────────────────────────────────────────
function buildRankingsPage() {
  document.body.classList.remove('rd-terminal-page');
  const eventParam = getParam('event');
  const yearParam  = getParam('year');
  const viewParam  = getParam('view');
  const weekParam  = getParam('week');

  if (viewParam === 'archive' && yearParam && eventParam && weekParam) {
    const eventName = decodeURIComponent(eventParam);
    buildRankingsDetail(eventName, {
      archiveYear:   yearParam,
      archiveWeekId: weekParam,
      backUrl:  `rankings.html?view=archive&year=${encodeURIComponent(yearParam)}&event=${encodeURIComponent(eventParam)}`,
      backLabel: eventName,
    });
  } else if (viewParam === 'archive' && yearParam && eventParam) {
    buildArchiveWeekHub(yearParam, decodeURIComponent(eventParam));
  } else if (viewParam === 'archive' && yearParam) {
    buildArchiveYearHub(yearParam);
  } else if (viewParam === 'archive') {
    buildArchiveHub();
  } else if (eventParam) {
    buildRankingsDetail(decodeURIComponent(eventParam));
  } else {
    buildRankingsHub();
  }
}

function buildRankingsHub() {
  const rowsHtml = RANKINGS_EVENTS.map((ev, i) => {
    const count = (ev.rows || []).length;
    const isLive = count > 0;
    return `
      <div class="rr-soon-row" onclick="goTo('rankings.html?event=${encodeURIComponent(ev.name)}')">
        <span class="rr-soon-index">${String(i + 1).padStart(2, '0')}</span>
        <span class="rr-soon-name">${ev.name}</span>
        <span class="rr-soon-desc">${ev.description || ''}</span>
        <span class="rr-soon-tag${isLive ? ' rr-soon-tag--live' : ''}">${isLive ? `${count} ranked` : 'Coming soon'}</span>
        <span class="rr-soon-arrow">&rarr;</span>
      </div>`;
  }).join('');

  const cardsHtml = rowsHtml ? `
    <div class="rr-soon-panel">
      <div class="rr-soon-panel-label">All Events</div>
      <div class="rr-soon-list">${rowsHtml}</div>
    </div>` : '';

  const eventCount = RANKINGS_EVENTS.length;
  const athleteCount = RANKINGS_EVENTS.reduce((n, ev) => n + (ev.rows || []).length, 0);

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-hub">
        <header class="rhub-hd">
          <div class="rhub-eyebrow">stattc rankings &middot; ${RANKINGS_YEAR || new Date().getFullYear()}</div>
          <div class="rhub-hd-main">
            <h1 class="rhub-title">Rankings</h1>
            <div class="rhub-stats">
              <div class="rhub-stat"><span class="rhub-stat-num">${String(eventCount).padStart(2, '0')}</span><span class="rhub-stat-label">Events</span></div>
              <div class="rhub-stat"><span class="rhub-stat-num">${String(athleteCount).padStart(2, '0')}</span><span class="rhub-stat-label">Athletes Ranked</span></div>
            </div>
          </div>
          <div class="rhub-squiggle"></div>
          <div class="rhub-hd-row">
            ${SITE.rankingsIntro ? `<p class="rankings-page-intro">${SITE.rankingsIntro}</p>` : '<span></span>'}
            <div class="rankings-hub-actions">
              <button class="h2h-hub-btn" onclick="openH2H()">Settle an Argument</button>
              ${RANKINGS_ARCHIVE.length ? `<a href="rankings.html?view=archive" class="rankings-archive-link"><svg width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:-2px;margin-right:6px"><path d="M1 2.5C1 1.67 1.67 1 2.5 1H5.5L7 3H12.5C13.33 3 14 3.67 14 4.5V10.5C14 11.33 13.33 12 12.5 12H2.5C1.67 12 1 11.33 1 10.5V2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>Dig through the archives &rarr;</a>` : ''}
            </div>
          </div>
        </header>
        <div class="rankings-board">${cardsHtml}</div>
      </div>
    </div>
  `;
}

function buildArchiveHub() {
  const seasons = RANKINGS_ARCHIVE || [];

  const cardsHtml = seasons.length ? seasons.map(s => {
    const year   = s.year || '';
    const label  = s.label || `${year} Season`;
    const events = s.events || [];
    const tags   = events.map(e => `<span class="archive-event-tag">${e.name}</span>`).join('');
    return `
      <div class="archive-season-card" onclick="goTo('rankings.html?view=archive&year=${encodeURIComponent(year)}')">
        <div class="archive-season-year">${year}</div>
        <div class="archive-season-label">${label}</div>
        ${tags ? `<div class="archive-season-tags">${tags}</div>` : ''}
        <div class="archive-season-cta">${events.length} event${events.length !== 1 ? 's' : ''} &rarr;</div>
      </div>`;
  }).join('') : `<p class="archive-empty">No archived seasons yet.</p>`;

  document.getElementById('main').innerHTML = `
    <div class="archive-vintage-page">
      <div class="container">
        <div class="archive-vintage-header">
          <a href="rankings.html" class="rd-back">&larr; Return to the present</a>
          <h1 class="archive-page-title">Rankings Archive</h1>
        </div>
        <div class="archive-seasons-grid">${cardsHtml}</div>
      </div>
    </div>`;
}

function buildArchiveYearHub(year) {
  const season = (RANKINGS_ARCHIVE || []).find(s => s.year === year);
  if (!season) { goTo('rankings.html?view=archive'); return; }

  const label  = season.label || `${year} Season`;
  const events = season.events || [];

  const cardsHtml = events.length ? events.map((ev) => {
    const weekCount = (ev.weekIds || []).length;
    const nameCls = ev.name.length > 6 ? 'archive-season-year archive-season-year--event' : 'archive-season-year';
    return `
      <div class="archive-season-card" onclick="goTo('rankings.html?view=archive&year=${encodeURIComponent(year)}&event=${encodeURIComponent(ev.name)}')">
        <div class="${nameCls}">${ev.name}</div>
        <div class="archive-season-label">${ev.description || ''}</div>
        <div class="archive-season-cta">${weekCount ? `${weekCount} week${weekCount !== 1 ? 's' : ''}` : 'No weeks'} &rarr;</div>
      </div>`;
  }).join('') : `<p class="archive-empty">No events yet.</p>`;

  document.getElementById('main').innerHTML = `
    <div class="archive-vintage-page">
      <div class="container">
        <div class="archive-vintage-header">
          <a href="rankings.html?view=archive" class="rd-back">&larr; Archive</a>
          <h1 class="archive-page-title">${label}</h1>
        </div>
        <div class="archive-seasons-grid">${cardsHtml}</div>
      </div>
    </div>`;
}

function buildArchiveWeekHub(year, eventName) {
  const season = (RANKINGS_ARCHIVE || []).find(s => s.year === year);
  const ev = season ? (season.events || []).find(e => e.name === eventName) : null;
  if (!ev) { goTo(`rankings.html?view=archive&year=${encodeURIComponent(year)}`); return; }

  const weekIds  = ev.weekIds || [];
  const yearLabel = season.label || `${year} Season`;

  const liveCount = ((RANKINGS_EVENTS || []).find(e => e.name === eventName)?.rows || []).length;
  const cardsHtml = weekIds.length ? weekIds.map((wid) => {
    const w = (RANKINGS_WEEKS || {})[wid] || {};
    const count  = (w.rows || []).length || liveCount;
    const wLabel = w.label || wid;
    return `
      <div class="archive-season-card" onclick="goTo('rankings.html?view=archive&year=${encodeURIComponent(year)}&event=${encodeURIComponent(eventName)}&week=${encodeURIComponent(wid)}')">
        <div class="archive-season-year archive-season-year--week">${wLabel}</div>
        ${w.date ? `<div class="archive-season-label">${w.date}</div>` : '<div class="archive-season-label"></div>'}
        <div class="archive-season-cta">${count ? `${count} athletes` : 'No data'} &rarr;</div>
      </div>`;
  }).join('') : `<p class="archive-empty">No weeks added yet.</p>`;

  document.getElementById('main').innerHTML = `
    <div class="archive-vintage-page">
      <div class="container">
        <div class="archive-vintage-header">
          <a href="rankings.html?view=archive&year=${encodeURIComponent(year)}" class="rd-back">&larr; ${yearLabel}</a>
          <h1 class="archive-page-title">${eventName}</h1>
        </div>
        <div class="archive-seasons-grid">${cardsHtml}</div>
      </div>
    </div>`;
}

let _rdSortCol = 'rank', _rdSortDir = 'asc', _rdCurrentEvent = '';

window.sortRankings = function(col) {
  if (_rdSortCol === col) {
    _rdSortDir = _rdSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _rdSortCol = col;
    _rdSortDir = 'asc';
  }

  const list = document.querySelector('.rd-list-wrap > .rd-list');
  if (!list) return;

  const rows = [...list.querySelectorAll(':scope > .rd-row')];
  rows.sort((a, b) => {
    const dir = _rdSortDir === 'asc' ? 1 : -1;
    if (col === 'name') {
      const va = a.dataset.sortName || '', vb = b.dataset.sortName || '';
      return dir * va.localeCompare(vb);
    }
    let va, vb;
    if (col === 'rank') { va = +a.dataset.sortRank || 999; vb = +b.dataset.sortRank || 999; }
    else if (col === 'sb') { va = +a.dataset.sortSb || Infinity; vb = +b.dataset.sortSb || Infinity; }
    else if (col === 'pb') { va = +a.dataset.sortPb || Infinity; vb = +b.dataset.sortPb || Infinity; }
    else return 0;
    if (va === Infinity && vb === Infinity) return 0;
    if (va === Infinity) return 1;
    if (vb === Infinity) return -1;
    return dir * (va - vb);
  });
  rows.forEach(r => list.appendChild(r));

  document.querySelectorAll('.rd-col-sort').forEach(el => {
    const active = el.dataset.col === col;
    el.classList.toggle('rd-col-sort--active', active);
    const icon = el.querySelector('.rd-sort-icon');
    if (icon) icon.textContent = active ? (_rdSortDir === 'asc' ? '▲' : '▼') : '⇅';
  });
};

function buildRankingRow(r, rank) {
  const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
  const name    = (a && a.name)    || r.name    || r.athleteId || '—';
  const country = (a && a.country) || r.country || '';
  const flag    = (a && a.flag)    || r.flag    || '';
  const photo   = (a && a.photo) || '/images/default_card.png';
  const photoBg = (a && a.photoBackground) || '#111';
  const clickData = encodeURIComponent(JSON.stringify({athleteId: r.athleteId||'', rank: rank||0, name, country, flag, seasonBest: r.seasonBest||'', meet: r.meet||''}));
  const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
  const seasonBest = _bestTime(r, a, _rdCurrentEvent);
  const meet = (r.meet && r.meet !== 'x') ? r.meet : '';
  const sbSecs = isFinite(_parseTimeSecs(seasonBest)) ? _parseTimeSecs(seasonBest) : '';
  // Build inline deep-dive panel (Die Hard race card)
  const fx = v => (v && v !== 'x') ? v : '';
  const evNorm = s => (s || '').replace(/\s+/g, '').toLowerCase();
  const ordinal = p => { const n = parseInt(p, 10); if (!n) return fx(p) || ''; const s = ['th','st','nd','rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th'; return n + s; };
  const evPB = a ? (((a.prs || []).find(p => evNorm(p.event) === evNorm(_rdCurrentEvent)) || {}).time || '') : '';
  const raceCount = a ? (a.results || []).length : 0;
  const hlKey = fx(a?.headline?.keyWord), hlRest = fx(a?.headline?.rest);
  const an = a?.analysis || {};
  const reviewBody = fx(an.reviewBody), questionBody = fx(an.questionBody);
  const traitPills = (a?.traits || []).slice(0, 4).map(t =>
    `<span class="rdc-trait">${t}</span>`
  ).join('');
  const recentHtml = (a?.results || []).slice(0, 3).map(res => `
    <div class="rdc-race">
      <span class="rdc-race-date">${fx(res.date)}</span>
      <span class="rdc-race-meet">${fx(res.meet)}<span class="rdc-race-ev">${fx(res.event)}</span></span>
      <span class="rdc-race-time">${fx(res.time)}${fx(res.place) ? `<span class="rdc-race-place">${ordinal(res.place)}</span>` : ''}</span>
    </div>`).join('');
  const prsHtml = pickTopPRs(a?.prs, 4).map(pr =>
    `<div class="rd-dd-pr-row"><span class="rd-dd-pr-event">${pr.event}</span><span class="rd-dd-pr-time">${pr.time}</span></div>`
  ).join('');
  const ribbonCells = [
    `<div class="rdc-rib-cell"><span class="rdc-rib-num">${seasonBest || '—'}</span><span class="rdc-rib-lb">${RANKINGS_YEAR} best${meet ? ` · ${meet}` : ''}</span></div>`,
    evPB ? `<div class="rdc-rib-cell"><span class="rdc-rib-num">${evPB}</span><span class="rdc-rib-lb">${_rdCurrentEvent} PB</span></div>` : '',
    raceCount ? `<div class="rdc-rib-cell"><span class="rdc-rib-num">${raceCount}</span><span class="rdc-rib-lb">races this season</span></div>` : '',
  ].filter(Boolean).join('');
  const analysisHtml = (reviewBody || questionBody) ? `
    ${reviewBody ? `<p><strong>${fx(an.reviewTitle) || 'Season review'}:</strong> ${reviewBody}</p>` : ''}
    ${questionBody ? `<p><strong>${fx(an.questionTitle) || 'Next question'}:</strong> ${questionBody}</p>` : ''}` : '';
  const ddPanel = `
    <div class="rd-dd-panel">
      <div class="rdc">
        <div class="rdc-photo-col">
          <div class="rdc-photo" style="background-color:${photoBg};background-image:url('${a?.photo || photo}')">
            ${rank != null ? `<span class="rdc-rank-stamp">#${rank}</span>` : ''}
          </div>
        </div>
        <div class="rdc-content">
          <button class="rd-dd-close" onclick="event.stopPropagation();this.closest('.rd-dd-panel').classList.remove('open');this.closest('.rd-dd-panel').previousElementSibling.classList.remove('dd-open')">×</button>
          <div class="rdc-eyebrow">${renderFlag(flag)} ${country}${a && r.athleteId ? ` &middot; <button class="rdc-profile-link" onclick="event.stopPropagation();openAthleteCard('${r.athleteId}', ${rank || 0})">full profile</button>` : ''}${a?.waUrl ? ` &middot; <a class="rdc-profile-link" href="${a.waUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">world athletics ↗</a>` : ''}</div>
          <h3 class="rdc-name">${name}</h3>
          ${(hlKey || r.bite) ? `<div class="rdc-headline">${hlKey ? `<strong>${hlKey}</strong> ${hlRest}` : `<strong>${r.bite}</strong>`}</div>` : ''}
          ${traitPills ? `<div class="rdc-traits">${traitPills}</div>` : ''}
          <div class="rdc-ribbon">${ribbonCells}</div>
          ${(recentHtml || prsHtml) ? `
          <div class="rdc-recap">
            ${recentHtml ? `<div class="rdc-block"><div class="rdc-block-lb">Last time out</div>${recentHtml}</div>` : ''}
            ${prsHtml ? `<div class="rdc-block"><div class="rdc-block-lb">Personal bests</div>${prsHtml}</div>` : ''}
          </div>` : ''}
          <div class="rdc-analysis">
            ${analysisHtml || '<p class="rdc-empty">Full analysis coming soon.</p>'}
          </div>
        </div>
      </div>
    </div>`;

  return `
    <div class="rd-row${rank <= 3 && rank != null ? ' rd-row--podium' : ''}" data-country="${country}" data-athlete-id="${r.athleteId || ''}" data-sort-rank="${rank || 999}" data-sort-name="${name}" data-sort-sb="${sbSecs}" data-sort-pb="${sbSecs}" data-click-data="${clickData}" onclick="openRankingRowDeepDive(this)">
      ${rank != null ? `<div class="rd-rank ${rankClass}">${rank}</div>` : '<div class="rd-rank-empty"></div>'}
      <div class="rd-avatar" style="background-color:${photoBg};background-image:url('${photo}');background-size:cover;background-position:top center"></div>
      <div class="rd-info">
        <div class="rd-name">${name}</div>
        <div class="rd-country">${renderFlag(flag)} ${country}</div>
        ${r.bite ? `<div class="rd-bite-row">${r.bite}</div>` : ''}
        ${buildTraitsHtml(r.traits)}
        <div class="rd-row-stats">
          ${seasonBest && seasonBest !== '—' ? `<div class="rd-row-stat"><span class="rd-row-stat-label">SB</span><span class="rd-row-stat-val">${seasonBest}${meet ? ` <span class="rd-row-stat-meet">· ${meet}</span>` : ''}</span></div>` : ''}
        </div>
      </div>
      ${rank != null ? buildMomentumHtml(r.momentum) : ''}
      <div class="rd-sb">${seasonBest}</div>
      <div class="rd-right">
        ${r.reason ? `<div class="rd-reason">${r.reason}</div>` : ''}
        <div class="rd-time">${seasonBest}</div>
      </div>
    </div>
    ${ddPanel}`;
}

function buildRankingCard(r, rank) {
  const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
  const name    = (a && a.name)    || r.name    || r.athleteId || '—';
  const country = (a && a.country) || r.country || '';
  const flag    = (a && a.flag)    || r.flag    || '';
  const photo   = (a && a.photo) || '/images/default_card.png';
  const photoBg = (a && a.photoBackground) || '#1c1c1c';
  const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
  const seasonBest = (r.seasonBest && r.seasonBest !== 'x') ? r.seasonBest : '';
  const meet = (r.meet && r.meet !== 'x') ? r.meet : '';
  const clickData = encodeURIComponent(JSON.stringify({athleteId: r.athleteId||'', rank: rank||0, name, country, flag, seasonBest: r.seasonBest||'', meet: r.meet||''}));
  return `
    <div class="rd-card" data-country="${country}" data-athlete-id="${r.athleteId || ''}" onclick="openRankingRow('${clickData}')">
      <div class="rd-card-photo" style="background-color:${photoBg};background-image:url('${photo}')">
        ${rank != null ? `<div class="rd-card-rank ${rankClass}">${rank}</div>` : ''}
      </div>
      <div class="rd-card-body">
        <div class="rd-card-name">${name}</div>
        <div class="rd-card-country">${renderFlag(flag)} ${country}</div>
        ${r.reason ? `<div class="rd-card-reason">${r.reason}</div>` : ''}
        <div class="rd-card-time">${seasonBest}</div>
      </div>
    </div>
  `;
}

// ── DATA TERMINAL VIEW ────────────────────────────────────
// A dense, mono-type alternative to the list/grid views: sortable columns,
// a gap-to-leader stat, per-athlete race count, and an expandable detail
// row built entirely from data already on the athlete record.
function _rdtEvNorm(s) { return (s || '').replace(/\s+/g, '').toLowerCase(); }

function _rdtOrdinal(p) {
  const n = parseInt(p, 10);
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th';
  return n + s;
}

// Pulls everything the terminal row/detail needs out of the athlete's own
// results — no fields are invented, only counted/sorted from real data.
function _rdtAthleteMeta(a, event) {
  const results = (a?.results || []);
  const idxThisEvent = results.findIndex(r => _rdtEvNorm(r.event) === _rdtEvNorm(event));
  const thisEventResults = results.filter(r => _rdtEvNorm(r.event) === _rdtEvNorm(event));
  const pb = ((a?.prs || []).find(p => _rdtEvNorm(p.event) === _rdtEvNorm(event)) || {}).time || '';
  const lastPlace = idxThisEvent === -1 ? '' : _rdtOrdinal((results[idxThisEvent].place || '').replace(/\.$/, ''));
  // Sparkline: last up to 4 races in this event, oldest→newest (left→right)
  const spark = thisEventResults.slice(0, 4).reverse().map(r => _parseTimeSecs(r.time)).filter(t => isFinite(t));
  return {
    pb,
    pbSecs: isFinite(_parseTimeSecs(pb)) ? _parseTimeSecs(pb) : null,
    racesThisEvent: thisEventResults.length,
    lastRaceGap: idxThisEvent === -1 ? null : idxThisEvent + 1, // 1 = most recent race overall WAS this event
    lastPlace,
    spark,
  };
}

function _rdtSparklineHtml(spark) {
  if (!spark.length) return '<div class="rdt-spark"></div>';
  const min = Math.min(...spark), max = Math.max(...spark);
  const range = max - min || 1;
  const bars = spark.map((t, i) => {
    const h = 6 + Math.round(((max - t) / range) * 10); // faster time = taller bar
    const prev = spark[i - 1];
    const cls = prev == null ? '' : (t < prev ? 'hot' : t > prev ? 'cold' : '');
    return `<i style="height:${h}px" class="${cls}"></i>`;
  }).join('');
  return `<div class="rdt-spark">${bars}</div>`;
}

function buildTerminalItem(r, rank, leaderPbSecs) {
  const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
  const name    = (a && a.name)    || r.name    || r.athleteId || '—';
  const country = (a && a.country) || r.country || '';
  const flag    = (a && a.flag)    || r.flag    || '';
  const seasonBest = _bestTime(r, a, _rdCurrentEvent);
  const sbSecs = isFinite(_parseTimeSecs(seasonBest)) ? _parseTimeSecs(seasonBest) : '';
  const meta = _rdtAthleteMeta(a, _rdCurrentEvent);
  const gapSecs = (meta.pbSecs != null && leaderPbSecs != null) ? meta.pbSecs - leaderPbSecs : null;
  const gapStr = gapSecs == null ? '—' : (gapSecs === 0 ? '0.00' : (gapSecs > 0 ? '+' : '−') + Math.abs(gapSecs).toFixed(2));
  const momentum = typeof r.momentum === 'number' ? r.momentum : null;
  const moveHtml = momentum == null || momentum === 0
    ? '<span class="rdt-mv hd">—</span>'
    : momentum > 0 ? `<span class="rdt-mv up">▲</span>` : `<span class="rdt-mv dn">▼</span>`;
  const rankClass = rank === 1 ? 'top' : '';
  const clickData = encodeURIComponent(JSON.stringify({ athleteId: r.athleteId || '', rank: rank || 0, name, country, flag, seasonBest: r.seasonBest || '', meet: r.meet || '' }));

  const recentHtml = (a?.results || []).slice(0, 3).map(res => `
    <div class="rdt-dd-race"><span>${res.meet || ''}</span><b>${res.time || '—'}</b></div>
  `).join('') || '<div class="rdt-dd-empty">No races logged yet.</div>';

  const wins = (a?.results || []).filter(res => (res.place || '').replace(/\.$/, '') === '1').length;

  return `
    <div class="rdt-item" data-country="${country}" data-name="${name.toLowerCase()}"
         data-sort-rank="${rank || 999}" data-sort-name="${name}" data-sort-sb="${sbSecs || ''}"
         data-sort-pb="${meta.pbSecs != null ? meta.pbSecs : ''}" data-sort-gap="${gapSecs != null ? gapSecs : ''}">
      <div class="rdt-row" onclick="toggleRdtDetail(this)">
        <div class="rdt-rk ${rankClass}">${rank}</div>
        <div class="rdt-flag">${renderFlag(flag)}</div>
        <div class="rdt-nm-wrap"><span class="rdt-nm">${name}</span><span class="rdt-ct">${country}</span></div>
        <div class="rdt-c dim">${seasonBest && seasonBest !== '—' ? seasonBest : '—'}</div>
        <div class="rdt-c hi">${meta.pb || '—'}</div>
        <div class="rdt-c rdt-gap${gapSecs === 0 ? ' zero' : ''}">${gapStr}</div>
        <div class="rdt-c dim">${meta.lastRaceGap ? 'L' + meta.lastRaceGap : '—'}</div>
        <div class="rdt-c">${meta.lastPlace || '—'}</div>
        ${_rdtSparklineHtml(meta.spark)}
      </div>
      <div class="rdt-detail" hidden>
        <div class="rdt-dd-grid">
          <div>
            <div class="rdt-dd-lb">Last 3 races</div>
            ${recentHtml}
          </div>
          <div>
            <div class="rdt-dd-lb">Season snapshot</div>
            <div class="rdt-dd-race"><span>Races run</span><b>${(a?.results || []).length}</b></div>
            <div class="rdt-dd-race"><span>Wins</span><b>${wins}</b></div>
            <div class="rdt-dd-race"><span>Races this event</span><b>${meta.racesThisEvent}</b></div>
          </div>
          <div>
            <div class="rdt-dd-lb">Personal bests</div>
            ${(a?.prs || []).slice(0, 3).map(pr => `<div class="rdt-dd-race"><span>${pr.event}</span><b>${pr.time}</b></div>`).join('') || '<div class="rdt-dd-empty">—</div>'}
          </div>
        </div>
        <button class="rdt-dd-full" onclick="event.stopPropagation();openRankingRow('${clickData}')">Full profile &rarr;</button>
      </div>
    </div>`;
}

function buildTerminalTicker(rows) {
  const items = rows.slice(0, 12).map((r, i) => {
    const a = r.athleteId && ATHLETES[r.athleteId];
    const name = (a && a.name) || r.name || r.athleteId || '—';
    const pb = ((a?.prs || []).find(p => _rdtEvNorm(p.event) === _rdtEvNorm(_rdCurrentEvent)) || {}).time || '';
    const momentum = typeof r.momentum === 'number' ? r.momentum : 0;
    const arrow = momentum > 0 ? '<span class="rdt-tk-up">▲</span>' : momentum < 0 ? '<span class="rdt-tk-dn">▼</span>' : '';
    return `<span class="rdt-tk-item">${i + 1}&nbsp;${name}&nbsp;<b>${pb || '—'}</b>&nbsp;${arrow}</span>`;
  }).join('<span class="rdt-tk-sep">·</span>');
  return `
    <div class="rdt-ticker">
      <div class="rdt-ticker-track">
        <div class="rdt-ticker-content">${items}<span class="rdt-tk-sep">·</span>${items}<span class="rdt-tk-sep">·</span></div>
      </div>
    </div>`;
}

function buildTerminalHtml(rows) {
  if (!rows.length) return '<p class="rankings-empty">No rankings data yet for this event.</p>';
  // "Gap" reads as distance behind whoever is ranked #1 — not the fastest
  // lifetime PB in the field, which can belong to a lower-ranked athlete
  // (rankings here factor in current form, not just all-time best).
  const leaderAthlete = rows[0]?.athleteId && ATHLETES[rows[0].athleteId];
  const leaderPb = ((leaderAthlete?.prs || []).find(p => _rdtEvNorm(p.event) === _rdtEvNorm(_rdCurrentEvent)) || {}).time || '';
  const leaderPbSecs = isFinite(_parseTimeSecs(leaderPb)) ? _parseTimeSecs(leaderPb) : null;

  const countryInfo = {};
  rows.forEach(r => {
    const a = r.athleteId && ATHLETES[r.athleteId];
    const c = (a && a.country) || r.country || '';
    if (c) countryInfo[c] = (countryInfo[c] || 0) + 1;
  });
  const topCountries = Object.entries(countryInfo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);

  const itemsHtml = rows.map((r, i) => buildTerminalItem(r, i + 1, leaderPbSecs)).join('');

  return `
    ${buildTerminalTicker(rows)}
    <div class="rdt-bar">
      <div class="rdt-search"><input type="text" placeholder="search athlete or country" oninput="filterRdt(this.value)"></div>
      <button class="rdt-chip rdt-chip--active" onclick="filterRdtChip(this, null)">All</button>
      ${topCountries.map(c => `<button class="rdt-chip" onclick="filterRdtChip(this, '${c.replace(/'/g, "\\'")}')">${c}</button>`).join('')}
      <button class="rdt-chip" onclick="filterRdtChip(this, 'top10')">Top 10</button>
    </div>
    <div class="rdt-cols">
      <span class="rdt-col-sort" data-col="rank" onclick="sortRdt('rank')">Rk <span class="arw">▼</span></span>
      <span></span>
      <span class="rdt-col-sort" data-col="name" onclick="sortRdt('name')">Athlete</span>
      <span class="rdt-col-sort" data-col="sb" onclick="sortRdt('sb')">SB</span>
      <span class="rdt-col-sort" data-col="pb" onclick="sortRdt('pb')">PB</span>
      <span class="rdt-col-sort" data-col="gap" onclick="sortRdt('gap')">Gap</span>
      <span>Last</span>
      <span>Pl</span>
      <span>Form</span>
    </div>
    <div class="rdt-body" id="rdt-body">${itemsHtml}</div>
    <div class="rdt-ft"><span>Gap = to leader PB · Last = races since this event · click row for detail</span></div>`;
}

window.toggleRdtDetail = function(row) {
  const item = row.closest('.rdt-item');
  if (!item) return;
  const detail = item.querySelector('.rdt-detail');
  const isOpen = !detail.hidden;
  document.querySelectorAll('#rdt-body .rdt-item.sel').forEach(el => {
    el.classList.remove('sel');
    const d = el.querySelector('.rdt-detail');
    if (d) d.hidden = true;
  });
  if (!isOpen) { item.classList.add('sel'); detail.hidden = false; }
};

window.filterRdt = function(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('#rdt-body .rdt-item').forEach(el => {
    const hay = el.dataset.name + ' ' + (el.dataset.country || '').toLowerCase();
    el.style.display = (!q || hay.includes(q)) ? '' : 'none';
  });
};

window.filterRdtChip = function(chip, value) {
  document.querySelectorAll('.rdt-bar .rdt-chip').forEach(c => c.classList.remove('rdt-chip--active'));
  chip.classList.add('rdt-chip--active');
  document.querySelectorAll('#rdt-body .rdt-item').forEach(el => {
    if (!value) { el.style.display = ''; return; }
    if (value === 'top10') { el.style.display = (+el.dataset.sortRank <= 10) ? '' : 'none'; return; }
    el.style.display = (el.dataset.country === value) ? '' : 'none';
  });
};

let _rdtSortCol = 'rank', _rdtSortDir = 'asc';
window.sortRdt = function(col) {
  if (_rdtSortCol === col) { _rdtSortDir = _rdtSortDir === 'asc' ? 'desc' : 'asc'; }
  else { _rdtSortCol = col; _rdtSortDir = 'asc'; }
  const body = document.getElementById('rdt-body');
  if (!body) return;
  const items = [...body.querySelectorAll(':scope > .rdt-item')];
  items.sort((a, b) => {
    const dir = _rdtSortDir === 'asc' ? 1 : -1;
    if (col === 'name') return dir * (a.dataset.sortName || '').localeCompare(b.dataset.sortName || '');
    const key = 'sort' + col[0].toUpperCase() + col.slice(1);
    const va = a.dataset[key], vb = b.dataset[key];
    const na = va === '' || va == null ? Infinity : +va;
    const nb = vb === '' || vb == null ? Infinity : +vb;
    if (na === Infinity && nb === Infinity) return 0;
    if (na === Infinity) return 1;
    if (nb === Infinity) return -1;
    return dir * (na - nb);
  });
  items.forEach(el => body.appendChild(el));
  document.querySelectorAll('.rdt-col-sort').forEach(el => {
    el.classList.toggle('rdt-col-sort--active', el.dataset.col === col);
    const arw = el.querySelector('.arw');
    if (arw) arw.textContent = el.dataset.col === col ? (_rdtSortDir === 'asc' ? '▲' : '▼') : '';
    else if (el.dataset.col === col) el.insertAdjacentHTML('beforeend', ` <span class="arw">${_rdtSortDir === 'asc' ? '▲' : '▼'}</span>`);
  });
};

window.setRdSkim = function(mode) {
  const wrap = document.querySelector('.rd-list-wrap');
  if (!wrap) return;
  wrap.classList.toggle('rd-deep',     mode === 'invested' || mode === 'die-hard');
  wrap.classList.toggle('rd-die-hard', mode === 'die-hard');
  document.querySelector('.rankings-detail')?.classList.toggle('rd-mode-die-hard', mode === 'die-hard');
  ['casual', 'invested', 'die-hard'].forEach(m => {
    document.getElementById(`rd-skim-${m}`)?.classList.toggle('rd-skim-btn--active', mode === m);
  });
  if (mode === 'die-hard') {
    wrap.querySelectorAll('.rd-dd-panel').forEach(p => p.classList.add('open'));
    wrap.querySelectorAll('.rd-row').forEach(r => r.classList.add('dd-open'));
  } else {
    wrap.querySelectorAll('.rd-dd-panel.open').forEach(p => p.classList.remove('open'));
    wrap.querySelectorAll('.rd-row.dd-open').forEach(r => r.classList.remove('dd-open'));
  }
};

window.openRankingRowDeepDive = function(row) {
  const wrap = row.closest('.rd-list-wrap');
  if (!wrap?.classList.contains('rd-deep') && !wrap?.classList.contains('rd-die-hard')) {
    // Not in deep dive — use normal modal
    const encoded = row.dataset.clickData || row.getAttribute('data-click-data');
    if (encoded) openRankingRow(encoded);
    return;
  }
  // Find the panel — it's the next sibling div with class rd-dd-panel
  let panel = row.nextElementSibling;
  while (panel && !panel.classList.contains('rd-dd-panel')) panel = panel.nextElementSibling;
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  // Close all others
  wrap.querySelectorAll('.rd-dd-panel.open').forEach(p => p.classList.remove('open'));
  wrap.querySelectorAll('.rd-row.dd-open').forEach(r => r.classList.remove('dd-open'));
  if (!isOpen) {
    panel.classList.add('open');
    row.classList.add('dd-open');
  }
};

window.filterRankings = function(country) {
  document.querySelectorAll('#main .rd-row, #main .rd-card').forEach(el => {
    el.style.display = (!country || el.dataset.country === country) ? '' : 'none';
  });
};

window.toggleRdCountrySelect = function() {
  const cs = document.getElementById('rd-country-select');
  if (cs) cs.classList.toggle('open');
};

window.pickRdCountry = function(el, country) {
  const val = document.querySelector('#rd-country-select .rd-cs-val');
  if (val) val.innerHTML = el.innerHTML;
  document.querySelectorAll('.rd-cs-opt').forEach(o => o.classList.remove('rd-cs-opt--active'));
  el.classList.add('rd-cs-opt--active');
  const cs = document.getElementById('rd-country-select');
  if (cs) cs.classList.remove('open');
  filterRankings(country);
};

if (!window._rdCsOutsideClick) {
  window._rdCsOutsideClick = true;
  document.addEventListener('click', function(e) {
    const cs = document.getElementById('rd-country-select');
    if (cs && !cs.contains(e.target)) cs.classList.remove('open');
  });
}

window.toggleRdView = function(mode) {
  window._rdView = mode;
  const listWrap = document.querySelector('.rd-list-wrap');
  const gridWrap = document.querySelector('.rd-grid-wrap');
  const termWrap = document.querySelector('.rd-terminal-wrap');
  const colLabels = document.querySelector('.rd-col-labels');
  const skimToggle = document.getElementById('rd-skim-toggle');
  if (listWrap) listWrap.style.display = mode === 'list' ? '' : 'none';
  if (gridWrap) gridWrap.style.display = mode === 'grid' ? '' : 'none';
  if (termWrap) termWrap.style.display = mode === 'terminal' ? '' : 'none';
  if (colLabels) colLabels.style.display = mode === 'list' ? '' : 'none';
  if (skimToggle) skimToggle.style.display = mode === 'terminal' ? 'none' : '';
  document.querySelectorAll('.rd-view-btn').forEach(btn => {
    btn.classList.toggle('rd-view-btn--active', btn.dataset.mode === mode);
  });
};

function buildRankingsDetail(eventName, opts = {}) {
  document.body.classList.add('rd-terminal-page');
  const {
    archiveYear   = null,
    archiveWeekId = null,
    backUrl       = 'rankings.html',
    backLabel     = 'All Rankings',
  } = opts;

  let ev, weekObj;
  if (archiveYear) {
    const season = (RANKINGS_ARCHIVE || []).find(s => s.year === archiveYear);
    ev = season ? (season.events || []).find(e => e.name === eventName) : null;
    if (archiveWeekId) {
      weekObj = (RANKINGS_WEEKS || {})[archiveWeekId] || null;
    }
  } else {
    ev = RANKINGS_EVENTS.find(e => e.name === eventName);
  }

  if (!archiveYear && ev && ev.underConstruction) {
    document.getElementById('main').innerHTML = `
      <div class="container">
        <div class="rankings-detail">
          <a href="${backUrl}" class="rd-back">&larr; ${backLabel}</a>
          <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:60px 24px 100px;min-height:50vh;">
            <div style="margin-bottom:28px;opacity:0.8;">
              <svg viewBox="0 0 100 100" width="90" height="90" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="4" y1="88" x2="96" y2="88" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M62 88 L64 81 L77 81 L79 88 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <rect x="65" y="13" width="11" height="68" stroke="currentColor" stroke-width="2"/>
                <line x1="65" y1="21" x2="76" y2="29" stroke="currentColor" stroke-width="1.2"/>
                <line x1="65" y1="29" x2="76" y2="37" stroke="currentColor" stroke-width="1.2"/>
                <line x1="65" y1="37" x2="76" y2="45" stroke="currentColor" stroke-width="1.2"/>
                <line x1="65" y1="45" x2="76" y2="53" stroke="currentColor" stroke-width="1.2"/>
                <line x1="65" y1="53" x2="76" y2="61" stroke="currentColor" stroke-width="1.2"/>
                <line x1="65" y1="61" x2="76" y2="69" stroke="currentColor" stroke-width="1.2"/>
                <line x1="65" y1="69" x2="76" y2="77" stroke="currentColor" stroke-width="1.2"/>
                <line x1="65" y1="77" x2="76" y2="81" stroke="currentColor" stroke-width="1.2"/>
                <polygon points="65,13 70.5,7 76,13" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <rect x="6" y="8" width="59" height="7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <line x1="6" y1="15" x2="28" y2="8" stroke="currentColor" stroke-width="1.2"/>
                <line x1="28" y1="15" x2="50" y2="8" stroke="currentColor" stroke-width="1.2"/>
                <rect x="76" y="8" width="18" height="7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <line x1="26" y1="15" x2="26" y2="28" stroke="currentColor" stroke-width="1.5"/>
                <polygon points="26,28 32,31.5 32,38.5 26,42 20,38.5 20,31.5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <polygon points="26,31.5 29,33 29,36.5 26,38 23,36.5 23,33" stroke="currentColor" stroke-width="1.2"/>
                <line x1="26" y1="42" x2="26" y2="48" stroke="currentColor" stroke-width="1.5"/>
                <path d="M26 48 Q26 57 33 57 Q40 57 40 50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <rect x="5" y="47" width="14" height="41" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <rect x="8"  y="51" width="3" height="3" fill="currentColor"/>
                <rect x="13" y="51" width="3" height="3" fill="currentColor"/>
                <rect x="8"  y="58" width="3" height="3" fill="currentColor"/>
                <rect x="13" y="58" width="3" height="3" fill="currentColor"/>
                <rect x="8"  y="65" width="3" height="3" fill="currentColor"/>
                <rect x="13" y="65" width="3" height="3" fill="currentColor"/>
                <rect x="8"  y="72" width="3" height="3" fill="currentColor"/>
                <rect x="13" y="72" width="3" height="3" fill="currentColor"/>
                <rect x="20" y="63" width="11" height="25" stroke="currentColor" stroke-width="2"/>
                <rect x="33" y="68" width="24" height="20" stroke="currentColor" stroke-width="2"/>
                <polyline points="31,68 45,54 59,68" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <rect x="41" y="76" width="8" height="12" stroke="currentColor" stroke-width="1.5"/>
                <rect x="35" y="70" width="4" height="4" fill="currentColor"/>
                <rect x="51" y="70" width="4" height="4" fill="currentColor"/>
                <rect x="42" y="59" width="6" height="6" fill="currentColor"/>
                <rect x="57" y="73" width="14" height="15" stroke="currentColor" stroke-width="2"/>
                <polyline points="55,73 64,63 73,73" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <rect x="60" y="80" width="5" height="8" stroke="currentColor" stroke-width="1.5"/>
                <rect x="58" y="75" width="3" height="3" fill="currentColor"/>
                <rect x="67" y="75" width="3" height="3" fill="currentColor"/>
              </svg>
            </div>
            <div style="font-family:var(--font-display);font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;">Coming Soon</div>
            <h1 style="font-family:var(--font-display);font-size:52px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;line-height:1;margin:0 0 0;">Under Construction</h1>
            <div style="width:48px;height:3px;background:var(--accent);border-radius:2px;margin:24px auto 0;"></div>
          </div>
        </div>
      </div>`;
    return;
  }

  // If the week exists but has no rows yet, fall back to the current live rankings for that event
  const liveEv = archiveYear ? RANKINGS_EVENTS.find(e => e.name === eventName) : null;
  const rows     = (weekObj && (weekObj.rows || []).length)     ? weekObj.rows     : (liveEv ? (liveEv.rows     || []) : ((ev && ev.rows)     || []));
  const sections = (weekObj && (weekObj.sections || []).length) ? weekObj.sections : (liveEv ? (liveEv.sections || []) : ((ev && ev.sections) || []));
  const displayYear = archiveYear || RANKINGS_YEAR;

  // Collect unique countries for filter pills
  const countryInfo = {};
  rows.forEach(r => {
    const a = r.athleteId && ATHLETES[r.athleteId];
    const c = (a && a.country) || r.country || '';
    const f = (a && a.flag)    || r.flag    || '';
    if (c && !countryInfo[c]) countryInfo[c] = f;
  });
  const countries = Object.keys(countryInfo).sort();
  const filterHtml = countries.length > 1
    ? `<div class="rd-filter">
        <div class="rd-cs" id="rd-country-select">
          <button class="rd-cs-btn" type="button" onclick="toggleRdCountrySelect()">
            <span class="rd-cs-val">All Countries</span>
            <svg class="rd-cs-arrow" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="rd-cs-list">
            <div class="rd-cs-opt rd-cs-opt--active" onclick="pickRdCountry(this, '')">All Countries</div>
            ${countries.map(c => `<div class="rd-cs-opt" onclick="pickRdCountry(this, '${c.replace(/'/g, "\\'")}')">${renderFlag(countryInfo[c])} ${c}</div>`).join('')}
          </div>
        </div>
      </div>`
    : '';

  _rdCurrentEvent = eventName;

  const rowsHtml = rows.length
    ? rows.map((r, i) => buildRankingRow(r, i + 1)).join('')
    : `<p class="rankings-empty">No rankings data yet for this event.</p>`;

  const sectionsHtml = sections.map(sec => {
    if (!sec.entries || !sec.entries.length) return '';
    const entriesHtml = sec.entries.map(e => buildRankingRow(e, null)).join('');
    return `
      <div class="rd-section">
        <div class="rd-section-header">
          <span class="rd-section-title">${sec.title || ''}</span>
          ${sec.description ? `<span class="rd-section-desc">${sec.description}</span>` : ''}
        </div>
        <div class="rd-list">${entriesHtml}</div>
      </div>
    `;
  }).join('');

  _rdSortCol = 'rank';
  _rdSortDir = 'asc';
  const athleteCount = rows.length;
  const terminalHtml = buildTerminalHtml(rows);

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-detail">
        <div class="rd-header">
          <div class="rd-header-controls rd-header-controls--compact">
            <div class="rd-header-controls-left">
              <a href="${backUrl}" class="rd-back rd-back--mini" title="${backLabel}">&larr;</a>
              <span class="rd-mini-title">${eventName}</span>
              ${filterHtml}
            </div>
            <div class="rd-header-btns">
              <button class="rd-compare-btn" onclick="openH2H(null,'${eventName.replace(/'/g,"\\'")}')">Compare Athletes</button>
            </div>
          </div>
        </div>
        ${ev?.photo && !archiveYear ? `<div class="rd-event-banner" style="background-image:url('${ev.photo}')"></div>` : ''}
        <div class="rd-terminal-wrap">${terminalHtml}</div>
      </div>
    </div>
  `;
  // Detect when col-labels become sticky and activate the top-mask
  const sentinel = document.getElementById('rd-col-sentinel');
  const colLabels = document.querySelector('.rd-col-labels');
  if (sentinel && colLabels) {
    new IntersectionObserver(([entry]) => {
      colLabels.classList.toggle('is-sticky', !entry.isIntersecting);
    }, { rootMargin: '-62px 0px 0px 0px', threshold: 0 }).observe(sentinel);
  }

  if (!archiveYear) enrichRankingsWithWA(eventName);
}

// ── WA PERSONAL BEST ENRICHMENT ─────────────────────────────────
const _waBestCache = {};

async function fetchWAPersonalBests(waUrl, disciplines) {
  if (!waUrl) return null;
  if (_waBestCache[waUrl] !== undefined) return _waBestCache[waUrl];

  try {
    const res = await fetch(`/.netlify/functions/wa-athlete?url=${encodeURIComponent(waUrl)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const outdoor = json.outdoor || [];
    const result = {};
    for (const disc of disciplines) {
      const perf = outdoor.find(p => p.event === disc);
      if (perf) result[disc] = { mark: perf.time, venue: perf.venue };
    }
    _waBestCache[waUrl] = Object.keys(result).length ? result : null;
    return _waBestCache[waUrl];
  } catch (e) {
    _waBestCache[waUrl] = null;
    return null;
  }
}

// Event name keys match what wa-athlete.js normalizes to (e.g. '1500m', 'Mile')
const _WA_DISC = {
  '1500m': ['1500m', 'Mile'],
  '5000m': ['5000m'],
  '10000m': ['10000m'],
  '800m':  ['800m'],
  'mile':  ['Mile', '1500m'],
  'steeplechase': ['3000m SC'],
};

function getWADisciplines(eventName) {
  const norm = eventName.replace(/\s+/g, '').toLowerCase();
  for (const [key, discs] of Object.entries(_WA_DISC)) {
    if (norm.includes(key)) return discs;
  }
  return [];
}

async function enrichRankingsWithWA(eventName) {
  const disciplines = getWADisciplines(eventName);
  if (!disciplines.length) return;
  const is1500Page = eventName.toLowerCase().includes('1500');

  // Populate from local prs immediately (synchronous — no network wait)
  const seen0 = new Set();
  document.querySelectorAll('#main [data-athlete-id]').forEach(el => {
    const athId = el.dataset.athleteId;
    if (!athId || seen0.has(athId)) return;
    seen0.add(athId);
    const ath = ATHLETES[athId];
    if (!ath || !ath.prs) return;
    let localMark = '', localIsMile = false;
    for (const disc of disciplines) {
      const pr = ath.prs.find(p => p.event === disc);
      if (pr && pr.time) { localMark = pr.time; localIsMile = disc.toLowerCase().includes('mile'); break; }
    }
    if (!localMark) return;
    const localBadge = (localIsMile && is1500Page) ? ' <span class="rd-mile-badge">Mile</span>' : '';
    const localPbSecs = _parseTimeSecs(localMark);
    document.querySelectorAll(`#main [data-athlete-id="${athId}"]`).forEach(el2 => {
      const timeEl = el2.querySelector('.rd-time');
      const cardTimeEl = el2.querySelector('.rd-card-time');
      if (timeEl) timeEl.innerHTML = localMark + localBadge;
      if (cardTimeEl) cardTimeEl.innerHTML = localMark + localBadge;
      if (isFinite(localPbSecs)) el2.dataset.sortPb = String(localPbSecs);
    });
  });

  // Deduplicate — list + card both have data-athlete-id, only fetch each athlete once
  const seen = new Set();
  const queue = [];
  document.querySelectorAll('#main [data-athlete-id]').forEach(item => {
    const athId = item.dataset.athleteId;
    if (!athId || seen.has(athId)) return;
    seen.add(athId);
    const ath = ATHLETES[athId];
    if (ath) queue.push({ athId, ath });
  });

  // Process 3 athletes at a time, 300ms between batches
  const BATCH = 3;
  for (let i = 0; i < queue.length; i += BATCH) {
    await Promise.all(queue.slice(i, i + BATCH).map(async ({ athId, ath }) => {
      let mark = '', venue = '', isMile = false;

      const waBests = await fetchWAPersonalBests(ath.waUrl, disciplines);
      if (waBests) {
        for (const disc of disciplines) {
          if (waBests[disc]) {
            mark = waBests[disc].mark;
            venue = waBests[disc].venue;
            isMile = disc.toLowerCase().includes('mile');
            break;
          }
        }
      }

      // Fallback: local prs data
      if (!mark && ath.prs) {
        const pr = ath.prs.find(p => p.event === '1500m') || ath.prs.find(p => p.event === 'Mile');
        if (pr) { mark = pr.time; isMile = pr.event === 'Mile'; }
      }

      if (!mark) return;
      const mileBadge = (isMile && is1500Page) ? ' <span class="rd-mile-badge">Mile</span>' : '';
      const pbSecs = _parseTimeSecs(mark);

      // Update all DOM elements for this athlete (covers both list row and grid card)
      document.querySelectorAll(`#main [data-athlete-id="${athId}"]`).forEach(el => {
        const timeEl = el.querySelector('.rd-time');
        const meetEl = el.querySelector('.rd-meet');
        if (timeEl) timeEl.innerHTML = mark + mileBadge;
        if (meetEl) meetEl.textContent = venue || '';

        const cardTimeEl = el.querySelector('.rd-card-time');
        const cardMeetEl = el.querySelector('.rd-card-meet');
        if (cardTimeEl) cardTimeEl.innerHTML = mark + mileBadge;
        if (cardMeetEl) cardMeetEl.textContent = venue || '';

        if (isFinite(pbSecs)) el.dataset.sortPb = String(pbSecs);
      });
    }));

    if (i + BATCH < queue.length) await new Promise(r => setTimeout(r, 300));
  }
}

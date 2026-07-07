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
  const cardsHtml = RANKINGS_EVENTS.map((ev, i) => {
    const count = (ev.rows || []).length;
    const hasPhoto = !!ev.photo;
    const isActive = count > 0;
    const photoStyle = hasPhoto ? `style="background-image:url('${ev.photo}');"` : '';
    const ghostNum = ev.name.replace(/[^0-9]/g, '') || ev.name;
    const podium = (isActive && !hasPhoto) ? (ev.rows || []).slice(0, 3).map((r, idx) => {
      const a = (r.athleteId && ATHLETES[r.athleteId]) ? ATHLETES[r.athleteId] : null;
      const nm = (a && a.name) || r.name || r.athleteId || '—';
      const t = _bestTime(r, a, ev.name);
      return `
        <div class="ranking-card-pod-row">
          <span class="ranking-card-pod-rank${idx === 0 ? ' first' : ''}">${idx + 1}</span>
          <span class="ranking-card-pod-name">${nm}</span>
          ${t ? `<span class="ranking-card-pod-time">${t}</span>` : ''}
        </div>`;
    }).join('') : '';
    return `
      <div class="ranking-card${hasPhoto ? ' ranking-card--visual' : ''}${isActive ? ' ranking-card--active ranking-card--featured' : ''}" onclick="goTo('rankings.html?event=${encodeURIComponent(ev.name)}')">
        <div class="ranking-card-ghost">${ghostNum}</div>
        <div class="ranking-card-index">${String(i + 1).padStart(2, '0')}</div>
        <div class="ranking-card-left">
          <div class="ranking-card-badge${isActive ? ' ranking-card-badge--active' : ''}">${isActive ? '● Live' : 'Coming Soon'}</div>
          <div class="ranking-card-event">${ev.name}</div>
          ${ev.description ? `<div class="ranking-card-desc">${ev.description}</div>` : ''}
          <div class="ranking-card-cta"><span>${count ? `${count} athletes ranked` : 'Under construction'}</span><span class="ranking-card-cta-arrow">&rarr;</span></div>
        </div>
        ${podium ? `<div class="ranking-card-podium"><div class="ranking-card-podium-label">Top 3</div>${podium}</div>` : ''}
        ${ev.photo ? `<div class="ranking-card-photo" ${photoStyle}></div>` : ''}
      </div>
    `;
  }).join('');

  const eventCount = RANKINGS_EVENTS.length;
  const athleteCount = RANKINGS_EVENTS.reduce((n, ev) => n + (ev.rows || []).length, 0);

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-hub">
        <header class="rhub-hd">
          <div class="rhub-eyebrow"><span class="rhub-tick"></span>StatTC Official &middot; ${RANKINGS_YEAR || new Date().getFullYear()}</div>
          <div class="rhub-hd-main">
            <h1 class="rhub-title">Rankings<span class="rhub-title-outline">Center</span></h1>
            <div class="rhub-stats">
              <div class="rhub-stat"><span class="rhub-stat-num">${String(eventCount).padStart(2, '0')}</span><span class="rhub-stat-label">Events</span></div>
              <div class="rhub-stat"><span class="rhub-stat-num">${String(athleteCount).padStart(2, '0')}</span><span class="rhub-stat-label">Athletes Ranked</span></div>
            </div>
          </div>
          <div class="rhub-rule"></div>
          <div class="rhub-hd-row">
            ${SITE.rankingsIntro ? `<p class="rankings-page-intro">${SITE.rankingsIntro}</p>` : '<span></span>'}
            <div class="rankings-hub-actions">
              <button class="h2h-hub-btn" onclick="openH2H()">⇌ Compare Head to Head</button>
              ${RANKINGS_ARCHIVE.length ? `<a href="rankings.html?view=archive" class="rankings-archive-link"><svg width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:-2px;margin-right:6px"><path d="M1 2.5C1 1.67 1.67 1 2.5 1H5.5L7 3H12.5C13.33 3 14 3.67 14 4.5V10.5C14 11.33 13.33 12 12.5 12H2.5C1.67 12 1 11.33 1 10.5V2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>Rankings Archive &rarr;</a>` : ''}
            </div>
          </div>
        </header>
        ${RANKINGS_CRITERIA ? `
        <div class="rankings-criteria">
          <button class="rankings-criteria-toggle" onclick="window.toggleCriteria()" aria-expanded="false">
            <span>How We Rank</span>
            <span class="criteria-chevron">&#9660;</span>
          </button>
          <div class="rankings-criteria-body" id="criteria-body" hidden>${RANKINGS_CRITERIA}</div>
        </div>
        ` : ''}
        <div class="rankings-cards-grid">${cardsHtml}</div>
      </div>
    </div>
  `;
}

window.toggleCriteria = function() {
  const body = document.getElementById('criteria-body');
  const btn = document.querySelector('.rankings-criteria-toggle');
  const chevron = btn.querySelector('.criteria-chevron');
  const isOpen = body.hasAttribute('hidden');
  if (isOpen) { body.removeAttribute('hidden'); } else { body.setAttribute('hidden', ''); }
  btn.setAttribute('aria-expanded', isOpen);
  chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
};

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
  // Build inline deep-dive panel
  const prsHtml = a ? (a.prs || []).slice(0, 5).map(pr =>
    `<div class="rd-dd-pr-row"><span class="rd-dd-pr-event">${pr.event}</span><span class="rd-dd-pr-time">${pr.time}</span></div>`
  ).join('') : `<div class="rd-dd-pr-row"><span class="rd-dd-pr-event">Season Best</span><span class="rd-dd-pr-time">${seasonBest || '—'}</span></div>`;
  const an = a?.analysis || {};
  const reviewBody   = an.reviewBody   && an.reviewBody   !== 'x' ? an.reviewBody   : '';
  const questionBody = an.questionBody && an.questionBody !== 'x' ? an.questionBody : '';
  const analysisHtml = reviewBody
    ? `<p>${reviewBody}</p>`
    : (questionBody ? `<p><em>${questionBody}</em></p>` : '');
  const headlineHtml = r.bite
    ? `<div class="rd-dd-headline"><span class="hl-key rd-bite">${r.bite}</span></div>`
    : '';
  const ddPanel = `
    <div class="rd-dd-panel">
      <div class="rd-dd-panel-photo" style="background-color:${photoBg};background-image:url('${a?.photo || photo}')"></div>
      <div class="rd-dd-panel-body">
        <div class="rd-dd-panel-hd">
          <div class="rd-dd-panel-nameblock">
            <div class="rd-dd-panel-name">${name}</div>
            <div class="rd-dd-panel-country">${renderFlag(flag)} ${country}</div>
          </div>
        </div>
        ${headlineHtml}
        ${r.traits?.length ? `<div class="rd-dd-traits">${buildTraitsHtml(r.traits)}</div>` : ''}
        ${seasonBest && seasonBest !== '—' ? `
          <div class="rd-dd-sb-block">
            <span class="rd-dd-sb-label">${RANKINGS_YEAR} Season Best</span>
            <span class="rd-dd-sb-time">${seasonBest}${meet ? ` <span class="rd-dd-sb-meet">· ${meet}</span>` : ''}</span>
          </div>` : ''}
        <div class="rd-dd-panel-lower">
          <div class="rd-dd-panel-prs">
            <div class="rd-dd-panel-label">Personal Bests</div>
            ${prsHtml}
          </div>
          ${analysisHtml ? `
            <div class="rd-dd-panel-analysis">
              <div class="rd-dd-panel-label">Analysis</div>
              ${analysisHtml}
            </div>
          ` : ''}
        </div>
      </div>
      <button class="rd-dd-close" onclick="event.stopPropagation();this.closest('.rd-dd-panel').classList.remove('open');this.closest('.rd-dd-panel').previousElementSibling.classList.remove('dd-open')">×</button>
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

window.setRdSkim = function(mode) {
  const wrap = document.querySelector('.rd-list-wrap');
  if (!wrap) return;
  wrap.classList.toggle('rd-deep',     mode === 'invested' || mode === 'die-hard');
  wrap.classList.toggle('rd-die-hard', mode === 'die-hard');
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
  const colLabels = document.querySelector('.rd-col-labels');
  if (listWrap) listWrap.style.display = mode === 'grid' ? 'none' : '';
  if (gridWrap) gridWrap.style.display = mode === 'grid' ? '' : 'none';
  if (colLabels) colLabels.style.display = mode === 'grid' ? 'none' : '';
  document.querySelectorAll('.rd-view-btn').forEach((btn, i) => {
    btn.classList.toggle('rd-view-btn--active', (i === 0 && mode === 'list') || (i === 1 && mode === 'grid'));
  });
};

function buildRankingsDetail(eventName, opts = {}) {
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
  const weekLabel = weekObj ? (weekObj.label || null) : null;
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

  const cardsHtml = rows.length
    ? rows.map((r, i) => buildRankingCard(r, i + 1)).join('')
    : '';

  const sectionCardsHtml = sections.map(sec => {
    if (!sec.entries || !sec.entries.length) return '';
    return `
      <div class="rd-section">
        <div class="rd-section-header">
          <span class="rd-section-title">${sec.title || ''}</span>
          ${sec.description ? `<span class="rd-section-desc">${sec.description}</span>` : ''}
        </div>
        <div class="rd-grid">${sec.entries.map(e => buildRankingCard(e, null)).join('')}</div>
      </div>
    `;
  }).join('');

  _rdSortCol = 'rank';
  _rdSortDir = 'asc';
  const isGrid = window._rdView === 'grid';
  const athleteCount = rows.length;

  // Use event photo if set, else fall back to the #1 ranked athlete's photo
  const headerPhoto = (() => {
    if (ev?.photo) return ev.photo;
    if (!archiveYear && rows[0]) {
      const a = rows[0].athleteId && ATHLETES[rows[0].athleteId];
      return (a && a.photo) || null;
    }
    return null;
  })();

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="rankings-detail">
        <a href="${backUrl}" class="rd-back">&larr; ${backLabel}</a>
        <div class="rd-header">
          <div class="rd-header-hero" data-ghost="${eventName.replace(/[^0-9]/g,'')||eventName}">
            <div class="rd-header-left">
              <div class="rd-header-meta">${displayYear} Season Rankings${archiveYear ? ' <span class="archive-stamp">Archive</span>' : ''}</div>
              <h1 class="rd-header-event">${eventName}</h1>
              ${weekLabel ? `<p class="rd-header-desc">${weekLabel}</p>` : (ev && ev.description ? `<p class="rd-header-desc">${ev.description}</p>` : '')}
            </div>
          </div>
          <div class="rd-header-controls">
            ${athleteCount ? `<span class="rd-header-count">${athleteCount} athletes ranked</span>` : '<span></span>'}
            <div class="rd-header-btns">
              <div class="rd-skim-toggle" id="rd-skim-toggle">
                <button class="rd-skim-btn rd-skim-btn--active" id="rd-skim-casual"   onclick="setRdSkim('casual')">Casual</button>
                <button class="rd-skim-btn" id="rd-skim-invested" onclick="setRdSkim('invested')">Invested</button>
                <button class="rd-skim-btn" id="rd-skim-die-hard" onclick="setRdSkim('die-hard')">Die Hard</button>
              </div>
              <button class="rd-compare-btn" onclick="openH2H(null,'${eventName.replace(/'/g,"\\'")}')">⇌ Compare Athletes</button>
              <div class="rd-view-toggle">
                <button class="rd-view-btn${!isGrid ? ' rd-view-btn--active' : ''}" onclick="toggleRdView('list')" title="List view">
                  <svg viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="20" height="3" rx="1.5" fill="currentColor"/><rect x="0" y="6.5" width="20" height="3" rx="1.5" fill="currentColor"/><rect x="0" y="13" width="20" height="3" rx="1.5" fill="currentColor"/></svg>
                </button>
                <button class="rd-view-btn${isGrid ? ' rd-view-btn--active' : ''}" onclick="toggleRdView('grid')" title="Card view">
                  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="9" height="9" rx="1.5" fill="currentColor"/><rect x="11" y="0" width="9" height="9" rx="1.5" fill="currentColor"/><rect x="0" y="11" width="9" height="9" rx="1.5" fill="currentColor"/><rect x="11" y="11" width="9" height="9" rx="1.5" fill="currentColor"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        ${ev?.photo && !archiveYear ? `<div class="rd-event-banner" style="background-image:url('${ev.photo}')"></div>` : ''}
        ${filterHtml}
        <div id="rd-col-sentinel"></div>
        <div class="rd-col-labels" style="${isGrid ? 'display:none' : ''}">
          <span class="rd-col-sort rd-col-sort--active" data-col="rank" onclick="sortRankings('rank')">Rank <span class="rd-sort-icon">▲</span></span>
          <span class="rd-col-sort" data-col="name" onclick="sortRankings('name')">Athlete <span class="rd-sort-icon">⇅</span></span>
          <span>Trend</span>
          <span class="rd-col-sort rd-col-label--right" data-col="sb" onclick="sortRankings('sb')">SB <span class="rd-sort-icon">⇅</span></span>
          <span class="rd-col-sort rd-col-label--right" data-col="pb" onclick="sortRankings('pb')">PB <span class="rd-sort-icon">⇅</span></span>
        </div>
        <div class="rd-list-wrap" style="${isGrid ? 'display:none' : ''}">
          <div class="rd-list">${rowsHtml}</div>
          ${sectionsHtml}
        </div>
        <div class="rd-grid-wrap" style="${isGrid ? '' : 'display:none'}">
          <div class="rd-grid">${cardsHtml}</div>
          ${sectionCardsHtml}
        </div>
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

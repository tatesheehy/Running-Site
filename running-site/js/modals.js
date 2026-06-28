// ============================================================
//  MODALS — athlete card, H2H, search
// ============================================================

// ── ATHLETE CARD MODAL ─────────────────────────────────────
function buildAthleteCardModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'athlete-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = '<div class="athlete-card" id="athlete-card-inner"></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeAthleteCard();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAthleteCard();
  });
}

function openAthleteCard(athleteId, rank) {
  const a = ATHLETES[athleteId];
  if (!a) return;

  const FLAG_COLORS = {
    AU:  '#FFCD00', // Australia gold
    BI:  '#75AADB', // Botswana blue
    FR:  '#002395', // France blue
    GB:  '#CF081F', // Great Britain / England red
    IE:  '#169B62', // Ireland green
    KE:  '#BB0000', // Kenya red
    MA:  '#C1272D', // Morocco red
    NL:  '#FF6600', // Netherlands orange
    NZ:  '#00247D', // New Zealand blue
    NO:  '#EF2B2D', // Norway red
    PT:  '#006600', // Portugal green
    SCT: '#003C82', // Scotland blue
    ES:  '#AA151B', // Spain red
    US:  '#002868', // United States navy
  };
  const countryColor = FLAG_COLORS[a.flag] || 'var(--accent)';

  const overlay = qs('#athlete-modal');
  const inner = qs('#athlete-card-inner');

  const photoHtml = a.photo
    ? `<img class="card-photo" src="${a.photo}" alt="${a.name}">`
    : `<div class="card-photo-placeholder no-photo"></div>`;

  const vitalsHtml = Object.entries(a.vitals || {}).map(([k, v]) => `
    <div class="card-vital">
      <span class="card-vital-label">${k}</span>
      <span class="card-vital-value">${v}</span>
    </div>
  `).join('');

  const prsHtml = (a.prs || []).slice(0, 4).map(pr => `
    <div class="card-pr-row">
      <span class="card-pr-event">${pr.event || ''}</span>
      <span class="card-pr-time">${pr.time || ''}</span>
    </div>
  `).join('');

  const achieveHtml = (a.achievements || []).map(ac => `
    <div class="card-achievement">
      <span class="card-achievement-icon">${ac.icon}</span>
      <span class="card-achievement-count">${ac.count}</span>
      <span class="card-achievement-label">${ac.label}</span>
    </div>
  `).join('');

  const extraHtml = Object.entries(a.extra || {})
    .filter(([, v]) => v && String(v).trim() && String(v).trim() !== 'x')
    .map(([k, v]) => `<strong>${k}</strong> ${v}<br>`)
    .join('');

  const traitsHtml = (a.traits || []).map(t => `
    <div class="card-trait">
      <div class="card-trait-icon">${t.emoji}</div>
      <div class="card-trait-label">${t.label}</div>
    </div>
  `).join('');

  const an = a.analysis || {};

  inner.innerHTML = `
    <div class="card-header" style="border-top: 7px solid ${countryColor}">
      ${rank != null ? `<div class="card-rank">${rank}</div>` : ''}
      <div class="card-header-center">
        <div>
          <span class="card-athlete-name">${a.name}</span>
          <span class="card-athlete-country">${renderFlag(a.flag)} ${a.country}</span>
        </div>
      </div>
      <div class="card-header-actions">
        <button class="card-share-btn" onclick="openShareOverlay('${athleteId}')" title="Share athlete card">↗ Share</button>
        <button class="card-compare-btn" onclick="closeAthleteCard();openH2H('${athleteId}',new URLSearchParams(location.search).get('event'))" title="Compare athletes">⇌ Compare</button>
        <button class="card-close" onclick="closeAthleteCard()" aria-label="Close">×</button>
      </div>
    </div>
    <div class="card-body">
      <div class="card-left">
        <div class="card-photo-wrap" style="background:${a.photoBackground || '#1a1a2e'};">
          <div class="card-photo-bg"></div>
          ${photoHtml}
          <span class="card-event-badge">${a.event || ''}</span>
        </div>
        <div class="card-info">
          <div class="card-vitals">${vitalsHtml}</div>
          ${prsHtml ? `<div class="card-prs"><div class="card-prs-label">Personal Records</div>${prsHtml}</div>` : ''}
          ${achieveHtml ? `<div class="card-achievements">${achieveHtml}</div>` : ''}
          ${extraHtml ? `<div class="card-extra">${extraHtml}</div>` : ''}
          ${(a.ncaa || a.college || a.collegeLogo) ? `
            <div class="card-ncaa">
              <div class="card-ncaa-logos">
                ${a.ncaa ? `<svg class="card-ncaa-logo" viewBox="0 0 72 28" xmlns="http://www.w3.org/2000/svg" aria-label="NCAA"><rect width="72" height="28" rx="5" fill="#003087"/><text x="36" y="20" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="15" fill="#ffffff" letter-spacing="1">NCAA</text></svg>` : ''}
                ${a.collegeLogo ? `<img class="card-college-logo" src="${a.collegeLogo}" alt="${a.college || 'College logo'}">` : ''}
              </div>
              ${a.college ? `<div class="card-college-name">${a.college}</div>` : ''}
            </div>
          ` : ''}
          ${a.waUrl ? `<a class="card-wa-link" href="${a.waUrl}" target="_blank" rel="noopener noreferrer">World Athletics ↗</a>` : ''}
        </div>
      </div>
      <div class="card-right">
        ${a.headline ? `
          <div class="card-headline">
            <span class="hl-key">${a.headline.keyWord}</span>
            <span class="hl-rest"> ${a.headline.rest}</span>
          </div>
        ` : ''}
        ${traitsHtml ? `<div class="card-traits">${traitsHtml}</div>` : ''}
        ${(() => {
          const results = a.results || [];
          return `
          <details class="card-results">
            <summary class="card-results-toggle">
              <span class="card-results-label">2026 Season Results</span>
              <span class="card-results-count">${results.length} race${results.length === 1 ? '' : 's'}</span>
              ${a.lastSynced ? `<span class="card-results-synced">updated ${(() => { const d = new Date(a.lastSynced + 'T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })()}</span>` : ''}
              <span class="card-results-arrow">▸</span>
            </summary>
            ${results.length > 0 ? `
            <table class="card-results-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meet</th>
                  <th>Event</th>
                  <th>Time</th>
                  <th>Pl.</th>
                </tr>
              </thead>
              <tbody>
                ${results.map(r => `
                  <tr>
                    <td class="cr-date">${r.date || ''}</td>
                    <td class="cr-meet">${r.meet || ''}</td>
                    <td class="cr-event">${r.event || ''}</td>
                    <td class="cr-time">${['DNF','DNS','DQ','NM','NH','DSQ'].includes((r.time||'').toUpperCase()) ? `<span class="cr-nonfinish">${r.time}</span>` : (r.time || '')}</td>
                    <td class="cr-place">${['DNF','DNS','DQ','NM','NH','DSQ'].includes((r.time||'').toUpperCase()) ? '' : (r.place || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : `<p class="card-results-empty">No results yet this season.</p>`}
          </details>`;
        })()}
        <div class="card-analysis-label">Analysis</div>
        ${an.reviewTitle ? `
          <div class="card-analysis-section">
            <p><strong>${an.reviewTitle}:</strong> ${an.reviewBody || ''}</p>
          </div>
        ` : ''}
        ${an.questionTitle ? `
          <div class="card-analysis-section">
            <p><strong>${an.questionTitle}:</strong> <em>${an.questionBody || ''}</em></p>
          </div>
        ` : ''}
        ${(() => {
          const similar = getSimilarAthletes(a);
          if (!similar.length) return '';
          const cards = similar.map(s => {
            const photo = s.photo || '';
            const bg = s.photoBackground || '#111';
            return `
              <div class="similar-card" onclick="openAthleteCard('${s.id}', null)">
                <div class="similar-photo${photo ? '' : ' no-photo'}" style="${photo ? `background-color:${bg};background-image:url('${photo}')` : ''}"></div>
                <div class="similar-name">${s.name}</div>
                <div class="similar-country">${renderFlag(s.flag)} ${s.country}</div>
              </div>`;
          }).join('');
          return `
            <div class="similar-section">
              <div class="similar-label">Similar Athletes</div>
              <div class="similar-list">${cards}</div>
            </div>`;
        })()}
      </div>
    </div>
  `;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAthleteCard() {
  qs('#athlete-modal').classList.remove('open');
  document.body.style.overflow = '';
}

window.openAthleteCard = openAthleteCard;
window.closeAthleteCard = closeAthleteCard;

// Opens full card if athlete profile exists, otherwise shows a compact mini card
window.openRankingRow = function(encodedData) {
  const r = JSON.parse(decodeURIComponent(encodedData));
  if (r.athleteId && ATHLETES[r.athleteId]) {
    openAthleteCard(r.athleteId, r.rank);
    return;
  }
  // Mini card for athletes without a full profile
  const overlay = qs('#athlete-modal');
  const inner = qs('#athlete-card-inner');
  inner.innerHTML = `
    <div class="card-header">
      <div class="card-rank">${r.rank}</div>
      <div class="card-header-center">
        <div class="card-athlete-name">${r.name}</div>
        <span class="card-athlete-country">${renderFlag(r.flag)} ${r.country}</span>
      </div>
      <button class="card-close" onclick="closeAthleteCard()" aria-label="Close">×</button>
    </div>
    <div class="mini-card-body">
      <div class="mini-card-stat">
        <div class="mini-card-stat-value">${r.seasonBest || '—'}</div>
        <div class="mini-card-stat-label">Season Best</div>
      </div>
      <div class="mini-card-stat">
        <div class="mini-card-stat-value">${r.meet || '—'}</div>
        <div class="mini-card-stat-label">Meet</div>
      </div>
      <div class="mini-card-note">Full athlete profile coming soon.</div>
    </div>
  `;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

// ── HEAD TO HEAD ───────────────────────────────────────────
let h2hSlots = [null, null];
let h2hEventContext = null;

function parseTimeToSecs(t) {
  if (!t) return null;
  const parts = String(t).trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function openH2H(preselectedId, eventContext) {
  h2hEventContext = eventContext || null;
  let modal = qs('#h2h-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'h2h-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="h2h-card">
        <div class="h2h-header">
          <span class="h2h-title">Head to Head</span>
          <button class="h2h-close-btn" onclick="closeH2H()" aria-label="Close">×</button>
        </div>
        <div class="h2h-pickers">
          <div class="h2h-picker" id="h2h-picker-1">
            <input class="h2h-input" id="h2h-input-1" placeholder="Search athlete…" autocomplete="off">
            <div class="h2h-dropdown" id="h2h-drop-1"></div>
          </div>
          <div class="h2h-vs">VS</div>
          <div class="h2h-picker" id="h2h-picker-2">
            <input class="h2h-input" id="h2h-input-2" placeholder="Search athlete…" autocomplete="off">
            <div class="h2h-dropdown" id="h2h-drop-2"></div>
          </div>
        </div>
        <div class="h2h-comparison" id="h2h-comparison">
          <p class="h2h-prompt">Search for two athletes above to compare them.</p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeH2H(); });
    setupH2HPickers();
  }
  h2hSlots = [null, null];
  qs('#h2h-input-1').value = '';
  qs('#h2h-input-2').value = '';
  qs('#h2h-comparison').innerHTML = '<p class="h2h-prompt">Search for two athletes above to compare them.</p>';
  const titleEl = qs('.h2h-title');
  if (titleEl) titleEl.textContent = 'Head to Head';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (preselectedId) setH2HSlot(1, preselectedId);
}

function closeH2H() {
  const modal = qs('#h2h-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function setupH2HPickers() {
  [1, 2].forEach(slot => {
    const input = qs('#h2h-input-' + slot);
    const drop  = qs('#h2h-drop-' + slot);
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
      const matches = Object.values(ATHLETES).filter(a => a.name.toLowerCase().includes(q)).slice(0, 7);
      drop.innerHTML = matches.length
        ? matches.map(a => `<div class="h2h-dd-item" onclick="setH2HSlot(${slot},'${a.id}')">${renderFlag(a.flag)} ${a.name} <span class="h2h-dd-country">${a.country}</span></div>`).join('')
        : '<div class="h2h-dd-empty">No athletes found</div>';
      drop.classList.add('open');
    });
    document.addEventListener('click', e => {
      if (!qs('#h2h-picker-' + slot)?.contains(e.target)) drop.classList.remove('open');
    });
  });
}

function setH2HSlot(slot, athleteId) {
  const a = ATHLETES[athleteId];
  if (!a) return;
  h2hSlots[slot - 1] = athleteId;
  qs('#h2h-input-' + slot).value = a.name;
  qs('#h2h-drop-' + slot).classList.remove('open');
  if (h2hSlots[0] && h2hSlots[1]) renderH2HComparison(h2hSlots[0], h2hSlots[1]);
}

function renderH2HComparison(id1, id2) {
  const a1 = ATHLETES[id1], a2 = ATHLETES[id2];
  if (!a1 || !a2) return;

  const getRankInfo = id => {
    const ranked = [];
    const sectioned = [];
    RANKINGS_EVENTS.forEach(ev => {
      const idx = (RANKINGS[ev.name] || []).findIndex(r => r.athleteId === id);
      if (idx !== -1) ranked.push({ event: ev.name, rank: idx + 1 });
      (ev.sections || []).forEach(sec => {
        if ((sec.entries || []).some(e => e.athleteId === id)) {
          sectioned.push({ event: ev.name, section: sec.title });
        }
      });
    });
    return { ranked, sectioned };
  };

  const EVENT_ORDER = ['60m','100m','200m','400m','800m','1500m','Mile','3000m','5000m','10000m','Half Marathon','Marathon','Steeplechase','60mH','110mH','400mH'];
  const a1Events = new Set((a1.prs || []).map(p => p.event));
  const a2Events = new Set((a2.prs || []).map(p => p.event));
  const shared = [...a1Events].filter(e => a2Events.has(e));

  const getPriority = (sharedEvs) => {
    const ctx = (h2hEventContext || '').toLowerCase();
    const has = ev => sharedEvs.includes(ev);
    if (ctx.includes('1500')) {
      return ['1500m', '800m', 'Mile', '3000m', '5000m'];
    } else if (ctx.includes('5000') || ctx.includes('3000')) {
      return [has('Mile') ? 'Mile' : '1500m', '3000m', '5000m', has('10000m') ? '10000m' : '800m'];
    } else if (ctx.includes('800')) {
      return ['800m', has('Mile') ? 'Mile' : '1500m'];
    } else if (ctx.includes('10000') || ctx.includes('10,000')) {
      return ['10000m', '5000m', '3000m', has('Mile') ? 'Mile' : '1500m'];
    }
    return [];
  };

  const priority = getPriority(shared);
  const allPrEvents = [
    ...priority.filter(e => shared.includes(e)),
    ...shared.filter(e => !priority.includes(e)).sort((a, b) => {
      const ai = EVENT_ORDER.indexOf(a), bi = EVENT_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }),
  ];

  const n1 = a1.name.split(' ').slice(-1)[0];
  const n2 = a2.name.split(' ').slice(-1)[0];

  // Shared 3-column PR table: a1 time | event | a2 time
  const sharedPrHtml = allPrEvents.length
    ? allPrEvents.map(ev => {
        const pr1 = (a1.prs || []).find(p => p.event === ev);
        const pr2 = (a2.prs || []).find(p => p.event === ev);
        const t1 = pr1 ? parseTimeToSecs(pr1.time) : null;
        const t2 = pr2 ? parseTimeToSecs(pr2.time) : null;
        const a1wins = t1 && t2 && t1 < t2;
        const a2wins = t1 && t2 && t2 < t1;
        return `<div class="h2h-shared-pr-row">
          <span class="h2h-spr-t${a1wins ? ' h2h-spr-win' : ''}">${pr1 ? pr1.time : '—'}</span>
          <span class="h2h-spr-ev">${ev}</span>
          <span class="h2h-spr-t h2h-spr-t--right${a2wins ? ' h2h-spr-win' : ''}">${pr2 ? pr2.time : '—'}</span>
        </div>`;
      }).join('')
    : '<div class="h2h-empty-row" style="text-align:center;padding:12px 0">No shared events to compare</div>';

  // Head-to-head race record from season results
  const r1all = a1.results || [];
  const r2all = a2.results || [];
  const h2hRaces = [];
  r1all.forEach(race1 => {
    if (!race1.meet || !race1.event) return;
    const match = r2all.find(race2 =>
      race2.meet && race2.event &&
      race1.meet.trim().toLowerCase() === race2.meet.trim().toLowerCase() &&
      race1.event.trim().toLowerCase() === race2.event.trim().toLowerCase()
    );
    if (!match) return;
    const p1 = parseInt(race1.place), p2 = parseInt(match.place);
    let a1wins = false, a2wins = false;
    if (!isNaN(p1) && !isNaN(p2)) {
      a1wins = p1 < p2; a2wins = p2 < p1;
    } else {
      const t1 = parseTimeToSecs(race1.time), t2 = parseTimeToSecs(match.time);
      if (t1 && t2) { a1wins = t1 < t2; a2wins = t2 < t1; }
    }
    h2hRaces.push({ date: race1.date, meet: race1.meet, event: race1.event,
      time1: race1.time, time2: match.time, place1: race1.place, place2: match.place,
      a1wins, a2wins });
  });
  const h2hW1 = h2hRaces.filter(r => r.a1wins).length;
  const h2hW2 = h2hRaces.filter(r => r.a2wins).length;

  const h2hRecordHtml = h2hRaces.length ? `
    <div class="h2h-record-section">
      <div class="h2h-pr-section-hdr">
        <span class="h2h-pr-ath">${n1}</span>
        <span class="h2h-pr-label">This Season</span>
        <span class="h2h-pr-ath h2h-pr-ath--right">${n2}</span>
      </div>
      <div class="h2h-record-score">
        <span class="h2h-record-wins${h2hW1 > h2hW2 ? ' h2h-record-leading' : ''}">${h2hW1}</span>
        <span class="h2h-record-label">${h2hRaces.length} race${h2hRaces.length === 1 ? '' : 's'}</span>
        <span class="h2h-record-wins${h2hW2 > h2hW1 ? ' h2h-record-leading' : ''}">${h2hW2}</span>
      </div>
      ${h2hRaces.map(r => `
        <div class="h2h-record-row">
          <span class="h2h-record-t${r.a1wins ? ' h2h-spr-win' : r.a2wins ? ' h2h-record-dim' : ''}">${r.time1 || '—'}${r.place1 ? ' <span class="h2h-record-place">(' + r.place1 + ')</span>' : ''}</span>
          <span class="h2h-record-mid">
            <span class="h2h-record-meet">${r.meet}</span>
            <span class="h2h-record-meta">${r.event}${r.date ? ' · ' + r.date : ''}</span>
          </span>
          <span class="h2h-record-t h2h-record-t--right${r.a2wins ? ' h2h-spr-win' : r.a1wins ? ' h2h-record-dim' : ''}">${r.time2 || '—'}${r.place2 ? ' <span class="h2h-record-place">(' + r.place2 + ')</span>' : ''}</span>
        </div>`).join('')}
    </div>` : '';

  const col = (a, isRight) => {
    const { ranked, sectioned } = getRankInfo(a.id);
    const photoHtml = a.photo
      ? `<img class="h2h-photo" src="${a.photo}" alt="${a.name}">`
      : `<div class="h2h-photo-ph no-photo"></div>`;

    let rankHtml;
    if (ranked.length) {
      rankHtml = ranked.map(r =>
        `<div class="h2h-rank-row"><span class="h2h-rank-num">#${r.rank}</span><span class="h2h-rank-ev">${r.event}</span></div>`
      ).join('');
    } else if (sectioned.length) {
      rankHtml = sectioned.map(s =>
        `<div class="h2h-rank-row h2h-rank-section">
          <span class="h2h-rank-tag">${s.section}</span><span class="h2h-rank-ev">${s.event}</span>
        </div>`
      ).join('');
    } else {
      rankHtml = `<div class="h2h-empty-row">No current ranking data</div>`;
    }

    return `
      <div class="h2h-col${isRight ? ' h2h-col--right' : ''}">
        <div class="h2h-photo-wrap" style="background:${a.photoBackground || '#111'}">${photoHtml}</div>
        <div class="h2h-name${isRight ? ' h2h-name--right' : ''}">${a.name}</div>
        <div class="h2h-country${isRight ? ' h2h-country--right' : ''}">${renderFlag(a.flag)} ${a.country}</div>
        ${a.event ? `<div class="h2h-event-tag${isRight ? ' h2h-event-tag--right' : ''}">${a.event}</div>` : ''}
        <div class="h2h-section-label">Rankings</div>
        <div class="h2h-ranks">${rankHtml}</div>
      </div>`;
  };

  qs('#h2h-comparison').innerHTML = `
    <div class="h2h-cols">
      ${col(a1, false)}
      <div class="h2h-col-divider"></div>
      ${col(a2, true)}
    </div>
    <div class="h2h-pr-section">
      <div class="h2h-pr-section-hdr">
        <span class="h2h-pr-ath">${n1}</span>
        <span class="h2h-pr-label">Personal Bests</span>
        <span class="h2h-pr-ath h2h-pr-ath--right">${n2}</span>
      </div>
      <div class="h2h-pr-table">${sharedPrHtml}</div>
    </div>
    ${h2hRecordHtml}`;

  const titleEl = qs('.h2h-title');
  if (titleEl) titleEl.textContent = `${n1} vs ${n2}`;

  requestAnimationFrame(() => {
    const els = qs('#h2h-comparison').querySelectorAll('.h2h-ranks');
    if (els.length === 2) {
      els[0].style.minHeight = '';
      els[1].style.minHeight = '';
      const maxH = Math.max(els[0].offsetHeight, els[1].offsetHeight);
      els[0].style.minHeight = maxH + 'px';
      els[1].style.minHeight = maxH + 'px';
    }
  });
}

window.openH2H = openH2H;
window.closeH2H = closeH2H;
window.setH2HSlot = setH2HSlot;

// ── SEARCH ────────────────────────────────────────────────
window.openSearch = function() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const input = document.getElementById('search-input');
  if (input) { input.value = ''; input.focus(); }
  const list = document.getElementById('search-results-list');
  if (list) list.innerHTML = '';
};

window.closeSearch = function() {
  const overlay = document.getElementById('search-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

window.handleSearchInput = function(query) {
  const container = document.getElementById('search-results-list');
  if (!container) return;
  const q = query.trim().toLowerCase();
  if (!q) { container.innerHTML = ''; return; }

  const results = ARTICLES.filter(a =>
    (a.title || '').toLowerCase().includes(q) ||
    (a.excerpt || '').toLowerCase().includes(q) ||
    (a.category || '').toLowerCase().includes(q) ||
    (a.author || '').toLowerCase().includes(q)
  );

  if (!results.length) {
    container.innerHTML = `<div class="search-no-results">No articles found for "${query}"</div>`;
    return;
  }

  container.innerHTML = results.map(a => `
    <div class="search-result-item" onclick="goTo('article.html?id=${a.id}');closeSearch();">
      <div class="search-result-cat">${a.category}</div>
      <div class="search-result-title">${a.title}</div>
      ${a.excerpt ? `<div class="search-result-excerpt">${a.excerpt}</div>` : ''}
      <div class="search-result-meta">${a.author} · ${a.date} · ${a.readTime}</div>
    </div>
  `).join('');
};

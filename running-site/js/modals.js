// ============================================================
//  MODALS — athlete card, H2H, search
// ============================================================

// ── SEASON TIMELINE ────────────────────────────────────────
const _TL_MONTHS = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
const _TL_NF = new Set(['DNF','DNS','DQ','NM','NH','DSQ']);

function _tlOrd(dateStr) {
  const [mon, day] = String(dateStr || '').split(' ');
  return (_TL_MONTHS[mon] || 0) * 31 + parseInt(day || 0);
}

function buildSeasonTimeline(a) {
  const results = (a.results || []).filter(r => r.date);
  if (results.length < 2) return '';

  const sorted = [...results].sort((x, y) => _tlOrd(x.date) - _tlOrd(y.date));
  const minOrd = _tlOrd(sorted[0].date);
  const maxOrd = _tlOrd(sorted[sorted.length - 1].date);
  const range  = Math.max(maxOrd - minOrd, 1);

  const prTimes = new Set((a.prs || []).map(p => p.time));

  function dotKind(r) {
    if (_TL_NF.has(String(r.time || '').toUpperCase())) return 'dnf';
    const p = parseInt(r.place || 99);
    if (p === 1) return 'win';
    if (p <= 3)  return 'pod';
    if (p <= 8)  return 'top';
    return 'out';
  }

  // Group races that share the same date
  const byDate = {};
  sorted.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });

  const dots = Object.entries(byDate).map(([date, races]) => {
    const pct  = (((_tlOrd(date) - minOrd) / range) * 88 + 6).toFixed(1); // 6–94%
    const kind = dotKind(races[0]);
    const isPR = races.some(r => prTimes.has(r.time));
    const count = races.length;
    const shortEv = (races[0].event || '')
      .replace('Half Marathon','HM').replace('Marathon','Mar')
      .replace('3000m SC','SC').replace('3000m Steeplechase','SC')
      .replace('Cross Country','XC');

    const tipMeet = (races[0].meet || '').replace(/"/g,'&quot;');
    const tipRows = races.map(r =>
      `${r.event} · ${r.time}${_TL_NF.has(String(r.time||'').toUpperCase()) ? '' : ' · #'+r.place}`
    ).join('&#10;');

    return `<div class="tl-wrap" style="left:${pct}%"
        onmouseenter="_tlShow(this)" onmouseleave="_tlHide()"
        data-meet="${tipMeet}" data-rows="${tipRows}" data-date="${date}">
      <div class="tl-dot tl-${kind}${isPR?' tl-pr':''}${count>1?' tl-multi':''}">${count>1?count:kind==='win'?'1':''}</div>
    </div>`;
  }).join('');

  // Month axis markers
  const months = [...new Set(sorted.map(r => r.date.split(' ')[0]))];
  const mks = months.map(mon => {
    const pct = Math.max(0, Math.min(100, ((_tlOrd(mon+' 15') - minOrd) / range) * 88 + 6)).toFixed(1);
    return `<div class="tl-mon" style="left:${pct}%">${mon}</div>`;
  }).join('');

  return `
    <div class="season-tl">
      <div class="season-tl-hdr">
        <span class="season-tl-title">Season at a glance</span>
        <span class="season-tl-leg">
          <span class="tl-dot tl-win" style="width:10px;height:10px;font-size:0;display:inline-block"></span> Win
        </span>
      </div>
      <div class="season-tl-body">
        <div class="season-tl-months">${mks}</div>
        <div class="season-tl-track">
          <div class="season-tl-line"></div>
          ${dots}
        </div>
        <div class="season-tl-tip" id="tl-tip"></div>
      </div>
    </div>`;
}

let _tlHideTimer = null;
window._tlShow = function(el) {
  clearTimeout(_tlHideTimer);
  const tip = document.getElementById('tl-tip');
  if (!tip) return;
  const meet = el.dataset.meet;
  const rows = el.dataset.rows.replace(/&#10;/g, '\n').split('\n');
  const date = el.dataset.date;
  tip.innerHTML = `<div class="tl-tip-meet">${meet}</div><div class="tl-tip-date">${date}</div>${rows.map(r=>`<div class="tl-tip-row">${r}</div>`).join('')}`;
  const wrap  = el.closest('.season-tl-body');
  const wRect = wrap.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  let left = eRect.left - wRect.left - 8;
  tip.style.display = 'block';
  const tipW = tip.offsetWidth;
  left = Math.max(0, Math.min(left, wRect.width - tipW));
  tip.style.left = left + 'px';
  tip.style.opacity = '1';
};
window._tlHide = function() {
  _tlHideTimer = setTimeout(() => {
    const tip = document.getElementById('tl-tip');
    if (tip) { tip.style.opacity = '0'; setTimeout(() => { if(tip) tip.style.display = 'none'; }, 150); }
  }, 80);
};

// ── HONOURS ────────────────────────────────────────────────
function _medalSvg(place, short) {
  // Diamond League Final → trophy icon based on the WDL trophy
  if (short === 'DLF') {
    return `<svg class="ch-icon ch-icon-dlf" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,1 18,7 10,13 2,7" fill="#1a5fb4"/>
      <polygon points="10,1 18,7 2,7" fill="#3584e4"/>
      <polygon points="10,1 14,5 10,7 6,5" fill="rgba(150,210,255,0.45)"/>
      <line x1="2" y1="7" x2="18" y2="7" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>
      <rect x="7.5" y="13" width="5" height="1.8" rx="0.5" fill="#bbb"/>
      <rect x="3.5" y="15" width="4.8" height="8" rx="0.5" fill="#B82000"/>
      <line x1="5.5" y1="15" x2="5.5" y2="23" stroke="rgba(255,255,255,0.22)" stroke-width="0.9"/>
      <rect x="11.7" y="15" width="4.8" height="8" rx="0.5" fill="#B82000"/>
      <line x1="14" y1="15" x2="14" y2="23" stroke="rgba(255,255,255,0.22)" stroke-width="0.9"/>
      <rect x="2" y="23" width="16" height="2.2" rx="0.8" fill="#bbb"/>
    </svg>`;
  }
  const fills   = { 1: '#F5B800', 2: '#9CA3AF', 3: '#B87333' };
  const glints  = { 1: 'rgba(255,255,255,0.35)', 2: 'rgba(255,255,255,0.25)', 3: 'rgba(255,255,255,0.2)' };
  const fill    = fills[place]  || '#888';
  const glint   = glints[place] || 'rgba(255,255,255,0.2)';
  return `<svg class="ch-icon" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="0" width="6" height="3.5" rx="1.5" fill="${fill}" opacity="0.75"/>
    <path d="M7 3.5 L10 7.5 L13 3.5" fill="${fill}" opacity="0.6"/>
    <circle cx="10" cy="17" r="9" fill="${fill}"/>
    <circle cx="10" cy="17" r="7" stroke="${glint}" stroke-width="1.5" fill="none"/>
    <text x="10" y="21" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="9" fill="rgba(255,255,255,0.9)">${place}</text>
  </svg>`;
}

function buildHonoursHtml(honours) {
  if (!honours || !honours.length) return '';
  const classes = ['ch-gold', 'ch-silver', 'ch-bronze'];
  const badges = honours.map(h => {
    const yr = h.year ? `'${String(h.year).slice(-2)}` : '';
    return `<div class="ch-badge ${classes[h.place - 1] || ''}">
      ${_medalSvg(h.place, h.short)}
      <span class="ch-text">
        <span class="ch-comp">${h.short}${yr ? ' ' + yr : ''}</span>
        ${h.discipline ? `<span class="ch-event">${h.discipline}</span>` : ''}
      </span>
    </div>`;
  }).join('');
  return `<div class="card-honours"><div class="card-honours-label">Trophy Case</div><div class="card-honours-badges">${badges}</div></div>`;
}

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

  const photoHtml = `<img class="card-photo" src="${a.photo || '/images/default_card.png'}" alt="${a.name}">`;

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
        <button class="card-fav-btn${typeof isFavorited === 'function' && isFavorited(athleteId) ? ' favorited' : ''}" data-fav-id="${athleteId}" onclick="toggleFavorite('${athleteId}')" title="Save athlete">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="card-share-btn" onclick="openShareOverlay('${athleteId}',${JSON.stringify(rank)},new URLSearchParams(location.search).get('event'))" title="Share athlete card">↗ Share</button>
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
        ${buildHonoursHtml(a.honours)}
        <div class="card-honours-placeholder" style="${a.honours === undefined && a.waUrl ? '' : 'display:none'}"></div>
        ${buildSeasonTimeline(a)}
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
            const photo = s.photo || '/images/default_card.png';
            const bg = s.photoBackground || '#111';
            return `
              <div class="similar-card" onclick="openAthleteCard('${s.id}', null)">
                <div class="similar-photo" style="background-color:${bg};background-image:url('${photo}')"></div>
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

  // Fetch from WA if we're missing age or haven't checked for honours yet
  const needsAge     = !a.dob && !(a.vitals && a.vitals.AGE) && a.waUrl;
  const needsHonours = a.honours === undefined && a.waUrl;
  if (needsAge || needsHonours) {
    fetch(`/.netlify/functions/wa-athlete?url=${encodeURIComponent(a.waUrl)}`)
      .then(r => r.json())
      .then(data => {
        // ── Age ──
        if (needsAge && data.dob) {
          const born = new Date(data.dob);
          const today = new Date();
          let age = today.getFullYear() - born.getFullYear();
          const m = today.getMonth() - born.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
          a.dob = data.dob;
          if (!a.vitals) a.vitals = {};
          a.vitals.AGE = String(age);
          const vitalsEl = qs('#athlete-card-inner .card-vitals');
          if (vitalsEl && !vitalsEl.querySelector('.card-vital')) {
            vitalsEl.innerHTML = `<div class="card-vital"><span class="card-vital-label">AGE</span><span class="card-vital-value">${age}</span></div>`;
          } else if (vitalsEl && !vitalsEl.innerHTML.includes('AGE')) {
            vitalsEl.insertAdjacentHTML('afterbegin', `<div class="card-vital"><span class="card-vital-label">AGE</span><span class="card-vital-value">${age}</span></div>`);
          }
        }
        // ── Honours ──
        // Cache result (empty array = "checked, none found"; undefined = "not checked")
        a.honours = (data.honours && data.honours.length) ? data.honours : [];
        const placeholder = qs('#athlete-card-inner .card-honours-placeholder');
        if (placeholder && a.honours.length) {
          const honoursHtml = buildHonoursHtml(a.honours);
          placeholder.insertAdjacentHTML('beforebegin', honoursHtml);
        }
        if (placeholder) placeholder.remove();
      })
      .catch(() => {
        // Mark as checked so we don't retry on next open
        if (needsHonours) a.honours = [];
      });
  }
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
let _h2hId1 = null, _h2hId2 = null;

const _H2H_MONTHS = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};

function _getResultsForYear(athlete, year) {
  if (year === '2026') return athlete.results || [];
  return ((athlete.resultsHistory || {})[year]) || [];
}

function _getH2HYears(a1, a2) {
  const years = new Set(['2026']);
  [a1, a2].forEach(a => Object.keys(a.resultsHistory || {}).forEach(y => years.add(y)));
  return [...years].sort((a, b) => parseInt(b) - parseInt(a));
}

function _buildEncounterRows(a1, a2, year) {
  const r1all = _getResultsForYear(a1, year);
  const r2all = _getResultsForYear(a2, year);
  const races = [];
  r1all.forEach(race1 => {
    if (!race1.meet || !race1.event) return;
    const match = r2all.find(race2 =>
      race2.meet && race2.event &&
      race1.meet.trim().toLowerCase() === race2.meet.trim().toLowerCase() &&
      race1.event.trim().toLowerCase() === race2.event.trim().toLowerCase()
    );
    if (!match) return;
    const p1 = parseInt(race1.place), p2 = parseInt(match.place);
    const t1s = parseTimeToSecs(race1.time), t2s = parseTimeToSecs(match.time);
    // If place order contradicts time order, they ran in different heats — skip
    if (t1s && t2s && !isNaN(p1) && !isNaN(p2) && p1 !== p2) {
      if ((p1 < p2) !== (t1s < t2s)) return;
    }
    let a1wins = false, a2wins = false;
    if (!isNaN(p1) && !isNaN(p2)) { a1wins = p1 < p2; a2wins = p2 < p1; }
    else {
      if (t1s && t2s) { a1wins = t1s < t2s; a2wins = t2s < t1s; }
    }
    const marginSec = (t1s && t2s) ? Math.abs(t1s - t2s) : null;
    const marginStr = marginSec != null
      ? (marginSec < 0.1 ? '<0.1s' : marginSec < 10 ? marginSec.toFixed(2) + 's' : Math.round(marginSec) + 's')
      : null;
    races.push({ date: race1.date, meet: race1.meet, event: race1.event,
      time1: race1.time, time2: match.time, place1: race1.place, place2: match.place,
      a1wins, a2wins, marginStr });
  });
  races.sort((a, b) => {
    const ord = r => { const [m, d] = String(r.date || '').split(' '); return (_H2H_MONTHS[m] || 0) * 31 + parseInt(d || 0); };
    return ord(b) - ord(a);
  });
  return races;
}

function _renderEncountersInner(a1, a2, n1, n2, year) {
  const races = _buildEncounterRows(a1, a2, year);
  const w1 = races.filter(r => r.a1wins).length;
  const w2 = races.filter(r => r.a2wins).length;
  if (!races.length) return `<div class="h2h-enc-none">No shared races in ${year}</div>`;
  return `
    <div class="h2h-record-score">
      <span class="h2h-record-wins${w1 > w2 ? ' h2h-record-leading' : ''}">${w1}</span>
      <span class="h2h-record-label">${races.length} race${races.length === 1 ? '' : 's'}</span>
      <span class="h2h-record-wins${w2 > w1 ? ' h2h-record-leading' : ''}">${w2}</span>
    </div>
    <div class="h2h-enc-rows">
      ${races.map(r => {
        const winner = r.a1wins ? n1 : r.a2wins ? n2 : null;
        const marginLabel = winner && r.marginStr ? `${winner} by ${r.marginStr}` : 'Dead heat';
        return `
        <div class="h2h-enc-row${r.a1wins ? ' h2h-enc-row--left' : r.a2wins ? ' h2h-enc-row--right' : ''}">
          <div class="h2h-enc-time${r.a1wins ? ' h2h-enc-winner' : r.a2wins ? ' h2h-enc-loser' : ''}">
            <span class="h2h-enc-t">${r.time1 || '—'}</span>
            ${r.place1 ? `<span class="h2h-enc-place">${r.place1}${_ordSuffix(r.place1)}</span>` : ''}
          </div>
          <div class="h2h-enc-mid">
            <div class="h2h-enc-meet">${r.meet}</div>
            <div class="h2h-enc-event">${r.event}${r.date ? ' · ' + r.date : ''}</div>
            <div class="h2h-enc-margin">${marginLabel}</div>
          </div>
          <div class="h2h-enc-time h2h-enc-time--right${r.a2wins ? ' h2h-enc-winner' : r.a1wins ? ' h2h-enc-loser' : ''}">
            <span class="h2h-enc-t">${r.time2 || '—'}</span>
            ${r.place2 ? `<span class="h2h-enc-place">${r.place2}${_ordSuffix(r.place2)}</span>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

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

function _ordSuffix(n) {
  const i = parseInt(n);
  if (isNaN(i)) return '';
  const s = ['th','st','nd','rd'], v = i % 100;
  return s[(v-20)%10] || s[v] || s[0];
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

  // Head-to-head encounter section with year tabs
  _h2hId1 = id1; _h2hId2 = id2;
  const h2hYears = _getH2HYears(a1, a2);
  const h2hEncountersHtml = `
    <div class="h2h-encounters">
      <div class="h2h-enc-header">
        <span class="h2h-enc-ath">${n1}</span>
        <span class="h2h-enc-title">Head to Head</span>
        <span class="h2h-enc-ath h2h-enc-ath--right">${n2}</span>
      </div>
      ${h2hYears.length > 1 ? `
      <div class="h2h-year-tabs">
        ${h2hYears.map((y, i) => `<button class="h2h-year-tab${i === 0 ? ' active' : ''}" data-year="${y}" onclick="setH2HYear('${y}')">${y}</button>`).join('')}
      </div>` : ''}
      <div class="h2h-enc-inner">
        ${_renderEncountersInner(a1, a2, n1, n2, h2hYears[0])}
      </div>
    </div>`;

  const col = (a, isRight) => {
    const { ranked, sectioned } = getRankInfo(a.id);
    const photoHtml = `<img class="h2h-photo" src="${a.photo || '/images/default_card.png'}" alt="${a.name}">`;

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
    ${h2hEncountersHtml}
    <div class="h2h-pr-section">
      <div class="h2h-pr-section-hdr">
        <span class="h2h-pr-ath">${n1}</span>
        <span class="h2h-pr-label">Personal Bests</span>
        <span class="h2h-pr-ath h2h-pr-ath--right">${n2}</span>
      </div>
      <div class="h2h-pr-table">${sharedPrHtml}</div>
    </div>`;

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
window.setH2HYear = function(year) {
  const a1 = ATHLETES[_h2hId1], a2 = ATHLETES[_h2hId2];
  if (!a1 || !a2) return;
  const n1 = a1.name.split(' ').slice(-1)[0];
  const n2 = a2.name.split(' ').slice(-1)[0];
  document.querySelectorAll('.h2h-year-tab').forEach(t => t.classList.toggle('active', t.dataset.year === year));
  const inner = document.querySelector('.h2h-enc-inner');
  if (inner) inner.innerHTML = _renderEncountersInner(a1, a2, n1, n2, year);
};

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

  // ── Athletes ──────────────────────────────────────────────
  const athleteResults = Object.values(ATHLETES || {}).filter(a =>
    (a.name    || '').toLowerCase().includes(q) ||
    (a.country || '').toLowerCase().includes(q) ||
    (a.event   || '').toLowerCase().includes(q) ||
    (a.club    || '').toLowerCase().includes(q)
  ).slice(0, 5);

  // ── Articles ──────────────────────────────────────────────
  const articleResults = (ARTICLES || []).filter(a =>
    a.type !== 'rankings' && (
      (a.title    || '').toLowerCase().includes(q) ||
      (a.excerpt  || '').toLowerCase().includes(q) ||
      (a.category || '').toLowerCase().includes(q) ||
      (a.author   || '').toLowerCase().includes(q)
    )
  ).slice(0, 5);

  // ── Rankings events ───────────────────────────────────────
  const eventResults = (RANKINGS_EVENTS || []).filter(ev =>
    (ev.name        || '').toLowerCase().includes(q) ||
    (ev.description || '').toLowerCase().includes(q)
  ).slice(0, 3);

  if (!athleteResults.length && !articleResults.length && !eventResults.length) {
    container.innerHTML = `<div class="search-no-results">No results for "${query}"</div>`;
    return;
  }

  const sections = [];

  if (athleteResults.length) {
    const items = athleteResults.map(a => {
      const photo = a.photo || '/images/default_card.png';
      const bg = a.photoBackground || '#111';
      return `
        <div class="search-result-item search-result-athlete" onclick="openAthleteCard('${a.id}',null);closeSearch();">
          <div class="search-ath-avatar" style="background-image:url('${photo}');background-color:${bg}"></div>
          <div class="search-ath-info">
            <div class="search-result-title">${a.name}</div>
            <div class="search-result-meta">${renderFlag(a.flag)} ${a.country || ''} · ${a.event || ''}</div>
          </div>
        </div>`;
    }).join('');
    sections.push(`<div class="search-section"><div class="search-section-hd">Athletes</div>${items}</div>`);
  }

  if (articleResults.length) {
    const items = articleResults.map(a => `
      <div class="search-result-item" onclick="goTo('article.html?id=${a.id}');closeSearch();">
        <div class="search-result-cat">${a.category || ''}</div>
        <div class="search-result-title">${a.title}</div>
        ${a.excerpt ? `<div class="search-result-excerpt">${a.excerpt}</div>` : ''}
        <div class="search-result-meta">${[a.author, a.date, a.readTime].filter(Boolean).join(' · ')}</div>
      </div>`).join('');
    sections.push(`<div class="search-section"><div class="search-section-hd">Articles</div>${items}</div>`);
  }

  if (eventResults.length) {
    const items = eventResults.map(ev => `
      <div class="search-result-item" onclick="goTo('rankings.html');closeSearch();">
        <div class="search-result-cat">Rankings</div>
        <div class="search-result-title">${ev.name}</div>
        ${ev.description ? `<div class="search-result-excerpt">${ev.description}</div>` : ''}
      </div>`).join('');
    sections.push(`<div class="search-section"><div class="search-section-hd">Rankings</div>${items}</div>`);
  }

  container.innerHTML = sections.join('');
};

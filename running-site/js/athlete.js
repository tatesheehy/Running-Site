// ============================================================
//  ATHLETE PROFILE — dedicated page per athlete (athlete.html?id=…)
//  Replaces the old pop-up card. Reuses helpers from modals.js
//  (results tables, timeline), h2h.js (records) and country.js
//  (per-country leaderboards) so everything stays in sync.
// ============================================================

// Normalize event strings: "1500 m" / "10,000 m" → "1500m" (indoor " sh" survives → excluded)
const _apNorm = s => (s || '').toLowerCase().replace(/[\s,]+/g, '');

// Best mark per event from a results array → [{event, time, secs, meet, date}]
function _apSeasonBests(results) {
  const best = {};
  (results || []).forEach(r => {
    if (!r.event || !r.time || r.time === 'x') return;
    const s = parseTimeToSecs(r.time);
    if (s == null || !isFinite(s) || s <= 0) return;
    const key = _apNorm(r.event);
    if (key.endsWith('sh')) return; // skip indoor marks
    if (!best[key] || s < best[key].secs) {
      best[key] = { event: r.event.trim(), time: r.time, secs: s, meet: (r.meet && r.meet !== 'x') ? r.meet : '', date: r.date || '' };
    }
  });
  return Object.values(best).sort((a, b) => {
    const da = _parseEventMeters(a.event), db = _parseEventMeters(b.event);
    if (da != null && db != null) return da - db;
    return (a.event || '').localeCompare(b.event || '');
  });
}

function _apSbGridHtml(sbs) {
  if (!sbs.length) return '';
  return `<div class="ap-sb-grid">${sbs.map(sb => `
    <div class="ap-sb-chip">
      <span class="ap-sb-event">${sb.event}</span>
      <span class="ap-sb-time">${sb.time}</span>
      ${sb.meet ? `<span class="ap-sb-meet">${sb.meet}${sb.date ? ` · ${sb.date}` : ''}</span>` : ''}
    </div>`).join('')}</div>`;
}

// Local expand/collapse (shared etToggleSection relabels as "athletes"; these are races)
window.apToggleSection = function (idEl, btn, total) {
  const el = document.getElementById(idEl);
  if (!el) return;
  const open = el.classList.toggle('et-open');
  btn.textContent = open ? 'Show less' : `See all ${total} races`;
};

function buildAthleteProfilePage() {
  const main = qs('#main');
  if (!main) return;
  const id = getParam('id');
  const a = id && ATHLETES[id];
  if (!a) { goTo('athletes.html'); return; }

  document.title = `${a.name} — StatTC`;

  const flag = a.flag || '';
  const country = a.country || '';
  const color = (typeof _countryColor === 'function') ? _countryColor(flag) : 'var(--accent)';
  const age = a.dob ? calcAgeFromDob(a.dob) : (a.vitals && a.vitals.AGE) || a.age || '';
  const photo = a.photo || '/images/default_card.png';
  const faved = typeof isFavorited === 'function' && isFavorited(id);

  // ── This season / previous season ──────────────────────────
  const results2026 = _dedupeResults(a.results || []);
  const history = a.resultsHistory || {};
  const prevYear = Object.keys(history)
    .filter(y => (history[y] || []).length > 0)
    .sort((x, y) => parseInt(y) - parseInt(x))[0] || null;
  const prevResults = prevYear ? _dedupeResults(history[prevYear] || []) : [];

  const sbNow = _apSeasonBests(results2026);
  const sbPrev = _apSeasonBests(prevResults);

  // ── Personal bests ─────────────────────────────────────────
  const prs = pickTopPRs(a.prs, 8);
  const prsHtml = prs.length ? `<div class="ap-sb-grid">${prs.map(pr => `
    <div class="ap-sb-chip">
      <span class="ap-sb-event">${pr.event || ''}</span>
      <span class="ap-sb-time">${pr.time || ''}</span>
    </div>`).join('')}</div>` : '';

  // ── H2H record (this season, all events) ───────────────────
  let h2hRec = null;
  try {
    const { records } = _computeAllH2HRecords('2026', 'all', 'all', 'all');
    h2hRec = records[id] || null;
  } catch (e) { /* h2h data unavailable */ }
  const h2hPct = h2hRec && (h2hRec.wins + h2hRec.losses) > 0
    ? Math.round((h2hRec.wins / (h2hRec.wins + h2hRec.losses)) * 100) : null;

  // ── Country snapshot: top 5 season bests in their primary event ──
  const primaryEvent = sbNow.length
    ? (['800m', '1500m', 'Mile', '3000m', '5000m', '10000m'].find(ev => sbNow.some(sb => _apNorm(sb.event) === _apNorm(ev))) || null)
    : null;
  let countryHtml = '';
  if (country && primaryEvent && typeof _countrySeasonBests === 'function') {
    const compatriots = Object.values(ATHLETES).filter(x => (x.country || '') === country);
    const list = _countrySeasonBests(compatriots, primaryEvent).slice(0, 5);
    if (list.length) {
      const rows = list.map((row, i) => `
        <div class="rw-row rw-row--clickable${row.a.id === id ? ' ap-country-row--self' : ''}" onclick="openAthleteCard('${row.a.id}', ${i + 1})">
          <span class="rw-rank ${i === 0 ? 'rw-rank--first' : ''}">${i + 1}</span>
          <div class="rw-info"><span class="rw-name">${row.a.name}</span></div>
          <span class="rw-time">${row.time}</span>
        </div>`).join('');
      countryHtml = `
        <section class="et-section">
          <div class="et-section-header">
            <h2 class="et-section-title">${renderFlag(flag)} Top ${country} — ${primaryEvent}</h2>
            <a class="ap-country-link" href="country.html?country=${encodeURIComponent(country)}">Full ${country} page →</a>
          </div>
          <div class="rw-list">${rows}</div>
        </section>`;
    }
  }

  // ── Similar athletes ───────────────────────────────────────
  const similar = getSimilarAthletes(a);
  const similarHtml = similar.length ? `
    <section class="et-section">
      <div class="et-section-header"><h2 class="et-section-title">Similar Athletes</h2></div>
      <div class="ap-similar-list">${similar.map(s => `
        <div class="ap-similar-card" onclick="openAthleteCard('${s.id}', null)" role="button" tabindex="0">
          <div class="ap-similar-photo" style="background-color:${s.photoBackground || '#111'};background-image:url('${s.photo || '/images/default_card.png'}')"></div>
          <div class="ap-similar-name">${s.name}</div>
          <div class="ap-similar-country">${renderFlag(s.flag)} ${s.country || ''}</div>
        </div>`).join('')}</div>
    </section>` : '';

  main.innerHTML = `
    <div class="container ap-page">
      <header class="page-hero ap-hero" style="background:${color}">
        <div class="ap-hero-inner">
          <div class="ap-hero-photo" style="background-image:url('${photo}');background-color:${a.photoBackground || '#1a1a2e'}"></div>
          <div class="ap-hero-info">
            <div class="page-hero-eyebrow"><a href="athletes.html" class="country-back-link">&larr; All Athletes</a></div>
            <h1 class="page-hero-title">${a.name}</h1>
            <div class="ap-hero-meta">
              <a class="ap-hero-country" href="country.html?country=${encodeURIComponent(country)}">${renderFlag(flag)} ${country}</a>
              ${age ? `<span class="ap-hero-chip">Age ${age}</span>` : ''}
              ${a.waUrl ? `<a class="ap-hero-chip ap-hero-chip--link" href="${a.waUrl}" target="_blank" rel="noopener noreferrer">World Athletics ↗</a>` : ''}
            </div>
          </div>
          <div class="ap-hero-actions">
            <button class="ap-hero-btn" onclick="openH2H('${id}')">Compare H2H</button>
            <button class="ap-hero-btn ap-hero-btn--ghost${faved ? ' faved' : ''}" data-fav-id="${id}" onclick="toggleFavorite('${id}')">${faved ? '♥ Saved' : '♡ Save'}</button>
          </div>
        </div>
      </header>

      ${prsHtml ? `
      <section class="et-section">
        <div class="et-section-header"><h2 class="et-section-title">Personal Bests</h2></div>
        ${prsHtml}
      </section>` : ''}

      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">2026 Season</h2>
          <span class="tm-section-note">${results2026.length} race${results2026.length === 1 ? '' : 's'}</span>
        </div>
        ${buildSeasonTimeline(a)}
        ${sbNow.length ? `<div class="ap-sub-label">Season Bests</div>${_apSbGridHtml(sbNow)}` : ''}
        ${results2026.length ? `<div class="ap-sub-label">Races</div><div class="ap-results">${_buildResultsTable(results2026)}</div>` : '<p class="tm-empty">No races logged yet this season.</p>'}
      </section>

      ${prevYear ? `
      <section class="et-section">
        <div class="et-section-header">
          <h2 class="et-section-title">${prevYear} Season</h2>
          <span class="tm-section-note">${prevResults.length} race${prevResults.length === 1 ? '' : 's'}</span>
        </div>
        ${sbPrev.length ? `<div class="ap-sub-label">Season Bests</div>${_apSbGridHtml(sbPrev)}` : ''}
        <div class="et-collapse et-collapse--ap" id="ap-prev-collapse">
          <div class="ap-sub-label">Races</div>
          <div class="ap-results">${_buildResultsTable(prevResults)}</div>
        </div>
        ${prevResults.length > 8 ? `<button class="et-see-all et-see-all--sm" onclick="apToggleSection('ap-prev-collapse', this, ${prevResults.length})">See all ${prevResults.length} races</button>` : ''}
      </section>` : ''}

      <section class="et-section">
        <div class="et-section-header"><h2 class="et-section-title">Head-to-Head</h2></div>
        ${h2hRec ? `
        <div class="ap-h2h-strip">
          <div class="ap-h2h-stat"><span class="ap-h2h-num">${h2hRec.wins}–${h2hRec.losses}</span><span class="ap-h2h-label">2026 record</span></div>
          ${h2hPct != null ? `<div class="ap-h2h-stat"><span class="ap-h2h-num">${h2hPct}%</span><span class="ap-h2h-label">Win rate</span></div>` : ''}
        </div>` : `<p class="tm-empty">No head-to-head races logged yet this season.</p>`}
        <button class="et-see-all" onclick="openH2H('${id}')">Compare ${a.name.split(' ')[0]} against anyone →</button>
      </section>

      ${countryHtml}
      ${similarHtml}
    </div>
  `;
}

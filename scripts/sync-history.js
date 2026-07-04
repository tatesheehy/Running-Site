#!/usr/bin/env node
// Fetches complete multi-year race results from World Athletics for every
// athlete with a waUrl, then writes them into resultsHistory in athletes.json.
//
// Uses WA's AppSync GraphQL API (getSingleCompetitorResultsDiscipline) which
// returns COMPLETE per-year results. The public HTML only server-renders the
// current season, so scraping __NEXT_DATA__ misses historical races — this
// hits the same API the site's client-side year filter uses.
//
// Usage:
//   node scripts/sync-history.js                       # all athletes, 2022–2025
//   node scripts/sync-history.js --years 2023,2024,2025
//   node scripts/sync-history.js --id jake-wightman    # single athlete
//   node scripts/sync-history.js --force               # overwrite existing history

'use strict';
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ATHLETES_JSON = path.join(__dirname, '../running-site/_data/athletes.json');
const FORCE         = process.argv.includes('--force');
const idIdx         = process.argv.indexOf('--id');
const ONLY_ID       = idIdx !== -1 ? process.argv[idIdx + 1] : null;
const yearsIdx      = process.argv.indexOf('--years');
const YEARS         = yearsIdx !== -1
  ? process.argv[yearsIdx + 1].split(',').map(Number)
  : [2022, 2023, 2024, 2025];

const DELAY_BASE_MS = 700;  // base delay between API calls
const DELAY_JITTER  = 500;  // add up to this many ms randomly

// ── WA AppSync GraphQL API ────────────────────────────────────────────────────
// Endpoint + api-key pairs harvested from the site JS bundle. First is primary;
// the rest are fallbacks if a region is unreachable.
const GQL_ENDPOINTS = [
  ['https://ak33a7mldndxdfb6sznwcinjxy.appsync-api.eu-west-1.amazonaws.com/graphql', 'da2-tul3z5puffbebn4pptbgqj253i'],
  ['https://7hck43pzvfgsbplwx2gxzplk6u.appsync-api.ap-east-1.amazonaws.com/graphql', 'da2-7nbysvfryzhurp4tciuutbupve'],
];

const GQL_QUERY = `query GetSingleCompetitorResultsDiscipline($id: Int, $resultsByYearOrderBy: String, $resultsByYear: Int) {
  getSingleCompetitorResultsDiscipline(id: $id, resultsByYear: $resultsByYear, resultsByYearOrderBy: $resultsByYearOrderBy) {
    resultsByEvent {
      discipline
      results { date competition venue place mark }
    }
  }
}`;

function gqlCall(endpoint, key, variables) {
  return new Promise((resolve, reject) => {
    const u = new URL(endpoint);
    const body = JSON.stringify({
      operationName: 'GetSingleCompetitorResultsDiscipline',
      variables,
      query: GQL_QUERY,
    });
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://worldathletics.org',
        'Referer': 'https://worldathletics.org/',
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (json.errors) return reject(new Error(json.errors[0]?.message || 'GraphQL error'));
          resolve(json.data?.getSingleCompetitorResultsDiscipline || null);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Fetch one athlete-year, trying each endpoint, with retry/backoff.
async function fetchYear(competitorId, year, retries = 4) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    const [endpoint, key] = GQL_ENDPOINTS[attempt % GQL_ENDPOINTS.length];
    try {
      return await gqlCall(endpoint, key, {
        id: competitorId, resultsByYear: year, resultsByYearOrderBy: 'discipline',
      });
    } catch (err) {
      lastErr = err;
      const wait = (attempt + 1) * 4000 + Math.random() * 2000;
      process.stdout.write(` [retry in ${Math.round(wait / 1000)}s: ${err.message}]`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Extract the numeric competitor id from a WA athlete URL.
// e.g. ".../athletes/great-britain-ni/jake-wightman-14522654" → 14522654
function competitorIdFromUrl(waUrl) {
  const m = String(waUrl).replace(/\?.*$/, '').match(/-(\d+)\/?$/);
  return m ? parseInt(m[1], 10) : null;
}

// ── Parse helpers (mirror wa-athlete.js logic) ────────────────────────────────

const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function parseResultDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${MON[parseInt(iso[2], 10) - 1]} ${parseInt(iso[3], 10)}`;
  const dmy = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (dmy) return `${dmy[2].toUpperCase()} ${parseInt(dmy[1], 10)}`;
  return s;
}

function parseMark(raw) {
  return String(raw || '').replace(/[hi]$/, '').trim();
}

function cleanMeetName(raw) {
  if (!raw) return '';
  let s = raw.trim();
  const dashIdx = s.indexOf(' - ');
  if (dashIdx !== -1) s = s.slice(0, dashIdx).trim();
  const parts = s.split(',');
  if (parts.length >= 3) s = parts[0].trim();
  return s;
}

const EVENT_MAP = {
  '60 metres': '60m', '100 metres': '100m', '200 metres': '200m',
  '400 metres': '400m', '600 metres': '600m', '800 metres': '800m',
  '1000 metres': '1000m', '1500 metres': '1500m',
  '1 mile': 'Mile', 'one mile': 'Mile', 'mile': 'Mile', 'mile road': 'Mile',
  '2000 metres': '2000m', '3000 metres': '3000m', '2 miles': '2 Miles',
  '5000 metres': '5000m', '5 kilometres road': '5K', '5 kilometres': '5K',
  '10,000 metres': '10000m', '10000 metres': '10000m',
  '10 kilometres road': '10K', '10 kilometres': '10K',
  'half marathon': 'Half Marathon', 'marathon': 'Marathon',
  '3000 metres steeplechase': '3000m SC', 'steeplechase': '3000m SC',
  '110 metres hurdles': '110m H', '400 metres hurdles': '400m H',
};

function normalizeEvent(raw) {
  if (!raw) return '';
  let lower = raw.toLowerCase().trim();
  const isShort = / short track$/.test(lower);
  if (isShort) lower = lower.replace(/ short track$/, '');
  const mapped = EVENT_MAP[lower] || raw.trim();
  return isShort ? `${mapped} sh` : mapped;
}

// ── Convert one year's resultsByEvent into deduped result rows ────────────────

function eventsToResults(resultsByEvent) {
  const byKey = new Map();
  for (const ev of (resultsByEvent || [])) {
    const discipline = ev.discipline || '';
    for (const r of (ev.results || [])) {
      const mark = parseMark(r.mark);
      if (!mark || mark === '-' || mark === '–') continue; // no recorded mark
      const meet = cleanMeetName(r.competition || '');
      if (!meet) continue;
      const meetLower = meet.toLowerCase();
      const compLower = (r.competition || '').toLowerCase();
      if (compLower.includes('split time') || compLower.includes('- splits')) continue;

      const date  = parseResultDate(r.date);
      const event = normalizeEvent(discipline);
      const place = String(r.place || '').replace(/\.$/, '');
      const key   = `${r.date}|${mark.replace(/[hi]$/, '')}`;

      const score = (event ? 2 : 0) + (place ? 1 : 0) - meet.length * 0.001;
      const existing = byKey.get(key);
      if (!existing || score > existing._score) {
        byKey.set(key, { date, meet, event, time: mark, place, _score: score, _raw: r.date });
      }
    }
  }
  // newest-first within the year
  return Array.from(byKey.values())
    .sort((a, b) => {
      const ord = d => MON.indexOf((d || '').split(' ')[0]) * 31 + parseInt((d || '').split(' ')[1] || 0, 10);
      return ord(b.date) - ord(a.date);
    })
    .map(({ _score, _raw, ...r }) => r);
}

// ── NCAA title detection ──────────────────────────────────────────────────────

function isNcaaDivIChampionship(meet, event) {
  const m = (meet || '').toLowerCase();
  const e = (event || '').toLowerCase();
  if (!m.includes('ncaa') || !m.includes('champion')) return false;
  // Must be explicitly D1 — positive match only
  const isD1 = m.includes('division i ') || m.includes('div. i ') || m.includes('d1 ');
  if (!isD1) return false;
  // Exclude relay and non-track events
  if (e.includes('medley') || e.includes('relay') || e.includes('cross country')) return false;
  return true;
}

function sweepNcaaTitles(athletes) {
  let changed = 0;
  for (const a of athletes) {
    const all = [...(a.results || []), ...Object.values(a.resultsHistory || {}).flat()];
    const hasTitle = all.some(r => r.place === '1' && isNcaaDivIChampionship(r.meet, r.event));
    if (hasTitle && !a.ncaaTitle) { a.ncaaTitle = true; changed++; }
    else if (!hasTitle && a.ncaaTitle) { delete a.ncaaTitle; changed++; }
  }
  return changed;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(fs.readFileSync(ATHLETES_JSON, 'utf8'));
  const athletes = data.items;

  const targets = ONLY_ID
    ? athletes.filter(a => a.id === ONLY_ID)
    : athletes.filter(a => a.waUrl);

  if (targets.length === 0) {
    console.error(ONLY_ID ? `No athlete with id "${ONLY_ID}"` : 'No athletes with waUrl found.');
    process.exit(1);
  }

  console.log(`Syncing history for ${targets.length} athlete(s), years: ${YEARS.join(', ')}`);
  console.log(`--force: ${FORCE}\n`);

  let updated = 0, skipped = 0, errors = 0, calls = 0;

  for (let i = 0; i < targets.length; i++) {
    const a = targets[i];
    const prefix = `[${i + 1}/${targets.length}] ${a.name}`;

    const competitorId = competitorIdFromUrl(a.waUrl);
    if (!competitorId) {
      console.log(`${prefix} — ⚠ can't parse competitor id from ${a.waUrl}`);
      errors++;
      continue;
    }

    if (!a.resultsHistory || typeof a.resultsHistory !== 'object') a.resultsHistory = {};

    const CURRENT_YEAR = new Date().getFullYear();
    const yearsToFetch = FORCE
      ? YEARS
      : YEARS.filter(y => {
          if (y === CURRENT_YEAR) return FORCE || !Array.isArray(a.results) || a.results.length === 0;
          return !Array.isArray(a.resultsHistory[y]) || a.resultsHistory[y].length === 0;
        });

    if (yearsToFetch.length === 0) {
      console.log(`${prefix} — skipped (all years present, use --force to overwrite)`);
      skipped++;
      continue;
    }

    console.log(prefix);
    let athleteUpdated = false;

    for (const year of yearsToFetch) {
      if (calls > 0) await sleep(DELAY_BASE_MS + Math.random() * DELAY_JITTER);
      calls++;

      let res;
      try {
        process.stdout.write(`  ${year} — fetching...`);
        res = await fetchYear(competitorId, year);
        process.stdout.write(' done\n');
      } catch (err) {
        process.stdout.write(` ERROR: ${err.message}\n`);
        errors++;
        continue;
      }

      const CURRENT_YEAR = new Date().getFullYear();
      const results = eventsToResults(res && res.resultsByEvent);
      if (results.length === 0) {
        if (year !== CURRENT_YEAR) a.resultsHistory[year] = [];
        console.log(`    · no results`);
      } else if (year === CURRENT_YEAR) {
        // Current season goes into athlete.results (used by the site's year tab)
        a.results = results;
        a.lastSynced = new Date().toISOString().slice(0, 10);
        console.log(`    ✓ ${results.length} results → athlete.results`);
        athleteUpdated = true;
      } else {
        a.resultsHistory[year] = results;
        console.log(`    ✓ ${results.length} results`);
        athleteUpdated = true;
      }
    }

    if (athleteUpdated) updated++;
    a.lastHistorySynced = new Date().toISOString().slice(0, 10);

    // Save after every athlete so a crash doesn't lose progress
    fs.writeFileSync(ATHLETES_JSON, JSON.stringify(data, null, 2));
  }

  const ncaaChanged = sweepNcaaTitles(athletes);
  if (ncaaChanged) {
    fs.writeFileSync(ATHLETES_JSON, JSON.stringify(data, null, 2));
    console.log(`NCAA title sweep: ${ncaaChanged} athlete(s) updated`);
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped, ${errors} errors.`);
}

main().catch(err => { console.error(err); process.exit(1); });

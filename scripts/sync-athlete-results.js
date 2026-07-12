#!/usr/bin/env node
// Fetches 2026 race results from World Athletics and adds them to athlete JSON files.
// Skips athletes that already have results logged for the current year.
// Usage: node scripts/sync-athlete-results.js [--force] [--year 2026]

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ATHLETES_DIR  = path.join(__dirname, '../running-site/_data/athletes');
const ATHLETES_JSON = path.join(__dirname, '../running-site/_data/athletes.json');
const FORCE         = process.argv.includes('--force');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const yearIdx       = process.argv.indexOf('--year');
const YEAR          = yearIdx !== -1 ? process.argv[yearIdx + 1] : String(new Date().getFullYear());

const MONTHS = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };

// ── Profile field helpers ────────────────────────────────────────────────────

const SLUG_TO_COUNTRY = {
  'united-states':    { flag: 'US', country: 'United States' },
  'great-britain-ni': { flag: 'GB', country: 'Great Britain' },
  'kenya':            { flag: 'KE', country: 'Kenya' },
  'ethiopia':         { flag: 'ET', country: 'Ethiopia' },
  'norway':           { flag: 'NO', country: 'Norway' },
  'france':           { flag: 'FR', country: 'France' },
  'australia':        { flag: 'AU', country: 'Australia' },
  'ireland':          { flag: 'IE', country: 'Ireland' },
  'netherlands':      { flag: 'NL', country: 'Netherlands' },
  'new-zealand':      { flag: 'NZ', country: 'New Zealand' },
  'portugal':         { flag: 'PT', country: 'Portugal' },
  'spain':            { flag: 'ES', country: 'Spain' },
  'eritrea':          { flag: 'ER', country: 'Eritrea' },
  'burundi':          { flag: 'BI', country: 'Burundi' },
  'morocco':          { flag: 'MA', country: 'Morocco' },
  'algeria':          { flag: 'DZ', country: 'Algeria' },
  'tanzania':         { flag: 'TZ', country: 'Tanzania' },
  'uganda':           { flag: 'UG', country: 'Uganda' },
  'jamaica':          { flag: 'JM', country: 'Jamaica' },
  'canada':           { flag: 'CA', country: 'Canada' },
  'belgium':          { flag: 'BE', country: 'Belgium' },
  'germany':          { flag: 'DE', country: 'Germany' },
  'poland':           { flag: 'PL', country: 'Poland' },
  'sweden':           { flag: 'SE', country: 'Sweden' },
  'denmark':          { flag: 'DK', country: 'Denmark' },
  'finland':          { flag: 'FI', country: 'Finland' },
  'italy':            { flag: 'IT', country: 'Italy' },
  'china':            { flag: 'CN', country: 'China' },
  'japan':            { flag: 'JP', country: 'Japan' },
  'bahrain':          { flag: 'BH', country: 'Bahrain' },
  'qatar':            { flag: 'QA', country: 'Qatar' },
  'south-africa':     { flag: 'ZA', country: 'South Africa' },
  'brazil':           { flag: 'BR', country: 'Brazil' },
  'mexico':           { flag: 'MX', country: 'Mexico' },
  'switzerland':      { flag: 'CH', country: 'Switzerland' },
  'austria':          { flag: 'AT', country: 'Austria' },
  'czech-republic':   { flag: 'CZ', country: 'Czech Republic' },
  'turkey':           { flag: 'TR', country: 'Turkey' },
  'namibia':          { flag: 'NA', country: 'Namibia' },
  'botswana':         { flag: 'BW', country: 'Botswana' },
  'senegal':          { flag: 'SN', country: 'Senegal' },
  'rwanda':           { flag: 'RW', country: 'Rwanda' },
  'scotland':         { flag: 'SCT', country: 'Scotland' },
  'northern-ireland': { flag: 'NIR', country: 'Northern Ireland' },
};

const IOC_TO_FLAG = {
  'USA':'US','GBR':'GB','KEN':'KE','ETH':'ET','NOR':'NO','FRA':'FR',
  'AUS':'AU','IRL':'IE','NED':'NL','NZL':'NZ','POR':'PT','ESP':'ES',
  'ERI':'ER','BDI':'BI','MAR':'MA','ALG':'DZ','TAN':'TZ','UGA':'UG',
  'JAM':'JM','CAN':'CA','BEL':'BE','GER':'DE','POL':'PL','SWE':'SE',
  'DEN':'DK','FIN':'FI','ITA':'IT','CHN':'CN','JPN':'JP','BRN':'BH',
  'QAT':'QA','RSA':'ZA','BRA':'BR','MEX':'MX','SUI':'CH','AUT':'AT',
  'CZE':'CZ','TUR':'TR','NAM':'NA','BOT':'BW','SEN':'SN','RWA':'RW',
};

function dig(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

function parseDob(raw) {
  if (!raw) return '';
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const MO = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const dmy = String(raw).match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (dmy) {
    const mo = MO[dmy[2].toLowerCase()];
    if (mo) return `${dmy[3]}-${String(mo).padStart(2,'0')}-${String(parseInt(dmy[1],10)).padStart(2,'0')}`;
  }
  return '';
}

function calcAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return String(age);
}

// Treat 'x' placeholder strings as missing
function isEmpty(v) { return !v || v === 'x'; }

// Fill missing profile fields (country, flag, dob, age, name) from WA page.
// Returns { changed: bool, fields: [...changed field names] }
function fillProfileFields(athlete, html) {
  const changed = [];

  // Parse __NEXT_DATA__
  let nd = null;
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndMatch) { try { nd = JSON.parse(ndMatch[1]); } catch (_) {} }

  if (DEBUG) {
    console.log(`  [debug] html length: ${html.length}`);
    console.log(`  [debug] __NEXT_DATA__ found: ${!!ndMatch}`);
    console.log(`  [debug] nd parsed: ${!!nd}`);
    if (nd) {
      const pp2 = dig(nd,'props','pageProps') || {};
      const ath2 = pp2.athlete || pp2.data?.athlete || pp2.athleteProfile || {};
      console.log(`  [debug] ath keys: ${Object.keys(ath2).slice(0,10).join(', ')}`);
      console.log(`  [debug] raw dob fields: dateOfBirth=${ath2.dateOfBirth} birthDate=${ath2.birthDate}`);
      const ndStr = JSON.stringify(nd);
      const dobIdx = ndStr.indexOf('dateOfBirth');
      console.log(`  [debug] 'dateOfBirth' in nd JSON: ${dobIdx !== -1} (pos ${dobIdx})`);
      if (dobIdx !== -1) console.log(`  [debug] context: ...${ndStr.slice(dobIdx, dobIdx+60)}...`);
    }
    const htmlDobIdx = html.indexOf('dateOfBirth');
    console.log(`  [debug] 'dateOfBirth' in raw html: ${htmlDobIdx !== -1}`);
  }

  const pp  = nd ? (dig(nd,'props','pageProps') || {}) : {};
  const ath = pp.athlete || pp.data?.athlete || pp.athleteProfile || {};

  // Name
  if (!athlete.name) {
    const n = ath.name || (ath.givenName && ath.familyName ? `${ath.givenName} ${ath.familyName}`.trim() : '');
    if (n) { athlete.name = n; changed.push('name'); }
  }

  // Country / flag — derive from URL slug first, then override with IOC code
  const urlMatch = (athlete.waUrl || '').match(/worldathletics\.org\/athletes\/([a-z-]+)\//i);
  const countrySlug = urlMatch ? urlMatch[1] : '';
  const slugInfo = SLUG_TO_COUNTRY[countrySlug];

  if (isEmpty(athlete.country) && slugInfo) { athlete.country = slugInfo.country; changed.push('country'); }
  if (isEmpty(athlete.flag)   && slugInfo) { athlete.flag    = slugInfo.flag;    changed.push('flag'); }

  // IOC nationality may be more precise (e.g. Scotland vs Great Britain)
  const nat = ath.nationality || ath.countryCode || ath.country || ath.basicData?.nationality || '';
  if (nat && IOC_TO_FLAG[nat.toUpperCase()]) {
    const iocFlag = IOC_TO_FLAG[nat.toUpperCase()];
    if (isEmpty(athlete.flag)) { athlete.flag = iocFlag; changed.push('flag'); }
  }

  // DOB / age — try multiple paths and field names
  const rawDob =
    ath.dateOfBirth || ath.birthDate || ath.dob ||
    ath.basicData?.dateOfBirth || ath.basicData?.birthDate || ath.basicData?.dob ||
    pp.dateOfBirth || pp.birthDate || '';
  let dob = rawDob ? parseDob(rawDob) : '';

  // Fallback: search the entire raw HTML for any dateOfBirth/birthDate field
  if (!dob) {
    const patterns = [
      /"dateOfBirth"\s*:\s*"([^"]+)"/,
      /"birthDate"\s*:\s*"([^"]+)"/,
      /"dob"\s*:\s*"([^"]+)"/,
      /"birthdate"\s*:\s*"([^"]+)"/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) { dob = parseDob(m[1]); if (dob) break; }
    }
  }

  // Last resort: if nd was parsed, stringify the whole thing and grep for ISO dates near dob keys
  if (!dob && nd) {
    const ndStr = JSON.stringify(nd);
    const m = ndStr.match(/"(?:dateOfBirth|birthDate|dob)":"(\d{4}-\d{2}-\d{2})"/i);
    if (m) dob = m[1];
  }

  if (dob) {
    if (!athlete.dob) { athlete.dob = dob; changed.push('dob'); }
    // Always recalculate age from dob (overwrites 'x' placeholder and keeps it current)
    const freshAge = calcAge(dob);
    if (freshAge && freshAge !== athlete.age) { athlete.age = freshAge; changed.push('age'); }
  } else if (athlete.dob) {
    // No dob from WA page but we have one stored — still refresh age
    const freshAge = calcAge(athlete.dob);
    if (freshAge && freshAge !== athlete.age) { athlete.age = freshAge; changed.push('age'); }
  }

  return { changed: changed.length > 0, fields: changed };
}

// "27 MAY 2026" → Date object
function parseWADate(raw) {
  const [dd, mon, yyyy] = raw.trim().split(/\s+/);
  const m = MONTHS[mon?.toUpperCase()];
  if (m === undefined || !yyyy) return null;
  return new Date(Number(yyyy), m, Number(dd));
}

// "27 MAY 2026" → "MAY 27"
function formatDate(raw) {
  const [dd, mon] = raw.trim().split(/\s+/);
  return `${mon.toUpperCase()} ${Number(dd)}`;
}

// "1500 Metres" → "1500m" etc.
function formatDiscipline(d) {
  return d
    .replace('Metres', 'm')
    .replace('metres', 'm')
    .replace('Miles', 'Mi')
    .replace(' Short Track', ' sh')
    .replace('Short Track', 'sh')
    .trim();
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control':   'no-cache',
      },
    };
    function get(url, redirects = 0) {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(url, opts, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location;
          const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
          return get(next, redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(body));
      }).on('error', reject);
    }
    get(url);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// Parse any WA date (ISO "2026-06-16" or "16 JUN 2026") → { date, formatted } or null
function parseAnyDate(raw) {
  const s = String(raw || '');
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(+iso[1], +iso[2]-1, +iso[3]);
    return { date, formatted: `${MON[+iso[2]-1]} ${+iso[3]}` };
  }
  const d = parseWADate(s);
  return d ? { date: d, formatted: formatDate(s) } : null;
}

// Convert a WA result object to our standard shape
function shapeResult(r, formatted, date) {
  const mark = r.mark || r.performance || r.result || r.time || r.perf || '';
  const disc = r.discipline || r.event || r.eventName || r.disciplineName || '';
  const comp = (typeof r.competition === 'object'
                  ? (r.competition?.name || r.competition?.fullName || '')
                  : (r.competition || ''))
               || r.competitionName || r.meet || '';
  const place = String(r.place || r.position || r.rank || r.placing || '');
  return { _date: date, date: formatted, meet: comp,
           event: formatDiscipline(disc), time: mark, place };
}

// Turn a flat array of WA result objects into our sorted, deduped format
function processArray(arr, year) {
  const results = [], seen = new Set();
  for (const r of (arr || [])) {
    if (!r || typeof r !== 'object') continue;
    const raw = r.date || r.eventDate || r.startDate || r.competitionDate || '';
    if (year && !String(raw).includes(year)) continue;
    const parsed = parseAnyDate(raw);
    if (!parsed) continue;
    const shaped = shapeResult(r, parsed.formatted, parsed.date);
    if (!shaped.time) continue;
    const key = `${shaped.date}|${shaped.meet}|${shaped.event}|${shaped.time}`;
    if (!seen.has(key)) { seen.add(key); results.push(shaped); }
  }
  results.sort((a, b) => b._date - a._date);
  return results.map(({ _date, ...r }) => r);
}

// Search __NEXT_DATA__ for result arrays, tracking parent key so we can
// skip "allTimeBests / personalBests / seasonBests" arrays and prefer "results" arrays.
function parseResultsFromND(nd, year) {
  const candidates = []; // { arr, priority }

  function search(obj, depth, parentKey) {
    if (depth > 14 || obj == null || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      const sample = obj.find(x => x && typeof x === 'object' && !Array.isArray(x));
      if (sample) {
        const hasDate = 'date' in sample || 'eventDate' in sample || 'startDate' in sample || 'competitionDate' in sample;
        const hasMark = 'mark' in sample || 'performance' in sample || 'result' in sample || 'time' in sample || 'perf' in sample;
        if (hasDate && hasMark) {
          const pk = (parentKey || '').toLowerCase();
          // Skip bests arrays — they have the same shape but inflate the count
          if (/best|record|personal|alltime|pb\b/i.test(pk)) return;
          const priority = /result|performance|competition|race/i.test(pk) ? 2 : 1;
          candidates.push({ arr: obj, priority });
          return;
        }
      }
      for (const item of obj) search(item, depth + 1, parentKey);
    } else {
      for (const [k, v] of Object.entries(obj)) search(v, depth + 1, k);
    }
  }
  search(nd, 0, '');

  if (DEBUG) {
    console.log(`  [debug] ND candidates: ${candidates.length}`);
    candidates.forEach((c, i) => {
      const s = c.arr[0];
      console.log(`  [debug]   [${i}] priority=${c.priority} len=${c.arr.length} keys=${s ? Object.keys(s).slice(0,8).join(',') : '?'}`);
    });
  }

  // Sort by priority, use the first candidate that yields results
  candidates.sort((a, b) => b.priority - a.priority || b.arr.length - a.arr.length);
  for (const { arr } of candidates) {
    const r = processArray(arr, year);
    if (r.length) return r;
  }
  return [];
}

// Regex fallback: original sliding-window approach that works reliably for most athletes.
function parseResultsRegex(html, year) {
  const results = [], seen = new Set();
  const dateRe  = new RegExp(`"date":"(\\d{2} \\w{3} ${year})"`, 'g');
  let match;

  while ((match = dateRe.exec(html)) !== null) {
    const dateStr = match[1];
    const date    = parseWADate(dateStr);
    if (!date) continue;

    const winStart = Math.max(0, match.index - 1500);
    const winEnd   = Math.min(html.length, match.index + 1500);
    const win      = html.slice(winStart, winEnd);
    const get      = (...keys) => {
      for (const k of keys) {
        const m = win.match(new RegExp(`"${k}"\\s*:\\s*"([^"]+)"`));
        if (m) return m[1];
      }
      return null;
    };

    const mark = get('mark', 'performance', 'result');
    if (!mark) continue;

    const key = `${formatDate(dateStr)}|${get('competition')||''}|${get('discipline')||''}|${mark}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      _date: date,
      date:  formatDate(dateStr),
      meet:  get('competition', 'competitionName') || '',
      event: formatDiscipline(get('discipline', 'event') || ''),
      time:  mark,
      place: get('place', 'position', 'rank') || '',
    });
  }

  results.sort((a, b) => b._date - a._date);
  return results.map(({ _date, ...r }) => r);
}

// Parse competitor.resultsByYear.resultsByEvent[] — newer WA page structure where
// each resultsByEvent entry holds the discipline name and an array of individual results.
function parseResultsByEvent(rbye, year) {
  const results = [], seen = new Set();
  for (const ev of (rbye || [])) {
    const discipline = ev.discipline || ev.name || ev.disciplineName || '';
    for (const r of (ev.results || [])) {
      const raw = r.date || r.eventDate || '';
      if (year && !String(raw).includes(year)) continue;
      const parsed = parseAnyDate(raw);
      if (!parsed) continue;
      const mark = r.mark || r.performance || r.result || r.time || '';
      if (!mark) continue;
      // competition field includes venue — trim to just the meet name
      const meet = (r.competition || r.meet || '').split(',')[0].trim();
      const round = String(r.race || r.round || '').trim();
      const shaped = {
        _date: parsed.date,
        date: parsed.formatted,
        meet,
        event: formatDiscipline(discipline),
        time: mark,
        place: String(r.place || r.position || ''),
      };
      // WA round/heat label ("H1", "SF2", "F") — used by H2H to distinguish
      // shared races from parallel heats. Omitted when the source lacks it.
      if (round) shaped.round = round;
      const key = `${shaped.date}|${shaped.meet}|${shaped.event}|${shaped.time}`;
      if (!seen.has(key)) { seen.add(key); results.push(shaped); }
    }
  }
  results.sort((a, b) => b._date - a._date);
  return results.map(({ _date, ...r }) => r);
}

function parseResults(html, year) {
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndMatch) {
    try {
      const nd = JSON.parse(ndMatch[1]);
      const pp = nd.props?.pageProps || {};
      // WA uses either 'athlete' (older) or 'competitor' (newer page structure)
      const ath = pp.athlete || pp.data?.athlete || pp.athleteProfile || pp.competitor || {};

      if (DEBUG) {
        console.log(`  [debug] pageProps keys: ${Object.keys(pp).slice(0,12).join(', ')}`);
        console.log(`  [debug] athlete keys:   ${Object.keys(ath).slice(0,12).join(', ')}`);
      }

      // Newer structure: competitor.resultsByYear.resultsByEvent[{ discipline, results[] }]
      const rbye = ath.resultsByYear?.resultsByEvent;
      if (Array.isArray(rbye)) {
        const r = parseResultsByEvent(rbye, year);
        if (DEBUG) console.log(`  [debug] resultsByEvent path: ${r.length} results`);
        if (r.length) return r;
      }

      // Older structure: resultsByYear[{ year, results[] }]
      const rby = ath.resultsByYear || pp.resultsByYear;
      if (Array.isArray(rby)) {
        const entry = rby.find(e => e.year === +year || String(e.year) === year);
        if (entry) {
          const r = processArray(entry.results || entry.performances || [], year);
          if (DEBUG) console.log(`  [debug] resultsByYear path: ${r.length} results`);
          if (r.length) return r;
        }
      }

      // Generic recursive search (skips bests arrays via parent key check)
      const r = parseResultsFromND(nd, year);
      if (DEBUG) console.log(`  [debug] ND recursive: ${r.length} results`);
      if (r.length) return r;
    } catch (e) {
      if (DEBUG) console.log(`  [debug] __NEXT_DATA__ error: ${e.message}`);
    }
  } else if (DEBUG) {
    console.log(`  [debug] no __NEXT_DATA__ in page`);
  }

  if (DEBUG) console.log(`  [debug] using regex fallback`);
  return parseResultsRegex(html, year);
}

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

function normalizeNcaaEvent(e) {
  return (e || '')
    .replace(/ sh$/i, '').replace(/ short track$/i, '').trim()
    .replace(/^(\d[\d,]*)\s+metres$/i, (_, n) => n.replace(',','') + 'm');
}

function sweepNcaaTitles(athletes) {
  let changed = 0;
  for (const a of athletes) {
    const all = [...(a.results || []), ...Object.values(a.resultsHistory || {}).flat()];
    const events = [...new Set(
      all
        .filter(r => r.place === '1' && isNcaaDivIChampionship(r.meet, r.event))
        .map(r => normalizeNcaaEvent(r.event))
        .filter(Boolean)
    )];
    const before = JSON.stringify(a.ncaaTitle);
    if (events.length) a.ncaaTitle = events;
    else delete a.ncaaTitle;
    if (JSON.stringify(a.ncaaTitle) !== before) changed++;
  }
  return changed;
}

function needsProfileFill(athlete) {
  return isEmpty(athlete.country) || isEmpty(athlete.flag) || isEmpty(athlete.age) || !athlete.dob;
}

function hasCurrentResults(athlete) {
  return (athlete.results || []).length > 0;
}

const DEBUG = process.argv.includes('--debug');

async function main() {
  // Use athletes.json as the source of truth if it has items (CMS-managed).
  // Fall back to reading individual files (legacy mode).
  let allAthletes = [];
  let cmsMode = false;

  if (fs.existsSync(ATHLETES_JSON)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(ATHLETES_JSON, 'utf8'));
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        allAthletes = parsed.items;
        cmsMode = true;
        console.log(`Source: athletes.json (${allAthletes.length} athletes)`);
      }
    } catch (_) {}
  }

  if (!cmsMode) {
    const files = fs.existsSync(ATHLETES_DIR)
      ? fs.readdirSync(ATHLETES_DIR).filter(f => f.endsWith('.json')).sort()
      : [];
    allAthletes = files.map(f => JSON.parse(fs.readFileSync(path.join(ATHLETES_DIR, f), 'utf8')));
    console.log(`Source: individual files (${allAthletes.length} athletes)`);
  }

  let updated = 0, skipped = 0, failed = 0;

  const concurrencyArg = process.argv.find(a => a.startsWith('--concurrency='));
  const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 5;

  // Split into work queue vs immediate skips
  const queue = [];
  for (const athlete of allAthletes) {
    if (!athlete.waUrl) {
      console.log(`⏭  ${athlete.name || athlete.id || '?'} — no waUrl, skipping`);
      skipped++;
      continue;
    }
    const needsProfile = needsProfileFill(athlete);
    const needsResults = !SKIP_EXISTING || !hasCurrentResults(athlete);
    if (!needsProfile && !needsResults) {
      console.log(`✓  ${athlete.name} — already has ${athlete.results.length} results`);
      skipped++;
      continue;
    }
    queue.push(athlete);
  }

  async function processAthlete(athlete) {
    const label = athlete.name || athlete.id;
    const needsProfile = needsProfileFill(athlete);
    try {
      process.stdout.write(`🌐 ${label} — fetching...\n`);
      // WA throttles bursts of concurrent requests (HTTP 202 holding page) —
      // back off and retry rather than treating it as a hard failure.
      let html;
      for (let attempt = 0; ; attempt++) {
        try {
          html = await fetchPage(athlete.waUrl);
          break;
        } catch (err) {
          if (attempt >= 3) throw err;
          await sleep(15000 * (attempt + 1));
        }
      }

      if (html.length < 1000) {
        console.log(`  ✗ ${label} — WAF blocked`);
        failed++;
        await sleep(1000);
        return;
      }

      let dirty = false;
      const notes = [];

      if (needsProfile) {
        const prof = fillProfileFields(athlete, html);
        if (prof.changed) { dirty = true; notes.push(`profile: ${prof.fields.join(', ')}`); }
      } else {
        const fresh = calcAge(athlete.dob);
        if (fresh && fresh !== athlete.age) { athlete.age = fresh; dirty = true; notes.push('age'); }
      }

      const results = parseResults(html, YEAR);
      if (results.length) {
        athlete.results = results;
        dirty = true;
        notes.push(`${results.length} results`);
      } else {
        notes.push(`no ${YEAR} results`);
      }

      if (dirty) {
        athlete.lastSynced = new Date().toISOString().slice(0, 10);
        if (athlete.id) {
          if (!fs.existsSync(ATHLETES_DIR)) fs.mkdirSync(ATHLETES_DIR, { recursive: true });
          fs.writeFileSync(path.join(ATHLETES_DIR, `${athlete.id}.json`), JSON.stringify(athlete, null, 2));
        }
        console.log(`  ✓ ${label} — ${notes.join(' | ')}`);
        updated++;
      } else {
        console.log(`  — ${label} — ${notes.join(' | ')}`);
        skipped++;
      }

      await sleep(800);
    } catch (err) {
      console.log(`  ✗ ${label} — ${err.message}`);
      failed++;
      await sleep(800);
    }
  }

  // Worker pool: CONCURRENCY workers pulling from shared queue
  async function worker() {
    while (queue.length) {
      await processAthlete(queue.shift());
    }
  }

  console.log(`Running ${CONCURRENCY} concurrent workers for ${queue.length} athletes...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed.`);

  const ncaaChanged = sweepNcaaTitles(allAthletes);
  if (ncaaChanged) console.log(`NCAA title sweep: ${ncaaChanged} athlete(s) updated`);

  if (updated > 0 || ncaaChanged) {
    // Rebuild athletes.json from the full in-memory list (preserves all athletes,
    // including those added via CMS that have no individual file).
    fs.writeFileSync(ATHLETES_JSON, JSON.stringify({ items: allAthletes }, null, 2));
    console.log(`Rebuilt athletes.json (${allAthletes.length} athletes).`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

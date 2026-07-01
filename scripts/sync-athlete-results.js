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
          return get(res.headers.location, redirects + 1);
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

// Extract 2026 results from raw WA page HTML.
// WA embeds data in inline JS — results are groups of fields scattered in JSON-like text.
// Strategy: find all date strings for the target year, then scan nearby text for
// competition, discipline, mark, and place fields.
function parseResults(html, year) {
  const results = [];
  const dateRe  = new RegExp(`"date":"(\\d{2} \\w{3} ${year})"`, 'g');
  let match;

  while ((match = dateRe.exec(html)) !== null) {
    const dateStr = match[1];
    const date    = parseWADate(dateStr);
    if (!date) continue;

    // Scan a window around the date occurrence for related fields
    const winStart = Math.max(0, match.index - 1500);
    const winEnd   = Math.min(html.length, match.index + 1500);
    const window   = html.slice(winStart, winEnd);

    const get = (key) => {
      const m = window.match(new RegExp(`"${key}":"([^"]+)"`));
      return m ? m[1] : null;
    };

    const competition = get('competition');
    const discipline  = get('discipline');
    const mark        = get('mark');
    const place       = get('place') || get('position') || get('rank') || '';

    if (!mark) continue; // no time = not a useful result

    results.push({
      _date: date,
      date:  formatDate(dateStr),
      meet:  competition || '',
      event: discipline  ? formatDiscipline(discipline) : '',
      time:  mark,
      place: place,
    });
  }

  // Deduplicate (same date + meet + event)
  const seen = new Set();
  const unique = results.filter(r => {
    const key = `${r.date}|${r.meet}|${r.event}|${r.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort newest first
  unique.sort((a, b) => b._date - a._date);
  return unique.map(({ _date, ...r }) => r);
}

function needsProfileFill(athlete) {
  return isEmpty(athlete.country) || isEmpty(athlete.flag) || isEmpty(athlete.age) || !athlete.dob;
}

function hasCurrentResults(athlete) {
  return (athlete.results || []).length > 0;
}

const DEBUG = process.argv.includes('--debug');

async function main() {
  const files = fs.readdirSync(ATHLETES_DIR).filter(f => f.endsWith('.json')).sort();
  let updated = 0, skipped = 0, failed = 0;

  for (const file of files) {
    const filePath = path.join(ATHLETES_DIR, file);
    const athlete  = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!athlete.waUrl) {
      console.log(`⏭  ${athlete.name || file} — no waUrl, skipping`);
      skipped++;
      continue;
    }

    const needsProfile = needsProfileFill(athlete);
    const needsResults = FORCE || !hasCurrentResults(athlete);

    if (!needsProfile && !needsResults) {
      console.log(`✓  ${athlete.name} — already has ${athlete.results.length} results`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`🌐 ${athlete.name || file} — fetching...`);
      const html = await fetchPage(athlete.waUrl);

      if (html.length < 1000) {
        console.log(' ✗ WAF blocked (empty response)');
        failed++;
        await sleep(3000);
        continue;
      }

      let dirty = false;
      const notes = [];

      // Fill missing profile fields
      if (needsProfile) {
        const prof = fillProfileFields(athlete, html);
        if (prof.changed) { dirty = true; notes.push(`profile: ${prof.fields.join(', ')}`); }
      } else {
        // Still refresh age from stored dob each run
        const fresh = calcAge(athlete.dob);
        if (fresh && fresh !== athlete.age) { athlete.age = fresh; dirty = true; notes.push('age'); }
      }

      // Fetch results
      if (needsResults) {
        const results = parseResults(html, YEAR);
        if (results.length) {
          athlete.results = results;
          dirty = true;
          notes.push(`${results.length} results`);
        } else {
          notes.push(`no ${YEAR} results`);
        }
      }

      if (dirty) {
        athlete.lastSynced = new Date().toISOString().slice(0, 10);
        fs.writeFileSync(filePath, JSON.stringify(athlete, null, 2));
        console.log(` ✓  ${notes.join(' | ')}`);
        updated++;
      } else {
        console.log(` — ${notes.join(' | ')}`);
        skipped++;
      }

      await sleep(2000);
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      failed++;
      await sleep(2000);
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed.`);

  if (updated > 0) {
    // Rebuild athletes.json
    const allFiles   = fs.readdirSync(ATHLETES_DIR).filter(f => f.endsWith('.json')).sort();
    const allAthletes = allFiles.map(f => JSON.parse(fs.readFileSync(path.join(ATHLETES_DIR, f), 'utf8')));
    fs.writeFileSync(ATHLETES_JSON, JSON.stringify({ items: allAthletes }, null, 2));
    console.log(`Rebuilt athletes.json (${allAthletes.length} athletes).`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

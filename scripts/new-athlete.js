#!/usr/bin/env node
// Creates a new athlete stub JSON from a World Athletics profile URL.
// Fetches name, country, DOB, PRs, and honours from the WA page automatically.
//
// Usage:
//   node scripts/new-athlete.js <wa-url>
//   node scripts/new-athlete.js <wa-url> --event "DISTANCE"
//   node scripts/new-athlete.js <wa-url> --id "custom-id"

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ATHLETES_DIR  = path.join(__dirname, '../running-site/_data/athletes');
const ATHLETES_JSON = path.join(__dirname, '../running-site/_data/athletes.json');

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const waUrl = args.find(a => a.startsWith('http'));
if (!waUrl || !waUrl.includes('worldathletics.org')) {
  console.error('Usage: node scripts/new-athlete.js <worldathletics.org/athletes/...>');
  process.exit(1);
}

const eventIdx = args.indexOf('--event');
const eventArg = eventIdx !== -1 ? args[eventIdx + 1] : null;
const idIdx = args.indexOf('--id');
const idArg = idIdx !== -1 ? args[idIdx + 1] : null;

// ── Country/flag mapping ──────────────────────────────────────────────────────

// WA URL country slug → { flag (ISO 2), country (display name) }
const SLUG_TO_COUNTRY = {
  'united-states':      { flag: 'US', country: 'United States' },
  'great-britain-ni':   { flag: 'GB', country: 'Great Britain' },
  'kenya':              { flag: 'KE', country: 'Kenya' },
  'ethiopia':           { flag: 'ET', country: 'Ethiopia' },
  'norway':             { flag: 'NO', country: 'Norway' },
  'france':             { flag: 'FR', country: 'France' },
  'australia':          { flag: 'AU', country: 'Australia' },
  'ireland':            { flag: 'IE', country: 'Ireland' },
  'netherlands':        { flag: 'NL', country: 'Netherlands' },
  'new-zealand':        { flag: 'NZ', country: 'New Zealand' },
  'portugal':           { flag: 'PT', country: 'Portugal' },
  'spain':              { flag: 'ES', country: 'Spain' },
  'eritrea':            { flag: 'ER', country: 'Eritrea' },
  'burundi':            { flag: 'BI', country: 'Burundi' },
  'morocco':            { flag: 'MA', country: 'Morocco' },
  'algeria':            { flag: 'DZ', country: 'Algeria' },
  'tanzania':           { flag: 'TZ', country: 'Tanzania' },
  'uganda':             { flag: 'UG', country: 'Uganda' },
  'jamaica':            { flag: 'JM', country: 'Jamaica' },
  'canada':             { flag: 'CA', country: 'Canada' },
  'belgium':            { flag: 'BE', country: 'Belgium' },
  'germany':            { flag: 'DE', country: 'Germany' },
  'poland':             { flag: 'PL', country: 'Poland' },
  'sweden':             { flag: 'SE', country: 'Sweden' },
  'denmark':            { flag: 'DK', country: 'Denmark' },
  'finland':            { flag: 'FI', country: 'Finland' },
  'italy':              { flag: 'IT', country: 'Italy' },
  'china':              { flag: 'CN', country: 'China' },
  'japan':              { flag: 'JP', country: 'Japan' },
  'bahrain':            { flag: 'BH', country: 'Bahrain' },
  'qatar':              { flag: 'QA', country: 'Qatar' },
  'south-africa':       { flag: 'ZA', country: 'South Africa' },
  'brazil':             { flag: 'BR', country: 'Brazil' },
  'mexico':             { flag: 'MX', country: 'Mexico' },
  'russia':             { flag: 'RU', country: 'Russia' },
  'ukraine':            { flag: 'UA', country: 'Ukraine' },
  'switzerland':        { flag: 'CH', country: 'Switzerland' },
  'austria':            { flag: 'AT', country: 'Austria' },
  'czech-republic':     { flag: 'CZ', country: 'Czech Republic' },
  'turkey':             { flag: 'TR', country: 'Turkey' },
  'israel':             { flag: 'IL', country: 'Israel' },
  'namibia':            { flag: 'NA', country: 'Namibia' },
  'botswana':           { flag: 'BW', country: 'Botswana' },
  'senegal':            { flag: 'SN', country: 'Senegal' },
};

// IOC 3-letter country code → flag
const IOC_TO_FLAG = {
  'USA':'US','GBR':'GB','KEN':'KE','ETH':'ET','NOR':'NO','FRA':'FR',
  'AUS':'AU','IRL':'IE','NED':'NL','NZL':'NZ','POR':'PT','ESP':'ES',
  'ERI':'ER','BDI':'BI','MAR':'MA','ALG':'DZ','TAN':'TZ','UGA':'UG',
  'JAM':'JM','CAN':'CA','BEL':'BE','GER':'DE','POL':'PL','SWE':'SE',
  'DEN':'DK','FIN':'FI','ITA':'IT','CHN':'CN','JPN':'JP','BRN':'BH',
  'QAT':'QA','RSA':'ZA','BRA':'BR','MEX':'MX','RUS':'RU','UKR':'UA',
  'SUI':'CH','AUT':'AT','CZE':'CZ','TUR':'TR','ISR':'IL','NAM':'NA',
  'BOT':'BW','SEN':'SN',
};

// ── WA event normalization (same as wa-athlete.js) ────────────────────────────

const EVENT_MAP = {
  '60 metres': '60m', '100 metres': '100m', '200 metres': '200m',
  '400 metres': '400m', '800 metres': '800m', '1500 metres': '1500m',
  '1 mile': 'Mile', 'one mile': 'Mile', 'mile': 'Mile',
  '2000 metres': '2000m', '3000 metres': '3000m', '2 miles': '2 Miles',
  '5000 metres': '5000m', '10,000 metres': '10000m', '10000 metres': '10000m',
  'half marathon': 'Half Marathon', 'marathon': 'Marathon',
  '3000 metres steeplechase': '3000m SC', 'steeplechase': '3000m SC',
  '110 metres hurdles': '110m H', '400 metres hurdles': '400m H',
};
const EVENT_ORDER = [
  '60m','100m','200m','400m','800m','1500m','Mile','2000m',
  '3000m','3000m SC','2 Miles','5000m','10000m','Half Marathon','Marathon',
];

function normalizeEvent(raw) {
  if (!raw) return raw;
  return EVENT_MAP[raw.toLowerCase().trim()] || raw;
}

const HONOUR_CATS = [
  { match: 'olympic',                       short: 'OLY', weight: 0 },
  { match: 'world athletics championships', short: 'WC',  weight: 1 },
  { match: 'world championships',           short: 'WC',  weight: 1 },
  { match: 'world indoor',                  short: 'WI',  weight: 2 },
  { match: 'diamond league final',          short: 'DLF', weight: 3 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function nameToId(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.google.com/',
      },
    };
    function get(url, redirects = 0) {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(url, opts, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return get(res.headers.location, redirects + 1);
        if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(body));
      }).on('error', reject);
    }
    get(url);
  });
}

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
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const iso = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = String(raw).match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (dmy) {
    const mo = MONTHS[dmy[2].toLowerCase()];
    if (mo) return `${dmy[3]}-${String(mo).padStart(2,'0')}-${String(parseInt(dmy[1],10)).padStart(2,'0')}`;
  }
  return '';
}

function calcAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return String(age);
}

function parsePRs(nd) {
  // Walk the object looking for an array with discipline + mark fields
  function findBests(obj, depth = 0) {
    if (depth > 10 || obj == null || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object') {
        const f = obj[0];
        if ((f.discipline || f.event) && (f.mark || f.performance || f.best)) return obj;
      }
      for (const item of obj) { const r = findBests(item, depth+1); if (r) return r; }
      return null;
    }
    for (const key of ['personalBests','bests','bestResults','allTimeBests','performances','records','marks','data']) {
      if (key in obj) { const r = findBests(obj[key], depth+1); if (r) return r; }
    }
    for (const key of Object.keys(obj)) {
      const r = findBests(obj[key], depth+1);
      if (r) return r;
    }
    return null;
  }

  const arr = findBests(nd);
  if (!arr) return [];

  const isIndoor = b =>
    b.indoor === true || b.type === 'indoor' || b.environment === 'indoor' ||
    String(b.discipline || b.event || '').toLowerCase().includes('indoor');

  const all = arr.map(b => ({
    event:  normalizeEvent(b.discipline || b.event || b.eventName || ''),
    time:   String(b.mark || b.performance || b.best || '').replace(/i$/, '').trim(),
    indoor: isIndoor(b),
  })).filter(b => b.event && b.time);

  // Outdoor: use normalized short names. Indoor: keep WA full name (needed for H2H matching).
  const outdoor = all.filter(b => !b.indoor).map(b => ({ event: b.event, time: b.time }));
  const indoor  = all.filter(b =>  b.indoor).map(b => ({ event: b.event, time: b.time }));

  const sortFn = (a, b) => {
    const ai = EVENT_ORDER.indexOf(a.event), bi = EVENT_ORDER.indexOf(b.event);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  };

  return [...outdoor.sort(sortFn), ...indoor.sort(sortFn)];
}

function parseHonours(nd) {
  const found = [];

  function honourInfo(name) {
    const lower = (name || '').toLowerCase();
    for (const c of HONOUR_CATS) { if (lower.includes(c.match)) return c; }
    return null;
  }

  function processEntry(entry, inheritCat) {
    const catName = entry.categoryName || entry.competitionType || entry.competition || inheritCat || '';
    const info = honourInfo(catName);
    if (!info) return;
    const rawPlace = String(entry.place || entry.position || entry.rank || '').replace(/[^\d]/g, '');
    if (!rawPlace || !['1','2','3'].includes(rawPlace)) return;
    const discipline = normalizeEvent(entry.discipline || entry.event || entry.eventName || '');
    const rawYear = entry.year || '';
    const year = String(rawYear).replace(/\D/g,'').slice(0,4);
    if (!year || !discipline) return;
    found.push({ competition: catName, short: info.short, discipline, place: parseInt(rawPlace), year, _w: info.weight });
  }

  function walk(obj, inheritCat, depth) {
    if (depth > 12 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (!item || typeof item !== 'object') continue;
        const cat = item.categoryName || item.competitionType || inheritCat || '';
        if (Array.isArray(item.results)) for (const r of item.results) processEntry(r, cat);
        else if (Array.isArray(item.performances)) for (const r of item.performances) processEntry(r, cat);
        else processEntry(item, inheritCat);
      }
      return;
    }
    for (const key of ['honours','honors','achievements','medals']) {
      if (key in obj) walk(obj[key], '', depth+1);
    }
    for (const key of ['athlete','data','pageProps','props']) {
      if (key in obj && obj[key] && typeof obj[key] === 'object') walk(obj[key], inheritCat, depth+1);
    }
  }

  walk(nd, '', 0);

  const seen = new Set();
  return found
    .filter(h => { const k = `${h.short}|${h.year}|${h.discipline}|${h.place}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a,b) => a._w !== b._w ? a._w - b._w : (parseInt(b.year)||0) - (parseInt(a.year)||0) || a.place - b.place)
    .map(({ _w, ...h }) => h);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Parse country slug from URL: /athletes/{slug}/{name}-{id}
  const urlMatch = waUrl.match(/worldathletics\.org\/athletes\/([a-z-]+)\/([a-z-]+)-(\d+)/i);
  if (!urlMatch) {
    console.error('Could not parse WA URL. Expected format: https://worldathletics.org/athletes/{country}/{name}-{id}');
    process.exit(1);
  }
  const [, countrySlug, nameSlug] = urlMatch;
  const countryInfo = SLUG_TO_COUNTRY[countrySlug] || { flag: countrySlug.toUpperCase().slice(0,2), country: countrySlug };

  console.log(`\n🌐 Fetching ${waUrl} ...`);
  let html;
  try {
    html = await fetchPage(waUrl);
  } catch (e) {
    console.error(`✗ Fetch failed: ${e.message}`);
    process.exit(1);
  }

  if (html.length < 1000) {
    console.error('✗ WA returned an empty page (WAF block). Try again in a moment.');
    process.exit(1);
  }

  // Extract __NEXT_DATA__
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let nd = null;
  if (ndMatch) {
    try { nd = JSON.parse(ndMatch[1]); } catch (_) {}
  }

  // ── Name ──────────────────────────────────────────────────────────────────
  let name = '';
  if (nd) {
    const pp = dig(nd, 'props', 'pageProps') || {};
    const ath = pp.athlete || pp.data?.athlete || pp.athleteProfile || {};
    name = ath.name || ath.fullName || ath.givenName && ath.familyName
      ? `${ath.givenName || ''} ${ath.familyName || ''}`.trim()
      : '';

    // Try nationality override
    const nat = ath.nationality || ath.countryCode || ath.country || ath.basicData?.nationality || '';
    if (nat && IOC_TO_FLAG[nat.toUpperCase()]) {
      countryInfo.flag = IOC_TO_FLAG[nat.toUpperCase()];
    }
  }
  if (!name) {
    // Fallback: title tag
    const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleM) name = titleM[1].split('|')[0].split('-')[0].trim();
  }
  if (!name) {
    // Fallback: derive from URL slug
    name = nameSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  name = name.trim();

  // ── DOB / age ──────────────────────────────────────────────────────────────
  let dob = '';
  if (nd) {
    const pp = dig(nd, 'props', 'pageProps') || {};
    const ath = pp.athlete || pp.data?.athlete || pp.athleteProfile || {};
    dob = parseDob(ath.dateOfBirth || ath.birthDate || ath.basicData?.dateOfBirth || ath.basicData?.birthDate || pp.dateOfBirth || '');
  }
  if (!dob) {
    const dobHtml = html.match(/"dateOfBirth"\s*:\s*"([^"]+)"/);
    if (dobHtml) dob = parseDob(dobHtml[1]);
  }
  const age = calcAge(dob);

  // ── PRs & honours ─────────────────────────────────────────────────────────
  const prs = nd ? parsePRs(nd) : [];
  const honours = nd ? parseHonours(nd) : [];

  // ── Infer event category from PRs ─────────────────────────────────────────
  let eventCategory = eventArg || '';
  if (!eventCategory && prs.length > 0) {
    const evts = prs.map(p => p.event);
    if (evts.some(e => ['800m','1500m','Mile'].includes(e)))           eventCategory = 'MIDDLE DISTANCE';
    else if (evts.some(e => ['3000m','5000m','10000m','3000m SC'].includes(e))) eventCategory = 'DISTANCE';
    else if (evts.some(e => e.includes('100') || e.includes('200'))) eventCategory = 'SPRINTS';
    else eventCategory = 'MIDDLE DISTANCE';
  }
  if (!eventCategory) eventCategory = 'MIDDLE DISTANCE';

  // ── Build ID ──────────────────────────────────────────────────────────────
  const id = idArg || nameToId(name);
  const filePath = path.join(ATHLETES_DIR, `${id}.json`);

  if (fs.existsSync(filePath)) {
    console.error(`\n✗ File already exists: _data/athletes/${id}.json`);
    console.error(`  Use --id to specify a different id, or edit the file directly.`);
    process.exit(1);
  }

  // ── Assemble stub ─────────────────────────────────────────────────────────
  const stub = {
    id,
    name,
    flag:            countryInfo.flag,
    country:         countryInfo.country,
    waUrl,
    photo:           '',
    photoBackground: '#111111',
    event:           eventCategory,
    age,
    ...(dob ? { dob } : {}),
    height:          'x',
    weight:          'x',
    hometown:        'x',
    coach:           'x',
    club:            'x',
    seasons:         '0',
    ncaa:            false,
    collegeLogo:     '',
    college:         '',
    headlineKey:     'x',
    headlineRest:    'x',
    questionTitle:   'Next question',
    questionBody:    'x',
    reviewTitle:     'Season review',
    reviewBody:      'x',
    traits:          [],
    honours,
    prs,
    results:         [],
    lastSynced:      null,
  };

  // ── Write file ────────────────────────────────────────────────────────────
  fs.writeFileSync(filePath, JSON.stringify(stub, null, 2));
  console.log(`\n✓ Created _data/athletes/${id}.json`);
  console.log(`  Name:    ${name}`);
  console.log(`  Country: ${countryInfo.country} (${countryInfo.flag})`);
  if (dob) console.log(`  DOB:     ${dob} (age ${age})`);
  console.log(`  PRs:     ${prs.length} events`);
  console.log(`  Honours: ${honours.length} podium finishes`);

  // ── Rebuild athletes.json ─────────────────────────────────────────────────
  console.log('\n📦 Rebuilding athletes.json...');
  const files   = fs.readdirSync(ATHLETES_DIR).filter(f => f.endsWith('.json')).sort();
  const athletes = files.map(f => JSON.parse(fs.readFileSync(path.join(ATHLETES_DIR, f), 'utf8')));
  fs.writeFileSync(ATHLETES_JSON, JSON.stringify({ items: athletes }, null, 2));
  console.log(`✓ athletes.json updated (${athletes.length} athletes)\n`);

  console.log('Next steps:');
  console.log(`  1. Add a photo → running-site/images/${id}.png`);
  console.log(`  2. Update the editorial fields (headline, review, etc.) in the file`);
  console.log(`  3. Run: node scripts/sync-athlete-results.js --force`);
  if (honours.length === 0) console.log(`  4. Honours not found — check WA page and add manually if needed`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });

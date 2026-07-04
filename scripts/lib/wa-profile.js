'use strict';
// Shared World Athletics profile fetch + parse helpers.
// Used by new-athlete.js (single add) and add-athletes.js (batch add).

const https = require('https');

// ── Country / flag mapping ────────────────────────────────────────────────────

// WA URL country slug → { flag (ISO 2), country (display name) }
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
  'israel':           { flag: 'IL', country: 'Israel' },
  'namibia':          { flag: 'NA', country: 'Namibia' },
  'botswana':         { flag: 'BW', country: 'Botswana' },
  'senegal':          { flag: 'SN', country: 'Senegal' },
  'uganda':           { flag: 'UG', country: 'Uganda' },
};

// IOC 3-letter country code → flag
const IOC_TO_FLAG = {
  'USA':'US','GBR':'GB','KEN':'KE','ETH':'ET','NOR':'NO','FRA':'FR',
  'AUS':'AU','IRL':'IE','NED':'NL','NZL':'NZ','POR':'PT','ESP':'ES',
  'ERI':'ER','BDI':'BI','MAR':'MA','ALG':'DZ','TAN':'TZ','UGA':'UG',
  'JAM':'JM','CAN':'CA','BEL':'BE','GER':'DE','POL':'PL','SWE':'SE',
  'DEN':'DK','FIN':'FI','ITA':'IT','CHN':'CN','JPN':'JP','BRN':'BH',
  'QAT':'QA','RSA':'ZA','BRA':'BR','SUI':'CH','AUT':'AT','CZE':'CZ',
  'TUR':'TR','ISR':'IL','NAM':'NA','BOT':'BW','SEN':'SN','MEX':'MX',
};

// ── Event normalization ───────────────────────────────────────────────────────

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

// ── Generic helpers ───────────────────────────────────────────────────────────

function nameToId(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function competitorIdFromUrl(waUrl) {
  const m = String(waUrl).replace(/\?.*$/, '').match(/-(\d+)\/?$/);
  return m ? parseInt(m[1], 10) : null;
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
    function get(u, redirects = 0) {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(u, opts, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location;
          const next = loc.startsWith('http') ? loc : new URL(loc, u).href;
          return get(next, redirects + 1);
        }
        if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(body));
      }).on('error', reject);
    }
    get(url.replace(/^http:\/\//, 'https://'));
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

// Infer the site's event-category label from a list of PR events.
function inferEventCategory(prs) {
  const evts = prs.map(p => p.event);
  if (evts.some(e => ['800m','1500m','Mile'].includes(e)))                     return 'MIDDLE DISTANCE';
  if (evts.some(e => ['3000m','5000m','10000m','3000m SC'].includes(e)))       return 'DISTANCE';
  if (evts.some(e => e.includes('100') || e.includes('200')))                  return 'SPRINTS';
  return 'MIDDLE DISTANCE';
}

// ── High-level: fetch a WA profile URL and return normalized fields ───────────

// Returns { name, flag, country, dob, age, prs, honours, eventCategory, nameSlug }
// `hints` may supply { dob, countryCode, name } from a ranking row to fill gaps.
async function fetchAndParseProfile(waUrl, hints = {}) {
  const urlMatch = waUrl.match(/worldathletics\.org\/athletes\/([a-z-]+)\/([a-z-]+)-(\d+)/i);
  if (!urlMatch) throw new Error(`Could not parse WA URL: ${waUrl}`);
  const [, countrySlug, nameSlug] = urlMatch;
  const countryInfo = SLUG_TO_COUNTRY[countrySlug] || { flag: countrySlug.toUpperCase().slice(0, 2), country: countrySlug };

  const html = await fetchPage(waUrl);
  if (html.length < 1000) throw new Error('WA returned an empty page (WAF block)');

  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let nd = null;
  if (ndMatch) { try { nd = JSON.parse(ndMatch[1]); } catch (_) {} }

  // Name
  let name = hints.name || '';
  if (!name && nd) {
    const pp = dig(nd, 'props', 'pageProps') || {};
    const ath = pp.competitor?.basicData || pp.athlete || pp.data?.athlete || pp.athleteProfile || {};
    name = ath.fullName || ath.name ||
      ((ath.givenName || ath.firstName) && (ath.familyName || ath.lastName)
        ? `${ath.givenName || ath.firstName || ''} ${ath.familyName || ath.lastName || ''}`.trim()
        : '');
    const nat = ath.countryCode || ath.nationality || '';
    if (nat && IOC_TO_FLAG[nat.toUpperCase()]) countryInfo.flag = IOC_TO_FLAG[nat.toUpperCase()];
  }
  if (!name) {
    const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleM) name = titleM[1].split('|')[0].split('-')[0].trim();
  }
  if (!name) name = nameSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  name = name.trim();
  // WA renders names ALL CAPS surname; title-case it.
  name = name.replace(/\b[A-ZÀ-Þ]{2,}\b/g, w => w[0] + w.slice(1).toLowerCase());

  if (hints.countryCode && IOC_TO_FLAG[hints.countryCode.toUpperCase()]) {
    countryInfo.flag = IOC_TO_FLAG[hints.countryCode.toUpperCase()];
  }

  // DOB / age
  let dob = parseDob(hints.dob || '');
  if (!dob && nd) {
    const pp = dig(nd, 'props', 'pageProps') || {};
    const ath = pp.competitor?.basicData || pp.athlete || pp.data?.athlete || {};
    dob = parseDob(ath.birthDate || ath.dateOfBirth || pp.dateOfBirth || '');
  }
  if (!dob) {
    const dobHtml = html.match(/"(?:dateOfBirth|birthDate)"\s*:\s*"([^"]+)"/);
    if (dobHtml) dob = parseDob(dobHtml[1]);
  }

  const prs = nd ? parsePRs(nd) : [];
  const honours = nd ? parseHonours(nd) : [];

  return {
    name,
    flag: countryInfo.flag,
    country: countryInfo.country,
    dob,
    age: calcAge(dob),
    prs,
    honours,
    eventCategory: inferEventCategory(prs),
    nameSlug,
  };
}

// Assemble a fresh athlete stub object from parsed profile fields.
function buildStub(id, waUrl, p, eventOverride) {
  return {
    id,
    name:            p.name,
    flag:            p.flag,
    country:         p.country,
    waUrl,
    photo:           '',
    photoBackground: '#111111',
    event:           eventOverride || p.eventCategory,
    age:             p.age,
    ...(p.dob ? { dob: p.dob } : {}),
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
    honours:         p.honours,
    prs:             p.prs,
    results:         [],
    lastSynced:      null,
  };
}

module.exports = {
  SLUG_TO_COUNTRY, IOC_TO_FLAG, EVENT_MAP, EVENT_ORDER,
  normalizeEvent, nameToId, competitorIdFromUrl, fetchPage, dig,
  parseDob, calcAge, parsePRs, parseHonours, inferEventCategory,
  fetchAndParseProfile, buildStub,
};

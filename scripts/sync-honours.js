#!/usr/bin/env node
// Fetches career honours from Wikipedia for every athlete in _data/athletes/,
// then merges results into their individual JSON files.
//
// Run locally before committing:
//   node scripts/sync-honours.js
//
// Wikipedia is free, open, and doesn't block bots — no credentials needed.
// Athletes without Wikipedia pages (or no medal table) are skipped silently.

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ATHLETES_DIR = path.join(__dirname, '../running-site/_data/athletes');

// ── Wikipedia fetch ───────────────────────────────────────────────────────────

async function wikiGet(params, attempt = 0) {
  const qs  = new URLSearchParams({ ...params, format: 'json' }).toString();
  const url = `https://en.wikipedia.org/w/api.php?${qs}`;
  const raw = await new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'StatTC-honours-sync/1.0' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    }).on('error', reject);
  });
  // Wikipedia returns plain text "You are making too many requests" when rate limited
  if (raw.startsWith('You are') || raw.startsWith('<!DOCTYPE')) {
    if (attempt >= 3) throw new Error('rate limited after 3 retries');
    await sleep(5000 * (attempt + 1));
    return wikiGet(params, attempt + 1);
  }
  return JSON.parse(raw);
}

async function getWikitext(athleteName) {
  // 1. Search for the athlete's Wikipedia page
  const search = await wikiGet({ action: 'query', list: 'search', srsearch: athleteName + ' athlete runner', srlimit: 3 });
  const results = search?.query?.search || [];
  if (!results.length) return null;

  // Pick the best match — prefer exact name match
  const nameLower = athleteName.toLowerCase();
  const best = results.find(r => r.title.toLowerCase().includes(nameLower.split(' ')[1] || nameLower))
            || results[0];

  // 2. Fetch wikitext for that page
  const data = await wikiGet({ action: 'query', titles: best.title, prop: 'revisions', rvprop: 'content', rvslots: 'main' });
  const page = Object.values(data?.query?.pages || {})[0];
  return page?.revisions?.[0]?.slots?.main?.['*'] || null;
}

// ── Medal template parser ─────────────────────────────────────────────────────

// Competition category → our short label + weight
// WI must come before WC: "World Athletics Indoor Championships" contains "World Athletics Championships"
const COMP_MAP = [
  { match: /\bolympic\b/i,                          short: 'OLY', weight: 0 },
  { match: /world (athletics )?indoor/i,            short: 'WI',  weight: 2 },
  { match: /world athletics championships|world championships/i, short: 'WC',  weight: 1 },
  { match: /diamond league/i,                        short: 'DLF', weight: 3 },
];

// Competitions known NOT to be one of our tracked categories. When a medal's
// own year/location link matches this (e.g. European Indoors lumped under a
// World Championships section header on some Wikipedia pages), skip it
// instead of falling back to the section header.
const EXCLUDE_COMP = /european|asian|african|pan american|commonwealth|continental|cross country|national championships/i;

const EVENT_NORM = {
  '1500 m': '1500m', '1500m': '1500m', '1,500 m': '1500m',
  '800 m': '800m', '800m': '800m',
  '5000 m': '5000m', '5,000 m': '5000m', '5000m': '5000m',
  '10,000 m': '10000m', '10000 m': '10000m', '10000m': '10000m',
  '3000 m': '3000m', '3000m': '3000m',
  '3000 m sc': '3000m SC', '3000m sc': '3000m SC', '3,000 m steeplechase': '3000m SC',
  'mile': 'Mile', '1 mile': 'Mile',
  'half marathon': 'Half Marathon',
  'marathon': 'Marathon',
};

function normalizeEvent(raw) {
  // Extract display text from [[link|display]] (display is after |), then [[text]]
  const stripped = raw
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')  // [[link|display]] → display
    .replace(/\[\[([^\]]+)\]\]/g, '$1')             // [[text]] → text
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = stripped.toLowerCase();
  return EVENT_NORM[lower] || stripped;
}

function extractYear(locationStr) {
  const m = locationStr.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : '';
}

function parseMedalTable(wikitext) {
  // Find the medal table block: starts at {{Medal|Sport|...}}
  const start = wikitext.indexOf('{{Medal|Sport|');
  if (start === -1) return [];

  // Extract until the closing |} of the medal table
  const block = wikitext.slice(start);

  const honours = [];
  let currentComp = null;
  let currentCompInfo = null;

  // Split medal template params on '|' while respecting [[wiki link|text]] nesting
  function splitMedalParams(str) {
    const params = [];
    let cur = '', depth = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '[' && str[i + 1] === '[') { depth++; cur += '[['; i++; }
      else if (str[i] === ']' && str[i + 1] === ']') { depth--; cur += ']]'; i++; }
      else if (str[i] === '|' && depth === 0) { params.push(cur.trim()); cur = ''; }
      else cur += str[i];
    }
    if (cur.trim()) params.push(cur.trim());
    return params;
  }

  // Split on medal template boundaries
  const re = /\{\{Medal\|([^}]+)\}\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const parts = splitMedalParams(m[1]);
    const type  = parts[0];

    if (type === 'Competition') {
      // Strip wiki markup to get plain competition name
      const compRaw = (parts[1] || '').replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').trim();
      currentComp = compRaw;
      currentCompInfo = COMP_MAP.find(c => c.match.test(compRaw)) || null;
      continue;
    }

    const place = (type === 'Gold' || type === '1st') ? 1 : (type === 'Silver' || type === '2nd') ? 2 : (type === 'Bronze' || type === '3rd') ? 3 : null;
    if (!place) continue;

    const locationYear = parts[1] || '';
    const eventRaw     = parts[2] || '';

    // Some Wikipedia pages list multiple distinct competitions (e.g. WC and WI)
    // under one shared {{Medal|Competition|...}} header. The individual medal's
    // own year/location link names the actual competition for that medal, so
    // prefer it over the section header when it identifies a recognized comp.
    const locationLinkTarget = locationYear.replace(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/, '$1').trim();
    const linkCompInfo = COMP_MAP.find(c => c.match.test(locationLinkTarget)) || null;
    if (!linkCompInfo && EXCLUDE_COMP.test(locationLinkTarget)) continue;
    const compInfo = linkCompInfo || currentCompInfo;
    if (!compInfo) continue;
    const compName = linkCompInfo ? locationLinkTarget.replace(/^\d{4}\s+/, '') : currentComp;

    const year  = extractYear(locationYear);
    const event = normalizeEvent(eventRaw);

    if (!year || !event) continue;

    honours.push({
      competition: compName,
      short:       compInfo.short,
      discipline:  event,
      place,
      year,
      _w: compInfo.weight,
    });
  }

  // Sort: weight → year desc → place
  honours.sort((a, b) => {
    if (a._w !== b._w) return a._w - b._w;
    if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
    return a.place - b.place;
  });

  return honours.map(({ _w, ...h }) => h);
}

// ── Merge helpers ─────────────────────────────────────────────────────────────

function honourKey(h) {
  return `${h.short}|${h.year}|${h.discipline}|${h.place}`;
}

// Scraped data wins for athletes with no manual overrides.
// Manual entries not found in scraped data are preserved (e.g. DLF years WP missed).
function mergeHonours(existing, scraped) {
  const map = new Map();
  // Start with scraped (authoritative for what WP has)
  for (const h of scraped) map.set(honourKey(h), h);
  // Add any manual entries not already covered
  for (const h of existing) if (!map.has(honourKey(h))) map.set(honourKey(h), h);

  const info = h => COMP_MAP.find(c => c.match.test(h.competition)) || { weight: 99 };
  return [...map.values()].sort((a, b) => {
    const wa = info(a).weight, wb = info(b).weight;
    if (wa !== wb) return wa - wb;
    if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
    return a.place - b.place;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const nameFilter = process.argv[2] ? process.argv[2].toLowerCase() : null;
  const files = fs.readdirSync(ATHLETES_DIR).filter(f => f.endsWith('.json')).sort();
  let updated = 0, unchanged = 0, noWiki = 0, noMedals = 0;

  for (const file of files) {
    const fpath = path.join(ATHLETES_DIR, file);
    const data  = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    const name  = data.name || file;
    if (nameFilter && !name.toLowerCase().includes(nameFilter)) continue;

    process.stdout.write(`  ${name.padEnd(28)} `);

    let wikitext = null;
    try {
      wikitext = await getWikitext(name);
    } catch (e) {
      console.log(`FETCH ERROR (${e.message})`);
      continue;
    }

    if (!wikitext) {
      console.log('no Wikipedia page');
      noWiki++;
      await sleep(2000);
      continue;
    }

    const scraped  = parseMedalTable(wikitext);
    if (!scraped.length) {
      console.log('no medal table');
      noMedals++;
      await sleep(2000);
      continue;
    }

    const existing = data.honours || [];
    const merged   = mergeHonours(existing, scraped);

    const changed = JSON.stringify(merged) !== JSON.stringify(existing);
    const added   = merged.length - existing.length;

    console.log(`${scraped.length} medals found${added > 0 ? ', +' + added + ' new' : ', no change'}`);

    if (changed) {
      data.honours = merged;
      fs.writeFileSync(fpath, JSON.stringify(data, null, 2));
      updated++;
    } else {
      unchanged++;
    }

    await sleep(2000); // Wikipedia rate limit: be polite
  }

  console.log(`\nDone. ${updated} files updated, ${unchanged} unchanged, ${noWiki} no Wikipedia page, ${noMedals} page found but no medal table.`);
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Fetches multi-year race results from World Athletics for every athlete
// that has a waUrl, then writes them into resultsHistory in athletes.json.
//
// Usage:
//   node scripts/sync-history.js              # all athletes, years 2022–2025
//   node scripts/sync-history.js --years 2023,2024,2025
//   node scripts/sync-history.js --id jake-wightman   # single athlete
//   node scripts/sync-history.js --force      # overwrite existing history

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

const DELAY_BASE_MS = 4000; // base delay between fetches
const DELAY_JITTER  = 2000; // add up to this many ms randomly

// ── HTTP fetch ───────────────────────────────────────────────────────────────

const http  = require('http');

function fetchPage(rawUrl) {
  // Always use https
  const url = rawUrl.replace(/^http:\/\//, 'https://');
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent':         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept':             'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language':    'en-US,en;q=0.9',
        'Accept-Encoding':    'identity',
        'Cache-Control':      'no-cache',
        'Pragma':             'no-cache',
        'Referer':            'https://www.google.com/',
        'Sec-Fetch-Dest':     'document',
        'Sec-Fetch-Mode':     'navigate',
        'Sec-Fetch-Site':     'cross-site',
        'Upgrade-Insecure-Requests': '1',
      },
    };
    function get(url, hops = 0) {
      if (hops > 8) return reject(new Error('Too many redirects'));
      const lib = url.startsWith('http://') ? http : https;
      lib.get(url, opts, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          res.resume();
          return get(next, hops + 1);
        }
        if (res.statusCode === 202) {
          res.resume();
          return reject(new Error(`HTTP 202 (rate limited)`));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }).on('error', reject);
    }
    get(url);
  });
}

async function fetchWithRetry(url, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetchPage(url);
    } catch (err) {
      const isRateLimit = err.message.includes('202') || err.message.includes('rate limit');
      if (!isRateLimit || attempt === retries - 1) throw err;
      const wait = (attempt + 1) * 15000 + Math.random() * 5000;
      process.stdout.write(` [rate limited, waiting ${Math.round(wait / 1000)}s...]`);
      await sleep(wait);
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Parse helpers (mirrors wa-athlete.js logic) ──────────────────────────────

function dig(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

function getYear(raw) {
  if (!raw) return 0;
  const m = String(raw).match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : 0;
}

const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function parseResultDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  // ISO: 2025-06-12 → "JUN 12"
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${MON[parseInt(iso[2], 10) - 1]} ${parseInt(iso[3], 10)}`;
  // WA text: "12 JUN 2025" → "JUN 12"
  const dmy = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (dmy) return `${dmy[2].toUpperCase()} ${parseInt(dmy[1], 10)}`;
  return s;
}

function parseMark(raw) {
  return String(raw || '').replace(/i$/, '').trim();
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
  '400 metres': '400m', '800 metres': '800m', '1500 metres': '1500m',
  '1 mile': 'Mile', 'one mile': 'Mile', 'mile': 'Mile',
  '2000 metres': '2000m', '3000 metres': '3000m', '2 miles': '2 Miles',
  '5000 metres': '5000m', '10,000 metres': '10000m', '10000 metres': '10000m',
  'half marathon': 'Half Marathon', 'marathon': 'Marathon',
  '3000 metres steeplechase': '3000m SC', 'steeplechase': '3000m SC',
  '110 metres hurdles': '110m H', '400 metres hurdles': '400m H',
};

function normalizeEvent(raw) {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim()
    .replace(' short track', ' sh')
    .replace('short track', 'sh');
  return EVENT_MAP[lower.replace(/ sh$/, '').trim()]
    ? (EVENT_MAP[lower.replace(/ sh$/, '').trim()] + (lower.endsWith(' sh') ? ' sh' : ''))
    : (EVENT_MAP[lower] || raw);
}

// ── Core extractor: return { year: [results...] } for targetYears ────────────

function extractResultsByYear(nd, targetYears) {
  const byYear = {}; // { 2025: Map<key, result>, ... }
  targetYears.forEach(y => { byYear[y] = new Map(); });

  function addResult(year, rawDate, rawMark, rawComp, rawEvent, rawPlace) {
    if (!targetYears.includes(year)) return;
    const mark = parseMark(rawMark);
    if (!mark) return;
    const meet = cleanMeetName(
      typeof rawComp === 'object' ? (rawComp?.name || rawComp?.fullName || '') : (rawComp || '')
    );
    if (!meet) return;
    const meetLower = meet.toLowerCase();
    if (meetLower.includes('split time') || meetLower.includes('- splits')) return;

    const date = parseResultDate(rawDate);
    const event = normalizeEvent(String(rawEvent || ''));
    const place = String(rawPlace || '').replace(/\.$/, '');
    const normTime = mark.replace(/[hi]$/, '');
    const key = `${rawDate}|${normTime}`;

    const existing = byYear[year].get(key);
    const score = (event ? 2 : 0) + (place ? 1 : 0) - meet.length * 0.001;
    if (!existing || score > existing._score) {
      byYear[year].set(key, { date, meet, event, time: mark, place, _score: score, _rawDate: rawDate });
    }
  }

  const pp = dig(nd, 'props', 'pageProps') || {};

  // ── Strategy A: resultsByYear keyed object ────────────────────────────────
  for (const path of [['resultsByYear'], ['athlete', 'resultsByYear']]) {
    const rby = dig(pp, ...path);
    if (rby && typeof rby === 'object' && !Array.isArray(rby)) {
      for (const [yearKey, arr] of Object.entries(rby)) {
        const y = parseInt(yearKey, 10);
        if (!targetYears.includes(y)) continue;
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          if (!item || typeof item !== 'object') continue;
          const rawDate = item.date || item.dateFormatted || item.dateDay || '';
          const rawMark = item.mark || item.performance || item.result || item.time || '';
          const rawComp = item.competition || item.competitionName || item.meet || item.matchName || '';
          const rawEvent = item.discipline || item.event || item.eventName || item.disciplineCode || '';
          const rawPlace = item.place || item.position || item.rank || item.pos || '';
          // nested results array
          if (Array.isArray(item.results) && item.results.length > 0) {
            for (const r of item.results) {
              addResult(y,
                r.date || r.dateFormatted || rawDate,
                r.mark || r.performance || r.result || r.time || rawMark,
                r.competition || r.competitionName || r.meet || rawComp,
                r.discipline || r.event || r.eventName || rawEvent,
                r.place || r.position || r.rank || rawPlace
              );
            }
          } else {
            addResult(y, rawDate, rawMark, rawComp, rawEvent, rawPlace);
          }
        }
      }
    }
  }

  // ── Strategy A.5: competitor.resultsByYear.resultsByEvent ─────────────────
  const compRbye = dig(pp, 'competitor', 'resultsByYear', 'resultsByEvent');
  if (Array.isArray(compRbye)) {
    for (const ev of compRbye) {
      const discipline = ev.discipline || ev.name || ev.disciplineName || '';
      for (const r of (ev.results || [])) {
        const rawDate = r.date || r.eventDate || r.dateFormatted || '';
        const y = getYear(rawDate);
        addResult(y, rawDate,
          r.mark || r.performance || r.result || r.time || '',
          r.competition || r.meet || r.competitionName || '',
          discipline,
          r.place || r.position || r.rank || ''
        );
      }
    }
  }

  // ── Strategy B: walk all result-shaped arrays in __NEXT_DATA__ ─────────────
  // Only used if Strategy A produced nothing for a given year
  const missing = targetYears.filter(y => byYear[y].size === 0);
  if (missing.length > 0) {
    (function walk(obj, depth) {
      if (depth > 12 || obj == null || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        const sample = obj.find(x => x && typeof x === 'object');
        if (sample) {
          const hasDate = 'date' in sample || 'eventDate' in sample || 'startDate' in sample;
          const hasMark = 'mark' in sample || 'performance' in sample || 'result' in sample || 'time' in sample;
          if (hasDate && hasMark) {
            for (const item of obj) {
              const rawDate = item.date || item.eventDate || item.startDate || '';
              const y = getYear(rawDate);
              if (!missing.includes(y)) continue;
              addResult(y, rawDate,
                item.mark || item.performance || item.result || item.time || '',
                item.competition || item.competitionName || item.meet || '',
                item.discipline || item.event || item.eventName || '',
                item.place || item.position || item.rank || ''
              );
            }
            return;
          }
        }
        for (const item of obj) walk(item, depth + 1);
      } else {
        for (const val of Object.values(obj)) walk(val, depth + 1);
      }
    })(nd, 0);
  }

  // Build final output: sort newest-first per year, strip internal fields
  const out = {};
  for (const y of targetYears) {
    const results = Array.from(byYear[y].values())
      .sort((a, b) => {
        // Sort by month/day within the year (newest first)
        const aOrd = MON.indexOf((a.date || '').split(' ')[0]) * 31 + parseInt((a.date || '').split(' ')[1] || 0, 10);
        const bOrd = MON.indexOf((b.date || '').split(' ')[0]) * 31 + parseInt((b.date || '').split(' ')[1] || 0, 10);
        return bOrd - aOrd;
      })
      .map(({ _score, _rawDate, ...r }) => r);
    if (results.length > 0) out[y] = results;
  }
  return out;
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

  let updated = 0;
  let skipped = 0;
  let errors  = 0;

  for (let i = 0; i < targets.length; i++) {
    const a = targets[i];
    const prefix = `[${i + 1}/${targets.length}] ${a.name}`;

    // Skip if already has history for all target years and not --force
    if (!FORCE && a.resultsHistory && typeof a.resultsHistory === 'object') {
      const hasAll = YEARS.every(y => Array.isArray(a.resultsHistory[y]) && a.resultsHistory[y].length > 0);
      if (hasAll) {
        console.log(`${prefix} — skipped (history exists, use --force to overwrite)`);
        skipped++;
        continue;
      }
    }

    if (i > 0) {
      const delay = DELAY_BASE_MS + Math.random() * DELAY_JITTER;
      await sleep(delay);
    }

    let html;
    try {
      process.stdout.write(`${prefix} — fetching...`);
      html = await fetchWithRetry(a.waUrl);
      process.stdout.write(' done\n');
    } catch (err) {
      process.stdout.write(` ERROR: ${err.message}\n`);
      errors++;
      continue;
    }

    // Parse __NEXT_DATA__
    const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!ndMatch) {
      console.log(`  ⚠ No __NEXT_DATA__ found — skipping`);
      errors++;
      continue;
    }

    let nd;
    try { nd = JSON.parse(ndMatch[1]); }
    catch (_) {
      console.log(`  ⚠ Failed to parse __NEXT_DATA__ — skipping`);
      errors++;
      continue;
    }

    const yearlyResults = extractResultsByYear(nd, YEARS);
    const foundYears = Object.keys(yearlyResults);

    if (foundYears.length === 0) {
      console.log(`  ⚠ No results found for years ${YEARS.join(', ')}`);
      // Still write empty object so we don't re-fetch next time
      if (!a.resultsHistory) a.resultsHistory = {};
    } else {
      if (!a.resultsHistory || typeof a.resultsHistory !== 'object') a.resultsHistory = {};
      for (const [yr, results] of Object.entries(yearlyResults)) {
        a.resultsHistory[yr] = results;
        console.log(`  ✓ ${yr}: ${results.length} results`);
      }
      updated++;
    }

    // Save after every athlete so a crash doesn't lose progress
    fs.writeFileSync(ATHLETES_JSON, JSON.stringify(data, null, 2));
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped, ${errors} errors.`);
}

main().catch(err => { console.error(err); process.exit(1); });

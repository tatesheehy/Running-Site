#!/usr/bin/env node
// Fetches 2026 race results from World Athletics and adds them to athlete JSON files.
// Skips athletes that already have results logged for the current year.
// Usage: node scripts/sync-athlete-results.js [--force] [--year 2026]

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ATHLETES_DIR = path.join(__dirname, '../running-site/_data/athletes');
const FORCE        = process.argv.includes('--force');
const yearIdx      = process.argv.indexOf('--year');
const YEAR         = yearIdx !== -1 ? process.argv[yearIdx + 1] : String(new Date().getFullYear());

const MONTHS = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };

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

function has2026Results(athlete) {
  // Check if athlete already has results from the current year
  // Our date format is "MON DD" with no year, so we check by count > 0 if not forcing
  return (athlete.results || []).length > 0;
}

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

    if (!FORCE && has2026Results(athlete)) {
      console.log(`✓  ${athlete.name} — already has ${athlete.results.length} results`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`🌐 ${athlete.name} — fetching results...`);
      const html    = await fetchPage(athlete.waUrl);

      if (html.length < 1000) {
        console.log(' ✗ WAF blocked (empty response)');
        failed++;
        await sleep(3000);
        continue;
      }

      const results = parseResults(html, YEAR);

      if (!results.length) {
        console.log(` — no ${YEAR} results found on page`);
        skipped++;
      } else {
        athlete.results = results;
        fs.writeFileSync(filePath, JSON.stringify(athlete, null, 2));
        console.log(` ✓  ${results.length} results saved`);
        updated++;
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
    console.log('Run `node scripts/build-athletes.js` to rebuild athletes.json.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });

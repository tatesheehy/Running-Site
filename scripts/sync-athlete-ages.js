#!/usr/bin/env node
// Fetches birth dates from World Athletics and updates athlete JSON files.
// Usage: node scripts/sync-athlete-ages.js [--force]
//   --force  re-fetch even if athlete already has a dob stored

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ATHLETES_DIR = path.join(__dirname, '../running-site/_data/athletes');
const FORCE        = process.argv.includes('--force');

const MONTHS = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4,  JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function calcAge(dob) {
  const born  = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
  return age;
}

function parseBirthDate(raw) {
  // "06 JUN 2001" → "2001-06-06"
  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [dd, mon, yyyy] = parts;
  const month = MONTHS[mon.toUpperCase()];
  if (month === undefined) return null;
  return `${yyyy}-${String(month + 1).padStart(2, '0')}-${String(Number(dd)).padStart(2, '0')}`;
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept':     'text/html',
      },
    };
    function get(url) {
      https.get(url, opts, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(body));
      }).on('error', reject);
    }
    get(url);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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

    if (athlete.dob && !FORCE) {
      const age = calcAge(athlete.dob);
      if (String(athlete.age) !== String(age)) {
        athlete.age = String(age);
        fs.writeFileSync(filePath, JSON.stringify(athlete, null, 2));
        console.log(`🔄 ${athlete.name} — age updated to ${age} (from stored dob)`);
        updated++;
      } else {
        console.log(`✓  ${athlete.name} — already synced (dob: ${athlete.dob}, age: ${athlete.age})`);
        skipped++;
      }
      continue;
    }

    try {
      process.stdout.write(`🌐 ${athlete.name} — fetching WA...`);
      const html     = await fetchPage(athlete.waUrl);
      const match    = html.match(/"birthDate":"([^"]+)"/);
      if (!match) {
        console.log(' ✗ birthDate not found in page');
        failed++;
        continue;
      }
      const dob = parseBirthDate(match[1]);
      if (!dob) {
        console.log(` ✗ couldn't parse "${match[1]}"`);
        failed++;
        continue;
      }
      const age = calcAge(dob);
      athlete.dob = dob;
      athlete.age = String(age);
      fs.writeFileSync(filePath, JSON.stringify(athlete, null, 2));
      console.log(` ✓  dob: ${dob}, age: ${age}`);
      updated++;
      await sleep(2000);
    } catch (err) {
      console.log(` ✗ error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed.`);
  if (updated > 0) {
    console.log('Run `node scripts/build-athletes.js` to rebuild athletes.json.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });

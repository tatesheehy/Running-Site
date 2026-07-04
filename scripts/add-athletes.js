#!/usr/bin/env node
// Batch-add athletes to the database by harvesting World Athletics ranking lists
// (or from explicit profile URLs), fetching each profile, and appending stubs
// straight into athletes.json — the CMS-managed source of truth.
//
// It does NOT rebuild athletes.json from _data/athletes/*.json (those files are
// stale), so existing results / resultsHistory are preserved.
//
// Usage:
//   node scripts/add-athletes.js --rankings "Men's 1500m" --top 30
//   node scripts/add-athletes.js --rankings "Men's 800m,Men's 1500m" --top 25
//   node scripts/add-athletes.js --url https://worldathletics.org/athletes/kenya/foo-123
//   node scripts/add-athletes.js --rankings "Men's 1500m" --top 40 --dry   # preview only
//
// Flags:
//   --rankings "<labels>"  comma-separated WA ranking labels (e.g. "Men's 1500m")
//   --top N                how many top-ranked athletes per list (default 30)
//   --url <waUrl>          add a specific profile (repeatable)
//   --event "<CATEGORY>"   override event category label for all added athletes
//   --dry                  show what would be added without writing
//
// After adding, run the syncs to fill in results:
//   node scripts/sync-athlete-results.js --force   # current season
//   node scripts/sync-history.js --force           # 2022–2025

'use strict';
const fs   = require('fs');
const path = require('path');
const {
  fetchAndParseProfile, buildStub, competitorIdFromUrl, nameToId,
} = require('./lib/wa-profile');
const { harvestRankings } = require('./lib/wa-rankings');

const ATHLETES_JSON = path.join(__dirname, '../running-site/_data/athletes.json');

// ── Args ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
function flag(name) { const i = argv.indexOf(name); return i !== -1 ? argv[i + 1] : null; }
const DRY        = argv.includes('--dry');
const TOP        = parseInt(flag('--top') || '30', 10);
const EVENT_OVER = flag('--event');
const RANKINGS   = flag('--rankings');
const URLS       = argv.reduce((acc, a, i) => { if (a === '--url' && argv[i + 1]) acc.push(argv[i + 1]); return acc; }, []);

if (!RANKINGS && URLS.length === 0) {
  console.error('Nothing to add. Use --rankings "Men\'s 1500m" and/or --url <waUrl>.');
  console.error('Run with --help-style usage in the file header for details.');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(fs.readFileSync(ATHLETES_JSON, 'utf8'));
  if (!Array.isArray(data.items)) throw new Error('athletes.json has no items array');

  // Index existing athletes by competitor id and by slug id.
  const existingCompIds = new Set();
  const existingSlugs   = new Set();
  for (const a of data.items) {
    existingSlugs.add(a.id);
    const cid = a.waUrl ? competitorIdFromUrl(a.waUrl) : null;
    if (cid) existingCompIds.add(cid);
  }

  // ── Build candidate list: [{ waUrl, name?, dob?, countryCode?, source }] ────
  const candidates = [];
  const seenUrls = new Set();

  function pushCandidate(c) {
    const cid = competitorIdFromUrl(c.waUrl);
    if (!cid) return;
    if (seenUrls.has(cid)) return;
    seenUrls.add(cid);
    candidates.push({ ...c, competitorId: cid });
  }

  if (RANKINGS) {
    const labels = RANKINGS.split(',').map(s => s.trim()).filter(Boolean);
    console.log(`\n🔎 Harvesting ${labels.length} ranking list(s), top ${TOP} each...`);
    const harvested = await harvestRankings(labels, TOP, { onProgress: m => console.log(m) });
    for (const label of labels) {
      const rows = harvested.get(label);
      if (!rows) { console.warn(`  ⚠ ranking "${label}" not found — check the exact label (e.g. "Men's 1500m")`); continue; }
      rows.forEach(r => pushCandidate({ waUrl: r.waUrl, name: r.name, dob: r.dob, countryCode: r.countryCode, source: label }));
    }
  }
  for (const u of URLS) pushCandidate({ waUrl: u, source: 'url' });

  // ── Filter out already-present athletes ─────────────────────────────────────
  const fresh = candidates.filter(c => !existingCompIds.has(c.competitorId));
  const already = candidates.length - fresh.length;

  console.log(`\n📋 ${candidates.length} candidates · ${already} already in DB · ${fresh.length} to add`);
  if (fresh.length === 0) { console.log('Nothing new to add.'); return; }

  if (DRY) {
    console.log('\n--dry run — would add:');
    fresh.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}. ${c.name || '(name from profile)'}  ${c.waUrl}  [${c.source}]`));
    return;
  }

  // ── Fetch + append ──────────────────────────────────────────────────────────
  let added = 0, failed = 0;
  for (let i = 0; i < fresh.length; i++) {
    const c = fresh[i];
    const prefix = `[${i + 1}/${fresh.length}] ${c.name || c.waUrl}`;
    process.stdout.write(`${prefix} — `);
    try {
      const p = await fetchAndParseProfile(c.waUrl, { name: c.name, dob: c.dob, countryCode: c.countryCode });
      let id = nameToId(p.name);
      // Ensure unique slug
      if (existingSlugs.has(id)) {
        let n = 2;
        while (existingSlugs.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      existingSlugs.add(id);
      existingCompIds.add(c.competitorId);

      const stub = buildStub(id, c.waUrl, p, EVENT_OVER);
      data.items.push(stub);
      added++;
      console.log(`✓ ${p.name} (${p.country}) · ${p.prs.length} PRs · ${p.honours.length} honours → ${id}`);

      // Save after every athlete (crash-safe)
      fs.writeFileSync(ATHLETES_JSON, JSON.stringify(data, null, 2));
    } catch (err) {
      failed++;
      console.log(`✗ ${err.message}`);
    }
    if (i < fresh.length - 1) await sleep(1200 + Math.random() * 800); // polite pacing
  }

  console.log(`\nDone. ${added} added, ${failed} failed. athletes.json now has ${data.items.length} athletes.`);
  if (added > 0) {
    console.log('\nNext steps to fill in results:');
    console.log('  node scripts/sync-athlete-results.js --force   # current season');
    console.log('  node scripts/sync-history.js --force           # 2022–2025 history');
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });

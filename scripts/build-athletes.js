#!/usr/bin/env node
// Combines individual athlete files from _data/athletes/*.json
// into _data/athletes.json for the site to consume.
//
// If athletes.json already exists and has items (i.e. it is managed
// directly by the CMS as a single file), this script is a no-op so it
// doesn't overwrite CMS changes on every deploy.

const fs   = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../running-site/_data/athletes');
const out = path.join(__dirname, '../running-site/_data/athletes.json');

// If athletes.json already exists with items, skip — CMS manages it directly.
if (fs.existsSync(out)) {
  try {
    const existing = JSON.parse(fs.readFileSync(out, 'utf8'));
    if (Array.isArray(existing.items) && existing.items.length > 0) {
      console.log(`athletes.json already has ${existing.items.length} athletes — managed by CMS, skipping merge.`);
      process.exit(0);
    }
  } catch (_) {}
}

// Legacy: merge individual files into athletes.json.
const files = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
  : [];

if (files.length === 0) {
  console.log('No individual athlete files found and no athletes.json — nothing to do.');
  process.exit(0);
}

const items = files.map(f => {
  const raw  = fs.readFileSync(path.join(dir, f), 'utf8');
  const data = JSON.parse(raw);
  data.id    = path.basename(f, '.json');
  return data;
});

fs.writeFileSync(out, JSON.stringify({ items }, null, 2));
console.log(`Built athletes.json from ${items.length} files.`);

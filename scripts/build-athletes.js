#!/usr/bin/env node
// Combines individual athlete files from _data/athletes/*.json
// into _data/athletes.json for the site to consume.
// Runs automatically on every Netlify deploy.

const fs   = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../running-site/_data/athletes');
const out = path.join(__dirname, '../running-site/_data/athletes.json');

const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.json'))
  .sort();

const items = files.map(f => {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const data = JSON.parse(raw);
  // Always derive id from filename so it can never mismatch
  data.id = path.basename(f, '.json');
  return data;
});

fs.writeFileSync(out, JSON.stringify({ items }, null, 2));
console.log(`Built athletes.json from ${items.length} files.`);

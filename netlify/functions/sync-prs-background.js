// Scheduled function: runs daily to sync athlete PRs + season results from World Athletics.
// Reads and writes individual athlete JSON files (running-site/_data/athletes/*.json)
// so the build process always sees fresh data when it regenerates athletes.json.
//
// Required env vars:
//   GITHUB_TOKEN  — Personal Access Token with "Contents: Read & Write" on the repo
//   GITHUB_REPO   — owner/repo, e.g. "tsheehy/running-site"
//   GITHUB_BRANCH — branch to commit to (default: "main")
//
// Optional:
//   SYNC_SECRET   — shared secret for manual HTTP trigger

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── WA parsing helpers ────────────────────────────────────────────────────────

const EVENT_MAP = {
  '60 metres': '60m', '100 metres': '100m', '200 metres': '200m', '400 metres': '400m',
  '800 metres': '800m', '1500 metres': '1500m', '1 mile': 'Mile', 'one mile': 'Mile',
  'mile': 'Mile', '2000 metres': '2000m', '3000 metres': '3000m', '2 miles': '2 Miles',
  '5000 metres': '5000m', '10,000 metres': '10000m', '10000 metres': '10000m',
  '15,000 metres': '15000m', 'half marathon': 'Half Marathon', 'marathon': 'Marathon',
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

const NON_FINISH = new Set(['DNF', 'DNS', 'DQ', 'NM', 'NH', 'DQB', 'DSQ']);

function parseMark(raw) {
  if (!raw) return '';
  const s = String(raw).replace(/i$/, '').trim();
  return NON_FINISH.has(s.toUpperCase()) ? s.toUpperCase() : s;
}

function isNonFinish(mark) {
  return NON_FINISH.has(String(mark || '').toUpperCase());
}

function isIndoor(b) {
  return b.indoor === true
    || b.type === 'indoor'
    || b.environment === 'indoor'
    || String(b.discipline || b.event || '').toLowerCase().includes('indoor')
    || String(b.venue || b.location || '').toLowerCase().includes('indoor');
}

function findBestsArray(obj, depth = 0) {
  if (depth > 10 || obj == null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      const first = obj[0];
      if ((first.discipline || first.event || first.eventName) && (first.mark || first.performance || first.result || first.time || first.best)) return obj;
    }
    for (const item of obj) { const found = findBestsArray(item, depth + 1); if (found) return found; }
    return null;
  }
  for (const key of ['personalBests','bests','bestResults','allTimeBests','performances','records','marks','results','data']) {
    if (key in obj) { const found = findBestsArray(obj[key], depth + 1); if (found) return found; }
  }
  for (const key of Object.keys(obj)) {
    const found = findBestsArray(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function normalizeBests(arr) {
  return arr.map(b => ({
    event: normalizeEvent(b.discipline || b.event || b.eventName || ''),
    time:  parseMark(b.mark || b.performance || b.result || b.time || b.best),
    indoor: isIndoor(b),
  })).filter(b => b.event && b.time && !isNonFinish(b.time));
}

function sortBests(bests) {
  return [...bests].sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a.event), bi = EVENT_ORDER.indexOf(b.event);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function parseResultDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dmy = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (dmy) return `${dmy[2]} ${parseInt(dmy[1], 10)}`;
  return s;
}

function getYear(raw) {
  if (!raw) return 0;
  const m = String(raw).match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : 0;
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

function extractSeasonResults(nd, year) {
  const raw = [];

  function dig(obj, ...keys) {
    let cur = obj;
    for (const k of keys) { if (cur == null || typeof cur !== 'object') return undefined; cur = cur[k]; }
    return cur;
  }

  function coerce(item, inheritComp, inheritDate, inheritYear) {
    const rawDate   = item.date || item.dateFormatted || item.dateDay || inheritDate || '';
    const rawMark   = item.mark || item.performance || item.result || item.time || '';
    const rawComp   = item.competition || item.competitionName || item.meet || item.matchName || inheritComp || '';
    const rawEvent  = item.discipline || item.event || item.eventName || item.disciplineCode || '';
    const rawPlace  = item.place || item.position || item.rank || item.pos || '';
    const rawSeason = item.season || item.year || '';
    let entryYear = getYear(rawDate) || getYear(rawSeason) || (typeof rawSeason === 'number' ? rawSeason : 0);
    if (!entryYear && inheritYear) entryYear = inheritYear;
    if (!entryYear || entryYear !== year) return;
    const mark = parseMark(rawMark);
    if (!mark || (!isNonFinish(mark) && !/[\d:]/.test(mark))) return;
    const meetLower = rawComp.toLowerCase();
    if (meetLower.includes('split time') || meetLower.includes('- splits')) return;
    raw.push({ date: parseResultDate(rawDate) || (rawSeason ? String(rawSeason) : ''), meet: cleanMeetName(rawComp), event: normalizeEvent(String(rawEvent)) || '', time: mark, place: rawPlace ? String(rawPlace).replace(/\.$/, '') : '', _rawDate: rawDate });
  }

  function processArray(arr, inheritComp, inheritDate, inheritYear) {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const comp = item.competition || item.competitionName || item.meet || item.matchName || inheritComp || '';
      const date = item.date || item.dateFormatted || item.dateDay || inheritDate || '';
      if (Array.isArray(item.results) && item.results.length > 0) processArray(item.results, comp, date, inheritYear);
      else if (Array.isArray(item.performances) && item.performances.length > 0) processArray(item.performances, comp, date, inheritYear);
      else coerce(item, comp, date, inheritYear);
    }
  }

  const pp = dig(nd, 'props', 'pageProps') || {};

  // Strategy A1: old structure — resultsByYear keyed by year string
  for (const path of [['resultsByYear'], ['athlete', 'resultsByYear']]) {
    const rby = dig(pp, ...path);
    if (rby && typeof rby === 'object' && !Array.isArray(rby)) {
      for (const [yearKey, arr] of Object.entries(rby)) {
        const keyYear = parseInt(yearKey, 10);
        if (!isNaN(keyYear) && keyYear !== year) continue;
        processArray(arr, '', '', keyYear || year);
      }
    }
  }

  // Strategy A2: new WA structure — competitor.resultsByYear.resultsByEvent[]
  // Each event has { discipline, results: [{ date, competition, mark, place }] }
  const rbe = dig(pp, 'competitor', 'resultsByYear', 'resultsByEvent');
  if (Array.isArray(rbe)) {
    for (const evGroup of rbe) {
      const discipline = evGroup.discipline || '';
      if (Array.isArray(evGroup.results)) {
        for (const r of evGroup.results) {
          const rawDate  = r.date || '';
          const rawMark  = r.mark || r.performance || '';
          const rawComp  = r.competition || r.competitionName || '';
          const rawPlace = r.place || r.position || '';
          const entryYear = getYear(rawDate);
          if (!entryYear || entryYear !== year) continue;
          const mark = parseMark(rawMark);
          if (!mark || (!isNonFinish(mark) && !/[\d:]/.test(mark))) continue;
          const meetLower = rawComp.toLowerCase();
          if (meetLower.includes('split time') || meetLower.includes('- splits')) continue;
          raw.push({
            date:     parseResultDate(rawDate),
            meet:     cleanMeetName(rawComp),
            event:    normalizeEvent(discipline),
            time:     mark,
            place:    rawPlace ? String(rawPlace).replace(/\.$/, '') : '',
            _rawDate: rawDate,
          });
        }
      }
    }
  }

  for (const path of [['results'], ['athlete', 'results'], ['performances'], ['athlete', 'performances'], ['competitionResults'], ['athlete', 'competitionResults'], ['seasonResults'], ['data', 'results']]) {
    const arr = dig(pp, ...path);
    if (Array.isArray(arr) && arr.length > 0) processArray(arr);
  }

  if (raw.length === 0) {
    (function walk(obj, depth) {
      if (depth > 10 || obj == null || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object') {
          const f = obj[0];
          if ((f.competition || f.competitionName || f.meet) && (f.mark || f.performance || f.result || f.time) && (f.date || f.season)) { processArray(obj); return; }
        }
        for (const item of obj) walk(item, depth + 1);
      } else { for (const val of Object.values(obj)) walk(val, depth + 1); }
    })(nd, 0);
  }

  raw.sort((a, b) => new Date(b._rawDate || 0) - new Date(a._rawDate || 0));

  const seen = new Map();
  for (const r of raw) {
    const normTime = r.time.replace(/[hi]$/, '');
    const key = `${r._rawDate}|${normTime}`;
    if (!seen.has(key)) {
      seen.set(key, r);
    } else {
      const cur = seen.get(key);
      const score    = (r.event ? 2 : 0) + (r.place ? 1 : 0) - r.meet.length * 0.001;
      const curScore = (cur.event ? 2 : 0) + (cur.place ? 1 : 0) - cur.meet.length * 0.001;
      if (score > curScore) seen.set(key, r);
    }
  }

  return Array.from(seen.values()).map(({ _rawDate, ...r }) => r);
}

async function fetchAthleteData(waUrl) {
  let html;
  try {
    html = await fetch(waUrl, { headers: FETCH_HEADERS }).then(r => r.text());
  } catch (e) {
    throw new Error(`Could not fetch ${waUrl}: ${e.message}`);
  }

  const year = new Date().getFullYear();
  let outdoor = [];
  let results = [];

  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndMatch) {
    try {
      const nd = JSON.parse(ndMatch[1]);
      const arr = findBestsArray(nd);
      if (arr) {
        const all = normalizeBests(arr);
        outdoor = sortBests(all.filter(b => !b.indoor));
      }
      results = extractSeasonResults(nd, year);
    } catch (_) {}
  }

  // HTML table fallback for PRs
  if (outdoor.length === 0) {
    const timeRe = /^\d*:\d{2}\.\d{2}$|^\d{2}\.\d{2}$/;
    const rowRe  = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowM;
    while ((rowM = rowRe.exec(html)) !== null) {
      const cells = [];
      const cellRx = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cM;
      while ((cM = cellRx.exec(rowM[1])) !== null) {
        cells.push(cM[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length >= 2 && timeRe.test(cells[1])) {
        outdoor.push({ event: normalizeEvent(cells[0]), time: cells[1], indoor: false });
      }
    }
    outdoor = sortBests(outdoor);
  }

  return {
    prs:     outdoor.map(({ event, time }) => ({ event, time })),
    results,
  };
}

function arrChanged(oldArr, newArr) {
  if ((oldArr || []).length !== (newArr || []).length) return true;
  return (newArr || []).some((p, i) => JSON.stringify(p) !== JSON.stringify((oldArr || [])[i]));
}

// ── GitHub API helpers ────────────────────────────────────────────────────────

async function ghFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub ${options.method || 'GET'} ${url} → ${res.status}: ${err}`);
  }
  return res.json();
}

const GH = 'https://api.github.com';

// List files in a directory
async function ghListDir(repo, token, dirPath) {
  return ghFetch(`${GH}/repos/${repo}/contents/${dirPath}`, token);
}

// Get a single file (returns { content (base64), sha, path })
async function ghGetFile(repo, token, filePath) {
  return ghFetch(`${GH}/repos/${repo}/contents/${filePath}`, token);
}

// Commit multiple file changes in a single git commit using the Git Data API
async function ghCommitMany(repo, token, branch, changes, message) {
  // changes: [{ path, content (utf8 string) }, ...]

  // 1. Get the latest commit SHA on the branch
  const refData = await ghFetch(`${GH}/repos/${repo}/git/refs/heads/${branch}`, token);
  const latestCommitSha = refData.object.sha;

  // 2. Get the tree SHA from that commit
  const commitData = await ghFetch(`${GH}/repos/${repo}/git/commits/${latestCommitSha}`, token);
  const baseTreeSha = commitData.tree.sha;

  // 3. Create a blob for each changed file
  const treeItems = await Promise.all(changes.map(async ({ path, content }) => {
    const blob = await ghFetch(`${GH}/repos/${repo}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'utf-8' }),
    });
    return { path, mode: '100644', type: 'blob', sha: blob.sha };
  }));

  // 4. Create a new tree on top of the base tree
  const newTree = await ghFetch(`${GH}/repos/${repo}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
  });

  // 5. Create the commit
  const newCommit = await ghFetch(`${GH}/repos/${repo}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [latestCommitSha] }),
  });

  // 6. Update the branch ref
  await ghFetch(`${GH}/repos/${repo}/git/refs/heads/${branch}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return newCommit.sha;
}

// ── Main handler ──────────────────────────────────────────────────────────────
// Runs on schedule OR manually via:
//   GET https://sparkly-centaur-e5f197.netlify.app/.netlify/functions/sync-prs

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    return await runSync();
  } catch (e) {
    return { statusCode: 500, body: 'Unhandled error: ' + e.message };
  }
};

async function runSync() {
  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    console.error('sync-prs: GITHUB_TOKEN and GITHUB_REPO env vars are required');
    return { statusCode: 500, body: 'Missing env vars' };
  }

  const athletesDir = 'running-site/_data/athletes';

  // 1. List all individual athlete JSON files
  let dirListing;
  try {
    dirListing = await ghListDir(repo, token, athletesDir);
  } catch (e) {
    console.error('sync-prs: could not list athletes dir:', e.message);
    return { statusCode: 500, body: e.message };
  }

  const jsonFiles = dirListing.filter(f => f.name.endsWith('.json'));

  // 2. Fetch each file and collect athletes that have a waUrl
  const athletes = [];
  for (const f of jsonFiles) {
    try {
      const fileData = await ghGetFile(repo, token, f.path);
      const content  = Buffer.from(fileData.content, 'base64').toString('utf8');
      const data     = JSON.parse(content);
      athletes.push({ filePath: f.path, sha: fileData.sha, data });
    } catch (e) {
      console.warn(`sync-prs: could not read ${f.path}:`, e.message);
    }
  }

  // 3. Fetch WA data for each athlete with a waUrl
  const changes = [];
  const report  = [];

  for (const { filePath, data } of athletes) {
    if (!data.waUrl) continue;

    try {
      const { prs: newPrs, results: newResults } = await fetchAthleteData(data.waUrl);
      const prsUpdated     = newPrs.length > 0 && arrChanged(data.prs, newPrs);
      const resultsUpdated = newResults.length > 0 && arrChanged(data.results, newResults);

      if (prsUpdated)     data.prs     = newPrs;
      if (resultsUpdated) data.results = newResults;

      const today = new Date().toISOString().split('T')[0];
      const needsWrite = prsUpdated || resultsUpdated || data.lastSynced !== today;
      if (needsWrite) {
        data.lastSynced = today;
        changes.push({ path: filePath, content: JSON.stringify(data, null, 2) });
      }
      if (prsUpdated || resultsUpdated) {
        console.log(`sync-prs: updated ${data.name} — PRs: ${newPrs.length}, results: ${newResults.length}`);
        report.push({ name: data.name, status: 'updated', prs: newPrs.length, seasonResults: newResults.length });
      } else {
        report.push({ name: data.name, status: 'unchanged' });
      }
    } catch (e) {
      console.warn(`sync-prs: failed for ${data.name}:`, e.message);
      report.push({ name: data.name, status: 'error', error: e.message });
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  if (changes.length === 0) {
    console.log('sync-prs: no changes detected');
    return { statusCode: 200, body: JSON.stringify({ message: 'No changes', report }) };
  }

  // 4. Commit all changed files in a single git commit
  const updatedNames = changes.map(c => c.path.split('/').pop().replace('.json', '')).join(', ');
  try {
    const sha = await ghCommitMany(
      repo, token, branch, changes,
      `chore: auto-sync PRs + results for ${updatedNames} [skip ci]`
    );
    console.log(`sync-prs: committed ${changes.length} file(s) → ${sha}`);
  } catch (e) {
    console.error('sync-prs: failed to commit:', e.message);
    return { statusCode: 500, body: e.message };
  }

  return { statusCode: 200, body: JSON.stringify({ message: `Synced ${changes.length} athlete(s)`, report }) };
}

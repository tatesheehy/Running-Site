// Scheduled function: runs daily to sync athlete PRs from World Athletics.
// Required env vars:
//   GITHUB_TOKEN  — Personal Access Token with "Contents: Read & Write" on the repo
//   GITHUB_REPO   — owner/repo, e.g. "tsheehy/running-site"
//
// Set these in: Netlify → Site → Environment variables

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

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

function parseMark(raw) {
  return raw ? String(raw).replace(/i$/, '').trim() : '';
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
  })).filter(b => b.event && b.time);
}

function sortBests(bests) {
  return [...bests].sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a.event), bi = EVENT_ORDER.indexOf(b.event);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

async function fetchOutdoorPRs(waUrl) {
  let html;
  try {
    html = await fetch(waUrl, { headers: FETCH_HEADERS }).then(r => r.text());
  } catch (e) {
    throw new Error(`Could not fetch ${waUrl}: ${e.message}`);
  }

  let outdoor = [];

  // Strategy 1: __NEXT_DATA__
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndMatch) {
    try {
      const nd = JSON.parse(ndMatch[1]);
      const arr = findBestsArray(nd);
      if (arr) {
        const all = normalizeBests(arr);
        outdoor = sortBests(all.filter(b => !b.indoor));
      }
    } catch (_) {}
  }

  // Strategy 2: HTML table
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

  return outdoor.map(({ event, time }) => ({ event, time }));
}

function prsChanged(oldPrs, newPrs) {
  if (oldPrs.length !== newPrs.length) return true;
  return newPrs.some((p, i) => p.event !== oldPrs[i]?.event || p.time !== oldPrs[i]?.time);
}

// ── GitHub API helpers ────────────────────────────────────────────────────────

async function ghGet(path, token) {
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub GET ${path} → ${res.status}`);
  return res.json();
}

async function ghPut(path, token, body) {
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Main handler ──────────────────────────────────────────────────────────────
// Runs on schedule OR manually via:
//   GET /.netlify/functions/sync-prs?secret=YOUR_SYNC_SECRET
// Set SYNC_SECRET in Netlify env vars to protect the manual trigger.

exports.handler = async (event) => {
  // Manual HTTP trigger (for testing)
  if (event.httpMethod === 'GET') {
    const secret = process.env.SYNC_SECRET;
    const provided = (event.queryStringParameters || {}).secret;
    if (!secret || provided !== secret) {
      return { statusCode: 401, body: 'Unauthorized — set ?secret=YOUR_SYNC_SECRET' };
    }
  } else if (event.httpMethod && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Falls through to the sync logic below
  return runSync();
};

async function runSync() {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO; // e.g. "tsheehy/running-site"

  if (!token || !repo) {
    console.error('sync-prs: GITHUB_TOKEN and GITHUB_REPO env vars are required');
    return { statusCode: 500, body: 'Missing env vars' };
  }

  const filePath = 'running-site/_data/athletes.json';
  const apiPath  = `${repo}/contents/${filePath}`;

  // 1. Fetch athletes.json from GitHub
  let fileData;
  try {
    fileData = await ghGet(apiPath, token);
  } catch (e) {
    console.error('sync-prs: could not read athletes.json from GitHub:', e.message);
    return { statusCode: 500, body: e.message };
  }

  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
  const data = JSON.parse(currentContent);
  const athletes = data.items || [];

  // 2. Fetch fresh PRs for each athlete that has a waUrl
  let anyChanged = false;
  const results = [];

  for (const athlete of athletes) {
    if (!athlete.waUrl) continue;

    try {
      const newPrs = await fetchOutdoorPRs(athlete.waUrl);
      if (newPrs.length > 0 && prsChanged(athlete.prs || [], newPrs)) {
        console.log(`sync-prs: updated PRs for ${athlete.name}`);
        athlete.prs = newPrs;
        anyChanged = true;
        results.push({ name: athlete.name, status: 'updated', count: newPrs.length });
      } else {
        results.push({ name: athlete.name, status: 'unchanged' });
      }
    } catch (e) {
      console.warn(`sync-prs: failed for ${athlete.name}:`, e.message);
      results.push({ name: athlete.name, status: 'error', error: e.message });
    }

    // Small delay between requests to be polite to WA servers
    await new Promise(r => setTimeout(r, 1500));
  }

  if (!anyChanged) {
    console.log('sync-prs: no PR changes detected');
    return { statusCode: 200, body: JSON.stringify({ message: 'No changes', results }) };
  }

  // 3. Commit updated athletes.json back to GitHub
  const updatedContent = JSON.stringify(data, null, 2);
  const updatedBase64  = Buffer.from(updatedContent).toString('base64');

  try {
    await ghPut(apiPath, token, {
      message: 'chore: auto-sync athlete PRs from World Athletics',
      content: updatedBase64,
      sha: fileData.sha,
    });
    console.log('sync-prs: committed updated athletes.json');
  } catch (e) {
    console.error('sync-prs: failed to commit:', e.message);
    return { statusCode: 500, body: e.message };
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'PRs synced', results }) };
};

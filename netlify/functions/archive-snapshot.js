// Archives current live rankings as a new week entry in rankings-archive.json
// Requires env vars: GITHUB_TOKEN, GITHUB_OWNER (default: tatesheehy), GITHUB_REPO (default: Running-Site)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const OWNER = process.env.GITHUB_OWNER || 'tatesheehy';
const REPO  = process.env.GITHUB_REPO  || 'Running-Site';
const TOKEN = process.env.GITHUB_TOKEN;

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub GET ${path} → ${res.status}`);
  return res.json();
}

async function ghPut(path, content, sha, message) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub PUT ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'POST only' }) };
  }

  if (!TOKEN) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'GITHUB_TOKEN not set in Netlify environment variables' }) };
  }

  let weekLabel = null;
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    weekLabel = body.weekLabel || null;
  } catch (_) {}

  const today = new Date();
  const label = weekLabel || today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dateStr = today.toISOString().split('T')[0];
  const year = String(today.getFullYear());

  try {
    // Read current live rankings
    const rankingsFile  = await ghGet('running-site/_data/rankings.json');
    const rankings = JSON.parse(Buffer.from(rankingsFile.content, 'base64').toString('utf8'));

    // Read current archive
    const archiveFile = await ghGet('running-site/_data/rankings-archive.json');
    const archive = JSON.parse(Buffer.from(archiveFile.content, 'base64').toString('utf8'));

    if (!archive.seasons) archive.seasons = [];

    let season = archive.seasons.find(s => s.year === year);
    if (!season) {
      season = { year, label: `${year} Season`, events: [] };
      archive.seasons.unshift(season);
    }
    if (!season.events) season.events = [];

    const sourceEvents = rankings.events || [];
    const snapshotted = [];

    for (const ev of sourceEvents) {
      if (!ev.name) continue;

      let archiveEvent = season.events.find(e => e.name === ev.name);
      if (!archiveEvent) {
        archiveEvent = { name: ev.name, weeks: [] };
        season.events.push(archiveEvent);
      }
      if (!archiveEvent.weeks) archiveEvent.weeks = [];

      const weekEntry = {
        label,
        date: dateStr,
        rows: (ev.rows || []).map(r => ({
          athleteId:  r.athleteId  || '',
          seasonBest: r.seasonBest || '',
          meet:       r.meet       || '',
          name:       r.name       || '',
          country:    r.country    || '',
        })),
        sections: (ev.sections || []).map(sec => ({
          title:       sec.title       || '',
          description: sec.description || '',
          entries: (sec.entries || []).map(e => ({
            athleteId: e.athleteId || '',
            reason:    e.reason    || '',
            name:      e.name      || '',
            country:   e.country   || '',
          })),
        })),
      };

      archiveEvent.weeks.unshift(weekEntry);
      snapshotted.push(ev.name);
    }

    const newContent = JSON.stringify(archive, null, 2);
    await ghPut(
      'running-site/_data/rankings-archive.json',
      newContent,
      archiveFile.sha,
      `Archive snapshot: ${label}`
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, label, year, events: snapshotted }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

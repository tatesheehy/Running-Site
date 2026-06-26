// Archives current live rankings into rankings-weeks.json and references the IDs in rankings-archive.json
// Requires env var: GITHUB_TOKEN (repo scope)
// Optional env vars: GITHUB_OWNER (default: tatesheehy), GITHUB_REPO (default: Running-Site)

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

function slugifyEvent(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

  const today   = new Date();
  const label   = weekLabel || today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dateStr = today.toISOString().split('T')[0];
  const year    = String(today.getFullYear());

  try {
    // Read all three files in parallel
    const [rankingsFile, archiveFile, weeksFile] = await Promise.all([
      ghGet('running-site/_data/rankings.json'),
      ghGet('running-site/_data/rankings-archive.json'),
      ghGet('running-site/_data/rankings-weeks.json').catch(() => null),
    ]);

    const rankings = JSON.parse(Buffer.from(rankingsFile.content, 'base64').toString('utf8'));
    const archive  = JSON.parse(Buffer.from(archiveFile.content, 'base64').toString('utf8'));
    const weeksRaw = weeksFile
      ? JSON.parse(Buffer.from(weeksFile.content, 'base64').toString('utf8'))
      : { weeks: [] };

    if (!archive.seasons) archive.seasons = [];
    if (!weeksRaw.weeks)  weeksRaw.weeks  = [];

    // Find or create season for this year
    let season = archive.seasons.find(s => s.year === year);
    if (!season) {
      season = { year, label: `${year} Season`, events: [] };
      archive.seasons.unshift(season);
    }
    if (!season.events) season.events = [];

    const sourceEvents = rankings.events || [];
    const snapshotted  = [];
    const newWeekIds   = [];

    for (const ev of sourceEvents) {
      if (!ev.name) continue;

      const weekId = (ev.weekId && ev.weekId.trim()) ? ev.weekId.trim() : `${slugifyEvent(ev.name)}-${dateStr}`;

      // Add or replace the week entry in rankings-weeks.json
      const existingIdx = weeksRaw.weeks.findIndex(w => w.id === weekId);
      const weekEntry = {
        id: weekId,
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

      if (existingIdx >= 0) {
        weeksRaw.weeks[existingIdx] = weekEntry;
      } else {
        weeksRaw.weeks.unshift(weekEntry);
      }

      // Add the week ID to the archive event's weekIds (if not already present)
      let archiveEvent = season.events.find(e => e.name === ev.name);
      if (!archiveEvent) {
        archiveEvent = { name: ev.name, weekIds: [] };
        season.events.push(archiveEvent);
      }
      if (!archiveEvent.weekIds) archiveEvent.weekIds = [];
      if (!archiveEvent.weekIds.includes(weekId)) {
        archiveEvent.weekIds.unshift(weekId);
      }

      snapshotted.push(ev.name);
      newWeekIds.push(weekId);
    }

    // Write both files (weeks first, then archive)
    const weeksContent   = JSON.stringify(weeksRaw, null, 2);
    const archiveContent = JSON.stringify(archive, null, 2);

    await ghPut(
      'running-site/_data/rankings-weeks.json',
      weeksContent,
      weeksFile ? weeksFile.sha : undefined,
      `Archive snapshot (weeks): ${label}`
    );
    await ghPut(
      'running-site/_data/rankings-archive.json',
      archiveContent,
      archiveFile.sha,
      `Archive snapshot (index): ${label}`
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, label, year, events: snapshotted, weekIds: newWeekIds }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

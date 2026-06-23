// Proxy to World Athletics — fetches athlete pages server-side to avoid CORS

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Map WA event names → display names used in our CMS
const EVENT_MAP = {
  '60 metres': '60m',
  '100 metres': '100m',
  '200 metres': '200m',
  '400 metres': '400m',
  '800 metres': '800m',
  '1500 metres': '1500m',
  '1 mile': 'Mile',
  'one mile': 'Mile',
  'mile': 'Mile',
  '2000 metres': '2000m',
  '3000 metres': '3000m',
  '2 miles': '2 Miles',
  '5000 metres': '5000m',
  '10,000 metres': '10000m',
  '10000 metres': '10000m',
  '15,000 metres': '15000m',
  'half marathon': 'Half Marathon',
  'marathon': 'Marathon',
  '3000 metres steeplechase': '3000m SC',
  'steeplechase': '3000m SC',
  '110 metres hurdles': '110m H',
  '400 metres hurdles': '400m H',
};

const EVENT_ORDER = [
  '60m','100m','200m','400m','800m','1500m','Mile','2000m',
  '3000m','3000m SC','2 Miles','5000m','10000m','Half Marathon','Marathon',
];

function normalizeEvent(raw) {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim();
  return EVENT_MAP[lower] || raw;
}

// Walk an arbitrary object looking for an array of performance records.
// WA embeds this in __NEXT_DATA__ but the exact path changes between page versions.
function findBestsArray(obj, depth = 0) {
  if (depth > 10 || obj == null || typeof obj !== 'object') return null;

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      const first = obj[0];
      const hasDiscipline = first.discipline || first.event || first.eventName || first.disciplineCode;
      const hasMark = first.mark || first.performance || first.result || first.time || first.best;
      if (hasDiscipline && hasMark) return obj;
    }
    // Recurse into each element
    for (const item of obj) {
      const found = findBestsArray(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  // Named keys that WA typically uses for best marks
  const priority = [
    'personalBests', 'bests', 'bestResults', 'allTimeBests',
    'performances', 'records', 'marks', 'results', 'data',
  ];
  for (const key of priority) {
    if (key in obj) {
      const found = findBestsArray(obj[key], depth + 1);
      if (found) return found;
    }
  }
  // Generic fallback
  for (const key of Object.keys(obj)) {
    if (!priority.includes(key)) {
      const found = findBestsArray(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function parseMark(raw) {
  if (!raw) return '';
  // Strip trailing i (indoor marker) that WA sometimes appends
  return String(raw).replace(/i$/, '').trim();
}

function isIndoor(b) {
  return b.indoor === true
    || b.type === 'indoor'
    || b.environment === 'indoor'
    || String(b.discipline || b.event || '').toLowerCase().includes('indoor')
    || String(b.venue || b.location || '').toLowerCase().includes('indoor');
}

function normalizeBests(arr) {
  return arr.map(b => ({
    event:  normalizeEvent(b.discipline || b.event || b.eventName || ''),
    time:   parseMark(b.mark || b.performance || b.result || b.time || b.best),
    venue:  b.venue || b.location || b.city || '',
    date:   b.date || b.dateFormatted || '',
    indoor: isIndoor(b),
  })).filter(b => b.event && b.time);
}

function sortBests(bests) {
  return [...bests].sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a.event);
    const bi = EVENT_ORDER.indexOf(b.event);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

// ── Search: find athletes by name ────────────────────────────────────────────

async function searchAthletes(name) {
  const q = encodeURIComponent(name);
  const url = `https://www.worldathletics.org/athletes?query=${q}`;
  let html;
  try {
    html = await fetch(url, { headers: FETCH_HEADERS }).then(r => r.text());
  } catch (e) {
    return { error: `Could not reach World Athletics: ${e.message}` };
  }

  const athletes = [];
  const seen = new Set();

  // Pull athlete links from search-results HTML
  // WA link pattern: /athletes/{country}/{name}-{numericId}
  const linkRe = /href="\/athletes\/([a-z-]+)\/([a-z0-9-]+-\d{5,})"/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const country = m[1];
    const slug    = m[2];
    const waUrl   = `https://www.worldathletics.org/athletes/${country}/${slug}`;
    if (seen.has(waUrl)) continue;
    seen.add(waUrl);

    const idMatch  = slug.match(/-(\d+)$/);
    const namePart = slug.replace(/-\d+$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const countryLabel = country.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    athletes.push({
      name: namePart,
      country: countryLabel,
      url: waUrl,
      id: idMatch ? idMatch[1] : '',
    });

    if (athletes.length >= 8) break;
  }

  // Try __NEXT_DATA__ too — some search pages embed results there
  if (athletes.length === 0) {
    const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        const nd = JSON.parse(ndMatch[1]);
        const list = nd?.props?.pageProps?.athletes
          || nd?.props?.pageProps?.results
          || nd?.props?.pageProps?.data?.athletes;
        if (Array.isArray(list)) {
          for (const a of list.slice(0, 8)) {
            const waUrl = a.url || (a.urlSlug ? `https://www.worldathletics.org/athletes/${a.urlSlug}` : null);
            if (!waUrl) continue;
            athletes.push({
              name: a.name || a.fullName || '',
              country: a.country || a.nationality || '',
              url: waUrl,
              id: a.id || '',
            });
          }
        }
      } catch (_) { /* ignore */ }
    }
  }

  return { athletes };
}

// ── Profile: fetch PRs for a given athlete page URL ──────────────────────────

async function getAthleteProfile(url) {
  let html;
  try {
    html = await fetch(url, { headers: FETCH_HEADERS }).then(r => r.text());
  } catch (e) {
    return { error: `Could not fetch page: ${e.message}` };
  }

  // Try to extract name from page <title>
  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const athleteName = titleM ? titleM[1].split('|')[0].split('-')[0].trim() : '';

  let outdoor = [];
  let indoor  = [];

  // ── Strategy 1: __NEXT_DATA__ deep search ────────────────────────────────
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndMatch) {
    try {
      const nd = JSON.parse(ndMatch[1]);
      const arr = findBestsArray(nd);
      if (arr) {
        const all = normalizeBests(arr);
        outdoor = sortBests(all.filter(b => !b.indoor));
        indoor  = sortBests(all.filter(b =>  b.indoor));
      }
    } catch (_) { /* fall through */ }
  }

  // ── Strategy 2: HTML table parsing ───────────────────────────────────────
  // WA renders a personal-bests table; rows look like:
  // <td>1500 Metres</td><td>3:26.73</td><td>Monaco</td><td>23 AUG 2024</td>
  if (outdoor.length === 0) {
    const timeRe = /^\d*:\d{2}\.\d{2}$|^\d{2}\.\d{2}$/;
    const rowRe  = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let rowM;
    while ((rowM = rowRe.exec(html)) !== null) {
      const cells = [];
      let cM;
      const chunk = rowM[1];
      const cellRx = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      while ((cM = cellRx.exec(chunk)) !== null) {
        cells.push(cM[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length >= 2 && timeRe.test(cells[1])) {
        outdoor.push({
          event: normalizeEvent(cells[0]),
          time:  cells[1],
          venue: cells[2] || '',
          date:  cells[3] || '',
          indoor: false,
        });
      }
    }
    outdoor = sortBests(outdoor);
  }

  return { name: athleteName, outdoor, indoor };
}

// ── Netlify handler ───────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const { action, name, url } = event.queryStringParameters || {};

  try {
    if (action === 'search' || (!url && name)) {
      if (!name) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'name required' }) };
      const result = await searchAthletes(name);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(result) };
    }

    if (url) {
      if (!url.includes('worldathletics.org')) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'URL must be from worldathletics.org' }) };
      }
      const result = await getAthleteProfile(url);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(result) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide ?action=search&name=... or ?url=...' }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};

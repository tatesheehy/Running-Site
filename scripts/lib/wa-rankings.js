'use strict';
// Harvest World Athletics ranking lists via the AppSync GraphQL API.
//
// getRandomWorldRankingDiscipline returns a random sample of ranking disciplines
// (e.g. "Men's 1500m", "Women's 800m"), each with an inline `rankings` array that
// is gender-correct and complete up to `rankingLimit`. We poll it until the
// requested disciplines have been seen, then return their top-N athletes.
//
// This is the only reliable per-gender source: getWorldRankings(eventGroup) can't
// disambiguate gender for shared slugs like "1500m" (defaults to women).

const https = require('https');

const GQL_ENDPOINTS = [
  ['https://ak33a7mldndxdfb6sznwcinjxy.appsync-api.eu-west-1.amazonaws.com/graphql', 'da2-tul3z5puffbebn4pptbgqj253i'],
  ['https://7hck43pzvfgsbplwx2gxzplk6u.appsync-api.ap-east-1.amazonaws.com/graphql', 'da2-7nbysvfryzhurp4tciuutbupve'],
];

const DISCIPLINE_QUERY = `query GetRandomWorldRankingDiscipline($limit: Int, $rankingLimit: Int) {
  getRandomWorldRankingDiscipline(limit: $limit, rankingLimit: $rankingLimit) {
    name
    gender
    urlSlug
    rankings {
      place
      competitorName
      competitorUrlSlug
      competitorCountryUrlSlug
      countryCode
      competitorBirthDate
    }
  }
}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function gqlCall(variables, attempt = 0) {
  const [endpoint, key] = GQL_ENDPOINTS[attempt % GQL_ENDPOINTS.length];
  const u = new URL(endpoint);
  const body = JSON.stringify({ variables, query: DISCIPLINE_QUERY });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Origin': 'https://worldathletics.org',
        'Referer': 'https://worldathletics.org/',
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (json.errors) return reject(new Error(json.errors[0]?.message || 'GraphQL error'));
          resolve((json.data?.getRandomWorldRankingDiscipline || []).filter(Boolean));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Normalize a discipline label for matching: "Men's 1500m" → "men 1500m"
function normLabel(s) {
  return String(s || '').toLowerCase().replace(/['']/g, '').replace(/\s+/g, ' ').trim();
}

// Harvest top-`top` athletes for each requested discipline label.
// `wantedLabels` e.g. ["Men's 1500m", "Men's 800m"].
// Returns Map<label, [{ place, name, waUrl, countryCode, dob }]>.
async function harvestRankings(wantedLabels, top = 30, { maxAttempts = 12, onProgress } = {}) {
  const wanted = new Set(wantedLabels.map(normLabel));
  const found = new Map(); // normLabel → discipline object

  for (let attempt = 0; attempt < maxAttempts && found.size < wanted.size; attempt++) {
    let disciplines;
    try {
      disciplines = await gqlCall({ limit: 80, rankingLimit: top }, attempt);
    } catch (err) {
      if (onProgress) onProgress(`  [attempt ${attempt + 1}: ${err.message}, retrying]`);
      await sleep(1500 * (attempt + 1));
      continue;
    }
    for (const d of disciplines) {
      const key = normLabel(d.name);
      if (wanted.has(key) && !found.has(key)) {
        found.set(key, d);
        if (onProgress) onProgress(`  ✓ found ${d.name} (${d.rankings.length} ranked)`);
      }
    }
    if (found.size < wanted.size) await sleep(400);
  }

  const out = new Map();
  for (const label of wantedLabels) {
    const d = found.get(normLabel(label));
    if (!d) { out.set(label, null); continue; }
    const rows = (d.rankings || []).slice(0, top).map(r => ({
      place: r.place,
      name:  r.competitorName,
      waUrl: `https://worldathletics.org/athletes/${r.competitorCountryUrlSlug}/${r.competitorUrlSlug}`,
      countryCode: r.countryCode,
      dob:   r.competitorBirthDate,
    }));
    out.set(label, rows);
  }
  return out;
}

module.exports = { harvestRankings, normLabel };

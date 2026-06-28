// ============================================================
//  WORLD MAP — dot map of athlete countries
//  Equirectangular projection, 1000×500 viewBox
//  x = (lon + 180) * 1000/360
//  y = (90  - lat) * 500/180
// ============================================================

// Country centroids — lat/lon
const COUNTRY_CENTROIDS = {
  'United States':  [38,  -97],
  'Kenya':          [ 0,   38],
  'France':         [46,    2],
  'Norway':         [62,   10],
  'Netherlands':    [52,    5],
  'Ireland':        [53,   -8],
  'Australia':      [-25, 134],
  'England':        [52,   -1],
  'Portugal':       [39,   -8],
  'Scotland':       [57,   -4],
  'Great Britain':  [54,   -2],
  'Morocco':        [32,   -5],
  'Spain':          [40,   -4],
  'New Zealand':    [-41, 174],
  'Botswana':       [-22,  24],
  'Ethiopia':       [ 9,   40],
  'Jamaica':        [18,  -77],
  'Canada':         [56,  -96],
  'Germany':        [51,   10],
  'Japan':          [36,  138],
  'Belgium':        [50,    4],
  'Uganda':         [ 1,   32],
  'Tanzania':       [-6,   35],
  'South Africa':   [-30,  25],
};

function lonLatToXY(lon, lat, W, H) {
  return [
    ((lon + 180) / 360) * W,
    ((90 - lat)  / 180) * H,
  ];
}

// Simplified continent land paths (equirectangular, viewBox 1000×500)
const LAND_PATHS = [
  // North America
  'M70,55 L100,45 L355,45 L350,120 L280,182 L260,208 L230,225 L200,230 L170,215 L175,190 L160,160 L150,115 L35,100 Z',
  // Greenland
  'M355,38 L455,18 L478,40 L445,75 L385,85 Z',
  // South America
  'M230,225 L260,208 L295,240 L315,222 L405,267 L342,347 L310,405 L292,348 L255,262 Z',
  // Europe (incl Scandinavia)
  'M478,152 L486,130 L490,115 L500,105 L522,95 L528,82 L545,55 L558,58 L595,58 L594,120 L572,150 L547,147 L520,155 L490,155 Z',
  // British Isles (separate)
  'M470,100 L478,88 L485,95 L480,115 L470,120 Z',
  // Africa
  'M490,155 L532,150 L600,170 L648,220 L618,265 L558,345 L535,332 L460,262 L455,238 L490,155 Z',
  // Middle East stub
  'M594,120 L648,165 L670,158 L680,175 L660,188 L620,170 L600,170 L572,150 Z',
  // Asia (main body)
  'M558,58 L595,58 L672,58 L760,82 L860,62 L965,88 L962,152 L905,162 L880,155 L856,155 L808,245 L727,230 L688,175 L648,165 L620,170 L594,120 L572,150 L556,100 Z',
  // Indian subcontinent
  'M680,175 L727,230 L725,260 L700,250 L660,188 Z',
  // SE Asia peninsula
  'M808,245 L782,285 L762,280 L740,260 L727,230 Z',
  // Japan (approx)
  'M880,130 L892,125 L900,145 L882,155 Z',
  // Australia
  'M820,313 L865,285 L920,302 L922,360 L905,362 L822,347 Z',
  // New Zealand
  'M975,368 L983,355 L990,370 L978,382 Z',
  // Antarctica
  'M0,478 L1000,478 L1000,500 L0,500 Z',
];

function buildWorldMap(athletes) {
  // Group athletes by country
  const byCountry = {};
  athletes.forEach(a => {
    const c = a.country || '';
    if (!c) return;
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push(a);
  });

  const W = 1000, H = 500;

  // Build dots
  const dots = Object.entries(byCountry).map(([country, list]) => {
    const centroid = COUNTRY_CENTROIDS[country];
    if (!centroid) return '';
    const [x, y] = lonLatToXY(centroid[1], centroid[0], W, H);
    const count   = list.length;
    const r       = Math.min(6 + count * 3, 22);
    const names   = list.map(a => a.name).join(', ');

    return `
      <g class="map-dot-group" data-country="${country}" data-athletes="${names}"
         onclick="mapFilterCountry('${country}')" style="cursor:pointer">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r + 6}" fill="rgba(232,80,10,0.15)" class="map-dot-pulse"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#e8500a" stroke="#fff" stroke-width="1.5"/>
        ${count > 1 ? `<text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" text-anchor="middle"
          font-size="11" font-weight="700" fill="#fff" pointer-events="none">${count}</text>` : ''}
      </g>`;
  }).join('');

  // Tooltip div
  const tooltipHtml = `
    <div id="map-tooltip" style="
      position:absolute;background:#1a1a1a;border:1px solid #333;border-radius:8px;
      padding:10px 14px;pointer-events:none;opacity:0;transition:opacity 0.15s;
      font-size:13px;color:#fff;max-width:220px;line-height:1.4;z-index:10;
    "></div>`;

  return `
    <div class="map-wrap" style="position:relative;width:100%;max-width:900px;margin:0 auto;">
      ${tooltipHtml}
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
           style="width:100%;height:auto;display:block;border-radius:12px;"
           id="world-map-svg">
        <!-- Ocean -->
        <rect width="${W}" height="${H}" fill="#0d1b2a" rx="0"/>
        <!-- Graticule (subtle grid) -->
        <g stroke="#ffffff" stroke-width="0.3" opacity="0.06">
          ${[-60,-30,0,30,60].map(lat => {
            const y = ((90 - lat) / 180 * H).toFixed(1);
            return `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
          }).join('')}
          ${[-120,-60,0,60,120].map(lon => {
            const x = ((lon + 180) / 360 * W).toFixed(1);
            return `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
          }).join('')}
        </g>
        <!-- Land -->
        <g fill="#1e3a5f" stroke="#2a4f7a" stroke-width="0.8">
          ${LAND_PATHS.map(d => `<path d="${d}"/>`).join('\n          ')}
        </g>
        <!-- Equator -->
        <line x1="0" y1="250" x2="${W}" y2="250" stroke="#ffffff" stroke-width="0.5" opacity="0.15" stroke-dasharray="4 4"/>
        <!-- Dots -->
        ${dots}
      </svg>
      <div id="map-filter-label" style="
        text-align:center;margin-top:12px;font-size:13px;color:#888;min-height:20px;
      "></div>
    </div>
  `;
}

function initMapInteractions(athletes) {
  const svg     = document.getElementById('world-map-svg');
  const tooltip = document.getElementById('map-tooltip');
  if (!svg || !tooltip) return;

  svg.querySelectorAll('.map-dot-group').forEach(g => {
    g.addEventListener('mouseenter', e => {
      const country  = g.dataset.country;
      const names    = g.dataset.athletes;
      const rect     = svg.getBoundingClientRect();
      const cx       = parseFloat(g.querySelector('circle').getAttribute('cx'));
      const cy       = parseFloat(g.querySelector('circle').getAttribute('cy'));
      const scaleX   = rect.width  / 1000;
      const scaleY   = rect.height / 500;
      const left     = cx * scaleX + rect.left - document.querySelector('.map-wrap').getBoundingClientRect().left;
      const top      = cy * scaleY;

      tooltip.innerHTML = `<strong>${country}</strong><br><span style="color:#aaa">${names}</span>`;
      tooltip.style.left   = (left + 12) + 'px';
      tooltip.style.top    = (top - 20) + 'px';
      tooltip.style.opacity = '1';
    });
    g.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });
  });
}

window.mapFilterCountry = function(country) {
  const label = document.getElementById('map-filter-label');
  const grid  = document.getElementById('ath-page-grid');
  if (!grid) return;

  // Toggle off if same country clicked again
  if (grid.dataset.mapFilter === country) {
    delete grid.dataset.mapFilter;
    if (label) label.textContent = '';
    window._mapRestoreGrid && window._mapRestoreGrid();
    return;
  }

  grid.dataset.mapFilter = country;
  const filtered = Object.values(ATHLETES).filter(a => a.country === country || a.country === country);
  if (label) label.innerHTML = `Showing athletes from <strong>${country}</strong> — <a href="#" onclick="mapFilterCountry('${country}');return false" style="color:var(--accent)">Clear</a>`;

  // Re-render grid with filtered athletes
  if (window._mapRenderGrid) window._mapRenderGrid(filtered);
};

// ============================================================
//  WORLD MAP — Leaflet interactive map of athlete countries
// ============================================================

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
  'Eritrea':        [15,   39],
  'Bahrain':        [26,   50],
  'Qatar':          [25,   51],
  'Italy':          [42,   12],
  'Sweden':         [62,   15],
  'Finland':        [64,   26],
  'Poland':         [52,   20],
  'Switzerland':    [47,    8],
  'Austria':        [47,   14],
};

let _leafletMap = null;
let _leafletMarkers = [];
let _activeCountry = null;

function buildWorldMap(athletes) {
  _activeCountry = null;
  return `<div id="athlete-leaflet-map" style="width:100%;height:480px;border-radius:12px;overflow:hidden;"></div>
          <div id="map-filter-label" style="text-align:center;margin-top:12px;font-size:13px;color:#888;min-height:20px;"></div>`;
}

function initMapInteractions(athletes) {
  // Destroy previous map instance if it exists
  if (_leafletMap) {
    _leafletMap.remove();
    _leafletMap = null;
    _leafletMarkers = [];
  }

  const el = document.getElementById('athlete-leaflet-map');
  if (!el || typeof L === 'undefined') return;

  // Group athletes by country
  const byCountry = {};
  athletes.forEach(a => {
    const c = a.country || '';
    if (!c) return;
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push(a);
  });

  // Find bounding box of all athlete countries
  const coords = Object.keys(byCountry)
    .map(c => COUNTRY_CENTROIDS[c])
    .filter(Boolean);

  const map = L.map(el, {
    zoomControl: true,
    scrollWheelZoom: true,
    attributionControl: false,
  });

  _leafletMap = map;

  // Dark Carto tiles — clean look matching the site's dark theme
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 12,
    minZoom: 2,
  }).addTo(map);

  // Attribution (small, bottom-right)
  L.control.attribution({ position: 'bottomright', prefix: false })
    .addAttribution('© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
    .addTo(map);

  // Add circle markers for each country
  Object.entries(byCountry).forEach(([country, list]) => {
    const centroid = COUNTRY_CENTROIDS[country];
    if (!centroid) return;

    const count = list.length;
    const r = Math.min(10 + count * 4, 36);

    const marker = L.circleMarker(centroid, {
      radius: r,
      fillColor: '#e8500a',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.88,
    }).addTo(map);

    const nameList = list.map(a => `<span style="display:block;padding:2px 0">${a.name}</span>`).join('');
    const popupHtml = `
      <div style="font-family:var(--font-body,sans-serif);min-width:140px">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#fff">${country}</div>
        <div style="font-size:12px;color:#ccc">${nameList}</div>
        <div style="margin-top:8px">
          <button onclick="mapFilterCountry('${country}')"
            style="background:#e8500a;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.04em;text-transform:uppercase">
            View athletes →
          </button>
        </div>
      </div>`;

    marker.bindPopup(popupHtml, {
      className: 'map-popup',
      maxWidth: 220,
    });

    if (count > 1) {
      marker.bindTooltip(`<strong>${count}</strong>`, {
        permanent: true,
        direction: 'center',
        className: 'map-count-label',
      }).addTo(map);
    }

    marker.on('click', () => marker.openPopup());

    _leafletMarkers.push({ marker, country, list });
  });

  // Show a world overview centred to include US + Europe + Africa + Oceania
  map.setView([25, -30], 2);
}

window.mapFilterCountry = function(country) {
  const label = document.getElementById('map-filter-label');
  const grid  = document.getElementById('ath-page-grid');

  // Close any open popups
  if (_leafletMap) _leafletMap.closePopup();

  if (!grid) return;

  // Toggle off if same country clicked again
  if (_activeCountry === country) {
    _activeCountry = null;
    if (label) label.textContent = '';
    _leafletMarkers.forEach(({ marker }) => {
      marker.setStyle({ fillColor: '#e8500a', fillOpacity: 0.88 });
    });
    window._mapRestoreGrid && window._mapRestoreGrid();
    return;
  }

  _activeCountry = country;

  // Dim other markers
  _leafletMarkers.forEach(({ marker, country: c }) => {
    marker.setStyle(c === country
      ? { fillColor: '#e8500a', fillOpacity: 1 }
      : { fillColor: '#555', fillOpacity: 0.4 }
    );
  });

  const filtered = Object.values(ATHLETES).filter(a => a.country === country);
  if (label) label.innerHTML = `Showing athletes from <strong>${country}</strong> &nbsp;·&nbsp; <a href="#" onclick="mapFilterCountry('${country}');return false" style="color:var(--accent)">Clear</a>`;

  window._mapRenderGrid && window._mapRenderGrid(filtered);
};

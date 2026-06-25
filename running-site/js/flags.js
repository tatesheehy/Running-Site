/* ============================================================
   FLAGS.JS — Blocky SVG flag library
   Usage in CMS: enter a 2-letter ISO code (e.g. NO, US, KE).
   Use SCT for Scotland, WAL for Wales, NIR for N. Ireland.
   Unknown codes fall back to displaying the text as-is.
   ============================================================ */

(function () {
  function f(inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20">${inner}</svg>`;
  }

  window.FLAGS = {

    /* ── Scandinavia ─────────────────────────────────────── */
    NO: f(`<rect width="30" height="20" fill="#EF2B2D"/>
      <rect x="8" width="5" height="20" fill="#fff"/>
      <rect y="7.5" width="30" height="5" fill="#fff"/>
      <rect x="9" width="3" height="20" fill="#002868"/>
      <rect y="8.5" width="30" height="3" fill="#002868"/>`),

    SE: f(`<rect width="30" height="20" fill="#006AA7"/>
      <rect x="8" width="5" height="20" fill="#FECC02"/>
      <rect y="7.5" width="30" height="5" fill="#FECC02"/>`),

    DK: f(`<rect width="30" height="20" fill="#C60C30"/>
      <rect x="8" width="5" height="20" fill="#fff"/>
      <rect y="7.5" width="30" height="5" fill="#fff"/>`),

    FI: f(`<rect width="30" height="20" fill="#fff"/>
      <rect x="8" width="5" height="20" fill="#003580"/>
      <rect y="7.5" width="30" height="5" fill="#003580"/>`),

    IS: f(`<rect width="30" height="20" fill="#003897"/>
      <rect x="8" width="5" height="20" fill="#fff"/>
      <rect y="7.5" width="30" height="5" fill="#fff"/>
      <rect x="9" width="3" height="20" fill="#D72828"/>
      <rect y="8.5" width="30" height="3" fill="#D72828"/>`),

    /* ── British Isles ───────────────────────────────────── */
    GB: f(`<rect width="30" height="20" fill="#012169"/>
      <polygon points="0,0 4,0 30,16.7 30,20 26,20 0,3.3" fill="#fff"/>
      <polygon points="26,0 30,0 30,3.3 4,20 0,20 0,16.7" fill="#fff"/>
      <polygon points="0,0 2,0 30,18.3 30,20 28,20 0,1.7" fill="#C8102E"/>
      <polygon points="28,0 30,0 30,1.7 2,20 0,20 0,18.3" fill="#C8102E"/>
      <rect x="12" width="6" height="20" fill="#fff"/>
      <rect y="8" width="30" height="4" fill="#fff"/>
      <rect x="13.5" width="3" height="20" fill="#C8102E"/>
      <rect y="9" width="30" height="2" fill="#C8102E"/>`),

    SCT: f(`<rect width="30" height="20" fill="#003DA5"/>
      <polygon points="0,0 4,0 30,17 30,20 26,20 0,3" fill="#fff"/>
      <polygon points="26,0 30,0 30,3 4,20 0,20 0,17" fill="#fff"/>`),

    ENG: f(`<rect width="30" height="20" fill="#fff"/>
      <rect x="13.5" width="3" height="20" fill="#C8102E"/>
      <rect y="8.5" width="30" height="3" fill="#C8102E"/>`),

    NIR: f(`<rect width="30" height="20" fill="#fff"/>
      <polygon points="0,0 2,0 30,18.3 30,20 28,20 0,1.7" fill="#C8102E"/>
      <polygon points="28,0 30,0 30,1.7 2,20 0,20 0,18.3" fill="#C8102E"/>
      <rect x="13.5" width="3" height="20" fill="#C8102E"/>
      <rect y="8.5" width="30" height="3" fill="#C8102E"/>
      <polygon points="12,7 15,4 18,7 21,10 18,13 15,16 12,13 9,10" fill="none" stroke="#C8102E" stroke-width="1.5"/>
      <polygon points="13.5,10 15,8 16.5,10 15,12" fill="#C8102E"/>`),

    WAL: f(`<rect width="30" height="20" fill="#fff"/>
      <rect y="10" width="30" height="10" fill="#00AB39"/>
      <ellipse cx="15" cy="11" rx="4" ry="6" fill="#C8102E"/>
      <ellipse cx="15" cy="9" rx="3" ry="5" fill="#C8102E"/>
      <rect x="12" y="4" width="6" height="4" fill="#FFD700"/>
      <rect x="13" y="2" width="4" height="3" fill="#FFD700"/>`),

    IE: f(`<rect width="30" height="20" fill="#FF883E"/>
      <rect width="20" height="20" fill="#fff"/>
      <rect width="10" height="20" fill="#169B62"/>`),

    /* ── Western Europe ──────────────────────────────────── */
    FR: f(`<rect width="30" height="20" fill="#ED2939"/>
      <rect width="20" height="20" fill="#fff"/>
      <rect width="10" height="20" fill="#002395"/>`),

    DE: f(`<rect width="30" height="20" fill="#FFCE00"/>
      <rect width="30" height="13.33" fill="#DD0000"/>
      <rect width="30" height="6.67" fill="#000"/>`),

    BE: f(`<rect width="30" height="20" fill="#FAE042"/>
      <rect width="10" height="20" fill="#000"/>
      <rect x="20" width="10" height="20" fill="#EF3340"/>`),

    NL: f(`<rect width="30" height="20" fill="#21468B"/>
      <rect width="30" height="13.33" fill="#fff"/>
      <rect width="30" height="6.67" fill="#AE1C28"/>`),

    CH: f(`<rect width="30" height="20" fill="#FF0000"/>
      <rect x="11.5" y="4" width="7" height="12" fill="#fff"/>
      <rect x="7.5" y="7.5" width="15" height="5" fill="#fff"/>`),

    AT: f(`<rect width="30" height="20" fill="#ED2939"/>
      <rect y="6.67" width="30" height="6.66" fill="#fff"/>`),

    PT: f(`<rect width="30" height="20" fill="#FF0000"/>
      <rect width="12" height="20" fill="#006600"/>
      <circle cx="12" cy="10" r="4" fill="#FFD700"/>
      <circle cx="12" cy="10" r="2.5" fill="#003DA5"/>`),

    ES: f(`<rect width="30" height="20" fill="#AA151B"/>
      <rect y="5" width="30" height="10" fill="#F1BF00"/>`),

    IT: f(`<rect width="30" height="20" fill="#CE2B37"/>
      <rect width="20" height="20" fill="#fff"/>
      <rect width="10" height="20" fill="#009246"/>`),

    PL: f(`<rect width="30" height="20" fill="#DC143C"/>
      <rect width="30" height="10" fill="#fff"/>`),

    CZ: f(`<rect width="30" height="20" fill="#D7141A"/>
      <rect width="30" height="10" fill="#fff"/>
      <polygon points="0,0 13,10 0,20" fill="#11457E"/>`),

    HU: f(`<rect width="30" height="20" fill="#477050"/>
      <rect width="30" height="13.33" fill="#fff"/>
      <rect width="30" height="6.67" fill="#CE2939"/>`),

    GR: f(`<rect width="30" height="20" fill="#0D5EAF"/>
      <rect y="2.22" width="30" height="2.22" fill="#fff"/>
      <rect y="6.67" width="30" height="2.22" fill="#fff"/>
      <rect y="11.11" width="30" height="2.22" fill="#fff"/>
      <rect y="15.56" width="30" height="2.22" fill="#fff"/>
      <rect width="11" height="11" fill="#0D5EAF"/>
      <rect x="4" width="3" height="11" fill="#fff"/>
      <rect y="4" width="11" height="3" fill="#fff"/>`),

    RU: f(`<rect width="30" height="20" fill="#0039A6"/>
      <rect width="30" height="13.33" fill="#fff"/>
      <rect y="13.33" width="30" height="6.67" fill="#D52B1E"/>`),

    UA: f(`<rect width="30" height="20" fill="#FFD700"/>
      <rect width="30" height="10" fill="#005BBB"/>`),

    EE: f(`<rect width="30" height="20" fill="#fff"/>
      <rect width="30" height="13.33" fill="#000"/>
      <rect width="30" height="6.67" fill="#0072CE"/>`),

    LV: f(`<rect width="30" height="20" fill="#9E3039"/>
      <rect y="6.67" width="30" height="6.66" fill="#fff"/>`),

    LT: f(`<rect width="30" height="20" fill="#006A44"/>
      <rect width="30" height="13.33" fill="#C1272D"/>
      <rect width="30" height="6.67" fill="#FDB913"/>`),

    /* ── Americas ────────────────────────────────────────── */
    US: f(`<rect width="30" height="20" fill="#B22234"/>
      <rect y="1.54" width="30" height="1.54" fill="#fff"/>
      <rect y="4.62" width="30" height="1.54" fill="#fff"/>
      <rect y="7.69" width="30" height="1.54" fill="#fff"/>
      <rect y="10.77" width="30" height="1.54" fill="#fff"/>
      <rect y="13.85" width="30" height="1.54" fill="#fff"/>
      <rect y="16.92" width="30" height="1.54" fill="#fff"/>
      <rect width="12" height="10.77" fill="#3C3B6E"/>`),

    CA: f(`<rect width="30" height="20" fill="#fff"/>
      <rect width="7.5" height="20" fill="#FF0000"/>
      <rect x="22.5" width="7.5" height="20" fill="#FF0000"/>
      <polygon points="15,4.5 16,8.5 20,8.5 17.5,10.5 19,14 15.5,12 15,16.5 14.5,12 11,14 12.5,10.5 10,8.5 14,8.5" fill="#FF0000"/>`),

    JM: f(`<rect width="30" height="20" fill="#FED100"/>
      <polygon points="0,0 0,20 11,10" fill="#000"/>
      <polygon points="30,0 30,20 19,10" fill="#000"/>
      <polygon points="3,0 27,0 19,10 11,10" fill="#009B3A"/>
      <polygon points="3,20 27,20 19,10 11,10" fill="#009B3A"/>`),

    TT: f(`<rect width="30" height="20" fill="#CE1126"/>
      <polygon points="6,0 14,0 24,20 16,20" fill="#000"/>
      <polygon points="4,0 6,0 16,20 14,20" fill="#fff"/>
      <polygon points="14,0 16,0 26,20 24,20" fill="#fff"/>`),

    BR: f(`<rect width="30" height="20" fill="#009C3B"/>
      <polygon points="15,1.5 28,10 15,18.5 2,10" fill="#FEDF00"/>
      <circle cx="15" cy="10" r="4.5" fill="#002776"/>`),

    CU: f(`<rect width="30" height="20" fill="#002A8F"/>
      <rect y="4" width="30" height="4" fill="#fff"/>
      <rect y="12" width="30" height="4" fill="#fff"/>
      <rect width="30" height="4" fill="#002A8F"/>
      <rect y="8" width="30" height="4" fill="#002A8F"/>
      <rect y="16" width="30" height="4" fill="#002A8F"/>
      <polygon points="0,0 12,10 0,20" fill="#CC0001"/>`),

    CO: f(`<rect width="30" height="20" fill="#003893"/>
      <rect width="30" height="13.33" fill="#CE1126"/>
      <rect width="30" height="6.67" fill="#FCD116"/>`),

    /* ── Africa ──────────────────────────────────────────── */
    BW: f(`<rect width="30" height="20" fill="#75AADB"/>
      <rect y="7.5" width="30" height="5" fill="#fff"/>
      <rect y="8.5" width="30" height="3" fill="#000"/>`),

    ER: f(`<rect width="30" height="20" fill="#4189DD"/>
      <rect y="10" width="30" height="10" fill="#4FBF38"/>
      <polygon points="0,0 30,10 0,20" fill="#EA0437"/>
      <circle cx="7" cy="10" r="3" fill="#FFDA44"/>
      <polygon points="7,7.5 7.6,9.3 9.5,9.3 8,10.5 8.6,12.3 7,11.2 5.4,12.3 6,10.5 4.5,9.3 6.4,9.3" fill="#EA0437"/>`),

    SO: f(`<rect width="30" height="20" fill="#4189DD"/>
      <polygon points="15,6.5 16.2,10.1 20,10.1 17,12.3 18.2,16 15,13.8 11.8,16 13,12.3 10,10.1 13.8,10.1" fill="#fff"/>`),

    DJ: f(`<rect width="30" height="20" fill="#12AD2B"/>
      <rect width="30" height="10" fill="#6AB2E7"/>
      <polygon points="0,0 0,20 13,10" fill="#fff"/>
      <polygon points="3,10 8,7 8,13" fill="#D7141A"/>`),
    KE: f(`<rect width="30" height="20" fill="#000"/>
      <rect y="6.67" width="30" height="6.66" fill="#BB0000"/>
      <rect y="13.33" width="30" height="6.67" fill="#006600"/>
      <rect y="6" width="30" height="1" fill="#fff"/>
      <rect y="13" width="30" height="1" fill="#fff"/>
      <ellipse cx="15" cy="10" rx="3" ry="5.5" fill="#fff"/>
      <ellipse cx="15" cy="10" rx="1.5" ry="4.5" fill="#BB0000"/>
      <rect x="14.3" y="4.5" width="1.4" height="11" fill="#000"/>`),

    ET: f(`<rect width="30" height="20" fill="#EF2118"/>
      <rect y="6.67" width="30" height="6.66" fill="#FCDD09"/>
      <rect width="30" height="6.67" fill="#078930"/>
      <circle cx="15" cy="10" r="4.5" fill="#0F47AF"/>
      <polygon points="15,6.5 15.8,9 18.3,9 16.3,10.5 17.1,13 15,11.5 12.9,13 13.7,10.5 11.7,9 14.2,9" fill="#FCDD09"/>`),

    MA: f(`<rect width="30" height="20" fill="#C1272D"/>
      <polygon points="15,5.5 15.9,8.3 18.9,8.3 16.5,10.1 17.4,12.9 15,11.1 12.6,12.9 13.5,10.1 11.1,8.3 14.1,8.3" fill="none" stroke="#006233" stroke-width="1.3"/>`),

    NG: f(`<rect width="30" height="20" fill="#008751"/>
      <rect x="10" width="10" height="20" fill="#fff"/>`),

    GH: f(`<rect width="30" height="20" fill="#006B3F"/>
      <rect y="6.67" width="30" height="6.66" fill="#FCD116"/>
      <rect width="30" height="6.67" fill="#CE1126"/>
      <polygon points="15,7.5 16.2,11 20,11 17,13.2 18.2,16.8 15,14.6 11.8,16.8 13,13.2 10,11 13.8,11" fill="#000"/>`),

    TZ: f(`<polygon points="0,0 30,0 0,20" fill="#1EB53A"/>
      <polygon points="30,0 30,20 0,20" fill="#00A3DD"/>
      <polygon points="0,16 30,0 30,4 0,20" fill="#FCD116"/>
      <polygon points="0,18 30,1.5 30,3 0,20" fill="#000"/>`),

    UG: f(`<rect width="30" height="20" fill="#FCDC04"/>
      <rect width="30" height="16.67" fill="#DE3108"/>
      <rect width="30" height="13.33" fill="#FCDC04"/>
      <rect width="30" height="10" fill="#DE3108"/>
      <rect width="30" height="6.67" fill="#000"/>
      <rect width="30" height="3.33" fill="#FCDC04"/>
      <circle cx="15" cy="10" r="3.8" fill="#fff"/>`),

    ZA: f(`<rect width="30" height="20" fill="#007A4D"/>
      <rect width="30" height="6.5" fill="#DE3831"/>
      <rect y="13.5" width="30" height="6.5" fill="#0032A0"/>
      <rect y="6" width="30" height="1" fill="#fff"/>
      <rect y="13" width="30" height="1" fill="#fff"/>
      <rect y="7" width="30" height="6" fill="#007A4D"/>
      <polygon points="0,0 0,20 11,10" fill="#FFB612"/>
      <polygon points="0,0 0,20 9.5,10" fill="#000"/>`),

    SN: f(`<rect width="30" height="20" fill="#FDEF42"/>
      <rect width="20" height="20" fill="#00853F"/>
      <rect width="10" height="20" fill="#E31B23"/>
      <polygon points="15,7.5 15.8,10 18.3,10 16.3,11.5 17.1,14 15,12.5 12.9,14 13.7,11.5 11.7,10 14.2,10" fill="#00853F"/>`),

    CM: f(`<rect width="30" height="20" fill="#007A5E"/>
      <rect width="20" height="20" fill="#CE1126"/>
      <rect width="10" height="20" fill="#007A5E"/>
      <rect x="10" width="10" height="20" fill="#CE1126"/>
      <rect x="20" width="10" height="20" fill="#FCD116"/>
      <polygon points="15,8 15.6,9.8 17.5,9.8 16,11 16.6,12.8 15,11.8 13.4,12.8 14,11 12.5,9.8 14.4,9.8" fill="#FCD116"/>`),

    EG: f(`<rect width="30" height="20" fill="#000"/>
      <rect y="6.67" width="30" height="6.66" fill="#fff"/>
      <rect y="13.33" width="30" height="6.67" fill="#CE1126"/>`),

    DZ: f(`<rect width="30" height="20" fill="#fff"/>
      <rect width="15" height="20" fill="#006233"/>
      <circle cx="16" cy="10" r="5" fill="#D21034"/>
      <circle cx="17.5" cy="10" r="5" fill="#fff"/>
      <polygon points="15,6 15.6,8.8 18.5,7.7 16.5,10 18.5,12.3 15.6,11.2 15,14 14.4,11.2 11.5,12.3 13.5,10 11.5,7.7 14.4,8.8" fill="#D21034"/>`),

    /* ── Asia / Middle East ──────────────────────────────── */
    JP: f(`<rect width="30" height="20" fill="#fff"/>
      <circle cx="15" cy="10" r="6" fill="#BC002D"/>`),

    KR: f(`<rect width="30" height="20" fill="#fff"/>
      <path d="M15,5 a5,5 0 0,1 0,10 a2.5,2.5 0 0,0 0,-5 a2.5,2.5 0 0,1 0,-5Z" fill="#003478"/>
      <path d="M15,15 a5,5 0 0,1 0,-10 a2.5,2.5 0 0,0 0,5 a2.5,2.5 0 0,1 0,5Z" fill="#CD2E3A"/>`),

    CN: f(`<rect width="30" height="20" fill="#DE2910"/>
      <polygon points="5,2.5 5.9,5.2 8.7,5.2 6.4,6.9 7.3,9.5 5,7.8 2.7,9.5 3.6,6.9 1.3,5.2 4.1,5.2" fill="#FFDE00"/>
      <polygon points="10,1 10.7,3 12.7,3 11.1,4.2 11.7,6.2 10,5 8.3,6.2 8.9,4.2 7.3,3 9.3,3" fill="#FFDE00"/>
      <polygon points="12,4 12.7,6 14.7,6 13.1,7.2 13.7,9.2 12,8 10.3,9.2 10.9,7.2 9.3,6 11.3,6" fill="#FFDE00"/>
      <polygon points="12,8 12.7,10 14.7,10 13.1,11.2 13.7,13.2 12,12 10.3,13.2 10.9,11.2 9.3,10 11.3,10" fill="#FFDE00"/>
      <polygon points="10,11 10.7,13 12.7,13 11.1,14.2 11.7,16.2 10,15 8.3,16.2 8.9,14.2 7.3,13 9.3,13" fill="#FFDE00"/>`),

    IN: f(`<rect width="30" height="20" fill="#FF9933"/>
      <rect y="6.67" width="30" height="6.66" fill="#fff"/>
      <rect y="13.33" width="30" height="6.67" fill="#138808"/>
      <circle cx="15" cy="10" r="3" fill="none" stroke="#000080" stroke-width="0.8"/>
      <circle cx="15" cy="10" r="0.6" fill="#000080"/>`),

    BH: f(`<rect width="30" height="20" fill="#CE1126"/>
      <rect width="10" height="20" fill="#fff"/>
      <polygon points="10,0 14,2 10,4 14,6 10,8 14,10 10,12 14,14 10,16 14,18 10,20" fill="#CE1126"/>`),

    QA: f(`<rect width="30" height="20" fill="#8D1B3D"/>
      <rect width="10" height="20" fill="#fff"/>
      <polygon points="10,0 13,1.25 10,2.5 13,3.75 10,5 13,6.25 10,7.5 13,8.75 10,10 13,11.25 10,12.5 13,13.75 10,15 13,16.25 10,17.5 13,18.75 10,20" fill="#8D1B3D"/>`),

    /* ── Oceania ─────────────────────────────────────────── */
    AU: f(`<rect width="30" height="20" fill="#00008B"/>
      <rect width="15" height="10" fill="#012169"/>
      <polygon points="0,0 2,0 15,8.5 15,10 13,10 0,1.5" fill="#fff"/>
      <polygon points="13,0 15,0 15,1.5 2,10 0,10 0,8.5" fill="#fff"/>
      <polygon points="0,0 1,0 15,9.3 15,10 14,10 0,0.7" fill="#C8102E"/>
      <polygon points="14,0 15,0 15,0.7 1,10 0,10 0,9.3" fill="#C8102E"/>
      <rect x="6" width="3" height="10" fill="#fff"/>
      <rect y="3.5" width="15" height="3" fill="#fff"/>
      <rect x="6.75" width="1.5" height="10" fill="#C8102E"/>
      <rect y="4" width="15" height="2" fill="#C8102E"/>
      <circle cx="21" cy="5.5" r="1.3" fill="#fff"/>
      <circle cx="25" cy="3.5" r="0.8" fill="#fff"/>
      <circle cx="27" cy="6" r="0.8" fill="#fff"/>
      <circle cx="26" cy="9" r="0.8" fill="#fff"/>
      <circle cx="22" cy="8.5" r="0.8" fill="#fff"/>`),

    NZ: f(`<rect width="30" height="20" fill="#00247D"/>
      <rect width="15" height="10" fill="#012169"/>
      <polygon points="0,0 2,0 15,8.5 15,10 13,10 0,1.5" fill="#fff"/>
      <polygon points="13,0 15,0 15,1.5 2,10 0,10 0,8.5" fill="#fff"/>
      <polygon points="0,0 1,0 15,9.3 15,10 14,10 0,0.7" fill="#C8102E"/>
      <polygon points="14,0 15,0 15,0.7 1,10 0,10 0,9.3" fill="#C8102E"/>
      <rect x="6" width="3" height="10" fill="#fff"/>
      <rect y="3.5" width="15" height="3" fill="#fff"/>
      <rect x="6.75" width="1.5" height="10" fill="#C8102E"/>
      <rect y="4" width="15" height="2" fill="#C8102E"/>
      <polygon points="21,2.5 21.5,4 23,4 21.8,4.9 22.3,6.5 21,5.5 19.7,6.5 20.2,4.9 19,4 20.5,4" fill="#CC0001"/>
      <polygon points="25.5,1 26,2.5 27.5,2.5 26.3,3.4 26.8,5 25.5,4 24.2,5 24.7,3.4 23.5,2.5 25,2.5" fill="#CC0001"/>
      <polygon points="24,7 24.5,8.5 26,8.5 24.8,9.4 25.3,10.9 24,10 22.7,10.9 23.2,9.4 22,8.5 23.5,8.5" fill="#CC0001"/>
      <polygon points="27.5,5 28,6.5 29.5,6.5 28.3,7.4 28.8,8.9 27.5,8 26.2,8.9 26.7,7.4 25.5,6.5 27,6.5" fill="#CC0001"/>`),

  };

  window.renderFlag = function (code) {
    if (!code) return '';
    const svg = window.FLAGS[code.toUpperCase()];
    if (svg) return `<span class="flag-icon">${svg}</span>`;
    // fallback: render as-is (handles legacy emoji or unknown codes)
    return `<span class="flag-emoji">${code}</span>`;
  };

})();

// ============================================================
//  SHARE — athlete share card with canvas export
// ============================================================

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function flagToEmoji(code) {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E0 + c.charCodeAt(0) - 65))
    .join('');
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

async function renderShareCard(athlete, rank, eventName) {
  await document.fonts.ready;

  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const ACCENT = '#e8500a';
  const BG     = athlete.photoBackground || '#111111';

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Photo + gradient
  if (athlete.photo) {
    try {
      const img = await loadImage(athlete.photo);
      const scale = H / img.height;
      const pw    = img.width * scale;
      const px    = W - pw * 1.05;
      ctx.globalAlpha = 0.38;
      ctx.drawImage(img, px, 0, pw, H);
      ctx.globalAlpha = 1;

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,    BG);
      grad.addColorStop(0.42, BG);
      grad.addColorStop(0.68, hexToRgba(BG, 0.85));
      grad.addColorStop(1,    hexToRgba(BG, 0.05));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } catch (_) { /* no photo — plain bg */ }
  }

  // Orange top bar
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 8);

  const LX = 68;

  // ── Site name ──
  ctx.fillStyle = ACCENT;
  ctx.font = '700 13px Barlow, "Helvetica Neue", sans-serif';
  ctx.fillText('STATTC', LX, 54);

  // ── Rank + event ──
  const rankParts = [
    rank != null ? `#${rank}` : null,
    eventName    ? eventName.toUpperCase() : null,
  ].filter(Boolean);
  if (rankParts.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = '500 14px Barlow, "Helvetica Neue", sans-serif';
    ctx.fillText(rankParts.join('  ·  '), LX, 76);
  }

  // ── Athlete name ──
  const nameParts = athlete.name.trim().split(' ');
  const firstName = nameParts.slice(0, -1).join(' ').toUpperCase();
  const lastName  = nameParts[nameParts.length - 1].toUpperCase();

  if (firstName) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '400 32px Oswald, "Helvetica Neue", sans-serif';
    ctx.fillText(firstName, LX, 148);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 88px Oswald, "Helvetica Neue", sans-serif';
  ctx.fillText(lastName, LX - 4, 244); // -4 optical margin correction for Oswald

  // ── Country ──
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = '500 15px Barlow, "Helvetica Neue", sans-serif';
  ctx.fillText(`${flagToEmoji(athlete.flag)}  ${(athlete.country || '').toUpperCase()}`, LX, 282);

  // ── Best time ──
  const KEY_EVENTS = ['800m', '1500m', 'Mile', '3000m', '5000m', '10000m'];
  const prs    = athlete.prs || [];
  const bestPr = (eventName ? prs.find(p => p.event.toLowerCase() === eventName.toLowerCase()) : null)
              ?? prs.find(p => KEY_EVENTS.includes(p.event));

  if (bestPr) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '600 11px Barlow, "Helvetica Neue", sans-serif';
    ctx.fillText('PERSONAL BEST', LX, 334);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 74px "Courier New", Courier, monospace';
    ctx.fillText(bestPr.time, LX, 414);

    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = '500 14px Barlow, "Helvetica Neue", sans-serif';
    ctx.fillText(bestPr.event, LX, 435);
  }

  // ── Trophy badges ──
  const COMP_META = {
    OLY: { label: 'Olympic',      bg: '#d4a000', fg: '#1a1a1a' },
    WC:  { label: 'World',        bg: '#2563eb', fg: '#ffffff' },
    WI:  { label: 'World Indoor', bg: '#7c3aed', fg: '#ffffff' },
    DLF: { label: 'Diamond Lg',   bg: '#e8500a', fg: '#ffffff' },
  };
  const COMP_ORDER = ['OLY', 'WC', 'WI', 'DLF'];

  const counts = {};
  for (const h of (athlete.honours || [])) {
    if (!counts[h.short]) counts[h.short] = { gold: 0, silver: 0, bronze: 0 };
    if (h.place === 1)      counts[h.short].gold++;
    else if (h.place === 2) counts[h.short].silver++;
    else if (h.place === 3) counts[h.short].bronze++;
  }

  let bx = LX;
  const BY = 480, BH = 32;
  ctx.font = '600 13px Barlow, "Helvetica Neue", sans-serif';

  for (const key of COMP_ORDER) {
    const c = counts[key];
    if (!c) continue;
    const meta = COMP_META[key];
    const medals = [];
    if (c.gold)   medals.push(`${c.gold}× 🥇`);
    if (c.silver) medals.push(`${c.silver}× 🥈`);
    if (c.bronze) medals.push(`${c.bronze}× 🥉`);
    if (!medals.length) continue;

    const label = `${meta.label}  ${medals.join('  ')}`;
    const tw    = ctx.measureText(label).width;
    const bw    = tw + 28;

    ctx.fillStyle = meta.bg;
    ctx.beginPath();
    ctx.roundRect(bx, BY, bw, BH, 5);
    ctx.fill();

    ctx.fillStyle = meta.fg;
    ctx.fillText(label, bx + 14, BY + 21);

    bx += bw + 10;
  }

  // ── Footer URL ──
  ctx.fillStyle = 'rgba(255,255,255,0.17)';
  ctx.font = '400 12px Barlow, "Helvetica Neue", sans-serif';
  ctx.fillText('stattc.com', LX, 610);

  return canvas;
}

// ── Export actions ────────────────────────────────────────────────────────────

async function downloadShareCard(athlete, rank, eventName) {
  const btn = document.getElementById('share-download-btn');
  if (btn) { btn.textContent = 'Rendering…'; btn.disabled = true; }
  try {
    const canvas = await renderShareCard(athlete, rank, eventName);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${(athlete.name || 'athlete').toLowerCase().replace(/\s+/g, '-')}-statTC.png`;
      a.click();
      URL.revokeObjectURL(url);
      if (btn) { btn.textContent = '↓ Download'; btn.disabled = false; }
    }, 'image/png');
  } catch (err) {
    console.error('Share download error:', err);
    if (btn) { btn.textContent = '↓ Download'; btn.disabled = false; }
  }
}

async function copyShareCard(athlete, rank, eventName) {
  const btn = document.getElementById('share-copy-btn');
  if (btn) { btn.textContent = 'Rendering…'; btn.disabled = true; }
  try {
    const canvas = await renderShareCard(athlete, rank, eventName);
    const blob   = await new Promise(res => canvas.toBlob(res, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    if (btn) {
      btn.textContent = 'Copied!';
      btn.disabled = false;
      setTimeout(() => { if (btn) btn.textContent = '⧉ Copy image'; }, 2000);
    }
  } catch (err) {
    console.error('Share copy error:', err);
    if (btn) {
      btn.textContent = err.name === 'NotAllowedError' ? 'Permission denied' : '⧉ Copy image';
      btn.disabled = false;
    }
  }
}

// ── DOM preview card (shown in overlay) ──────────────────────────────────────

function buildShareCardHtml(athlete, rank, eventName) {
  const siteName   = (SITE && SITE.name) || 'StatTC';
  const accent     = (SITE && SITE.accentColor) || '#e8500a';
  const photo      = athlete.photo || '';
  const bg         = athlete.photoBackground || '#1a1a1a';
  const nameParts  = athlete.name.trim().split(' ');
  const firstName  = nameParts.slice(0, -1).join(' ');
  const lastName   = nameParts[nameParts.length - 1];

  const KEY_EVENTS = ['800m', '1500m', 'Mile', '3000m', '5000m', '10000m', 'Half Marathon', 'Marathon', '3000m SC'];
  const prs    = (athlete.prs || []).filter(p => KEY_EVENTS.includes(p.event)).slice(0, 6);
  const bestPr = (eventName ? prs.find(p => p.event.toLowerCase() === eventName.toLowerCase()) : null)
              ?? prs[0];

  const prsHtml = prs.map(p => `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:#666;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:3px">${p.event}</div>
      <div style="font-size:22px;font-weight:700;font-family:'Courier New',monospace;color:#fff">${p.time}</div>
    </div>
  `).join('');

  const rankLine = [rank != null ? `#${rank}` : null, eventName ? eventName.toUpperCase() : null].filter(Boolean).join('  ·  ');

  return `
    <div id="share-card" style="
      width:600px;height:315px;position:relative;overflow:hidden;
      background:${bg};border-radius:12px;display:flex;
      font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
    ">
      ${photo ? `
        <div style="position:absolute;inset:0;
          background-image:url('${photo}');
          background-size:cover;background-position:center top;opacity:0.35">
        </div>
        <div style="position:absolute;inset:0;
          background:linear-gradient(to right,${bg} 45%,transparent 100%)">
        </div>
      ` : ''}

      <div style="position:absolute;left:0;top:0;right:0;height:4px;background:${accent}"></div>

      <div style="position:relative;z-index:2;padding:28px 28px 28px 32px;display:flex;flex-direction:column;justify-content:space-between;width:300px">
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:${accent};margin-bottom:${rankLine ? '4px' : '10px'}">${siteName.toUpperCase()}</div>
          ${rankLine ? `<div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.04em;margin-bottom:12px">${rankLine}</div>` : ''}
          ${firstName ? `<div style="font-size:18px;font-weight:600;color:rgba(255,255,255,0.35);line-height:1">${firstName.toUpperCase()}</div>` : ''}
          <div style="font-size:42px;font-weight:900;color:#fff;line-height:1;margin-bottom:4px">${lastName.toUpperCase()}</div>
          <div style="font-size:13px;color:#666">${athlete.country || ''}</div>
        </div>
        <div style="font-size:11px;color:#444">${siteName.toLowerCase()}.com</div>
      </div>

      <div style="position:relative;z-index:2;padding:28px 28px 28px 0;display:flex;flex-wrap:wrap;align-content:flex-start;gap:0 24px;width:240px">
        ${prsHtml}
      </div>
    </div>
  `;
}

// ── Overlay ───────────────────────────────────────────────────────────────────

function openShareOverlay(athleteId, rank, eventName) {
  try {
    const athlete = (typeof ATHLETES !== 'undefined') ? ATHLETES[athleteId] : null;
    if (!athlete) { console.warn('Share: athlete not found', athleteId); return; }

    const existing = document.getElementById('share-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999', 'background:rgba(0,0,0,0.88)',
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:18px',
    ].join(';');

    const cardHtml = buildShareCardHtml(athlete, rank, eventName);

    const BTN_BASE = 'border:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;font-family:Barlow,sans-serif';
    overlay.innerHTML = `
      ${cardHtml}
      <div style="display:flex;gap:12px;align-items:center">
        <button id="share-download-btn" style="${BTN_BASE};background:#e8500a;color:#fff">↓ Download</button>
        <button id="share-copy-btn"     style="${BTN_BASE};background:#2a2a2a;color:#fff;border:1px solid #444">⧉ Copy image</button>
        <span style="color:#444;font-size:13px;font-family:sans-serif">or screenshot the card above</span>
        <button onclick="document.getElementById('share-overlay').remove()" style="background:none;border:none;color:#555;font-size:22px;cursor:pointer;line-height:1;padding:4px 8px;margin-left:4px">×</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('share-download-btn').addEventListener('click', () => downloadShareCard(athlete, rank, eventName));
    document.getElementById('share-copy-btn').addEventListener('click',     () => copyShareCard(athlete, rank, eventName));

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const esc = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  } catch (err) {
    console.error('Share overlay error:', err);
  }
}

window.openShareOverlay = openShareOverlay;

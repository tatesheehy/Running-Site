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
  const SPLIT = 410; // left (photo) / right (content) divider
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const ACCENT   = '#e8500a';
  const BG_DARK  = athlete.photoBackground || '#111111';
  const BG_LIGHT = '#ffffff';

  // ── Left panel (dark, photo) ──
  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, SPLIT, H);

  if (athlete.photo) {
    try {
      const img = await loadImage(athlete.photo);
      const scale = H / img.height;
      const pw = img.width * scale;
      const px = (SPLIT - pw) / 2;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, px, 0, pw, H);
      ctx.globalAlpha = 1;
      // Fade right edge into split
      const fade = ctx.createLinearGradient(SPLIT - 140, 0, SPLIT, 0);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, BG_DARK);
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, SPLIT, H);
    } catch (_) {}
  }

  // ── Right panel (white, content) ──
  ctx.fillStyle = BG_LIGHT;
  ctx.fillRect(SPLIT, 0, W - SPLIT, H);

  // ── Orange top bar (full width) ──
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 7);

  // ── Right panel content ──
  const RX = SPLIT + 52; // left edge of content
  const RW = W - RX - 48; // available width

  // Rank + event
  const rankLine = [rank != null ? `#${rank}` : null, eventName ? eventName.toUpperCase() : null]
    .filter(Boolean).join('  ·  ');
  if (rankLine) {
    ctx.fillStyle = ACCENT;
    ctx.font = '700 13px Barlow, "Helvetica Neue", sans-serif';
    ctx.fillText(rankLine, RX, 52);
  }

  // Name
  const nameParts = athlete.name.trim().split(' ');
  const firstName = nameParts.slice(0, -1).join(' ').toUpperCase();
  const lastName  = nameParts[nameParts.length - 1].toUpperCase();

  if (firstName) {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '400 34px Oswald, "Helvetica Neue", sans-serif';
    ctx.fillText(firstName, RX, 108);
  }

  // Auto-fit last name
  ctx.font = '700 96px Oswald, "Helvetica Neue", sans-serif';
  let nameSize = 96;
  while (ctx.measureText(lastName).width > RW && nameSize > 48) {
    nameSize -= 4;
    ctx.font = `700 ${nameSize}px Oswald, "Helvetica Neue", sans-serif`;
  }
  ctx.fillStyle = '#111111';
  ctx.fillText(lastName, RX - 4, firstName ? 210 : 180);

  // Country
  ctx.fillStyle = '#888888';
  ctx.font = '500 15px Barlow, "Helvetica Neue", sans-serif';
  ctx.fillText(`${flagToEmoji(athlete.flag)}  ${(athlete.country || '').toUpperCase()}`, RX, firstName ? 242 : 212);

  // Divider
  const div1y = firstName ? 264 : 234;
  ctx.strokeStyle = '#eeeeee';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(RX, div1y); ctx.lineTo(W - 48, div1y); ctx.stroke();

  // Best time
  const KEY_EVENTS = ['800m', '1500m', 'Mile', '3000m', '5000m', '10000m'];
  const prs    = athlete.prs || [];
  const bestPr = (eventName ? prs.find(p => p.event.toLowerCase() === eventName.toLowerCase()) : null)
              ?? prs.find(p => KEY_EVENTS.includes(p.event));

  let div2y = div1y + 36;
  if (bestPr) {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '600 11px Barlow, "Helvetica Neue", sans-serif';
    ctx.fillText('PERSONAL BEST', RX, div1y + 24);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 76px "Courier New", Courier, monospace';
    ctx.fillText(bestPr.time, RX, div1y + 104);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '500 13px Barlow, "Helvetica Neue", sans-serif';
    ctx.fillText(bestPr.event, RX, div1y + 124);
    div2y = div1y + 144;
  }

  // Divider 2
  ctx.strokeStyle = '#eeeeee';
  ctx.beginPath(); ctx.moveTo(RX, div2y); ctx.lineTo(W - 48, div2y); ctx.stroke();

  // Trophy case
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '600 11px Barlow, "Helvetica Neue", sans-serif';
  ctx.fillText('TROPHY CASE', RX, div2y + 22);

  const COMP_COLORS = { OLY: '#d4a000', WC: '#2563eb', WI: '#7c3aed', DLF: '#e8500a' };
  const PLACE_COLORS = ['#d4a000', '#9e9e9e', '#b87333'];

  const honours = (athlete.honours || []).slice(0, 10);
  ctx.font = '600 12px Barlow, "Helvetica Neue", sans-serif';

  let bx = RX, by = div2y + 36;
  const BH = 30;

  for (const h of honours) {
    const placeColor = PLACE_COLORS[(h.place - 1)] || '#888';
    const compColor  = COMP_COLORS[h.short] || '#555';
    const label      = `${h.short} '${String(h.year).slice(2)}  ${h.discipline}`;
    const tw         = ctx.measureText(label).width;
    const bw         = tw + 38;

    if (bx + bw > W - 48) { bx = RX; by += BH + 7; }

    // Badge bg
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, BH, 5); ctx.fill();

    // Place-color left strip
    ctx.fillStyle = placeColor;
    ctx.beginPath(); ctx.roundRect(bx, by, 4, BH, [5, 0, 0, 5]); ctx.fill();

    // Competition color dot
    ctx.fillStyle = compColor;
    ctx.beginPath(); ctx.arc(bx + 15, by + BH / 2, 4.5, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#333333';
    ctx.fillText(label, bx + 27, by + BH / 2 + 4);

    bx += bw + 8;
  }

  // ── Branding ──
  ctx.fillStyle = '#cccccc';
  ctx.font = '400 12px Barlow, "Helvetica Neue", sans-serif';
  const brandW = ctx.measureText('stattc.com').width;
  ctx.fillText('stattc.com', W - 48 - brandW, H - 18);

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

// ── DOM preview card ──────────────────────────────────────────────────────────

function buildShareCardHtml(athlete, rank, eventName) {
  const siteName  = (SITE && SITE.name) || 'StatTC';
  const accent    = '#e8500a';
  const photoBg   = athlete.photoBackground || '#111';
  const photo     = athlete.photo || '';
  const nameParts = athlete.name.trim().split(' ');
  const firstName = nameParts.slice(0, -1).join(' ');
  const lastName  = nameParts[nameParts.length - 1];
  const rankLine  = [rank != null ? `#${rank}` : null, eventName ? eventName.toUpperCase() : null]
    .filter(Boolean).join('  ·  ');

  const KEY_EVENTS = ['800m', '1500m', 'Mile', '3000m', '5000m', '10000m'];
  const prs    = (athlete.prs || []).filter(p => KEY_EVENTS.includes(p.event));
  const bestPr = (eventName ? prs.find(p => p.event.toLowerCase() === eventName.toLowerCase()) : null)
              ?? prs[0];

  const COMP_COLORS = { OLY: '#d4a000', WC: '#2563eb', WI: '#7c3aed', DLF: '#e8500a' };
  const PLACE_COLORS = ['#d4a000', '#9e9e9e', '#b87333'];

  const badgesHtml = (athlete.honours || []).slice(0, 8).map(h => {
    const placeColor = PLACE_COLORS[(h.place - 1)] || '#888';
    const compColor  = COMP_COLORS[h.short] || '#555';
    return `
      <div style="display:flex;align-items:center;gap:5px;background:#f5f5f5;border-radius:4px;
        padding:3px 8px 3px 4px;border-left:3px solid ${placeColor};font-size:10px;color:#333;
        font-family:'Helvetica Neue',sans-serif;font-weight:600;white-space:nowrap">
        <span style="width:7px;height:7px;border-radius:50%;background:${compColor};display:inline-block;flex-shrink:0"></span>
        ${h.short} '${String(h.year).slice(2)}&nbsp;${h.discipline}
      </div>`;
  }).join('');

  return `
    <div id="share-card" style="
      width:600px;height:315px;display:flex;border-radius:10px;overflow:hidden;
      font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);position:relative;
    ">
      <!-- orange top bar -->
      <div style="position:absolute;top:0;left:0;right:0;height:3.5px;background:${accent};z-index:3"></div>

      <!-- left photo panel -->
      <div style="width:205px;flex-shrink:0;background:${photoBg};position:relative;overflow:hidden">
        ${photo ? `
          <img src="${photo}" style="width:100%;height:100%;object-fit:cover;object-position:center top;opacity:0.9">
          <div style="position:absolute;inset:0;background:linear-gradient(to right,transparent 60%,${photoBg} 100%)"></div>
        ` : ''}
      </div>

      <!-- right content panel -->
      <div style="flex:1;background:#fff;padding:20px 20px 14px 22px;display:flex;flex-direction:column;justify-content:space-between;min-width:0">
        <div>
          ${rankLine ? `<div style="font-size:10px;font-weight:700;color:${accent};margin-bottom:6px">${rankLine}</div>` : ''}
          ${firstName ? `<div style="font-size:14px;font-weight:400;color:#aaa;line-height:1;font-family:Oswald,sans-serif">${firstName.toUpperCase()}</div>` : ''}
          <div style="font-size:40px;font-weight:700;color:#111;line-height:1;font-family:Oswald,sans-serif">${lastName.toUpperCase()}</div>
          <div style="font-size:11px;color:#888;margin-top:3px">${(athlete.country || '').toUpperCase()}</div>
        </div>

        ${bestPr ? `
          <div>
            <div style="font-size:9px;font-weight:600;color:#aaa;letter-spacing:0.05em;margin-bottom:2px">PERSONAL BEST</div>
            <div style="font-size:30px;font-weight:700;color:#111;font-family:'Courier New',monospace;line-height:1">${bestPr.time}</div>
            <div style="font-size:10px;color:#aaa;margin-top:1px">${bestPr.event}</div>
          </div>
        ` : ''}

        <div>
          <div style="font-size:9px;font-weight:600;color:#aaa;letter-spacing:0.05em;margin-bottom:5px">TROPHY CASE</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${badgesHtml}</div>
        </div>

        <div style="font-size:9px;color:#ccc;text-align:right">${siteName.toLowerCase()}.com</div>
      </div>
    </div>`;
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

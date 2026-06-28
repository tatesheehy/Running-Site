// ============================================================
//  SHARE — generate a shareable athlete stats card image
// ============================================================

const CARD_W = 1200;
const CARD_H = 630;
const ACCENT  = '#e8500a';
const BG      = '#111111';
const BG2     = '#1a1a1a';

function loadImg(src) {
  return new Promise((res) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    // Use absolute URL so canvas doesn't treat it as cross-origin
    img.src = src.startsWith('http') ? src : window.location.origin + (src.startsWith('/') ? '' : '/') + src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateShareCard(athlete) {
  const canvas = document.createElement('canvas');
  canvas.width  = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  // ── Background ──────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Photo (right side) ──────────────────────────────────
  const PHOTO_X = 560;
  const photo = athlete.photo ? await loadImg(athlete.photo) : null;
  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(PHOTO_X, 0, CARD_W - PHOTO_X, CARD_H);
    ctx.clip();
    // scale-to-fill
    const scale = Math.max((CARD_W - PHOTO_X) / photo.width, CARD_H / photo.height);
    const pw = photo.width * scale;
    const ph = photo.height * scale;
    const px = PHOTO_X + ((CARD_W - PHOTO_X) - pw) / 2;
    const py = (CARD_H - ph) / 2;
    ctx.drawImage(photo, px, py, pw, ph);
    ctx.restore();

    // Gradient feather from left over photo
    const grad = ctx.createLinearGradient(PHOTO_X, 0, CARD_W, 0);
    grad.addColorStop(0,    BG);
    grad.addColorStop(0.35, 'rgba(17,17,17,0.7)');
    grad.addColorStop(1,    'rgba(17,17,17,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(PHOTO_X, 0, CARD_W - PHOTO_X, CARD_H);

    // Bottom vignette
    const botGrad = ctx.createLinearGradient(0, CARD_H - 120, 0, CARD_H);
    botGrad.addColorStop(0, 'rgba(17,17,17,0)');
    botGrad.addColorStop(1, 'rgba(17,17,17,0.5)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(PHOTO_X, CARD_H - 120, CARD_W - PHOTO_X, 120);
  }

  // ── Left accent bar ──────────────────────────────────────
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, 8, CARD_H);

  // ── Site tag ─────────────────────────────────────────────
  const siteName = (SITE && SITE.name) || 'StatTC';
  ctx.font = '600 18px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = ACCENT;
  ctx.letterSpacing = '0.08em';
  ctx.fillText(siteName.toUpperCase(), 44, 56);
  ctx.letterSpacing = '0';

  // ── Event badge ──────────────────────────────────────────
  const eventLabel = (athlete.event || '').toUpperCase();
  if (eventLabel) {
    ctx.font = '700 13px "Helvetica Neue", Helvetica, Arial, sans-serif';
    const badgeW = ctx.measureText(eventLabel).width + 24;
    roundRect(ctx, 44, 74, badgeW, 28, 5);
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.fillText(eventLabel, 56, 93);
  }

  // ── Name ─────────────────────────────────────────────────
  const nameY = eventLabel ? 190 : 160;
  ctx.font = '900 74px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  // Scale down name if too wide
  const nameParts = athlete.name.split(' ');
  if (nameParts.length >= 2) {
    ctx.font = '900 36px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(nameParts.slice(0, -1).join(' ').toUpperCase(), 44, nameY - 44);
    ctx.font = '900 78px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nameParts[nameParts.length - 1].toUpperCase(), 44, nameY);
  } else {
    ctx.font = '900 74px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(athlete.name.toUpperCase(), 44, nameY);
  }

  // ── Country ───────────────────────────────────────────────
  ctx.font = '500 22px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText((athlete.country || '').toUpperCase(), 44, nameY + 36);

  // ── Divider ───────────────────────────────────────────────
  const divY = nameY + 68;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(44, divY, 460, 1);

  // ── PRs ──────────────────────────────────────────────────
  const prs = (athlete.prs || []).filter(p =>
    ['800m','1500m','Mile','3000m','5000m','10000m','Marathon','Half Marathon','3000m SC'].includes(p.event)
  ).slice(0, 6);

  const prStartY = divY + 32;
  const COL_W    = 230;
  prs.forEach((pr, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = 44 + col * COL_W;
    const y   = prStartY + row * 58;

    ctx.font = '600 13px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(pr.event.toUpperCase(), x, y);

    ctx.font = '700 28px "Courier New", Courier, monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(pr.time, x, y + 26);
  });

  // ── Bottom watermark ─────────────────────────────────────
  ctx.font = '500 16px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#444';
  ctx.fillText(siteName.toLowerCase() + '.com', 44, CARD_H - 28);

  return canvas;
}

async function shareAthleteCard(athleteId) {
  const athlete = ATHLETES[athleteId];
  if (!athlete) return;

  const btn = document.querySelector('.card-share-btn');
  if (btn) { btn.textContent = 'Generating…'; btn.disabled = true; }

  try {
    const canvas  = await generateShareCard(athlete);
    const dataUrl = canvas.toDataURL('image/png');
    const name    = athlete.name.replace(/\s+/g, '-');

    // Mobile: native share sheet
    if (navigator.share && navigator.canShare) {
      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${name}-stats.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${athlete.name} — ${(SITE && SITE.name) || 'StatTC'}` });
        return;
      }
    }

    // Desktop: download
    const a = document.createElement('a');
    a.href     = dataUrl;
    a.download = `${name}-stats.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('Share card error:', e);
    alert('Could not generate card. Check console for details.');
  } finally {
    if (btn) { btn.textContent = '↗ Share'; btn.disabled = false; }
  }
}

window.shareAthleteCard = shareAthleteCard;

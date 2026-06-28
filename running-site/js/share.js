// ============================================================
//  SHARE — in-page shareable athlete stats card
// ============================================================

function buildShareCardHtml(athlete) {
  const siteName = (SITE && SITE.name) || 'StatTC';
  const accent   = (SITE && SITE.accentColor) || '#e8500a';
  const photo    = athlete.photo || '';
  const bg       = athlete.photoBackground || '#1a1a1a';
  const nameParts = athlete.name.trim().split(' ');
  const firstName = nameParts.slice(0, -1).join(' ');
  const lastName  = nameParts[nameParts.length - 1];

  const KEY_EVENTS = ['800m','1500m','Mile','3000m','5000m','10000m','Half Marathon','Marathon','3000m SC'];
  const prs = (athlete.prs || []).filter(p => KEY_EVENTS.includes(p.event)).slice(0, 6);

  const prsHtml = prs.map(p => `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:#666;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:3px">${p.event}</div>
      <div style="font-size:22px;font-weight:700;font-family:'Courier New',monospace;color:#fff">${p.time}</div>
    </div>
  `).join('');

  return `
    <div id="share-card" style="
      width:600px; height:315px; position:relative; overflow:hidden;
      background:${bg}; border-radius:12px; display:flex;
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

      <div style="position:absolute;left:0;top:0;bottom:0;width:6px;background:${accent}"></div>

      <div style="position:relative;z-index:2;padding:28px 28px 28px 32px;display:flex;flex-direction:column;justify-content:space-between;width:300px">
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:${accent};margin-bottom:10px">${siteName.toUpperCase()}</div>
          ${athlete.event ? `<div style="font-size:10px;font-weight:600;color:#777;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px">${athlete.event}</div>` : ''}
          ${firstName ? `<div style="font-size:18px;font-weight:600;color:rgba(255,255,255,0.5);line-height:1">${firstName.toUpperCase()}</div>` : ''}
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

function openShareOverlay(athleteId) {
  try {
    const athlete = (typeof ATHLETES !== 'undefined') ? ATHLETES[athleteId] : null;
    if (!athlete) { console.warn('Share: athlete not found for id', athleteId, typeof ATHLETES); return; }

    const existing = document.getElementById('share-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999', 'background:rgba(0,0,0,0.85)',
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:16px',
    ].join(';');

    const cardHtml = buildShareCardHtml(athlete);
    overlay.innerHTML = `
      ${cardHtml}
      <p style="color:#aaa;font-size:13px;font-family:sans-serif;margin:0;text-align:center">
        Screenshot this card to share —
        <span style="background:#222;color:#aaa;padding:2px 8px;border-radius:3px;cursor:pointer" onclick="document.getElementById('share-overlay').remove()">close ×</span>
      </p>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  } catch(err) {
    console.error('Share overlay error:', err);
  }
}

window.openShareOverlay = openShareOverlay;

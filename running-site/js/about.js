// ============================================================
//  ABOUT — buildAboutPage()
// ============================================================

function buildAboutPage() {
  const contributors = (SITE.contributors || []);
  const main = qs('#main');

  const cards = contributors.length ? contributors.map(c => {
    const socials = [
      c.twitter    ? `<a class="contrib-social" href="${c.twitter}" target="_blank" rel="noopener">𝕏</a>` : '',
      c.instagram  ? `<a class="contrib-social" href="${c.instagram}" target="_blank" rel="noopener">IG</a>` : '',
    ].filter(Boolean).join('');

    return `
      <div class="contrib-card">
        <div class="contrib-photo-wrap" style="background:${c.photoBackground || '#1a1a1a'}">
          ${c.photo ? `<img class="contrib-photo" src="${c.photo}" alt="${c.name}">` : `<div class="contrib-photo-empty"></div>`}
        </div>
        <div class="contrib-info">
          <div class="contrib-name">${c.name}</div>
          ${c.role ? `<div class="contrib-role">${c.role}</div>` : ''}
          ${c.bio  ? `<p class="contrib-bio">${c.bio}</p>` : ''}
          ${socials ? `<div class="contrib-socials">${socials}</div>` : ''}
        </div>
      </div>`;
  }).join('') : '<p class="about-empty">No contributors added yet.</p>';

  main.innerHTML = `
    <div class="about-page">
      <div class="container">
        <div class="ath-page-header">
          <div class="ath-page-header-left">
            <h1 class="ath-page-title">ABOUT</h1>
            ${SITE.aboutIntro ? `<p class="ath-page-subtitle">${SITE.aboutIntro}</p>` : ''}
          </div>
        </div>
        <div class="contrib-grid">${cards}</div>
      </div>
    </div>`;
}

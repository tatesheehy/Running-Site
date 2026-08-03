// ============================================================
//  TOOLS — buildToolsPage()
//  One hub for every data tool, so the navbar stays short and
//  the tools stop competing with the editorial surfaces.
// ============================================================

const _TOOL_ICONS = {
  h2h:         '<path d="M4 7h6M4 12h6M4 17h6"/><path d="M14 7h6M14 12h6M14 17h6"/><path d="M12 4v16"/>',
  tracker:     '<path d="M3 17l5-5 4 4 8-8"/><path d="M16 8h4v4"/>',
  countries:   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18a15 15 0 010-18"/>',
  timemachine: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  metrics:     '<path d="M4 20V10M10 20V4M16 20v-7M22 20v-3"/>',
  athletes:    '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
};

const TOOLS = [
  { id: 'h2h',         label: 'Head to Head',  href: 'h2h.html',
    blurb: 'Settle it. Full win–loss record between any two athletes, race by race.',
    note: 'Who actually beat who' },
  { id: 'tracker',     label: 'Event Tracker', href: 'event-tracker.html',
    blurb: 'Season-best leaderboards for every event, updated as results come in.',
    note: 'Who is fastest right now' },
  { id: 'metrics',     label: 'Metrics',       href: 'metrics.html',
    blurb: 'Deep-dive charts — progressions, comparisons, and career curves.',
    note: 'The long view' },
  { id: 'timemachine', label: 'Time Machine',  href: 'time-machine.html',
    blurb: 'Results and records from past seasons, back through the archive.',
    note: 'How it used to look' },
  { id: 'countries',   label: 'Countries',     href: 'country.html',
    blurb: 'Every nation’s depth — rankings and athletes by country.',
    note: 'Depth by nation' },
  { id: 'athletes',    label: 'Athlete Search', href: 'athletes.html',
    blurb: 'Browse and filter all tracked athletes, or combine PR marks to find a group.',
    note: 'Find anyone' },
];

function buildToolsPage() {
  const main = qs('#main');
  const total = (typeof ATHLETES !== 'undefined' && ATHLETES) ? Object.keys(ATHLETES).length : 0;

  const cards = TOOLS.map(t => `
    <a class="tool-card" href="${t.href}">
      <span class="tool-card-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">${_TOOL_ICONS[t.id] || ''}</svg>
      </span>
      <span class="tool-card-body">
        <span class="tool-card-note">${t.note}</span>
        <span class="tool-card-label">${t.label}</span>
        <span class="tool-card-blurb">${t.blurb}</span>
      </span>
      <span class="tool-card-arrow" aria-hidden="true">→</span>
    </a>`).join('');

  main.innerHTML = `
    <div class="container">
      <div class="page-hero">
        <div class="page-hero-inner">
          <div>
            <div class="page-hero-eyebrow">
              <nav class="breadcrumb" aria-label="Breadcrumb">
                <a class="breadcrumb-link" href="index.html">Home</a>
                <span class="breadcrumb-sep">›</span>
                <span class="breadcrumb-current">Tools</span>
              </nav>
            </div>
            <h1 class="page-hero-title">Tools</h1>
            <p class="page-hero-sub">The receipts behind the rankings — every argument in distance running, settled with data.</p>
          </div>
          ${total ? `<div class="page-hero-aside">
            <div class="page-hero-stat">
              <span class="page-hero-stat-num">${total.toLocaleString()}</span>
              <span class="page-hero-stat-lbl">athletes tracked</span>
            </div>
          </div>` : ''}
        </div>
      </div>
      <div class="tool-grid">${cards}</div>
    </div>`;
}

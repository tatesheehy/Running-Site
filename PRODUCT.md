# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: static HTML/CSS/vanilla JS (no framework, no build step). Per-page router in `js/app.js` off `document.body.dataset.page`; data loaded from JSON in `_data/`. Recorded as-is, not chosen fresh.

## Users

Serious distance-running fans — people who follow professional middle/long-distance track (800m through marathon) closely enough to want opinionated takes and rankings, not just meet results. Comparable in spirit to a Ringer NBA reader: they already know the sport and want a voice and a POV on it, not a primer.

## Product Purpose

StatTC is an opinionated home for distance running: signed editorial takes and power rankings, backed by real stats as supporting evidence, wrapped in custom graphics the owner makes himself. Success is being the place fans come back to for a confident take and a ranking they'll argue with — not a stats terminal and not an anonymous forum.

The content engine is stats-driven in two directions at once: (1) the athlete/results database surfaces what is worth writing about — a PB, a head-to-head swing, a barrier broken — and the owner writes the hand-authored take from that prompt; (2) recurring formats (weekly recaps, Stock Up/Down) are templated and pull directly from the database with light editorial editing. Hand-written takes lead; templated data pieces run alongside them.

## Positioning

The gap in running media: coverage today is either faceless news/recaps (LetsRun, Citius Mag, World Athletics), anonymous forum opinion (LetsRun boards), or cold authoritative stats (World Athletics, Tilastopaja). Almost nobody does confident, signed, editorial opinion with real visual identity — no "Ringer for distance running." StatTC's mechanism: a named voice with a stance + custom per-piece graphics (nobody else in the space makes these) + stats used as receipts to back an argument, never as a standalone dashboard.

## Operating Context

Single-owner site: the owner (Tate) writes the takes, sets the rankings, and designs the graphics himself in Photoshop/Figma outside the site, then publishes them in. Not a multi-author newsroom. The site also has an in-browser "Studio" CMS (owner-passcode-gated) for the owner to customize theme/layout/content directly in the browser without touching code. Site is currently private/gated pre-launch (soft client-side passcode gate, not real security).

## Capabilities and Constraints

- Recurring editorial franchises are the intended retention mechanism: Power Rankings (flagship, Ringer Top-100 style, updated after big meets, with movement indicators and one-line "bites"), plus lighter recurring formats (Stock Up/Down, single-stat "Receipts," season awards) — some scaffolding exists, not all built.
- Homepage is blog-first: the lead take is the front door (full-width hero band with its custom graphic), Power Rankings module below it, then a river of recent stories. Deeper stats (H2H records, leaderboards, tools) are intentionally NOT on the homepage — they live on athlete profile and rankings pages for fans who click in.
- Graphics are "the polish, not the product" — every piece (article, athlete card) must read well with no custom graphic (clean typographic fallback) and be elevated when one exists. Custom graphics are never a hard requirement to ship a piece.
- Data on hand: athlete database (photos, PRs, bios, results history), rankings data (per-athlete rank/bite/traits/momentum/season-best), one published article so far.
- Owner-only Studio CMS persists to Supabase (`site_config` table, public read / owner write) plus localStorage; owner unlocks via passcode.

## Brand Commitments

- Name: "StatTC."
- One accent color: orange (`--brand`/`--accent: #FF5200`), used as the site's single accent — no competing accent colors.
- Two-typeface system: `Lota Grotesque` for UI/display/body, `'Source Serif 4'` (editorial serif) reserved for article/story headlines to mark the writing as distinct from the product chrome.
- No other logo file, tagline, or social handles confirmed yet.

## Evidence on Hand

- `_data/athletes.json` — real athlete records (photos, PRs, bios) for ~249 athletes.
- `_data/rankings.json` — real per-event rankings with bites/traits/momentum for 2026 season (note: at least the 1500m event currently has gaps/no #1 in its rank sequence — a data cleanup item, not a product fact to design around).
- `_data/articles.json` — one real published article ("How to Disappear," opinion, with a custom hero graphic).
- No testimonials, press, pricing, or case studies exist or should be fabricated.

## Product Principles

1. Voice over volume — a confident, signed take beats neutral recap coverage; the site should never read as anonymous or faceless.
2. Graphics are polish, not scaffolding — every surface must stand on typography and content alone; a custom graphic elevates, never gates.
3. Receipts, not dashboards — stats exist to back an argument inline or reward a fan who clicks into a profile; they never form a front-page wall.
4. One accent, one voice — visual restraint (single brand color, two deliberate typefaces) keeps the graphics the memorable variable, not the chrome.
5. Franchises build habit — recurring named formats (Power Rankings, etc.) matter more to retention than one-off articles.
6. Consistency is the craft floor — one spacing scale, one type ramp, one component vocabulary reused everywhere. A surface that invents its own patterns is a defect, not a variation.

## Accessibility & Inclusion

Held to WCAG 2.1 AA as a real constraint: sufficient color contrast (4.5:1 body text), full keyboard operability, alt text on images, labeled form fields, screen-reader-reachable interactive elements. Checked during design/polish passes, not just assumed.

---
name: StatTC
description: Opinionated distance-running takes and power rankings, built like a working press box.
colors:
  orange: "#FF5200"
  orange-hover: "#E04600"
  orange-light: "#FFF0E9"
  ink: "#111111"
  ink-soft: "#1C1C1C"
  muted: "#6B6F76"
  ink-2: "#3A3A3A"
  muted-2: "#9AA0A8"
  surface: "#FFFFFF"
  page-bg: "#F5F6F8"
  border: "#ECECEC"
  divider-light: "#F2F2F2"
  divider-strong: "#DDDDDD"
  success: "#16A34A"
  warning: "#D97706"
  danger: "#DC2626"
typography:
  editorial:
    fontFamily: "Lota Grotesque, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(32px, 4.2vw, 50px)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Lota Grotesque, sans-serif"
    fontSize: "clamp(23px, 2.6vw, 30px)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Lota Grotesque, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Lota Grotesque, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Lota Grotesque, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  xs: "4px"
  sm-2: "8px"
  btn: "10px"
  input: "12px"
  card: "16px"
  feature: "20px"
  pill: "999px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "16px"
  sp-4: "24px"
  sp-5: "32px"
  sp-6: "40px"
  sp-7: "48px"
  sp-8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.surface}"
    rounded: "{rounded.btn}"
    padding: "0 18px"
    height: "40px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.orange-hover}"
    textColor: "{colors.surface}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.btn}"
    padding: "0 18px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.page-bg}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.sp-4}"
  chip:
    backgroundColor: "{colors.orange-light}"
    textColor: "{colors.orange}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "0 14px"
    height: "44px"
---

# Design System: StatTC

## Overview

**Creative North Star: "The Press Box"**

StatTC is designed as a working writer's vantage point on the sport. A press box is authoritative without being ceremonial: it exists so someone with a good eye can watch, judge, and file. Everything in it earns its spot — the sightline, the monitor, the stat sheet at your elbow. Nothing is there to impress a visitor.

That translates to an interface where the writing leads and the data sits within arm's reach. A signed take is the front door; rankings are the recurring franchise; the numbers are receipts you reach for mid-argument, never a wall you stare at. The visual language is quiet, high-contrast, and unfussy so the two things that are genuinely StatTC's own — the voice and the custom graphics — are the only elements doing loud work. One orange accent carries every moment of emphasis on the site; when everything can be highlighted, nothing is.

The system is deliberately restrained at the chrome level so it can be generous at the content level. A hand-made athlete graphic should be the most visually interesting thing in any viewport it appears in. If the interface is competing with it, the interface is wrong.

**Key Characteristics:**
- Editorial-first: heavy, tightly-tracked headlines mark authored judgment; small tracked labels mark chrome
- Flat surfaces, separated by rules and whitespace rather than shadow
- Exactly one accent color, used sparingly enough to still mean something
- Data rendered as evidence inside arguments, not as dashboards
- Custom graphics are the visual payload; the frame stays out of their way

## Colors

A near-monochrome editorial palette with a single high-energy orange reserved for emphasis and identity.

### Primary
- **Signal Orange** (`#FF5200`): The one accent. Brand identity, active states, rank numerals in the podium positions, category eyebrows, links on hover, and the primary button. Used on a small fraction of any screen; its scarcity is what makes it read as emphasis.
- **Signal Orange Pressed** (`#E04600`): Hover and pressed state for orange surfaces only. Never used as a second accent in its own right.
- **Signal Orange Tint** (`#FFF0E9`): Quiet fills for chips, badges, and highlight rows that need to register as "related to the accent" without shouting.

### Neutral
- **Press Ink** (`#111111`): All primary text, and the ground color for immersive/cinematic surfaces (hero scrims, dark athlete cards).
- **Ink Soft** (`#1C1C1C`): Secondary dark surface, one step off pure ink for layered dark blocks.
- **Desk Gray** (`#6B6F76`): Metadata — bylines, dates, read times, captions, secondary table columns. Never used for primary content.
- **Newsprint White** (`#FFFFFF`): Card and content surfaces.
- **Press Gray** (`#F5F6F8`): The page ground beneath white surfaces, and the resting fill for zebra table rows and hover states.
- **Rule** (`#ECECEC`): The single border color for cards and default separators.
- **Rule Faint** (`#F2F2F2`) / **Rule Strong** (`#DDDDDD`): Inner hairlines and heavy section splits respectively.

### Status
- **Confirm Green** (`#16A34A`), **Caution Amber** (`#D97706`), **Alert Red** (`#DC2626`): Reserved strictly for state feedback (form validation, live/finished status, destructive confirmation). These are not part of the expressive palette and never decorate content.

### Named Rules

**The One Voice Rule.** Signal Orange is the only accent in the system. Any new hue introduced for decoration — a second "category color," a blue gradient, a green trend line — is a defect. Status colors are the sole exception and they may only communicate state, never brand.

**The Token Rule.** Every color in a component references a custom property from `:root` in `base.css`. A raw hex in a page stylesheet is drift, not a decision. (The codebase currently violates this in several partials; see Don'ts.)

## Typography

**Sole Font:** Lota Grotesque (with system-ui, -apple-system, sans-serif)

**Character:** One grotesque, used across the entire site. No serif, no second family. Because the typeface never changes, hierarchy is carried entirely by **weight, size, and tracking** — and that constraint is the point: it forces every level of the ramp to be unmistakably distinct rather than leaning on a font swap to do the work. Headlines run heavy and optically tight; labels run small and widely tracked; body sits quiet in the middle. The result reads as a modern sports desk rather than a newspaper.

### Hierarchy
- **Editorial** (800, `clamp(32px, 4.2vw, 50px)`, 1.02, -0.035em): Article and lead-story headlines, and ranking-page titles. The heaviest weight paired with aggressive negative tracking — this tight, dense setting is what marks a headline as authored judgment now that no serif does it. This is the signature of the site.
- **Display** (800, `clamp(23px, 2.6vw, 30px)`, 1.05, -0.01em): Page hero titles and major section heads. Lota Grotesque.
- **Title** (800, 18px, 1.15, -0.015em): Card titles, story-river headlines, athlete names in ranking rows.
- **Body** (400, 16px, 1.5): Article prose and descriptive copy. Article measure caps around 65–75ch; never let prose run the full 1200px container.
- **Label** (800, 11px, 0.12em, uppercase): Eyebrows, category tags, table headers, stat captions. The wide tracking is what makes small text read as a deliberate label instead of shrunken body copy.
- **Numerals** (800, 26–40px, -0.04em): Rank numbers, times, and counts. Big, tight, and confident — a rank should be legible at a glance from across a room.

### Named Rules

**The One Family Rule.** Lota Grotesque is the only typeface on the site. No serif, no display face, no second family for a single surface. If a headline isn't reading as important enough, the fix is weight, size, and tracking — never a new font.

**The Tight Headline Rule.** Editorial headlines set at 800 weight, -0.035em tracking, ~1.0 line-height. That density is the site's authored-content signal; a loose or light headline reads as generic chrome.

## Layout

A centered 1200px maximum container (`--max-width`) on a Press Gray ground, with white surfaces carrying content.

Spacing follows a strict 8-point scale (`--sp-1` 4px through `--sp-8` 64px). Every margin, padding, and gap resolves to a step on that scale; arbitrary values like `13px` or `27px` are defects.

The homepage uses an asymmetric editorial grid: a full-width lead band pinned above the fold, then a two-column split (`minmax(0,1fr)` content / 320px rail). The wide column carries editorial and ranking modules; the narrow rail carries schedule and reference. The rail is always secondary — nothing a first-time visitor must see belongs in it.

Article pages are single-column and measure-constrained. Data pages (rankings, athletes, H2H) run wider and denser, using the full container.

**Responsive:** the single major reflow is at **960px**, where two-column layouts collapse to one and the sidebar/hamburger swap. A secondary refinement breakpoint at **640px** handles phone-specific density (smaller avatars, tighter rank numerals, reduced padding).

### Named Rules

**The Two Breakpoints Rule.** 960px for structural reflow, 640px for phone density. The codebase currently carries ten-plus ad-hoc widths (480/560/600/700/720/760/860/900); every new rule uses the two canonical breakpoints, and stray ones are consolidated on sight.

**The Lead Is The Front Door Rule.** On the homepage, the lead story renders above the column split at every viewport width. No schedule module, promo, or data panel may render above it on any screen size.

## Elevation & Depth

**Flat by default.** Surfaces sit on the page and are separated by hairline rules, background contrast (white on Press Gray), and whitespace — not by shadow. The system reads as printed matter, not as stacked application panels.

Shadow is a response to state or a signal of true overlay, never a resting decoration. A card that has a shadow while idle is over-elevated.

### Shadow Vocabulary
- **Hover lift** (`box-shadow: 0 8px 24px rgba(0,0,0,0.08)`): Applied on hover to interactive cards that navigate somewhere. Paired with no movement or at most a 1–2px rise.
- **Overlay** (`box-shadow: 0 24px 70px rgba(0,0,0,0.55)`): Modals, dropdowns, the search overlay, and the site gate. These genuinely float above the page and should read that way unambiguously.
- **Cinematic scrim** (layered `linear-gradient` over imagery): How depth is created on graphic-led surfaces. A dark gradient from transparent to `rgba(10,10,11,0.92)` lets headline text sit legibly over a custom graphic without a box around it.

### Named Rules

**The Flat-At-Rest Rule.** `--shadow-card` is legacy and should resolve to `none` for idle surfaces. If a surface needs separation, use a `1px solid var(--border)` rule or a background step to Press Gray — not a shadow.

## Shapes

Rounded, but restrained — soft enough to feel modern, never pill-soft enough to read as a consumer app.

The radius scale is fixed and semantic: buttons `10px`, inputs `12px`, cards `16px`, feature/hero blocks `20px`, and full pills `999px` for chips and tags only. Radius communicates element class, so a card at button radius (or vice versa) reads as a mistake even when a viewer can't name why.

Imagery inside editorial contexts uses a tighter radius (3–4px) than its container, because photographs and graphics should read as *plates* set into the page rather than as soft UI tiles.

Borders are a single hairline weight (`1px solid var(--border)`). Heavier rules (1.5–2px, in Press Ink) are reserved for section headers where a hard editorial underline is doing hierarchical work.

### Named Rules

**The Radius Means Class Rule.** Never invent a radius. If an element doesn't map to button/input/card/feature/pill, it needs to be reclassified, not given a new number.

## Components

### Buttons
- **Shape:** Softly rounded (`10px`), 40px standard height.
- **Primary:** Signal Orange fill, white text, label typography (11px/800/0.12em uppercase), 18px horizontal padding.
- **Hover / Focus:** Background shifts to Signal Orange Pressed (`#E04600`) over 0.15s ease. Focus shows a visible 2px ring offset from the button — never `outline: none` without a replacement.
- **Ghost:** Transparent fill, Press Ink text, hover fills to Press Gray. For secondary actions and toolbar controls.
- **Toggle groups** (event filters, view switchers): ghost buttons in a row; the active member takes the Signal Orange Tint fill with Signal Orange text — not a full orange fill, which would over-weight a filter.

### Chips / Tags
- **Style:** Pill radius, Signal Orange Tint background, Signal Orange text, label typography, 4px/10px padding.
- **Category tags** on stories are the one place a chip may take a solid fill; OPINION runs an editorial red-toned fill to mark argument, while feature/news/analysis use the tint.

### Cards / Containers
- **Corner Style:** `16px`.
- **Background:** Newsprint White on the Press Gray page ground.
- **Shadow Strategy:** None at rest (see Elevation); hover lift only on cards that navigate.
- **Border:** `1px solid var(--border)` where a card needs definition against white.
- **Internal Padding:** `--sp-4` (24px) standard; `--sp-3` (16px) in dense data contexts.
- **Header strip:** Card headers are white with a bottom hairline and label typography — not a gray filled bar.

### Data Tables
- **Header:** Press Gray (`#F7F8FA`) filled row, label typography in Desk Gray.
- **Rows:** Zebra striping with Press Gray on alternating rows, hairline rules between.
- **Numerals:** Right-aligned and tabular; times and marks never wrap.
- This is the one surface where filled backgrounds and rules are *both* used — density earns it.

### Inputs / Fields
- **Style:** White fill, `1px solid var(--border)`, `12px` radius, 44px height.
- **Focus:** Border shifts to Signal Orange with a soft tint ring. Focus must always be visibly distinct from rest.
- **Search:** The site's search is a wide pill in the top bar with a leading magnifier and placeholder text — treated as a primary navigation affordance, not an icon button.

### Navigation
- **Style:** Fixed top bar in Signal Orange, white/translucent-white link text, with a centered wide search field.
- **States:** Links rest at `rgba(255,255,255,0.82)` and go solid white on hover; the active page carries a solid white label plus an underline.
- **Mobile:** Collapses to a hamburger drawer below 960px.

### Ranking Row (signature component)
The recurring franchise unit and the most StatTC-specific pattern in the system. A ranking row is: an oversized tight numeral (orange for podium positions, ink below), the athlete's card photo at a tight radius, their name at title weight with an inline flag, and a one-line "bite" — the editorial judgment that makes it a ranking rather than a list. The bite is mandatory; a ranking row without a take is just a results table and should be rendered as one.

## Do's and Don'ts

### Do:
- **Do** resolve every color, radius, and spacing value to a `:root` custom property from `base.css`.
- **Do** use exactly two breakpoints — 960px for structural reflow, 640px for phone density.
- **Do** set editorial headlines at 800 weight with -0.035em tracking, so density signals authored judgment.
- **Do** keep surfaces flat at rest and reach for a hairline rule or background step before a shadow.
- **Do** give every ranking row an editorial bite; if there's no take, render a table instead.
- **Do** let custom graphics be the loudest element in their viewport, and keep surrounding chrome quiet.
- **Do** pair every focus state with a visible indicator that meets WCAG AA contrast.

### Don't:
- **Don't** introduce a second accent color. One orange, plus status colors that may only report state.
- **Don't** write a raw hex in a page stylesheet. (`#1a1a1a`, `#ef4444`, `#22c55e`, `#F1F1F2` and others currently appear outside `base.css` — these are drift to be reclaimed into tokens, and `#ef4444`/`#22c55e` additionally violate the One Voice Rule.)
- **Don't** create another bespoke button or card class. The codebase carries 47 distinct button classes and 119 card classes across 13,573 lines of CSS; every new surface must compose the shared primitives instead of inventing `.xx-btn` / `.xx-card` again.
- **Don't** put a resting shadow on an idle surface.
- **Don't** invent a radius outside the button/input/card/feature/pill scale.
- **Don't** render a stats wall, leaderboard grid, or tool directory on the homepage — data lives on rankings, profiles, and H2H.
- **Don't** let any module render above the lead story on the homepage at any viewport width.
- **Don't** let article prose run the full container width; cap the measure at 65–75ch.

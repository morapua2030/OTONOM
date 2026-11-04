# OTONOM Web Design System — v2 + v3.1 inner pages + v4 simulator

This design system replaces the Hybrid 03 page styling (DR-099). The v3.1 inner pages (DR-106..DR-109), the v4 simulator (DR-110..DR-112) and the v5 polish (DR-113) extend it with the same tokens. The logo and brand asset files are unchanged: the locked Hybrid 03 artwork in `app/web/public/brand/otonom/` is used byte-for-byte. Source of the look: the owner-approved Claude Design v2 reference, kept privately as design data.

## Implementation

- `app/web/src/app/(site)/v2.css` is loaded after `site.css` and `hybrid03.css` in `[locale]/layout.tsx`. It redefines the shared tokens, so every page inherits the v2 surface, text and border colors.
- Components:

  | Component | Path |
  |---|---|
  | `Swash` / `SwashText` | `components/v2.tsx` |
  | Header and footer | `components/site.tsx` |
  | `HomeMix` | `components/home-mix.tsx` |
  | Package cards, tiles, comparison | `components/SmartHomePackages.tsx` |
  | `ControllerRows` | `components/products.tsx` |
  | `ContactBooking` | `components/ContactBooking.tsx` |
  | Item visuals | `components/package-items.tsx` |
  | v3.1 blocks: `InnerHero`, `SplitTitle`, `Circuit`, `Icon`, `IconCards`, `StepCards`, `CtaBand` | `components/v3.tsx` |
  | v3.1 pages: service, smart home, services index, company, product, Our work, business, support | `components/v3-pages.tsx` |
  | FAQ accordion | `components/FaqAccordion.tsx` |
  | Start a project (chips → WhatsApp message) | `components/StartProject.tsx`, `lib/start-message.ts` |
  | Smart Product Selector (v3 restyle, DR-112) | `components/SmartProductSelector.tsx`, `lib/product-selector.ts`, `lib/selector-message.ts` |
  | Simulator "Try your smart home" (v4, `/try` only) | `components/simulator/Simulator.tsx`, `icons.tsx`, `simulator.css`; `lib/simulator/rules.ts`, `copy.ts`, `plan.ts`, `demo.ts` |

- The contact channel has a single source: `lib/contact.ts` (DR-101). It holds the number, `tel:`, `wa.me`, the reference message texts and the public address (DR-106). There is no form, storage or analytics.
- The v3.1 copy is verbatim from the design: `lib/site-copy.ts` (design constants, AR/EN) and `lib/site-copy-inner.ts` (inner-page strings). Design placeholders (sample projects, optional spec rows, privacy text) are not shipped; a unit test fails if one appears.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--v2-navy` | `#0F2238` | Ink, every card/button border, dark sections, footer |
| `--v2-sky` | `#18A3E0` | Primary button fill (navy text), focus ring, bullet dots, selected chip |
| `--v2-blue` | `#148CE1` | Large text, decoration and hover on large elements only |
| `--v2-blue-text` | `#0B70B7` | Small blue text: eyebrows, links, labels (WCAG AA on `#F5F7FA` and white) |
| `--v2-lightblue` | `#B8DDF3` | Swash blob, muted text on navy |
| `--v2-skytint` | `#91CEF0` | Decoration only |
| `--v2-ice` | `#E8F6FD` | Badges, active drawer row, table total row, business band |
| `--v2-pale` | `#D2EAF9` | Body text on navy |
| `--v2-body` | `#2A3B50` | Body text |
| `--v2-hairline` | `#E3E8EF` | Header border, image panels, tile borders |
| `--v2-rule-navy` | `#2C4560` | Rules on navy |
| `--v2-page` | `#F5F7FA` | Page and header background |
| `--v2-card` | `#FFFFFF` | Cards; product photos always sit on white |

- **Radii:** buttons and inputs 12px; pills, chips and badges 9999px; cards 16px; package cards 24px; hero card and bands `clamp(24px, 4vw, 40px)`.
- **Borders and shadows:** every card and button has a 1px navy border (white on navy sections). No shadows.
- **Layout:** container 1200px with `clamp(20px, 4vw, 32px)` side padding. Home section gap `clamp(72px, 10vw, 112px)`.

## Typography (DR-104)

- Fonts are self-hosted (DR-104). Since D8-C v5 (DR-113) the site serves content-hashed copies from `app/web/public/fonts/` through `src/app/(site)/fonts.css` (same family names, stacks and metric-matched fallbacks as before); the Arabic files are subset to the Arabic block, each locale preloads only its body face (`src/lib/fonts.ts`) and the files are cached as immutable. Masters, OFL 1.1 licences, SHA-256 list and the subset command are in `app/web/src/fonts/README.md`. There is no request to a font provider, and the CSP stays `font-src 'self'`.
- Document titles and meta/Open Graph text are plain text (`metaText` in `lib/seo.ts`, DR-113): bidi isolation (`<Bidi>`, `<Ltr>`) is for the visible page body only.
- **English:** DM Serif Display 400 for headings (−0.028em, line height 1.04–1.08); Inter 400–700 for body (line height 1.6).
- **Arabic:** IBM Plex Sans Arabic for all text, with its Latin subset for brand names and numbers. Headings are 700 with line height 1.25–1.3; body line height 1.8; no negative tracking.
- **Scale:**

  | Element | Size |
  |---|---|
  | H1, home | `clamp(46px, 7vw, 92px)` |
  | H1, inner pages | `clamp(46px, 7vw, 84px)` |
  | H2 | `clamp(36px, 5vw, 64px)` |
  | Card title | 28px |
  | Body | 16–18px |
  | Label | 13–15px |

  Arabic sizes are slightly smaller for the same visual weight.

## Components

- **Header:**
  - Sticky, page background, hairline bottom border, the locked `wordmark_only_light.svg` (`clamp(128px, 14vw, 160px)`).
  - Desktop nav pills (v3.1): Home · Smart Home · Controllers · Packages · Services ▾ · Our work · Contact. The Services menu lists All services plus the four disciplines. The active pill has a 1px navy border and `aria-current`.
  - Then the language link and "Book a visit" (WhatsApp).
  - Below 1000px: the language link and a 44×44 hamburger (`<details>`). The drawer holds the main pages, then a divider and Company, Developers, Contractors, Start a project and Support, then a full-width "Book a visit". Escape closes it and returns focus to the button.
- **Footer (v3.1):** navy. Three link columns, then a Contact column with the phone (`tel:`, isolated LTR), the address, WhatsApp, Contact and Support. The bottom row has the locked `primary_dark.svg`, the language link and "© 2026 OTONOM" in `#B8DDF3`. There is no Privacy link (DR-108).
- **Inner hero (v3.1):** eyebrow, H1 with the key word split out (`SplitTitle`), lead, actions. Service pages add the decorative `Circuit` visual (`aria-hidden`).
- **Icon cards and steps (v3.1):** white cards with a 1px navy border and an ice icon box (inline SVG paths from the design). Steps are numbered cards with Latin digits.
- **FAQ accordion (v3.1):** native `<button aria-expanded aria-controls>` per question with the answer in a `hidden` region. One answer is open at a time; Enter and Space work natively.
- **CTA band (v3.1):** navy band with "Book a visit" (WhatsApp, the page's own message) and Call (`tel:`).
- **Start a project chips (v3.1):** three labelled groups of `aria-pressed` buttons (44px min height). Pressing a chip again clears it. The message updates in an `aria-live="polite"` region, and one WhatsApp button sends it from the visitor's app.
- **Buttons:**
  - Primary: sky fill, navy text, 1px navy border, 13×20 padding.
  - Outline: transparent.
  - On navy: white border.
  - All at least 44px tall, with only a slight darken on hover.
- **Swash:** one key word sits on a decorative `#B8DDF3` blob (`aria-hidden`, rotate −2°; +2° in Arabic), with no line break inside the word. Used on the H1 of the main templates (home, packages, controllers, contact, services, corporate and catch-all pages, builder, compare, gated, portfolio, 404) and on selected H2s.
- **Package cards:**
  - Number, badge (Premium only, inverted navy card), name, a 3-column photo tile grid with a navy "×N" quantity badge, the item list, total price in Latin digits, and "Choose".
  - Home "Choose" opens WhatsApp; Packages "Choose" goes to `/contact?package=<id>`.
- **Comparison table:** white, navy border, 44px thumbnails, ✓ / "—" / ×N. The "—" has the accessible name "Not in this package". The total row is ice. It scrolls horizontally on mobile, with the heading outside the scroll region.
- **Item visuals:** the 16R uses genuine OTONOM product photography; the five brochure component photos (owner-confirmed rights, DR-105) are WebP files in `public/products/items/` with all metadata removed and no edits, explicit width/height and lazy loading below the fold. Alexa is referred to descriptively; no Amazon/Alexa logos or badges are used.

## Simulator (design v4 "12 Simulator", DR-110/DR-111)

- **Scope:** `/{locale}/try` only. The client component and its stylesheet (`components/simulator/simulator.css`, every selector under `.sim`) load on this route only; other pages get plain links to it.
- **Simulator-only tokens** (scoped to `.sim`, never used elsewhere):

  | Token | Value | Use |
  |---|---|---|
  | `--sim-warm-1` | `#FFF1CF` | lit room by day |
  | `--sim-warm-2` | `#FFE3A3` | lit room at night |
  | `--sim-warm-3` | `#FFD98A` | light button on, sun orb |
  | `--sim-heater` | `#FFC08A` | heater on |
  | `--sim-night-tile` | `#1B3350` | dark room at night, moon orb |
  | `--sim-gas` / `--sim-gas-soft` | `#C62828` / `#FDE2E2` | gas alert border/text and fill |
  | locked text | `#3D5266` (on light blue), `#5A6B7E` (on white), `#B8DDF3` (at night) | Premium-only markers and routine steps; replaces the design's 50% opacity, which failed contrast |

- **Components:** stage pills (`aria-current="step"`, follow the scroll), home cards (`aria-pressed`, inline SVG art), room cards (lines stepper 0–16, AC `role="switch"`, device chips ≤ 4 per type, remove with a per-room name), "+ room" type chips (≤ 12 rooms), side panel (`aria-live` total, capacity bar, controllers, lock switch, package with photo tiles, upsell, compare) which becomes a fixed bottom bar with an expandable sheet below 1000px, floor plan (room tiles with `aria-pressed` light/AC/device buttons, curtain and garage strips, AC pulse, fan spin, heater/pump glow), day/night group, 24-hour timeline (play ≈ 20 s, range input with `aria-valuetext`), Alexa command chips with a speech bubble, nine routine cards (trigger, step dots, Try it, heart with `aria-pressed`), Premium upsell with "Add the smart lock", gas alert (`role="alert"`), plan summary, WhatsApp plan link, copy plan (Clipboard API, falls back to a selection copy without a text field), navy CTA band with the plan message.
- **Rules:** no form and no text input (the time-of-day range is the only input), no network request, no storage or cookies, no analytics; external links use `rel="noopener noreferrer"`. `prefers-reduced-motion` turns off every keyframe and transition under `.sim`. Targets are ≥ 44 px (device ± buttons 36 × 44, as in the design). Latin digits; Arabic strings go through `<Bidi>`.
- **Entry points:** Home (mix) hero next to "See packages", Smart Home hero, a banner above the package comparison (`.sim-entry-banner`), under the Controllers heading, the 16R page, the mobile drawer and the footer's Smart home column.
- **Smart Product Selector (DR-112):** restyled to v3 inside `.v3-selector`: mode chips, preset chips, white cards with navy borders, room rows with steppers, covering packages as ice pills without prices, a primary WhatsApp button, the estimate line in `#0B70B7` and the simulator link.

## Accessibility and bidi rules

- WCAG AA contrast (small blue text `#0B70B7`), 44px targets, visible `:focus-visible` (3px `#18A3E0`).
- Reduced motion removes smooth scrolling, animations and transitions.
- Correct RTL/LTR order. The Latin logo is never mirrored.
- Numbers, model ids and the phone number are isolated LTR. `<Bidi>` wraps a mixed Arabic sentence in one inline element, so the spaces next to an isolate survive inside flex containers. The visual suite (`BIDI-SPACING`) fails if an Arabic letter touches an isolate.
- Arabic pages use Latin digits for prices and figures.
- **One Arabic register per page:** the v2 and v3.1 public screens use the design reference's Arabic verbatim (Egyptian colloquial where the reference uses it; short neutral labels on the controllers and packages headers). Full MSA prose remains only on the gated pages and on legacy pages that render in the local synthetic test harness.
- **Review viewports:** 390, 768 and 1440 px in Arabic and English.

# OTONOM Web Design System — v2

This design system replaces the Hybrid 03 page styling (DR-099). The logo and brand asset files are unchanged: the locked Hybrid 03 artwork in `app/web/public/brand/otonom/` is used byte-for-byte. Source of the look: the owner-approved Claude Design v2 reference, kept privately as design data.

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

- The contact channel has a single source: `lib/contact.ts` (DR-101). It holds the number, `tel:`, `wa.me` and the reference message texts. There is no form, storage or analytics.

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

- Fonts are self-hosted with `next/font/local` from `app/web/src/fonts/` (OFL 1.1, licences and SHA-256 list in its README). There is no request to a font provider at build or run time, and the CSP stays `font-src 'self'`.
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
  - Desktop nav pills: Home · Services ▾ · Controllers · Packages · Work · Contact. The active pill has a 1px navy border and `aria-current`.
  - Then the language link and "Book a visit" (WhatsApp).
  - Below 1000px: the language link and a 44×44 hamburger (`<details>`). The drawer holds all main pages plus Solutions, Company, Engineering process, Project Builder and Support, then a full-width "Book a visit". Escape closes it and returns focus to the button.
- **Footer:** navy, the locked `primary_dark.svg` at 240px, phone (`tel:`) and WhatsApp, three link groups (main pages, services, company and support), and "© 2026 OTONOM" in `#B8DDF3`.
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

## Accessibility and bidi rules

- WCAG AA contrast (small blue text `#0B70B7`), 44px targets, visible `:focus-visible` (3px `#18A3E0`).
- Reduced motion removes smooth scrolling, animations and transitions.
- Correct RTL/LTR order. The Latin logo is never mirrored.
- Numbers, model ids and the phone number are isolated LTR. `<Bidi>` wraps a mixed Arabic sentence in one inline element, so the spaces next to an isolate survive inside flex containers. The visual suite (`BIDI-SPACING`) fails if an Arabic letter touches an isolate.
- Arabic pages use Latin digits for prices and figures.
- **One Arabic register per page:** the v2 marketing pages (Home, Contact) use the reference's Egyptian colloquial; inner, technical and legal pages stay MSA.
- **Review viewports:** 390, 768 and 1440 px in Arabic and English.

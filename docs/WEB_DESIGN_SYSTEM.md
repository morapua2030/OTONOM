# OTONOM Web Design System — Hybrid 03

## Reference lock

- Build target: the supplied Hybrid 03 desktop, mobile and digital-application references.
- Primary source: the locked source artwork and tokens in `app/web/public/brand/otonom/`.
- Preserve: navy technical canvas, generous light space, crisp rules, exact toggle-O wordmark, tracked technical labels, real product photography and asymmetric information hierarchy.
- Reject: the retired split-ring mark, redrawn logos, decorative logo animation, generic glowing orbits, card-heavy SaaS layouts, invented devices, fabricated projects and unapproved claims.

## Brand roles

| Role | Token | Use |
|---|---|---|
| Primary canvas and dark sections | `#0F2238` | Header contrast, engineering/process sections, footer |
| Primary action and focus | `#18A3E0` | One primary CTA, focus ring, active progress |
| Links and secondary emphasis | `#148CE1` | Text links and selected controls |
| Supporting surface | `#E8F6FD` / `#B8DDF3` | Informational bands, selected fields, technical dividers |
| Main surface | `#FFFFFF` | Reading canvas and controls |

Logo assets keep their original bytes and internal colors. `primary_light.svg` is used on light surfaces; `primary_dark.svg` on navy/dark surfaces. RTL never mirrors Latin artwork.

The source blue remains `#148CE1` for large/decorative brand roles. Small text links and solid actions use the same-hue accessibility derivative `#0B70B7`, which reaches WCAG AA against white and the approved soft-blue surface; this never recolors the logo artwork.

## Type, spacing and components

- English: system sans stack. Arabic: system Arabic stack with Tahoma fallback.
- Display: fluid 42–80 px, tight leading; body: 16–20 px with a maximum readable measure of 68 ch.
- Spacing follows an 8 px base and a 24 px reading rhythm. Section spacing is 72–128 px on desktop and 48–80 px on mobile.
- Corners are restrained: 0–6 px for technical rows, 12 px for controls, 20 px only for large interactive panels.
- Buttons, fields, tabs and selectable rows use explicit hover, active, disabled and `:focus-visible` states.
- Motion is functional only: 120 ms feedback, 200 ms state changes, none when reduced motion is requested.

## Page composition

- Shell: full source wordmark, quiet navigation, one clear project-start CTA, structured navy footer.
- Home/corporate: technical editorial hero, four equally weighted disciplines, process proof, real OTONOM product evidence.
- Services: shared hero and section grammar, outcome selector, engineering-layer explorer and truthful deliverables.
- Portfolio: editorial empty state and URL-synchronised filters; no fabricated case studies.
- Builder/packages: six visible stages, low-friction choices, explicit privacy gate and approved package facts only.
- Products/D6: genuine 4R/6R/16R imagery, published facts, preliminary selection guidance and no transactions.

## Accessibility and QA

- WCAG AA contrast, 44 px touch targets, semantic links/buttons and visible keyboard focus.
- Correct RTL/LTR source order; numbers and model identifiers remain isolated LTR.
- Images retain explicit dimensions. Reduced motion removes transforms and smooth scrolling.
- Required review viewports: 390×844, 768×1024 and 1440×1000 in Arabic and English.

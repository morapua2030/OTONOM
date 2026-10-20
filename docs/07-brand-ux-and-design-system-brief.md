# Brand, UX and Design-System Brief

| Doc ID | OTONOM-DOC-07 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. **Not visual implementation permission** |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Creative principles, brand-asset requirements, interaction patterns, the UX state catalogue, and RTL/accessibility rules. Final visuals require design approval.

## 2. Brand inputs (BLOCKED until supplied: DR-009)
| Asset | Needed format | Status |
|---|---|---|
| Logo (primary, mono, icon) | SVG/AI/EPS | Not supplied |
| Colour palette | HEX/RGB + usage rules | Not supplied |
| Typeface(s), Latin + Arabic | Font files + **web licence** | Not supplied |
| Existing brand guide / company profile | PDF | Not supplied |

**Rules:**
- Do not guess brand tokens.
- Do not substitute assets from any unrelated project (explicitly: not the unrelated clothing-brand project mentioned by the owner).
- If the brand font lacks Arabic glyphs, propose a licensed Arabic companion with matching weight and x-height, for owner approval.

## 3. Creative principles
Calm, confident, sophisticated (Apple-like restraint) · authentic engineering photography over stock imagery · meaningful technical storytelling · generous whitespace, clear hierarchy · restrained motion that respects `prefers-reduced-motion` · content usable without animation, WebGL, or (where feasible) JavaScript.

## 4. Token proposal (structure only; values come from brand files)
```text
color.{brand.primary, brand.secondary, neutral.0-900, surface, text.primary, text.muted, border, focus, success, warning, danger, info}
type.{family.latin, family.arabic, scale: xs…5xl, lineHeight.ar (taller), lineHeight.en, weight.regular/medium/bold}
space.{0…16} (4px grid) · radius.{sm, md, lg} · shadow.{sm, md} · motion.{duration.fast/normal, easing.standard, reduced}
breakpoint.{sm 360, md 768, lg 1024, xl 1280}
z.{header, overlay, modal, toast}
```
Contrast: text ≥ 4.5:1, large text and UI components ≥ 3:1 (WCAG 2.2 AA).

## 5. UX state catalogue (mandatory per functional screen)
| State | Required behaviour | Example screens |
|---|---|---|
| Default | Clear primary action | All |
| Loading | Skeleton or progress. No layout shift | Catalogue, dashboards |
| Empty | Explains why + next action | Devices (with "claim a device"), orders |
| Success | Confirmation + reference + next step | RFQ, order, ticket |
| Validation error | Field-level, localized, announced to screen readers | Forms |
| Permission denied | Neutral message. No data leak. Login/contact option | Portal, admin |
| Expired session | Preserve unsaved input where safe. Re-auth | Admin, portal, checkout |
| Duplicate submission | Return the existing reference (idempotent) | RFQ, order |
| Offline / network failure | Retry with a preserved draft. No false success | Forms |
| Missing translation | Public: block publish (doc 14). Admin: visible warning | CMS |
| Unavailable inventory | "Available on request / notify" path. Never a silent oversell | Product, checkout |
| Stale price | Show the change and require acknowledgement | Checkout, confirmation |
| Cancelled order | Reason + next steps | Order status |
| Incomplete warranty | "Registered, terms pending approval". No end date | Warranty |
| Unverified ownership | Claim-in-review status + what is needed | Devices |
| Custom quotation under review | Expected response window (once SLA approved) | Shop/RFQ |
| Server failure | Apology, reference ID, retry, human contact | All |

## 6. Interaction patterns and components (later build)
Global navigation (locale switch, B2B entry, shop, support) · hero with dual CTA · project card · integration capability card with evidence badge (`Tested in project`, `Documented`, never "Certified" without a certificate) · controller comparison table (responsive) · stepper forms with progressive disclosure · secure file upload (progress, type/size hints, scan status) · quote status chip · warranty timeline (no end marker while pending) · bilingual toast/error · consent notices · responsive data tables for admin.

## 7. RTL / bilingual rules
- `dir`/`lang` on `<html>`. CSS logical properties. Mirror directional icons only (not logos, media controls or charts).
- Wrap SKUs, model codes, phone numbers, emails, CAD file names and measurements in LTR isolates (`<bdi>`/`dir="ltr"`).
- Numerals: Western digits for prices, SKUs and specs in both locales (PROPOSED). The Arabic body-copy numeral style is OPEN.
- Arabic typography: larger line-height, no letter-spacing, no faux italics.
- Test long Arabic headings at 360 px width, and mixed-script strings.

## 8. Accessibility acceptance (summary; tests in doc 20)
Keyboard operability of all forms and the cart · visible focus · labelled fields and error association · announced status changes (`aria-live`) · captions/transcripts for project videos (OPEN who produces them) · reduced motion · touch targets ≥ 24×24 CSS px (WCAG 2.2 minimum; 44 px preferred) · screen-reader spot checks in AR and EN.

## 9. 3D / 2D experience (DEFERRED: DR-034)
When revisited: load only on explicit user action and only on capable desktops. Provide a 2D mobile alternative. Content must never depend on WebGL. The existing local Blender work (`D:\OTONOM_Blender_Project`, not inspected this session) may become input then.

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner supplies brand assets. A design concept round follows only after Stage 2 approval.

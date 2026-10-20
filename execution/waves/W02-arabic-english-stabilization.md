# WAVE 2 — Arabic / English Stabilization

Date: 2026-10-14/15. Scope: bidirectional text, localized SEO metadata, responsive layout, form accessibility, and Arabic admin editing.

## 1. Defects found and fixed
| ID | Origin | Defect | Fix | Proof |
|---|---|---|---|---|
| V6-D1 | spike | LTR token in an Arabic heading, e.g. "(V-6)", mirrored/split | `<Bidi>` isolates each Latin/number run including its brackets, in all headings and body text | unit test D1; `ar_preview_bidi-samples-*.png` |
| V6-D2 | spike | Phone number reordered in an RTL input | `dir="ltr"` on tel/email/number/date inputs; `<Ltr>` for displayed tokens | probe `LTRFIELDS` + `LTR-ORDER` |
| V6-D3 | spike | ISO date / percent reordered | Same; percent and units stay inside the run | unit test D3 |
| W2-D4 | new | `<option>` labels such as "3–6 أشهر" can render as "6–3" (no markup allowed in `<option>`) | `isolateText()` wraps runs in Unicode LRI…PDI | probe `BIDI` (was 6 failures) |
| W2-D5 | new | Page titles and meta descriptions in Arabic were not isolated ("… — OTONOM") | Isolated titles/descriptions; Arabic title template isolates OTONOM | probe `BIDI` |
| W2-D6 | new | Phone number and CAD file name broke across lines inside their LTR run at 360 px | Runs of 40 characters or fewer and `<Ltr>` tokens are `white-space: nowrap` | new probe `NOWRAP` (character rectangles on one line) |
| W2-D7 | new | Data table clipped its last column at 360 px | Compact table cells on narrow screens; currency digits shortened (whole pounds) | new probe `TABLES` |
| W2-D8 | new | Currency inside an LTR isolate put "ج.م." on the wrong side for Arabic reading | `<Money>`: digits isolated LTR, currency label stays in the page direction | agent screenshot review |
| W2-D9 | new (found by the new probe) | A localized Arabic date wrapped in `<Ltr>` scrambled the month name | Rule: Arabic words never go inside `<Ltr>`; dates use `<Bidi>` | probe `LTR-ORDER` (was 3 failures) |
| W2-D10 | new | Language switch always went to the other locale's **home** page | `LangSwitch` keeps the current path | probe `LANGSWITCH` |
| W2-D11 | new | hreflang alternates pointed every page at `/ar` and `/en` (home); no canonical; one title for all pages; no meta description | `pageMetadata()` per page: canonical, reciprocal hreflang for the same path, localized title + description, always `noindex` | probes `HREFLANG`, `META`, `TITLE-DIFFERS` |
| W2-D12 | new | Skip link shared the honeypot's off-screen class, so it never became visible on focus | Separate `.skip` class, visible on focus | probe `SKIP` + CSS |
| W2-D13 | new | RFQ errors: each field had its own `role=alert`; no `aria-invalid`/`aria-describedby`; no focus management | Focused error summary (role=alert) with links to the fields; fields wired to their messages | probe `RFQ-ERRORS` |
| W2-D14 | new | Error summary repeated "هذا الحقل مطلوب" with no field names | Each summary item names its field | probe `distinct` |

## 2. Test evidence
| Suite | Result | Artefact |
|---|---|---|
| Unit: bidi run isolation + SEO helpers (`web/test/bidi.test.ts`) | 7/7 pass | console |
| Visual/RTL/SEO harness (`tests/src/visual.ts`) | **585/585 pass**, 76 screenshots | `execution/evidence/w2-visual-results.json`, `execution/evidence/screenshots/w2/` |

Visual harness coverage:
- **Pages:** home, solutions, developers, contractors, integrations, projects, RFQ, consultation, shop (gated), support/warranty (gated), preview notice, test-only bidi samples.
- **Locales and widths:** ar and en, at 360, 768 and 1366 px.
- **Probes:**
  - lang/dir;
  - no horizontal overflow;
  - un-isolated mixed runs;
  - character order inside LTR isolates;
  - no wrapping inside short tokens;
  - tables fit;
  - field labels and LTR fields;
  - single h1 and skip link;
  - noindex, localized title/description, canonical + hreflang;
  - language switch target;
  - RFQ error state;
  - admin editor field direction (ar RTL, en LTR) after a real EDITOR password + TOTP sign-in.

**Method:** installed Microsoft Edge (headless), driven over the DevTools Protocol with exact device-metrics emulation.

## 3. Conventions now in force
- `<Bidi text locale>` for any free text that may contain Latin or numbers in Arabic pages (headings, paragraphs, cards, CMS fields).
- `<Ltr>` only for purely technical tokens: SKU, serial, phone, e-mail, reference, file name, unit, numeric value. **Never Arabic words.**
- `isolateText()` / `ltrIsolate()` for plain-text contexts: `<option>`, `<title>`, attributes.
- `<Money>` for amounts. Format helpers use Western digits in both locales (**PROPOSED**; switchable to Arabic-Indic in `lib/format.ts`).
- Test-only page `/[locale]/preview/bidi-samples` (404 unless `OTONOM_TEST_PAGES=1`).

## 4. Limits and open items
- **Human visual review: PENDING.** Automated passes and the agent's own screenshot review do not replace it. Checklist: `W02-human-visual-review-checklist.md`.
- **Native date input format** (`10/14/2026` in Edge headless) follows the browser/OS locale, not the page. Flagged for human review; a custom date field is possible later.
- **Admin UI chrome is English** (A4: acceptable initially). Only localized content fields are RTL.
- **Not covered:**
  - real screen-reader testing (NVDA/JAWS/VoiceOver);
  - colour-contrast measurement against official brand colours (brand tokens are placeholders);
  - other browsers (Chrome, Safari, Firefox).

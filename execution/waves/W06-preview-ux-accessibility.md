# WAVE 6 — Preview UX and Accessibility

Basis: planning doc 05 (homepage narrative, page specifications, copy standards, responsive/RTL/accessibility constraints).
Brand: the owner has not supplied brand files (B-09), so **all colours and type are labelled placeholder tokens**. System fonts only: no downloads and no licence question. **No imagery, no 3D** (deferred).

## 1. What changed
| Area | Change |
|---|---|
| Visual system | Neutral placeholder palette with contrast-checked tokens, typographic scale, sticky header, 44 px buttons, cards, numbered steps, FAQ disclosure, dark CTA band, three-column footer. Logical CSS properties throughout (RTL-safe) |
| Navigation | Desktop navigation plus a **no-JavaScript disclosure menu** under 900 px. Language switch keeps the current page (WAVE 2) |
| Homepage | Follows the doc 05 §1 narrative: hero → process pillars → "How a project runs" (instead of an identified project) → engagement models → honest integration depth → solution scenarios labelled *illustrative* → controllers (4/6/16, no specs or prices) → final CTA. "Engineering proof" is omitted until evidence records exist (doc 05 fallback) |
| Developers / multi-unit | Pains → process → engagement models → engineering FAQs → "helpful to have for your request" → CTA band (RFQ in ≤ 2 clicks) |
| Contractors / partners | Audience → benefits (no prices; "datasheets on request") → engagement models → partner inquiry CTA |
| Solutions / Technology | Scenario cards (illustrative, scope per project); controller overview without numbers |
| Copy | `lib/content.ts`. Only process facts from the planning documents, or statements marked illustrative / confirmed per project. No counts, capacity, certifications, compatibility or prices. Still **PLACEHOLDER**, awaiting native copy editing and owner approval |
| Accessibility | Focused error summary; aria wiring; 24 px checkboxes; skip link; landmarks; single h1; disclosure menu reachable by keyboard |

## 2. Automated evidence (visual harness, **729/729 pass**)
Run: 12 pages × 2 locales × 3 widths, plus the admin editor in both locales.

New accessibility probes, all passing on every page at 360 px:
| Probe | Rule |
|---|---|
| Colour contrast | ≥ 4.5:1, or 3:1 for large text, against the effective background |
| Headings | No skipped heading levels |
| Accessible names | Every link, button and summary has one |
| Landmarks | Header, nav, main and footer present |
| Target size | Interactive targets ≥ 24 × 24 px (WCAG 2.2 2.5.8) |
| Ids | No duplicate ids |

The first run found the RFQ checkboxes at about 13 px (4 failures). They were fixed to 24 px.

## 3. Limits
- These are **automated approximations**, not a WCAG audit:
  - no screen-reader session (NVDA/JAWS/TalkBack/VoiceOver);
  - no keyboard-only walkthrough by a person;
  - no cognitive or plain-language review.

  Formal audit: B-28.
- **Contrast** is measured against computed background colours only (no images exist yet).
- **Mobile homepage length:** about 5,600 px at 360 px wide (six scenario cards plus seven process steps). The content owner may want a shorter mobile variant.
- **Analytics events** from doc 05 (`cta_click`, `rfq_start`…) are not implemented: no analytics tool or consent approach has been approved.
- **Human visual review** remains PENDING (checklist in W02).

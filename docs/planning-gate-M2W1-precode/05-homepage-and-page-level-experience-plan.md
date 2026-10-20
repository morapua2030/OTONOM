# 05 — Homepage and Page-Level Experience Plan

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT (paper only. No mockups or code) |
|---|---|---|---|---|---|---|---|

## 1. Homepage narrative (PV vs CR)
| # | Section | Purpose | Mandatory proof | PV content | CR delta | Fallback if proof missing |
|---|---|---|---|---|---|---|
| 0 | Preview banner | G-2 honesty | — | "Preview: online ordering and the customer portal launch later" + link `/preview` | Removed | — |
| 1 | Hero | Position as an integration partner for residential projects | Authorised imagery | Headline + "Request a Proposal" + "View our work" | Same | Abstract/illustrative visuals labelled as such, no client imagery |
| 2 | Trust strip | Credibility | Facts from records only | Process pillars (design → supply → install → commission → support) | + store/support pillars | No numbers |
| 3 | Featured project | Show real outcomes | **Written consent** + media screening | Consented case study | Same | "How a multi-unit project runs with OTONOM" process story (no identification) |
| 4 | For developers & contractors | B2B route | — | Engagement models, multi-unit process, CTA | Same | — |
| 5 | Integration depth | Differentiation | Claim registry status ≥ evidenced | Scenario cards + local/cloud honesty note | Same | Safe generic copy (doc 11) |
| 6 | Solutions matrix | Exploration | — | Rooms/functions/scenes cards | Same | — |
| 7 | Controllers | Product awareness | Datasheet for any numbers | 4/6/16 overview, "online ordering at commercial launch" | Prices + Shop CTA | No ratings or prices |
| 8 | Engineering proof | Trust | Evidence records | Documentation/testing **only where evidenced** | + warranty terms (approved) | Omit section |
| 9 | Final CTA | Conversion | — | Request a Proposal + Book consultation | Same | — |

**Performance intent:** text-first hero. Hero media ≤ the LCP budget (doc 17). No autoplay video with sound. No 3D.

## 2. Page specifications
| Page | Audience | Purpose & key message | Mandatory proof | CTA → conversion | Content fields (CMS) | SEO intent | Analytics events (consent-aware) | Fallback |
|---|---|---|---|---|---|---|---|---|
| Developers/Compounds | P1 | "Repeatable multi-unit delivery with documented commissioning" | Process doc. Capacity statement only if evidenced | RFQ → `rfq_submitted` | Hero, pains, process steps, engagement models, FAQs, case refs | "smart home for compounds Egypt" (AR/EN research pending) | `cta_click{location}`, `rfq_start` | Remove the capacity claims |
| Contractors/Partners | P2/P3 | "Specify and supply with engineering support" | Datasheets when approved | Partner inquiry → `partner_inquiry_submitted` | Eligibility, benefits (no prices), docs links | "relay controller supplier Egypt" | `partner_inquiry_start` | "Datasheets on request" |
| Solutions hub/segments | P4/P1 | Scenarios + dependencies | Implemented vs concept labels | Consultation | Scenario: title, rooms, components, dependencies, safety note, `IMPLEMENTED/CONCEPT` | "villa smart lighting control" | `scenario_view` | Mark CONCEPT |
| Scenario explorer | P4 | Browse by room/function | as above | Consultation | Card grid filters | — | `filter_used` | — |
| Projects index/detail | All | Real outcomes | Consent + screening | "Plan a similar project" → RFQ prefill | Objectives, scope, systems, outcomes, limitations, media w/ rights | project-type queries | `case_study_view` (aggregate) | Process story |
| Integrations | P3/P4 | Honest capability map | Claim registry | Consultation / custom RFQ | Matrix rows from the registry only | "home assistant relay controller" | `integration_row_expand` | Safe copy |
| Controllers / Product detail | P5/P2 | Choose the right model | Datasheet revision | PV: contact. CR: add to cart / quote | Model, channels, use cases, specs (from datasheet), options, docs | "4 channel smart relay controller" | `product_view`, `add_to_cart` (CR) | No specs |
| Shop (CR) | P5 | Purchase standard items | Prices approved | Cart | Listing, filters | — | `begin_checkout`, `order_submitted` | Not live in PV |
| RFQ | P1–P4 | Structured brief | Privacy notice | Submit | doc 06 | Indexable landing page. Submission endpoints and confirmation pages `noindex` | `rfq_step_completed{n}`, `rfq_submitted` | P-A contact form |
| Contact | All | Reach a human | — | Contact submit | Channels, hours | brand | `contact_submitted` | — |
| Support (PV) | P6 | Explain current service path | — | Contact support | Steps, channels | — | — | — |
| Login/Account (CR) | P6/P5 | Access portal | — | Login | — | noindex | `login_success` | — |
| Warranty & Service (CR) | P6 | Coverage + tickets | Approved policy | Claim device / open ticket | doc 09 | "OTONOM warranty" | `ticket_created` | Not live without policy (G-4) |

Analytics principle: proposal/contract outcomes come from server-side CRM records, **not** browser trackers. Browser events run only after consent where required.

## 3. Copy standards
- Plain, confident, specific. No hype words ("revolutionary", "No.1").
- Integration claims follow the doc 11 templates. Safety-related functions always mention physical fail-safes and electrician installation.
- Arabic is native-written or native-edited (not raw machine translation). Technical terms keep the English term in brackets on first use if helpful.
- Numbers use Western digits for specs, prices and SKUs (PROPOSED).

## 4. Responsive, RTL, accessibility constraints
360 px minimum layout · logical CSS properties · mirrored directional icons only · bidi isolation for codes/phones · WCAG 2.2 AA · focus order follows reading direction · reduced-motion support · form errors announced in both languages.

## 5. Visual asset taxonomy (with rights metadata)
| Asset type | Required metadata | Gate |
|---|---|---|
| Vector brand marks | Source file, version, usage rules | Owner supplies |
| Fonts | Licence (web), AR/Latin coverage | Licence proof |
| Project photography/video | Project, consent record ID, scope, screening result, crops | Written consent + screening |
| Diagrams | Sanitised version flag, author, review | Engineering review |
| Controller packshots | Model, revision, photographer rights | Rights |
| Illustrations/stock | Licence, "illustrative" flag | Licence |

## 6. Future 3D/2D (DEFERRED)
- Requirement sketch: desktop 3D house (on explicit user action only), mobile 2D, non-WebGL fallback.
- Content parity: everything shown in 3D is also available as text/cards.
- Performance budget set at that time.
- The PV/CR alternative is the scenario card explorer (§2).

## 7. Risks
Promising commerce/warranty in the preview (mitigation G-2) · publishing an identified project without written consent (consent gate) · claims outrunning evidence (registry gate) · thin Arabic copy (native editor).

## Sign-off (Wave 3b)
PV/CR deltas explicit ✅ · Fallback per page ✅ · No fake live features ✅

# 02 — PRD v1 Reconciliation and Gap Analysis

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. Reconciles `docs/03-prd-v1-draft.md` (v2) with M3P |
|---|---|---|---|---|---|---|---|

## 1. Purpose and sources
- Re-baseline the PRD under the approved M2 + W1 strategy.
- Tag each major requirement with its status and its stage (**PV** = B2B Preview, **CR** = First Commercial Release, **FUT** = later).
- Expose gaps, and critique the scope size.

Sources: M3P §1–2 (APPROVED/CONFIRMED), `docs/03` (EXTRACTED requirement IDs `FR-*`), `docs/01`, `docs/02` (v2 ledger), doc 01 of this pack.

## 2. Vision and opportunity (summary)
- **Vision:** OTONOM's website becomes the trusted front door for multi-unit Smart Home projects in Egypt, and the operational backbone for controller sales and after-sales service.
- **Opportunity:** Developers and contractors need repeatable, documented integration partners. Homeowners need honest guidance. Existing customers need visible service.
- **Market horizon:** Egypt now (APPROVED). The Gulf is a later possibility with no launch claims (APPROVED).
- **Competition benchmarking:** **SOURCE MISSING.** No competitor analysis was supplied. Proposed task: benchmark 5–8 Egyptian and regional Smart Home integrators on positioning, proof and RFQ UX before the copy is finalised (owner/marketing, PV dependency, not a coding blocker).

## 3. Value propositions per stage
| Stage | Value proposition | Must be true before public |
|---|---|---|
| **PV** | "Credible engineering partner for compounds and multi-unit projects": company story, safe verified case studies, capability pages, consultation path, RFQ intake **only if the secure-collection gate passes** (else an informational variant) | G-2 labelling. Consent for any identified project. Privacy notice if any PII is collected |
| **CR** | Everything in PV + a controller store with configured orders, manual payments, inventory/serials, plus the **real warranty/service portal** (W1) | G-3, G-4. Policies approved. Operational tests passed |
| **FUT** | 3D/2D experiences, partner portal depth, ClickUp sync, payment gateway, marketplace evaluation | Separate approvals |

## 4. Requirement baseline with status and stage
(IDs reuse v2 `FR-*` where they exist. New IDs are prefixed `FR3-`.)

| Area | Requirement | v2 ID | Status | Stage |
|---|---|---|---|---|
| Web | AR/EN with RTL/LTR, `hreflang`, locale switch | FR-WEB-001 | APPROVED | PV |
| Web | Preview banner + "preview" labelling on all pages. No live-store/portal claims | FR3-PV-001 | APPROVED (G-2) | PV |
| Web | Feature gating: shop/cart/checkout/account routes are disabled (not hidden-but-reachable) in PV | FR3-PV-002 | PROPOSED (implements G-1) | PV |
| Web | Homepage narrative order (trust before retail) | FR-WEB-003 | APPROVED (principle) | PV |
| Web | No superlatives, certifications, ratings or counts without evidence | FR-WEB-005 | APPROVED | PV |
| Web | No app-store badges/links until published | FR-WEB-006 | APPROVED | PV |
| RFQ | Short progressive RFQ. Optional enrichment. Optional uploads | FR-RFQ-001/002/003 | APPROVED (progressive, optional upload) / PROPOSED (fields) | PV (variant P-B) or CR |
| RFQ | Preview variant choice: P-A informational + basic contact form (no files) vs P-B full secure RFQ | FR3-PV-003 | OPEN | PV |
| RFQ | Engagement model field (supply / supply+install+program / design-build) | FR3-RFQ-001 | CONFIRMED_BY_OWNER | PV |
| RFQ | Free consultation, paid survey by agreement | FR-CRM-004 | APPROVED | PV |
| CRM | Opportunity state machine, proposals, contracts, handoff | FR-CRM-001…008 | APPROVED (need) / PROPOSED (states) | PV (internal) |
| CRM | Partner negotiated pricing, approval-gated, never public | FR3-CRM-001 | APPROVED | CR |
| ATT | Exclusive attribution classes. Orthogonal NEW/EXISTING cohort | FR-ATT-001…004 | APPROVED | PV (capture) / CR (full dashboards) |
| ATT | North Star headline | — | OPEN | — |
| CAT | 4/6/16 catalogue, standard options, quote-only custom items | FR-CAT-001…003 | APPROVED (structure) / OPEN (SKUs, prices) | CR (PV: informational product pages, no prices if unapproved) |
| ORD | Cart → order → staff confirmation. Reservation at confirmation | FR-ORD-*, FR-INV-002 | APPROVED (reserve at confirmation) | CR |
| PAY | COD (eligible), bank, wallet with human verification. No gateway | FR-PAY-* | APPROVED | CR |
| INV/SER | Ledger, invariants, serial uniqueness and lineage | FR-INV-*, FR-SER-* | APPROVED (need) / PROPOSED (design) | CR |
| WAR | Ownership verification, commissioning-linked coverage, approved policy, tickets/RMA, status | FR-WAR-*, FR-SVC-* | APPROVED (W1, G-3) | CR |
| WAR | Policy-pending display only outside live selling | FR3-WAR-001 | APPROVED (G-4 consequence) | PV/staging |
| CMS | Localized content, Draft → Review → Publish, revisions, SEO, AI flagged | FR-CMS-* | APPROVED | PV |
| CMS | Written consent before identified case studies | FR-CMS-003 | APPROVED | PV |
| ADM | Store and Projects workspaces. Shared auth. RBAC-ready | FR-ADM-001, FR-IAM-* | APPROVED | PV (Projects, Content) / CR (Store, Service) |
| ADM | MFA for privileged users | FR-IAM-002 | PROPOSED | PV |
| AUD | Audit of sensitive changes | FR-AUD-001 | APPROVED (need) | PV |
| OPS | Manual ClickUp handoff | FR-CRM-007 | APPROVED | PV |
| NFR | Performance, a11y, security, privacy, backups | NFR-* | PROPOSED thresholds | PV/CR |

## 5. Business rules that v2 left vague, now made explicit
| Rule ID | Rule | Status |
|---|---|---|
| BR-01 | A retail web order is **never** a "signed contract" for KPI purposes. Only signed B2B/B2C project or supply agreements with a contract record count (doc 07) | PROPOSED (finance to confirm) |
| BR-02 | A project RFQ can't be converted into a cart. A cart line flagged custom can't be checked out without an approved quote | APPROVED principle |
| BR-03 | Any line whose price is "quote required" makes the order total `PENDING QUOTE` | APPROVED |
| BR-04 | Preview routes for shop, cart, checkout and portal return "available at commercial launch" pages. No forms accept orders | PROPOSED (G-1) |
| BR-05 | A warranty coverage end date is computed only from an approved policy version. Otherwise the field stays null and the UI says "terms pending" (non-live only) | APPROVED (G-3/G-4) |
| BR-06 | Electrical ratings appear only from an approved datasheet revision | APPROVED |
| BR-07 | Identified project media need written consent scoped to each asset | APPROVED |
| BR-08 | Engineer approval is required for custom firmware/integration quotes. Finance/owner approval is required for discounts beyond standard | APPROVED (engineer) / PROPOSED (discount approver) |
| BR-09 | COD is only for standard items, in eligible zones, under a value cap | PROPOSED |
| BR-10 | The free consultation creates no invoice. A paid survey requires an accepted fee agreement | APPROVED |

## 6. Gap matrix
| # | Gap | Source status | Proposed fix | Approving owner | Milestone impact |
|---|---|---|---|---|---|
| G01 | Competitor benchmark | SOURCE MISSING | Desk research task (no customer data) | Owner/marketing | PV copy quality |
| G02 | Company profile/portfolio content | SOURCE MISSING | Owner supplies. Editorial rewrite AR/EN | Owner | PV content |
| G03 | Brand files + font licences | SOURCE MISSING | Owner supplies | Owner | PV design |
| G04 | Written consent for the apartment | BLOCKED | Obtain signed consent with asset scope | Owner + client | PV case study (fallback: anonymised process story) |
| G05 | Integration test evidence | SOURCE MISSING | Supply reports. Fill the claim registry (doc 11) | Engineering | PV integration page (fallback: safe copy) |
| G06 | Preview variant P-A/P-B | OPEN | Decide after the doc 14/18 security comparison | Owner | PV scope |
| G07 | Privacy notice AR/EN | BLOCKED | Legal drafting | Legal | PV (if any PII is collected) |
| G08 | Price list, options, SKUs | SOURCE MISSING | Owner supplies | Owner | CR |
| G09 | Shipping tariff, COD zones/cap | SOURCE MISSING | Operations supplies | Ops | CR |
| G10 | VAT/e-invoicing obligations (Egypt e-invoice/e-receipt regimes may apply) | OPEN | Finance/tax adviser confirms | Finance | CR |
| G11 | Warranty policy | BLOCKED | Legal/business drafting | Owner + legal | CR (G-4) |
| G12 | Returns/shipping/terms policies | BLOCKED | Legal drafting | Legal | CR (G-4) |
| G13 | RMA SOP | SOURCE MISSING | Supply the document. Map it to the states (doc 09) | Ops | CR |
| G14 | Serial source/read method | SOURCE MISSING | Engineering note | Engineering | CR |
| G15 | Legacy devices/customers import (pre-platform) | OPEN | Minimal list: identifiers + first contract/commissioning date | Owner | CR (portal claims, cohort KPI) |
| G16 | Installation capacity/coverage | SOURCE MISSING | Ops statement per governorate | Ops | PV (claims), CR (promises) |
| G17 | Technician commissioning capture (mobile-friendly, possibly offline on site) | OPEN | Design in doc 09. Device/app choice later | Engineering | CR |
| G18 | Support channel and hours during PV (off-site warranty) | OPEN | Publish the existing contact path | Owner | PV |
| G19 | Notification channels (email/WhatsApp/SMS) | OPEN | Email first. WhatsApp only via an approved business API (cost/approval) | Owner | PV/CR |
| G20 | Data retention schedule | OPEN | Legal | Legal | PV (files), CR |
| G21 | North Star headline | OPEN | Owner choice (doc 07) | Owner | Dashboard headline only |
| G22 | Contract-value accounting | OPEN | Finance | Finance | KPI finalisation |
| G23 | Spike thresholds + test runtime | OPEN | Doc 16 | Owner | Before code |

## 7. Independent scope critique (preserving M2 + W1)
1. **The commercial release is the heavy part.** Store + inventory + serials + manual payments + warranty portal + commissioning + RMA, with **policy approvals as hard gates**. The critical path is likely to run through legal/policy and data inputs (prices, serials, warranty), not through code.
2. **The preview must stay thin to deliver value early.** The biggest preview-scope lever is P-A vs P-B. P-B pulls in secure file handling (scanning, private storage, retention), which is a substantial security build.
3. **Don't build commerce screens before their inputs exist.** The domain model and transactional core can be built and tested with synthetic data once the stack is approved. Public commerce UI waits for SKUs and prices.
4. **The warranty portal depends on data that doesn't exist yet in structured form** (serials, commissioning records, legacy customers). Plan a data-onboarding workstream, not just software.
5. **One admin is a real operational constraint.** Any workflow that requires two humans (review/approve) degrades to a recorded single-actor exception until staff are added.

Recommended sequencing (detailed in docs 18/19):
1. Pre-code gate
2. Spike
3. Platform foundation
4. **PV** (P-A or P-B)
5. Commerce + warranty core (internal, synthetic data)
6. Data onboarding + policies
7. Operational rehearsal
8. **CR**

## 8. Non-goals (all stages until re-approved)
Web control of household devices · marketplace · 3D/2D house in PV/CR · payment gateway · ClickUp API · automated configurator · Gulf launch · unified mobile/web accounts.

## 9. Acceptance readiness
| Area | Acceptance criteria exist? | Where |
|---|---|---|
| RFQ/CRM | Yes | doc 06, doc 17 |
| KPI | Yes, with an illustrative dataset | doc 07 |
| Commerce/inventory | Yes | docs 08, 09, 17 |
| Warranty | Yes | docs 09, 17 |
| CMS/claims | Yes | docs 10, 11, 17 |
| Preview gating | Yes | docs 18, 17 |

## Sign-off (Wave 2a)
Every APPROVED item cites a source ✅ · Gaps have owners ✅ · Scope is not silently reduced ✅

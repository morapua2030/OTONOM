# Product Requirements Document — v1 DRAFT

| Doc ID | OTONOM-DOC-03 | Version | 2.0-draft (PRD v1) | Date | 2026-10-13 | Status | **DRAFT. Not approved** |
|---|---|---|---|---|---|---|---|

Tags: `[APR]` approved in master prompt v2 · `[CBU]` user-stated · `[PRO]` proposal · `[OPN]` open · `[BLK]` blocked · `[DEF]` deferred.
Priority: **P0** = required for the first commercial launch · **P1** = soon after · **P2** = later.

---

## 1. Executive summary
OTONOM needs a bilingual (AR/EN) commercial platform with five jobs:
1. prove Smart Home integration capability with verified evidence,
2. capture B2B project demand through a secure RFQ and an internal pipeline,
3. sell 4/6/16-channel controllers with honest pricing and manual payments,
4. support customers with a real warranty/service portal at the first commercial launch,
5. measure website-influenced signed contract value without double counting.

This PRD consolidates approved decisions and marks everything else as proposed or open. Detailed workflows live in docs 08–15. Architecture is in docs 16–17.

## 2. Business goals and North Star uncertainty
| Goal ID | Goal | Status |
|---|---|---|
| G-1 | Maximise signed contract value influenced by the website | `[APR]` |
| G-2 | Count all eligible new contracts (new + existing customers), cohorts separate | `[APR]` |
| G-3 | Sourced vs Assisted separately measurable, exclusive, no double counting | `[APR]` |
| G-4 | Protect margin and delivery capacity (don't win undeliverable work) | `[PRO]` guardrail |
| G-5 | Build trust: every public technical claim is backed by evidence | `[APR]` principle |

**North Star (DR-007): OPEN.**
- Option 1: Website-Sourced Signed Contract Value (KPI-001).
- Option 2: Total Website-Influenced Signed Value (KPI-003).
- Recommendation and reasons: doc 09 §6.

## 3. Scope and explicit non-goals
**In scope (first commercial launch, subject to packaging decision DR-041):**
- public bilingual site
- CMS with editorial workflow and evidence/consent gates
- B2B RFQ + Projects workspace (opportunity, proposal, contract, attribution)
- controller catalogue, cart, manual-payment orders, inventory ledger, serial traceability
- warranty/commissioning/service/RMA portal
- KPI dashboards
- security, privacy, audit, backups

**Non-goals** `[DEF]`: 3D/2D house experience, scene simulator, payment gateway, ClickUp API sync, marketplace, web IoT device control, automated configurator, broad distributor portal, Gulf launch, native apps (they exist separately).

## 4. Stakeholders and personas
Full detail is in doc 05.
- **External:** P-DEV (developer/compound), P-CON (contractor/consultant/partner), P-HOME (homeowner), P-RETAIL (controller purchaser), P-SERVICE (existing customer).
- **Internal roles** (one person at launch): Administrator, Sales Engineer, Store Operator, Content Editor/Reviewer, Service Engineer, Executive Viewer.

## 5. Primary journeys
| Journey | Path | Doc |
|---|---|---|
| J-1 B2B developer | Discover → projects → technical credibility → RFQ → triage → qualification → consultation → (paid survey) → proposal → negotiation → signed contract → handoff | 05, 08 |
| J-2 Contractor/partner | Products & docs → partner inquiry → eligibility check → approved partner terms → supply/integration agreement or order | 05, 08 |
| J-3 Homeowner | Solutions/scenes → case studies → consultation request → scoping → proposal → contract | 05, 08 |
| J-4 Retail/existing customer | Choose controller → configure standard options → order → staff confirmation + manual payment → fulfilment/installation → commissioning → device/warranty registration → service | 05, 10–13 |

The B2B project never goes through a fixed-price cart, and a simple controller purchase never goes through the enterprise RFQ.

## 6. Functional requirements
Each requirement is testable. Its acceptance tests are in doc 20.

### 6.1 Public website (WEB)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-WEB-001 | AR (RTL) and EN (LTR) for every public page, with locale-prefixed routes, `hreflang` and a language switch that keeps the equivalent page | P0 | APR / PRO (routing) |
| FR-WEB-002 | Sitemap per doc 06 (Home, About, Solutions, Business, Projects, Technology, Shop, Support, Insights, Contact, Consultation, Legal) | P0 | PRO |
| FR-WEB-003 | Homepage section order per doc 06 §3 (story → trust → projects → B2B → integration → solutions → process → controllers → proof → CTA) | P0 | APR (principle) |
| FR-WEB-004 | Use the original OTONOM logo, colours and fonts once supplied and licence-verified. No guessed brand tokens | P0 | APR / BLK on assets |
| FR-WEB-005 | No unsupported superlatives, certification badges, ratings, testimonials or project counts without evidence | P0 | APR |
| FR-WEB-006 | No app-store badges or links until the apps are publicly live | P0 | APR |
| FR-WEB-007 | Integration demonstrations are labelled as project-specific engineering, not native capabilities of every controller | P0 | APR |
| FR-WEB-008 | Legal/policy pages are published only after business and legal approval | P0 | BLK |
| FR-WEB-009 | Every functional screen implements the UX state catalogue (doc 07 §5) | P0 | APR |

### 6.2 B2B RFQ and sales (RFQ / CRM)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-RFQ-001 | A short progressive RFQ. Required fields: contact name, email/phone, organisation, customer type, project type, governorate/city, approximate units or circuits, basic scope, contact consent, preferred channel | P0 | APR (progressive) / PRO (field list) |
| FR-RFQ-002 | Optional advanced fields: project phase, timeline, services sought, ecosystem preference, budget range, floors/buildings, commissioning window, notes | P0 | PRO |
| FR-RFQ-003 | Optional secure upload of PDF, images and allow-listed CAD. Private storage, scanning/quarantine, signed access. Never emailed | P0 | APR |
| FR-RFQ-004 | Acknowledgement with a reference ID, without exposing private data | P0 | PRO |
| FR-RFQ-005 | Abuse controls: rate limiting, accessible bot protection, payload limits, dedupe, idempotent submit | P0 | APR |
| FR-RFQ-006 | Consent-aware capture of attribution context (landing page, referrer, UTMs, timestamps) | P0 | APR |
| FR-CRM-001 | RFQ case state machine with role-guarded transitions, reasons and timestamps (doc 08 §3) | P0 | APR |
| FR-CRM-002 | Organisations with multiple contacts. Duplicate detection suggests, a human confirms. Merges are audited and reversible | P0 | APR |
| FR-CRM-003 | Advisory composite qualification score (fit, legitimacy, feasibility, margin, location, capacity). Never auto-reject | P0 | PRO |
| FR-CRM-004 | Free consultation and paid site-survey records, with fee agreement and invoice reference | P0 | APR / OPN (fee) |
| FR-CRM-005 | Versioned proposals: line items, exclusions, assumptions, validity date, internal approval, customer response | P0 | APR |
| FR-CRM-006 | Contracts: unique ID, signed evidence, signed date, original currency and amount, tax treatment, status, amendments, cancellations. History is never erased | P0 | APR |
| FR-CRM-007 | Manual ClickUp handoff summary (copyable). No API | P0 | APR |
| FR-CRM-008 | Delivery handoff record with an assigned operations owner | P0 | APR |

### 6.3 Attribution and reporting (ATT / RPT)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-ATT-001 | Exactly one class per eligible contract: `WEBSITE_SOURCED`, `WEBSITE_ASSISTED`, `NON_WEBSITE` or `UNKNOWN` | P0 | APR |
| FR-ATT-002 | Classification is captured at the opportunity and frozen at contract signature. Corrections need role, reason, before/after and audit | P0 | APR |
| FR-ATT-003 | A page view alone never qualifies as Assisted. There is an evidence rubric (doc 09 §4) | P0 | APR |
| FR-ATT-004 | Customer cohort `NEW_CUSTOMER` / `EXISTING_CUSTOMER`, evaluated at signature, independent of attribution | P0 | APR |
| FR-RPT-001 | Executive, conversion, attribution-quality, projects and store dashboards (doc 09 §8) | P0 (exec + attribution) / P1 (others) | PRO |
| FR-RPT-002 | Reconciliation invariants hold (doc 09 §7). Every total drills down to contract IDs and evidence | P0 | APR |
| FR-RPT-003 | Pipeline value is never mixed into signed totals | P0 | APR |
| FR-RPT-004 | Exports respect permissions and minimise PII | P0 | PRO |

### 6.4 Catalogue, pricing, orders (CAT / ORD / PAY)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-CAT-001 | ProductFamily / ProductModel (4/6/16) / SKU / StandardOption / Configuration / CustomEngineeringRequest / PriceQuote / TechnicalDocument entities (doc 10) | P0 | APR (structure) / OPN (SKUs) |
| FR-CAT-002 | A compatibility matrix prevents impossible option combinations, with a human fallback | P0 | APR |
| FR-CAT-003 | Electrical ratings shown only from approved datasheets | P0 | APR |
| FR-PRC-001 | A known subtotal is labelled "final price subject to quotation" whenever any component is a quote item | P0 | APR |
| FR-PRC-002 | Price versions, quote validity, and changed-price acknowledgement | P0 | APR |
| FR-ORD-001 | Cart → submission → staff review → confirmation state machine with exception states (doc 11) | P0 | APR |
| FR-ORD-002 | Guest ordering with secure order-status access (non-enumerable reference + verification) | P0 | PRO |
| FR-ORD-003 | Idempotent submission and confirmation | P0 | APR |
| FR-PAY-001 | Manual payment records (COD/bank/wallet). Proof upload ≠ verified. Staff verification with reference and anti-duplicate checks | P0 | APR |
| FR-PAY-002 | COD eligibility rules (geography, value, product type) | P0 | OPN |
| FR-SHP-001 | Shipping by approved zone tariff. Unsupported zone → quotation path, never zero or invented | P0 | APR / BLK (tariff) |

### 6.5 Inventory and serials (INV / SER)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-INV-001 | Append-only stock ledger with the states from doc 12 §2 | P0 | APR |
| FR-INV-002 | Reservation happens in the same transaction as staff confirmation. Never oversell. Idempotent | P0 | APR |
| FR-INV-003 | Release exactly once on cancellation/expiry. Reconciliation job | P0 | APR |
| FR-INV-004 | Adjustments need a reason, an actor and audit | P0 | APR |
| FR-SER-001 | Unique serial per unit. Duplicates are rejected and quarantined | P0 | APR |
| FR-SER-002 | Unit lifecycle from receipt/QA to warranty/RMA/retirement (doc 12 §5) | P0 | APR |
| FR-SER-003 | Serial ↔ order line ↔ commissioning ↔ ownership ↔ warranty ↔ service lineage | P0 | APR |

### 6.6 Warranty, commissioning, service (WAR / SVC)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-WAR-001 | Customer accounts with **verified** device ownership. A serial alone never grants access | P0 | APR |
| FR-WAR-002 | Commissioning record (date, technician, evidence) starts coverage | P0 | APR |
| FR-WAR-003 | Versioned warranty policy. While the duration is unapproved: `PENDING_POLICY_APPROVAL` and **no end date** | P0 | APR / BLK |
| FR-SVC-001 | Service tickets and RMA lifecycle with escalation and safety messaging (doc 13) | P0 | APR |
| FR-SVC-002 | Replacement lineage (old ↔ new serial) with policy-driven coverage | P0 | APR |
| FR-SVC-003 | Internal notes and diagnostics are never shown to customers | P0 | APR |

### 6.7 CMS and content (CMS)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-CMS-001 | Content types per doc 14 §2, localized | P0 | APR |
| FR-CMS-002 | Draft → In Review → Approved → Published → Withdrawn, with revisions and rollback | P0 | APR |
| FR-CMS-003 | Publish guard: locales complete, evidence state sufficient for claims, consent for client media, SEO metadata | P0 | APR |
| FR-CMS-004 | AI-assisted content flagged and human-reviewed | P0 | APR |
| FR-CMS-005 | Transactional data (stock, payments, contracts, warranty, attribution) is never editable as CMS text | P0 | APR |

### 6.8 Administration, identity, audit (ADM / IAM / AUD)
| ID | Requirement | Pri | Tag |
|---|---|---|---|
| FR-ADM-001 | Distinct Store, Projects, Service and Content workspaces with shared identity | P0 | APR |
| FR-IAM-001 | Role/permission model (doc 18 §3), enforced server-side, even with one account | P0 | APR |
| FR-IAM-002 | MFA for admin and privileged staff | P0 | APR |
| FR-AUD-001 | Tamper-evident audit for contract values, attribution, approvals, stock, payment verification, warranty, publication, permissions | P0 | APR |

## 7. User-visible states and exceptions
Every screen must define these states (full matrix in doc 07 §5): default, loading, empty, success, validation error, permission denied, expired session, duplicate submission, offline/network failure, missing translation, unavailable inventory, stale price, cancelled order, incomplete warranty, unverified device ownership, custom quotation under review, server failure. **No dead ends:** each state offers a next action.

## 8. Non-functional requirements
Summary here, full list in doc 19.
- **Performance:** CWV budgets on real mobile devices.
- **Accessibility:** WCAG 2.2 AA in both directions.
- **Security:** OWASP ASVS L2 baseline.
- **Privacy:** Egypt PDPL review by counsel.
- **Reliability:** tested backup and restore.
- **Observability:** correlation IDs, structured logs, alerts.
- **Cost:** a target is needed (OPEN).

## 9. Bilingual content, branding, SEO, trust
Docs 06, 07, 14 and 15 cover:
- genuine RTL/LTR
- deliberate slugs and canonicals
- no half-translated public specs
- an evidence-state model for claims
- consent per asset
- an integration capability matrix

## 10. Attribution and dashboard data definitions
Doc 09: KPI-001…KPI-012, worked cases A–G, reconciliation invariants, dashboard IA.

## 11. Admin workspaces, permissions, audit
Doc 18 §3 permission matrix. One account at launch, but all checks are role-based. The single-actor review exception is documented (doc 14 §3).

## 12. Payment, shipping, manual verification
Doc 11. No gateway. Proof ≠ payment. COD eligibility OPEN. Shipping tariff BLOCKED on data.

## 13. Support, warranty, service
Doc 13. Two packaging options (W1/W2). Verified ownership. No invented end dates.

## 14. Domain events and integration boundaries
- **Internal domain events** (doc 17 §5): `RfqSubmitted`, `OpportunityStageChanged`, `ContractSigned`, `AttributionClassified`, `OrderConfirmed`, `StockReserved`, `SerialAssigned`, `DeviceCommissioned`, `WarrantyCoverageCreated`, `ServiceTicketStatusChanged`, `ContentPublished`.
- **External:**
  - transactional email provider (TBD)
  - object storage (TBD)
  - bot protection (TBD)
  - privacy-respecting analytics (TBD)
- **No synchronous dependency** on ClickUp, IoT clouds or analytics for accepting an RFQ or order.

## 15. Release prioritisation and critical dependencies
Doc 21: Stages 0–8. Packaging M1/M2/M3 and W1/W2. Owner decision DR-041.

## 16. Open decisions and contradictions
Doc 04 (register), doc 02 §4 (contradictions), doc 27 (owner decisions).

## 17. Acceptance test references
Doc 20, with IDs such as `RFQ-AT-*`, `CRM-AT-*`, `KPI-AT-*`, `SHOP-AT-*`, `STOCK-AT-*`, `SERIAL-AT-*`, `WAR-AT-*`, `CMS-AT-*`, `SEC-AT-*`, `SEO-AT-*`, `PERF-AT-*`, `OPS-AT-*`. **All are NOT RUN** because no application exists.

## 18. Evidence and approval record
| Item | Evidence | Approved by | Date |
|---|---|---|---|
| This PRD | — | **Not approved** | — |
| Business decisions tagged `[APR]` | Master prompt v2 (owner-supplied) | Owner (as recorded in that prompt) | Prompt dated 2026-10-13. Original approval dates not recorded |

## Change log
| Version | Date | Change |
|---|---|---|
| v1 (archived) | 2026-10-13 | Kickoff-based PRD |
| 2.0-draft | 2026-10-13 | Rewritten to the 18-section structure. Warranty portal restored to P0. Requirement IDs renumbered (`FR-XXX-nnn`) |

## Next review decision
The owner reviews scope, P0 list and non-goals, and resolves DR-007 and DR-041.

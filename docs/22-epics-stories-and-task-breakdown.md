# Epics, Stories and Task Breakdown

| Doc ID | OTONOM-DOC-22 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. **Future work. Not authorised** |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Implementation-ready future tasks: epic task lists (EPIC 01–10) plus fully specified **critical-path stories** in the required template. The other stories are listed by ID and get the full template after the spike (Stage 2 planning). Estimates are in ideal developer-days with stated confidence.

## 2. Epic task lists
| Epic | Tasks | Stage |
|---|---|---|
| EPIC-01 Requirements & traceability | Normalise vocabulary ✅ (doc 08 §2) · numbered FRs ✅ (doc 03) · goal ↔ requirement ↔ test links ✅ (docs 03/20) · out-of-scope ✅ · status/evidence fields ✅ (doc 04) · contradiction register ✅ (doc 02) | 0 (done in draft) |
| EPIC-02 UX & IA | Sitemap ✅ draft · journeys ✅ draft · wireframe descriptions for Home + Developers + RFQ (Stage 2) · mobile/RTL rules ✅ · form progressive disclosure ✅ · configuration/quote path design · portal + admin navigation · a11y matrix ✅ | 0/2 |
| EPIC-03 CMS & trust evidence | Content-type schema · editorial state machine · bilingual slug/metadata · media rights lifecycle · redaction/consent · claim-approval matrix · brand token extraction · article plan | 2–3 |
| EPIC-04 B2B RFQ | Field schema · abuse protection · private uploads · transitions/roles · qualification · consultation/survey · proposal/contract links · notifications/audit · E2E scenarios | 3 |
| EPIC-05 Revenue attribution | Consent/UTM capture · dedupe/entity matching · source events · classification review · recognition options · KPI sign-off · reconciliation queries · negative/override tests | 3 |
| EPIC-06 Controller commerce | Datasheet verification · SKU/config boundaries · options vs quote · checkout graph · shipping/installation boundaries · bank/wallet/COD reconciliation · returns/refunds · notifications + status security | 4 |
| EPIC-07 Inventory/serials | Locations/states · ledger invariants · transactional reservation + idempotency · release/expiry/reconcile · serial uniqueness/assignment · commissioning tie-in · adjustment audit · concurrency tests | 4 |
| EPIC-08 Warranty/service | Policy versioning (duration blocker) · ownership verification · activation rules · coverage view · ticket/RMA lifecycle · replacement linkage · notifications/retention · authz/abuse tests | 5 |
| EPIC-09 NFR quality | Threat model ✅ draft · identity/session/MFA · storage/backups/private objects · audit/observability · SEO/RTL/a11y tests · media optimisation · automated tests + restore rehearsal · runbooks | 2–6 |
| EPIC-10 Railway readiness (no deploy) | Topology ✅ draft (doc 25) · env names ✅ · health/readiness design · cost dimensions · migrations/backup/rollback strategy · approval checklist ✅ | 0/6 |

## 3. Story index
| Story | Title | Epic | Stage | Full spec |
|---|---|---|---|---|
| ST-01 | Bilingual routing and locale switch | 02/03 | 2 | ✅ §4 |
| ST-02 | Editorial workflow with publish guard | 03 | 2 | ✅ |
| ST-03 | Submit RFQ (progressive, no files) | 04 | 3 | ✅ |
| ST-04 | Secure RFQ file upload | 04 | 3 | ✅ |
| ST-05 | RFQ triage and state transitions | 04 | 3 | ✅ |
| ST-06 | Record signed contract with attribution freeze | 05 | 3 | ✅ |
| ST-07 | Attribution override with audit | 05 | 3 | ✅ |
| ST-08 | Executive KPI dashboard with reconciliation | 05 | 3 | ✅ |
| ST-09 | Confirm order with atomic stock reservation | 06/07 | 4 | ✅ |
| ST-10 | Verify manual payment | 06 | 4 | ✅ |
| ST-11 | Assign serials at fulfilment | 07 | 4 | ✅ |
| ST-12 | Claim device with verified ownership | 08 | 5 | ✅ |
| ST-13 | Warranty coverage display under pending policy | 08 | 5 | ✅ |
| ST-14 | Submit service ticket with safety triage | 08 | 5 | ✅ |
| ST-15…40 | Remaining stories (case-study page, integration matrix page, product page, cart, checkout UI, quote flow, shipping zones, COD verification, order status lookup, cancellation/expiry jobs, reconciliation job, commissioning capture, RMA processing, replacement, notifications outbox, consent records, media screening, SEO artefacts, MFA, permission admin, audit viewer, backups/restore drill, monitoring, a11y pass, perf pass, content import) | various | 2–6 | Full template in Stage 2 planning |

## 4. Critical-path stories (full template)

### ST-01 — Bilingual routing and locale switch
**Persona:** all visitors · **Goal and business reason:** genuine AR/EN parity (DR-010) is the foundation for SEO and trust · **Priority:** P0
**Dependencies / blockers:** DR-046 (URL scheme) · **Scope:** `/ar`/`/en` routing, `/` negotiation + cookie override, `dir`/`lang`, switcher keeps the equivalent page, hreflang/canonical · **Out of scope:** content translation itself
**Data in/out:** locale cookie, route params · **Authorisation/privacy:** none (public). The cookie is functional only
**States/invariants:** every public page has both locale routes or is explicitly single-locale and excluded from hreflang
**UX:** switcher visible on mobile. Missing-translation pages are not linked
**Acceptance:**
- Given an EN product page, When the user switches to AR, Then the AR equivalent opens with `dir="rtl"` and the same entity.
- Given `/` with `Accept-Language: ar`, Then redirect to `/ar` unless a cookie says `en`.
- Given any public page, Then hreflang pairs are reciprocal and canonicals are self-referencing.
**Automated tests:** route/unit tests, Playwright AR/EN snapshots, hreflang validator · **Manual:** RTL visual review at 360 px
**Audit/observability:** none · **DoD:** CMS-AT-002 + SEO-AT-001 pass · **Sign-off:** owner (UX) · **Estimate:** 3–4 d (medium confidence)

### ST-02 — Editorial workflow with publish guard
**Persona:** content editor/approver · **Goal:** Draft → Review → Publish with evidence and consent gates (DR-027) · **Priority:** P0
**Dependencies:** spike S2. DR-051 · **Scope:** status field, transitions, guard (locales, evidence state, consent, SEO), revision history, rollback, single-actor flag, weekly digest · **Out of scope:** scheduling (later)
**Data:** ContentItem, ContentRevision, EvidenceReference, ConsentRecord · **Authorisation:** editor creates/submits. Approver approves/publishes. Server-enforced
**Invariants:** the public site serves only `PUBLISHED` revisions. A published revision is immutable
**UX:** guard failures list exactly what is missing in both locales
**Acceptance:**
- Given a draft edit, Then the public page still shows the last published revision.
- Given a case study without written consent, When publish is attempted, Then it is blocked with reason "consent missing".
- Given a claim with evidence `USER_STATED`, Then publish is blocked.
- Given single-actor approval, Then `single_actor_exception=true` is recorded and the item appears in the weekly digest.
**Automated:** unit (guard), integration (draft visibility), E2E (publish flow) · **Manual:** reviewer checklist dry run
**Audit:** `content.published/withdrawn` with actor · **DoD:** CMS-AT-001/003/004 pass · **Sign-off:** owner · **Estimate:** 5–7 d (low-medium)

### ST-03 — Submit RFQ (progressive, without files)
**Persona:** P-DEV/P-CON/P-HOME · **Goal:** a low-friction structured brief (DR-011) · **Priority:** P0
**Dependencies:** privacy notice (DR-043). Bot-protection provider choice · **Scope:** steps 1–2 fields (doc 08 §4), validation, idempotency, bot check, rate limit, ack (AR/EN), attribution snapshot (consent-aware), audit · **Out of scope:** uploads (ST-04)
**Data:** `RfqSubmission` (doc 17 §6) → RFQ (`SUBMITTED`) · **Authorisation/privacy:** public write. Stored PII minimised. Ack email contains no sensitive content
**Invariants:** one RFQ per idempotency key
**UX:** stepper. Field errors localized. Offline → draft preserved. Duplicate → existing reference shown
**Acceptance:**
- Given valid input in AR, Then an RFQ is created with a reference and the AR ack is sent.
- Given the same key resubmitted, Then the same reference is returned and no second RFQ exists.
- Given 20 submissions/min from one IP, Then rate limiting applies with an accessible message.
**Automated:** schema unit tests, API integration, Playwright AR/EN, a11y keyboard · **Manual:** mobile device run
**Audit:** `rfq.submitted` · **DoD:** RFQ-AT-001/004/005, A11Y-AT-001 (RFQ part) · **Sign-off:** owner · **Estimate:** 4–5 d (medium)

### ST-04 — Secure RFQ file upload
**Persona:** RFQ submitter, engineer · **Goal:** share drawings safely (DR-047) · **Priority:** P0
**Dependencies:** storage provider, scanner choice (spike S3) · **Scope:** pre-signed upload to quarantine, type/magic/size checks, scan job, promotion to private storage, signed download for authorised staff, download audit, cleanup · **Out of scope:** CAD previews
**Data:** FileObject · **Authorisation/privacy:** uploader can attach only to their own submission session. Staff download is need-to-know. Never emailed
**Invariants:** no public URL ever exists for a private object
**UX:** progress, per-file errors, scan status for staff
**Acceptance:**
- Given a `.exe` renamed `.pdf`, Then it is rejected.
- Given a 30 MB DWG, Then it is rejected with the limit stated.
- Given a guessed object URL without a signature, Then access is denied.
- Given an expired signed URL, Then access is denied.
- Given an infected test file (EICAR), Then it is quarantined and never downloadable.
**Automated:** integration + negative security tests · **Manual:** bucket ACL review
**Audit:** `file.uploaded/scanned/downloaded` · **DoD:** RFQ-AT-002/003 · **Sign-off:** owner + security review · **Estimate:** 5–8 d (low)

### ST-05 — RFQ triage and state transitions
**Persona:** sales engineer · **Goal:** a controlled pipeline (doc 08 §3) · **Priority:** P0
**Dependencies:** ST-03 · **Scope:** transition service, guards, reasons, SLA timers, duplicate suggestion + merge/undo, qualification score capture · **Out of scope:** proposals (ST-15+)
**Authorisation:** engineer/admin only · **Invariants:** only legal transitions. Every change audited
**Acceptance:** CRM-AT-003. `LOST` without a reason → rejected. Merge undo restores both records.
**Automated:** state-machine unit tests (100 % transition table) · **DoD:** CRM-AT-003 + merge tests · **Estimate:** 5–6 d (medium)

### ST-06 — Record signed contract with attribution freeze
**Persona:** authorised sales/finance role · **Goal:** a trustworthy contract register (FR-CRM-006) · **Priority:** P0
**Dependencies:** DR-045 (recognition policy), DR-049 (entity matching) · **Scope:** contract creation from `WON`, evidence upload, value/currency/FX, cohort evaluation, attribution snapshot freeze · **Out of scope:** e-signature
**Invariants:** no `CONTRACT_SIGNED` without evidence + value. Cohort and class frozen at signature
**Acceptance:** CRM-AT-001/004. KPI-AT-002 (existing customer + new SOURCED contract).
**DoD:** tests pass. Audit `contract.signed` · **Estimate:** 4–5 d (medium. Policy-dependent)

### ST-07 — Attribution override with audit
**Goal:** honest corrections without manipulation (DR-006) · **Scope:** override command (doc 17 §6), role check, reason, optional approver, before/after, overrides report
**Acceptance:** CRM-AT-002. The override appears in the attribution-quality dashboard · **Estimate:** 2–3 d

### ST-08 — Executive KPI dashboard with reconciliation
**Goal:** auditable signed-value reporting (doc 09) · **Dependencies:** DR-007 (headline choice), DR-045 · **Scope:** KPI-001/002/003, NON_WEBSITE, UNKNOWN, cohort split, separate pipeline panel, drill-down, data timestamp, invariant checks
**Acceptance:** KPI-AT-001/004/005/006 against the synthetic fixture. A query failure shows "unavailable" · **Estimate:** 5–7 d (medium)

### ST-09 — Confirm order with atomic stock reservation
**Persona:** store operator · **Goal:** never oversell (DR-017) · **Priority:** P0
**Dependencies:** spike S4. SKU scheme · **Scope:** `ConfirmOrderCommand`, revision check, idempotency, conditional reservation, ledger + audit in one transaction, OUT_OF_STOCK handling
**Invariants:** I-1…I-4, I-7 (doc 12)
**Acceptance:** STOCK-AT-001/002/003. 50 parallel confirmations on real PostgreSQL produce zero oversell.
**Automated:** DB integration + concurrency harness · **DoD:** all pass on real PostgreSQL · **Estimate:** 4–6 d (medium)

### ST-10 — Verify manual payment
**Goal:** proof ≠ payment (FR-PAY-001) · **Scope:** proof upload (private), verification form (reference, amount, date), duplicate-reference check, reject with reason, idempotent
**Acceptance:** SHOP-AT-003. The same reference can't verify two orders · **Estimate:** 3–4 d

### ST-11 — Assign serials at fulfilment
**Goal:** traceability (FR-SER-*) · **Dependencies:** DR-018 serial mechanism · **Scope:** scan/enter serial, SKU match, unique active assignment, correction workflow
**Acceptance:** SERIAL-AT-001. Mismatch rejected. Correction audited · **Estimate:** 3–4 d (low, mechanism unknown)

### ST-12 — Claim device with verified ownership
**Persona:** P-SERVICE · **Goal:** private, correct device list (FR-WAR-001) · **Dependencies:** owner decision on claim codes · **Scope:** claim via order match / commissioning link / claim code / manual review. Masked serial display
**Acceptance:** WAR-AT-001. The empty state shows the claim path. Claim attempts are rate-limited · **Estimate:** 4–6 d (low)

### ST-13 — Warranty coverage display under pending policy
**Goal:** never invent dates (FR-WAR-003) · **Dependencies:** DR-024 (blocked) · **Scope:** coverage record with policy version. While `duration_months` is NULL → "terms pending" display with no end date
**Acceptance:** WAR-AT-002. When a policy is approved later, recalculation is audited · **Estimate:** 2–3 d

### ST-14 — Submit service ticket with safety triage
**Goal:** safe, private service intake (FR-SVC-001) · **Scope:** ticket form, attachments (scanned), safety-symptom question → prominent safety guidance + urgent flag, customer-visible timeline, internal notes hidden
**Acceptance:** WAR-AT-004. Selecting a safety symptom shows guidance and flags urgency · **Estimate:** 4–5 d

## 5. Stories blocked by business decisions
ST-06 (DR-045, DR-049) · ST-08 headline (DR-007) · ST-09 (SKUs DR-016) · ST-11 (DR-018) · ST-12 (claim-code decision) · ST-13 final dates (DR-024) · checkout/shipping stories (tariff, COD rules) · case-study page (DR-032) · integration page (DR-030).

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
After spike approval and results, complete the full template for ST-15…40 and re-estimate.

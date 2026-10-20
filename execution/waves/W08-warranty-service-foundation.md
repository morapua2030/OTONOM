# WAVE 8 — Warranty and Service Foundation (local development only, behind the W1 gate)

**Not active commercially.** Every portal route returns 404 in PREVIEW (verified). **No warranty duration exists anywhere**, so no coverage start or end date is ever produced or shown. Warranty decisions are never automatic.

## 1. Implemented
| Capability | Implementation |
|---|---|
| Customer authentication | `POST /api/account/register` (gated, rate-limited): role forced to CUSTOMER; minimum 10-character password; same answer whether or not the e-mail exists (no account oracle). Login through Payload; customers need no MFA. Lockout, session end on password change and logout are verified (WAVE 4). **E-mail verification BLOCKED** (no e-mail provider) |
| Electronic serial numbers | `serial_units` registry (STORE), status lifecycle IN_STOCK → ALLOCATED → SHIPPED / INSTALLED → COMMISSIONED → RETURNED / SCRAPPED |
| Installation and commissioning records | `commissioning_records`: project ref, installed/commissioned timestamps (commissioned ≥ installed), technician, checklist. One per serial. Issues a **one-time claim code** for the resident: shown once, stored only as a hash, cleared when used |
| Device ownership verification | Three proofs: (1) website order ref + access token for an order that **shipped this serial**; (2) the one-time commissioning code; (3) written evidence → PENDING → staff decision with a reason. One verified owner per serial (DB unique index). Every failure returns the same `CLAIM_NOT_ACCEPTED` (no serial/ownership oracle). Claim attempts are rate-limited per account |
| Warranty policy versions | `warranty_policies`: APPROVED requires a duration and an approver (DB check). Not seeded: DR-024 BLOCKED |
| Coverage states | COVERAGE_PENDING / ACTIVE / EXPIRED / VOID / NO_COVERAGE_RECORD; expiry derived, never extended. The portal shows dates only when an approved policy produced them |
| Service tickets | Customers open tickets **only for devices they verifiably own** (else 404 = IDOR guard). Staff state machine OPEN → TRIAGE → IN_PROGRESS / WAITING_CUSTOMER → RESOLVED (resolution required) → CLOSED |
| RMA workflow | REQUESTED → APPROVED / REJECTED (reason required, whatever the coverage) → RECEIVED → INSPECTED → REPAIRED / REPLACED / REJECTED → RETURNED / CLOSED. One open RMA per serial. Coverage at request time is recorded for the decision maker |
| Replacement history | REPLACED takes an IN_STOCK unit of the same SKU: stock movement ledgered, faulty unit RETURNED, **append-only** `serial_replacements` row (trigger + revoked grants), ownership REVOKED on the old unit and VERIFIED (method REPLACEMENT) on the new one. Coverage of a replacement is **not** created automatically (policy decision) |
| Customer-access authorisation | Customer identity comes only from the session (`user:<id>`), never from the request body. Every customer query is scoped by it. Staff cannot use customer routes and customers cannot use staff routes. Cross-origin writes are refused |

## 2. Tests
| Suite | Result |
|---|---|
| Domain `service.test.ts` | **7/7.** Covers: commissioning dates and one-time code (hash only); claims by code, order token and staff review; no oracle; second claimant refused; customer device lists scoped; no invented coverage dates; ticket IDOR guard; ticket transitions and resolution; RMA reasons and transitions; replacement moving ownership, ledgering stock, append-only history; replacement without automatic coverage |
| Domain total | **38/38** |
| HTTP `portal.ts` | **16/16** (COMMERCIAL only inside try/finally). Covers: PREVIEW closed; password policy; role not client-controlled; no account oracle; customer cannot escalate, list other users or open the admin; staff/customer separation; commissioning code; cross-origin claim refused; no claim oracle; code single-use; scoped devices and tickets; no invented dates; ticket IDOR; RMA without auto-decision, reason required, STORE cannot decide; audit of all steps; rollback to PREVIEW and synthetic customers deleted |

**Defect found during the wave:** migration 005's serial constraint blocked RMA replacements (a replacement ships without an order line). It was **corrected forward in migration 006**: applied migrations are checksummed and never edited.

## 3. BLOCKED / not done
- **Warranty duration, coverage start event, replacement-coverage rule, claim SLA:** owner/legal (DR-024, B-03, B-37).
- **E-mail verification and notifications** for customers: no provider (B-20).
- **Portal UI pages** (sign-up, device list, ticket forms): APIs only. The informational gated pages stay in place.
- **Customer-visible ticket conversation / attachments:** not built (uploads need AV + storage, B-19).
- **Returned-unit stock handling** (refurbish / scrap location): not modelled beyond status RETURNED.

# Delivery round S3 — Staff Administration, Real-Browser E2E, Preview Hardening (2026-10-15)

**Instruction source:** "OTONOM — Continuous Delivery Wave: Staff Administration, Real-Browser E2E, and Preview Hardening". **The pasted pack was truncated after §3 ("Global execution policy")**: the detailed wave list never arrived. The work below follows §0–§3 and the 11-wave summary that preceded the pack:
- staff workspaces;
- the browser journey RFQ → contract → KPI;
- the permissions / MFA / file-security review;
- AR/EN and mobile;
- internal store and warranty testing with the gates closed;
- blocker reduction and an evidence report.

Anything specified only in the missing part was not implemented and is not claimed.

## 1. Fresh baseline (before any change)
| Check | Result | Label |
|---|---|---|
| Manifest re-verified | OK | VERIFIED |
| Backup/restore drill **before** any migration | 70 tables, identical row counts, 0 stock violations, 4 append-only triggers | VERIFIED |
| Full regression `run-all.sh` | 1069/1069, every step exit 0 | VERIFIED (`evidence/s3-baseline-20261015/`) |

The handoff's claimed numbers were reproduced independently.

## 2. Staff workspaces (inside the Payload admin, English UI)
| View | Path | Who | What |
|---|---|---|---|
| Projects workspace | `/admin/workspace` | crm.read (actions: crm.write; approval: OWNER; signature: OWNER) | RFQ queue with status filter; transitions taken from the server's own transition map (reason fields where required); match suggestions; conversion (organisation choice, attach to existing, not-duplicate with reason); pipeline with each stage's required fields; contract signature (EGP input → minor units); handoff summary |
| KPI dashboard | `/admin/kpi` | kpi.read (reconcile: OWNER/ADMIN) | **Both North Star candidates side by side** (Sourced-only KPI-001, Total-influenced KPI-003) with the owner decision shown as PENDING; class × cohort table with amendments/cancellations; identities; funnel (KPI-010/011/013/014); pipeline separate; KPI-009/012 shown as BLOCKED; consistency check / repair |
| Store operations | `/admin/store-ops` | order.confirm or price.approve | Stage banner (customer store CLOSED in PREVIEW); order actions only where the state allows them (quote by OWNER, confirm, shipping, record/verify/reject payment, allocate serials per line, ship, complete, cancel with reason); stock with available quantity; price proposals and OWNER approval (no prices exist); serial registration |
| Service desk | `/admin/service-desk` | service.manage | Policy banner ("no approved warranty policy"); tickets with URGENT safety first; callback, transitions, RMA; RMA transitions with reasons and replacement serial; ownership claims awaiting decision; commissioning form (one-time claim code shown once) |

**Design rules:**
- Every button calls an **existing guarded endpoint**; the server stays the only authority.
- The UI hides actions a role cannot perform. That is convenience, not security: every action is re-checked by the endpoint.
- Lists are read with the user's own access (no `overrideAccess`) for CMS data.
- Domain data is read only after a server-side permission check.
- Payload theme variables are used (dark/light). Tables become labelled cards below 700 px.

## 3. Defects found and fixed in this round
| ID | Finding | Severity | Fix | Proof |
|---|---|---|---|---|
| S3-1 | Custom admin views are **not** covered by Payload's admin-access redirect: a password-only (MFA-pending) session received the admin shell and the role-specific workspace navigation (no data) | MEDIUM (information exposure) | Views now redirect exactly like `/admin` (login / unauthorized) before rendering anything | HTTP: 307 → `/admin/unauthorized`; E2E-MFA-PENDING |
| S3-2 | After a successful action the server view re-rendered immediately; when the stage changed, the form (and its result message) disappeared before it could be read | LOW (UX) | Result stays visible 1.5 s, then the view refreshes | E2E journey stable |
| S3-3 | Staff tables unusable on phones (7 columns squeezed into 390 px) | MEDIUM (usability) | Labelled card layout under 700 px + RFQ status filter | E2E-MOBILE (no overflow, cards on) + screenshot |
| S3-4 | KPI page printed "BLOCKED: BLOCKED:" | LOW | Text fixed | screenshot |
| T-1 | Test-driver bugs found while building the E2E (clicks before React hydration; DOM nodes not returnable over CDP) | — | Driver waits for hydration; DOM results coerced | — |

## 4. Real-browser E2E (`tests/src/e2e.ts`, Microsoft Edge headless over CDP, production build): **26/26**
**Public journey** (Arabic, 390 px): home → solutions → developers → RFQ form filled and submitted in the browser. Stored as SUBMITTED.

**Engineer** (signed in through the real `/staff/login` page: password, then TOTP):
- the navigation shows only the permitted workspaces;
- triage → qualification → match suggestions → conversion;
- the opportunity is linked to the RFQ with website-sourced evidence;
- consultation → proposal draft;
- no approval or signature controls are offered.

**Owner:**
- the approval form cannot be submitted incomplete;
- approval → sent → signature of EGP 765,432.10;
- the DB holds exactly 76,543,210 minor units, WEBSITE_SOURCED, NEW, WON_SIGNED;
- the KPI dashboard shows both North Star candidates (PENDING) and KPI-001 rose by exactly the signed value;
- reconciliation: 0 issues across 38 contracts;
- the handoff summary contains the contract ref and no links.

**Roles:**
- Editor: no workspace links and no CRM data.
- Store: operations visible with the CLOSED banner; no price-approval or quote-issuing controls; no CRM data.

**Service:**
- commissioning records a one-time code (only its hash is stored);
- the "no approved policy" banner is shown;
- a safety ticket appears first;
- the UI refuses to resolve it before the callback (422 SAFETY_CALLBACK_REQUIRED);
- the callback and then the resolution succeed.

**Store:** a synthetic quote request is cancelled in the UI with a reason.

**Security:** a password-only session is redirected away from staff workspaces.

**Mobile** (390 px): workspace and service desk show no horizontal overflow and render tables as cards.

**Data handling:**
- COMMERCIAL was used only inside try/finally to create the customer-side fixtures, and the stage was verified back to PREVIEW.
- The synthetic customer account was deleted.

Screenshots: `execution/evidence/screenshots/s3/`.

## 5. Not done / limits
- **Arabic admin interface chrome:** not done (A4: English acceptable). Arabic **content** renders correctly in the workspaces.
- **Staff UI for pages, claims, consents and media:** these keep using Payload's generic collection screens (already governed by WAVE 4 hooks).
- **Browser-level tests of Payload's generic edit screens:** not covered.
- **Human review** of the staff UI: PENDING. Screenshots are provided.
- **Instruction pack truncation:** any requirement in the missing part of the pack is unknown and not addressed.

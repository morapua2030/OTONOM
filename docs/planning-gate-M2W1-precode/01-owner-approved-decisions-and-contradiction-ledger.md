# 01 — Owner-Approved Decisions and Contradiction Ledger

| Version | 3.4-draft | Date | 2026-10-19 | Status | Canonical **additive** ledger. `docs/04-decision-register.md` is not modified |
|---|---|---|---|---|---|---|---|

## 1. Purpose and sources
This ledger records the owner decisions in force at the start of the pre-code planning gate, reconciles them with prior drafts, and makes approval gaps explicit.

| Code | Source | Date |
|---|---|---|
| K1 | Kickoff prompt v1 (first owner message) | 2026-10-13 |
| MP2 | Master prompt v2 `OTONOM-WEB-MASTER-2026-10-13` | 2026-10-13 |
| R2 | "Owner Decision & Environment Correction" (round 2) | 2026-10-13 |
| M3P | Continuous multi-plan master prompt (this run) | 2026-10-13 |
| REG | `docs/04-decision-register.md` (EXTRACTED) | 2026-10-13 |
| GHVP | Explicit owner authorization in the current conversation | 2026-10-18 |
| DPE | `execution/reports/deployment-decision-evidence.md` | 2026-10-19 |
| S8AUTH | Explicit owner authorization in the current conversation | 2026-10-19 |
| S8MAIL | Owner correction of the GitHub identity e-mail in the current conversation | 2026-10-19 |

Precedence: **M3P > R2 > MP2 > K1 > agent drafts.** Agent drafts never confer approval.

## 2. Owner-decision truth table
| ID | Owner wording (faithful) | Source | Interpretation | Status | Further approval needed? |
|---|---|---|---|---|---|
| OD-01 | "Authorized development environment: Antigravity IDE on the owner's Windows workstation" | M3P header, §0.1-1 | Local Windows + Antigravity IDE is approved for **planning**. Cloud is not required | **APPROVED** | Yes, for any code/spike/install |
| OD-02 | "Explicitly approved release strategy: M2 + W1" | M3P header, §2.1 | Two-stage entry: B2B Preview → First Commercial Release with the W1 warranty gate | **APPROVED** | No (strategy). Dates are not approved |
| OD-03 | Four binding guardrails (§2.2) | M3P §2.2 | See §3 below | **APPROVED** (as guardrails) | — |
| OD-04 | "Candidate stack: Next.js + Payload CMS 3 + PostgreSQL, NOT APPROVED" | M3P header, R2 item 3 | Candidate only. Scores aren't evidence | PROPOSED | Yes |
| OD-05 | Spike "approved in principle", execution blocked. Seven thresholds unapproved | R2 item 4, M3P §0.1-11 | No execution. Review only (doc 16) | BLOCKED (execution) | Yes |
| OD-06 | No Git/GitHub. Don't touch `.git` | R2, M3P §0.1-2 | Absolute for this gate | APPROVED (restriction) | — |
| OD-07 | No Railway/deploy/resources | K1, MP2, R2, M3P | Railway is a future design constraint only | APPROVED (restriction) | — |
| OD-08 | No app code, no spike, no installs, no local PostgreSQL | R2, M3P §0.1-4/5 | Docs only | APPROVED (restriction) | — |
| OD-09 | Non-destructive ZIP backup allowed (round 2) | R2 item 5 | Executed in round 2 (snapshot1/2). No new backup in this run (M3P asks for an off-device checklist only) | APPROVED (done) | — |
| OD-10 | North Star headline | M3P §1.3 | Still OPEN. The owner hasn't ratified Sourced-primary | OPEN | Yes |
| OD-11 | Warranty start = installation/commissioning. Duration/exclusions not approved | M3P §1.5 | No invented dates. Unknown policy blocks the commercial release | APPROVED (start) / BLOCKED (terms) | Yes (terms) |
| OD-12 | Preview: no web retail checkout. Existing warranty servicing stays off-site | M3P §2.2-1 | Binding | APPROVED | — |
| OD-13 | "Preview is not a security waiver" | M3P §2.3 | A preview that collects real PII/CAD needs production-grade controls, or else uses an informational-only preview | APPROVED (principle) | Choice of preview variant: OPEN (doc 18) |
| OD-14 | Highest-priority specialisation: compounds/multi-unit | M3P §1.4 | Drives IA and RFQ defaults | APPROVED | — |
| OD-15 | Engagement models: supply only / supply + installation + programming / design-build | M3P §1.4 | RFQ field + proposal templates | CONFIRMED_BY_OWNER | — |
| OD-16 | Partner/contractor negotiated prices. No public tiering | M3P §1.4 | Private, approval-gated | APPROVED | — |
| OD-17 | Two admin areas (Store, Projects). Shared backend/auth allowed. Not two DBs unless justified | M3P §1.6 | Single DB, separate workspaces | APPROVED | — |
| OD-18 | Roles later: Owner/Admin/Store/Engineer/Editor | M3P §1.6 | RBAC-ready from day one | APPROVED (direction) | — |
| OD-19 | 3D/2D, marketplace, web device control, unified accounts, configurator: future | M3P §1.6 | DEFERRED | DEFERRED | — |
| OD-20 | Visual language: clean, restrained, Apple-like, **not an Apple clone** | M3P §1.1 | Brand brief constraint | APPROVED | — |
| OD-21 | Private GitHub source repository and protected Vercel Preview are authorized within explicit security boundaries | GHVP | Supersedes the earlier blanket Git/GitHub/cloud prohibition only for a private repository and protected, noncommercial Preview. No public production, real customer/payment data, public commerce/warranty, paid provisioning without review, force-push, or history rewrite | **APPROVED (LIMITED SCOPE)** | Interactive authentication/2FA, billing, sensitive transfer, or a genuine security decision only |
| OD-22 | One temporary, protected, static-only Vercel Production bootstrap is authorized if required before an actual protected Preview | S8AUTH | Bootstrap content must contain no OTONOM application/backend, database access, secrets, authentication, commerce, warranty, customer data, or mutable API. Protection must be verified before readiness; remove it after the protected Preview is created and verified. This does not authorize a Production application launch or public accessibility | **APPROVED (ONE-TIME BOOTSTRAP ONLY)** | Stop on protection failure, public exposure, billing, or any scope expansion |
| OD-23 | Use `202302030@PUA.EDU.EG` as the GitHub ownership e-mail to verify | S8MAIL + S8 final recovery prompt | The latest explicit owner instruction supersedes the interim `team@otonomiot.com` target. Verification must come from GitHub's authenticated verified-e-mail API using least-privilege `user:email` | **VERIFIED 2026-10-20** | GitHub confirmed the address is present and verified on `morapua2030` |

## 3. M2 + W1 — approved definition and guardrails
**APPROVED on 2026-10-13. Evidence: owner's M3P message §2.1–2.2.**

| Stage | Definition (M3P §2.1) |
|---|---|
| **M2.1 B2B Preview** | An explicitly labelled preview for companies, developers and contractors. It shows the company, approved projects, solutions and engineering competence, plus a gated **or** fully validated RFQ intake, depending on privacy/security readiness. **Not a commercial checkout launch** |
| **M2.2 First Commercial Release** | Full eligible store/order functionality **plus a real customer warranty/service portal**, plus the prior B2B functionality, after policies and critical processes are approved and tested |
| **W1** | The commercial release is not "ready" until the portal verifies legitimate ownership, links each unit to a commissioning/activation record, respects an **approved** warranty policy, and supports tickets/RMA with user-visible status. Unknown policy = **commercial-release blocker** |

| Guardrail | Text (binding) |
|---|---|
| **G-1** | During the preview: no web-based retail checkout or online sales acceptance. Existing warranty servicing stays outside the website under current processes |
| **G-2** | Preview copy/UI explicitly says "preview" and never presents store, warranty portal, app availability, certifications or unverified integrations as live |
| **G-3** | Commercial warranty minimum: ownership verification, coverage linked to the commissioning date, no fabricated expiry, service requests/RMA, reliable case tracking |
| **G-4** | Commercial launch gate: a written, business/legal-approved warranty policy, plus consumer, shipping, returns and payment policies, signed off before live selling |

**Not approved by this decision:** any warranty period, vendor, stack, milestone date or price.

### 3.1 Faithfulness check against prior definitions
| Prior text (EXTRACTED) | Location | Match with M3P §2? | Note |
|---|---|---|---|
| M2: "(a) Public Lead-Generation Preview: marketing, projects, RFQ, consultation, basic analytics. **No** shop/warranty claims. (b) Commercial Store Launch: catalogue + orders + inventory + policies + **minimal real warranty portal** (checkout withheld until the portal is ready). (c) Enhancements" | `docs/21` §4 | ✅ Substantively equal | M3P adds that RFQ in the preview may be "gated or fully validated" depending on security readiness. The prior text assumed RFQ is in the preview |
| W1: "No public commercial launch until a minimal but **genuine** portal works: verified ownership, commissioning-based coverage record, ticket + RMA intake/status" | `docs/13` §2 | ⚠️ Partial | The prior W1 let the portal run with `PENDING_POLICY_APPROVAL`. M3P W1 requires an **approved policy** before the commercial release. **Resolved: M3P governs.** `PENDING_POLICY_APPROVAL` remains valid only for internal/staging and for the preview period, never for live selling |
| Consistency points 1–4 for M2+W1 | `docs/31` §5 | ✅ | Point 4 ("commercial launch also requires approved warranty policy") was a proposal. It is now **binding as G-4** |
| W2 | `docs/13` §2 | n/a | **Not selected.** W2-like behaviour (off-site warranty) applies only during the preview, per G-1 |
| M1, M3 | `docs/21` §4 | n/a | Not selected. Recorded for history |

## 4. Status overrides relative to `docs/04` (additive, not edited there)
| REG ID | REG status | Status per this ledger | Reason |
|---|---|---|---|
| DR-040 | APPROVED (intent: Antigravity Cloud) | **SUPERSEDED** → Antigravity IDE on Windows APPROVED (OD-01) | M3P |
| DR-041 | PROPOSED (owner-preferred) | **APPROVED** (OD-02) | M3P §2.2 explicit instruction |
| DR-059 | BLOCKED (spike) | BLOCKED (unchanged). Review performed in doc 16 | M3P |
| DR-061 | APPROVED (no development on the Windows/Claude Code workspace without authorisation) | **Superseded for planning**: planning docs are authorised in this workspace. Code still not authorised | M3P §21 |
| DR-062 | BLOCKED (cloud workspace verification) | **CLOSED / not applicable**: the environment is the local Antigravity IDE, verified (doc 00 §2) | M3P + observation |
| DR-024 | BLOCKED (warranty duration) | BLOCKED, and now an explicit commercial-release blocker (G-4) | M3P |
| DR-007 | PROPOSED (North Star) | OPEN (no owner ratification) | M3P §1.3 |
| DR-039 | APPROVED (Git/GitHub postponed) | **SUPERSEDED FOR THIS LIMITED SCOPE**: private source repository operations authorized; destructive history operations remain prohibited | GHVP, 2026-10-18 |
| DR-038 / DR-036 | Cloud/deployment deferred or open | **SUPERSEDED FOR THIS LIMITED SCOPE**: protected Vercel Preview authorized after identity, privacy, and protection verification; public production remains prohibited | GHVP, 2026-10-18 |

### 4.1 Deployment execution outcome

The bounded authorization in OD-21 remains unchanged. OD-22 was exercised exactly once: protected static-only bootstrap `dpl_EuKS796FrjHszmXdfWcahWwQQYTQ` enabled application Preview `dpl_qG4m9gmSdG1R6USxaX6munN4NPJu`. The Preview is `READY`, protected by Vercel Authentication for all deployments, and uses Preview-only environment values. After authorized hosted checks, the bootstrap was removed by exact identity; one Preview deployment remains and the Production alias returns 404. Public Production and commercial activation remain prohibited. Evidence: S8AUTH, DPE, `execution/evidence/s8-hosted-20261019/summary.json`, and B-45.

The 2026-10-20 S8 final recovery renewed Vercel CLI authentication and created Preview `dpl_Gfn24PRnswhPSZt2T6d2ra8G9BZ3`, `READY` at `https://otonom-smart-home-573rphmhc-team-1626.vercel.app`, while preserving the previous READY Preview. There are two Preview deployments, zero Production deployments, All Deployments Authentication remains enabled, and all 25 environment entries remain Preview-only. Edge verified English/Arabic rendering, staff-login hydration, incorrect and expired MFA rejection, successful EDITOR MFA, session reload, RBAC denial and logout with zero warn/error console entries. Fresh hosted CSP response headers and nonce rotation were not exposed by the available Edge API and remain unclaimed. OD-23 is verified; the private repository `morapua2030/OTONOM` exists, while Vercel Git linking is blocked pending a Vercel Login Connection to GitHub. Automatic Vercel Git deployments remain disabled in `app/vercel.json`.

## 5. Contradiction ledger
| ID | Topic | Conflict | Resolution | By |
|---|---|---|---|---|
| C-ENV | Environment | v2 docs said "VS Code" and "not Antigravity". Round 2 assumed "Antigravity Cloud" | Host = Antigravity IDE 2.5.5, local (OBSERVED). Owner approves the local IDE | OD-01 + observation |
| C-WAR | Warranty at launch | v1 deferred the portal to "MVP-C". v2 restored it with a pending-policy display | W1 + G-3/G-4: a real portal **and** an approved policy at the commercial release | OD-02/03 |
| C-RET | Retail phasing | v1 store in "MVP-B". v2 M2(b) | Store only at the commercial release. **None in the preview** (G-1) | OD-12 |
| C-NS | North Star | Earlier drafts recommended Sourced-primary as if settled | OPEN. Two alternatives modelled (doc 07) | OD-10 |
| C-APP | App stores | — | No badges/links until published (consistent everywhere) | MP2/M3P |
| C-CON | Case-study consent | Verbal only | No identified publication without written consent (consistent) | M3P §1.2 |
| C-MOD | Module boundaries | v2 doc 17 listed 18 modules. M3P lists 12 contexts | Harmonised in doc 13 (12 contexts, sub-modules mapped) | Agent (PROPOSED) |
| C-RES | Reservation timing | v2: CONFIRMED ⇒ STOCK_RESERVED atomically. M3P model lists `Confirmed -> Reserved` as states | Same semantics: reservation commits in the confirmation transaction. "Reserved" is a derived/sub-state (doc 08 §4) | Agent (PROPOSED), consistent with the approved "reserve at confirmation" |
| C-ROL | Admin roles | v2 used 6 internal roles. M3P names Owner/Admin/Store/Engineer/Editor | Use the M3P names. Map Service Engineer → Engineer, Executive Viewer → Owner read-only (doc 14) | OD-18 |
| C-LEAD | Preview lead capture | v2 M2(a) assumed full RFQ with uploads | Two preview variants (P-A informational + basic contact, P-B full secure RFQ). Choice OPEN (doc 18 §3) | OD-13 |
| C-PEND | Warranty pending display | v2 docs 13/22 (ST-13) allowed a live display "terms pending" | Allowed in preview/staging only. Live selling needs an approved policy (G-4) | OD-03 |
| C-EST | Estimates | v2: 11–17 / 23–36 weeks | Re-estimated bottom-up in doc 19. Old figures kept as historical | M3P §2.4 |
| C-GHVP | GitHub and cloud deployment | Earlier decisions prohibited Git/GitHub and all cloud deployment | The owner explicitly authorized only a private GitHub repository and protected, noncommercial Vercel Preview. All unrelated safety, data, commerce, warranty, billing, and public-launch restrictions remain active | OD-21 / GHVP |
| C-VFIRST | First Vercel deployment target | Owner authorization permits protected Preview only; Vercel classified the first deployment as Production despite an explicit Preview target | OD-22 supplied the genuine scope decision: use exactly one protected static-only bootstrap, create and verify the actual protected Preview, then remove only the bootstrap. Completed on 2026-10-19 | OD-21 / OD-22 / DPE / B-45 |
| C-BOOTSTRAP | Vercel requires a first Production deployment before Preview | OD-21 did not permit any Production deployment | Exercised once and closed: bootstrap contained no OTONOM runtime or secrets, remained protected, and was removed after Preview `dpl_qG4m9gmSdG1R6USxaX6munN4NPJu` became READY. No Production application launch is authorized | OD-22 / S8AUTH / S8 evidence |
| C-GHMAIL | GitHub identity e-mail | Recovery instructions first named `202302030@PUA.EDU.EG`, an interim instruction named `team@otonomiot.com`, and the S8 final recovery prompt explicitly restored `202302030@PUA.EDU.EG` | The latest explicit owner instruction governs. GitHub's authenticated `/user/emails` API confirmed `202302030@PUA.EDU.EG` is present and verified on `morapua2030` using `user:email` | OD-23 / S8 final recovery |

## 6. Change summary
- Environment corrected and approved (local Antigravity IDE).
- M2 + W1 promoted to **APPROVED**, with four binding guardrails.
- The warranty-policy approval is now an explicit commercial-launch gate.
- The preview lead-capture variant is a new explicit open decision.
- DR-062 is closed as not applicable.
- The limited GitHub/Vercel authorization is recorded as OD-21; OD-22's one-time bootstrap was completed and removed without expanding authorization to a Production application or public launch.
- OD-23 records the latest GitHub identity e-mail and its authenticated verification on `morapua2030`.

## 7. Approval gap table
| Gap | Needed for | Owner |
|---|---|---|
| North Star headline | Dashboard spec finalisation (not coding of base data) | Owner |
| Preview variant P-A vs P-B | M2.1 scope | Owner |
| V-1…V-7 thresholds + spike execution + test-runtime/install authorisation | Spike | Owner |
| Stack (DR-037) | Implementation | Owner, after the spike |
| Warranty policy, legal policies | Commercial release | Owner + legal |
| Written case-study consent | Publishing an identified project | Owner + client |
| Prices, SKUs, tariff, tax, datasheets, serial method | Commercial build/launch | Owner + engineering |
| Contract-value accounting | KPI finalisation | Finance |
| Implementation authorisation | Any code | Owner |

## Sign-off (Wave 1)
| Check | Result |
|---|---|
| M2+W1 unambiguous | ✅ |
| Historical decisions kept visible | ✅ (REG untouched, overrides listed) |
| No false approvals | ✅ (only OD-01/02/03 promoted, each with an owner source) |

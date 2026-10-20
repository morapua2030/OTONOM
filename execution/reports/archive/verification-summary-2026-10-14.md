# Verification Summary — Local Application (`D:\otonom\app`)

Date: 2026-10-14. Architecture: Option A, **PROVISIONAL**. Environment: Windows 11, Node v24.20.0, portable PostgreSQL 17.11 on `127.0.0.1:5433`. App on `127.0.0.1:3301`, production build (`next build` + `next start`).
All data is synthetic. **Nothing is deployed. This is not production-ready, and it is not a public preview.**

## 1. What exists (VERIFIED by build + tests)
| Area | Implemented locally | Gate / status |
|---|---|---|
| Foundation | pnpm workspace. Framework-independent `@otonom/domain` package with 4 checksummed SQL migrations. Payload CMS in its own `cms` schema with a separate least-privilege DB role. Payload migrations are generated, with up/down | — |
| Bilingual shell | `/ar` (RTL) and `/en` (LTR): language negotiation at `/`, header/footer, preview banner, `noindex`, reciprocal hreflang sitemap, `robots.txt` that disallows everything | Not public |
| Corporate pages | Home, about, solutions, developers, contractors, partners, technology, integrations, projects, insights, contact, support, privacy (placeholder), preview notice | Copy is PLACEHOLDER, pending brand/content |
| CMS workflow | Pages + case studies: DRAFT → IN_REVIEW → APPROVED → PUBLISHED with role separation. Publish gates: English completeness, claim publishability, written consent. Consent revocation withdraws content | Verified in the spike (V-4) and app (CMS checks) |
| Claims registry | 18 claims from planning doc 11, all non-publishable (OWNER_REPORTED / PROHIBITED / LEGALLY_BARRED). The public API returns none | BLOCKED until evidence review |
| RFQ variant P-A | Public bilingual form with no file uploads. Server-side validation with field errors, idempotency key (including under concurrency), honeypot, rate limit, Arabic-Indic digit normalisation, 90-day duplicate suggestion (never auto-merge). Submission payload is immutable. No email is sent | Works in PREVIEW (B2B intake) |
| CRM / Projects workspace | Organisations, contacts, RFQ triage transitions, opportunity pipeline with guarded transitions: paid survey needs a fee agreement; proposal approval is OWNER-only with document, validity and capacity note; LOST/ON_HOLD need a reason; handoff needs an owner. ClickUp handoff summary contains no file links | Staff only, MFA |
| Contracts + attribution | A contract is signed only through the endpoint (OWNER) and needs signature evidence; FX is required for foreign currency. One contract per opportunity, and signing is retry-safe. Attribution is exclusive and locked at signature. Overrides need a reason and are recorded append-only. Cohort NEW/EXISTING is frozen at signature. Amendments and cancellations are kept as components | — |
| KPI | KPI-001..006, 015, 016, cohort split, identities, as-recorded vs vintage view, and pipeline (KPI-008) kept separate from signed value. Reproduces the doc 07 §11 dataset exactly | OWNER/ADMIN only |
| Staff security | Payload password, then TOTP bound to the session id (`/staff/login`). Recovery codes. A password-only session cannot read CRM or KPI, cannot open the admin panel (redirect to `/admin/unauthorized`) and cannot mutate anything. After MFA the admin panel works (HTTP-verified). Explicit collection/field access. Security headers. Domain errors exposed by code only | — |
| W1 store | Price proposal (OWNER/ADMIN/STORE) and approval (OWNER only, four-eyes). Website order submission (guest checkout, idempotent, price snapshot, shipping `TO_BE_QUOTED`). Staff confirmation with the spike-verified atomic reservation (domain-tested). Manual payment verification and stock adjustment endpoints (domain logic verified in the spike; not in the app HTTP suite) | **Disabled in PREVIEW (404).** With no approved price, every order returns `PRICE_NOT_APPROVED` |
| W1 warranty | Serial registry. Policy approval requires a duration. Coverage activation requires an approved policy. Public claim submission (coverage not disclosed). Staff decision needs a reason; nothing is auto-decided | **Disabled in PREVIEW (404).** Coverage returns `WARRANTY_POLICY_NOT_APPROVED` (DR-024 BLOCKED) |
| Not implemented | Service tickets, customer accounts/devices, storefront UI (cart/checkout forms), customer notifications, online payment gateway | Gated (404 in PREVIEW, 501 in COMMERCIAL) |

## 2. Test results (VERIFIED)
| Suite | Command | Result | Artefact |
|---|---|---|---|
| Domain KPI/contracts (disposable DB `otonom_test_kpi`) | `pnpm --filter @otonom/domain test` | 9/9 pass | console output |
| Domain W1 commerce/warranty (disposable DB `otonom_test_w1`) | same | 8/8 pass | console output |
| HTTP acceptance against the production build | `pnpm --filter @otonom/tests test` (server started with `OTONOM_TRUST_PROXY=1`) | **86/86 pass** (two consecutive runs) | `app/tests/results/acceptance-final-20261014.json` |
| TypeScript | `next build` (includes type check); `tsc -p packages/domain` | 0 errors | build output |
| Spike final reruns | `harness/src/optc`, `harness/src/opta` | C 205/205, A 257/257 | `spike/…/evidence/test-results/` |

Acceptance breakdown:
| Group | Pass |
|---|---|
| WEB | 17 |
| SEC | 1 |
| CLAIMS | 2 |
| SEO | 2 |
| G-1 | 4 |
| G-2 | 10 |
| RFQ | 8 |
| MFA | 4 |
| CRM | 18 |
| CONTRACT | 4 |
| KPI | 3 |
| W1 | 11 |
| CMS | 2 |

The W1 checks switch the stage to COMMERCIAL inside `try/finally` and always restore PREVIEW. The final check confirms the order endpoint returns 404 again.

## 3. Defects found and fixed during this phase
| Defect | Fix |
|---|---|
| Custom endpoints under `/api/opportunities/:id/...` were shadowed by Payload collection routes (404) | Moved to `/api/workspace/opportunities/:id/...`. **Convention:** never place root custom endpoints under a collection slug |
| If the CMS stage update failed after the domain contract committed, a retry could create a second contract | Unique `opportunity_ref` plus a re-sync path in the endpoint, with a domain test |
| V-8 gap: `correlation_id` was never populated | `NOT NULL` column. Every domain service receives a `Ctx`. Tested |
| V-9 gap for custom SQL | Checksummed migration runner (modified migrations are refused) |
| V-6 bidi defects D2/D3 | `dir="ltr"` inputs for phone/email in the RFQ form. **D1 (headings) and human review still pending** |

## 4. NOT verified (honest limits)
- **No browser-level/visual test of the app pages:** HTTP/HTML checks only. V-6 screenshots exist only for the spike.
- **No accessibility audit**, no Arabic copy review, no admin-panel RTL review.
- **Antivirus scanning, cloud storage ACL, email delivery, payment gateway:** none configured. NOT TESTED.
- **Railway/Linux performance, multi-instance behaviour:** NOT TESTED. The rate limiter is in-memory, single-process.
- **Upgrade migrations with existing data:** only the initial migrations exist.
- **Shared dev database:** `otonom_dev` is reused across acceptance runs, so synthetic rows accumulate. Domain tests use disposable databases.

## 5. PROPOSED (agent drafts, need owner confirmation)
- Four-eyes rule for prices (the proposer cannot approve).
- Shipping fee "to be quoted" by staff after order review.
- One signed contract per opportunity (further scope handled as an amendment).
- Stock is reserved at staff confirmation, not at website submission.
- Guest checkout until customer accounts exist.

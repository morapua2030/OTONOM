# Remaining Release Blockers — revalidated through S8 protected-Preview recovery

Status date: 2026-10-20. The pre-S7 version is preserved in `reports/archive/remaining-release-blockers-pre-S7-2026-10-18.md`; the full owner/proof/dependency/action matrix is `reports/S7-blocker-reconciliation.md`.

**Rules applied:**
- Every original item was re-checked against code and tests.
- Nothing was relabelled to lower the count.
- "RESOLVED-LOCAL" means the technical work is done **and** tested locally. Production verification can still be pending.

**Categories:**
| Code | Meaning |
|---|---|
| BUS | owner / business decision |
| LEG | legal |
| EXT | external evidence or third party |
| DEP | deployment / hosting |
| OPS | operational |
| TEC | technical |

## Summary
| | Count |
|---|---|
| Original items | 37 |
| RESOLVED (local or target-Preview as labelled) | 10 (B-21, B-26, B-31, B-34, B-35, B-38, B-39, B-40, B-45, B-46) |
| REDUCED (partly addressed, still open) | 9 (B-02, B-13, B-16, B-17, B-18, B-27, B-28, B-29, B-33) |
| OPEN, unchanged (decisions / external / deployment) | 23 |
| New items found in WAVES 1–12 and deployment preparation | 9 (B-38…B-46): 5 resolved, 0 reduced, 4 open |
| **Total still open** | **36** (23 unchanged + 9 reduced + 4 new open) |

S7 itself had no category delta. The later protected-Preview work resolved B-39 locally, B-45 on the target Preview, and B-46 through a new protected Preview plus real Edge MFA verification. B-16/B-18 were further reduced by the protected READY Vercel Preview backed only by the migrated Neon Preview database. B-17 is reduced: owner e-mail identity is verified and the private repository exists, while Vercel Git integration awaits an owner-authorized Login Connection. Formula: `46 total − 10 resolved = 36 open`.

**The website is not production-ready.** A hosted protected Preview now exists, but B-01, B-09–B-14, B-16, B-17, B-18, B-20, B-22, B-27, B-28 and B-30 remain open. Edge verified the hosted public surfaces, staff MFA, session handling and representative EDITOR authorization. Hosted MFA enrollment and a fresh hosted CSP header/nonce-rotation capture were not exercised and are reported as evidence limits, not PASS claims.

## A. Owner / business decisions
| # | Item | Cat | Status | Evidence / what changed |
|---|---|---|---|---|
| B-01 | Architecture approval (Option A provisional) | BUS | OPEN | `execution/evidence/architecture-comparison.md` + W13 assessment |
| B-02 | Prices, SKU scheme, shipping tariff | BUS | REDUCED | The mechanisms are ready and tested: price approval (four-eyes), catalogue model (controllers / variants / additions), per-order shipping quote. **No values exist** |
| B-03 | Warranty duration and terms | BUS/LEG | OPEN | Code refuses coverage without an approved policy (domain + portal tests) |
| B-04 | Returns / refund policy | LEG | OPEN | Cancellation flags `refundRequired`; no refund flow by design |
| B-05 | Partner pricing and programme terms | BUS | OPEN | Partner page carries no prices |
| B-06 | Survey fee amount / invoicing rule | BUS | OPEN | Pipeline records agreement + invoice ref only |
| B-07 | Cohort rule for group companies (PD-07) | BUS | OPEN | Exact organisation match; human-confirmed group links possible |
| B-08 | Attribution override approver policy | BUS | OPEN | Single approver recorded as `single_actor` |
| B-09 | Official brand files | BUS/EXT | OPEN | Placeholder tokens labelled as such |
| B-10 | Company facts, team, addresses, licences | BUS | OPEN | Placeholder copy |

## B. Legal / compliance
| # | Item | Cat | Status | Evidence |
|---|---|---|---|---|
| B-11 | Privacy notice (PDPL 151/2020) + retention schedule | LEG | OPEN | Placeholder page only |
| B-12 | Terms of use, cookie notice | LEG | OPEN | — |
| B-13 | Written consent per case study / logo / photo | LEG/EXT | REDUCED | The consent system is complete (signed-reference, scope, final revocation, auto-withdrawal of content and media), tested in CMS / acceptance. **No real consents** |
| B-14 | Certification and "works with" evidence | EXT | OPEN | OWNER + evidence publication gate; auto-withdrawal on downgrade (tested) |
| B-15 | E-invoicing / tax for store orders | LEG/EXT | OPEN | — |

## C. Infrastructure / operations
| # | Item | Cat | Status | Evidence |
|---|---|---|---|---|
| B-16 | Hosting authorisation, environments, domains, DNS | DEP | REDUCED | New protected Preview `dpl_Gfn24PRnswhPSZt2T6d2ra8G9BZ3` is `READY` at `https://otonom-smart-home-573rphmhc-team-1626.vercel.app`; the earlier READY Preview is preserved. Anonymous requests redirect to Vercel Authentication, all 25 environment entries are Preview-only, the CLI session was renewed through the official flow, Production count is zero, and the Production alias is 404. Public Production, custom domains and DNS remain unauthorized/unconfigured |
| B-17 | Version control (Git) | OPS | REDUCED | Git/GitHub are authorized only for the private repository `https://github.com/morapua2030/OTONOM`. Least-privilege `user:email` verified that `202302030@PUA.EDU.EG` belongs to authenticated account `morapua2030`. After a 308-file candidate scan with zero unclassified secret findings, 295 approved tracked files were committed and pushed to `main` without force. Automatic Vercel Git deployments are disabled in `app/vercel.json`; Vercel Git connection remains blocked before any effect because the account requires a security-sensitive GitHub Login Connection |
| B-18 | Managed PostgreSQL, backups, PITR, restore drill on target | DEP | REDUCED | A Neon Free Preview-only database is installed. A pre-migration `pg_dump` was restored and compared in a unique temporary Neon database, then the drill database was deleted. Nine domain and six Payload migrations applied; least-privilege roles were verified. Seed data is synthetic only, with zero approved prices and warranty policies. Provider PITR capability and hosted application restore behaviour remain unverified |
| B-19 | Object storage (private ACL) + antivirus for uploads | DEP/EXT | OPEN | Uploads fail closed until scanned CLEAN; public RFQ uploads disabled |
| B-20 | E-mail provider (SPF/DKIM/DMARC) | EXT | OPEN | No e-mails sent anywhere. Also blocks customer e-mail verification (B-41) |
| B-21 | Shared rate-limit store | TEC | **RESOLVED-LOCAL** | PostgreSQL limiter (`domain.rate_limits`, atomic upsert, hashed keys) replaces the in-memory limiter; acceptance APP-RFQ-RATE-LIMIT + APP-RATE-LIMIT-SHARED (no raw IPs at rest). The hosted salt path now uses a dedicated environment secret or a domain-separated derivation from `PAYLOAD_SECRET`, with a fail-closed Vercel check; focused 6/6 and full 1439/1439 pass. Multi-instance behaviour follows from the shared DB store, but was not exercised with two servers |
| B-22 | Reverse-proxy trust config on target | DEP | OPEN | `OTONOM_TRUST_PROXY=1` is Preview-scoped and hosted HTTPS, secure headers, readiness and nonce CSP responses passed. A dedicated target-platform forwarded-header abuse test remains pending |
| B-23 | Performance on Linux target | DEP | OPEN | Windows measurements in W11 only |
| B-24 | Payment gateway | BUS/EXT | OPEN | Manual payments only (tested) |
| B-25 | Monitoring, error tracking, alerts, log retention | DEP/OPS | OPEN | `/api/ready`; business refusals now logged at info (W11) |
| B-26 | Upgrade-migration path with existing data | TEC | **RESOLVED-LOCAL** | Domain migrations 005 → 008 and Payload migrations 2 → 4 were applied incrementally to the populated dev database, including a forward-fix of a constraint (006). Checksums refuse edited migrations. A Payload *framework version* upgrade is still untested (see B-43) |

## D. Quality gates
| # | Item | Cat | Status | Evidence |
|---|---|---|---|---|
| B-27 | Human review of Arabic/RTL | OPS (human) | REDUCED | S7 produced 111 screenshots and bidi 258/258; checklist `reports/S7-owner-human-review-ar.md`. **Human review PENDING** |
| B-28 | Accessibility audit (WCAG 2.2 AA) | EXT | REDUCED | S7 automated A11Y 276/276 and a Narrator/NVDA + zoom script. Manual assistive-tech and formal audit not done |
| B-29 | Admin RTL/Arabic editing check by editors | OPS (human) | REDUCED | Automated locale direction and real EDITOR MFA remain green; paired/admin screenshots ready. **Named editor review pending** |
| B-30 | Independent security review / penetration test | EXT | OPEN | Self-review W09 (security suite 23/23 + surface 84 + portal 17) is **not** a substitute |
| B-31 | Cross-system consistency (domain contract vs CMS stage) | TEC | **RESOLVED-LOCAL** | Retry-safe signing (W1) + `POST /api/admin/reconcile`. Detects stage-behind-contract (repairs on request), won-without-contract, broken RFQ links and reserved-stock drift. Acceptance APP-RECONCILE simulates the partial failure and repairs it |
| B-32 | Human copywriting AR/EN | BUS/OPS | OPEN | Placeholder copy limited to planning facts |

## E. W1 commercial scope
| # | Item | Cat | Status | Evidence |
|---|---|---|---|---|
| B-33 | Storefront UI (product pages, cart, checkout) | TEC (blocked by B-02/B-04/B-15) | REDUCED | S7 added gated 4/6/16 information UI with `PRICE NOT CONFIGURED` and improved internal Store workspace. No sellable cart/checkout or approved commercial inputs |
| B-34 | Customer accounts | TEC | **RESOLVED-LOCAL** (API) | Registration, login, lockout, session handling, scoped portal (portal tests). E-mail verification moved to B-41 |
| B-35 | Service tickets | TEC | **RESOLVED-LOCAL** (API) | Tickets, safety escalation (W-08), RMA, replacements (domain + portal tests) |
| B-36 | Confirm PROPOSED controls | BUS | OPEN (list grown) | See `reports/owner-decisions-required.md` |
| B-37 | Coverage start event; claim/ticket SLAs | BUS/LEG | OPEN | Coverage start entered by staff; no SLA timers |

## F. New items found during WAVES 1–12 and deployment preparation
| # | Item | Cat | Status |
|---|---|---|---|
| B-38 | Nonce-based CSP (remove `'unsafe-inline'` scripts) | TEC | **RESOLVED-LOCAL + HOSTED EDGE:** `/staff/login` remains dynamic. S7 real Edge 11/11 proved nonce rotation and no Console/blocked-script errors. The exact unchanged hosted Preview returned one CSP header, no `'unsafe-inline'` in `script-src`, and 11/11 matching script nonces. Fresh hosted Edge interaction proved hydration and recorded zero warn/error console entries; current Edge control did not expose a fresh response-header capture. |
| B-39 | Dependency vulnerability audit (`pnpm audit` / SCA) | EXT/TEC | **RESOLVED-LOCAL (2026-10-18):** initial audit found 14 advisories (3 high, 6 moderate, 5 low); targeted transitive overrides were regression-tested; final `pnpm audit --prod` reports no known vulnerabilities. Target-platform and independent security review remain separate gates. |
| B-40 | Staff UI for workspace / store / service operations | TEC | **RESOLVED-LOCAL (S5 reconciliation):** Projects, KPI, Store, Service, Overview and Content Review workspaces are built; authorization is server-enforced; 41 real-Edge checks cover representative happy/failure paths. Human/editor review remains separately tracked by B-27/B-29 |
| B-41 | Customer e-mail verification + notifications | EXT (depends on B-20) | OPEN |
| B-42 | Analytics and consent tooling (doc 05 events) | BUS/LEG | OPEN |
| B-43 | Payload / Next framework upgrade rehearsal with data | TEC | OPEN |
| B-44 | Two-instance test of shared state (rate limits, sessions) on the target platform | DEP | OPEN |
| B-45 | Vercel first deployment is forcibly classified as Production | DEP/SEC | **RESOLVED-TARGET-PREVIEW:** under OD-22, one protected static-only bootstrap (`dpl_EuKS796FrjHszmXdfWcahWwQQYTQ`) enabled the actual protected Preview. The bootstrap was removed by exact identity and remains absent; the Production alias is 404; two protected READY Preview deployments remain, with no Production deployment. Evidence: `execution/evidence/s8-hosted-20261020/summary.json`. |
| B-46 | Hosted staff MFA rate-limit secret path | DEP/SEC | **RESOLVED-TARGET-PREVIEW:** the Vercel-safe fix uses `OTONOM_RATE_LIMIT_SALT` or a domain-separated derivation from `PAYLOAD_SECRET` and fails closed without either. Focused 6/6 and full 1439/1439 passed locally. On protected Preview `dpl_Gfn24PRnswhPSZt2T6d2ra8G9BZ3`, real Edge rejected incorrect and expired TOTP codes, accepted the current code, opened `/admin`, preserved the session after reload, enforced EDITOR denial on the users API, and logged out successfully. Hosted enrollment was not exercised and fresh CSP header/nonce rotation was not captured; neither is claimed as PASS. |

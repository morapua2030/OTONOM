# Remaining Release Blockers — revalidated through S6

Status date: 2026-10-18. The WAVE 12 version is preserved in `reports/archive/remaining-release-blockers-2026-10-15-w12.md`.

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
| DEP | deployment / hosting (not authorised) |
| OPS | operational |
| TEC | technical |

## Summary
| | Count |
|---|---|
| Original items | 37 |
| RESOLVED-LOCAL (technical, tested) | 7 (B-21, B-26, B-31, B-34, B-35, B-38, B-40) |
| REDUCED (partly addressed, still open) | 7 (B-02, B-13, B-18, B-27, B-28, B-29, B-33) |
| OPEN, unchanged (decisions / external / deployment) | 25 |
| New items found in WAVES 1–12 | 7 (B-38…B-44): 2 resolved locally, 5 still open |
| **Total still open** | **37** (25 + 7 reduced + 5 new) |

**The website is not production-ready**, and a public preview is still not possible: B-01, B-09–B-14, B-16, B-17, B-18, B-20, B-22, B-27, B-28 and B-30 remain open.

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
| B-16 | Hosting authorisation, environments, domains, DNS | DEP | OPEN | Not authorised |
| B-17 | Version control (Git) | OPS | OPEN | Owner deferred; the code lives only on `D:\otonom` |
| B-18 | Managed PostgreSQL, backups, PITR, restore drill on target | DEP | REDUCED | Local drill tool `app/tools/backup-restore-drill.sh`: dump → restore → 69 tables with identical row counts, invariants intact, 4 append-only triggers. **Target platform NOT TESTED** |
| B-19 | Object storage (private ACL) + antivirus for uploads | DEP/EXT | OPEN | Uploads fail closed until scanned CLEAN; public RFQ uploads disabled |
| B-20 | E-mail provider (SPF/DKIM/DMARC) | EXT | OPEN | No e-mails sent anywhere. Also blocks customer e-mail verification (B-41) |
| B-21 | Shared rate-limit store | TEC | **RESOLVED-LOCAL** | PostgreSQL limiter (`domain.rate_limits`, atomic upsert, hashed keys) replaces the in-memory limiter; acceptance APP-RFQ-RATE-LIMIT + APP-RATE-LIMIT-SHARED (no raw IPs at rest). Multi-instance behaviour follows from the shared DB store, but was not exercised with two servers |
| B-22 | Reverse-proxy trust config on target | DEP | OPEN | `OTONOM_TRUST_PROXY` documented |
| B-23 | Performance on Linux target | DEP | OPEN | Windows measurements in W11 only |
| B-24 | Payment gateway | BUS/EXT | OPEN | Manual payments only (tested) |
| B-25 | Monitoring, error tracking, alerts, log retention | DEP/OPS | OPEN | `/api/ready`; business refusals now logged at info (W11) |
| B-26 | Upgrade-migration path with existing data | TEC | **RESOLVED-LOCAL** | Domain migrations 005 → 008 and Payload migrations 2 → 4 were applied incrementally to the populated dev database, including a forward-fix of a constraint (006). Checksums refuse edited migrations. A Payload *framework version* upgrade is still untested (see B-43) |

## D. Quality gates
| # | Item | Cat | Status | Evidence |
|---|---|---|---|---|
| B-27 | Human review of Arabic/RTL | OPS (human) | REDUCED | 14 bidi/SEO defects fixed; 585+ automated checks; checklist `waves/W02-human-visual-review-checklist.md`. **Human review PENDING** |
| B-28 | Accessibility audit (WCAG 2.2 AA) | EXT | REDUCED | Automated probes (contrast, names, headings, landmarks, targets, ids, form errors) pass. Formal audit with assistive technology not done |
| B-29 | Admin RTL/Arabic editing check by editors | OPS (human) | REDUCED | Automated: ar fields RTL, en fields LTR after a real EDITOR MFA login. Editors' review pending |
| B-30 | Independent security review / penetration test | EXT | OPEN | Self-review W09 (security suite 23/23 + surface 84 + portal 17) is **not** a substitute |
| B-31 | Cross-system consistency (domain contract vs CMS stage) | TEC | **RESOLVED-LOCAL** | Retry-safe signing (W1) + `POST /api/admin/reconcile`. Detects stage-behind-contract (repairs on request), won-without-contract, broken RFQ links and reserved-stock drift. Acceptance APP-RECONCILE simulates the partial failure and repairs it |
| B-32 | Human copywriting AR/EN | BUS/OPS | OPEN | Placeholder copy limited to planning facts |

## E. W1 commercial scope
| # | Item | Cat | Status | Evidence |
|---|---|---|---|---|
| B-33 | Storefront UI (product pages, cart, checkout) | TEC (blocked by B-02/B-04) | REDUCED | APIs done and tested (W7); UI not built because catalogue, prices and policies are missing |
| B-34 | Customer accounts | TEC | **RESOLVED-LOCAL** (API) | Registration, login, lockout, session handling, scoped portal (portal tests). E-mail verification moved to B-41 |
| B-35 | Service tickets | TEC | **RESOLVED-LOCAL** (API) | Tickets, safety escalation (W-08), RMA, replacements (domain + portal tests) |
| B-36 | Confirm PROPOSED controls | BUS | OPEN (list grown) | See `reports/owner-decisions-required.md` |
| B-37 | Coverage start event; claim/ticket SLAs | BUS/LEG | OPEN | Coverage start entered by staff; no SLA timers |

## F. New items found during WAVES 1–12
| # | Item | Cat | Status |
|---|---|---|---|
| B-38 | Nonce-based CSP (remove `'unsafe-inline'` scripts) | TEC | **RESOLVED-LOCAL (S6):** per-response nonce + `strict-dynamic`; Next bootstrap scripts carry the matching nonce on public, admin, and staff-login pages; nonce rotation and real Edge hydration pass. Inline styles remain separately allowed. |
| B-39 | Dependency vulnerability audit (`pnpm audit` / SCA) — needs network access to an advisory DB | EXT/TEC | OPEN (not authorised in this session) |
| B-40 | Staff UI for workspace / store / service operations | TEC | **RESOLVED-LOCAL (S5 reconciliation):** Projects, KPI, Store, Service, Overview and Content Review workspaces are built; authorization is server-enforced; 41 real-Edge checks cover representative happy/failure paths. Human/editor review remains separately tracked by B-27/B-29 |
| B-41 | Customer e-mail verification + notifications | EXT (depends on B-20) | OPEN |
| B-42 | Analytics and consent tooling (doc 05 events) | BUS/LEG | OPEN |
| B-43 | Payload / Next framework upgrade rehearsal with data | TEC | OPEN |
| B-44 | Two-instance test of shared state (rate limits, sessions) on the target platform | DEP | OPEN |

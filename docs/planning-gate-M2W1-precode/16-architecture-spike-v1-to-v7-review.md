# 16 — Architecture Spike V-1…V-7 Review (planning only)

| Version | 3.0-draft | Date | 2026-10-13 | Status | **Review only. NO spike executed. NO tests run** |
|---|---|---|---|---|---|---|---|

## 1. Sources retrieved (EXTRACTED, verified by reading the files in this run)
| Source | Location | Content |
|---|---|---|
| **S16** | `docs/16-architecture-options-and-decision-brief.md` §6, lines 58–64 | Original **veto/falsification criteria** ("Fails if …") |
| **S31** | `docs/31-implementation-readiness-assessment.md` §7, lines 97–103 | **Proposed pass thresholds** (agent proposal, owner-unapproved) |

Both sets are retrieved, so the status is **RETRIEVED** (not "NOT RETRIEVED"). Neither set has owner approval.

## 2. Cross-cutting prerequisites for any future execution
1. **Environment:** the local Antigravity Windows workspace (approved for planning only).
2. **Authorisation needed:** temporary spike code in an isolated folder (e.g. `D:\otonom\spike\`), dependency installation, a disposable test DB, the storage stand-in, and a time budget.
3. **Data:** synthetic fixtures only. No customer data, CAD or photos.
4. **Clean-up:** the spike folder and DB are deleted or archived per owner instruction. No Git. No deploy.
5. **Evidence format:** command, environment, versions, raw output (sanitised), PASS/FAIL/BLOCKED per criterion, reviewer.

## 3. Criterion-by-criterion review

### V-1 — Atomic reservation
| Field | Content |
|---|---|
| Original (S16) | "Under ≥ 50 concurrent confirmations on real PostgreSQL, any oversell, double reservation or partial commit occurs, or it can't be achieved without bypassing the framework unsafely" (= fail) |
| Proposed threshold (S31) | "50 concurrent confirmations for a stock of 1 → exactly 1 success, 0 negative stock, 0 duplicate reservations, in 3 consecutive runs on real PostgreSQL" |
| What it validates | Lost updates, oversell, double reservation, partial commits under contention. Correctness of the confirm-and-reserve transaction |
| **Critique** | (a) "50 concurrent" inside one Node process may only test async interleaving. It must also run across **≥ 2 OS processes / connection pools**, because production may run multiple instances. (b) It must cover **independent orders** competing for the last unit **and** the **same order replayed** (idempotency key reuse, double click, retry after timeout). (c) It must cover **mid-transaction failure** (forced error after the reservation insert) → full rollback. (d) It should state the isolation level used and show that the conditional update/lock works under it. (e) "3 consecutive runs" is too few to expose rare races. |
| **Revised acceptance (proposed)** | For stock = 1 with N independent orders (N ∈ {2, 10, 50}), from ≥ 2 processes, over **R = 20 runs** per N: exactly 1 CONFIRMED, N−1 OUT_OF_STOCK_ON_CONFIRM, `available` never < 0, reservations count = 1, ledger RESERVE entries = 1. Replay test: the same order confirmed with the same key 10× concurrently → 1 reservation, identical responses. Fault test: injected failure → 0 reservations, 0 ledger rows, order unchanged. Expiry job double-run → 1 RELEASE |
| Fixtures | 1 SKU, 1 location, stock 1 (and a stock-5 variant with 50 orders of qty 1 → exactly 5 succeed). Synthetic orders |
| Preconditions | Real PostgreSQL (version recorded), app data layer, a test harness able to spawn processes |
| Procedure concept | Seed → launch concurrent confirmations from multiple processes → collect results → assert DB state via queries → repeat R times → repeat with replay and fault variants |
| Metrics | Success count, final stock, reservation count, ledger count, error types, p95 confirmation latency (informational) |
| Runs | 20 per scenario (rationale: low-probability races. Cheap to run) |
| Pass / Fail / Blocked | PASS: all assertions in all runs. FAIL: any violation. BLOCKED: no real PostgreSQL available |
| Resource/side-effect risk | Local DB disk < 1 GB. No external transfer. No cost |
| Fallback if failed | Move reservation logic to explicit SQL with row locks / serialisable isolation + retry. If the framework prevents it → option C (doc 12) |
| Decision required | Owner approves N, R and runtime |

### V-2 — Domain authorisation independent of CMS
| Field | Content |
|---|---|
| Original (S16) | "Critical tables can be written through CMS/admin APIs by a content role" (= fail) |
| Proposed (S31) | "A content-editor role cannot write orders, stock, payments, contracts, attribution or warranty via any admin/API route (automated negative tests)" |
| Validates | Privilege separation between editorial and transactional domains. The auto-generated admin/API surface doesn't bypass domain services |
| Critique | Must enumerate **all** generated endpoints (REST/GraphQL/local API), not only the UI. Must include update **and** delete **and** bulk operations. Must test a forged request with an Editor session. It should also verify Store cannot change contracts and Engineer cannot verify payments (doc 14 matrix) |
| Revised acceptance | For each role (Editor, Store, Engineer) × each protected entity (Order, Payment, StockLevel, Ledger, Reservation, Contract, Amendment, Attribution, Coverage, WarrantyPolicy) × each operation (create, update, delete, bulk) via each exposed interface: 100 % rejected with 403 and no DB change. Owner/Admin succeed only through domain services that write audit rows |
| Fixtures | Seeded users per role. One record per entity |
| Preconditions | Generated API inventory (list of endpoints) |
| Procedure | Generate the matrix → execute requests → assert status + DB unchanged + audit absent/present |
| Metrics | Matrix coverage %, number of violations |
| Runs | 1 full matrix (deterministic) + re-run after any config change |
| Pass/Fail/Blocked | PASS: 0 violations and 100 % coverage. FAIL: ≥ 1 violation |
| Risk | None external |
| Fallback | Disable the generated APIs for those collections. Keep transactional tables outside the CMS. If impossible → option C |
| Decision | Owner approves the matrix scope |

### V-3 — Private uploads
| Field | Content |
|---|---|
| Original (S16) | "A private object is reachable without a valid signed URL, or URLs leak via the admin/API" |
| Proposed (S31) | "Unsigned or expired URL → denied. No public ACL. File not listed in any public endpoint" |
| Validates | Confidentiality of CAD/plans and payment proofs |
| Critique | The local filesystem stand-in **can't prove** S3 ACL behaviour, only application-level checks. Must test: expired signature, tampered signature, another user's file ID (IDOR), listing endpoints, admin API responses containing raw URLs, cache headers (`Cache-Control: private, no-store`). The scan-quarantine flow should be part of this criterion |
| Revised acceptance | (1) App level, on any stand-in: unauthenticated, wrong-role, wrong-owner, expired (> TTL) and tampered requests are all denied. No raw storage URL appears in any API/admin response. (2) Storage level (**only if the owner approves a test bucket**): direct object GET without a signature = denied. Bucket policy has no public read. (3) Quarantine: a file is not downloadable until marked CLEAN. EICAR test string → INFECTED, never downloadable |
| Fixtures | Synthetic PDF/PNG/DXF. EICAR test string |
| Preconditions | Storage stand-in. Optional approved test bucket. A scanner (if absent, test the "scan pending = not downloadable" rule) |
| Procedure concept | Upload fixtures as user U1 → attempt access as anonymous / U2 / Editor / with expired and tampered signatures → inspect all API/admin payloads for raw URLs → repeat on the bucket if approved |
| Metrics | Denied/allowed counts. TTL accuracy |
| Runs | 1 matrix + TTL boundary test (TTL−5 s, TTL+5 s) |
| Pass/Fail/Blocked | PASS: all denials. BLOCKED (part 2) if no bucket is approved, which is acceptable to proceed with a recorded limitation |
| Risk | A cloud bucket = external resource + cost (approval). Synthetic files only |
| Fallback | Proxy downloads through the app (stream) instead of signed URLs |
| Decision | Owner: stand-in only, or a test bucket |

### V-4 — Reviewed publication
| Field | Content |
|---|---|
| Original (S16) | "A draft or unreviewed revision can become publicly visible, or the review state can't be enforced server-side" |
| Proposed (S31) | "Draft/in-review revisions never served publicly. Publish blocked without review + both locales" |
| Validates | Editorial integrity, consent/evidence gates, no publish bypass |
| Critique | A UI-only button isn't enough. Must test direct API mutation of the status field, preview URLs/draft tokens, cache/ISR leakage of draft content, and gates re-evaluated at publish time (consent revoked between review and publish) |
| Revised acceptance | Editor-role API calls setting PUBLISHED → rejected. Public routes, sitemap and search never return DRAFT/IN_REVIEW content (checked after cache revalidation). Publish rejected when: a locale is missing, a claim status is non-publishable, consent is missing/revoked, the review record is missing. A draft preview link requires an authenticated session |
| Fixtures | Content items in each state. A revoked consent. A non-publishable claim |
| Preconditions | CMS configured with the workflow states. Public rendering + cache/revalidation enabled as in production mode |
| Procedure concept | For each gate, attempt a publish via UI and direct API with each role → crawl the public routes/sitemap → revalidate the cache → crawl again |
| Metrics | Number of bypasses (target 0) |
| Runs | 1 matrix + cache revalidation check |
| Pass/Fail/Blocked | PASS: 0 bypasses. FAIL: ≥ 1 |
| Risk | None external |
| Fallback | Custom publish service with its own table. Public site reads only from a "published snapshot" table |
| Decision | Owner approves the gate list |

### V-5 — Admin MFA
| Field | Content |
|---|---|
| Original (S16) | "No workable TOTP MFA (built-in, plugin or custom strategy) and no acceptable compensating control" |
| Proposed (S31) | "TOTP enforced for admin, or a documented compensating control the owner accepts" |
| Validates | Account-takeover resistance for privileged roles |
| Critique | Must cover enrolment, recovery codes, a lost-device procedure that doesn't bypass security, enforcement on **all** privileged API routes (not just the login UI), and session invalidation on role change |
| Revised acceptance | Privileged session without a verified second factor → 403 on every admin/API route. Recovery codes single-use. Disabling MFA requires re-auth + audit. A compensating control (e.g. an identity-aware proxy in front of `/admin`) is accepted only with explicit owner sign-off |
| Fixtures | Admin user. TOTP secret (test only) |
| Preconditions | MFA mechanism selected (built-in, plugin or custom). Test authenticator (synthetic secret) |
| Procedure concept | Enrol → log in with and without the second factor → call every privileged route → use/reuse a recovery code → change role and check the session is invalidated |
| Metrics | Unprotected privileged routes (target 0) |
| Runs | 1 matrix |
| Pass/Fail/Blocked | PASS: 0 unprotected routes and recovery rules hold. BLOCKED: no mechanism available → compensating-control decision |
| Risk | None external (unless an external IdP is chosen = separate approval) |
| Fallback | External IdP/SSO or proxy-based access control |
| Decision | Owner: TOTP vs compensating control |

### V-6 — Arabic RTL in admin and site
| Field | Content |
|---|---|
| Original (S16) | "Admin is unusable in Arabic, or the bidi rendering of mixed fields is broken without heavy patching" |
| Proposed (S31) | "Admin usable in Arabic for core tasks. Public RTL renders mixed AR/EN fields correctly" |
| Validates | Bilingual operability |
| Critique | "Usable" is subjective. Define core tasks and a rubric. Mixed content cases: SKUs, phone numbers, emails, CAD file names, numbers with units. It may be acceptable for the admin to remain English-only if the owner agrees. Ask |
| Revised acceptance | (1) Public: 20 defined mixed-content samples render correctly in RTL (visual check by an Arabic reader + automated `dir` attribute checks). No layout overflow at 360 px. (2) Admin: core tasks (triage RFQ, edit an AR page, confirm an order, open a ticket) are completable in the AR admin locale **or** the owner accepts an English admin with AR content fields rendering correctly |
| Fixtures | 20 mixed AR/EN samples (SKU in an Arabic sentence, +20 phone, email, `plan_v2.dwg`, "220V"-style values, long Arabic headings) |
| Preconditions | AR locale enabled in the admin (if supported) and on the public site |
| Procedure concept | Render the samples on public templates at 360/768/1280 px → perform the 4 core admin tasks in AR → record issues |
| Metrics | Broken samples count. Core tasks completed (of 4) |
| Runs | 1 review session (2 reviewers if possible) |
| Pass/Fail/Blocked | PASS: 0 broken public samples and 4/4 tasks (or an owner-accepted English admin) |
| Risk | None |
| Fallback | English admin + RTL field components |
| Decision | Owner: is an Arabic admin UI required? |

### V-7 — Operability
| Field | Content |
|---|---|
| Original (S16) | "Production build/start footprint or cold start is unacceptable for a single Railway service (thresholds set in the spike)" |
| Proposed (S31) | "Production build succeeds. Idle memory ≤ 512 MB, cold start ≤ 10 s (proposed numbers, owner to confirm)" |
| Validates | Hosting viability and cost |
| **Critique** | "Memory" is ambiguous: Node process RSS vs app + CMS vs all services incl. PostgreSQL. Idle vs under load. The local Windows laptop is **not** representative of Railway Linux containers. Cold start depends on the build mode, the first request (DB connect, cache) and the CMS admin bundle. The 512 MB/10 s figures have **no capacity evidence**. They are placeholders |
| Revised acceptance | Measure and **record** (not pass/fail yet): production build success + duration. Web process RSS at idle (after warm-up, 5 min) and under a light synthetic load (e.g. 10 rps for 5 min on public pages). Time from process start to first successful `/api/ready`. First-request latency. **Separate** PostgreSQL memory. Then set thresholds from the measurements + the Railway plan limits (a later owner decision). Pass/fail only applies after the owner sets limits |
| Fixtures | Synthetic content (e.g. 50 pages, 20 case studies, 3 products) |
| Preconditions | Production build mode. DB running separately so its memory is measured apart. Note that results are local Windows, not Railway Linux |
| Procedure concept | Build → start → poll `/api/ready` (timestamp) → idle 5 min → sample RSS → light load 5 min → sample RSS → restart ×3 |
| Tools | Built-in OS/process metrics (no extra installs unless approved) |
| Runs | 3 cold starts. 2 load runs (median reported) |
| Pass/Fail/Blocked | Initially **MEASURE-ONLY**. Becomes PASS/FAIL after the thresholds are approved |
| Risk | Local resource usage only |
| Fallback | Split the admin into a separate service, trim dependencies, or option C |
| Decision | Owner approves the measurement plan now, and the thresholds after evidence |

## 4. Missing criteria worth adding (PROPOSED, optional)
| ID | Candidate | Why |
|---|---|---|
| V-8 | Audit immutability (an insert-only role can't update/delete audit rows) | Financial/attribution integrity |
| V-9 | Migration round-trip (fresh DB + upgrade from the previous migration set + backup/restore) | Two migration streams under option A |
| V-10 | Preview feature gating (commerce/portal mutations disabled server-side) | G-1 enforcement |

## 5. SPIKE READINESS
| Item | State |
|---|---|
| Criteria retrieved | ✅ RETRIEVED (S16 + S31) |
| Criteria reviewed + revisions proposed | ✅ (this document) |
| Thresholds approved by owner | ❌ OPEN |
| Execution authorised (code, installs, DB, time budget) | ❌ NOT AUTHORISED |
| Test runtime available | ❌ No PostgreSQL. Install options in doc 15 §3 need approval |
| **Overall** | **READY FOR OWNER DECISION (plan). Execution BLOCKED** |

**No spike code was written and no test was executed.**

## Sign-off (Wave 10)
Original texts quoted with sources ✅ · Each V has the 12 required fields ✅ · V-1 and V-7 critiques addressed ✅ · No PASS claimed ✅

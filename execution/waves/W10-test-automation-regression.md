# WAVE 10 — Test Automation and Regression

One command runs everything: `bash app/tests/run-all.sh`. It runs:
1. domain and unit tests;
2. the production build;
3. a server on 127.0.0.1:3301 (test pages on, proxy trust on for the client-IP emulation);
4. the seven HTTP/browser suites;
5. `summary.json`.

The runner refuses to run twice at once and deletes stale per-suite results first: a crashed suite is reported as failed, never as an old pass. That hardening came from a real incident in this wave (§4).

## 1. Latest clean run (2026-10-15, all steps exit 0)
| Suite | Kind | Tests | Pass | Fail |
|---|---|---|---|---|
| Domain (`node:test`, disposable databases) | unit + database-transaction + concurrency | 40 | 40 | 0 |
| Web unit (`bidi.test.ts`) | unit (bidi, SEO helpers) | 7 | 7 | 0 |
| Acceptance | API / integration / feature gates | 107 | 107 | 0 |
| Surface probe | authorisation matrix over generated REST + GraphQL | 84 | 84 | 0 |
| Journey | end-to-end B2B (API level) | 36 | 36 | 0 |
| CMS | publication / consent / media / sessions / audit | 26 | 26 | 0 |
| Portal | warranty ownership / tickets / RMA / IDOR | 17 | 17 | 0 |
| Security | headers, oracles, XSS, CSRF, uploads, IDOR | 23 | 23 | 0 |
| Visual | browser: localization, RTL/bidi, responsive, accessibility probes, SEO, admin RTL | 729 | 729 | 0 |
| **Total** | | **1069** | **1069** | **0** |

Evidence:
- `execution/evidence/w10/run-all-summary.json`
- per-suite JSON in `execution/evidence/w10/`
- the domain log

**Counting note:** the HTTP and browser numbers are **runtime checks** (one check can cover several assertions; loops expand call sites). The domain and unit numbers are `node:test` test blocks.

## 2. Coverage by requested category
| Category | Status | Where |
|---|---|---|
| Unit | PASS | web-unit; pure domain helpers |
| Integration | PASS | acceptance, journey, cms, portal (real Payload + PostgreSQL) |
| Database transaction | PASS | domain lifecycle / service / w1 (rollbacks, constraints, triggers) |
| API | PASS | acceptance, surface, security |
| E2E | **PARTIAL** | Journeys run at API level; browser E2E covers rendering and the RFQ error state, but no full click-through of staff flows in a browser |
| Localization | PASS (automated) / **PENDING (human)** | visual + bidi unit |
| Accessibility | PASS (automated probes) / **NOT TESTED** with assistive technology | visual A11Y |
| Feature gates | PASS | acceptance G-1/G-2/W1/W7, portal P-PREVIEW-CLOSED |
| Inventory concurrency | PASS | domain: 50 concurrent confirmations; serial race; spike V-1 (2 OS processes × 160 reps) |
| Warranty ownership | PASS | domain service, portal |
| CMS publication | PASS | cms, acceptance, spike V-4 |
| Contract and KPI calculations | PASS | domain kpi (doc 07 dataset) + randomised invariants (4 seeds) |
| Performance | MEASURED (no thresholds) | W11 |
| Backup / restore | PASS (local) | `tools/backup-restore-drill.sh` (69 tables identical) |

**NOT TESTED / BLOCKED:**
- **Production platform:** HTTPS behaviour, multi-instance, real e-mail, antivirus, cloud storage.
- **Third parties:** payment gateway; dependency vulnerability audit (needs network).
- **People:** human visual review; screen readers.

## 3. Defects caught by the suites during WAVES 1–10 (all fixed, with regression checks)
- Claims could be self-certified (W1).
- Option labels and titles not bidi-isolated (W2).
- The language switch lost the page (W2).
- RFQ↔opportunity links were forgeable (W3).
- Closed opportunities were counted as duplicates (W4 rerun).
- Role-setup race between parallel processes (W5).
- An RMA replacement was blocked by an over-strict constraint (W8; forward-fixed in migration 006).
- Checkboxes below the 24 px target size (W6).
- Arabic dates inside LTR isolates (W2).
- Unscoped endpoints shadowed by collection routes (earlier phase).

## 4. Incident: an unreliable summary (found and fixed)
**What happened.** A full run was stopped while a build failure was being fixed, but its child loop kept running. Two runs then interleaved their steps, and one suite crashed, so the summary read an older result file and reported a false pass.

**How it was handled.**
1. The interleaved summary was discarded.
2. `run-all.sh` gained a lock file, removal of stale per-suite results, and recording of each suite's exit code; a missing result now counts as a failure.
3. A fresh clean run was made (the numbers above).

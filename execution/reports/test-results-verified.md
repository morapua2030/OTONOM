# Verified Test Results — final run 2026-10-15

Command: `bash D:/otonom/app/tests/run-all.sh`, the hardened runner (lock, stale-result removal, exit codes recorded).
Evidence: `execution/evidence/final-run-20261015/` (summary, steps, per-suite JSON, domain log, backup drill report).
Environment: local Windows 11, Node 24.20.0, PostgreSQL 17.11 (127.0.0.1:5433), Next 16.4.0 + Payload 3.90.2 production build on 127.0.0.1:3301, synthetic data.

## Results
| Step | Exit | Duration (s) | Tests | Pass | Fail |
|---|---|---|---|---|---|
| domain (`node:test`, disposable DBs) | 0 | 67 | 40 | 40 | 0 |
| web-unit | 0 | <1 | 7 | 7 | 0 |
| production build (incl. TypeScript) | 0 | 21 | — | — | — |
| acceptance | 0 | 14 | 107 | 107 | 0 |
| surface | 0 | 28 | 84 | 84 | 0 |
| journey | 0 | 30 | 36 | 36 | 0 |
| cms | 0 | 34 | 26 | 26 | 0 |
| portal | 0 | 26 | 17 | 17 | 0 |
| security | 0 | 30 | 23 | 23 | 0 |
| visual (Edge headless, CDP) | 0 | 70 | 729 | 729 | 0 |
| **Total** | | | **1069** | **1069** | **0** |

**Also executed in this session (outside run-all):**
| Check | Result |
|---|---|
| KPI invariant test with seeds 1, 42, 777 | 6/6 each |
| Backup/restore drill | 69 tables, identical row counts, 0 stock violations, 4 append-only triggers |
| Performance measurement | MEASURED, no thresholds (`evidence/w11-perf.json`) |

## Status by category
| Status | Items |
|---|---|
| **PASS** | Everything listed above |
| **PARTIAL** | Browser E2E: rendering, forms, error states and admin RTL only; staff flows tested at API level. Accessibility: automated probes only |
| **NOT TESTED** | Screen readers; other browsers; HTTPS / proxy / multi-instance; antivirus; cloud storage; real e-mail; Linux performance; Payload/Next upgrade with data |
| **BLOCKED** | Human visual review; independent security review; dependency vulnerability audit (network not authorised); anything needing prices, warranty policy or legal texts |

**Not every required test could run, so this is not "all tests passed".** All automated suites that exist passed; the categories above remain open.

---
## Update — delivery round S3 (2026-10-15, later run)
| Step | Exit | Duration (s) | Tests | Pass | Fail |
|---|---|---|---|---|---|
| domain | 0 | 149 | 40 | 40 | 0 |
| web-unit | 0 | 2 | 7 | 7 | 0 |
| build | 0 | 137 | — | — | — |
| acceptance | 0 | 26 | 107 | 107 | 0 |
| surface | 0 | 27 | 84 | 84 | 0 |
| journey | 0 | 28 | 36 | 36 | 0 |
| cms | 0 | **601** | 26 | 26 | 0 |
| portal | 0 | 36 | 17 | 17 | 0 |
| security | 0 | 24 | 23 | 23 | 0 |
| **e2e (new, real browser)** | 0 | 78 | 26 | 26 | 0 |
| visual | 0 | 109 | 729 | 729 | 0 |
| **Total** | | | **1095** | **1095** | **0** |

Evidence: `execution/evidence/s3-final-20261015/`.

**Unexplained:** the CMS suite took 601 s, against about 35 s in earlier runs. All 26 checks passed. No cause was identified; a host sleep or wait is suspected but **not verified**.

The new E2E suite runs staff journeys in Microsoft Edge with DB cross-checks (see `waves/S3-staff-workspaces-browser-e2e.md`). Browser E2E is now **PASS for the covered journeys**. It stays PARTIAL overall because Payload's generic collection edit screens are not browser-tested.

---
## Update — Codex S5 isolated final run (2026-10-16)

Command: `bash D:/otonom/app/tests/run-all.sh` after hardening the runner to clone `otonom_dev` into a disposable `otonom_e2e_*` database for all HTTP/browser suites and drop it on exit.

Evidence: `execution/evidence/codex-isolated-final-20261016/` and `execution/waves/S5-codex-migration-and-s3-closeout.md`.

| Step | Tests | Pass | Fail | Seconds | Exit |
|---|---:|---:|---:|---:|---:|
| domain | 42 | 42 | 0 | 173 | 0 |
| web-unit | 7 | 7 | 0 | 1 | 0 |
| production build | — | — | — | 377 | 0 |
| acceptance | 107 | 107 | 0 | 28 | 0 |
| surface | 84 | 84 | 0 | 25 | 0 |
| journey | 36 | 36 | 0 | 29 | 0 |
| CMS | 29 | 29 | 0 | 38 | 0 |
| portal | 17 | 17 | 0 | 22 | 0 |
| security | 23 | 23 | 0 | 28 | 0 |
| real Edge E2E | 41 | 41 | 0 | 85 | 0 |
| visual | 729 | 729 | 0 | 105 | 0 |
| **Total** | **1115** | **1115** | **0** | | |

Skipped/todo: 0. The disposable database was removed and `otonom_dev` remained PREVIEW with no prices, warranty policies/coverage, published pages, or customer accounts. Human RTL, screen-reader, formal accessibility, independent security, other-browser, target-platform and external-integration work remains PENDING/BLOCKED; therefore this is not an “all release gates passed” claim.

---
## Update — Codex S6 final run (2026-10-18)

Command: `bash D:/otonom/app/tests/run-all.sh` after nonce CSP, config-driven surface coverage, pagination, migration 009, and ledger reconciliation changes.

Evidence: `execution/evidence/s6-final-20261018/` and `execution/waves/S6-csp-reliability-and-scale.md`.

| Step | Tests | Pass | Fail | Seconds | Exit |
|---|---:|---:|---:|---:|---:|
| domain | 42 | 42 | 0 | 86 | 0 |
| web-unit | 11 | 11 | 0 | 1 | 0 |
| production build | — | — | — | 144 | 0 |
| acceptance | 108 | 108 | 0 | 27 | 0 |
| surface | 139 | 139 | 0 | 29 | 0 |
| journey | 36 | 36 | 0 | 27 | 0 |
| CMS | 29 | 29 | 0 | 37 | 0 |
| portal | 17 | 17 | 0 | 25 | 0 |
| security | 28 | 28 | 0 | 29 | 0 |
| real Edge E2E | 41 | 41 | 0 | 85 | 0 |
| visual | 729 | 729 | 0 | 105 | 0 |
| **Total** | **1180** | **1180** | **0** | | |

Skipped/todo: 0. All steps exited 0. The disposable database was removed. B-38 is resolved locally; human, external, target-platform, dependency-audit, and production gates remain open.

---
## Update — Codex S7 final run (2026-10-18)

Evidence: `execution/evidence/s7-final-20261018/`. The first S7 attempt was **1418/1430 FAIL** and exposed 12 visual defects (Arabic `B2B` isolation and breadcrumb target size). Those defects plus a manually observed RFQ `hidden` regression were fixed before this final run.

| Step | Tests | Pass | Fail | Seconds | Exit |
|---|---:|---:|---:|---:|---:|
| domain | 42 | 42 | 0 | 269 | 0 |
| web-unit | 11 | 11 | 0 | 2 | 0 |
| production build | — | — | — | 375 | 0 |
| acceptance | 114 | 114 | 0 | 27 | 0 |
| surface | 139 | 139 | 0 | 54 | 0 |
| journey | 36 | 36 | 0 | 28 | 0 |
| CMS | 29 | 29 | 0 | 40 | 0 |
| portal | 17 | 17 | 0 | 21 | 0 |
| security | 28 | 28 | 0 | 24 | 0 |
| Edge CSP B-38 | 11 | 11 | 0 | 30 | 0 |
| real Edge E2E | 42 | 42 | 0 | 123 | 0 |
| visual/bidi/a11y/SEO/i18n | 961 | 961 | 0 | 187 | 0 |
| **Total** | **1430** | **1430** | **0** | | |

Skipped/todo: 0. All twelve steps exited 0. The disposable DB, lock and server were removed. This remains local automated evidence only; human Arabic/editor review, assistive-tech/formal accessibility, independent security, authoritative SCA, target-platform and deployment verification remain pending/open.

---
## Update — S8 hosted-MFA local remediation (2026-10-20)

Evidence: `execution/evidence/automated-20261020_070458_1018/`. The run verifies the Vercel-safe rate-limit salt path and the unchanged full application suite.

| Step | Tests | Pass | Fail | Seconds | Exit |
|---|---:|---:|---:|---:|---:|
| domain | 49 | 49 | 0 | 73 | 0 |
| web-unit | 13 | 13 | 0 | 1 | 0 |
| production build | — | — | — | 60 | 0 |
| acceptance | 114 | 114 | 0 | 38 | 0 |
| surface | 139 | 139 | 0 | 31 | 0 |
| journey | 36 | 36 | 0 | 27 | 0 |
| CMS | 29 | 29 | 0 | 36 | 0 |
| portal | 17 | 17 | 0 | 24 | 0 |
| security | 28 | 28 | 0 | 30 | 0 |
| Edge CSP B-38 | 11 | 11 | 0 | 26 | 0 |
| real Edge E2E | 42 | 42 | 0 | 84 | 0 |
| visual/bidi/a11y/SEO/i18n | 961 | 961 | 0 | 111 | 0 |
| **Total** | **1439** | **1439** | **0** | | |

Skipped/todo: 0. All twelve steps exited 0; the disposable DB, lock and local server were removed. This is the final automated source evidence used for the hosted remediation.

---
## Update — S8 protected hosted Preview verification (2026-10-20)

- Deployment `dpl_Gfn24PRnswhPSZt2T6d2ra8G9BZ3` is `READY` at `https://otonom-smart-home-573rphmhc-team-1626.vercel.app`; it is Preview, the previous Preview remains READY, and Production count is zero.
- Anonymous `/` and `/api/ready` requests redirect to Vercel Authentication. All 25 remote environment entries remain Preview-only and the same synthetic Neon Preview database was preserved.
- Real Microsoft Edge rendered `/en`, `/ar` and `/staff/login`; staff login hydrated with zero console warn/error entries. An incorrect and an expired MFA code were rejected; the current code succeeded and opened `/admin`. The EDITOR session survived reload, the users API denied the role, and logout ended the session.
- `/ar/shop` and `/ar/support/warranty` remained informational with no forms; `/api/account/devices` returned `NOT_AVAILABLE_IN_PREVIEW`.
- Hosted MFA enrollment was **NOT EXERCISED** because no dedicated unenrolled synthetic account existed and the Preview database was preserved. A fresh hosted CSP response-header and nonce-rotation capture was **NOT CAPTURED** by the available Edge interface. Neither item is claimed as PASS.
- Structured evidence: `execution/evidence/s8-hosted-20261020/summary.json`. This is hosted functional evidence, not a human accessibility review, independent security test, or public-production approval.

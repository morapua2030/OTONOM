# Tests Baseline and Runbook

## Historical evidence, not a fresh Codex claim

- S3 final, 2026-10-15: 1095/1095 automated checks.
- S4 baseline, 2026-10-16: 1095/1095.
- S4 final, 2026-10-16: 1114/1114: domain 41, web-unit 7, acceptance 107, surface 84, journey 36, CMS 29, portal 17, security 23, Edge E2E 41, visual 729.
- S4 addendum later states the domain target guard raised domain to 42/42 outside that archived 1114 total. A fresh comprehensive run must settle the current count.

## Fresh Codex evidence

- S5 baseline before runner hardening: 1115/1115, all steps exit 0; `execution/evidence/codex-baseline-20261016/`.
- S5 final with isolated HTTP/browser DB: 1115/1115, zero failures/skips/todos, all steps exit 0; `execution/evidence/codex-isolated-final-20261016/`.
- S6 final after CSP/reliability work: 1180/1180, zero failures/skips/todos, all steps exit 0; `execution/evidence/s6-final-20261018/`.
- Final suite counts: domain 42, web-unit 7, acceptance 107, surface 84, journey 36, CMS 29, portal 17, security 23, Edge E2E 41, visual 729.
- The runner records and drops a unique disposable `otonom_e2e_*` clone; `otonom_dev` stayed PREVIEW and retained its guarded zero-value invariants.

## Safe preflight

1. Confirm `D:\otonom\app` is the workspace and no other server owns port 3301.
2. Verify PostgreSQL TCP at `127.0.0.1:5433` and query only `current_database()`, version, and schema metadata first.
3. Confirm target DB is `otonom_dev` or an explicitly disposable `otonom_test_*` / `otonom_e2e_*` database. Never reset an unidentified DB.
4. Confirm a recent verified backup/restore drill exists before migrations. Latest known: `app/backups/otonom_dev-20261016-160735.dump` and matching drill JSON.
5. Inspect `app/tests/run-all.sh` before execution. It starts the local production server, clears only the test rate-limit bucket in the known dev DB, and writes fresh results.

## Commands

From Git Bash/MSYS:

```sh
cd /d/otonom/app
bash tests/run-all.sh
```

PowerShell can invoke:

```powershell
bash D:/otonom/app/tests/run-all.sh
```

Fast read-only checks use `node --version`, `pnpm.cmd --version`, `Test-NetConnection`, and PostgreSQL metadata queries. Never print password files.

## Evidence expectations

- `app/tests/results/run-all/summary.json` must have a timestamp from this run and every step exit 0.
- Preserve per-suite logs and JSON; copy a sanitized run snapshot under `execution/evidence/`.
- Report tests, passes, failures, skips and any crashed suite separately.
- A build is a step, not a counted test.
- Real Edge E2E must be distinguished from API and screenshot-only checks.

## Known non-automated obligations

Human RTL/Arabic visual review, screen-reader review, formal WCAG audit, independent penetration test, other browsers, HTTPS/reverse proxy, multi-instance behavior, target Linux performance, real email/object storage/AV/payment, and production restore remain PENDING/BLOCKED.

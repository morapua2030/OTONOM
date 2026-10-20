# Safety and Environment

## Verified host facts

- Workspace: `D:\otonom`; application: `D:\otonom\app`.
- Windows host; Node 24.20.0; pnpm 10.33.0.
- PostgreSQL endpoint responded at `127.0.0.1:5433`; read-only identity query returned database `otonom_dev`, PostgreSQL 17.11, and 70 non-system tables.
- Port 3301 was not listening during initial handoff inspection.
- Latest known verified backup/restore drill: 2026-10-16 16:07 local, 70 tables, row counts matched, four append-only triggers.

## Hard bans

No Git/GitHub or `.git` access; no Railway/cloud/public deployment; no paid services; no public tunnel; no real customer/payment data; no publication of private engineering material; no invented commercial/legal/technical claims.

## Database guards

- Read target identity before setup/migration/reset.
- Allowed local names in the guard: `otonom_dev`, `otonom_test_*`, `otonom_e2e_*`, `otonom_restore_drill`.
- Back up and prove restore before any schema migration against important dev data.
- Prefer a separate disposable E2E DB and unique run IDs.
- Never expose local secret-file contents in logs or reports.

## PREVIEW safety

Public commerce, account/warranty transactional routes, cart, checkout, shop and warranty portal must stay server-gated. Navigation hiding is insufficient; direct HTTP requests must return the expected 404/blocked result. Internal authorized staff preparation may remain available with synthetic data.

## When services are unavailable

Record the exact unavailable dependency; do not reset data to force green tests. Continue source inspection, unit checks, report reconciliation, and other independent work. Windows measurements are never production/Linux evidence.


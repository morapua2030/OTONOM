# OTONOM Web Platform

> **Synthetic data only. Public production is not authorized.** A private GitHub repository and protected, noncommercial Vercel Preview were authorized on 2026-10-18; deployment remains pending verified account access, protected-project configuration, and isolated staging infrastructure.
> Architecture: **PROVISIONAL** (Option A from the spike: Next.js 16 + Payload CMS 3 + PostgreSQL, with a framework-independent domain package).
> Public Commerce and Warranty remain disabled in PREVIEW. Local secrets, databases, uploads, browser profiles, and generated evidence must never be committed.

## Layout
| Path | Purpose |
|---|---|
| `packages/domain/` | Framework-independent domain layer. Contents: versioned SQL migrations (`migrations/00x_*.sql`, checksummed); inventory reservation (spike-verified); manual payments; contracts + exclusive attribution + cohort; KPI computation; permission matrix. Tests in `test/` |
| `web/` | Next.js + Payload app. Public bilingual site (`/ar`, `/en`), Payload admin (`/admin`), staff MFA sign-in (`/staff/login`), API endpoints (`/api/*`) |
| `tests/` | Black-box HTTP acceptance suite against a running local server |
| `.local-secrets/` | Locally generated secrets and synthetic dev credentials. **Never copy, share or commit** |
| `backups/` | Output of `tools/backup-restore-drill.sh` (pg_dump of the dev DB + drill reports). Dumps contain synthetic credentials (hashes, TOTP secrets): **treat like `.local-secrets/`** |
| `tests/run-all.sh` | Full local regression: domain + unit → build → server → acceptance, surface, journey, cms, portal, security, visual → `tests/results/run-all/summary.json` |

## Database
Uses the portable PostgreSQL 17.11 cluster started by the spike (`127.0.0.1:5433`, data in `../spike/architecture-feasibility-20261014/pgdata`).
- Database: `otonom_dev`.
- Role `otonom_cms` owns schema `cms` (Payload). It has **no rights** on `domain`.
- Role `otonom_domain` is the least-privilege role for domain services. It can't UPDATE/DELETE audit, ledger or attribution-history rows.

Start/stop the cluster (no Windows service):
```powershell
D:\otonom\spike\architecture-feasibility-20261014\tools\pgsql\bin\pg_ctl.exe -D D:\otonom\spike\architecture-feasibility-20261014\pgdata -l D:\otonom\spike\architecture-feasibility-20261014\evidence\raw-logs\postgres-server.log start
D:\otonom\spike\architecture-feasibility-20261014\tools\pgsql\bin\pg_ctl.exe -D D:\otonom\spike\architecture-feasibility-20261014\pgdata stop
```

## First-time setup
```bash
cd D:/otonom/app
pnpm install --offline                      # reuses the spike's verified package store
pnpm --filter @otonom/web run db:setup      # roles, database, domain migrations, payload secret
cd web && npx payload migrate               # Payload (cms schema) migrations
npx tsx scripts/seed.ts                     # synthetic staff users + claims registry + SKUs (no prices)
npx payload generate:importmap && npx next build && npx next start -H 127.0.0.1 -p 3301
```
Staff sign-in: `http://127.0.0.1:3301/staff/login`. Credentials and TOTP secrets for the synthetic accounts are in `.local-secrets/dev_users.json`.

## Tests
```bash
pnpm test:domain        # disposable DBs otonom_test_kpi / otonom_test_w1 (dropped and recreated each run)
# start the server with OTONOM_TRUST_PROXY=1 so the suite can emulate distinct clients, then:
pnpm test:http          # black-box acceptance against http://127.0.0.1:3301 → tests/results/acceptance-latest.json
```
The W1 checks switch the stage to COMMERCIAL and always restore PREVIEW (`try/finally`).

## Conventions (from the spike)
- Explicit `access` on every collection/global, plus field-level access on sensitive fields. Admin `readOnly` is UI-only, so system fields are reset in hooks.
- Never register root custom endpoints under a collection slug (`/api/<slug>/...` is shadowed). Use `/api/workspace/...` or `/api/admin/...`.
- Domain writes go through `@otonom/domain` with a `Ctx { actor, correlationId }`. Never write to `domain.*` from Payload hooks.
- Bidi: `dir="ltr"` inputs for phone, email, dates and codes. `<bdi>` around LTR tokens in Arabic text.

## W1 (commercial) — implemented behind the server-side gate
Settings global `stage` = PREVIEW (default) → every public commerce/portal endpoint returns 404. In COMMERCIAL:
- `POST /api/shop/orders` refuses any SKU without an OWNER-approved price (`PRICE_NOT_APPROVED`). No prices are seeded.
- `POST /api/warranty/claims` records a claim for triage only. Coverage activation requires an approved warranty policy (none is seeded; duration is BLOCKED).
- Service tickets and customer devices are not implemented (501).

## What is intentionally NOT done / BLOCKED
| Item | Status | Why |
|---|---|---|
| Public production launch | NOT AUTHORISED | Only a protected, noncommercial Vercel Preview is approved |
| Protected Vercel Preview | IN PREPARATION | Requires verified Vercel identity/project, deployment protection, isolated synthetic PostgreSQL, and target-platform checks |
| Privacy notice text | BLOCKED (legal) | The RFQ form links to a placeholder |
| Acknowledgement emails | NOT SENT | No email provider approved |
| File uploads in public RFQ | DISABLED (variant P-A) | Security gate items (AV scanning, approved retention) not met |
| Prices, SKUs, shipping, warranty duration, policies | BLOCKED | Owner/legal inputs missing. Placeholders only |
| Case studies | None published | Written consent required |
| Compatibility claims | None publishable | Evidence not reviewed (registry seeded with OWNER_REPORTED / PROHIBITED) |

## Protected Preview database migration safety

Remote migrations are never automatic during a Vercel build or runtime start. An operator must use the admin connection from a secured workstation and provide all one-shot gates shown in `.env.example`: `OTONOM_ALLOW_REMOTE_MIGRATIONS=SYNTHETIC_PREVIEW_ONLY`, `OTONOM_FORCE_PREVIEW=1`, and exact expected host/database values. The guard derives the real target from `OTONOM_ADMIN_DATABASE_URL`, refuses production-like names, and requires `OTONOM_DB` to match the URL database. Do not store the admin URL or migration gate in Vercel.
| Brand tokens | Placeholders | Official brand files not supplied |

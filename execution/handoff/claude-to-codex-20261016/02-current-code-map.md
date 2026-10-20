# Current Code Map

## Workspace

- `app/package.json` — pnpm workspace entry point and supported scripts.
- `app/web/` — Next.js 16 App Router + Payload CMS 3 application.
- `app/packages/domain/` — framework-independent PostgreSQL domain services and SQL migrations.
- `app/tests/` — HTTP, journey, CMS, portal, security, real-Edge E2E, and visual suites.
- `execution/` — reports, wave notes, evidence, and sanitized screenshots.
- `docs/planning-gate-M2W1-precode/` — approved decisions, requirements, architecture criteria, and traceability.
- `spike/architecture-feasibility-20261014/` — historical architecture spike and local PostgreSQL tooling. Do not expose its local secrets.

## Web entry points

- Public routing: `app/web/src/app/(site)/` and localized routes below `[locale]/`.
- Payload/admin routing: `app/web/src/app/(payload)/admin/` and `api/`.
- Server API/domain bridge: `app/web/src/endpoints/index.ts`.
- Payload collections: `app/web/src/collections/`; settings: `app/web/src/globals/Settings.ts`.
- Access/workflow/audit/gates: `app/web/src/lib/access.ts`, `workflow.ts`, `audit.ts`, `public.ts`, `server.ts`.
- Staff views: `app/web/src/components/admin/OverviewView.tsx`, `ProjectsView.tsx`, `ContentReviewView.tsx`, `KpiView.tsx`, `StoreView.tsx`, and `ServiceView.tsx`.

## Domain and data

- Domain services: `commerce.ts`, `orders.ts`, `inventory.ts`, `warranty.ts`, `service.ts`, `contracts.ts`, `kpi.ts`, `admin-ops.ts`.
- Database/transactions: `db.ts`, `tx.ts`, `migrate.ts`.
- Domain migrations: `app/packages/domain/migrations/001...008`.
- Payload migrations: six dated migrations through `20261016_111606_review_notes` plus `index.ts`.

## Test entry points

- `pnpm test:domain`, `test:web`, `test:http`, `test:surface`, `test:journey`, `test:cms`, `test:portal`, `test:security`, `test:e2e`, `test:visual`.
- Complete runner: `bash D:/otonom/app/tests/run-all.sh`.
- Results: `app/tests/results/run-all/summary.json` and per-suite `*-latest.json` files.
- Real browser harness: `app/tests/src/browser.ts`; E2E cases: `app/tests/src/e2e.ts`; installed Microsoft Edge is used over CDP.

## Runtime variable names

`OTONOM_PG_HOST`, `OTONOM_PG_PORT`, `OTONOM_DB`, `OTONOM_PG_SUPERUSER`, `OTONOM_PG_SUPERUSER_PW_FILE`, `OTONOM_BASE`, `OTONOM_SITE_URL`, `OTONOM_TRUST_PROXY`, `OTONOM_TEST_PAGES`, and test-only `KPI_SEED`. Values and secrets are deliberately omitted.


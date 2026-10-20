# 04 — Architecture Options

> Evaluation only. **No option is approved and nothing has been implemented.**
> Framework facts below are based on the agent's knowledge (cutoff mid-2026). **Versions and feature claims must be re-verified during the spike** (doc 05 §9).

## Constraints that drive the choice
1. **One developer plus AI agents.** Build and maintenance effort matter more than theoretical scalability.
2. Low transaction volume at launch, but **high integrity needs**: inventory, serials, contract values and attribution must be correct and auditable.
3. **Bilingual editorial CMS** with review workflow, plus **three back-office areas** (Projects, Store, Service). An admin UI is a large share of the effort.
4. Railway hosting later: one or a few containers, managed PostgreSQL, object storage.
5. Arabic RTL must work in both the public site and, ideally, the admin.

## Options

### Option A — Next.js (App Router) + TypeScript + PostgreSQL, fully custom modular monolith
Public site, route handlers/server actions, and a **hand-built** admin UI in one Next.js app. ORM: Drizzle or Prisma. Auth: Better Auth or Auth.js. CMS: custom tables for localized content.

### Option B — Next.js frontend + NestJS API + PostgreSQL, monorepo (pnpm/Turborepo)
Clear API boundary, DI, and modules. Two deployables. Admin UI is still hand-built, or uses a generic admin such as react-admin.

### Option C — Next.js + mature CMS/commerce framework + lean custom domain modules
- **C1:** **Payload CMS 3** embedded *inside* the Next.js app (one deployable). PostgreSQL adapter, built-in admin UI, auth, access control, localization, drafts/versions, uploads, jobs queue. Custom collections and a service layer handle RFQ/CRM, inventory ledger, serials, warranty and attribution.
- **C2:** Next.js storefront + **Medusa v2** (commerce engine) + a headless CMS (Sanity/Strapi) + a custom RFQ service. Three or more systems.

## Comparison
Scores: 1 (poor) – 5 (excellent) for this project's context.

| Criterion | A: Custom Next.js | B: Next.js + NestJS | C1: Next.js + Payload (embedded) | C2: Medusa + headless CMS |
|---|---|---|---|---|
| B2B RFQ + attribution complexity | 4 (full control) | 4 | 4 (custom collections + service layer) | 3 (custom service anyway, extra integration) |
| Variants / inventory / serial / warranty | 4 (custom ledger) | 4 | 4 (custom ledger. Do **not** depend on a generic e-commerce plugin for reservations) | 3 (Medusa inventory is good, but serial/warranty/reservation-at-confirmation semantics still need customisation) |
| Bilingual content + editorial workflow | 2 (must build editor, versions, preview) | 2 | **5** (field-level localization, drafts, versions, live preview built in) | 4 (headless CMS strong, but a separate system) |
| Admin UI effort (Projects, Store, Service workspaces) | 1 (all hand-built) | 1 | **4** (generated admin + custom views/components) | 3 (Medusa admin + CMS admin + custom RFQ admin = 3 UIs) |
| Security boundaries / RBAC evolution | 4 (custom, must get right) | 4 | 4 (function-based access control per collection/field. MFA needs verification) | 3 (three auth domains) |
| Transaction integrity / audit | 5 | 5 | 4 (Postgres transactions available. Domain ops should run in an explicit transaction service. Verify in spike) | 3 (cross-system consistency is harder) |
| Railway deployment / cost | 5 (1 service + PG) | 3 (2 services + PG) | **5** (1 service + PG + bucket) | 2 (3+ services, Redis for Medusa) |
| Dev speed (1 dev + AI) | 2 | 2 | **4** | 2 |
| Testing / migrations / observability | 4 | 4 | 4 (Payload migrations + custom SQL migrations must be coordinated) | 3 |
| Vendor lock-in | 5 (low) | 5 (low) | 3 (data stays in plain Postgres tables, but admin/config tied to Payload. MIT licence. Payload was acquired by Figma in 2025, so long-term roadmap risk needs monitoring) | 2 |
| Future marketplace / 3D readiness (without prebuilding) | 4 | 4 | 4 | 4 |
| **Overall complexity / risk** | Medium complexity, **high delivery risk** (scope) | High complexity, high delivery risk | **Medium complexity, medium risk** (framework learning curve, plugin gaps) | High complexity, high risk |

## Key trade-offs
- **A is the most controllable but the slowest.** The CMS and three admin workspaces would consume most of the budget before the B2B value ships.
- **B adds a second deployable and an API contract layer.** That suits a team, not one developer. Its benefits (independent scaling, separate teams) aren't needed now.
- **C2 multiplies systems**, auth domains and hosting cost. Medusa is strong for high-volume retail, but OTONOM sells three controller models and gets most of its value from projects.
- **C1 removes the largest effort item (admin + CMS)** and stays a single deployable on PostgreSQL. Its risks are specific and testable in a spike:
  1. admin MFA (not known to be built in; plugin or custom strategy needed),
  2. a custom Draft → **Review** → Publish workflow on top of drafts/versions,
  3. transactional domain operations (reservation, serial assignment) inside or alongside Payload's DB adapter,
  4. Arabic RTL rendering in the admin,
  5. build/start footprint on Railway.

## Recommendation
**Option C1: a Next.js + Payload CMS 3 modular monolith on PostgreSQL**, with a strict internal rule. Payload owns content, auth, admin UI and simple CRUD. **Business-critical state transitions** (order confirmation/reservation, serial assignment, contract value changes, attribution classification) go through a **typed domain service layer** with explicit DB transactions, idempotency keys and audit events. Plain Postgres tables keep the data portable.

**Fallback:** if the spike fails on MFA, RTL or transactions, use **Option A** with a lighter admin (shadcn/ui tables + forms) and a smaller CMS scope. Do not choose B or C2.

See `05-proposed-architecture.md` (ADR-001, status **PROPOSED**).

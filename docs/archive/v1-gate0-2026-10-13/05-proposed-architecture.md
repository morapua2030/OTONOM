# 05 — Proposed Architecture (ADR-001)

| ADR | ADR-001 — Application architecture |
|---|---|
| Status | **PROPOSED, not approved.** Implementation is not authorised |
| Decision | Next.js (App Router, TypeScript strict) + Payload CMS 3 embedded, PostgreSQL, S3-compatible private object storage, deployed later as **one** Railway service |
| Precondition | A time-boxed technical spike (§9) passes |

## 1. Context
See doc 04. The choice optimises for one developer plus AI agents, bilingual editorial needs, three internal workspaces, and strict integrity for money, stock and serial records.

## 2. High-level view

```
                 ┌──────────────────────── Next.js app (single deployable) ────────────────────────┐
 Browser ──────► │  (site)/[locale]/...   public pages, SSR/ISR, RFQ form, shop, portal             │
 (AR/EN)         │  (payload)/admin        Payload admin: CMS + Projects/Store/Service workspaces    │
                 │  /api/...               route handlers (RFQ submit, uploads, order submit, health)│
                 │                                                                                    │
                 │  src/domain/*   ← typed domain services (transactions, state machines, audit)     │
                 │  src/payload/*  ← collections, access control, hooks (thin; delegate to domain)   │
                 └───────────┬─────────────────────────────┬──────────────────────────┬─────────────┘
                             │                             │                          │
                     PostgreSQL (single DB)       Private object storage      Email provider (transactional)
                     - Payload tables             - rfq-uploads (private)     (provider OPEN)
                     - domain tables (ledger,     - payment-proofs (private)
                       audit_events, etc.)        - public-media (CDN)
                     - job queue (Payload Jobs    - quarantine/ (pre-scan)
                       or pg-boss)
                             │
                     Malware scan worker (ClamAV container), introduced when uploads go live (decision in §6)
```

## 3. Module boundaries (`src/domain/`)
| Module | Owns | Key invariants |
|---|---|---|
| `identity` | users, roles, workspace membership, MFA, sessions | server-side authz on every operation |
| `content` | pages, case studies, posts, media, SEO, consent records | publish requires review + required locales + consent (case studies) |
| `crm` | organisations, contacts, RFQs, opportunities, proposals, contracts | state machine (doc 07). Contract value changes audited |
| `attribution` | touchpoints, classification, overrides, reports | Sourced XOR Assisted XOR Non-Website XOR Unknown per opportunity (doc 09) |
| `catalog` | products, variants, SKUs, price components, options | price versions immutable once used in an order |
| `orders` | carts, orders, order lines, payments (manual), shipments | idempotent submission. State machine (doc 08) |
| `inventory` | stock locations, ledger entries, reservations | available = on_hand − reserved ≥ 0. Ledger append-only |
| `serials` | serial units, assignments, installation/commissioning | one serial ↔ at most one active assignment |
| `service` | warranty policies (versioned), registrations, tickets, RMAs | warranty computed, never manually typed |
| `files` | upload sessions, scan status, signed URL issuance, retention | no public URL for private buckets |
| `audit` | immutable audit events | append-only, no update/delete grants |

**Rule:** Payload hooks must not hold business logic. They call domain services. Domain services are unit-testable without the admin UI.

## 4. Workspaces (single admin at launch)
Payload admin groups are configured into **Projects** (CRM, RFQ, attribution, contracts), **Store** (catalogue, orders, inventory, serials), **Service** (warranty, tickets, RMA) and **Content**. Access control functions check `user.roles` / `user.workspaces` from day one, even with one admin. That makes future RBAC a data change, not a refactor.

## 5. Data and integrity patterns
- **Money:** integer minor units (`amount_minor BIGINT`) + ISO-4217 `currency`. FX snapshots stored with the source (doc 06).
- **Inventory:** append-only `inventory_ledger`, plus a `stock_levels` projection updated in the same transaction. Reservations use a conditional update (`UPDATE … SET reserved = reserved + :q WHERE on_hand - reserved >= :q`) or `SELECT … FOR UPDATE` (doc 08 §4).
- **Idempotency:** `Idempotency-Key` on order submission, RFQ submission and payment verification, stored with a unique index.
- **Audit:** `audit_events` (actor, action, entity, before/after JSON, reason, request id, timestamp), written in the same transaction as the change.
- **IDs:** UUIDv7 internal primary keys. Human references (`RFQ-2026-000123`, `ORD-…`, `CTR-…`, `RMA-…`) come from per-type sequences.
- **Migrations:** Payload migrations for Payload-managed tables. Custom SQL migrations for domain tables. Both run in CI against a real Postgres. Restore is tested before launch.

## 6. Files and uploads
- Browser → server-issued **pre-signed PUT** into `quarantine/`, with size limits and MIME + magic-byte checks after upload.
- The scan job (ClamAV) moves clean files to the private bucket. Infected files are rejected and audited.
- **Decision PROPOSED:** in MVP-A, if ClamAV hosting is not ready, keep uploads in quarantine. Admins download only through a signed URL, with a warning banner. CAD files are never rendered in-browser at MVP.
- Downloads use short-lived signed GET URLs (e.g. 5 minutes), issued only after an authz check, and each issuance is audited.

## 7. Auth
- Admin: Payload auth + **MFA (TOTP)**. The MFA mechanism is a spike item. If it isn't feasible, put `/admin` behind an identity-aware proxy (e.g. Cloudflare Access) as a compensating control.
- Customers (MVP-C): a separate `customers` auth collection. Passwordless email OTP or password + email verification (OPEN).
- Sessions: HTTP-only, Secure, SameSite=Lax cookies. CSRF protection on state-changing form posts.

## 8. Proposed repository layout (not created)
```
otonom-smart-home-web/
  docs/                      planning docs (this folder)
  src/app/(site)/[locale]/   public routes
  src/app/(payload)/         Payload admin + API
  src/app/api/               route handlers (rfq, uploads, orders, health)
  src/domain/<module>/       domain services + state machines + tests
  src/payload/collections/   Payload collection configs (thin)
  src/lib/                   i18n, validation (zod), money, ids, logging
  migrations/                custom SQL migrations
  tests/{unit,integration,e2e}
  .github/                   templates (CI only after approval, never deploy)
```
Package manager: **pnpm 10** (already installed). Node: **LTS line** pinned via `.nvmrc`/`engines`. Node 24 is installed locally. Confirm that the version Railway uses matches.

## 9. Technical spike (proposed, 3–5 working days, in a throwaway branch or folder, **only after approval**)
| # | Question | Pass criterion |
|---|---|---|
| S1 | Payload 3 + Next.js + Postgres run on Windows (Node 24) and build for production | `pnpm build` succeeds. Cold start time recorded |
| S2 | Arabic RTL in the public site and the admin | Admin renders `ar` locale acceptably. Bidi fields OK |
| S3 | Field-level localization + custom `workflowStatus` (draft/in_review/approved/published) with a publish guard | Publish blocked without review and both locales |
| S4 | Transactional domain op (reserve stock + write ledger + audit) with concurrent requests | 50 parallel reservations never oversell (integration test against real PG) |
| S5 | Admin MFA option | TOTP works, or a compensating control is documented |
| S6 | Pre-signed private uploads to S3-compatible storage | Private object is not publicly reachable. Signed URL expires |
| S7 | Container image size / memory at idle | Recorded for the Railway cost estimate |

If S3, S4 or S5 fail without an acceptable workaround → fall back to Option A (doc 04).

## 10. Consequences
- One deployable keeps Railway cost and operations minimal.
- Coupling to Payload's admin is accepted. Domain data stays in normal Postgres tables, and the domain logic lives outside Payload.
- Two migration streams need discipline (CI check: migrations applied cleanly on an empty DB and on a restored backup).

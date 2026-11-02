# OTONOM — Roadmap D1–D8

Consolidated from the 2026-11-02 remaining-work audit (private evidence). Statuses use the legend in `docs/ai/README.md`. Current verified facts are in `docs/ai/CURRENT_STATUS.md`.

## Phase table

| Phase | Status | Proof | What's missing | Depends on |
|---|---|---|---|---|
| D1–D3 corporate, website, services | `LIVE` | Canonical routes return 200 | Nothing structural | — |
| D4 portfolio framework (overview, filters, detail routes) | `LIVE` | `/en/projects` 200 with empty state | — | — |
| D4 first real case study | `DEFERRED` (DR-098) | `portfolioReleases` is empty by design | Written client consent, rights/privacy screening, verified media and outcomes, AR/EN copy | Owner materials |
| D4.4–D4.7 enhancements | `DEFERRED` | Planned after D6–D8 | — | Explicit request |
| D5 Project Builder and packages UI | `PREVIEW` | In `main` and the protected Preview; 404 on canonical | Acceptance and release in the combined candidate | S3, S4, S7 |
| D5 real public intake (RFQ) | `BLOCKED` | `PUBLIC_INTAKE_DISABLED`; hosted hard-deny | Privacy policy, consent text, retention and deletion, recipients and access, hosted test | Owner and legal approvals |
| D5 lead workflow and notifications | `BLOCKED` | No approved provider; ClickUp is manual only | Lead owner, SLA, provider or manual runbook | Owner decisions |
| D5 package commercial terms | `CONTENT PENDING` | Names, prices and items are published as supplied | Inclusions and exclusions: installation, shipping, tax, wiring, price validity, zones | Owner (S5) |
| D5.5 Hybrid 03 redesign | `PREVIEW` | PR #16 draft at `3df493e2`, CI passing | Team-lead review | S4 |
| D6-A catalogue 4R/6R/16R | `LIVE` (base) / `IMPLEMENTED (local only)` (single source) | Product routes 200; commit `a768f7b0` | Verified datasheets and specs | Owner and engineering (S5) |
| D6-B comparison | `LIVE` (base) | `/en/products/compare` | Mobile comparison layout; package contents comparison | S2; specs (S5) |
| D6-C smart product selector | `IMPLEMENTED (local only)` | Commits `f208728b`, `20563b1e`; unit and browser tests | Hosted acceptance; links to business paths for large needs | S2, S3 |
| D6-D packages integration | `IMPLEMENTED (local only)` | Commits `11cafa40`, `20563b1e` | Package state kept on language switch; hosted acceptance | S2, S3 |
| D6-E B2B / bulk / developer inquiries | `LIVE` (informational) / `BLOCKED` (functional intake) | B2B pages 200; CTA reaches disabled RFQ | Intake approvals; partner terms | D5 intake decisions |
| D6-F store, cart, checkout | `IMPLEMENTED (local only)` (architecture) / `DEFERRED` (public activation) | Gated domain services with synthetic data | Separate owner approval | `AGENTS.md` commerce rule |
| D7 customer account, devices, tickets, warranty | `PARTIAL` | Local APIs and domain logic; `/account` is a placeholder | Customer UI, email provider, warranty and after-sales policies, threat-model acceptance | S6 decisions |
| D8 quality, marketing polish, release | `PLANNED` | — | Human accessibility review, SEO/link crawl, performance budgets, G01–G16 on the exact candidate | S3–S7 |

## Agreed execution order

| Stage | Scope |
|---|---|
| S1 | Continuity and decisions (this stage) |
| S2 | Remaining D6 engineering: mobile comparison, package contents comparison, language switch keeps package state, selector → business links for large needs, audit for purchase claims |
| S3 | Full QA on the exact head: regression and production build |
| S4 | Pre-push audit, fast-forward D6 onto the PR #16 branch (DR-096), protected Preview, Vercel Shareable Link for the team lead (DR-095) |
| S5 | Owner content: verified specs and package terms |
| S6 | D7 decisions, then UI on the existing local backend with synthetic data |
| S7 | D8 polish, marketing-only mode on Production, G01–G16, release only on an owner command (DR-093) |

## Deferred (do not resume unprompted)

- D4 case-study content (DR-098)
- Public commerce and payments
- Device control
- Railway or any new paid service
- Mobile-app store links
- 3D/2D experience
- Physical product branding

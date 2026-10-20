# 12 — Test Strategy and Acceptance Gates (DRAFT)

## 1. Test layers
| Layer | Tooling (proposed) | Scope |
|---|---|---|
| Static | `tsc --strict`, ESLint, Prettier | every commit |
| Unit | Vitest | domain services, state machines, money, attribution rules, validators |
| Integration (real DB) | Vitest + **real PostgreSQL** (native local install or CI service container) | transactions, concurrency (oversell), migrations, idempotency, audit writes |
| E2E | Playwright (Chromium + WebKit, mobile viewport) | RFQ submit AR/EN, upload rejection, checkout, admin confirm, portal registration |
| Accessibility | axe-core in Playwright + manual screen-reader pass (NVDA AR/EN) | public pages, forms, portal |
| Localization | snapshot/visual tests in both `dir`s, missing-translation check in CI | — |
| Performance | Lighthouse CI on key pages (mobile) | CWV budgets |
| Security | dependency audit, ZAP baseline scan against a local build, authz tests (IDOR matrix) | — |
| Restore drill | scripted backup → restore → app boots → row counts match | before launch, then quarterly |

**Environment blocker:** Docker and PostgreSQL are not installed locally (doc 00, R-3). Proposal D-031: install native PostgreSQL on `D:`. Alternatively run integration tests only in CI (requires approval of a GitHub Actions workflow **with no deploy steps**).

## 2. Acceptance test catalogue (IDs referenced in doc 03)
| ID group | Examples |
|---|---|
| AT-WEB-01..04 | all MVP pages exist in both locales · homepage section order · brand applied · no app-store badges |
| AT-I18N-01..05 | `dir`/`lang` correct · language switch keeps the equivalent page · hreflang pairs valid · bidi of SKUs/phones correct · no missing keys |
| AT-RFQ-01..10 | valid submissions AR/EN · validation messages localized · upload type/size/magic-byte rejection · unsigned file URL denied · signed URL expires · idempotent replay · confirmation email locale · survey request recorded without price |
| AT-PRJ-01..11 | legal/illegal transitions · audit on each transition · dedupe suggestion · merge undo · SLA timer pause · proposal versioning · contract requires evidence · ClickUp summary contains no file URLs |
| AT-ATT-01..18 | UTM capture with consent · class exclusivity · lock at signature · override audit · Sourced + Assisted = Total · cohort freeze · pipeline excluded · drill-down |
| AT-COM-01..09 | catalogue display · cart · client price ignored · idempotent order · payment verification audit · tracking by ref + phone · shipping line separate · custom request routed to quote |
| AT-INV-01..06 | no oversell under concurrency · reservation only at confirmation · release once · fulfil consumes · reconciliation detects drift · adjustment needs reason |
| AT-SER-01..04 | allocate/ship/commission · single active assignment · variant mismatch rejected · RMA replacement linkage |
| AT-WAR-01..08 | registration by order match · no end date while duration NULL · policy version recorded · RMA lifecycle · customer cannot see others' tickets |
| AT-CMS-01..07 | publish guard (locales, review, consent, evidence, SEO) · rollback · AI flag · policy pages gated |
| AT-SEO-01..05 | sitemap per locale · canonical · robots blocks admin/api · JSON-LD valid · OG tags |
| AT-SEC-01..06 | admin MFA · lockout · CSRF · IDOR matrix · rate limit/Turnstile · CSP present |
| AT-PRIV-01..03 | consent recorded · privacy notice per locale · data export/delete procedure documented |
| AT-AUD-01..03 | audit events immutable (DB grants) · before/after captured · actor + reason |
| AT-A11Y-01..02 | axe 0 serious/critical · keyboard-only RFQ + checkout |
| AT-PERF-01 | LCP < 2.5 s, CLS < 0.1, INP < 200 ms (lab proxy) on Home, Projects, Product, RFQ |
| AT-OPS-01..02 | restore drill passes · health check + error tracking wired |

## 3. Phase gates
| Gate | Entry | Exit criteria | Approver |
|---|---|---|---|
| G0 Workspace audit | — | doc 00 complete, blockers listed | User |
| G1 Planning approval | G0 | PRD, MVP phasing, ADR-001 reviewed. Decisions D-006, D-017, D-018, D-021 resolved or explicitly deferred | User |
| G2 Repo foundation | G1 + GitHub identity resolved | Local repo with `.gitignore`, docs, tooling. Private remote created **(separate approval)**, first push **(separate approval)** | User |
| G3 Spike | G2 | S1–S7 results documented (doc 05 §9). ADR accepted or fallback chosen | User |
| G4 MVP-A build complete | G3 | all MVP-A ATs pass in CI. Content + consent + evidence ready | User |
| G5 Pre-production readiness | G4 | security review, restore drill, legal pages approved, cost estimate | User |
| G6 Deploy | G5 + **explicit deployment approval** | staging first, then production | User |

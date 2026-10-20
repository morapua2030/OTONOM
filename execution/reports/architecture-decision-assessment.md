# Architecture Decision Assessment (refreshed after S7)

**Decision under review:** Option A, Next.js 16 + Payload CMS 3 + PostgreSQL with a framework-independent `@otonom/domain` package. Status: **PROVISIONAL, local development only.** Approval belongs to the owner (B-01).

## 1. Did the provisional choice hold up during real implementation?
| Spike assumption | What implementation showed | Verdict |
|---|---|---|
| Payload saves building the editorial/admin surface | Drafts, versions, localization (ar RTL), media uploads, migrations and the admin were used as-is. 12 collections + 1 global with versions | **Confirmed** |
| The generated API surface is the main risk; explicit access + probes contain it | Two real gaps were found and fixed; S6 unified registration/probing and S7 kept surface 139/139 | **Confirmed, with a standing cost:** every collection remains in the shared manifest and five-identity probe |
| The domain package keeps transactional integrity independent of the CMS | Orders, stock, serials, payments, contracts, attribution, warranty and service all live in `domain` with DB constraints, append-only triggers and least-privilege grants. The CMS role has no access to them | **Confirmed** |
| Cross-system consistency is manageable without distributed transactions | Retry-safe signing + reconciliation job (detect/repair) | **Acceptable** (local); monitor on the target |
| Framework friction is limited | Encountered: minified error names (workaround: explicit error names), collection routes shadowing custom endpoints (convention), `loggingLevels` typing, required-locale validation masking authorisation in tests (probe-design lesson) | **Manageable**; documented conventions |
| Performance adequate | Local: 15–22 ms p95 for public pages; about 140 KB JS per page; admin about 640 KB | **Adequate locally**; Linux target NOT TESTED |

## 2. Option C fallback is still feasible
All transactional business logic lives in `@otonom/domain`, with no Payload dependency: 1,874 non-blank lines of SQL migrations + services, plus 40 domain tests. The web layer (Payload collections, endpoints, pages) is 3,460 non-blank lines; tests are 2,252. A switch to Option C would rebuild:
- the CMS (editorial workflow, localization, media, versions);
- authentication and the admin UI;
- the generated-surface controls.

It would **not** rebuild orders, inventory, KPI, warranty or service logic.

## 3. Conditions that would reverse the recommendation
- A Payload upgrade that breaks the access/convention model and cannot be contained (B-43 rehearsal pending).
- A need for future staff workflows that the current custom admin views cannot reasonably host. S3/S4 proved Projects, KPI, Store, Service, Overview and Content Review views locally and B-40 is now resolved; substantial new workflow pressure would reopen this criterion.
- Payload licensing or maintenance changes (monitor).

## 4. Recommendation to the owner
Approve Option A for the next stage (continued local development and then a non-public staging environment once hosting is authorised), with these binding conventions:
- explicit access + field access + surface probe for every collection;
- domain writes only through `@otonom/domain`;
- forward-only checksummed migrations;
- no custom endpoints under collection slugs;
- bidi components;
- run `tests/run-all.sh` before every release candidate.

This is a recommendation, **not** an approval.

## S7 evidence and objective sign-off questions

S7 did not change the architecture. The current stack passed **1430/1430** local checks, including Edge E2E 42/42 and nonce-CSP 11/11. UI expansion did not require moving transactional logic into Payload. This supports Option A provisionally; it does not answer target-platform or framework-upgrade risk.

Before B-01 can become APPROVED, the owner should answer:

1. Is the explicit collection manifest + five-role probe an accepted permanent maintenance cost?
2. Is English-first Payload admin acceptable while public pages remain bilingual?
3. Is the domain/CMS transaction boundary plus reconciliation acceptable for the intended operating model?
4. Must B-43's controlled Next/Payload upgrade rehearsal pass before approval or only before staging?
5. What target-platform evidence (proxy, multi-instance, restore and performance) is required for sign-off?

Recommendation remains Option A with Option C as fallback. Status remains **PROVISIONAL**.

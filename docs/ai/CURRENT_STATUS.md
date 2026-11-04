# OTONOM — Current verified status

| Field | Value |
|---|---|
| Checked at (Cairo) | 2026-11-04 (D8-C v5) |
| Repository | `morapua2030/OTONOM` (public) |
| Local branch / code head | `codex/d6-products-smarthome-20261102`. Up to `624b70b2` (D8-C v4) is in PR #16. The D8-C v5 commits (`d9c75bd7` onward) are pushed only if their full verification on one SHA passes (owner pre-authorization 2026-11-04). |
| `origin/main` | `b6181212` (contains D5); `git ls-remote`, checked now |
| PR #16 | `OPEN`, draft, head `624b70b2` on `codex/hybrid03-redesign-20261028` (Hybrid 03 + D6 + design v2 + v3.1 inner pages + v4 simulator, added by fast-forward on 2026-11-03). GitHub Quality Gate on that head: PASS. |
| Public canonical | `https://otonom-smart-home-web.vercel.app` serves the D4-era build. Source fingerprint `57f72bc` is HISTORICAL (2026-11-02 project map). Route fingerprint re-verified now with anonymous GET: `/en`, `/ar`, `/en/products`, `/en/products/16r`, `/en/projects` → 200; `/en/start-project`, `/en/smart-home/packages` → 404 |
| Protected Preview | Preview of `624b70b2` (D8-C v4): READY, Preview target, Vercel Authentication on; the owner creates its Shareable Link. Earlier Previews (including `0dabf70a`) are preserved. URLs, IDs and links are kept in private evidence. |
| Brand Guardian | `validate_brand.py --project app/web` PASS on the D8-A candidate (2026-11-03, 0 legacy references) |
| Release gates | Production is frozen (DR-093); canonical unchanged (`/en` 200, D5/D6 routes 404). There is no G01–G16 verdict for any D6 candidate. |
| Latest owner decisions | DR-092..DR-113, recorded 2026-11-03 and 2026-11-04 |

## Phase status

| Phase | Status | Basis |
|---|---|---|
| D1–D3 corporate, website, services | `LIVE` | Canonical routes return 200 (2026-11-02 audit; spot-checked now) |
| D4 portfolio framework | `LIVE` | `/en/projects` → 200, with the editorial empty state |
| D4 case-study content | `DEFERRED` | DR-098: zero entries until materials and written client permissions exist |
| D5 Project Builder and packages UI | `PREVIEW` | In `origin/main` and the protected Preview; 404 on canonical |
| D5 public intake backend | `BLOCKED` (disabled) | Endpoint returns `PUBLIC_INTAKE_DISABLED`; hard-denied on hosted builds |
| D5.5 Hybrid 03 redesign | `PREVIEW` | PR #16 draft; protected Preview of `025d382b`. Page styling superseded by design v2 (DR-099); logo files unchanged |
| D8-C design v2 (Claude Design, option A) | `PREVIEW` | 2026-11-03: DR-099..DR-105; Home (mix), v2 packages, controllers and contact, inner template, self-hosted fonts, published phone/WhatsApp (no form), brochure photos, D8-A carry-overs. PR #16 head `1a7a1b9a` and its protected Preview; its background full chain was stopped on the owner's instruction because v3 supersedes it |
| D8-C v3 inner pages (Claude Design v3.1) | `PREVIEW` | 2026-11-03: DR-106..DR-109; header, drawer, footer and address; service template, smart-home landing, services index, company, support, business, product, Our work (empty state) and Start a project (chips → one WhatsApp message); `/products` without the selector; 308 redirects for routes outside the design; privacy page removed. Verification on this head: private evidence `execution/evidence/d8c-v3-2026-11-03/` |
| D8-C v4 simulator + restored selector (Claude Design v4) | `PREVIEW` | 2026-11-03: DR-110..DR-112; "Try your smart home" at `/try` (four stages, demo only, `?demo=` allow-list) with entry points on Home, Smart Home, Packages, Controllers, 16R, drawer and footer; the Smart Product Selector is back on `/products`, restyled to v3. Pushed to PR #16 on «ارفع» (head `624b70b2`) with its protected Preview. Verification: private evidence `execution/evidence/d8c-v4-2026-11-03/` |
| D8-C v5 polish + release-gate hardening | `IMPLEMENTED` | 2026-11-04: DR-113; run-all exit code (self-tested), plain-text titles/meta, localized 404 title, footer "English" / "عربي", lighter fonts with per-locale preload (same look). Verification and push status: private evidence `execution/evidence/d8c-v5-2026-11-04/` |
| D6 products and smart home | `PREVIEW` | Commits below are in PR #16 and the protected Preview of `025d382b`; full local QA on `16c2b42a` plus d4 on `025d382b` |
| D7 customer account, devices, service, warranty | `PARTIAL` | Local backend foundations only; no customer UI; not authorized live |
| D8-A full-site audit + objective fixes | `IMPLEMENTED (local only)` | 2026-11-03: 21 objective findings fixed in `b181dab3`..`51069f26`; after-run has 0 axe violations, 0 broken links/anchors, 0 console errors; 18 design/content items listed for D8-C |
| D8-D release dry-run | `IMPLEMENTED (local only)` | 2026-11-03: delta from live Production has no migrations and no new env names; gate dry-run `PROMOTION_ALLOWED=false` as expected; plan in `RELEASE_CHECKLIST.md`, decisions 13–20 in `OPEN_APPROVALS.md`. Live Production is `noindex` with robots disallow-all because marketing-only mode is off |
| D8-B/E review and release | `PLANNED` | D8-B needs the owner's Shareable Link; D8-C after team-lead feedback; D8-E only on owner gates |

## D8-C v5 (2026-11-04)

| SHA | Change |
|---|---|
| `d9c75bd7` | fix(release-gate): run-all exits non-zero when any step fails (shared `run-all-lib.sh`, self-test step `run-all-selftest`) |
| `50219bd5` | fix(seo): plain-text titles and meta, without bidi control characters |
| `baa1d566` | fix(seo): localized 404 title for the localized and unknown-locale 404 |
| `a522fb98` | fix(i18n): footer language link says "English" / "عربي" as in the design |
| `66c3443c` | perf(fonts): lighter Arabic font files, per-locale preload, immutable caching |
| `05eb5a86` | test: D8-C v5 checks for plain-text meta, 404 titles, footer label and fonts |
| `24a04b3d` | docs: record D8-C v5 (DR-113) and the open follow-ups |
| `4a831d79` | fix(release-gate): INT/TERM stop run-all instead of letting it continue (the EXIT trap cleans up once) |
| `0db31503` | test(visual): META-PLAIN reads the whole document (Next 16 can stream metadata after `</head>`) |
| `50bfff23` | docs: list the two follow-up commits |
| `9f18b531` | fix(seo): keep the localized 404 title after hydration (Next 16's 404 payload still carried the default title) |
| `c77b22ae` | test: 404 title must survive hydration (`hybrid03:browser` and unit) |

The docs commit that completes this table follows these commits. Fonts: one Arabic paragraph wrapped differently with `unicode-range` descriptors, so that part was reverted; every other v4 reference screenshot is pixel-identical except the footer language label.

## D8-C v4 (2026-11-03, pushed to PR #16)

| SHA | Change |
|---|---|
| `98f67eb0` | feat(web): restore the Smart Product Selector on /products, restyled to v3 (V1) |
| `24ca1e38` | feat(web): simulator rules and copy, ported from design v4, with unit tests (V2) |
| `53a01f2e` | feat(web): "Try your smart home" simulator at /{locale}/try (V3) |
| `e721a051` | feat(web): simulator entry points on home, smart home, packages, controllers, 16R, drawer and footer (V4) |
| `5fd01f60` | feat(web): list /try in the sitemap with its hreflang alternates |
| `a5635ee2` | fix(web): selector package guidance shows registry capacity, not prices; model links to its page |
| `fa5f5d64` | refactor(web): selector WhatsApp message helpers live in lib/selector-message.ts |
| `43bd7ab4` | fix(a11y): locked simulator items use a muted colour instead of 50% opacity |
| `30b92fde` | test: simulator and restored selector checks; expectations for design v4 (V5) |

The docs commit that records this table follows these commits. Simulator copy and pure functions are ported verbatim from the design (`lib/simulator/`); a parity check against the design's own functions found 0 differences. One deliberate deviation: Premium-locked items use a muted colour instead of 50% opacity (WCAG contrast).

## D8-C v3 (2026-11-03)

| SHA | Change |
|---|---|
| `168f7329` | V1: header (Home · Smart Home · Controllers · Packages · Services ▾ · Our work · Contact), drawer, footer with the public address from `lib/contact.ts` |
| `e95b08b1` | V2/V4/V6: service template (IoT, Software, Custom), smart-home landing, `/services` index, company, support and business pages |
| `f981e872` | V3: product pages without a spec table; Smart Product Selector removed from `/products` (code kept in Git, DR-109) |
| `80c41c10` | V4: Our work empty state while no project is published |
| `79659747` | V5: Start a project as three chip groups and one WhatsApp message (no form, no input, nothing stored) |
| `75cf402b` | V7: 308 redirects (locale kept, query dropped) and every privacy link removed (DR-107, DR-108) |
| `26c8753c` | Support page keeps the warranty-disabled notice (feature gate; deviation from the design noted in the private plan) |
| `84755230` | Test expectations for v3.1 and new v3 checks (GATE-T, pre-approved within limits; table in private evidence) |

The copy is verbatim from the design (`lib/site-copy.ts`, `lib/site-copy-inner.ts`). Specs, privacy text and real projects are out of scope (DR-106). In the local synthetic test harness only, the retired routes still render, so the existing stored-XSS, claims-gate and RFQ security suites run unchanged (DR-107).

## D6 commits (in PR #16 since 2026-11-03)

| SHA | Change |
|---|---|
| `62cf81e1` | Social preview images use the Hybrid 03 wordmark |
| `26feea17` | Dedicated 1200×630 social card |
| `11cafa40` | Package R16 items link to the OTONOM 16R page (DR-094) |
| `a768f7b0` | Single source of truth for controller data |
| `f208728b` | Room-based selector with derived package guidance |
| `20563b1e` | Mode-aware selector copy, unique room control names, builder package notice |
| `b5cbef15` | Mobile comparison, package contents table, locale switch keeps validated state, selector business links, purchase-claims audit (0 claims found) |
| `16c2b42a` | Package table heading outside the scroll region, quantity clarity (×2/×2/×1), Builder `?package` follows the select |
| `b6c9a04b` | S3 QA results recorded |
| `025d382b` | d4 browser test scrolls the product photos into view before checking lazy images (test only) |

## D8-A (2026-11-03, local only, not pushed)

The audit ran on the production build with no synthetic flags, against a disposable clone that was dropped afterwards. It covered 42 public routes in AR and EN at 390 and 1440 px. Checks: axe-core 4.14.0 (WCAG 2.0/2.1 A/AA), keyboard, SEO/i18n inventory, link crawl, error pages, console/network and screenshots. Private evidence (git-ignored): `execution/evidence/d8a-2026-11-03/` (`d8a-report.md`).

| SHA | Change |
|---|---|
| `b181dab3` | axe-core 4.14.0 pinned as a tests-only dev dependency (`pnpm audit` clean) |
| `1e9136d0` | Escape closes the header menus; the skip link focuses `<main>`; the package badge uses the AA blue token |
| `fdaea76d` | Latin and number runs in Arabic copy are isolated with `<Bidi>` (copy unchanged) |
| `51069f26` | The `/solutions#individuals` and `#businesses` anchors exist; breadcrumbs no longer link to the missing `/business` and `/legal` |

| Run on `51069f26` | Result |
|---|---|
| Full regression (`tests/run-all.sh`, unchanged) | 1926/1926 |
| `pnpm test:web` / `pnpm test:release-gate` | 102/102 / 17/17 |
| `d3:browser` / `wave1:browser` (run-all flags) | 210/210 / 2881/2881 |
| `hybrid03:browser` (no synthetic flags) | 31/31 on rerun. The first run was 30/31: the `#package-plus` anchor check measured during smooth scrolling (timing; test unchanged, listed for D8-C) |
| `d4:browser` | 144/144 |

Open D8-C items include the following (full list in the private report):
- 8 indexable placeholder routes missing from the sitemap;
- `metadataBase` (canonical and hreflang are relative);
- the 404 server-rendered as Next's error shell;
- the unknown-locale default 404;
- 404, gated and home titles;
- a footer logo layout shift;
- the retired `otonom-logo.png` file;
- the Builder's disabled "Continue" button without a reason.

## Previous tests (S3, HISTORICAL, QA head `16c2b42a`, 2026-11-03, local Windows, synthetic data)

Private evidence folder (git-ignored): `execution/evidence/automated-20261103_011305_972/` in the D6 worktree.

| Run | Result | Notes |
|---|---|---|
| Backup/restore drill (`tools/backup-restore-drill.sh`) | PASS | 77 tables, `rowCountsIdentical=true`, 0/9 bad-stock/append-only, 0 restore errors |
| `pnpm install --frozen-lockfile` | PASS | — |
| `pnpm test:web` | 102/102 | — |
| `pnpm test:release-gate` | 17/17 | — |
| `pnpm audit --prod` | PASS | No known vulnerabilities |
| `pnpm build` (CI ephemeral config, process env only) | PASS | 25 routes (23 dynamic, 2 static) |
| Full regression (`tests/run-all.sh`, unchanged) | 1926/1926 | domain 66, web-unit 102, release-gate 17, acceptance 115, surface 139, journey 36, cms 35, portal 22, security 37, csp-edge 11, e2e 44, visual 1302. Previous baseline 1895/1895 on `3df493e2` (HISTORICAL) |
| `d3:browser` (production build, run-all flags) | 210/210 | Functional 190/190; console 20/20 |
| `wave1:browser` (production build, run-all flags) | 2881/2881 | Functional 2601/2601; console 280/280 |
| `hybrid03:browser` (production build, no synthetic flags) | 31/31 | Functional 24/24, including the `#package-plus` anchor check (headless); console 7/7. With run-all's synthetic RFQ flag the suite stops at its "intake disabled" step, as designed for that flag |
| `d4:browser` (production build) | 144/144 | Re-run on `025d382b` after the test-only scroll fix (S4); the S3 run on `16c2b42a` stopped at `en@320` on lazy images (Edge 156) |
| Performance (`perf.ts` + the same method for D6 routes) | Measured, no threshold | Mobile cold transfer: `/ar` 242 KB, `/ar/products` 244 KB, `/ar/smart-home/packages` 187 KB, `/ar/start-project` 197 KB; cold LCP 264–652 ms locally |
| Pre-push scan `3df493e2..16c2b42a` | Clean | gitleaks not installed; pattern scan hits are rule text only; no evidence, env, secret, backup, dump or screenshot files in the range |

## References

- Next work: `docs/ai/NEXT_ACTIONS.md`. Owner approvals: `docs/ai/OPEN_APPROVALS.md`.
- Private evidence (git-ignored, owner's local root checkout): `execution/evidence/remaining-work-audit-2026-11-02.md` and `execution/evidence/project-map-2026-11-02.md`.

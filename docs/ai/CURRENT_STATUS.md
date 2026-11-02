# OTONOM — Current verified status

| Field | Value |
|---|---|
| Checked at (Cairo) | 2026-11-03 00:45 |
| Repository | `morapua2030/OTONOM` (public) |
| Local branch / code head | `codex/d6-products-smarthome-20261102`; QA head `16c2b42a` (S3 fixes) on `b5cbef15` (S2), `752b1d73` (S1 docs) and `20563b1e`. Not on the remote (`git ls-remote`, 2026-11-03). |
| `origin/main` | `b6181212` (contains D5); `git ls-remote`, checked now |
| PR #16 | `OPEN`, draft, `MERGEABLE`, head `3df493e2` on `codex/hybrid03-redesign-20261028` (`gh pr view`, read-only, checked now). It does not include the D6 commits. |
| Public canonical | `https://otonom-smart-home-web.vercel.app` serves the D4-era build. Source fingerprint `57f72bc` is HISTORICAL (2026-11-02 project map). Route fingerprint re-verified now with anonymous GET: `/en`, `/ar`, `/en/products`, `/en/products/16r`, `/en/projects` → 200; `/en/start-project`, `/en/smart-home/packages` → 404 |
| Protected Hybrid Preview | Built from `3df493e2` (HISTORICAL). Anonymous GET `/` and `/en` → 302 to Vercel Authentication (checked now; no bypass attempted). The URL is kept in private evidence. |
| Brand Guardian | `validate_brand.py` PASS on `16c2b42a` (2026-11-03) |
| Release gates | Production is frozen (DR-093). There is no G01–G16 verdict for any D6 candidate. |
| Latest owner decisions | DR-092..DR-098, recorded 2026-11-03 |

## Phase status

| Phase | Status | Basis |
|---|---|---|
| D1–D3 corporate, website, services | `LIVE` | Canonical routes return 200 (2026-11-02 audit; spot-checked now) |
| D4 portfolio framework | `LIVE` | `/en/projects` → 200, with the editorial empty state |
| D4 case-study content | `DEFERRED` | DR-098: zero entries until materials and written client permissions exist |
| D5 Project Builder and packages UI | `PREVIEW` | In `origin/main` and the protected Preview; 404 on canonical |
| D5 public intake backend | `BLOCKED` (disabled) | Endpoint returns `PUBLIC_INTAKE_DISABLED`; hard-denied on hosted builds |
| D5.5 Hybrid 03 redesign | `PREVIEW` | PR #16 draft; team-lead review pending |
| D6 products and smart home | `IMPLEMENTED (local only)` | The commits below; full local QA on `16c2b42a` (S3, 2026-11-03) |
| D7 customer account, devices, service, warranty | `PARTIAL` | Local backend foundations only; no customer UI; not authorized live |
| D8 final quality and release | `PLANNED` | Depends on S3–S7 |

## D6 local commits (all `IMPLEMENTED (local only)`)

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

## Last tests (S3, QA head `16c2b42a`, 2026-11-03, local Windows, synthetic data)

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
| `d4:browser` (production build) | FAIL (environment) | All 6 AR widths pass; stops at `en@320`, where two lazy portfolio images sit just beyond Edge 156's lazy-load distance (they load once scrolled; no D6 change to `/projects`). Not fixed in S3; owner decision pending |
| Performance (`perf.ts` + the same method for D6 routes) | Measured, no threshold | Mobile cold transfer: `/ar` 242 KB, `/ar/products` 244 KB, `/ar/smart-home/packages` 187 KB, `/ar/start-project` 197 KB; cold LCP 264–652 ms locally |
| Pre-push scan `3df493e2..16c2b42a` | Clean | gitleaks not installed; pattern scan hits are rule text only; no evidence, env, secret, backup, dump or screenshot files in the range |

## References

- Next work: `docs/ai/NEXT_ACTIONS.md`. Owner approvals: `docs/ai/OPEN_APPROVALS.md`.
- Private evidence (git-ignored, owner's local root checkout): `execution/evidence/remaining-work-audit-2026-11-02.md` and `execution/evidence/project-map-2026-11-02.md`.

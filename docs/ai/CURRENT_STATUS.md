# OTONOM — Current verified status

| Field | Value |
|---|---|
| Checked at (Cairo) | 2026-11-03 00:45 |
| Repository | `morapua2030/OTONOM` (public) |
| Local branch / code head | `codex/d6-products-smarthome-20261102` at `20563b1e` (the S1 docs commit sits on top). The branch is not on the remote (`git ls-remote`, checked now). |
| `origin/main` | `b6181212` (contains D5); `git ls-remote`, checked now |
| PR #16 | `OPEN`, draft, `MERGEABLE`, head `3df493e2` on `codex/hybrid03-redesign-20261028` (`gh pr view`, read-only, checked now). It does not include the D6 commits. |
| Public canonical | `https://otonom-smart-home-web.vercel.app` serves the D4-era build. Source fingerprint `57f72bc` is HISTORICAL (2026-11-02 project map). Route fingerprint re-verified now with anonymous GET: `/en`, `/ar`, `/en/products`, `/en/products/16r`, `/en/projects` → 200; `/en/start-project`, `/en/smart-home/packages` → 404 |
| Protected Hybrid Preview | Built from `3df493e2` (HISTORICAL). Anonymous GET `/` and `/en` → 302 to Vercel Authentication (checked now; no bypass attempted). The URL is kept in private evidence. |
| Brand Guardian | `validate_brand.py` PASS on `20563b1e` (HISTORICAL-TODAY, 2026-11-02 run) |
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
| D6 products and smart home | `IMPLEMENTED (local only)` | The six local commits below |
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

## Last tests

| Run | Result | Head | Label |
|---|---|---|---|
| Web unit tests (`pnpm --filter @otonom/web run test`) | 86/86 | `20563b1e` | HISTORICAL-TODAY (2026-11-02, local) |
| Release-gate unit tests (`pnpm test:release-gate`) | 17/17 | `20563b1e` | HISTORICAL-TODAY (2026-11-02, local) |
| Hybrid 03 browser suite against the local dev server | 15/15 functional checks pass; 7 console checks fail only on the known dev-mode `eval`/CSP message | `20563b1e` | HISTORICAL-TODAY (2026-11-02, local dev server) |
| Full regression | 1895/1895 | `3df493e2` | HISTORICAL (2026-10-29). Not yet run on `20563b1e`. |
| Production build | not run | `20563b1e` | Planned for S3 |

## References

- Next work: `docs/ai/NEXT_ACTIONS.md`. Owner approvals: `docs/ai/OPEN_APPROVALS.md`.
- Private evidence (git-ignored, owner's local root checkout): `execution/evidence/remaining-work-audit-2026-11-02.md` and `execution/evidence/project-map-2026-11-02.md`.

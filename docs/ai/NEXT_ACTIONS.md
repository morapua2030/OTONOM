# OTONOM — Next actions

S2 (remaining D6 engineering) is complete locally (2026-11-03). Next is stage S3: full QA on the exact head. Everything stays local on `codex/d6-products-smarthome-20261102`; no push or deploy until S4.

## Next three steps (S3)

1. **Stop the dev server, then run the production build** (`pnpm build`) on the exact head. Record any warnings.
2. **Full regression** on the exact head and the production server, compared with the historical 1895/1895 on `3df493e2`. Record the browser-suite console checks against the production server, not the dev server.
3. **Pre-push readiness inputs for S4**: a secret and identifier scan over the commits since `3df493e2`, the reachable-history check required by `AGENTS.md`, and the exact fast-forward plan onto the PR #16 branch (DR-096).

## In parallel, from the owner

- Verified specs table for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4). Until then the contents table says only "Not listed in the brochure".
- A manual Edge test of the `#package-…` anchor links and of the language switch on the packages page and the Project Builder.

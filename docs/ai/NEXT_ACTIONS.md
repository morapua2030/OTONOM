# OTONOM — Next actions

S3 (full local QA) is complete on QA head `16c2b42a` (2026-11-03). One environment item is open: `d4:browser` stops at `en@320` on lazy portfolio images (see `CURRENT_STATUS.md`). Next is stage S4. No push or deploy happens without the owner's go-ahead for S4.

## Next three steps (S4)

1. **Decide the `d4:browser` item.** Either the owner accepts it as an environment finding, or a separate approved change scrolls before waiting or loads the portfolio images eagerly. Then run the pre-push audit on the exact head: secret and identifier scan over the commits since `3df493e2` (gitleaks if available), the reachable-history check required by `AGENTS.md`, and the staged-file review.
2. **Fast-forward the D6 commits onto the PR #16 branch** `codex/hybrid03-redesign-20261028` (DR-096: fast-forward only, no rebase or force), then confirm PR #16 checks.
3. **Protected Preview and team-lead access**: one protected Preview of the exact head, then a Vercel Shareable Link for the team lead (DR-095), with project-wide Vercel Authentication kept on.

## In parallel, from the owner

- Verified specs table for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4). Until then the contents table says only "Not listed in the brochure".
- A manual Edge review (visible window) of the `#package-…` anchors, the language switch and the Builder package select on the local production server.

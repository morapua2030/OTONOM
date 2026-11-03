# OTONOM — Next actions

D8-C design v2 is implemented locally (2026-11-03, DR-099..DR-105): Home (mix) with the 16R as hero, v2 packages, controllers and contact pages, the inner template, self-hosted fonts, the published phone/WhatsApp channel (no form), the brochure component photos and the D8-A carry-overs. Nothing is pushed. PR #16 (draft, head `025d382b`) and its protected Preview still show Hybrid 03.

## Next three steps

1. **GATE-P, owner:** after the pre-push audit, push the design v2 commits to PR #16 only on an explicit «ارفع»; then one protected Preview of that exact SHA and a new Shareable Link for the team lead (owner action, DR-095).
2. **Full verification on that same SHA:** run-all, the four browser suites, the D8-A re-checks, performance (page weight rose with the self-hosted fonts; see the private report) and before/after screenshots at 390/768/1440.
3. **Team-lead review → GATE-C3** («التصميم معتمد»), then D8-E on the owner gates. Release blockers that remain: approved privacy-page text (the page stays a noindex placeholder; no generated text), and owner decisions 13–20 (`OPEN_APPROVALS.md`).

## In parallel, from the owner

- Verified specs table for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4).

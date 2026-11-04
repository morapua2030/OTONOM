# OTONOM — Next actions

D8-C v3 (DR-106..DR-109) and D8-C v4 (the simulator at `/try` and the restored Smart Product Selector, DR-110..DR-112)
are in PR #16 (draft), each with its own protected Preview. D8-C v5 (DR-113: release-gate exit code, plain-text titles,
localized 404 title, footer language name, lighter fonts) is committed on top of v4. It is pushed to PR #16 with one
protected Preview only if its full verification on one SHA passes (owner pre-authorization, 2026-11-04); otherwise it
stays local and the failures are reported.

## Next three steps

1. **Owner share link:** after a v5 push, the owner creates the Shareable Link for the new protected Preview
   (DR-095). Nobody else creates or changes share links, and Vercel Authentication stays on.
2. **Team-lead review → GATE-C3** («التصميم معتمد»). Feedback lands as new commits on PR #16 under the same gates.
3. **D8-D dry run, GATE-R, then D8-E**, all on owner gates (see "Still open" below).

## Still open (public summary)

- **Admin panel not yet connected to the site.** Site contact goes to the founder's WhatsApp number as a temporary
  measure (DR-101); routing contacts through the admin panel is a later step that needs its own approval.
- **Vercel plan decision before Production:** the hosting plan must be decided by the owner before any Production
  release.
- **Short privacy notice recommended:** the privacy page was removed (DR-108). A short, approved privacy notice is
  recommended before public launch; no privacy text is generated without owner and legal approval.
- **Stale local test database clone:** one disposable `otonom_test_browser_*` clone from a stopped local test run is
  still on the local test cluster. The owner drops it; scripts only drop the clones they create.
- **D8-D release dry run:** repeat the dry run on the D8-C candidate (no migrations, no new env names, gate verdict
  `PROMOTION_ALLOWED=false` until GATE-R).
- **GATE-R:** the owner's release gate (G01–G16 verdict on the exact candidate) before any Production step.
- **D8-E release:** only after GATE-R and the owner's explicit approval; Production stays frozen until then (DR-093).
- Owner decisions 13–20 (`OPEN_APPROVALS.md`).

## Done in D8-C v5 (no longer open)

- `run-all.sh` now exits non-zero when any step fails, the summary counts a failure, or a suite has no fresh result;
  a self-test (`pnpm --filter @otonom/tests test:run-all-exit`) runs as its own run-all step.
- Font weight: Arabic font files subset to the Arabic block, per-locale preload of the body face, immutable caching;
  same look (pixel comparison of 52 reference screenshots).

## Follow-ups (not in this batch)

- Retired legacy renderers (`corporate.tsx`, `ServiceExplorer.tsx`, the builder and the legacy `[...slug]` branches)
  stay in Git for the harness-only security suites. Removing them needs those suites moved to v3 pages first.

## In parallel, from the owner

- Verified specs for 4R, 6R and 16R (DR-097; out of scope for v3, DR-106).
- Package inclusions and exclusions (open approval 4).
- Social links (not provided; the footer has none).

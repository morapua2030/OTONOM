# OTONOM — Next actions

D8-A is complete (2026-11-03, local only): a full-site audit plus 21 objective fixes in 4 local commits up to `51069f26`, with 1926/1926 regression and all four browser suites passing. PR #16 (draft, head `025d382b`) and its protected Preview are unchanged. The D8-A commits are not pushed.

## Next three steps

1. **D8-B, owner:** create the Vercel Shareable Link for the protected Preview (deployment page → Share) and send it to the team lead. Keep project-wide Vercel Authentication on, and revoke the link when the review ends (DR-095). The review covers Hybrid 03 + D6 in AR/EN on mobile and desktop; the Preview is `025d382b`, without the D8-A fixes. Record the feedback as open items. After the link works, retire the temporary reviewer access (handled privately, DR-095).
2. **D8-C, after feedback:** decide the design/content list from D8-A: sitemap vs `noindex` for 8 placeholder routes, absolute canonical (`metadataBase`), the 404 server render and unknown-locale page, titles, the footer logo shift, the retired logo file, the Builder hints, and the anchor-test timing. Each needs an explicit owner decision; nothing is implemented yet.
3. **D8-D, done (2026-11-03):** the release dry-run plan is in `RELEASE_CHECKLIST.md`; the verifier correctly reports `PROMOTION_ALLOWED=false` for the unmerged candidate. Owner decisions 13–20 in `OPEN_APPROVALS.md` must be answered before D8-E. Pushing the D8-A commits to PR #16 needs a new explicit owner push command (DR-096). Production stays frozen until an owner release command (DR-093).

## In parallel, from the owner

- Verified specs table for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4).

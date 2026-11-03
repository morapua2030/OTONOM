# OTONOM — Next actions

D8-C v3 (DR-106..DR-109) is in PR #16 (draft) with its protected Preview. D8-C v4 (the simulator at `/try` and the restored Smart Product Selector, DR-110..DR-112) is committed **locally only**: the owner shows it to the evaluation committee from a local production server. Nothing is pushed or deployed for v4.

## Next three steps

1. **Push only on «ارفع»:** when the owner writes «ارفع» alone in chat, re-run the pre-push audit on that exact SHA, fast-forward PR #16, create one protected Preview of it, update the PR text, then wait for the owner's Shareable Link (DR-095).
2. **Team-lead review → GATE-C3** («التصميم معتمد»). Feedback lands as new commits on PR #16 under the same gates.
3. **D8-E on the owner gates.** Release blockers that remain: approved privacy text for the release (the privacy page itself is removed, DR-108; no text is generated), and owner decisions 13–20 (`OPEN_APPROVALS.md`).

## Follow-ups (not in this push)

- Font-weight reduction proposal with before/after page-weight numbers (owner asked for it after the review link).
- Retired legacy renderers (`corporate.tsx`, `ServiceExplorer.tsx`, the selector, the builder and the legacy `[...slug]` branches) stay in Git for the harness-only security suites. Removing them needs those suites moved to v3 pages first.

## In parallel, from the owner

- Verified specs for 4R, 6R and 16R (DR-097; out of scope for v3, DR-106).
- Package inclusions and exclusions (open approval 4).
- Social links (not provided; the footer has none).

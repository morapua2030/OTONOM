# OTONOM — Next actions

D8-C v3 (Claude Design v3.1 inner pages, DR-106..DR-109) is implemented on top of design v2. PR #16 (draft) holds design v2 at `1a7a1b9a`, with its protected Preview. The owner pre-authorized the v3 push on one condition: every verification step passes on the final head and the pre-push audit is clean.

## Next three steps

1. **Review link:** after the fast-forward push, one protected Preview of that exact SHA, then the owner creates a new Shareable Link for the team lead (owner action, DR-095).
2. **Team-lead review → GATE-C3** («التصميم معتمد»). Feedback lands as new commits on PR #16 under the same gates.
3. **D8-E on the owner gates.** Release blockers that remain: approved privacy text for the release (the privacy page itself is removed, DR-108; no text is generated), and owner decisions 13–20 (`OPEN_APPROVALS.md`).

## Follow-ups (not in this push)

- Font-weight reduction proposal with before/after page-weight numbers (owner asked for it after the review link).
- Retired legacy renderers (`corporate.tsx`, `ServiceExplorer.tsx`, the selector, the builder and the legacy `[...slug]` branches) stay in Git for the harness-only security suites. Removing them needs those suites moved to v3 pages first.

## In parallel, from the owner

- Verified specs for 4R, 6R and 16R (DR-097; out of scope for v3, DR-106).
- Package inclusions and exclusions (open approval 4).
- Social links (not provided; the footer has none).

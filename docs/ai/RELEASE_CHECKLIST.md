# OTONOM — Release checklist (D8-D dry run, 2026-11-03)

This was a dry run: nothing was deployed, and no hosting setting was changed. Deployment identities, URLs and values are kept in private evidence only. The release still requires the owner gates in the D8 plan and an explicit owner release command (DR-093).

## Release delta (live Production → candidate)

- **Commits:** 20 linear commits. D5 Project Builder and packages, the Hybrid 03 redesign, D6 products/smart home, the D8-A accessibility/i18n/link fixes, and tests/docs.
- **Database:** no migration files changed. The candidate expects the same 6 CMS and 11 domain migrations recorded for Production at the D4 release. This is re-checked read-only at G04.
- **Environment:** no environment variable names added or removed.
- **Dependencies:** `graphql-scalars` 1.22.2 → 2.0.1 (security patch, runtime). `axe-core` 4.14.0 is tests only. Dependency audit is clean.
- **Routes:** new public pages `/start-project` and `/smart-home/packages` (AR/EN). No new API endpoint and no new write path (the disabled intake endpoint gained a CSRF origin check).
- **Assets:** the Hybrid 03 brand kit and the 1200×630 social card. The legacy `public/brand/otonom-logo.png` is unused but still served (owner decision).

## Gate table (dry run on the protected candidate Preview)

| Gate | Dry-run status | What is missing | Who |
|---|---|---|---|
| G01 Source identity | FAIL (expected) | The candidate must be the merged `main` SHA | Agent at merge |
| G02 Project/environment | FAIL (expected) | A production-staged build of that SHA (not on the public hostname) | Agent, owner authenticated |
| G03 Deployment readiness | BLOCKED | Stable alias proof for the staged candidate | Agent |
| G04 Production DB identity | BLOCKED | Read-only identity, migration count, isolation, no synthetic data | Agent (owner auth if needed) |
| G05 Auth/OWNER | BLOCKED | Real Microsoft Edge OWNER login on the exact deployment or the decided admin origin | **Owner** |
| G06 RBAC/anonymous | BLOCKED | Anonymous admin/API denial; OWNER routes allowed | Agent + owner |
| G07 Session persistence | BLOCKED | Session survives refresh | Owner + agent |
| G08 Server-side logout | BLOCKED | Logout success, exact session revoked, one audit event | Owner + agent |
| G09 After-logout denial | BLOCKED | Protected surfaces denied after logout | Agent |
| G10 CSRF | BLOCKED | Approved origins accepted, foreign origin rejected | Agent |
| G11 CSP/cookies | BLOCKED | Nonce + strict-dynamic, Secure cookies, no-store | Agent |
| G12 Marketing routes | BLOCKED | Required AR/EN routes return 200 without leaks | Agent |
| G13 Disabled features | BLOCKED | Commerce, warranty, device and customer processing stay 403/404 | Agent |
| G14 Security/tooling | PASS on the current candidate | Rerun on the final `main` SHA | Agent |
| G15 Backups/rollback | BLOCKED | Production DB backup, hash and restore drill; rollback target recorded privately | Agent + owner |
| G16 Post-promotion smoke | Not applicable before promotion | Runs after promotion | Agent |

Verifier result of the dry run: `PROMOTION_ALLOWED=false` (correct for a candidate that is not merged or staged).

## Owner decisions before release

The full list is in `OPEN_APPROVALS.md`, items 13–20:

1. Turn on the marketing-only mode at release. Recommended: only this mode makes the public site indexable and closes API and private routes on the public host. Today every page is `noindex` and robots disallow all.
2. Where staff/admin is served after that, and how gates G05–G11 are evidenced there.
3. Confirm in the Vercel UI: uploads disabled, preview-lock flag unset, and the site URL set to the canonical origin. The agent never reads these values.
   Since design v2 (D8-C), canonical, hreflang and social-card URLs are absolute on `SITE_URL` (`metadataBase`). Production **must** set `OTONOM_SITE_URL` to the canonical domain; otherwise they point to the immutable deployment host.
4. The Production database plan: no migrations expected; read-only G04 re-check.
5. Performance budgets. Proposed: ≤ 300 KB per key page, LCP ≤ 2.5 s mobile, CLS ≤ 0.1, zero console errors.
6. Monitoring minimum. Proposed: a scheduled GitHub Actions page check with no new vendor; any vendor is a separate approval.
7. **Release blocker:** approved privacy-page text. `/legal/privacy` stays a noindex placeholder until the owner supplies the approved text; no text is generated. The contact channel is resolved (DR-101).
8. The legacy logo file.

## Rollback principle

- The current live Production deployment is recorded privately as the known-good target.
- Use only the official Vercel rollback/promote mechanism.
- Never delete the failed deployment and never rewrite Git.
- After a rollback, verify the canonical host serves the recorded deployment and the old route fingerprint (D5/D6 pages 404).
- Any Production setting changed for the release is reverted by name and state.

## Post-release checklist (first 72 hours, manual unless monitoring is approved)

- [ ] Twice daily: `/ar`, `/en`, products and packages pages return 200; CSP header present.
- [ ] Admin behaviour matches the decided origin. Gated pages are 404 or PREVIEW/noindex per mode.
- [ ] `robots.txt` and `sitemap.xml` match the decided mode, and the sitemap uses the canonical origin.
- [ ] Daily: hosting logs show no 5xx spikes (owner/admin access).
- [ ] Social preview cards checked in public validators for `/ar` and `/en`.
- [ ] Any user report is logged and assessed; roll back on a critical failure.
- [ ] Review Shareable Links revoked and temporary reviewer access retired (DR-095).

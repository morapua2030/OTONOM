# OTONOM — Next actions

Release R1 (DR-121) is live since 2026-11-18. The marketing-only public site and the admin host serve one Production deployment of `de0e6dde` on the Production database. Gates: `RELEASE_HEALTHY=true` (G01–G16).

## Next steps

1. **Owner, in the admin:** mark the clearly named test bookings of 2026-11-18 (`TEST-AUDIT-…` and `TEST-R1-…`) as "Not interested".
2. **Owner, accounts and settings:** complete the credential-hygiene items listed in the private audit report of 2026-11-18, in the order given there.
3. **Daily job:** confirm that each 07:00 UTC run leaves rows in `domain.job_runs`. The run itself answers 200, but this was not yet confirmed in the database (open check from the audit).
4. **Admin photo on Vercel Blob:** upload, approve and publish one real product photo, then confirm that the public file has no GPS/EXIF (waived before R1; open check).
5. **Company domain:** the owner decides on the company domain and the claims shown there (`DOMAIN_MOVE.md`).
6. **Engineering backlog from the audit (private report):** a stronger test safety net in CI, mobile page speed, metrics-endpoint hardening and smaller items. Each lands as its own small PR.

## Still open (public summary)

- **Vercel plan:** Hobby for now (DR-115); re-checked before any commercial use.
- **Daily job timing:** the job runs at 07:00 UTC, which is 09:00 Cairo in winter and 10:00 during Egypt's summer time.
- **Lead SLA:** response-time target not yet set (`OPEN_APPROVALS.md` item 6).
- **E-mail:** booking alerts and the password-reset e-mail wait for the e-mail provider (DR-120).
- Owner decisions still open in `OPEN_APPROVALS.md`.

## In parallel, from the owner

- Verified specs for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4).
- Social links: now editable in the admin; empty links stay hidden.

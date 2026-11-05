# OTONOM — Next actions

The final version (DR-114) is live since 2026-11-05: the marketing-only public site and the admin host serve one Production deployment on the Production database. Gates: `RELEASE_HEALTHY=true` (G01–G16).

## Next steps

1. **Owner, in the admin (Settings):** approve the privacy text and turn booking requests on. Then one clearly marked test booking is sent and marked as cancelled.
2. **Owner, in Vercel/Neon:**
   - rotate the Neon owner-role password (the site uses the `otonom_domain` and `otonom_cms` roles and is not affected);
   - revoke the old Shareable Links and the automation bypass secret;
   - remove the old team alias;
   - delete the restore-drill branch (keep the backup branch).
3. **Daily job:** register the cron. The next release is promoted with `vercel promote`, or a normal production deployment, so Vercel's production pointer and the cron move with the domains (`RELEASE_CHECKLIST.md` §8).
4. **Owner:**
   - change the admin password;
   - invite the team (one account each);
   - give the final WhatsApp/contact number;
   - Resend and DNS (Attia), then e-mail notifications and, if wanted, owner e-mail codes;
   - later, the company-domain move (`DOMAIN_MOVE.md`).
5. **Small fix:** the admin host has no `/favicon.ico` (a 404 in the browser console on `/staff/login`).

## Still open (public summary)

- **Vercel plan:** Hobby for now (DR-115); re-checked before any commercial use.
- **Daily job timing:** the job runs at 07:00 UTC, which is 09:00 Cairo in winter and 10:00 during Egypt's summer time.
- **Lead SLA:** response-time target not yet set (`OPEN_APPROVALS.md` item 6).
- **GATE-R:** revoke old Shareable Links and retire the temporary reviewer account (owner, private).
- Owner decisions still open in `OPEN_APPROVALS.md`.

## In parallel, from the owner

- Verified specs for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4).
- Social links: now editable in the admin; empty links stay hidden.

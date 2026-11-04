# OTONOM — Next actions

The final version (DR-114) is built on top of D8-C v5:
- one Production deployment serving two hosts (marketing-only public site and the admin host);
- admin-managed content;
- booking requests behind the privacy approval and the intake switch;
- privacy-first metrics, Resend e-mail and staff invitations.

It goes to Production only with the owner's exact phrase «أوافق على إطلاق النسخة <SHA> على البرودكشن» (S2), after fresh G01–G16 evidence on that SHA.

## Next steps

1. **S1 (owner and Attia), in parallel:**
   - admin domain;
   - Production environment names (`RELEASE_CHECKLIST.md` §3);
   - Resend account and DNS records for `otonomiot.com`;
   - Hobby vs Pro decision before S2.
2. **Full chain on the final SHA**, then pre-push audit, fast-forward push to PR #16, one protected Preview and a smoke test there.
3. **S2:** the owner sends the release phrase. Then, in order:
   - merge PR #16 into `main`;
   - verified Production backup;
   - migrations and seed (owner-run, `RELEASE_CHECKLIST.md` §2);
   - promote;
   - smoke-test both hosts (G16).
4. **After release (owner):**
   - first OWNER sign-in with MFA;
   - approve the privacy text;
   - enable booking requests;
   - invite the team.

## Still open (public summary)

- **Vercel plan:** Hobby (non-commercial use) or Pro, decided by the owner before Production.
- **Daily job timing:** the job runs at 07:00 UTC, which is 09:00 Cairo in winter and 10:00 during Egypt's summer time.
- **Lead SLA:** response-time target not yet set (`OPEN_APPROVALS.md` item 6).
- **Stale local test database clone** from a stopped local run: the owner drops it.
- **GATE-R:** revoke old Shareable Links and retire the temporary reviewer account (owner, private).
- Owner decisions still open in `OPEN_APPROVALS.md`.

## In parallel, from the owner

- Verified specs for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4).
- Social links: now editable in the admin; empty links stay hidden.

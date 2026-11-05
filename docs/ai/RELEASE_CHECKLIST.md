# OTONOM — Release checklist (final release, 2026-11-04)

The final version goes live as the Production site with the admin integrated (owner instruction 2026-11-04, DR-114).
Nothing reaches Production without the owner's exact phrase «أوافق على إطلاق النسخة <SHA> على البرودكشن» (S2), which
also authorizes merging PR #16 into `main`. Deployment identities, URLs, values and evidence stay private.

## 1. What changes at release

- **Hosts:** one Production deployment serves two hosts.
  - **Public site (canonical URL):** marketing-only. It serves marketing pages plus exactly three endpoints: `POST /api/e`, `POST /api/booking` and `GET /api/cron/daily` (the last is CRON_SECRET only).
  - **Admin host (`OTONOM_ADMIN_URL`):** `/admin`, `/staff` and `/api`, with `noindex` on everything.
  - No admin link exists on the public site.
- **Admin-managed content (Payload):** packages, controllers, contact settings, announcement bar, simulator routines and rules, service FAQs, privacy text, booking switch. Production is seeded with exactly today's values, so nothing visible changes.
- **Booking requests (leads):** the form appears only after the OWNER approves the privacy text AND enables intake in the admin. Until then the site looks exactly as before (WhatsApp and phone only).
- **Metrics:** aggregated counts only, with no identifiers.
- **E-mail (Resend):** new-lead alerts, a daily digest and a Sunday summary.
- **Staff:** invitations, the SALES role, and CONTENT mapped to EDITOR.

## 2. Production database (after the verified backup only)

| Order | Migration | Kind | Up | Down |
|---|---|---|---|---|
| 1 | Domain `011_staff_email_otp.sql` | if not yet applied | creates the owner e-mail OTP tables | restore from the backup |
| 2 | Domain `012_site_metrics_invites_jobs.sql` | new | `site_metrics`, `staff_invites`, `job_runs` (append-only grant) | restore from the backup (tables are new and hold no business data) |
| 3 | Payload `20261104_135512_final_release_content` | new | 26 tables for content and leads, 5 globals, the `SALES` role value, `users.can_publish_content` | `payload migrate:down` (verified on a clone: up → down → up). It fails while any user still has the SALES role: reassign them first |

Then run the idempotent seed: `pnpm --filter @otonom/web seed:content`. It publishes the current values, never overwrites admin edits, and leaves the privacy text unapproved and intake off.

**Dry run:** done on a disposable clone of the development database: domain migrate, Payload migrate up/down/up, seed twice (second run: everything kept), round trip equal to the built-in content. Evidence is private.

**Who runs it:** migrations need the Production database credential, which the agent never handles. The owner (or Attia) runs the commands in a terminal where the Production env is loaded. Exact steps:
1. Vercel → project → Storage/Neon → create a backup branch or snapshot.
2. Note its name and time (private).
3. In the repo `app/` folder, with the connection values set only in that terminal session:
   - **Domain migrations:** in `app/packages/domain`, run only `migrate()` (`npx --no-install tsx -e "import('./src/migrate.ts').then(async (m) => console.log(JSON.stringify(await m.migrate())))"`), with the owner-role URL in `OTONOM_ADMIN_DATABASE_URL` and the Production target guards (`OTONOM_ALLOW_REMOTE_MIGRATIONS=ISOLATED_PRODUCTION_ONLY`, expected host, database and Neon project id, `OTONOM_FORCE_PRODUCTION=1`).
     **Never run `pnpm --filter @otonom/domain migrate` against Production.** Its entry point first runs `ensureRoles()`, which resets the `otonom_domain` and `otonom_cms` passwords from local files. If those files are missing, it creates new passwords, and the Production database URLs stop working.
   - **Payload migrations and the seed** must run as the `otonom_cms` role (`OTONOM_CMS_DATABASE_URL`), so the new tables are owned by the role the site uses: `npx --no-install payload migrate`, then `npx --no-install tsx scripts/seed-site-content.ts` (try `--dry-run` first).
   - Running Payload locally regenerates `app/web/src/payload-types.ts`; commit any difference separately.
4. Send the agent the three command outputs, with no values in them.

Never copy development users, test data or MFA material into Production.

## 3. Configuration checks (names only; the agent never reads values)

- `OTONOM_PUBLIC_MARKETING_ONLY=1`; `OTONOM_SITE_URL` = canonical origin; `OTONOM_ADMIN_URL` = admin origin; `OTONOM_CSRF_ORIGINS` contains both.
- `OTONOM_DISABLE_UPLOADS=1`.
- Unset on Production: `OTONOM_FORCE_PREVIEW`, `OTONOM_TEST_PAGES`, `OTONOM_EMAIL_TEST_MODE`, `OTONOM_ENABLE_SYNTHETIC_*`.
- E-mail: `OTONOM_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `OTONOM_EMAIL_FROM`, `OTONOM_LEADS_NOTIFY_TO`.
- Daily job: `CRON_SECRET` (at least 32 characters).
- Expected behaviour:
  - public pages are indexable; `robots.txt` allows and lists the sitemap;
  - the sitemap uses the canonical origin;
  - shop, cart, checkout, account and warranty return 404 on the public host;
  - the «نسخة معاينة» banner does not render in marketing-only mode.

## 4. Gates G01–G16 (fresh evidence on the exact SHA; `release:verify` must say `PROMOTION_ALLOWED=true`)

- G05–G11 are evidenced on the **admin host**. The OWNER signs in with their own e-mail and MFA in Edge; then refresh, logout, denial after logout, CSRF from a foreign origin, and CSP/cookies.
- G12 (marketing routes) and G13 (disabled features) are evidenced on the **public host**.
- G04/G15 need the backup and the migration history from section 2.
- G16 runs after promotion.

## 5. Rollback

1. **Site:** Vercel instant rollback (promote the recorded previous Production deployment). Never delete deployments and never rewrite Git.
2. **Database:** usually nothing. The new tables are unused by the old build, and the old build ignores the new enum value. If needed, restore the backup branch, or run `payload migrate:down` once (after reassigning any SALES user).
3. Verify that the canonical host serves the recorded deployment and its route fingerprint.
4. Revert any Production setting changed for the release, by name and state.

## 6. Monitoring minimum (no new vendor)

`.github/workflows/uptime.yml` checks every 30 minutes:
- `/ar`, `/en` and `/ar/try` on the public site;
- the staff sign-in page on the admin host.

It needs the repository variables `OTONOM_PUBLIC_URL` and `OTONOM_ADMIN_URL`, which are origins, not secrets. Failures show in the Actions tab and the e-mail settings of the repository owner.

## 7. After release (owner)

1. Sign in on the admin host, create the OWNER account with your own e-mail and turn on MFA.
2. Read the privacy text and approve it («اعتماد نص الخصوصية»).
3. Turn on booking requests.
4. Invite the team: each person gets their own account; `team@` receives notifications only.
5. Revoke the old Shareable Links and retire the temporary reviewer account (GATE-R, private).

## 8. Lessons from the 2026-11-05 release

- **Source identity (G01):** deploy from a clean clone of the exact `main` SHA (the repository's `.vercelignore` uploads only `app/`), using `vercel deploy --prod --skip-domain --force`. A deployment uploaded from a folder that is not a Git checkout carries no commit SHA, and G01 stays blocked.
- **`main` is protected:** pull request required, linear history, two required checks. A 100+-commit branch cannot be rebase-merged on GitHub, and a squash produces a new SHA with the same tree. The release SHA is the resulting `main` SHA.
- **Promotion:** `vercel promote` answered 409 ("already the current production deployment") for the staged deployment, so the two production domains were assigned with `vercel alias set`. Vercel's production pointer and the cron registration did not move with them. The next release uses `vercel promote`, or a normal production deployment, so the daily cron is registered.
- **Backup (G15):** `pg_dump` 17 cannot dump the Neon 18 server. The backup is a Neon branch taken before any change; a fingerprint (row counts and column definitions) is recorded, and a restore-drill branch made from the backup must show the same fingerprint.
- **Secret scan:** the previous gitleaks action scanned only the first 30 commits of a pull request. The Quality Gate now runs gitleaks over the full pull-request and push ranges. A historical finding is ignored only by its exact fingerprint in `.gitleaksignore`.

# OTONOM — Moving to the company domain (`otonomiot.com` / `admin.otonomiot.com`)

The move is a change of domains and environment values only. No code change, migration or redeploy of different code
is needed. The agent never reads or types the values.

## Steps (owner or Attia)

1. **Vercel → project → Settings → Domains:** add `otonomiot.com` (and `www.otonomiot.com` redirecting to it) and `admin.otonomiot.com`. Follow Vercel's DNS instructions in the domain's DNS panel (Attia).
2. **Vercel → Settings → Environment Variables → Production:**
   - `OTONOM_SITE_URL` = `https://otonomiot.com`
   - `OTONOM_ADMIN_URL` = `https://admin.otonomiot.com`
   - `OTONOM_CSRF_ORIGINS` = `https://otonomiot.com,https://admin.otonomiot.com`. The admin origin MUST be listed here: a non-Vercel admin domain is accepted only when it appears in this list.
   - `OTONOM_EMAIL_FROM` stays on `otonomiot.com` (already verified in Resend).
3. Redeploy the same Production deployment, so the new values apply (Vercel → Deployments → Redeploy, same commit).
4. Keep the old `*.vercel.app` hosts for one week:
   - the old public host keeps working;
   - the old admin host is no longer the admin host, so staff use the new one;
   - after the week, remove the old aliases.
5. Update the repository variables `OTONOM_PUBLIC_URL` and `OTONOM_ADMIN_URL` used by the uptime check.

## Checks after the move

- `https://otonomiot.com/ar` returns 200; its canonical, hreflang and sitemap URLs use `https://otonomiot.com`.
- `https://otonomiot.com/admin` redirects to `https://admin.otonomiot.com/admin`, and `https://otonomiot.com/api/ready` returns 404.
- `https://admin.otonomiot.com/staff/login` returns 200 with `x-robots-tag: noindex`. OWNER sign-in with MFA works, and logout works.
- A test booking (when intake is on) arrives in the admin and in `team@` (then delete it as OWNER).

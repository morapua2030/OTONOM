# Deployment decision and evidence record

This record is append-only. It must distinguish local evidence, external identity, external configuration, deployment results, and blocked work.

## 2026-10-18 — authorization checkpoint

- Provenance: explicit owner authorization in the current conversation; no signature or externally verified approval is claimed.
- Authorized: preserve the existing project; inspect and use Git normally; create or maintain a private GitHub source repository; create a protected, noncommercial Vercel Preview.
- Not authorized: public production launch, public commerce or warranty activation, real customer/payment data, fabricated commercial/legal facts, force-push/history rewrite, paid provisioning without owner review, or uploading backups/local databases.
- Mandatory external stops: identity/login/2FA, charges or billing, unintended public exposure, secrets or confidential data in the upload set/history, overwrite risk, or a critical security failure.
- Local checkpoint inherited from S7: automated local evidence `1430/1430`; it is not human, independent, target-platform, or deployed evidence.
- Pre-change sanitized snapshot: `D:\otonom-backups\otonom-pre-github-vercel-20261018.zip`; SHA-256 `B360EA9D8087D8D3F414C6C233DE4F052FCB09A865887CEFB0B1B429B6297F34`; not uploaded.

## 2026-10-18 — pre-deployment preparation

- Git repository inspection: existing repository on branch `main`, zero commits, zero remotes; all project files were untracked. Existing history therefore contains no committed secrets and was not rewritten.
- Sanitized candidate set: 289 staged files, about 3.7 MB; `.gitignore` excludes `.local-secrets`, `.env*` except examples, database dumps, backups, uploads, browser profiles, generated test evidence, build output, dependencies, ZIP files, and the historical spike/tool bundle.
- Secret scan: no private keys, GitHub tokens, AWS access keys, JWTs, or embedded database credentials found. Four heuristic matches were manually classified as a constructed local connection string and synthetic route/test strings, not secrets.
- Cloud safety changes: explicit server-only database URLs and Payload secret support; `OTONOM_FORCE_PREVIEW=1`; `OTONOM_DISABLE_UPLOADS=1`; small Vercel connection pools; Node 24 target; no Edge runtime; local-file uploads fail closed for Preview.
- Local verification after changes: `1431/1431` automated checks passed, all 12 steps exited 0, including build, real Edge, CSP, roles, security, portal gates, and visual checks. Evidence: `execution/evidence/automated-20261018_145920_105/` (kept local and ignored from Git).
- Cleanup verified: disposable database dropped, port 3301 closed, and no test lock remains.
- External state: GitHub CLI is authenticated as `morapua2030`, but the requested sign-in email could not be verified because the current token lacks the `user` scope; repository creation/push remain blocked pending owner identity confirmation or successful OAuth refresh. Vercel CLI 64.5.0 reports no authenticated session; project creation/deployment remain blocked pending login.

## 2026-10-18 — dependency and final local gate

- Initial network-backed `pnpm audit --prod` found 14 advisories: 3 high, 6 moderate, and 5 low. No deployment was attempted while these were present.
- Targeted transitive overrides moved `undici` to 7.29.1, `sass` to 1.105.2 (removing the vulnerable `chokidar`/`braces` chain), `esbuild` to 0.28.2, and `dompurify` to 3.4.16. Payload and Next were not upgraded.
- Final `pnpm audit --prod`: **No known vulnerabilities found**.
- Final post-lockfile local regression: **1431/1431**, zero failures/skips/todos, all 12 steps exited 0. Evidence: `execution/evidence/automated-20261018_151129_1331/` (local, ignored from Git).
- Cleanup reverified: no `otonom_e2e_*` database, no port 3301 listener, and no run lock.

## 2026-10-18 — protected project and migration-target gate

- Vercel identity verified through the official CLI/API: account `team-1626`, email `team@otonomiot.com`, team `team-1626` (`team_CryMmRFNe1h8H8cn5LL35Flh`), Hobby plan with no active trial.
- Created the empty Vercel project `otonom-smart-home-web` (`prj_7HjqLSLiBNtZ1Y6hyPUMrRX6jm38`) with root directory `app`, Next.js, Node 24.x, and Deployment Protection set to all deployments. Deployment count remains zero; no Preview URL exists.
- No Vercel Marketplace integration is installed. The Neon installation flow requires owner-side acceptance of third-party terms/plan selection, so no database was provisioned and no migration was attempted.
- GitHub CLI remains authenticated as `morapua2030`, but the OAuth token still lacks the `user` scope. The requested sign-in email has therefore not been verified; no repository, commit, remote, or push was created.
- Corrected a migration safety gap: when `OTONOM_ADMIN_DATABASE_URL` is present, the guard now derives the actual host/database from that URL, requires an exact synthetic-Preview allowlist and `OTONOM_FORCE_PREVIEW=1`, rejects production-like database names, and rejects disagreement between `OTONOM_DB` and the URL database.
- Targeted migration-guard evidence: **2/2 PASS**. Domain TypeScript check: **PASS**.
- Fresh full local regression after the guard change: **1432/1432 PASS**, zero failures/skips/todos, all 12 steps exit 0. Evidence: `execution/evidence/automated-20261018_194531_239/`. This is automated local Windows evidence with synthetic data, not hosted, human, independent, or production evidence.
- Cleanup verified by the runner: disposable database `otonom_e2e_20261018_194531_239` was dropped; no OTONOM Node process or listener on port 3301 remained.

## 2026-10-19 — managed Preview database and first-deployment blocker

- Neon Free was installed for the Vercel project as a Preview-only resource. No card was supplied, Neon Auth and Realtime remain disabled, and no production data was used.
- PostgreSQL 18.6 client tools were obtained from the official EDB package. Archive SHA-256: `E2246BA91D22345BC3D017586C09EDE52D9DF180B1EEB480F050445F1CAD84E2`.
- Before migration, a custom-format dump was created at the ignored local path `app/.local-secrets/neon-pre-migration-20261019-075931.dump`; SHA-256 `134B3803802751CDB209CDAC63D8F5EBB46ABB49401EB4E91CDA974105A54F2D`. A restore into a unique temporary Neon database and source/restore comparison passed; the temporary database was deleted.
- The managed-role migration path was corrected for Neon role membership with `SET TRUE`, without requiring or simulating superuser access. Targeted guard tests passed 2/2 and the domain suite passed 43/43.
- All nine domain migrations and all six Payload migrations applied to `neondb`. The seed contains only synthetic data: five staff accounts, eighteen governed claims, and three SKUs with stock zero. Approved prices and approved warranty policies both remain zero.
- Preview environment values contain only runtime least-privilege role URLs and encrypted secrets. The admin migration URL and local dump were not uploaded. `OTONOM_FORCE_PREVIEW=1`, upload disablement, proxy trust, and small database pools are set for Preview.
- HTTPS derivation now supports Vercel's generated URL, secure staff cookies follow the effective HTTPS origin, and HSTS is enabled on Vercel. The monorepo exposes Next.js at the root for Vercel detection and excludes local secrets, evidence, tests, dependencies, and build output from uploads.
- At that 2026-10-19 checkpoint, the local application regression was **1433/1433 PASS**, all twelve steps exit 0, including build, real Edge E2E, CSP, security, and visual checks. Evidence: `execution/evidence/automated-20261019_120508_1100/`. `/staff/login` remained dynamic. A separate local Vercel output-packaging step alone hit a Windows symlink-permission limitation after Next.js and TypeScript had compiled successfully. The newer 2026-10-20 result is recorded below.
- Vercel project `otonom-smart-home-web` remains protected for **all deployments**. The account, team, project, and Preview environment were verified before upload.
- A target-platform blocker was reproduced: Vercel classified the first deployment as `production`, including an explicit `--target=preview` attempt. Two known attempts were stopped before `READY` and removed exactly (`dpl_3zMfyRCQrzzgPZ44heE2jy99Mccu`, `dpl_7adH6EhxcAL4Uew2GPRjmNvhMoJj`). A third still-running CLI attempt was later detected as Production, its process was stopped, and `otonom-smart-home-mlqr18oqf-team-1626.vercel.app` was removed. Final API/CLI verification reports zero deployments and no deployment process; no hosted URL or hosted PASS is claimed.
- The remote install command was aligned to `pnpm install --frozen-lockfile`; final protection verification reports `ssoProtection.deploymentType=all`, Git-fork protection enabled, zero deployments, and all 25 environment entries scoped to Preview only. Final `pnpm audit --prod` again reports no known vulnerabilities.
- Final local cleanup verification: zero `otonom_e2e_*` databases, no listener on port 3301, and no test-run lock.
- This forced first-Production behavior is outside the owner's Preview-only authorization, so external deployment is stopped pending a genuine security/scope decision. No bootstrap Production workaround was used.
- GitHub remains separately blocked: the authenticated CLI identity is `morapua2030`, but the token lacks the `user` scope needed to verify the requested sign-in email. No repository, commit, remote, or push was created.

## 2026-10-19 — one-time static bootstrap authorization

- Provenance: explicit owner authorization in the current conversation; no signature or externally verified approval is claimed.
- Exactly one temporary, protected, static-only Vercel Production bootstrap is authorized if Vercel requires it before creating a real Preview.
- The bootstrap may not contain the OTONOM application, backend, database access, secrets, authentication, commerce, warranty, customer data, uploads, or mutable APIs. It must never be publicly accessible and must be removed after a protected Preview is created and verified.
- GitHub repository creation or push remains gated on official verification that the authenticated account corresponds to the owner-identified sign-in email `202302030@PUA.EDU.EG`.
- The referenced S8 Master Prompt was not present in Downloads, Codex attachments, or the workspace at this checkpoint. No S8 wave-specific requirement is inferred from its filename; only safe independent authorization reconciliation and identity checks may proceed until the file is available.

## 2026-10-19 — protected Preview recovery completed

- Vercel API identity: team `team-1626` (`team_CryMmRFNe1h8H8cn5LL35Flh`), project `otonom-smart-home-web` (`prj_7HjqLSLiBNtZ1Y6hyPUMrRX6jm38`).
- The single actual application deployment is Preview `dpl_qG4m9gmSdG1R6USxaX6munN4NPJu`, URL `https://otonom-smart-home-g850l16l9-team-1626.vercel.app`, with both `state` and `readyState` equal to `READY`.
- Project protection remains `ssoProtection.deploymentType=all`. Anonymous requests to `/` and `/api/ready` return 302 to Vercel Authentication. The 25 configured environment entries are all scoped to Preview; none targets Production.
- Authorized automated access returned 200 and `{"ready":true}` from `/api/ready`, proving both application runtime and its configured domain/Payload database connections were usable. Saved hosted checks also cover Arabic/English pages, `/staff/login`, server-side commerce/warranty/service/device refusals, and anonymous application-session behavior.
- Hosted `/staff/login` carried exactly one CSP header, no `'unsafe-inline'` in `script-src`, and 11 script elements whose 11 nonce attributes matched the response nonce. Hydration itself was proven by the local real-Edge S7 regression, not by a hosted human-browser run.
- The temporary protected static-only Production bootstrap was `dpl_EuKS796FrjHszmXdfWcahWwQQYTQ`. It was removed by exact deployment identity after the protected Preview passed readiness and authorized checks. A fresh API query shows one deployment only—the Preview—and the Production alias now returns 404. `/api/ready` remained 200 through authorized automation after removal.
- `vercel curl` generated an automation bypass during testing. A descriptive inspection exposed its identifier in internal tool output, so it was treated as compromised and revoked through Vercel's official project API. The project now reports zero bypass secrets, anonymous access remains 302, and the previously exposed identifier returns 302 after propagation. The secret value is not copied into project evidence.
- Edge control could identify one Edge window but could not safely establish the active URL/tab. No browser protection or authentication dialog was bypassed. Human Vercel Authentication verification is pending owner manual opening of the exact Preview URL.
- No public launch, commercial activation, real customer/payment data, Production application credentials, database dump, or migration-admin URL was introduced. Commerce and Warranty remain disabled server-side in Preview.
- Sanitized evidence index: `execution/evidence/s8-hosted-20261019/summary.json`. Latest local regression is `1439/1439` at `execution/evidence/automated-20261020_070458_1018/summary.json`; it is local automated evidence, not hosted/human/independent evidence.

## 2026-10-19 — GitHub identity gate remains

- GitHub CLI is authenticated as `morapua2030` with scopes `gist`, `read:org`, `repo`, and `workflow`; the account exposes no public e-mail.
- `gh api user/emails` cannot be used because the current OAuth token lacks the `user` scope. The requested ownership link to `202302030@PUA.EDU.EG` is therefore unverified.
- No GitHub repository, commit, remote, push, or Vercel Git integration was created. The next owner-authenticated action is `gh auth refresh -h github.com -s user`; passwords, tokens and one-time codes must stay inside the official GitHub flow.

## 2026-10-19 — owner e-mail correction and integration preparation

- The owner superseded the earlier GitHub e-mail target with `team@otonomiot.com` in the current conversation.
- The authenticated GitHub account remains `morapua2030` (`id=207021116`). Its public e-mail is empty and the current token lacks the least-privilege `user:email` scope, so `gh api user/emails` cannot yet prove the corrected target is verified. Repository creation and push remain stopped at this identity gate.
- Fresh upload-candidate inspection covered 307 files. No private key, GitHub/Vercel/AWS/Stripe token, JWT, or live database URL was found. Database-pattern matches were manually classified as placeholder examples in `app/.env.example` and a constructed local URL in `app/packages/domain/src/db.ts`. `.local-secrets`, Preview environment material, dumps, build output and generated evidence remain ignored.
- `app/vercel.json` now sets `git.deploymentEnabled=false`, the documented Vercel control that disables all automatic Git deployments. This is a precondition for connecting a private repository without an accidental Production deployment; no GitHub–Vercel connection has been made yet.
- A fresh Vercel API read still reports exactly one deployment, Preview `dpl_qG4m9gmSdG1R6USxaX6munN4NPJu`, `READY`, with `ssoProtection.deploymentType=all`. Neither the deployment nor Neon was recreated.

## 2026-10-19 — Microsoft Edge partial hosted verification

- Edge opened the exact Preview through an already-authorized Vercel session. `/en` and `/ar` rendered with their expected English and Arabic content.
- `/staff/login` hydrated and exposed interactive email/password controls. The synthetic Preview EDITOR account passed the password stage and reached the authenticator-code challenge, proving the password stage and client interaction worked.
- The hosted challenge did not complete and the admin landing page was not reached; no recovery code was consumed, so full staff sign-in is **not claimed as PASS**. Direct read-only Neon checks then proved that the local and hosted TOTP secrets match, `last_totp_step` was zero, and the clocks shared the same 30-second step.
- Edge reported zero warn/error console messages on the hydrated staff-login page. The shop and warranty Preview pages rendered as informational surfaces with zero forms, and `/api/account/devices` returned 404 `NOT_AVAILABLE_IN_PREVIEW` in Edge.
- Exact CSP response-header and nonce evidence remains the saved hosted HTTP evidence for this unchanged deployment in `execution/evidence/s8-hosted-20261019/`; current Edge control could not capture a fresh response header, so it supplements rather than replaces that evidence.

## 2026-10-19 — repeated S8 continuation checkpoint

- A fresh Vercel API read preserved the same single deployment: Preview `dpl_qG4m9gmSdG1R6USxaX6munN4NPJu`, `READY`; Production deployment count is zero and All Deployments Authentication remains `all`.
- All 25 remote environment entries remain Preview-only and both Neon runtime database keys remain present. Neither the deployment nor the Neon database was recreated.
- GitHub remains authenticated as `morapua2030` (`id=207021116`), but the token still lacks `user:email`; the verified match to `team@otonomiot.com` is unproven. No repository, remote, push or integration was created.
- A later Edge run completed English/Arabic, hydration, console and Preview-gate checks. Full synthetic staff sign-in remains blocked on the unchanged hosted build; the exact URL and short post-deployment retest checklist are in `execution/reports/S8-deployment-recovery-20261019.md`.

## 2026-10-20 — hosted MFA root cause and local remediation

- Source inspection isolated the hosted-only fault: `consumeRateLimit()` loaded its HMAC salt from `.local-secrets/ratelimit_salt.txt`, but that directory is intentionally excluded from deployment, and the Vercel runtime must not create a project-local secret file.
- `app/packages/domain/src/ratelimit.ts` now prefers `OTONOM_RATE_LIMIT_SALT`, otherwise derives a domain-separated 32-byte salt from the existing server-only `PAYLOAD_SECRET`; Vercel fails closed if neither secret is available. Local development retains its file-backed fallback. `.env.example` documents the optional dedicated salt.
- Focused tests are 6/6. The complete regression is **1439/1439 PASS**, all twelve steps exit 0, including build, Edge CSP, real Edge E2E, security and visual checks. Evidence: `execution/evidence/automated-20261020_070458_1018/summary.json`.
- The existing READY Preview and Neon database were not recreated or changed. Hosted retest requires a new protected Preview containing this source fix. Current Vercel CLI authentication is expired/invalid, so no deployment was attempted.
- GitHub remains `morapua2030` (`id=207021116`), but `user:email` is still unavailable and `team@otonomiot.com` remains unverified. No repository, remote, push, integration or Production deployment was created.

## 2026-10-20 — S8 final recovery and hosted MFA deployment

- Vercel CLI authentication was renewed through the official device flow. The authenticated user is `team-1626`; team `team_CryMmRFNe1h8H8cn5LL35Flh`, project `prj_7HjqLSLiBNtZ1Y6hyPUMrRX6jm38`, root `app`, and `ssoProtection.deploymentType=all` were reverified before deployment.
- The exact rate-limit salt fix was deployed only as Preview `dpl_Gfn24PRnswhPSZt2T6d2ra8G9BZ3`, URL `https://otonom-smart-home-573rphmhc-team-1626.vercel.app`. It is `READY`; the previous READY Preview remains present. The project has two Preview deployments and zero Production deployments.
- All 25 remote environment entries remain Preview-only. `PAYLOAD_SECRET`, both least-privilege Neon runtime URLs, and `OTONOM_FORCE_PREVIEW` are present. No dedicated rate-limit salt was added because the verified code derives a domain-separated salt from the existing server-only Payload secret. No environment value was printed or copied into evidence.
- Anonymous requests to the new Preview root and `/api/ready` return 302 to Vercel Authentication. The Production alias remains 404 and the removed bootstrap remains absent.
- Microsoft Edge loaded English (`lang=en`, `dir=ltr`) and Arabic (`lang=ar`, `dir=rtl`) pages. `/staff/login` hydrated with the interactive form and recorded zero Console warnings/errors. The synthetic EDITOR password stage reached MFA; an incorrect code and a deliberately expired code were rejected; a current code reached `/admin`. The admin dashboard survived reload, the users collection list was denied to EDITOR, and `/admin/logout` ended the session successfully.
- Hosted MFA enrollment was not exercised because the preserved synthetic Preview dataset has no dedicated un-enrolled test account; no database mutation was made solely to manufacture that state. Fresh hosted CSP response headers and request-to-request nonce rotation could not be captured through the available Edge API, which exposes neither response headers nor usable nonce attributes. Hydration and zero Console errors supplement—but do not replace—the local 1439 CSP evidence; no fresh hosted CSP header PASS is claimed.
- Commerce and Warranty remained informational with zero forms; the authenticated `/api/account/devices` response body remained `NOT_AVAILABLE_IN_PREVIEW`. The write-gate POST matrix was not repeated against the new deployment, so the older hosted evidence and unchanged source remain supporting evidence only.
- GitHub OAuth was refreshed with least-privilege `user:email`. The authenticated `/user/emails` API confirmed `202302030@PUA.EDU.EG` is present and verified on `morapua2030` (`id=207021116`). A private repository was created at `https://github.com/morapua2030/OTONOM` after a 308-file candidate scan found zero unclassified secret findings.
- Vercel Git linking stopped safely with `Login Connection` required. `app/vercel.json` still sets `git.deploymentEnabled=false`; therefore no Git-triggered Preview or Production deployment occurred. Completing that persistent GitHub connection is the remaining owner-side integration action.
- Sanitized structured evidence: `execution/evidence/s8-hosted-20261020/summary.json`.

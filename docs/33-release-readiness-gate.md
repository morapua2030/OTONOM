# OTONOM release readiness gate

This gate prevents a Vercel deployment from being promoted merely because it is `READY`. It binds sanitized source, provider, Production database, real hosted Edge, logout/session/audit, CSP/CSRF, disabled-feature, CI and rollback evidence to one immutable deployment and one full Git SHA.

## One repeatable verification command

Run from `app`:

```powershell
pnpm release:verify -- --input D:\otonom\execution\evidence\production-admin\release-YYYYMMDD\release-evidence.json --out-dir D:\otonom\execution\evidence\production-admin\release-YYYYMMDD
```

The input and generated `release-verdict.json` / `release-verdict.md` stay under the Git-ignored `execution/evidence/` tree. Missing evidence, malformed identity, provider errors, expired evidence or any failed G01–G15 assertion exits non-zero and sets `PROMOTION_ALLOWED=false`. G16 is evaluated only by a post-promotion evidence run.

The private evidence file must contain no password, OTP/TOTP/recovery material, token, cookie, JWT, authorization header, raw session ID or database URL. The verifier rejects secret-bearing keys and common secret-bearing values before writing a report.

## Evidence responsibilities

- Provider: immutable deployment ID/URL, `READY`, Production-staged target, project identity, stable alias and deployment protection.
- GitHub: approved protected `main` SHA and required checks.
- Database: approved Neon Production project ID, migration count, isolation and aggregate-only session/audit evidence.
- Browser: real Microsoft Edge login, OWNER/RBAC, refresh, logout HTTP result, DB session/audit deltas, post-logout denial, bilingual hydration, CSP/CSRF and feature-gate observations.
- Tooling: local regression count, build, dependency audit and secret/history scan.
- Rollback: prior READY deployment identity, backup/hash, restore drill and migration history.

Interactive browser evidence is a signed operational artifact, not a substitute for server-side HTTP, session and audit checks. Its deployment ID and observation time must match the candidate.

## Controlled promotion

First run a dry preflight:

```powershell
pnpm release:promote -- --evidence <private-release-evidence.json> --verdict <private-release-verdict.json> --deployment-id <dpl_id> --immutable-url <https://immutable.vercel.app> --git-sha <40-char-sha> --project-id <project-id>
```

The wrapper freshly reevaluates the private evidence, matches its digest to the saved verdict, then rechecks remote `main` and Vercel deployment identity/readiness. It refuses mismatches, missing deployed-source provenance, stale/expired verdicts and every `PROMOTION_ALLOWED=false` result. Actual promotion additionally requires `--execute` and the process-only environment variable `OTONOM_RELEASE_PROMOTION_CONFIRM` equal to the exact release ID. Git auto-deploy remains disabled.

Immediately after promotion, collect fresh canonical-host evidence and rerun `release:verify` with `phase=post-promotion`. A critical G16 failure requires using the official Vercel rollback/promotion mechanism to restore the recorded previous deployment, then verifying the canonical hostname. Never delete the failed deployment or rewrite Git history during rollback.

## Expected secret environment variable names

Provider/browser/database helpers may use approved process-scoped values such as `DATABASE_URL_UNPOOLED` and `VERCEL_AUTOMATION_BYPASS_SECRET`. Values must never enter the evidence JSON, command line, Git, CI artifacts or reports. If interactive Vercel Authentication is required, mark the browser evidence `BLOCKED` until an authorized owner completes it; do not disable protection.

# Authorization Record — Execution Directive (Spike + Local M2/W1 Development)

| Field | Value |
|---|---|
| Authorising message | Owner directive "OTONOM — Continuous Autonomous Engineering Execution Directive", pasted into the Antigravity IDE session (local Windows) on 2026-10-14 |
| Record written | 2026-10-14, by the agent (Claude Code inside Antigravity IDE). Written after work started. The authorisation predates every action recorded here |
| Evidence label | USER-CONFIRMED (the directive text) / VERIFIED (the actions listed below were performed and logged) |
| Spike-level record | `D:\otonom\spike\architecture-feasibility-20261014\AUTHORIZATION-RECORD.md` (same scope, spike detail) |

## Scope granted
1. Run the bounded architecture spike (Option A: Next.js + Payload 3 + PostgreSQL, against Option C: custom Next.js + PostgreSQL). Cover checks V-1…V-10, capped at five working days.
2. Select a **PROVISIONAL** architecture for local development only.
3. Continue local implementation of the M2 B2B preview: foundation, bilingual shell, corporate pages, CMS workflow, RFQ variant P-A, contract and attribution model, admin workspace.
4. Continue W1 commercial capabilities **behind disabled server-side gates**.
5. Report through three-line Arabic checkpoints. Do not wait for approvals between steps.

The A1–A10 decisions are recorded verbatim in the spike-level record.

## Hard boundaries respected (unchanged by this directive)
| Boundary | How it was respected |
|---|---|
| No Git/GitHub. Do not read, edit, delete or initialise `.git` | No git command was run. `.git` was not opened. The IDE's automatic status snapshot is the only git-related information the session received |
| No Railway, deployment, domains or public publishing | Nothing was deployed. Every server bound to `127.0.0.1` (ports 3101, 3201, 3301, 5433) |
| No real payments, notifications, POs, DNS or email | Payments are synthetic rows only. No email provider is configured. RFQ acknowledgement is "NOT SENT" by design |
| No secrets or CAD/video assets sent to external tools | Only package downloads from the npm registry and the PostgreSQL ZIP from the official EDB distribution. Nothing was uploaded |
| No machine-wide changes, global installs, services or firewall edits | PostgreSQL is portable under `D:\otonom\spike\…\tools\pgsql`, started with `pg_ctl` (no service). The pnpm store is project-local. No PATH edits |
| No modification of prior docs or backups | `docs/` and `D:\otonom-backups\` were not modified. New material lives only in `spike/`, `app/` and `execution/` |
| No business/legal decisions | Prices, warranty duration, returns, certifications, partner pricing, publication consent and privacy text remain BLOCKED placeholders |
| Windows measurements are not Railway Linux performance | Stated in every performance artefact |

## Disclosed side effects
- `msedge.exe --version` launched an Edge instance once. A dedicated, project-local headless profile was used for V-6 (`spike/…/tools/edge-profile-v6/`).
- The esbuild post-install script was not approved/run. Next/Payload ran without it.
- The PostgreSQL 17.11 Windows ZIP binaries are unsigned. Their SHA-256 hash was recorded and checked (see `evidence/environment-and-dependencies.md`).

## Resources created (all local, disposable or project-scoped)
- **Spike databases:** `spike_v1`, `spike_opt_c`, `spike_opt_a`, `spike_v9_a`, `spike_v9_restore_a`, `spike_v9_restore_c`.
- **Application databases:** `otonom_dev` (local development), plus disposable `otonom_test_*` databases created by tests.
- **Database roles:** `spike_admin` (cluster superuser), `spike_app`, `spike_payload`, `otonom_domain`, `otonom_cms`.
- **Secrets:** `spike/…/.local-secrets/` and `app/.local-secrets/`. These are randomly generated, synthetic values that are never printed and must never be shared.

## Second directive — "Continuous Development, Stabilization & Release-Readiness Master Instruction" (2026-10-14/15)
| Field | Value |
|---|---|
| Scope granted | Routine local development within the OTONOM workspace: read/edit code, create components/services/tests, refactor with tests, run builds and suites, synthetic data, update documentation, fix bugs, run WAVES 1–13 consecutively |
| Restrictions (unchanged) | No Git/GitHub, no `.git`, no Railway/production/cloud, no paid services, no real customer data or payments, no external publication, no invented prices/warranty/certifications/testimonials/compatibility claims, no change to M2+W1 requirements, no Commerce/Warranty activation in PREVIEW, no business/financial/legal approvals |
| How respected | All servers on 127.0.0.1; COMMERCIAL stage used only inside test `try/finally` blocks and always restored to PREVIEW (audited); synthetic fixture prices only in disposable test databases; no price, quote amount or warranty policy created in the dev database; probe side-effects reverted (documented in W01); no network access used beyond what was already installed |
| Resources created | Disposable test DBs `otonom_test_kpi_inv`, `otonom_test_w1`, `otonom_test_lifecycle`, `otonom_test_service`, `otonom_restore_drill` (dropped after the drill); domain migrations 004–008; Payload migrations (claims governance, wave4 hardening, north star, CRM indexes); `app/backups/` (local dumps — treat as secret); Edge profiles under `app/tests/.edge-profile*` |

## Third directive — private GitHub + protected Vercel Preview (2026-10-18)

| Field | Value |
|---|---|
| Provenance | Explicit owner authorization in the current conversation; no signature or externally verified approval record is claimed |
| Superseded boundary | The earlier blanket bans on Git/GitHub inspection/use and all cloud deployment are **SUPERSEDED FOR THIS LIMITED SCOPE** |
| Authorized | Preserve the existing project; use normal non-destructive Git; create/maintain a private GitHub source repository; create a protected, noncommercial Vercel Preview with synthetic staging data |
| Still prohibited | Public production launch, public commerce/warranty activation, real customer/payment data, invented claims/prices/policies, uploading local backups/databases, force-push/history rewrite, paid provisioning without owner review |
| External stop conditions | Identity/login/2FA, charges or billing, unintended public exposure, secrets/confidential data in an upload, overwrite risk, or a critical security failure |
| Evidence | `reports/deployment-decision-evidence.md` and `reports/private-github-protected-vercel-backup-plan.md` |

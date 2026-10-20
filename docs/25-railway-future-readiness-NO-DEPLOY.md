# Railway Future Readiness — NO DEPLOY

| Doc ID | OTONOM-DOC-25 | Version | 2.0-draft | Date | 2026-10-13 | Status | Planning only |
|---|---|---|---|---|---|---|---|

```text
RAILWAY_STATUS: PLANNING_ONLY / NOT_DEPLOYED / NOT_AUTHORIZED
Railway CLI on workspace: NOT INSTALLED · Railway login: NOT ATTEMPTED · Resources created: NONE · Spend: NONE
```

## 1. Purpose and scope
A hypothetical production topology and a checklist for a **future, separately approved** deployment gate. Railway feature statements are from the agent's knowledge and **must be verified** against current Railway documentation at that gate.

## 2. Hypothetical topology (assuming candidate A)
| Component | Construct | Notes |
|---|---|---|
| Web app (Next.js + Payload + domain modules) | 1 service (Dockerfile build preferred for reproducibility) | Next standalone output. `PORT` binding. Health `/api/health`, readiness `/api/ready` |
| PostgreSQL | Managed Postgres service | Version pinned. Connection pooling and limits sized to the plan. Migrations as a release step |
| Private object storage | S3-compatible: Railway storage buckets **if available on the account**, otherwise an external provider | **Railway service filesystem must not be assumed durable** |
| Public media | Separate public bucket/CDN | Image variants pre-generated |
| Malware scanner | Small separate service (e.g. ClamAV) **or** a managed scanning API | Decided in the spike. Memory cost matters |
| Jobs | In-app job queue on Postgres (email outbox, reservation expiry, reconciliation, retention purge) | Idempotent. Cron trigger if needed |
| Environments | `staging`, `production` | Separate DBs, buckets, secrets |

## 3. Environment variable names (names only, no values)
`DATABASE_URL`, `DATABASE_POOL_MAX`, `PAYLOAD_SECRET`, `APP_BASE_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET_PRIVATE`, `S3_BUCKET_PUBLIC`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`, `BOT_PROTECTION_SITE_KEY`, `BOT_PROTECTION_SECRET`, `SCANNER_URL`, `ERROR_TRACKING_DSN`, `LOG_LEVEL`, `NODE_ENV`, `ADMIN_MFA_ISSUER`.

## 4. Service lifecycle (design)
Build → image → release step (migrations with backup taken first) → start → readiness check → traffic → smoke tests (RFQ submit to a test mailbox, health, private-object negative test). Rollback: previous image + restore plan if a migration was destructive (destructive migrations need separate approval).

## 5. Backups and recovery
Automated DB backups (verify frequency/retention on the chosen plan), plus an independent periodic `pg_dump` to external storage. Object versioning for contracts and evidence. **Restore drill before go-live** (OPS-AT-001). RPO/RTO in doc 19.

## 6. Cost dimensions (no quotes invented)
Compute (always-on web), Postgres (RAM, storage), object storage + egress (CAD downloads, media, video), scanner memory, email volume, monitoring/error tracking, a staging duplicate, future 3D asset traffic. The owner sets a monthly ceiling (NFR-COST-01).

## 7. Pre-deployment checklist (all must be ✅, each with explicit owner approval)
- [ ] Written approval for **each** cost-incurring resource and for the deployment itself
- [ ] Account/workspace ownership (company-owned) confirmed
- [ ] Region chosen. Data-transfer/legal implications reviewed (doc 18 §6)
- [ ] Cost ceiling + usage alerts
- [ ] Reproducible build with pinned runtime
- [ ] Env vars set per environment (values never in docs)
- [ ] Migrations + backup + rollback plan tested
- [ ] Restore drill passed
- [ ] Domain, DNS owner, TLS, HSTS
- [ ] Monitoring, logging, alerts (doc 19)
- [ ] Private bucket negative test passed
- [ ] Staging contains only synthetic data
- [ ] Auto-deploy: **off** unless separately approved
- [ ] Legal pages approved
- [ ] Go/no-go gates in doc 20 §5 passed

## 8. Stop conditions
Any prompt to log in, provision, connect a repository, enable auto-deploy, or create a paid resource → **stop and ask the owner**.

## Change log
2.0-draft, 2026-10-13: created (supersedes archived v1 doc 13).

## Next review decision
None until Stage 6 is complete and the owner opens the deployment gate.

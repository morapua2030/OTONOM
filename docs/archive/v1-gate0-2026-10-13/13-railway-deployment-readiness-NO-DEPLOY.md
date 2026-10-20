# 13 — Railway Deployment Readiness (⛔ NO DEPLOY)

> **Deployment is prohibited in this phase.** Nothing in this document has been executed.
> No Railway project, service, database, bucket, domain, token or GitHub↔Railway link exists or was created.
> The Railway CLI is **not installed** on the workspace machine, and Railway authentication was **not checked**.
> Railway feature statements below come from the agent's knowledge and **must be re-verified** against current Railway docs before use.

## 1. Target topology (proposed, for later)
| Component | Railway construct | Notes |
|---|---|---|
| Web app (Next.js + Payload) | 1 service, built from a Dockerfile (preferred for reproducibility) or Railway's builder | `pnpm build` / `node server.js` (Next standalone output) |
| PostgreSQL | Railway PostgreSQL service with a volume | Version pinned. Backups: verify Railway's backup feature + an independent `pg_dump` to external storage |
| Object storage | Railway Buckets (S3-compatible), **if available on the account**, else Cloudflare R2 / AWS S3 | Private bucket for RFQ/payment proofs. Public bucket/CDN for media |
| Malware scanner | separate small service (ClamAV) on the private network | Only when uploads go live |
| Jobs | in-app job queue on Postgres (Payload Jobs or pg-boss) + Railway cron service if needed | Reconciliation, expiry, retention purge |
| Environments | `staging` and `production` Railway environments | Separate DBs, buckets and secrets |

## 2. Pre-deployment checklist (all must be ✅ before G6)
- [ ] Explicit written deployment approval for the specific environment
- [ ] Railway account/workspace owner confirmed (company-owned, not personal)
- [ ] Region chosen (latency to Egypt vs data-transfer/legal considerations)
- [ ] Monthly cost target set. Usage alerts/limits configured
- [ ] Build reproducible locally (`pnpm build`, Docker image) with pinned Node
- [ ] Start command, `PORT` binding, health-check path (`/api/health`) defined
- [ ] Env vars documented in `.env.example` (names only). Values set in Railway per environment
- [ ] Migrations run as a release step, never at random restarts. Rollback/restore plan written
- [ ] Backups: automated + **restore drill passed**
- [ ] Domain + HTTPS + HSTS. DNS owner confirmed
- [ ] Logging, error tracking, uptime monitoring
- [ ] Private buckets verified non-public (negative test)
- [ ] Staging seeded with non-production data only
- [ ] Auto-deploy from GitHub: **off** until separately approved. If enabled later: staging only, production manual
- [ ] Legal pages approved (privacy, terms, shipping, returns, warranty)

## 3. Environment variables (names only, values never in Git)
`DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SITE_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET_PRIVATE`, `S3_BUCKET_PUBLIC`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CLAMAV_HOST`, `SENTRY_DSN` (if chosen), `NODE_ENV`.

## 4. Cost drivers (to estimate after the spike)
Always-on web service RAM/CPU · Postgres RAM + volume size · egress (images, CAD downloads) · bucket storage · ClamAV memory (it is RAM-hungry, roughly 1 GB+, verify) · staging environment duplication.

## 5. Questions for the user (infrastructure)
- Q-I1: Who owns the Railway account (personal or company), and on which plan?
- Q-I2: Preferred region? Any data-residency requirement?
- Q-I3: Monthly infrastructure budget ceiling?
- Q-I4: Is a staging environment required from day one?
- Q-I5: Who owns the domain(s) and DNS (e.g. `otonomiot.com`?), and where are they managed?

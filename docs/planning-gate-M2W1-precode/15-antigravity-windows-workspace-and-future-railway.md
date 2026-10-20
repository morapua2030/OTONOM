# 15 — Antigravity Windows Workspace and Future Railway Readiness

| Version | 3.0-draft | Date | 2026-10-13 | Status | Planning only. **RAILWAY_STATUS: PLANNING_ONLY / NOT_DEPLOYED / NOT_AUTHORISED** |
|---|---|---|---|---|---|---|---|

## 1. Current workspace (OBSERVED, doc 00)
- Antigravity IDE 2.5.5 on local Windows. Agent: Claude Code extension.
- Workspace `D:\otonom`.
- Planning docs in `docs/`, this pack in `docs/planning-gate-M2W1-precode/`.
- Earlier observation in this session: Node v24.20.0, pnpm 10.33.0 present. PostgreSQL and Docker absent. `C:` has ~14 GB free and `D:` ~146 GB free. Not re-queried in this run.

## 2. Workspace policy (now)
| Rule | Status |
|---|---|
| Docs only, under `D:\otonom\docs\…` | APPROVED |
| `.git` folder: do not read, modify, delete or include in outputs/backups | APPROVED |
| No installs, no code, no scripts, no databases | APPROVED |
| Backups: existing `D:\otonom-backups\snapshot1/2` (hash-verified this run). New backups only with owner instruction | APPROVED |

### 2.1 Off-device backup checklist (owner action; the agent does not upload)
1. Copy `D:\otonom-backups\*.zip` (and later snapshots) to an external drive or owner-approved storage.
2. Verify on the destination: file size + SHA-256 match (values in doc 00 §3).
3. Keep at least one copy off the laptop.
4. Exclude `.git` and any credentials.
5. Record the date and location in a private owner note (not in these docs).

## 3. Future development workspace options (DECISIONS DEFERRED, no installs now)
| Topic | Option | Pros | Cons / risks | Approval needed |
|---|---|---|---|---|
| Test database | W-DB-1 Native PostgreSQL on `D:` | Simple, fast, realistic | Owner declined for now (R2). Install footprint | Owner |
| | W-DB-2 Container (Docker Desktop/WSL2) | Disposable, reproducible | `C:` free space ~14 GB is tight. WSL2 not installed | Owner |
| | W-DB-3 Portable PostgreSQL binaries on `D:` (no service install) | No system service, disposable | Still a software download/execution. Needs approval | Owner |
| | W-DB-4 Remote disposable managed DB | No local install | External resource + data transfer (synthetic only) + cost | Owner |
| Node runtime | Existing Node v24 vs a pinned LTS | Already present | Version must match future Railway | Owner (spike) |
| Object storage for tests | Local filesystem stand-in vs S3-compatible emulator vs cloud test bucket | Local = no external transfer | Emulator = install. Cloud = external resource | Owner |
| Source location | `D:\otonom\app\` (future) | Same workspace | — | Implementation approval |
| Version control | **DEFERRED, out of scope.** Not a prerequisite for planning | — | Without VCS, rely on owner-approved snapshots | Owner (future) |

**Recommendation for the spike (when authorised):** W-DB-3 or W-DB-1 on `D:` with synthetic data only, plus the local filesystem stand-in for storage. A cloud bucket only if V-3 must be proven on real S3 semantics (separate approval).

## 4. Future Railway architecture (documentation only)
| Component | Plan | Notes |
|---|---|---|
| Compute | 1 web service (Next.js + chosen CMS/domain modules) | Option A/C. Health `/api/health`, readiness `/api/ready` |
| Database | Managed PostgreSQL, pinned version | Pool size per plan limits. Migrations as a release step |
| Object storage | Private bucket (RFQ files, payment proofs, commissioning evidence) + public media bucket/CDN | **Service filesystem is not durable** |
| Scanner | Small ClamAV service or managed scanning API | Memory/cost trade-off |
| Jobs | Postgres-backed queue inside the app. Cron trigger if needed | Idempotent |
| Environments | staging + production, separate DBs/buckets/secrets | Staging uses synthetic data |
| DNS/TLS | Owner-controlled domain. HTTPS/HSTS | Owner confirms the DNS owner |
| Secrets | Railway variables per environment (names in v2 `docs/25` §3) | Never in docs |
| Backups | Platform backups (verify) + independent `pg_dump` to external storage + **restore drills** | RPO/RTO OPEN |
| Observability | Structured logs, error tracking, uptime checks, alerting | — |
| Migrations | Expand → migrate → contract (zero-downtime pattern). Backup before destructive steps | Destructive needs approval |
| Deployment pipeline | In principle: build image → release step → health-gated rollout. **Auto-deploy off until approved** | No CI exists (Git deferred) |
| Cost drivers | Always-on compute, DB RAM/storage, egress (CAD/media), scanner RAM, email volume, staging duplicate | Owner sets a ceiling |

**Stop rule:** any step involving Railway login, resource creation, DNS changes or paid services stops for explicit owner approval.

## Sign-off (Wave 9b)
Local environment described truthfully ✅ · Future options without installs ✅ · Railway doc-only ✅ · Git not a hidden prerequisite ✅

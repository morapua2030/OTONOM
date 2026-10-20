# WAVE 12 — Release Blocker Reduction

Full revalidated list: `reports/remaining-release-blockers.md`. The previous version is archived in `reports/archive/`.

## Method
1. Every original blocker (B-01…B-37) was re-checked against current code and the latest test evidence.
2. Each was classified: BUS (owner/business), LEG (legal), EXT (external evidence / third party), DEP (deployment), OPS (operational), TEC (technical).
3. Technical blockers inside the approved local scope were **fixed and tested**.
4. Decisions that need the owner or external evidence were left open **unchanged**. Nothing was relabelled to make the count look smaller.

## Technical items closed in this wave (with tests)
| Blocker | What was built | Test |
|---|---|---|
| B-21 shared rate limit | PostgreSQL fixed-window limiter (atomic upsert, salted-hash keys, stale-bucket clean-up); all public and MFA limits use it | acceptance APP-RFQ-RATE-LIMIT, APP-RATE-LIMIT-SHARED |
| B-31 cross-system consistency | `POST /api/admin/reconcile` (OWNER/ADMIN). Detects: contract with stage behind (repair on request), won without contract, broken RFQ links, reserved-stock drift. Audited | acceptance APP-RECONCILE (simulated partial failure detected and repaired; editor refused) |
| B-26 upgrade migrations with data | Incremental domain migrations 005–008 and Payload migrations applied to the populated database; forward-fix pattern (006 corrects 005); checksums refuse edited history | dev database migration log (W7–W12) |
| B-34 / B-35 accounts and tickets | Registration, scoped portal, tickets, RMA (WAVE 8) | portal 17/17, domain service 8/8 |

## Requirement gaps closed (planning doc 22)
| Row | Requirement | Fix | Test |
|---|---|---|---|
| #48 | Safety escalation (W-08) | SAFETY tickets: URGENT, guidance code, explicit "not an emergency service"; a DB constraint requires a recorded human callback before RESOLVED/CLOSED | domain safety test; portal P-SAFETY |
| #49 | Recoverability | `tools/backup-restore-drill.sh` | drill: 69 tables, identical row counts, invariants intact |
| KPI-010/011/013/014 | Funnel KPIs missing | Funnel block in the KPI report (011 uses revision history; 009/012 explicitly BLOCKED) | acceptance APP-KPI-FUNNEL |

## Result
| | Count |
|---|---|
| Original blockers | 37 |
| RESOLVED-LOCAL | 5 |
| REDUCED | 7 |
| Unchanged (need decisions / external / deployment) | 25 |
| New blockers recorded | 7 |
| **Open total** | **39** |

**Launch remains unsafe:** the public-preview minimum set is still open (brand, legal texts, consents/claims evidence, hosting, Git, backups on target, e-mail, proxy config, human RTL review, accessibility audit, independent security review).

# WAVE 11 — Performance and Technical Debt

**Measured on a local Windows laptop:** i7-9750H, 12 logical CPUs, 16 GB RAM, Node 24, production build (`next start`) on 127.0.0.1. **These numbers do not represent Railway/Linux production behaviour.** No thresholds have been approved, so this is MEASURED ONLY. Raw data: `execution/evidence/w11-perf.json`.

## 1. Measurements
**Build:**
- `.next` directory: 348 MB (server + client output);
- client chunks: about 2.9 MB uncompressed on disk.

**Server working set:** 134 MB before load, 217 MB after the page + API runs.

**Page weight and timing** (headless Edge, 360 px mobile emulation, DPR 2):
| Page | Cold transfer | of which JS | Cold LCP | Warm transfer | Warm LCP | Warm TTFB |
|---|---|---|---|---|---|---|
| `/ar` | 160 KB | 140 KB | 484 ms | 9 KB | 156 ms | 18 ms |
| `/en` | 152 KB | 140 KB | 252 ms | 8 KB | 140 ms | 16 ms |
| `/ar/business/developers` | 152 KB | 140 KB | 188 ms | 8.5 KB | 152 ms | 21 ms |
| `/ar/business/request-a-proposal` | 158 KB | 147 KB | 156 ms | 7.5 KB | 144 ms | 19 ms |
| `/ar/projects` | 149 KB | 140 KB | 128 ms | 5.8 KB | 116 ms | 16 ms |
| `/ar/shop` (gated) | 149 KB | 140 KB | 108 ms | 5.7 KB | 112 ms | 14 ms |
| `/admin/login` | 703 KB | 638 KB | 716 ms | 15 KB | 192 ms | 37 ms |

**Sequential request latency** (60 requests each, ms):
| Path | p50 | p95 |
|---|---|---|
| `/api/ready` | 15.2 | 17.4 |
| `/ar` | 15.5 | 22.1 |
| `/ar/business/developers` | 15.6 | 19.9 |
| `/api/claims` | 15.3 | 16.9 |
| `/sitemap.xml` | 15.4 | 16.6 |

The spike V-7 light-load numbers (10 req/s for 5 min): p95 ≈ 25 ms, 0 errors.

**Database plans** (`EXPLAIN ANALYZE`; synthetic volumes: 201 RFQs, 415 audit rows, 30 contracts):
| Query | Plan |
|---|---|
| KPI aggregate | 0.18 ms |
| Audit by entity | Index scan |
| RFQ by idempotency key | Index scan |
| Tickets by customer | Index scan |
| **RFQ 90-day duplicate check** | **Sequential scan → fixed (§2)** |

**Images:** none exist yet (no rights-cleared assets), so image loading could not be measured.

**Cache behaviour:**
- Public pages are `force-dynamic` (server-rendered per request, because the CMS content and the stage gate are checked live).
- Static assets are cached by the browser: a warm reload transfers 6–15 KB.
- API and portal responses carry `cache-control: no-store`.

## 2. Technical debt fixed in this wave
| Item | Impact | Fix | Proof |
|---|---|---|---|
| The duplicate check ran on every public RFQ without an index | Linear scan per submission as RFQs grow | Indexes on `rfqs.submitted_email/phone` and `contacts.email/phone` (Payload migration `crm_lookup_indexes`) | Plan uses a BitmapOr of both indexes (checked with sequential scans disabled) |
| Expected business refusals were logged at ERROR | Log noise hides real faults | `BusinessRuleError` with an explicit name (survives minification) + `loggingLevels: info` | Run-all server log: business refusals now at INFO |
| In-memory rate limiter (single process) | Broken with more than one instance | PostgreSQL limiter with hashed keys (B-21) | acceptance APP-RATE-LIMIT-SHARED |
| No CMS↔domain reconciliation | Silent divergence after partial failures | `/api/admin/reconcile` (B-31) | acceptance APP-RECONCILE |
| No backup drill | Unknown recoverability | `tools/backup-restore-drill.sh` | 69 tables identical |
| `run-all` could report stale passes | Misleading evidence | Lock + stale-result removal + exit codes | W10 §4 |

**Deliberately unchanged.** Payload's own authorisation and validation refusals stay at ERROR level. Their class names are minified, and they are security-relevant signals for monitoring.

## 3. Remaining technical debt (backlog)
1. **Public JS:** about 140 KB compressed per page, mostly the React/Next runtime, plus two small client components (language switch, RFQ form). It could shrink if the language switch were server-rendered (needs the request path in a header) and pages were static/ISR where content allows.
2. **Admin login weight** (about 640 KB JS): Payload admin bundle, acceptable for staff.
3. **Nonce-based CSP** (B-38).
4. **Unbounded in-memory lists:** `funnelKpis` and `reconcile` load whole lists (fine at preview scale; paginate or move to SQL before large volumes).
5. **Audit rows for CMS decisions** are written on a separate connection (not in Payload's transaction); reconciliation covers the main business risk.
6. **Generic admin UI only:** no dedicated staff UIs for workspace, store or service operations (B-40).
7. **Framework upgrade rehearsal** (B-43).

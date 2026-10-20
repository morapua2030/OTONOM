# S7 blocker reconciliation — B-01 through B-44

Baseline supplied by S6: 37 still open. S7 formula: **44 total − 7 RESOLVED-LOCAL = 37 still open**, made of 7 REDUCED + 30 OPEN. New blockers: 0. No item was merged, deleted or renamed to reduce the count.

| ID | Cat | Current status | Next owner | Proof / dependency | Next action |
|---|---|---|---|---|---|
| B-01 | BUS | OPEN | Owner | Option A PROVISIONAL; ADR/S7 evidence | Answer sign-off questions |
| B-02 | BUS | REDUCED | Owner/finance | Mechanism exists; no SKU/price/shipping values | Approve data pack |
| B-03 | BUS/LEG | OPEN | Owner/counsel | No approved warranty policy | Approve duration/terms/start |
| B-04 | LEG | OPEN | Counsel/owner | Refund flag only | Approve returns/refund policy |
| B-05 | BUS | OPEN | Owner | No partner prices/terms | Approve programme |
| B-06 | BUS | OPEN | Owner/finance | Survey agreement/ref only | Approve amount/invoice rule |
| B-07 | BUS | OPEN | Owner | Exact-org cohort rule | Confirm group-company rule |
| B-08 | BUS | OPEN | Owner | Single approver recorded | Confirm override approver policy |
| B-09 | BUS/EXT | OPEN | Owner | Placeholder visual tokens | Supply official brand pack |
| B-10 | BUS | OPEN | Owner | Placeholder facts/copy | Verify company facts |
| B-11 | LEG | OPEN | Counsel | Privacy placeholder, no approval | Supply AR/EN notice + retention |
| B-12 | LEG | OPEN | Counsel | Terms/cookie absent | Approve legal texts |
| B-13 | LEG/EXT | REDUCED | Owner/client | Consent gate tested; no real consents | Obtain signed scopes |
| B-14 | EXT | OPEN | Engineering/owner | Claims fail closed | Supply test/cert evidence |
| B-15 | LEG/EXT | OPEN | Finance/counsel | Tax/e-invoicing undecided | Confirm treatment |
| B-16 | DEP | OPEN | Owner | Deployment prohibited | Separate hosting authorization |
| B-17 | OPS | OPEN | Owner | Git deferred/prohibited | Separate version-control decision |
| B-18 | DEP | REDUCED | Infrastructure owner | Local restore drill only | Target PITR/restore drill |
| B-19 | DEP/EXT | OPEN | Infrastructure/security | Uploads fail closed | Private storage + AV negative tests |
| B-20 | EXT | OPEN | Owner/ops | No provider or real emails | Approve provider/domain controls |
| B-21 | TEC | RESOLVED-LOCAL | Engineering | PostgreSQL limiter tests | Preserve; target multi-node is B-44 |
| B-22 | DEP | OPEN | Infrastructure | Trust config documented only | Verify target proxy chain |
| B-23 | DEP | OPEN | Infrastructure | Windows local readings only | Linux target performance |
| B-24 | BUS/EXT | OPEN | Owner/finance | Simulation/manual only | Choose or reject gateway |
| B-25 | DEP/OPS | OPEN | Ops | Ready endpoint only | Select monitoring/retention/alerts |
| B-26 | TEC | RESOLVED-LOCAL | Engineering | Forward migrations/checksums | Preserve; framework rehearsal B-43 |
| B-27 | OPS human | REDUCED | Named Arabic reviewer | 111 S7 screenshots; bidi 258/258 | Sign human checklist |
| B-28 | EXT | REDUCED | Accessibility reviewer | A11Y 276/276; manual script | Narrator/NVDA + external audit |
| B-29 | OPS human | REDUCED | Named editor | Admin locale automation/screenshots | Editor signs AR/EN review |
| B-30 | EXT | OPEN | Independent assessor | Self-review 28 + CSP 11 only | Independent security test |
| B-31 | TEC | RESOLVED-LOCAL | Engineering/ops | Reconciliation detects/repairs scoped CMS drift | Schedule/alert later |
| B-32 | BUS/OPS | OPEN | Owner/editor | Placeholder copy | Native approved AR/EN copy |
| B-33 | TEC/BUS | REDUCED | Product/owner | S7 information UI + staff ops; prices/policies absent | Commercial UI acceptance after B-02/04/15 |
| B-34 | TEC | RESOLVED-LOCAL | Engineering | Account API/portal tests | Email verification remains B-41 |
| B-35 | TEC | RESOLVED-LOCAL | Engineering | Service/RMA APIs + Edge | Preserve; policy/SLAs external |
| B-36 | BUS | OPEN | Owner | PROPOSED controls list | Confirm/change controls |
| B-37 | BUS/LEG | OPEN | Owner/counsel | No coverage-start rule/SLA | Approve events and SLAs |
| B-38 | TEC | RESOLVED-LOCAL | Engineering | S7 Edge 11/11 + security + E2E 42/42 | Preserve dynamic login/nonce regression |
| B-39 | EXT/TEC | OPEN | Owner/security | No current authoritative advisory DB authorized | Approve network SCA |
| B-40 | TEC | RESOLVED-LOCAL | Engineering | Staff workspaces + S7 Edge/mobile | Preserve authorization/UX tests |
| B-41 | EXT | OPEN | Ops | Depends on B-20 | Provider + verification/notifications |
| B-42 | BUS/LEG | OPEN | Owner/counsel | No analytics/consent tool | Decide lawful tooling |
| B-43 | TEC | OPEN | Owner/engineering | S7 rehearsal plan only | Authorize controlled copy rehearsal |
| B-44 | DEP | OPEN | Infrastructure | Shared-state logic local; target unavailable | Two-instance target test |

No local automation closes legal, owner, human, independent, infrastructure or target-platform requirements.


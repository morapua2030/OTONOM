# WAVE 5 — CRM, Contracts, Attribution and KPI Verification

## 1. Invariants and how each is enforced and verified
| Invariant | Enforcement | Verified by |
|---|---|---|
| Every eligible contract is counted **at most once** | `domain.attribution` has PK `contract_id`; one row per contract | kpi-invariants "exactly one attribution class" (80 contracts / 80 rows / 80 distinct); quarterly additivity |
| WEBSITE_SOURCED and WEBSITE_ASSISTED are **mutually exclusive** | Single `class` column per contract | Same; kpi.test "exactly one attribution class" |
| NEW/EXISTING is an **independent** dimension | `cohort` frozen at signature, stored on the contract, never derived from class | New class × cohort cross-tab + `crossTabConsistent` identity; cohort oracle test |
| Signed values, amendments, cancellations | Contract value + append-style `contract_adjustments`; net value ≥ 0; cancellation must be negative | kpi.test Q1/Q2 (doc 07 dataset); invariants oracle with random amendments and partial/full cancellations |
| Foreign currency | FX rate + date mandatory for non-EGP; EGP equivalent at the contract's FX | Random USD contracts in the oracle comparison |
| Attribution evidence | Website attribution requires a linked website RFQ or written evidence (WAVE 3); the RFQ link is system-only | journey J-ATTR-EVIDENCE, J-OPP-RFQ-SYSTEM-ONLY |
| Manual correction audit | `overrideAttribution` requires a reason, writes append-only `attribution_changes` (flagged `single_actor`) and an audit row | kpi.test; invariants "every override recorded and counted" |
| Duplicate opportunities | Open-opportunity guard at conversion (WAVE 3, closed-deal bug fixed in WAVE 4) | journey J-DUP-*, J-AFTER-SIGN-NOT-DUP |
| Pipeline separated from signed value | KPI-008 computed from open qualified opportunities, returned in its own `pipeline` block | acceptance APP-KPI-OWNER |
| Reporting consistency | Identities: classes sum to total, cohorts sum to total, influenced = sourced + assisted, cross-tab consistent; reversed or invalid periods refused | invariants (4 seeds), acceptance APP-KPI-* |

## 2. New in this wave
- **Randomised invariant test** (`packages/domain/test/kpi-invariants.test.ts`). It is seeded and reproducible via `KPI_SEED`, and builds:
  - 80 synthetic contracts over 15 organisations, about 20% in USD with FX;
  - random amendments (±), partial and full cancellations, and about 10% attribution overrides.

  It compares the KPI report against an **independent JavaScript oracle** computed from raw rows, for the full year and each quarter. It also checks quarterly additivity, cohort correctness and override accounting.
  **Result:** 6/6 for seeds 20261015, 1, 42 and 777 (24 executions).
- **Class × cohort cross-tab** (`byClassCohort`) with an identity check.
- **Configurable North Star.** The OWNER-only setting `northStarKpi` defaults to `UNSELECTED`. The report shows `northStar.status = PENDING_OWNER_DECISION` and never changes any KPI value. Selection changes are audited (`settings.north_star`). ADMIN cannot select it (acceptance).
- **Period validation.** A reversed or invalid period → 400 / `INVALID_PERIOD`.

## 3. Defect found
**W5-D1: concurrent role setup.** `ensureRoles()` raced ("tuple concurrently updated") when two setup processes ran together (parallel test files), so 9 domain tests failed when run as one suite.
- **Fix:** a cluster-wide `pg_advisory_lock` around role creation (it also protects against parallel deploy steps), and serial test execution.
- **Proof:** 23/23 both in parallel and in serial.

## 4. Results
| Suite | Result |
|---|---|
| Domain (KPI 9 + W1 8 + invariants 6) | **23/23** |
| Acceptance (includes 4 new KPI checks) | **97/97** |
| Journey | 36/36 |

## 5. Pending owner decisions (not implemented as defaults)
- North Star KPI selection.
- Cohort rule for related/group companies (PD-07). Currently exact organisation match only.
- Pre-tax vs post-tax KPI basis. Pre-tax is labelled PROPOSED in `kpi.ts`.
- FX policy for adjustments. Currently the contract's signature FX rate (PROPOSED).
- Single vs dual approval for attribution overrides. Single is recorded and flagged `single_actor`.
- Contract-type eligibility, e.g. whether MAINTENANCE counts toward KPI-006. Currently all types count (PROPOSED).

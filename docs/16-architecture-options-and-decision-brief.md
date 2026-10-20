# Architecture Options and Decision Brief

| Doc ID | OTONOM-DOC-16 | Version | 2.0-draft | Date | 2026-10-13 | Status | **PROPOSED. Not approved (DR-037)** |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Compare candidate architectures with a transparent weighted rubric, recommend one **conditionally**, and define the spike that can falsify it. **No spike or code is authorised at this gate.**

**Evidence basis:** the agent's technical knowledge (cutoff mid-2026). **No packages were installed and no versions were verified in this session.** Every framework statement below must be re-verified in the spike (step S1).

## 2. Architectural objectives
A custom bilingual site + editable CMS + high-integrity RFQ/opportunity/contract/attribution + modest transaction-safe commerce + serialised inventory + secure warranty/service, on future Railway hosting, maintained by one developer with AI agents. That means low operational overhead and explicit module boundaries. **No microservices, Kafka, Kubernetes or separate warehouse.**

## 3. Candidates
| ID | Candidate | Shape |
|---|---|---|
| **A** | Next.js (App Router, TS strict) + **Payload CMS 3 embedded** + PostgreSQL | 1 deployable. Payload provides admin UI, auth, localization, drafts/versions, uploads, jobs. Domain modules are a separate service layer |
| **B** | Next.js + **NestJS API** + PostgreSQL + a CMS (Payload/Directus) + shared schema packages | 2–3 deployables. Explicit API boundary |
| **C** | Next.js + **commerce framework (e.g. Medusa)** + CMS + custom RFQ/contract module | 3+ deployables (commerce server, often Redis, CMS) |
| **D** | Next.js + **lean custom TS server modules** (route handlers/server actions, Drizzle/Kysely, PostgreSQL) + a **minimal custom CMS** or small independent CMS | 1 deployable (custom CMS) or 2 (independent CMS) |

## 4. Weighted scoring (1 = poor, 5 = strong; weights from master §14.4)
| Criterion (weight) | A | B | C | D |
|---|---|---|---|---|
| Data & transaction integrity (20 %) | 4 | 5 | 3 | 5 |
| Security & access boundaries (17 %) | 4 | 4 | 3 | 4 |
| Operational simplicity for a solo dev (15 %) | 5 | 2 | 1 | 4 |
| CMS/editorial/localization fitness (14 %) | 5 | 4 | 4 | 2 |
| Speed of a trustworthy MVP (12 %) | 4 | 2 | 3 | 2 |
| Testing & maintainability (10 %) | 3 | 4 | 3 | 4 |
| Future Railway hosting/cost (7 %) | 5 | 3 | 2 | 5 |
| Migration/extendability (5 %) | 3 | 4 | 3 | 4 |
| **Weighted total (out of 5)** | **4.21** | **3.59** | **2.77** | **3.75** |

### Score reasons
- **A, integrity 4:** PostgreSQL transactions are available. Critical ops must bypass CMS hooks and run in a domain service with explicit transactions. Coupling risk costs one point.
- **A, CMS 5:** field-level localization, drafts/versions, admin UI and live preview exist out of the box. A custom review state is needed on top (spike S2).
- **A, testing 3:** two migration streams (Payload + domain SQL) and framework-generated admin make tests more involved.
- **A, migration 3:** admin/config is tied to Payload. Data stays in plain Postgres tables. Payload is MIT-licensed. Vendor/roadmap risk is noted (the agent understands Payload was acquired by Figma in 2025; **verify**).
- **B, ops 2 / speed 2:** two runtimes, a duplicated auth boundary, more CI and hosting units. Its strengths (independent API, team scaling) aren't needed now.
- **C, ops 1:** the most moving parts. Generic commerce assumptions (reserve-at-cart, payment-provider flows) conflict with reserve-at-staff-confirmation, serial lineage and quote-led custom work.
- **D, CMS 2 / speed 2:** the full editorial workflow, localization UI, media library and three admin workspaces must be hand-built. That is the largest single effort. Integrity and simplicity are strong.

**Caveat:** these are reasoned judgements, not measurements. The spike converts the key ones into evidence.

## 5. Recommendation (conditional)
**Candidate A**, with a strict internal rule:
- Payload owns content, media, admin UI, auth and simple CRUD.
- **Business-critical state** (order confirmation and reservation, serial assignment, payment verification, contract value, attribution) changes **only** through typed domain services with explicit DB transactions, idempotency keys, optimistic revisions and audit events.
- CMS editors have no write path to those tables.

**Fallback:** **Candidate D** (DR-048), if a veto criterion fails.
B and C are not recommended for this team size.

## 6. Veto / falsification criteria (any one triggers the fallback review)
| # | Criterion | Fails if |
|---|---|---|
| V-1 | Atomic reservation | Under ≥ 50 concurrent confirmations on real PostgreSQL, any oversell, double reservation or partial commit occurs, or it can't be achieved without bypassing the framework unsafely |
| V-2 | Domain authorisation independent of CMS permissions | Critical tables can be written through CMS/admin APIs by a content role |
| V-3 | Private uploads | A private object is reachable without a valid signed URL, or URLs leak via the admin/API |
| V-4 | Reviewed publication | A draft or unreviewed revision can become publicly visible, or the review state can't be enforced server-side |
| V-5 | Admin MFA | No workable TOTP MFA (built-in, plugin or custom strategy) **and** no acceptable compensating control |
| V-6 | Arabic RTL in admin and site | Admin is unusable in Arabic, or the bidi rendering of mixed fields is broken without heavy patching |
| V-7 | Operability | Production build/start footprint or cold start is unacceptable for a single Railway service (thresholds set in the spike) |

## 7. Spike plan (3–5 days estimate, **separate approval required**, synthetic data only, no deployment, no Git)
| Step | Experiment | Evidence to record |
|---|---|---|
| S1 | Install the current supported Next.js / Node LTS / Payload / Postgres adapter versions in a throwaway folder. Record exact versions | Version list, install log |
| S2 | Bilingual content + Draft → In Review → Approved → Published guard. Draft vs published access separation | Tests showing blocked publish and non-visible drafts (V-4) |
| S3 | Private RFQ upload: pre-signed PUT to S3-compatible storage (local MinIO **not** possible without Docker, so use a cloud test bucket only with owner approval, or the filesystem adapter as a stand-in with clearly limited conclusions) | V-3 negative tests |
| S4 | `confirmOrder` + reservation under concurrency on **real PostgreSQL** | V-1 test output |
| S5 | Serial uniqueness + idempotent release | Constraint and test output |
| S6 | Contract signed event + attribution freeze/override with audit | Audit rows |
| S7 | Role-aware domain authorisation separate from CMS roles | V-2 tests |
| S8 | Background jobs (email outbox, reservation expiry) without Railway workers | Job runs, idempotency |
| S9 | Railway single-service viability **on paper**: build/start commands, env names, migration step, health check, storage | Notes only. **No Railway login** |
| S10 | Admin MFA + Arabic admin check | V-5/V-6 evidence |
| Exit | PASS/FAIL per step + recommendation (adopt A / switch to D) | Spike report |

**Environment prerequisite:** PostgreSQL is not installed (doc 00). The spike needs owner approval for a native PostgreSQL install on `D:` (DR-054), or another environment.

## 8. Consequences if A is adopted
Single deployable. Fastest path to the editorial and admin surfaces. Accepted coupling to Payload's admin. Two migration streams need CI discipline (later). Domain modules stay portable to D if needed.

## Change log
2.0-draft, 2026-10-13: v2 labels (A=Payload, B=NestJS, C=commerce, D=lean custom). Weighted rubric. Veto criteria. 10-step spike.

## Next review decision
The owner approves or declines the spike (doc 27 D-Q3) and the PostgreSQL install (DR-054).

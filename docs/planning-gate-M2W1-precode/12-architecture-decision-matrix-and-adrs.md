# 12 — Architecture Decision Matrix and ADR Candidates

| Version | 3.0-draft | Date | 2026-10-13 | Status | **All options PROPOSED. Scores are judgements, not measurements** |
|---|---|---|---|---|---|---|---|

## 1. Options (M3P §13 labels; differ from v2 labels)
| ID | Option |
|---|---|
| **A** | Next.js App Router + **Payload CMS 3 embedded** + PostgreSQL. Explicit domain services for transactional functions |
| **B** | Next.js front end + dedicated **NestJS** backend + PostgreSQL + separate or embedded CMS |
| **C** | **Custom Next.js full-stack** + PostgreSQL, limited custom editorial tooling |
| **D** | Next.js + **external CMS/commerce toolkit** (e.g. hosted headless CMS + a commerce engine) + custom RFQ/contract components |

Label mapping to the v2 doc 16: v2-A = A, v2-B = B, v2-D (lean custom) ≈ C, v2-C (commerce framework) ≈ D. The v2 reported preliminary scores (A 4.21, D-lean 3.75, B 3.59, C-commerce 2.77) are **a reported preliminary model, not a verified measurement** (EXTRACTED from `docs/16` §4).

## 2. Criteria and base weights
| # | Criterion | Weight |
|---|---|---|
| K1 | Transactional correctness (inventory, payments, contracts, attribution) | 18 |
| K2 | Security and authorisation boundaries | 15 |
| K3 | Maintainability by one engineer + AI agents | 15 |
| K4 | Editorial/CMS + bilingual fit | 12 |
| K5 | B2B workflow flexibility (RFQ/CRM/proposals) | 10 |
| K6 | Warranty/service modelling fit | 8 |
| K7 | Performance (public pages) | 6 |
| K8 | Future Railway hosting/topology/cost | 6 |
| K9 | Upgrade compatibility / vendor coupling | 6 |
| K10 | Integration complexity (number of systems) | 4 |

## 3. Scores (1–5) with reasons
| K | A | B | C | D | Reasoning |
|---|---|---|---|---|---|
| K1 | 4 | 5 | 5 | 3 | B/C give full control of transactions. A is fine if domain services bypass CMS hooks (spike V-1/V-2). D splits state across systems |
| K2 | 4 | 4 | 4 | 3 | D has multiple auth domains. A/C have a single app. B has two services with API auth |
| K3 | 4 | 2 | 3 | 2 | A: one codebase with a ready admin. B: two runtimes. C: large custom admin surface. D: several vendors |
| K4 | 5 | 3 | 2 | 4 | A has field-level localization/drafts/versions built in. C must build them. D's hosted CMS is strong but separate |
| K5 | 4 | 5 | 5 | 3 | Custom code fits bespoke workflows best. A is good via collections + custom views |
| K6 | 4 | 5 | 5 | 3 | Same logic as K5 |
| K7 | 4 | 4 | 5 | 4 | C is leanest. A carries admin bundles, but the public routes can stay lean |
| K8 | 5 | 3 | 5 | 2 | A/C: 1 service. B: 2. D: 3+ plus vendor SaaS costs |
| K9 | 3 | 4 | 4 | 2 | A is coupled to Payload's admin/config (data stays in Postgres). D has the highest coupling |
| K10 | 4 | 3 | 5 | 2 | Fewest moving parts in C, then A |

**Weighted totals (out of 5), base weights:**
- A = (4·18 + 4·15 + 4·15 + 5·12 + 4·10 + 4·8 + 4·6 + 5·6 + 3·6 + 4·4) / 100 = (72+60+60+60+40+32+24+30+18+16) / 100 = **4.12**
- B = (90+60+30+36+50+40+24+18+24+12) / 100 = **3.84**
- C = (90+60+45+24+50+40+30+30+24+20) / 100 = **4.13**
- D = (54+45+30+48+30+24+24+12+12+8) / 100 = **2.87**

## 4. Sensitivity analysis
| Scenario | Weight change | A | B | C | D | Leader |
|---|---|---|---|---|---|---|
| Base | — | 4.12 | 3.84 | 4.13 | 2.87 | **C ≈ A (tie)** |
| Editorial-heavy | K4 → 20, K7 → 2, K10 → 0 (Σ = 100) | 4.20 | 3.80 | 3.89 | 2.95 | A |
| Integrity-heavy | K1 → 25, K4 → 5 (Σ = 100) | 4.05 | 3.98 | 4.34 | 2.80 | C |
| Solo-maintainer-heavy | K3 → 25, K5 → 5 (Σ = 105, normalised) | 4.11 | 3.61 | 3.98 | 2.78 | A |

Worked sums (weight × score, before ÷ Σ weights):
- **Editorial-heavy:** A 420 · B 380 · C 389 · D 295
- **Integrity-heavy:** A 405 · B 398 · C 434 · D 280
- **Solo-heavy:** A 432 · B 379 · C 418 · D 292 (÷ 105)

**Interpretation:** A and C are statistically indistinguishable on judgement scores. The ranking flips with weights. **The decision must come from evidence (the spike), not from scores.** B and D trail in every scenario for this team size.

## 5. Recommendation (PROPOSED)
- **Primary candidate: A**, because it gives the largest reduction in custom admin/CMS work for one engineer, provided that:
  - V-1 (atomic reservation) passes
  - V-2 (domain authz independent of CMS) passes
  - V-4 (server-side publish gate) passes
- **Fallback: C**, if any of V-1/V-2/V-4 fails, or if Payload coupling proves too costly (spike evidence). C accepts more custom editorial work, scoped down to the content types in doc 10.
- **Rejection criteria for A** (measurable, refined in doc 16):
  - any oversell or partial commit
  - any content-role write path to transactional data
  - any unreviewed publish via the API
  - no workable MFA or compensating control
  - Arabic admin unusable for core tasks
  - operability outside approved limits

## 6. ADR candidates (all PROPOSED)
| ADR | Decision to record | Proposed position | Depends on |
|---|---|---|---|
| ADR-01 | Application stack | A (fallback C) | Spike |
| ADR-02 | Admin workspaces and auth | One identity, role-based workspaces (Projects, Store, Service, Content). MFA for privileged roles | Spike V-5 |
| ADR-03 | CMS approach | Embedded (A) or a minimal custom CMS (C) | ADR-01 |
| ADR-04 | Inventory transactions | Ledger + projection + conditional update in one DB transaction. Idempotency table | Spike V-1 |
| ADR-05 | Object storage | S3-compatible private bucket + public media bucket. Quarantine prefix. Signed URLs | Spike V-3. Provider choice later |
| ADR-06 | Audit logging | Append-only table. Insert-only DB role. Correlation IDs | — |
| ADR-07 | Background jobs | Postgres-backed job queue (no Redis initially). Idempotent jobs | — |
| ADR-08 | Localization | Locale-prefixed routes. Field-level localization. No fallback on public pages | — |
| ADR-09 | Attribution | Opportunity-level class, locked at signature. Overrides audited | Doc 07 |
| ADR-10 | Data ownership | Module write-ownership. CMS cannot write transactional tables | Spike V-2 |
| ADR-11 | Integration boundary | No device control. Outbound email only. ClickUp manual | — |
| ADR-12 | Hosting (future) | Railway: 1 app service + managed Postgres + external/compatible object storage. **No deployment now** | Doc 15 |
| ADR-13 | Preview vs commercial gating | Server-side feature flags per stage. Gated routes render info pages, with no mutation endpoints enabled in PV | Doc 18 |

## Sign-off (Wave 8a)
Four options ✅ · Transparent weights + sensitivity ✅ · Recommendation conditional, with rejection criteria ✅ · Prior scores labelled as reported ✅

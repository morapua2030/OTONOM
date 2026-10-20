# 21 — Risk Register and Decision Impact Matrix

| Version | 3.0-draft | Date | 2026-10-13 | Status | Living |
|---|---|---|---|---|---|---|---|

## 1. Outstanding decisions: impact matrix
Blocking level:
- **ARCH** = blocks architecture selection
- **CODE** = blocks starting coding
- **PV** = blocks the preview release
- **CR** = blocks the commercial release
- **—** = doesn't block

| ID | Decision | Status | Owner | Source | Options | Recommendation | Arch | PV | CR | Can proceed without it | Evidence needed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PD-01 | Spike authorisation (code in an isolated folder, installs, DB, time budget) | OPEN | Owner | doc 16 | yes / no / later | Yes, with W-DB-3/W-DB-1 on `D:`, synthetic data, 5-day cap | **ARCH, CODE** | — | — | Planning only | — |
| PD-02 | V-1…V-7 thresholds (+ optional V-8…10) | OPEN | Owner | doc 16 | As proposed / modified | Approve the revised acceptance. V-7 measure-only | **ARCH** | — | — | — | — |
| PD-03 | Stack ADR-01 (A vs C) | PROPOSED | Owner | doc 12 | A / C / other | A, conditional on the spike | **ARCH, CODE** | — | — | Spike planning | Spike report |
| PD-04 | Implementation authorisation | OPEN | Owner | doc 23 | — | After PD-01…03 | **CODE** | — | — | — | — |
| PD-05 | Preview variant P-A / P-B | OPEN | Owner | docs 14, 18 | P-A / P-B | Start P-A, upgrade to P-B when the gate passes | — | **PV** | — | B2 foundation | Security gate status |
| PD-06 | North Star headline | OPEN | Owner | doc 07 | NS-A / NS-B | NS-A for 2 quarters | — | — (data model identical) | — | Everything | — |
| PD-07 | Contract eligibility/accounting (types, tax, amendments, master/child, FX, survey fees) | OPEN | Finance | doc 07 | — | Proposals in doc 07 | — | — | — (final dashboards) | Capture + model | Finance memo |
| PD-08 | Warranty policy (duration, exclusions, start rules incl. delayed commissioning/DIY) | BLOCKED | Owner + legal | doc 09 | — | — | — | — | **CR** | B5 build with null duration | Signed policy |
| PD-09 | Datasheets, compatibility and safety evidence | SOURCE MISSING | Engineering | doc 11 | — | — | — | PV (claims only; safe copy available) | **CR** (product specs) | Safe copy | Reports |
| PD-10 | Written consent for the apartment case study | BLOCKED | Owner + client | doc 11 | — | — | — | PV (featured project only; fallback available) | — | Process story | Signed consent |
| PD-11 | Prices, SKUs, options, stock counts, supplier/order process | SOURCE MISSING | Owner/Ops | docs 08–09 | — | SKU scheme proposal in doc 09 | — | — | **CR** | Synthetic data | Price list, SKU approval |
| PD-12 | Installation capacity + coverage | SOURCE MISSING | Ops | doc 03 | — | — | — | PV (claims) | **CR** (promises) | Generic wording | Ops statement |
| PD-13 | Privacy notice, retention schedule | BLOCKED | Legal | doc 14 | — | — | — | **PV** (any PII) | CR | Build | Approved texts |
| PD-14 | Returns/shipping/terms/payment policies | BLOCKED | Legal | doc 18 | — | — | — | — | **CR** | Build | Approved texts |
| PD-15 | Order confirmation variant T1/T2, COD rules | OPEN | Owner/Ops | doc 08 | T1 / T2 | T1, 3-day hold | — | — | **CR** | Build both behind config | — |
| PD-16 | Test environment tooling (DB, storage stand-in) | OPEN | Owner | doc 15 | W-DB-1…4 | W-DB-3 or W-DB-1 | **ARCH** (via spike) | — | — | — | — |
| PD-17 | Future Railway target, region, costs | DEFERRED | Owner | doc 15 | — | Single service | — | PV (go-live needs hosting) | CR | Everything before go-live | Budget |
| PD-18 | Arabic admin UI required? | OPEN | Owner | doc 16 V-6 | AR admin / EN admin | EN admin acceptable at first if the owner agrees | ARCH (V-6) | — | — | — | — |
| PD-19 | Second reviewer for the digest | OPEN | Owner | doc 20 | name | — | — | PV (governance) | CR | — | — |
| PD-20 | Off-device backup of the docs | OPEN (owner action) | Owner | doc 15 §2.1 | — | Do it now | — | — | — | — | — |

## 2. Risk register
L = likelihood, I = impact, each 1–5. Severity = L×I.

| ID | Risk | L | I | Sev | Mitigation | Owner | Timeline impact |
|---|---|---|---|---|---|---|---|
| RK-01 | Warranty policy not approved in time | 4 | 5 | 20 | Start drafting now. B5 builds with null duration | Owner/legal | Delays CR |
| RK-02 | Policy/legal texts late (privacy, returns, terms) | 4 | 5 | 20 | Engage counsel early. Privacy first (it blocks PV) | Owner | Delays PV/CR |
| RK-03 | Estimates exceed the earlier expectations (1.5–2×) | 4 | 4 | 16 | Approve levers (doc 19 §3). Re-estimate after the spike | Owner | Plan reset |
| RK-04 | Written consent not obtained | 4 | 3 | 12 | Process-story fallback | Owner | PV content weaker |
| RK-05 | Claims outrun evidence | 3 | 5 | 15 | Registry gate + lint | Content/Eng | — |
| RK-06 | Spike fails for A | 2 | 4 | 8 | Fallback C (+3–6 weeks) | Eng | +weeks |
| RK-07 | Single-admin bottleneck | 4 | 4 | 16 | Batching, digest, second account | Owner | Ongoing |
| RK-08 | Data onboarding (serials, legacy customers) is messy | 4 | 4 | 16 | Early data audit, import validation, quarantine | Ops/Eng | Delays CR |
| RK-09 | Security gate for P-B not met → weaker lead capture | 3 | 3 | 9 | P-A first | Eng | — |
| RK-10 | Oversell/payment fraud at launch | 2 | 4 | 8 | Invariants, tests, rehearsal | Eng/Store | — |
| RK-11 | Installation capacity can't meet demand | 3 | 5 | 15 | Capacity flag in qualification. No nationwide promises | Ops | Revenue risk |
| RK-12 | Environment confusion repeats (tool vs runtime) | 2 | 2 | 4 | Doc 00 method (host process check) | Eng | — |
| RK-13 | Docs lost (single disk) | 2 | 3 | 6 | Off-device backup (owner) | Owner | — |
| RK-14 | Arabic copy quality | 3 | 4 | 12 | Native editor | Owner | — |
| RK-15 | Railway costs exceed budget | 3 | 3 | 9 | Single service, cost ceiling, alerts | Owner | — |
| RK-16 | Safety incident misrouted via the portal | 2 | 5 | 10 | Safety triage + disclaimer | Service | — |
| RK-17 | Vendor/framework churn (Payload/Next.js) | 3 | 3 | 9 | Pin versions. Domain logic outside the framework | Eng | — |
| RK-18 | Unexplained `.git` folder causes confusion later | 2 | 2 | 4 | Out of scope now. Owner decides later | Owner | — |

**Top risks:** RK-01, RK-02 (20) → RK-03, RK-07, RK-08 (16) → RK-05, RK-11 (15).

## Sign-off (Wave 12a)
Decisions prioritised by blocking level ✅ · Risks with owners ✅

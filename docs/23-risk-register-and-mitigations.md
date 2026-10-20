# Risk Register and Mitigations

| Doc ID | OTONOM-DOC-23 | Version | 2.0-draft | Date | 2026-10-13 | Status | Living register |
|---|---|---|---|---|---|---|---|

Scales: Likelihood (L) and Impact (I) are 1–5. Severity = L × I (≥ 15 critical, 9–14 high, 5–8 medium, ≤ 4 low).

| ID | Risk | L | I | Sev | Owner | Evidence / trigger | Mitigation |
|---|---|---|---|---|---|---|---|
| R-01 | Unverified compatibility/safety claims are published | 3 | 5 | **15** | BO/ENG | DR-030, DR-042 | Evidence-state gate (doc 14). Wording rules (doc 15). Legal review |
| R-02 | Apartment case study can't be published (no written consent) | 4 | 4 | **16** | BO | DR-032 | Obtain consent early. Prepare an honest alternative (process story, anonymised and lawful) |
| R-03 | Warranty duration/policy not approved before the commercial launch | 4 | 5 | **20** | BO/LEG | DR-024 | Portal works with `PENDING_POLICY_APPROVAL`. Commercial launch gate requires the policy |
| R-04 | Prices/SKUs/shipping tariff late | 4 | 4 | **16** | BO/OPS | DR-015/016/019 | Stage 3 doesn't depend on them. Collect via the doc 24 templates |
| R-05 | Solo operator bottleneck (RFQ response, verification, review) | 4 | 4 | **16** | BO | One admin | SLA dashboard, templates, digest, plan a second account early |
| R-06 | Installation capacity can't meet B2B demand → reputational damage | 3 | 5 | **15** | OPS | DR-020 unknown | Capacity factor in qualification. No nationwide promises. KPI-012 |
| R-07 | Spike fails on candidate A | 2 | 4 | 8 | ENG | V-1…V-7 | Fallback D. Time-boxed spike |
| R-08 | Scope too large for one developer → long time to value | 4 | 4 | **16** | BO | 23–36 wk estimate | M2 packaging. Strict P0. Defer 3D/marketplace |
| R-09 | Private RFQ drawings leak | 2 | 5 | **10** | ENG | — | Doc 18 controls. Negative tests. Audit |
| R-10 | Oversell / stock inconsistency | 2 | 4 | 8 | ENG | — | Ledger invariants. Concurrency tests on real PG |
| R-11 | Attribution manipulation or noise makes KPIs untrustworthy | 3 | 4 | **12** | BO | Single operator | Freeze + audited overrides. Coverage KPI. Sourced as North Star |
| R-12 | Arabic copy quality (AI-only translation) harms credibility | 3 | 4 | **12** | BO | — | Native Arabic editor review. Engineering review of spec translations |
| R-13 | Planning docs lost (local disk, no verified backup) | 2 | 3 | 6 | BO | doc 00 | Owner-approved non-Git ZIP backup (DR-055) |
| R-14 | Environment mismatch (Antigravity vs local Windows) causes confusion or duplicate work | 3 | 2 | 6 | BO | C-08 | Owner confirms the environment (D-Q12). Re-audit on any switch |
| R-15 | PostgreSQL/Docker absent locally blocks the spike | 4 | 3 | **12** | BO | doc 00 | Native PostgreSQL on `D:` (DR-054) or another environment |
| R-16 | Legal non-compliance (privacy, consumer, warranty wording) | 3 | 4 | **12** | LEG | DR-043 | Counsel checklist (doc 18 §6) before data collection |
| R-17 | Vendor/framework churn (Payload/Next.js major changes) | 3 | 3 | 9 | ENG | — | Pin versions. Domain logic outside the framework. Fallback D |
| R-18 | Railway costs exceed budget once deployed | 3 | 3 | 9 | BO | DR-036 unknown | Cost ceiling (NFR-COST-01). Usage alerts. Single service |
| R-19 | Unexpected `.git` folder in workspace (not agent-created) | 2 | 2 | 4 | BO | doc 00 §5 | Out of scope per DR-039. Owner aware |
| R-20 | Safety incident reported via portal is treated as a normal ticket | 2 | 5 | **10** | OPS | — | Safety triage (doc 13 §6). Urgent human callback |
| R-21 | Pre-platform customers missing → wrong New/Existing cohorts | 4 | 3 | **12** | BO | E-17 | Import a minimal historical customer list |
| R-22 | Over-claiming capacity or "nationwide" coverage on the site | 3 | 4 | **12** | BO | C-02 | Zone-specific promises only |

**Top 5 by severity:** R-03 (20), R-02 (16), R-04 (16), R-05 (16), R-08 (16).

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner assigns named people to each owner role and confirms the mitigations.

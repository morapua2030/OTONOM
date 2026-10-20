# 22 — Requirements Traceability and Inconsistency Audit

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Traceability matrix
Columns: Objective/need → Decision → Requirement → Page/Module → Acceptance test → Phase → Evidence status → Risk → Status.

| # | Objective / need | Decision | Requirement | Page / module | Test | Phase | Evidence | Risk | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Bilingual market reach | OD (AR/EN at launch) | FR-WEB-001 | Locale routing / E01-S4 | T-SEO-01, IA-AC-01 | PV | APPROVED | RK-14 | Planned |
| 2 | Honest preview | OD-03 G-2 | FR3-PV-001 | All pages / E03-S8 | T-PV-03 | PV | APPROVED | RK-05 | Planned |
| 3 | No sales in preview | OD-03 G-1 | FR3-PV-002, BR-04 | Flags / E01-S9 | T-PV-01, T-PV-02 | PV | APPROVED | — | Planned |
| 4 | Win multi-unit projects | OD-14 | Developer page | `/business/developers` / E03-S2 | IA-AC-05 | PV | APPROVED | RK-11 | Planned |
| 5 | Structured B2B intake | OD (progressive RFQ) | FR-RFQ-001 | RFQ / E04-S1 | T-RFQ-01, T-RFQ-02 | PV | APPROVED | — | Planned |
| 6 | No duplicate leads | — | FR-RFQ-005 | RFQ / E04-S5 | T-RFQ-03 | PV | PROPOSED | — | Planned |
| 7 | Safe drawings | OD-13 | FR-RFQ-003, doc 14 §6 | Files / E01-S7, E04-S2 | T-RFQ-04…07, V-3 | PV (P-B)/CR | APPROVED principle | RK-09 | Planned |
| 8 | Spam resistance | — | FR-RFQ-005 | RFQ / E04-S5 | T-RFQ-08 | PV | PROPOSED | — | Planned |
| 9 | Engagement model capture | OD-15 | FR3-RFQ-001 | RFQ step 1 | T-RFQ-01 | PV | CONFIRMED | — | Planned |
| 10 | Free call / paid survey | OD (consultation) | FR-CRM-004 | CRM / E05-S5 | RFQ-US-08 | PV | APPROVED | — | Planned |
| 11 | Controlled pipeline | — | FR-CRM-001 | CRM / E05-S2 | T-CRM-01 | PV | PROPOSED states | — | Planned |
| 12 | Org dedupe | DR-049 | FR-CRM-002 | CRM / E05-S3 | T-CRM-02 | PV | PROPOSED | — | Planned |
| 13 | Proposal integrity | — | FR-CRM-005 | CRM / E05-S6 | T-CRM-04 | PV | PROPOSED | — | Planned |
| 14 | Contract evidence | — | FR-CRM-006 | CRM / E05-S7 | T-CRM-03 | PV | APPROVED need | RK-01 | Planned |
| 15 | Manual ClickUp handoff | OD (ClickUp manual) | FR-CRM-007 | CRM / E05-S8 | RFQ-US-12 | PV | APPROVED | — | Planned |
| 16 | Maximise attributable signed value | OD (goal) | FR-ATT-001 | Attribution / E06-S2 | KPI-T01, T02 | PV | APPROVED | — | Planned |
| 17 | No double counting | OD (exclusive classes) | FR-ATT-001 | E06-S2 | KPI-T02, T04 | PV | APPROVED | — | Planned |
| 18 | New vs existing cohorts | OD (cohorts) | FR-ATT-004 | E06-S2 | KPI-T05, T17 | PV | APPROVED | — | Planned |
| 19 | Audited corrections | — | FR-ATT-002 | E06-S3 | KPI-T14, T15 | PV | APPROVED | RK-07 | Planned |
| 20 | Pipeline separate | — | FR-RPT-003 | Dashboards / E06-S5 | KPI-T06 | PV | APPROVED | — | Planned |
| 21 | Reconciled reporting | — | FR-RPT-002 | E06-S6 | KPI-T04, T05 | PV | PROPOSED | — | Planned |
| 22 | North Star headline | PD-06 | Dashboard headline | E06-S5 | — | PV | **OPEN** | — | Waiting |
| 23 | Trustworthy content | OD (Draft→Review→Publish) | FR-CMS-002 | CMS / E02-S2 | T-CMS-01…05, V-4 | PV | APPROVED | — | Planned |
| 24 | Consent for case studies | OD (written consent) | FR-CMS-003 | E02-S4 | T-CMS-03, CLM-T04 | PV | APPROVED | RK-04 | Planned |
| 25 | Evidence-backed claims | OD (no false claims) | Claim registry | E02-S5 | T-CLM-01…03 | PV | APPROVED | RK-05 | Planned |
| 26 | AI copy reviewed | OD | FR-CMS-004 | E02-S2 | T-CMS-10 (flag) | PV | APPROVED | — | Planned |
| 27 | SEO | — | FR-CMS (SEO) | E02-S6 | T-SEO-01, T-CMS-07/08 | PV | PROPOSED | — | Planned |
| 28 | No fake app badges | OD | FR-WEB-006 | Content lint | T-PV-03 | PV | APPROVED | — | Planned |
| 29 | Least privilege | OD-18 | FR-IAM-001 | E01-S2 | T-SEC role matrix, V-2 | PV | APPROVED direction | — | Planned |
| 30 | Admin account safety | — | FR-IAM-002 | E01-S3 | V-5 | PV | PROPOSED | — | Planned |
| 31 | Audit integrity | — | FR-AUD-001 | E01-S6 | T-AUD-01, V-8 | PV | APPROVED need | — | Planned |
| 32 | Privacy compliance | — | Privacy notice | `/legal/privacy` / E03-S9 | Legal review | PV | **BLOCKED** | RK-02 | Waiting |
| 33 | Correct product choice | — | FR-CAT-001…003 | E07-S1/S2 | T-COM-01 | CR | OPEN (SKUs) | RK-08 | Planned |
| 34 | Honest custom pricing | OD (quote rule) | BR-03 | E07-S3/S4 | T-COM-02 | CR | APPROVED | — | Planned |
| 35 | Price tamper-proof | — | Server pricing | E08-S1 | T-COM-03 | CR | PROPOSED | — | Planned |
| 36 | Partner pricing private | OD-16 | FR3-CRM-001 | E07-S5 | T-COM-08 | CR | APPROVED | — | Planned |
| 37 | Manual payments safe | OD (COD/bank/wallet) | FR-PAY-001 | E08-S4 | T-COM-06, T-COM-07 | CR | APPROVED | RK-10 | Planned |
| 38 | Shipping correctness | — | FR-SHP-001 | E08-S5 | T-COM-04 | CR | BLOCKED (tariff) | — | Waiting |
| 39 | COD eligibility | — | BR-09 | E08-S5 | T-COM-05 | CR | PROPOSED | — | Planned |
| 40 | No oversell | OD (reserve at confirmation) | FR-INV-002 | E09-S2 | T-INV-01…03, V-1 | CR | APPROVED | RK-10 | Planned |
| 41 | Stock integrity | — | INV-7 | E09-S4 | T-INV-04 | CR | PROPOSED | — | Planned |
| 42 | Serial traceability | OD (serials) | FR-SER-* | E09-S3/S5 | T-SER-01/02 | CR | APPROVED need | RK-08 | Planned |
| 43 | Warranty from commissioning | OD-11 | FR-WAR-002 | E10-S1/S3 | T-SER-02, T-WAR-04 | CR | APPROVED | — | Planned |
| 44 | No invented warranty dates | OD-11, G-3 | FR-WAR-003 | E10-S3 | T-WAR-02 | CR | APPROVED | RK-01 | Planned |
| 45 | Policy gate before live selling | G-4 | L-3, L-5 | E10-S2 | T-WAR-03 | CR | APPROVED | RK-01/02 | Planned |
| 46 | Ownership verification | G-3 | FR-WAR-001 | E10-S5 | T-WAR-01 | CR | APPROVED | — | Planned |
| 47 | Service/RMA tracking | G-3 | FR-SVC-001 | E11 | T-WAR-05/06 | CR | APPROVED | — | Planned |
| 48 | Safety escalation | OD (safety) | W-08 | E11-S1 | T-WAR-07 | CR | APPROVED principle | RK-16 | Planned |
| 49 | Recoverability | — | NFR-REL | E12-S1 | T-OPS-01 | PV | PROPOSED | RK-13 | Planned |
| 50 | Operational readiness | — | L-9 | E12-S6 | Rehearsal report | CR | PROPOSED | RK-07 | Planned |
| 51 | No device control | OD-19 | ADR-11 | Architecture | Review | all | APPROVED | — | Planned |
| 52 | Future hosting fit | OD-07 | ADR-12 | Doc 15 | V-7 (measure) | FUT | DEFERRED | RK-15 | Planned |

## 2. Orphan and gap checks
| Check | Result | Action |
|---|---|---|
| Requirements without an acceptance test | FR3-CRM-001 (partner pricing) had none | **Fixed**: T-COM-08 added to doc 17 |
| Tests without a requirement | None found | — |
| Stories not mapped to a need | E01-S10 (observability) → NFR-OBS / V-7 | Mapped |
| Phase conflicts | E06 dashboards: doc 02 says "full dashboards CR", doc 19 puts ~50 % of E06 in the PV path | **Resolved**: executive + quality dashboards in PV (basic), conversion/segment dashboards in CR |
| Missing roles | Installer/technician appears in RACI (doc 20) but not as an RBAC role (doc 14) | **Resolved**: installers use the **Engineer** role (commissioning permission). A dedicated "Technician" role is a future option |
| Blocked requirements | Privacy notice (#32), shipping tariff (#38), North Star (#22) | Listed in doc 21 |

## 3. Contradiction check (new pack, re-read)
| Topic | Finding | Severity | Resolution | Fixed? |
|---|---|---|---|---|
| Preview selling restrictions | Consistent (docs 01, 04, 08 §9, 17 T-PV, 18 §2) | — | — | n/a |
| Warranty in first commercial launch | Consistent (W1, G-3/G-4 in docs 01, 09, 18) | — | — | n/a |
| Local Windows vs cloud wording | "VS Code"/"cloud" appear only in correction context (docs 00, 01) | — | — | n/a |
| Git/GitHub | Mentioned only as prohibited/deferred | — | — | n/a |
| Railway | Doc-only everywhere | — | — | n/a |
| Multiple sales paths | Four commerce paths + RFQ. Consistent | — | — | n/a |
| Mobile apps | CL-10 PROHIBITED until published. Consistent | — | — | n/a |
| 4/6/16 scope | Consistent | — | — | n/a |
| Sourced/Assisted exclusivity, cohort orthogonality | Consistent (docs 07, 13) | — | — | n/a |
| CMS vs transactional | Consistent (docs 10 §1, 13 §1) | — | — | n/a |
| Footage consent | Consistent | — | — | n/a |
| Warranty duration | Never stated. Always unapproved | — | — | n/a |
| Architecture recommendation vs approval | Always PROPOSED | — | — | n/a |
| No installs/spike/code | Consistent | — | — | n/a |
| **F-01** RFQ state names in a test | T-CRM-01 used the v2 state `TRIAGE` | Low | Changed to `INITIAL_QUALIFICATION` | ✅ doc 17 |
| **F-02** KPI IDs differ between v2 (`docs/09`) and this pack (doc 07) | Medium | Mapping below. **This pack's IDs govern** | ✅ (mapping) |
| **F-03** Ambiguous RFQ indexing note | Low | Clarified | ✅ doc 05 |
| **F-04** T-CRM-03 precondition used a non-existent state "WON" | Low | Fixed | ✅ doc 17 |
| **F-05** Sensitivity table arithmetic (doc 12) initially inconsistent | Medium | Recomputed and replaced | ✅ doc 12 |
| **F-06** Illustrative dataset: coverage % and vintage view initially wrong | Medium | Recomputed | ✅ doc 07 |
| **F-07** Prior v2 docs misidentify the IDE as VS Code | Medium | Correction recorded (doc 00 §2.1). **Originals not edited** (instruction) | Recorded |
| **F-08** v2 `docs/04` shows DR-041 as PROPOSED | Medium | Additive override in doc 01 §4. Originals not edited | Recorded |

### KPI ID mapping (F-02)
| v2 `docs/09` | This pack doc 07 |
|---|---|
| KPI-001 Sourced | KPI-001 |
| KPI-002 Assisted | KPI-002 |
| KPI-003 Total influenced | KPI-003 |
| KPI-004 Qualified pipeline | **KPI-008** |
| KPI-005 RFQ qualification rate | **KPI-010** |
| KPI-006 Proposal-to-signed | **KPI-011** |
| KPI-007 Average value | **KPI-013** |
| KPI-008 Sales cycle | **KPI-014** |
| KPI-009 Gross margin | **KPI-009** |
| KPI-010 Cohort split | **KPI-007** |
| KPI-011 Attribution coverage | **KPI-015** |
| KPI-012 Capacity risk | **KPI-012** |
| — | KPI-004 Non-website, KPI-005 Unknown, KPI-006 Total eligible, KPI-016 Override rate (new) |

## Sign-off (Wave 12b)
52 traceability rows ✅ · Orphan checks ✅ · Contradiction audit with fixes in the new artefacts only ✅

# KPI Dictionary, Attribution and Dashboards

| Doc ID | OTONOM-DOC-09 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. Finance sign-off pending |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Defines the commercial KPIs, attribution classes and evidence rubric, customer cohorts, contract-value recognition options, reconciliation invariants and dashboard information architecture.

## 2. Approved principles
1. **Objective:** maximise website-influenced signed contract value (DR-004).
2. **Scope:** all eligible **new** contracts, with **new and existing** customers. Cohorts reported separately (DR-005).
3. **Classes:** exactly one of `WEBSITE_SOURCED`, `WEBSITE_ASSISTED`, `NON_WEBSITE`, `UNKNOWN` per eligible contract at the reporting snapshot. No double counting (DR-006).
4. **Pipeline:** never added to signed value.

## 3. KPI dictionary
| KPI ID | Name | Definition | Source | Grain | Status |
|---|---|---|---|---|---|
| KPI-001 | Website-Sourced Signed Contract Value | Σ eligible signed value where class = SOURCED | Contract + Attribution | Contract | Candidate North Star (**PROPOSED**) |
| KPI-002 | Website-Assisted Signed Contract Value | Σ eligible signed value where class = ASSISTED | Contract + Attribution | Contract | APPROVED as a distinct metric |
| KPI-003 | Total Website-Influenced Signed Value | KPI-001 + KPI-002 (classes are exclusive, so there is no overlap. Dedupe by contract ID as a safeguard) | Contract | Contract | Supporting / North Star candidate |
| KPI-004 | Qualified Open Pipeline | Σ current estimated value of open opportunities with `qualified_at` | Opportunity | Opportunity | PROPOSED |
| KPI-005 | RFQ Qualification Rate | qualified RFQs ÷ valid (non-spam, deduped) RFQs | RFQ | RFQ | PROPOSED |
| KPI-006 | Proposal-to-Signed Conversion | signed opportunities ÷ opportunities with ≥1 sent proposal | Opportunity | Opportunity | PROPOSED |
| KPI-007 | Average Signed Contract Value | eligible signed value ÷ eligible contracts (median shown too) | Contract | Contract | PROPOSED |
| KPI-008 | Median Sales Cycle | median(`signed_at` − `qualified_at`). P75 shown | Opportunity | Opportunity | PROPOSED |
| KPI-009 | Estimated Gross Margin | (est. value − est. direct delivery cost) ÷ est. value | Contract | Contract | PROPOSED, needs cost data + FIN |
| KPI-010 | New vs Existing Cohort Value | Eligible signed value sliced by cohort at signature | Org + Contract | Contract | APPROVED distinction |
| KPI-011 | Attribution Coverage | contracts with reviewed, supported class ≠ UNKNOWN ÷ eligible contracts | Contract | Contract | PROPOSED, target ≥ 90 % |
| KPI-012 | Delivery Capacity Risk | committed installation-days in window ÷ available capacity. Qualitative flag if no data | Delivery plans | Project | PROPOSED |

## 4. Classification rules and evidence rubric
### 4.1 Rules (applied at opportunity creation, reviewed, then frozen at contract signature)
| Rule | Class | Condition |
|---|---|---|
| R-S | `WEBSITE_SOURCED` | The **earliest evidenced origin** of this specific opportunity is a website conversion: RFQ, consultation form, partner inquiry, or a website-initiated chat with a captured record |
| R-A | `WEBSITE_ASSISTED` | The origin is non-website **and** ≥ 1 qualifying website contribution (4.2) is documented before `signed_at` |
| R-N | `NON_WEBSITE` | A documented non-website origin with no qualifying website contribution |
| R-U | `UNKNOWN` | The origin can't be established. It counts against KPI-011. It is never force-classified |

### 4.2 Qualifying website contribution for Assisted (PROPOSED rubric, needs owner approval)
| Evidence | Qualifies? |
|---|---|
| A website RFQ/consultation submitted by a contact of an existing (non-web-origin) opportunity | Yes |
| A consultation booked through the website | Yes |
| A gated datasheet/document request by an identified contact | Yes |
| A signed or dated sales note quoting the customer that a specific case study or page influenced the decision | Yes (reviewer approval required) |
| Content shared by sales via a tracked link that the identified contact opened (only with consent and a disclosed tracking policy) | Yes, if consent exists |
| A page view, session count or ad impression alone | **No** |
| A meeting without approved notes | **No** |

### 4.3 Override control
After freeze, a change requires: an authorised role, a reason, before/after values, an approver (or a single-actor exception record, DR-051), a timestamp and an audit event. The overrides report lists all of them.

## 5. Contract-value recognition (PROPOSED, DR-045, FIN sign-off required)
| Topic | Proposal |
|---|---|
| Base value | Signed contractual value **excluding VAT/taxes** |
| Components | Keep supply, installation, engineering, subscription and maintenance line values separately |
| Amendments | Signed ± adjustments with an effective date, linked to the original. Reported in the amendment's period with the original's class |
| Two stored values | `signed_value_at_signature` and `current_net_contract_value` |
| Cancellations | Negative adjustment in the period of cancellation. The original evidence is never deleted |
| Renewals/options | Not counted until signed |
| Multi-year | Signed total contract value. Annualised value shown separately |
| Ineligible | Quotations, unapproved purchase requests, consumer carts, retail store orders (reported in store metrics, not contract KPIs, unless a signed B2B supply contract exists) |
| Currency | EGP reporting. Original currency, amount, FX rate, date and source stored. FX rule (signature-date vs period-average) OPEN |
| New contract vs amendment | A new contract has its own identity and signed instrument. A scope increase on an existing contract is an amendment |

## 6. North Star recommendation (DR-007 remains OPEN)
**Recommendation:** make **KPI-001 Website-Sourced Signed Contract Value** the North Star, and show **KPI-003 Total Influenced** beside it as a companion metric, with KPI-011 coverage displayed.

Why:
- Sourced depends least on human judgement and is the most auditable while classification discipline is still forming.
- Assisted depends on staff recording evidence, so early numbers would be noisy and could be inflated.
- Showing KPI-003 alongside keeps the website's trust role visible.

**What would change this recommendation:** after 2 quarters, if KPI-011 ≥ 90 % and the override rate < 5 %, switching to KPI-003 becomes reasonable. Also, if most of OTONOM's deals originate from referrals that then use the site, Sourced alone would understate the site's value.

## 7. Reconciliation invariants (must hold for the same period and filter)
1. `sourced + assisted + non_website + unknown == total eligible signed value` (after the documented adjustment policy).
2. `new_customer + existing_customer == total eligible signed value`.
3. `total_influenced == sourced + assisted`. Cohort figures are never added again.
4. Pipeline is never included in signed totals.
5. Every total drills down to contract IDs + attribution evidence.
6. Exports respect permissions, date boundaries and PII minimisation.

## 8. Worked cases
| Case | Scenario | Class | Cohort |
|---|---|---|---|
| A | A first-time developer finds the site, submits an RFQ, signs | SOURCED | NEW |
| B | An existing developer discovers a new service on the site, submits a new RFQ, signs an independent contract | SOURCED (if the RFQ is the earliest origin of this opportunity) | EXISTING |
| C | A contractor referral creates the lead. The buyer books a website consultation. Signs | ASSISTED | per prior signed contracts |
| D | An existing contract gets a scope increase via amendment | Not a new contract. Adjustment to the original | — |
| E | Analytics shows a visit, no tracked contribution | Not ASSISTED (NON_WEBSITE or UNKNOWN per origin evidence) | — |
| F | Phone lead, no meaningful site engagement | NON_WEBSITE | per history |
| G | Origin impossible to establish | UNKNOWN (coverage penalty) | per history |
| H | Two RFQs from two contacts for one project | One opportunity. One class (earliest evidenced origin) | — |
| I | Master contract + building contracts | Obligations counted once (doc 08 §11, OPEN) | — |

## 9. Customer cohort
`NEW_CUSTOMER` if no previously signed OTONOM contract exists for the same **customer entity** at the contract's signature time, otherwise `EXISTING_CUSTOMER`. It is frozen at signature. Entity matching per DR-049. **A historical customer list is needed** (pre-platform contracts), or every early contract defaults to NEW incorrectly. Request: doc 24 E-17.

## 10. Dashboards (IA)
| Dashboard | Audience | Contents | Release |
|---|---|---|---|
| Executive | Owner | KPI-001/002/003 + NON_WEBSITE + UNKNOWN, cohort split, pipeline (separate panel), trend, top segments, margin/capacity flags, coverage | Launch |
| Attribution quality | Owner/reviewer | UNKNOWN rate, overrides (who/when/why), stale evidence, merges | Launch |
| Conversion | Owner/sales | Consented traffic sources, RFQ starts/completions, qualification rate, proposals, won/lost, time in stage, SLA breaches | Launch (basic) |
| Projects | Sales/ops | By region, type, units, stage, engineer, value, capacity | Launch |
| Store | Store ops | Order states, inventory, fulfilment delay, returns. **Separate from contract KPIs** | Commercial launch |
Every panel shows its data timestamp. A failed query shows "unavailable", never stale numbers presented as live.

## 11. Acceptance (tests in doc 20)
KPI-AT-001…005 plus invariants checked against a synthetic fixture: ≥ 12 contracts across 6 organisations, including duplicates, one amendment, one cancellation, one master/child pair, one UNKNOWN and one existing-customer SOURCED.

## Change log
2.0-draft, 2026-10-13: KPI IDs aligned to master v2. Rubric, recognition table, cases H–I and invariants added.

## Next review decision
The owner picks the North Star. Finance reviews §5. The owner approves the §4.2 rubric.

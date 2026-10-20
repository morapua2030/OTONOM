# 07 — Contract KPIs, Attribution and Analytics

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. Finance sign-off required. North Star OPEN |
|---|---|---|---|---|---|---|---|

## 1. Approved principles (M3P §1.3)
1. Analytical scope: **all new signed contracts**, including new contracts with **existing** customers.
2. Attribution per contract: exactly one of `WEBSITE_SOURCED`, `WEBSITE_ASSISTED`, `NON_WEBSITE`, `UNKNOWN`.
3. `customer_cohort ∈ {NEW, EXISTING}` is an **orthogonal** dimension, not an attribution type.
4. No contract counted in more than one attribution class.
5. Retail web orders are not signed contracts (BR-01, finance to confirm).

## 2. Population definition
`ELIGIBLE_CONTRACTS(period P, filters F)` = contracts where all of these hold:
- `status ∈ {ACTIVE, AMENDED, COMPLETED}`, or the contract was cancelled after signature (cancellations are handled as adjustments, see §6)
- `signed_at ∈ P`
- `contract_type ∈ ELIGIBLE_TYPES` (OPEN, see §6)
- it is not an amendment record
- it is not a framework-only master with zero obligation (rule OPEN)
- it matches filters F

The population is **deduplicated by `contract_id`**.

## 3. KPI dictionary
| KPI | Name | Formula | Unit | Grain | Filters | Exclusions | Acceptance |
|---|---|---|---|---|---|---|---|
| KPI-001 | Website-Sourced Signed Value | Σ `recognised_value(c)` for c ∈ ELIGIBLE where class(c)=SOURCED | EGP (pre-tax, PROPOSED) | contract | period, segment, region, cohort | pipeline, retail orders | KPI-T01, T02 |
| KPI-002 | Website-Assisted Signed Value | same with class=ASSISTED | EGP | contract | same | same | KPI-T01 |
| KPI-003 | Total Website-Influenced Signed Value | KPI-001 + KPI-002 | EGP | contract | same | NON_WEBSITE, UNKNOWN | KPI-T03 |
| KPI-004 | Non-Website Signed Value | class=NON_WEBSITE | EGP | contract | same | — | KPI-T04 |
| KPI-005 | Unknown-Origin Signed Value | class=UNKNOWN | EGP | contract | same | — | KPI-T04 |
| KPI-006 | Total Eligible Signed Value | Σ over ELIGIBLE | EGP | contract | same | — | KPI-T04 |
| KPI-007 | Cohort split | KPI-006 by cohort (NEW, EXISTING) | EGP | contract | same | — | KPI-T05 |
| KPI-008 | Qualified Open Pipeline | Σ `estimated_value` of open opportunities with `qualified_at` ≤ snapshot | EGP | opportunity | snapshot date | signed, lost, cancelled | KPI-T06 |
| KPI-009 | Estimated Gross Margin % | (Σ est. value − Σ est. direct cost) ÷ Σ est. value | % | contract | same | contracts without a cost estimate (shown as coverage) | KPI-T12 |
| KPI-010 | RFQ Qualification Rate | qualified ÷ valid (non-spam, deduped) RFQs | % | RFQ | submitted in P | spam, merged duplicates | KPI-T07 |
| KPI-011 | Proposal-to-Signed Conversion | opportunities WON_SIGNED ÷ opportunities with ≥1 PROPOSAL_SENT | % | opportunity | cohort window | — | KPI-T08 |
| KPI-012 | Delivery Capacity Risk | committed installation-days ÷ available installation-days (per window) | ratio | month × region | — | — (data OPEN) | KPI-T13 |
| KPI-013 | Average / Median Signed Value | KPI-006 ÷ count. Median | EGP | contract | same | — | KPI-T09 |
| KPI-014 | Median Sales Cycle | median(`signed_at − qualified_at`) | days | opportunity | signed in P | — | KPI-T10 |
| KPI-015 | Attribution Coverage | count(class ≠ UNKNOWN AND reviewed) ÷ count(ELIGIBLE) | % | contract | same | — | KPI-T11 |
| KPI-016 | Attribution Override Rate | overrides after lock ÷ ELIGIBLE count | % | contract | same | — | KPI-T14 |

`recognised_value(c)` = `signed_value_at_signature` (pre-tax), plus amendment deltas effective in the period, minus cancellation adjustments effective in the period. **This is a PROPOSED policy that needs finance sign-off.**

## 4. Classification rules and adjudication
| Rule | Class | Condition |
|---|---|---|
| R-S | SOURCED | The earliest **evidenced** origin of the opportunity is a website conversion (RFQ, consultation booking, partner inquiry, website chat with a stored record) |
| R-A | ASSISTED | The origin is evidenced as non-website **and** ≥ 1 qualifying website contribution (§4.1) is documented before `signed_at` |
| R-N | NON_WEBSITE | Non-website origin evidenced. No qualifying contribution |
| R-U | UNKNOWN | Origin cannot be evidenced |

### 4.1 Qualifying contributions (PROPOSED rubric)
Qualifying:
- a website RFQ/consultation by a contact of an existing opportunity
- a website-booked meeting
- a gated document request by an identified contact
- a dated sales note quoting the customer about specific website content (reviewer-approved)

**Never qualifying alone:** a page view, a session, an ad impression, an unrecorded meeting.

### 4.2 Lifecycle of a class
- Proposed automatically at opportunity creation.
- Confirmed by a human at qualification.
- **Locked at contract signature.**
- After lock: override only with actor, reason, before/after, approver (or single-actor exception), timestamp.
- Overrides are shown in an exceptions report.

## 5. Edge cases
| # | Case | Treatment | Status |
|---|---|---|---|
| E1 | Existing developer signs a second, independent contract via a new website RFQ | New opportunity → SOURCED. Cohort EXISTING | PROPOSED |
| E2 | Scope amendment on an existing agreement | Not a new contract. Delta adjusts the original's value in the amendment period, same class | PROPOSED |
| E3 | Addendum vs standalone agreement | Standalone if it has its own signed instrument + new scope + own price. Otherwise amendment. Finance decides borderline cases | OPEN |
| E4 | Multi-year maintenance | Count signed committed TCV. Annualised value shown separately. Renewals only when signed | PROPOSED |
| E5 | Pre-tax vs taxes | Pre-tax recognised value. Taxes stored separately | PROPOSED |
| E6 | Partial cancellation | Negative adjustment of the cancelled portion in the cancellation period. Original evidence kept | PROPOSED |
| E7 | Currency conversion | Store original amount/currency + FX rate/date/source. Report in EGP at the signature-date rate (alternative: period average) | OPEN |
| E8 | Contract signed while the opportunity's attribution is stale/unreviewed | Signature is blocked until the class is reviewed, **or** the contract is allowed with class UNKNOWN + review task (recommend the latter, to avoid blocking sales) | PROPOSED |
| E9 | Lead originally offline, later re-enters through a website form | Earliest evidenced origin = offline → not SOURCED. The form is a qualifying contribution → ASSISTED | PROPOSED |
| E10 | Agency/consultant submits on behalf of an end developer | Organisation = contracting entity (developer). Agency recorded as influencer contact. Class from the agency's submission channel | PROPOSED |
| E11 | Two RFQs from two contacts for one project | One opportunity. One class (earliest origin) | PROPOSED |
| E12 | Master + building contracts | Count obligations once (value on the instruments that create obligations). Umbrella with no obligation = 0 | OPEN (finance) |
| E13 | Contract cancelled in a later period | Original period unchanged. Negative adjustment in the cancellation period (restatement policy §8) | PROPOSED |
| E14 | Cohort ambiguity: developer group with several SPVs | Group link (human-confirmed) → EXISTING if any group entity had a prior signed contract (owner to confirm the rule) | OPEN |

## 6. Open finance decisions
`ELIGIBLE_TYPES` (project, supply-only, service, maintenance) · pre-/post-tax · amendment and cancellation timing · master/child rule · FX rule · survey-fee treatment · restatement policy · historical customer import for cohorts.

## 7. Reconciliation identities (must hold for identical P and F)
1. `KPI-001 + KPI-002 + KPI-004 + KPI-005 = KPI-006`
2. `KPI-007[NEW] + KPI-007[EXISTING] = KPI-006`
3. `KPI-003 = KPI-001 + KPI-002`
4. `count(distinct contract_id)` is identical across all slices
5. KPI-008 (pipeline) never appears in any sum above

Any violation creates a `RECONCILIATION_EXCEPTION` row visible on the attribution-quality dashboard.

## 8. Effective-dated reporting and restatement
- Every value change (amendment, cancellation, attribution override) has an `effective_at` and a `recorded_at`.
- **Default "as-recorded" view:** closed periods are not rewritten. Late changes appear in the period they were recorded.
- **Optional "vintage (restated)" view:** attributes every later amendment and cancellation back to the contract's **signing period**. This shows the net current value per signing vintage. It is labelled "restated / vintage" and shows the restatement audit (who, when, what changed).

## 9. North Star alternatives (OPEN: owner decides)
| Option | Headline | Pros | Cons |
|---|---|---|---|
| NS-A | KPI-001 Website-Sourced Signed Value (KPI-003 beside it) | Most auditable. Least judgement. Hard to inflate | Understates the site's role when referrals dominate |
| NS-B | KPI-003 Total Website-Influenced Signed Value (KPI-001 and KPI-002 broken out) | Closest to the approved goal wording ("attributable to the website") | Assisted depends on evidence discipline. More inflation risk |

**Agent recommendation:** NS-A for the first two quarters (while coverage and evidence discipline mature). Re-evaluate for NS-B when KPI-015 ≥ 90 % and KPI-016 < 5 %. **Note:** NS-B is arguably more literally aligned with "maximize eligible signed contract value attributable to the website". This is why the choice is the owner's.

## 10. Dashboards
| Dashboard | Panels |
|---|---|
| Executive | Headline (per NS choice), the 4-class waterfall (KPI-001/002/004/005 = 006), cohort split, pipeline (separate panel, labelled "not signed"), trend by month, top segments, margin coverage, capacity flags, coverage KPI-015 |
| Attribution quality | UNKNOWN list, overrides (who/why), reconciliation exceptions, stale reviews, merges |
| Conversion | Consented source/medium/campaign → RFQ start/completion → qualified → proposal → signed (counts + value), time in stage, SLA breaches |
| Segment/campaign | By segment (developer/contractor/homeowner), by campaign (UTM), by region |
| Store (CR) | Orders, AOV, confirmation time, oversell incidents, payment verification time. **Not part of contract KPIs** |

Every panel shows a data timestamp. On query failure it shows "unavailable", never stale data presented as live.

## 11. Illustrative dataset (**ILLUSTRATIVE ONLY, not company data**)
| contract | org | cohort | class | signed (EGP, pre-tax) | period | amendment | cancellation |
|---|---|---|---|---|---|---|---|
| C1 | Dev A | NEW | SOURCED | 2,000,000 | Q1 | — | — |
| C2 | Dev B | EXISTING | SOURCED | 1,200,000 | Q1 | +300,000 (Q2) | — |
| C3 | Contractor C | NEW | ASSISTED | 800,000 | Q1 | — | — |
| C4 | Homeowner D | NEW | NON_WEBSITE | 350,000 | Q1 | — | — |
| C5 | Dev E | EXISTING | UNKNOWN | 600,000 | Q1 | — | −600,000 (Q2, full) |
| C6 | Homeowner F | NEW | ASSISTED | 250,000 | Q2 | — | — |
| P1 | Dev G (open opp.) | — | (SOURCED) | est. 3,000,000 | — | pipeline only | — |

Expected Q1 (as-recorded):
- KPI-001 = 3,200,000
- KPI-002 = 800,000
- KPI-004 = 350,000
- KPI-005 = 600,000
- KPI-006 = 4,950,000
- NEW = 3,150,000. EXISTING = 1,800,000. Total = 4,950,000 ✓
- KPI-003 = 4,000,000
- Pipeline (3,000,000) is excluded from all of the above.

Expected Q2 (as-recorded):
- C2 amendment +300,000 → SOURCED, EXISTING
- C5 cancellation −600,000 → UNKNOWN, EXISTING
- C6 +250,000 → ASSISTED, NEW
- KPI-006 = −50,000 net. The panel must show the components (signed 250,000, amendments +300,000, cancellations −600,000), not just the net.

## 12. Test cases (all NOT EXECUTED)
| ID | Case | Expected |
|---|---|---|
| KPI-T01 | C1–C6 classification sums | Q1 values as in §11 |
| KPI-T02 | Attempt to classify C1 as both SOURCED and ASSISTED | Rejected (single class column + constraint) |
| KPI-T03 | KPI-003 equals KPI-001 + KPI-002 | Holds |
| KPI-T04 | 4-class identity | Holds. A violation creates an exception |
| KPI-T05 | Cohort identity | NEW + EXISTING = KPI-006 |
| KPI-T06 | Pipeline excluded | P1 not in any signed figure |
| KPI-T07 | Spam + merged duplicates excluded from the qualification-rate denominator | Correct ratio |
| KPI-T08 | Proposal-to-signed with re-issued proposals | Opportunity counted once |
| KPI-T09 | Median vs mean with an outlier | Both shown |
| KPI-T10 | Sales cycle with an ON_HOLD period | Includes hold time (documented). The variant excluding hold is OPEN |
| KPI-T11 | Coverage with UNKNOWN C5 | Q1: 4 of 5 contracts = 80 % |
| KPI-T12 | Margin with a missing cost estimate | Coverage shown. Missing excluded from %, not treated as 0 |
| KPI-T13 | Capacity ratio with no capacity data | "Data unavailable", not 0 |
| KPI-T14 | Override after lock without a reason | Rejected |
| KPI-T15 | Override with a reason | Accepted. Audit with before/after. Overrides report updated |
| KPI-T16 | Vintage view after the Q2 changes | Q1 vintage = 2,000,000 + 1,500,000 + 800,000 + 350,000 + 0 = 4,650,000, labelled "restated / vintage". The as-recorded Q1 stays 4,950,000 |
| KPI-T17 | Existing customer new RFQ (E1) | SOURCED + EXISTING |
| KPI-T18 | Offline lead re-enters via form (E9) | ASSISTED |

## Sign-off (Wave 5)
Every KPI has ID, formula, unit, grain, filters, exclusions and test ✅ · Reconciliation identities ✅ · North Star OPEN with two alternatives ✅

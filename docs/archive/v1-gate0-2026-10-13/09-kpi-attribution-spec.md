# 09 — KPI and Attribution Specification (DRAFT)

## 1. Approved principles (from the brief, D-001/D-002)
1. Scope = **all eligible new signed contracts**, with **New** and **Existing** customers reported as separate cohorts.
2. Per contract, the classes are **mutually exclusive**: `WEBSITE_SOURCED` | `WEBSITE_ASSISTED` | `NON_WEBSITE` | `UNKNOWN`. There is no double counting.
3. Pipeline value is **never** added to signed value.

## 2. KPI definitions
| KPI | Formula | Notes |
|---|---|---|
| Website-Sourced Signed Contract Value (WSSCV) | Σ value of eligible signed contracts where the linked opportunity class = `WEBSITE_SOURCED` | — |
| Website-Assisted Signed Contract Value (WASCV) | Σ value where class = `WEBSITE_ASSISTED` | — |
| Total Website-Influenced Signed Contract Value | WSSCV + WASCV, **deduplicated by contract ID** | Because the classes are exclusive, the sum has no overlap. Dedupe still guards against data errors |
| New / Existing Customer Contract Value | Same measures sliced by `customer_cohort` | Slices are not added on top of the totals |
| Qualified Pipeline Value | Σ `estimated_value` of open opportunities with `qualified_at` set | Separate chart. Never summed with signed value |
| Attribution coverage | Contracts with class ≠ `UNKNOWN` ÷ all eligible contracts | Data-quality KPI. Target proposal ≥ 90 % |
| RFQ → Qualified rate | qualified opportunities ÷ non-spam unique RFQs | By cohort and channel |
| Proposal → Signed rate | signed ÷ opportunities that reached `Proposal` | — |
| Average signed contract value | Σ value ÷ count | Median also shown |
| Sales cycle | `signed_at − first_touch_at` (median, P75) | — |
| Estimated gross margin | needs cost data (OPEN) | — |
| Capacity | committed installation-days vs available (OPEN) | — |

**Eligibility (OPEN, D-007):** which contract types count (project / supply-only / service / maintenance), pre- or post-tax value, amendments, cancellations, multi-year and recurring treatment. **Draft proposal for finance review:** use pre-tax contract value at signature. Positive amendments count as additional value in the amendment period, attributed with the original contract's class. Cancellations are negative adjustments in their period. Multi-year contracts count the signed total contract value (TCV) and show annualised value separately. Recurring maintenance counts only the committed term.

## 3. Classification rules (applied at opportunity level, carried to contracts)
| Rule | Class | Condition |
|---|---|---|
| R1 | `WEBSITE_SOURCED` | The **first known touch** that created the opportunity was a website conversion: RFQ form, consultation booking, partner inquiry or website chat, **and** no earlier documented non-website origin exists for the same opportunity |
| R2 | `WEBSITE_ASSISTED` | The opportunity originated elsewhere (referral, phone, exhibition, existing account manager) **and** at least one **qualifying website interaction** (§4) is documented before `signed_at` |
| R3 | `NON_WEBSITE` | A non-website origin is documented and there is no qualifying website interaction |
| R4 | `UNKNOWN` | Origin is not documented. Must be resolved or explicitly accepted before period close |

The system proposes a class from the rules. A human confirms it. The class **locks at contract signature**. Later changes need an actor, timestamp, reason, before/after values and an approver (D-022). The basis rule ID is stored.

## 4. What counts as a "meaningful, documented website interaction" (PROPOSED)
Qualifying (must be linked to an identified contact/org of the opportunity):
- an RFQ or form submission by a contact of that opportunity (including a second contact),
- a consultation booked through the site,
- a gated datasheet or technical document request through the site,
- the customer **explicitly stating** that a case study or website content influenced the decision, recorded by staff with a date and quote,
- a customer portal action that started this sale (e.g. an expansion request from a registered existing customer).

Not qualifying on its own: anonymous page views, a session count, a generic visit to the homepage, ad impressions.
Tracking the page views of identified contacts requires consent and is **not** proposed for the MVP.

## 5. Evidence captured
RFQ ID, first known acquisition channel, referrer, UTMs (if present), landing page, timestamped touchpoints, opportunity ID, contract ID, source evidence (file or note), and the override reason when there is one. First-touch data is captured client-side only after consent where required. The server records submission time and IP-derived country (no raw IP retained beyond the security log window).

## 6. Customer cohort (New vs Existing)
- **New** if no previously signed OTONOM contract existed for the same customer **entity** at the time of signature. Otherwise **Existing**. Frozen at signature.
- **Entity matching (OPEN, D-008), proposed:** tax registration number → commercial registry number → normalised legal name + governorate → admin-confirmed group link (for developer groups with several SPVs). For individuals: national ID is **not** collected (privacy), so use normalised name + phone, admin-confirmed.
- Open question: do **pre-website historical contracts** need importing so the Existing classification is correct? (Proposal: import a minimal list of past customers' identifiers + first contract date.)

## 7. Currency
Reporting in EGP. Original currency, original amount, FX rate, FX date and FX source are stored per contract. The FX rule (signature-date rate vs period-average rate) is OPEN.

## 8. North Star recommendation (D-006 is still OPEN)
**Recommendation:** make **Website-Sourced Signed Contract Value** the North Star, and report **Total Website-Influenced Value** right beside it as a companion metric.
Reasons: Sourced depends least on human judgment and is the most auditable, which matters most in the first 2–3 quarters while classification discipline is still forming. Assisted depends on staff recording interactions, so early data would be noisy. Showing both still keeps the website's credibility role visible.
**Revisit after 2 quarters**, once attribution coverage is ≥ 90 % and override rates are known.
*This is a recommendation, not an approved decision.*

## 9. Report acceptance tests (summary)
AT-ATT-11 a contract appears in exactly one class · AT-ATT-12 Sourced + Assisted = Total (deduped) · AT-ATT-13 cohort slices sum to the totals · AT-ATT-16 pipeline is never included in signed figures · AT-ATT-18 every figure drills down to the contract list with evidence links · AT-ATT-09 an override after lock without a reason is rejected.

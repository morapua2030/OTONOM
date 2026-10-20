# Decisions Required from the Owner

Status: 2026-10-15. The implementation **never** fills these in by itself: where a value is needed, the system refuses to proceed (for example `PRICE_NOT_APPROVED` or `WARRANTY_POLICY_NOT_APPROVED`) or shows a placeholder.

## A. Business values (BLOCKED until supplied)
| # | Decision | Where it plugs in | Effect today |
|---|---|---|---|
| D-01 | Approve the architecture (Option A provisional) | Whole platform | Local development only |
| D-02 | Controller SKU list, variants, standard additions | `domain.skus` (catalogue) | Only 3 synthetic SKUs, stock 0 |
| D-03 | Prices (VAT basis) | Admin price proposal → OWNER approval | Every order refused (`PRICE_NOT_APPROVED`) |
| D-04 | Shipping tariff / zones (or keep per-order quotes) | `setShipping` | Staff must enter shipping per order |
| D-05 | Warranty duration, coverage start event (delivery / installation / commissioning), coverage of replacements | `approveWarrantyPolicy`, coverage activation | No coverage dates anywhere |
| D-06 | Returns / refund policy | Cancellation / RMA | Refund flagged only, not executed |
| D-07 | Partner programme terms and pricing | Partner page / CRM | No prices shown |
| D-08 | Survey fee amount | Opportunity pipeline | Only "fee agreed + invoice ref" recorded |
| D-09 | North Star KPI | Settings → `northStarKpi` | Report shows "PENDING_OWNER_DECISION" |
| D-10 | Cohort rule for group companies (PD-07) | KPI cohort | Exact organisation match only |
| D-11 | Attribution override approval: single or dual | `overrideAttribution` | Single, flagged `single_actor` |
| D-12 | Payment gateway (if any) | Payments | Manual payments only |
| D-13 | Brand files, company facts, final AR/EN copy | Site | Placeholders, clearly labelled |
| D-14 | Hosting authorisation, Git, e-mail provider, analytics/consent tool | Operations | None used |

## B. PROPOSED controls built in code (please confirm or change)
| # | Control | Current behaviour | Where |
|---|---|---|---|
| P-01 | Four-eyes on prices | Proposer cannot approve; OWNER approves | `commerce.ts approvePrice` |
| P-02 | Four-eyes on content | The last editor cannot approve their own content | `lib/workflow.ts` |
| P-03 | Claims publishable only by OWNER with evidence (+ certificate for CERTIFIED) | As stated | `collections/Claims.ts` |
| P-04 | Stock reserved at staff confirmation, not at website submission | As stated | `inventory.ts` |
| P-05 | Prepaid orders need verified payment before serial allocation; COD can be allocated before payment, but completion needs the COD payment verified | As stated | `orders.ts` |
| P-06 | Shipping quoted per order | As stated | `orders.ts setShipping` |
| P-07 | One signed contract per opportunity (more scope = amendment) | DB unique | `002_contracts_attribution.sql` |
| P-08 | Guest checkout with order access token until accounts are used | As stated | `orders.ts` |
| P-09 | Western digits in both languages for figures | Configurable | `lib/format.ts` |
| P-10 | KPI amounts pre-tax; adjustments at the contract's FX rate; all contract types count toward KPI-006 | As stated | `kpi.ts` |
| P-11 | Revocation of a consent is final (re-granting needs a new signed consent) | As stated | `collections/Consents.ts` |
| P-12 | Client-property photos need consent with PHOTOS scope + privacy screening; SVG and video uploads disabled | As stated | `collections/Media.ts` |
| P-13 | Safety tickets: URGENT, guidance shown, cannot be resolved before a human callback | As stated | `service.ts` |
| P-14 | Customer registration without e-mail verification (only until an e-mail provider exists; must not go live like this) | As stated | `endpoints /account/register` |

## C. Legal (needs counsel)
Privacy notice and data retention (PDPL 151/2020), terms of use, cookie notice, returns policy (Consumer Protection Law 181/2018), e-invoicing obligations, wording of the consent forms, safety-ticket guidance text.

## Added in round S4 (2026-10-16)
| # | Decision | Current local behaviour | Status |
|---|---|---|---|
| S4-1 | FX rounding rule for KPI totals: convert and round **each contract / adjustment** to EGP minor units, then sum (so every total equals the sum of its contract rows) | Implemented and tested with an exact oracle | **PROPOSED**, needs finance confirmation |
| S4-2 | Review note mandatory when a reviewer returns content to the author | Enforced server-side | **PROPOSED** editorial control |
| S4-3 | RFQ assignment limited to users holding CRM write permission | Enforced server-side | **PROPOSED** (follows the existing role matrix) |

# Controller Catalogue, Configurations and Pricing

| Doc ID | OTONOM-DOC-10 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. **No real prices, SKUs or ratings included** |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Product modelling for the 4/6/16-channel controllers, standard options vs custom engineering, pricing and quotation rules. Shipping is covered here and in doc 11. Inventory is in doc 12.

## 2. Modelling principles
- A relay **channel** is not a room, a device, a load rating or a compatibility promise. One room may need several channels. Load and protection limits come **only** from reviewed datasheets.
- Installation design is engineer-led. Electrical work must be done by a qualified electrician `[CBU]`.
- Options must not imply impossible combinations. A compatibility matrix and validator are required, with human fallback.

## 3. Entities
| Entity | Purpose | Key fields (proposed) | Notes |
|---|---|---|---|
| `ProductFamily` | Marketing concept | name{ar,en}, description, shared capabilities (evidence-linked) | — |
| `ProductModel` | Exact 4CH / 6CH / 16CH model | channel_count, datasheet_revision_id, availability_status, hardware_revision | Ratings only via datasheet |
| `SKU` | Stable sellable standard configuration | sku_code (scheme OPEN, DR-016), model_id, fixed option set, active | Not one SKU per bespoke firmware build |
| `StandardOption` | Validated fixed-price add-on or service fee | code, name{ar,en}, price_version, compatible_models[] | e.g. enclosure, power supply (examples only) |
| `CompatibilityRule` | Allowed/forbidden combinations | subject, object, rule, reason, evidence_id | Validator + human override with reason |
| `Configuration` | A customer's selection | model, options, optional firmware profile, service scope | Server-validated |
| `CustomEngineeringRequest` | Non-standard integration/firmware | description, feasibility status, engineer, estimate | Always → quote |
| `PriceVersion` | Price of SKU/option over time | amount (exact), currency EGP, valid_from/to, tax_inclusive flag (OPEN) | Immutable once referenced |
| `PriceQuote` | Versioned, expiring quote | lines, validity_date, revision, engineer_approval, customer_acceptance | — |
| `InstallationService` | Project service | scope, inclusions/exclusions, quoted price | Never auto-priced |
| `TechnicalDocument` | Datasheet/manual | type, version, language, publication_status, file | Public only when approved |

## 4. Pricing rules
| Rule | Detail | Status |
|---|---|---|
| PR-1 | Published base price per approved model | APPROVED principle. Prices missing |
| PR-2 | Published standard option prices add to the subtotal | APPROVED principle |
| PR-3 | Custom firmware / third-party integration → engineering estimate → quote | APPROVED |
| PR-4 | If any required component is a quote item, show "**Known subtotal — final price subject to quotation**". Never "Total payable" | APPROVED |
| PR-5 | Shipping from the approved governorate/zone tariff. No reuse of fees from unrelated projects. Unsupported zone → quote | BLOCKED on tariff |
| PR-6 | Installation priced after requirements review, with inclusions/exclusions | APPROVED |
| PR-7 | Tax treatment and invoicing requirements | OPEN (FIN/LEG) |
| PR-8 | Quantity/partner discounts need individual approval. Private partner price lists only after eligibility (DR-058) | PROPOSED |
| PR-9 | Price validity windows, quote expiry, changed-price acknowledgement, promotion expiry rules | OPEN. Proposals in §6 |
| PR-10 | Custom quotes require engineer approval **and** explicit customer acceptance | APPROVED |

## 5. Illustrative line structure (no real amounts)
```text
Controller base model ........................ [approved fixed price]
+ Standard option A ........................... [priced]
+ Standard option B ........................... [priced]
+ Custom firmware engineering ................. QUOTATION REQUIRED
+ Integration services ........................ QUOTATION REQUIRED
+ Installation / commissioning ................ QUOTATION REQUIRED
+ Shipping .................................... [tariff] or PENDING ASSESSMENT
+ Taxes ....................................... [per approved policy]
-----------------------------------------------------------------
Total: PENDING QUOTE (while any required component is unresolved)
```

## 6. Proposed price-change handling
- Cart lines store `price_version_id`. The server re-prices at submission.
- If the price changed between view and submit → the customer sees the difference and must accept.
- If it changed between submission and staff confirmation → the order goes to `CUSTOMER_PRICE_ACCEPTANCE_PENDING` (doc 11), unless the policy is to honour the submitted price (OPEN, recommend honouring for N days).
- Quotes carry `valid_until`. An expired quote can't be converted without re-approval.

## 7. Compatibility matrix (template)
| Model | Option/feature | Allowed | Requires | Evidence | Notes |
|---|---|---|---|---|---|
| 4CH | [option] | ? | ? | datasheet rev ? | to be filled by ENG |
| 6CH | … | | | | |
| 16CH | … | | | | |

## 8. Catalogue acceptance
SHOP-AT-001 (fixed base + options subtotal), SHOP-AT-002 (custom item → no final price), CAT checks: every displayed rating links to a datasheet revision. An impossible combination is rejected with an explanation.

## 9. Inputs required (doc 24)
Datasheets (E-03), price list + options (E-06), SKU proposal (E-07), tax policy (E-08), shipping tariff (E-09).

## 10. Edge cases (master §17.2, subset)
| Case | Handling | Status |
|---|---|---|
| Multiple models in one cart | Supported. Lines per SKU | COVERED |
| A configured option makes stock unavailable despite base stock | Availability is computed per SKU (options that change physical build = separate SKU) | COVERED (SKU scheme OPEN) |
| Customer removes custom work after quote approval | A new quote revision is required. The old one is superseded | COVERED |

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner supplies the price list, options and datasheets. ENG fills the compatibility matrix.

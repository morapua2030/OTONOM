# Personas and Customer Journeys

| Doc ID | OTONOM-DOC-05 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Defines who the platform serves, what each persona must achieve, and the touchpoints and KPIs per journey. Personas are **working hypotheses** from the owner's discovery answers. They have not been validated with user research (OPEN: 3–5 interviews with developers/contractors are recommended before final copy).

## 2. External personas
### P-DEV — Residential developer / compound procurement stakeholder (P1)
| Aspect | Detail |
|---|---|
| Jobs to be done | Shortlist a Smart Home vendor that can deliver consistently across many units. Justify cost and long-term support to management |
| Needs | Proof of repeatable multi-unit installation, interoperability, operating constraints, cost/maintenance predictability, per-unit configuration, commissioning process, safety responsibility, delivery capacity, warranty and support |
| Fears | Vendor viability, missed deadlines, cost overruns, inconsistent units, liability |
| Success | Shortlisting → engineering meeting → structured RFQ → technically credible proposal |
| Key content | Developer landing page, case studies, commissioning process, documentation, capacity statement (only if proven) |
| Anti-patterns | Retail cart, vague "contact us", unsupported scale claims |

### P-CON — Electrical/finishing contractor, consultant, integrator (P1)
| Aspect | Detail |
|---|---|
| Jobs | Specify or supply OTONOM in client projects. Get support and fair partner terms |
| Needs | Integration methods, wiring constraints, specs, documentation, project support, partner incentives, fulfilment reliability, approval workflow |
| Success | Qualified partner relationship → scoped supply/integration agreement (not anonymous checkout) |
| Key content | Contractor/partner page, technical documentation hub, partner inquiry |

### P-HOME — Homeowner / villa owner (P2)
| Aspect | Detail |
|---|---|
| Jobs | Make the home convenient and reliable without brittle complexity |
| Needs | Trustworthy demonstrations of lighting/climate/audio/scenes working together. Honest limits of offline/voice/remote control |
| Success | Free introductory consultation → scoped proposal |
| Key content | Solutions by room/function/scene, case studies, How We Work, consultation form |

### P-RETAIL — Controller purchaser (P3)
| Aspect | Detail |
|---|---|
| Jobs | Buy the right controller model for a known circuit count |
| Needs | Model comparison, channels vs circuits, load constraints from the datasheet, base price + options, checkout clarity, installation requirement, delivery expectations |
| Success | A correct order with no misleading fit claims |
| Risk | Wrong model choice or unsafe DIY wiring. Mitigate with a "how to select" guide and a qualified-electrician requirement |

### P-SERVICE — Existing customer (P2)
| Aspect | Detail |
|---|---|
| Jobs | Know warranty status, report issues, track repairs |
| Needs | Reliable device identification, verified ownership, ticket submission, RMA status, replacement history |
| Success | Issue resolved with visible progress. Records are private |

## 3. Internal roles (one person at launch)
| Role | Main tasks | Workspace |
|---|---|---|
| Administrator / owner | Everything. Approvals. Settings | All |
| Sales engineer | RFQ triage, qualification, consultation, proposals | Projects |
| Store operator | Order review, payment verification, fulfilment, stock | Store |
| Content editor / reviewer | Drafting, translation review, publication | Content |
| Service engineer | Commissioning, warranty evaluation, tickets, RMA | Service |
| Executive viewer | Dashboards (read-only) | Reports |

## 4. Journeys (touchpoints → system objects → KPIs)
### J-1 Developer project
| Step | Touchpoint | System object | KPI |
|---|---|---|---|
| Discover | Search/referral → Home or `/business/developers` | Session (consent-aware attribution context) | Landing → RFQ start rate |
| Evaluate | `/projects/*`, `/technology/*` | — | Case-study views (aggregate only) |
| Request | `/business/request-a-proposal` | RFQ (SUBMITTED) | RFQ completions |
| Triage/qualify | Projects workspace | RFQ → Opportunity | RFQ qualification rate (KPI-005) |
| Consult/survey | Call. Paid survey (optional) | ConsultationRecord, SiteSurvey | Time in stage |
| Propose/negotiate | Proposal versions | Proposal | Proposal-to-signed (KPI-006) |
| Sign | Contract evidence | Contract + AttributionClassification | KPI-001/002/003, cohort KPI-010 |
| Handoff | Manual ClickUp summary | DeliveryHandoff | Capacity risk (KPI-012) |

### J-2 Contractor / partner
Discover → documentation → partner inquiry (`PartnerApplication`) → eligibility review (manual) → approved partner tier (private pricing) → project RFQ or partner order (quote-based). KPI: approved partners, partner-sourced signed value (a slice of KPI-001/002).

### J-3 Homeowner
Solutions/scenes → case studies → `/consultation` (lighter RFQ variant, `customer_type=HOMEOWNER`) → engineering scoping → proposal → contract. Same CRM objects as J-1.

### J-4 Retail and after-sales
| Step | Object | Notes |
|---|---|---|
| Compare/configure | ProductModel, SKU, StandardOption | Custom items route to quote |
| Order | Order (SUBMITTED) | Idempotent |
| Staff review/confirm | Order (CONFIRMED, stock reserved atomically) | Payment verification per method |
| Fulfil | Serial assignment | Unique serial |
| Deliver/install | Shipment / CommissioningRecord | Electrician requirement |
| Register | DeviceOwnershipRecord (verified) | Not by serial alone |
| Warranty | WarrantyCoverage (policy version) | No end date while the policy is pending |
| Service | ServiceTicket / RMA | Private notes hidden |

## 5. Cross-journey rules
- The B2B project never enters a fixed-price cart. A retail purchase never requires an enterprise RFQ.
- An existing customer can start a new opportunity. The cohort becomes `EXISTING_CUSTOMER`, and attribution is judged on the **new** opportunity's evidence.
- Every journey offers a human-contact fallback (call/WhatsApp, details OPEN) at failure states.

## 6. Validation plan (proposed)
Before design sign-off:
- 3 developer/contractor interviews and 2 homeowner interviews (OPEN, owner to arrange)
- a review of the last 10 real enquiries (anonymised) to calibrate RFQ fields

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner confirms the persona priority and internal role list.

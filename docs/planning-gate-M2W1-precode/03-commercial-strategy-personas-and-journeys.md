# 03 — Commercial Strategy, Personas and Journeys

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. Personas are hypotheses (no user research supplied) |
|---|---|---|---|---|---|---|---|

## 1. Purpose
Translate the approved business goal into positioning, personas, sales motions and measurable outcomes per stage (PV/CR).

## 2. Positioning
| Element | Statement | Status |
|---|---|---|
| Category | Smart Home engineering and integration for residential projects, with proprietary relay controllers | APPROVED |
| Promise | Premium but accessible, reliable, advanced custom integration | APPROVED |
| Proof | Real (consented) projects, documented engineering process, evidence-backed integration statements, commissioning and after-sales | APPROVED principle |
| Not | Cheapest vendor, "No.1 in Egypt", certified-for-everything, a generic Apple clone | APPROVED |
| Primary B2B CTA | **Submit Project Details / Request a Proposal** | APPROVED |
| Secondary CTA | Book a free consultation | APPROVED |

## 3. Business objective → product outcomes
| Objective | Product outcome | Measure (doc 07) | Stage |
|---|---|---|---|
| Maximise eligible signed contract value attributable to the website | High-fit RFQs reach engineers quickly. Proposals are tracked to signature | KPI-001/002/003 | PV (capture) → CR |
| Margin safeguard | Qualification captures fit, scope and estimated margin | KPI-009 | PV |
| Capacity safeguard | Region/timeline vs installation capacity visible before commitment | KPI-012 | PV |
| Trust | Every public claim has evidence or safe wording | Claim-registry coverage (doc 11) | PV |
| Retail revenue (secondary) | Correct orders, no oversell, verified payments | Store metrics (separate from contract KPIs) | CR |
| After-sales trust | Customers see their verified devices and tickets | Ticket SLA, first-response time | CR |

## 4. Personas (hypotheses to validate)
### P1 — Developer / compound procurement lead (priority 1)
- **Goals:** a reliable partner for N identical units, predictable cost, schedule fit, handover documentation.
- **Objections:** "Can you deliver 100+ units on time?", "What happens after handover?", "Liability for safety-related integrations?"
- **Trust signals:** multi-unit process description, commissioning checklist, sample documentation, consented references, engagement models, clear warranty/service intent (terms when approved).
- **Conversion:** RFQ with unit count and stage → qualification → engineering meeting → proposal.

### P2 — General / electrical contractor or MEP consultant
- **Goals:** specify a dependable controller and integration partner, wiring documentation, supply terms.
- **Objections:** availability, documentation quality, support during installation, partner pricing.
- **Trust signals:** datasheets (when approved), integration methods, partner inquiry process.
- **Conversion:** partner inquiry or RFQ (supply-only model).

### P3 — Integrator / technical partner
- **Goals:** integrate OTONOM controllers into wider systems (Home Assistant, AV, HVAC).
- **Objections:** API/integration openness, firmware customisation process.
- **Trust signals:** precise integration matrix with limits, custom-engineering request path.
- **Conversion:** partner inquiry / custom engineering RFQ.

### P4 — Villa/apartment homeowner seeking a bespoke system
- **Goals:** convenience, a premium feel, reliability, someone who handles everything.
- **Objections:** complexity, works without internet?, cost uncertainty.
- **Trust signals:** scenario explanations, local vs cloud honesty, the consultation offer.
- **Conversion:** free consultation → (paid survey) → proposal.

### P5 — Retail controller buyer (CR only)
- **Goals:** buy the right 4/6/16 model with standard options.
- **Objections:** which model?, installation requirement, delivery time, warranty.
- **Conversion:** cart → order → staff confirmation.

### P6 — Existing customer (service)
- **Goals:** report an issue, see warranty status, track repair.
- **PV:** current off-site support path (G-1).
- **CR:** verified portal.

## 5. Sales motions
| Motion | Segment | Path | Owner | Stage |
|---|---|---|---|---|
| Enterprise project | P1, P2 | RFQ → qualification → engineering review → consultation → (paid survey) → proposal versions → negotiation → contract → handoff | Engineer + owner | PV |
| Partner | P2, P3 | Partner inquiry → eligibility → private terms → orders/RFQs | Owner | PV (inquiry), CR (terms) |
| Consultative B2C | P4 | Consultation → scoping → proposal → contract | Engineer | PV |
| Retail | P5 | Store → staff-confirmed order | Store operator | CR |
| Service | P6 | Off-site (PV) → portal (CR) | Service engineer | PV/CR |

## 6. Journey maps (key steps, failure points, safeguards)
### J1 Developer (P1)
| Step | Touchpoint | Failure point | Safeguard |
|---|---|---|---|
| Discover | Search / referral → `/en/business/developers` | Generic copy, no proof | Multi-unit process page, consented project or honest process story |
| Evaluate | Projects, Technology | Unverified claims | Claim registry gates (doc 11) |
| Request | RFQ (P-B) or contact (P-A) | Long form, upload anxiety | Short step 1, optional files, privacy notice |
| Response | Engineer triage | Slow response, lost lead | SLA dashboard, acknowledgement |
| Proposal | Versions | Scope creep | Versioned proposals, exclusions |
| Contract | Signature | Attribution lost | Opportunity-level class frozen at signature |

### J4 Homeowner (P4)
Solutions → scenario page → consultation form → call → scope → proposal. **Failure:** expecting voice control during internet outages. **Safeguard:** local/cloud explanation (doc 11).

### J5 Retail (P5, CR)
Product compare → configure standard options → cart → submit → staff confirmation (verification + stock) → payment verification → fulfilment → (installation/commissioning) → device registration → portal.

## 7. Scenario walkthroughs (**ILLUSTRATIVE ONLY: quantities and budgets are not company facts**)
### S1 — 100-unit residential development (illustrative)
1. A developer's procurement lead lands on `/en/business/developers` from a search. UTM/referrer are captured with consent.
2. They submit an RFQ: 100 apartments, construction stage "structure complete", requested systems lighting + climate + scenes, engagement "supply + installation + programming", timeline 9–12 months, budget band "undisclosed". (P-B: a PDF floor-plan typology is uploaded and quarantined until scanned.)
3. Triage (engineer): legitimacy check, region within installation coverage? (capacity unknown, OPEN). Advisory score recorded. → `QUALIFIED`.
4. Engineering review: typical unit = e.g. 3 bedrooms. Circuits estimated per typology. Controller mix (illustrative: 6CH per bedroom zone, 16CH per main panel). **Engineers decide. The website does not compute it.**
5. Free consultation call → paid site survey agreed (fee per policy, OPEN).
6. Proposal v1 (per-unit price × 100 + commissioning + documentation). Negotiation → v2 with a phased rollout.
7. Signed master agreement + building-phase contracts: count rule per doc 07 (master/child, OPEN finance).
8. Attribution: `WEBSITE_SOURCED` (the RFQ is the earliest evidenced origin). Cohort `NEW` (no prior contract).
9. Handoff → manual ClickUp summary. Capacity flag raised if the installation windows overlap.

### S2 — Homeowner bespoke Alexa integration (illustrative)
1. A homeowner reads `/en/solutions/smart-scenes` and the integration page stating "voice control through Alexa requires internet".
2. Books a free consultation (no files).
3. The call reveals garage-door + lighting scenes. The engineer explains the safety requirement: garage motion is authorised locally, with manual override and safety sensors as primary protection.
4. Paid survey → proposal including custom integration (quote-only line) → signed.
5. Attribution: if they first called after seeing an Instagram ad and only later booked through the site, the earliest origin is non-website → `WEBSITE_ASSISTED` only if the consultation booking through the site is documented (qualifying contribution).

## 8. Stage-specific success measures (proposed, targets OPEN)
| Stage | Leading indicators | Lagging indicators |
|---|---|---|
| PV | Qualified RFQs/consultations per month, first-response time, % of RFQs with complete step 1, consented case studies live | Website-sourced signed value (lag 3–9 months) |
| CR | Order confirmation time, payment verification time, oversell incidents (target 0), portal registrations, ticket first-response | Retail revenue, warranty claim resolution time |

## Sign-off (Wave 2b)
≥ 4 personas ✅ (6) · Objective → outcome mapping ✅ · Scenarios labelled illustrative ✅

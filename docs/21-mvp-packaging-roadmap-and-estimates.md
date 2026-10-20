# MVP Packaging, Roadmap and Estimates

| Doc ID | OTONOM-DOC-21 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. **Estimates low confidence (±40 %)** |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Explicit launch definitions, the staged roadmap, dependencies, and rough estimates. **Nothing beyond Stage 0 is authorised.**

## 2. Estimation basis
- One developer, full-time, using AI coding agents. AI does **not** multiply capacity automatically: review, testing and decisions remain human-bound.
- Excludes content production, photography, legal drafting, and waiting on owner decisions.
- Assumes the spike passes with candidate A. Fallback to D adds about 3–6 weeks (CMS/admin build).
- The earlier v1 numbers (MVP-A 9–13, MVP-B 6–9, MVP-C 5–8 weeks) are treated as historic and unverified. They are re-cut below by stage.

## 3. Stages
| Stage | Outcome | Estimate | Exit criteria | Authorisation |
|---|---|---|---|---|
| 0 Planning (current) | This documentation pack | Done (this session) | Owner review | ✅ Authorised |
| 1 Spike | Validate the architecture against V-1…V-7 | 3–5 days | PASS/FAIL report | ❌ Separate approval |
| 2 Domain foundation | Identity/RBAC, schema + migrations, validation/error conventions, i18n routing, CMS contracts, audit, base UX components | 3–5 weeks | Access, review status, localization, audit, integrity tests pass | ❌ |
| 3 B2B conversion core | Public pages, case studies with evidence/consent, RFQ + secure files, Projects workspace, proposals/contracts, attribution + exec/attribution dashboards | 6–9 weeks | Synthetic RFQ → signed contract → reconciled KPI. No document leakage | ❌ |
| 4 Catalogue & orders | 4/6/16 catalogue, options, cart/order, quote path, manual payments, reservations, serial allocation, Store workspace | 6–9 weeks | Concurrency, payment verification, cancel reversal, ledger accuracy, serial traceability | ❌ |
| 5 Warranty & after-sales | Ownership verification, commissioning capture, policy-driven coverage, tickets, RMA, customer progress | 4–7 weeks | Privacy, truthful dates, lineage, role checks | ❌ |
| 6 Hardening | A11y, SEO, performance, threat remediation, legal content, runbooks, monitoring, restore rehearsal, content import | 3–5 weeks | Release candidate meets thresholds. **Not deployed** | ❌ |
| 7 Railway deployment | Provisioning, deploy, smoke tests, domain, backups, monitoring | — | — | ❌ **DEFERRED / prohibited** |
| 8 Enhancements | 3D/2D, simulator, partner portal, ClickUp sync, gateway, configurator, marketplace, IoT control (separate charter) | — | — | ❌ DEFERRED |

**Totals (rough):**
- Stages 1–6 ≈ **23–36 weeks** for one developer.
- Path to an M2 preview (Stages 1–3 + a subset of 6) ≈ **11–17 weeks**.

## 4. Packaging options (owner decision DR-041)
| Plan | Definition | First public release contains | Time to first public release (rough) | Risk | Requirement fidelity |
|---|---|---|---|---|---|
| **M1** Complete commercial launch | Everything P0 ships together | Site + CMS + RFQ/CRM/attribution + store/inventory/serials + **real warranty portal (W1)** | ~23–36 wks | Large release, content readiness | ✅ Full |
| **M2** Phased with explicit terminology | (a) **Public Lead-Generation Preview**: marketing, projects, RFQ, consultation, basic analytics. **No** shop/warranty claims. (b) **Commercial Store Launch**: catalogue + orders + inventory + policies + **minimal real warranty portal** (checkout withheld until the portal is ready). (c) Enhancements | Preview only | ~11–17 wks to preview. ~23–36 to commercial | Confusing "launch" semantics if not labelled | ✅ if (b) includes the portal |
| **M3** Legacy bridge (exception) | Site collects leads and maybe request-only products. Orders and warranty handled entirely outside the site for a period | Preview + request-only shop | ~11–17 wks | **Diverges** from the first-launch portal requirement | ❌ Exception, needs explicit approval |

**Recommendation:** **M2 with W1 inside the Commercial Store Launch.** The B2B preview creates value early. The "first commercial launch" (orders and products) still includes a genuine warranty portal. The preview must never be presented as the full commercial launch. If the owner considers the preview itself the "first launch", choose M1.

## 5. Feature priority and dependencies
| Pri | Feature | Depends on | Approval / evidence condition |
|---|---|---|---|
| P0 | Bilingual corporate pages | Brand files, approved copy | Editorial approval |
| P0 | Developer/contractor pages | Delivery model | Capacity proof |
| P0 | RFQ + secure files | Threat model, storage | DR-047, privacy notice |
| P0 | Projects workspace | Workflow owners | Internal roles |
| P0 | Contracts/opportunities | Financial rules | DR-045 |
| P0 | Attribution dashboard | KPI dictionary | DR-007, DR-045 |
| P0 | Real projects/testimonials | Media | Written consent (DR-032) |
| P0 | Integration page | Diagrams/tests | ENG sign-off |
| P0 | Bilingual CMS | Roles | DR-051 |
| P0 | Controller pages | Datasheets | Electrical claims validation |
| P0 | Cart + manual orders | Prices, payment instructions | Commercial policy |
| P0 | Inventory + serials | SKU + serial policy | OPS approval |
| P0 | Warranty/service portal | Duration, RMA policy | DR-024, DR-026 |
| P0 | Auth/security/audit | Threat model | Security sign-off |
| P1 | Enhanced integration demos/video | Rights, performance | Content approval |
| P2 | 3D/2D | Assets, budget, usage proof | Scope approval |
| Future | Marketplace, gateway, web device control | Business case | Separate charter |

## 6. Critical path
Owner decisions (DR-007, DR-041) → spike approval + PostgreSQL → Stage 2 → Stage 3 (needs consent, brand, evidence) → Stage 4 (needs prices, SKUs, tariff, policies, datasheets) → Stage 5 (needs the warranty policy and RMA SOP) → Stage 6 → [deployment gate].
The longest external dependencies are likely **written consent, the warranty policy and the price list**, not code.

## 7. Top delivery risks
See doc 23. Most material: late owner inputs, Arabic copy quality, solo-operator bottleneck, spike failure, and scope creep into 3D/marketplace.

## Change log
2.0-draft, 2026-10-13: stages 0–8 and M1/M2/M3. Replaces the archived v1 MVP-A/B/C.

## Next review decision
The owner chooses M1/M2/M3 and W1/W2 (D-Q2).

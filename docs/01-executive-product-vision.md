# Executive Product Vision

| Doc ID | OTONOM-DOC-01 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

**Source tags:**
- `[APR]` recorded as APPROVED in master prompt v2
- `[CBU]` CONFIRMED_BY_USER (user-stated, not independently verified)
- `[PRO]` agent proposal
- `[OPN]` open
- `[BLK]` blocked
- `[DEF]` deferred

## 1. Purpose and scope
States why the website exists, for whom, and how success is judged. It is the anchor for the PRD (doc 03) and the roadmap (doc 21).

## 2. Problem
OTONOM builds its own smart relay controllers and delivers integrated Smart Home projects in Egypt `[CBU]`. Its highest-value buyers (developers, compounds, contractors) need **evidence** before they shortlist a vendor. That evidence includes real installations, engineering documentation, a repeatable commissioning process, and long-term support. A generic brochure site or a retail-only storefront does not create that trust, and neither captures B2B project demand in a measurable way.

## 3. Product statement
A bilingual (AR/EN) commercial platform that:
1. **proves** OTONOM's integration capability with verified projects and documented engineering,
2. **converts** high-value B2B demand through a structured, secure RFQ and an internal sales pipeline,
3. **sells** standard 4/6/16-channel controllers with honest pricing and manual payment handling,
4. **supports** customers after the sale with verified device ownership, warranty records and service/RMA workflows,
5. **measures** what matters: website-influenced signed contract value, without double counting.

## 4. Positioning `[APR]`
Premium, reliable, technically distinctive, good value. The **proof** is real integration, engineering documentation, customer outcomes, installation expertise and after-sales service.

Never use:
- superlatives such as "No.1 in Egypt"
- certification claims without certificates
- implied "cheapness"

Smart Home stays the core story. ERP, software and PCB services are secondary, if they appear at all.

## 5. Target segments
| Priority | Segment | Primary conversion |
|---|---|---|
| P1 | Property developers, residential compounds, multi-unit projects `[APR]` | Project RFQ → consultation → proposal → signed contract |
| P1 | Electrical / finishing contractors, consultants, approved partners `[APR]` | Partner inquiry → eligibility → supply/integration agreement |
| P2 | Villa / apartment owners | Consultation request → scoped proposal |
| P2 | Existing OTONOM customers | Service/warranty, new contracts |
| P3 | Retail controller buyers / installers | Cart → staff-confirmed order |

Market: **Egypt first** `[APR]`. Gulf is a possible later market, **not** a launch claim.

## 6. Business objective and metrics `[APR]` + `[OPN]`
- Objective: **maximise the value of signed contracts influenced by the website.**
- Scope: all eligible **new** contracts with **new and existing** customers. Cohorts are reportable separately.
- `WEBSITE_SOURCED` and `WEBSITE_ASSISTED` are distinct and mutually exclusive per contract. No double counting.
- **North Star exact selection: OPEN.** The agent's recommendation is in doc 09 §6.
- Guardrails: estimated gross margin and delivery capacity sit alongside value, so the site does not "win" unprofitable or undeliverable work.
- Anti-goals: optimising for visitors, raw lead counts, or low-value orders.

## 7. Product principles (adopted from master prompt §3.1 as working principles)
1. Evidence before marketing claims.
2. Enterprise trust before decoration.
3. Signed-value outcomes before vanity traffic.
4. Devices, services, projects and warranty are modelled separately.
5. Operational integrity before flashy automation.
6. Humans approve engineering, pricing, publication and sensitive state changes.
7. Mobile performance, accessibility, bilingual parity and security are baseline requirements.
8. Dependable commercial core first. 3D and marketplace later.
9. The public website never controls IoT devices.
10. Modular enough to grow, simple enough for one owner plus AI agents.

## 8. Constraints
| Constraint | Source |
|---|---|
| Solo developer + AI coding agents | `[APR]` master prompt §1.1 |
| No fixed deadline. Quality over date | `[CBU]` §2.4 |
| Railway is the future host. Deployment not authorised | `[APR]` |
| Git/GitHub out of scope for now | `[APR]` for this session |
| Bilingual AR/EN at launch | `[APR]` |
| Warranty & service portal required **at first commercial launch** | `[APR]` (packaging decision OPEN, doc 21) |
| One admin initially, with RBAC-ready design | `[CBU]` |
| Manual payments (bank, wallet, COD). Gateway deferred | `[APR]` / `[DEF]` |
| ClickUp automation deferred. Manual handoff | `[APR]` |

## 9. Out of scope for the first commercial launch `[DEF]`
3D house / 2D explorer · smart-scene simulator · payment gateway · ClickUp sync · marketplace · web IoT control · full configurator · broad distributor portal.

## 10. What success looks like (proposed launch-quality definition) `[PRO]`
- A qualified developer can understand OTONOM's scope and submit an RFQ with drawings in a few minutes on mobile, and nothing private leaks.
- Staff can trace any reported signed-value number down to contract IDs and their attribution evidence.
- A retail order can't oversell stock, and a payment can't be marked verified without staff confirmation.
- A customer sees only their own devices and never sees an invented warranty end date.
- Every public technical claim links to reviewed evidence.

## 11. Dependencies, risks, owner
- Owner: OTONOM business owner (product decisions).
- Agent: documentation.
- Key risks are in doc 23: unverified claims, content-permission delays, capacity limits, solo-operator bottleneck.

## Change log
2.0-draft, 2026-10-13: first version under master prompt v2.

## Next review decision
The owner confirms the positioning and segment priority, and answers the North Star question (doc 27).

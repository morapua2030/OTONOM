# Consolidated Discovery Facts and Source-of-Truth Ledger

| Doc ID | OTONOM-DOC-02 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
This document classifies every input fact by source and confidence. It also lists the contradictions, so that later agents don't mistake a proposal for an approval.

**Limitation:** the raw transcripts of the "ten discovery rounds" are **not available** in this environment. This ledger is built from the consolidation in master prompt v2 §2.4 and Part XIII, the earlier kickoff prompt, and the v1 docs (archived). Where a fact came only through the consolidation, it is tagged with the status the master prompt gave it.

## 2. Classification scheme
| Category | Meaning |
|---|---|
| `APPROVED` | Recorded as an approved owner decision in master prompt v2 |
| `CONFIRMED_BY_USER` | The owner reported it as fact. **Not independently verified** |
| `FOUND_IN_DOCUMENT` | Present in a supplied document (here: only the two prompts) |
| `VERIFIED_BY_AGENT` | The agent observed it with tools in this session |
| `PROPOSED` | Agent or previous-assistant suggestion. Not approved |
| `OPEN` | Undecided |
| `BLOCKED` | Cannot proceed without a missing approval or evidence |
| `DEFERRED` | Intentionally postponed |

## 3. Ledger
### 3.1 Company, market, positioning
| # | Fact | Category | Confidence | Notes |
|---|---|---|---|---|
| F-01 | OTONOM is an Egypt-based Smart Home company with proprietary relay controllers and custom integration | APPROVED (identity) / CBU (capabilities) | High | — |
| F-02 | Egypt first. Gulf possible later, not a launch claim | APPROVED | High | DR-002 |
| F-03 | Primary B2B: developers, compounds, multi-unit, contractors, partners | APPROVED | High | DR-003 |
| F-04 | Positioning: premium, reliable, distinctive, good value. No unverified superiority | APPROVED | High | — |
| F-05 | Other services (ERP/PCB/IoT engineering) secondary at most | APPROVED | High | — |
| F-06 | No imposed deadline. Quality first | CBU | High | — |

### 3.2 Products and technology
| # | Fact | Category | Confidence | Notes |
|---|---|---|---|---|
| F-10 | Controller models: 4, 6, 16 relay channels | CBU | High (existence) | Ratings unverified, datasheets needed |
| F-11 | Wi-Fi + Bluetooth-assisted onboarding + mobile app control | CBU | Medium | — |
| F-12 | Some local control works without internet | CBU | **Low on scope** | Exact flows must be tested (doc 15) |
| F-13 | Integrations tested with Alexa, Google Home, Apple Home, Home Assistant | CBU | Medium | **No certification claimed or verified** |
| F-14 | Apartment project demonstrated doors/garage, TV, multi-zone audio, lighting, HVAC, gas/alarm, scenes | CBU | Medium | Project-specific, not native capabilities of every controller |
| F-15 | Real footage exists for the apartment subsystems | CBU | Medium | Not reviewed |
| F-16 | Technical diagrams, compatibility tests, quality reports, datasheets exist | CBU | Unknown | Not supplied |
| F-17 | Android/iOS apps ready but not publicly listed | CBU | High | No store badges |
| F-18 | Units carry electronically stored unique identifiers | CBU | Medium | Read method/uniqueness unknown |

### 3.3 Commerce
| # | Fact | Category | Notes |
|---|---|---|---|
| F-20 | Direct controller sales. Base price + priced standard add-ons. Custom work by quote | APPROVED (DR-015) | Prices not provided |
| F-21 | SKU scheme not finalised | OPEN (DR-016) | — |
| F-22 | Stock tracked per SKU/model. Reservation at **staff-approved order confirmation** | APPROVED in principle (DR-017) | Transition details open |
| F-23 | Shipping fees exist | CBU (DR-019) | Fee table not provided |
| F-24 | Installation by OTONOM's internal team, priced per project. Professional electrician required | CBU (DR-020) | Capacity/coverage unknown |
| F-25 | Cart + order submission. Bank transfer, e-wallet, COD | APPROVED (DR-021) | Eligibility rules open |
| F-26 | Payment gateway not selected | DEFERRED (DR-022) | — |

### 3.4 Warranty and service
| # | Fact | Category | Notes |
|---|---|---|---|
| F-30 | Warranty starts at installation/commissioning | APPROVED in principle (DR-023) | Edge rules open |
| F-31 | Warranty duration is "more than two years" per owner. Exact term **not adopted** | BLOCKED (DR-024) | Never show an end date |
| F-32 | Warranty & service portal required **from first commercial launch** | APPROVED (DR-025) | Packaging OPEN (DR-041) |
| F-33 | RMA procedures reportedly exist | CBU (DR-026) | Not reviewed |

### 3.5 Sales, content, operations
| # | Fact | Category | Notes |
|---|---|---|---|
| F-40 | Free introductory call. Paid site survey per disclosed policy | APPROVED (DR-012) | Fee/terms open |
| F-41 | Engineers triage technical leads | CBU (DR-013) | Capacity unknown |
| F-42 | ClickUp in use. Automation deferred. Manual handoff | APPROVED (DR-035) | — |
| F-43 | CMS: all pages, portfolio, blog, media, SEO, AR/EN, Draft→Review→Publish, AI copy human-reviewed | APPROVED (DR-027) | Single-actor review exception |
| F-44 | Separate Store and Projects admin workspaces. One admin initially | APPROVED (DR-028) | — |
| F-45 | Only **verbal** consent for the apartment case study | BLOCKED (DR-032) | Written consent required |
| F-46 | Visual direction: existing OTONOM identity, Apple-like minimalism, story/case-study-led hero | APPROVED (DR-008/DR-009) | Assets not supplied |
| F-47 | Desktop 3D / mobile 2D later | DEFERRED (DR-034) | — |

### 3.6 Metrics
| # | Fact | Category |
|---|---|---|
| F-50 | Objective: maximise website-influenced signed contract value | APPROVED (DR-004) |
| F-51 | All eligible new contracts, new + existing customers, cohorts separate | APPROVED (DR-005) |
| F-52 | Sourced vs Assisted distinct, no double counting | APPROVED (DR-006) |
| F-53 | North Star: Sourced-only recommended by earlier assistants | **PROPOSED** (DR-007) |
| F-54 | Contract-value recognition (pre-tax, amendments) | PROPOSED (DR-045) |
| F-55 | Reporting currency EGP initially | APPROVED (kickoff prompt) |

### 3.7 Environment and process
| # | Fact | Category | Notes |
|---|---|---|---|
| F-60 | The owner selected Antigravity Cloud as the environment | APPROVED (DR-040) | **Contradicted by observation**, see C-08 |
| F-61 | This session runs on local Windows (Claude Code in VS Code) | VERIFIED_BY_AGENT | doc 00 |
| F-62 | Git/GitHub completely postponed | APPROVED (DR-039) | — |
| F-63 | Railway is the future host. Deployment prohibited | APPROVED (DR-038) | — |
| F-64 | A `.git` folder appeared in the workspace, not created by the agent | VERIFIED_BY_AGENT (directory listing only) | Not inspected |

## 4. Contradiction and correction register
| ID | Contradiction | Sources | Resolution status | Recommendation |
|---|---|---|---|---|
| C-01 | **Warranty portal at first launch** vs the v1 agent roadmap that deferred it to MVP-C with a "service request form" bridge | DR-025 vs archived v1 doc 14 | **Corrected:** the v1 proposal is withdrawn as a default. W1/W2 and M1/M2/M3 options are presented (docs 13, 21). Decision OPEN (DR-041) | W1/M1 for the *commercial* launch. M2 preview only if the owner explicitly names it "preview" |
| C-02 | Nationwide lead intake vs unknown installation capacity | F-24 vs F-03 | OPEN | Capture leads nationwide, but promise delivery only in confirmed zones |
| C-03 | Visible prices vs variable integration pricing | F-20 | Resolved by design: priced standard options + "quotation required" lines. A total shows "PENDING QUOTE" while any component is unresolved | — |
| C-04 | Local control claims vs cloud ecosystems (Alexa etc. need internet) | F-12/F-13 | OPEN until test evidence | Publish an exact offline-behaviour matrix (doc 15) |
| C-05 | Brand trust vs unreviewed evidence | F-16 | OPEN | Evidence-state model (doc 14 §4) |
| C-06 | Single admin vs a genuine Review step | F-43/F-44 | Documented exception | The workflow records states and actor. Separation of duties is impossible until there is a 2nd person. Weekly digest to a second owner proposed |
| C-07 | Apps "ready" vs unpublished | F-17 | Resolved: no store links until live | — |
| C-08 | Antigravity selected vs Windows observed | F-60 vs F-61 | OPEN (D-Q12) | Owner chooses the environment for future gates |
| C-09 | v1 docs proposed a GitHub repo strategy | archived v1 docs | **Superseded** by DR-039 | Archived. Not carried forward |
| C-10 | v1 used option labels A=custom, C1=Payload. v2 uses A=Payload, B=NestJS, C=commerce framework, D=lean custom | archived v1 doc 04 vs master §8 | Resolved: v2 labels used throughout | — |
| C-11 | Kickoff prompt said a confirmed order is "Reserved". The v2 checkout graph has CONFIRMED → STOCK_RESERVED as separate states | kickoff §6 vs master §5.3 | Resolved in doc 11: reservation commits **in the same transaction** as confirmation. STOCK_RESERVED is a sub-state reached atomically | — |
| C-12 | Warranty duration "more than two years" (v2) vs "not provided" (kickoff) | — | Not a contradiction: duration is still not adopted | Keep BLOCKED |

## 5. Mistaken-approval check
These items were proposed by earlier assistants and must **not** be treated as approved: Sourced-only North Star (DR-007) · Next.js + Payload 3 (DR-037) · the MVP-A/B/C split and its estimates · contract-value recognition rules (DR-045) · upload type/size limits · SLA targets · URL locale scheme · local PostgreSQL strategy.

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner corrects any mis-categorised fact, and supplies the raw discovery notes if they differ from this consolidation.

# 02 — Decision Register

Statuses: `APPROVED` · `PROPOSED` · `OPEN` · `BLOCKED` · `DEFERRED`.
Rule: nothing is `APPROVED` just because an earlier assistant proposed it. `APPROVED` here means **explicitly stated as approved in the kickoff brief supplied by the user on 2026-10-13**. The brief does not record when those approvals were originally given.

| ID | Topic | Status | Owner | Rationale / evidence | Impact | Next action | Approval ts |
|---|---|---|---|---|---|---|---|
| D-001 | Count all eligible new signed contracts, new **and** existing customers, reported as separate cohorts | APPROVED | Business owner | Kickoff brief §2 "Approved business scope" | KPI data model | Carry into doc 09 | Stated in brief (date not recorded) |
| D-002 | Sourced vs Assisted mutually exclusive per contract, no double counting | APPROVED | Business owner | Kickoff brief §2 "Approved attribution rule" | KPI data model | Carry into doc 09 | Stated in brief |
| D-003 | No deployment (Railway or other) in this phase | APPROVED (prohibition) | User | Brief §0 hard rule 1 | Process | Keep enforced | Stated in brief |
| D-004 | Bilingual AR/EN at launch with RTL/LTR | APPROVED (requirement) | Business owner | Brief §1 "must launch in Arabic and English" | Architecture, content | — | Stated in brief |
| D-005 | Railway is the intended future hosting platform | APPROVED (intent only) | User | Brief header | Hosting design | Readiness checklist (doc 13) | Stated in brief |
| D-006 | **North Star:** Website-Sourced only vs Total Influenced | OPEN | Business owner | Prior draft proposed Sourced. Not separately approved | Dashboards, incentives | Agent recommends **Sourced as North Star + Total Influenced as companion metric** (doc 09). User to decide | — |
| D-007 | Contract value accounting (pre/post tax, amendments, cancellations, multi-year, recurring, supply-only vs service) | OPEN | Finance / business owner | Brief §2 requires finance sign-off | KPI values | Finance answers Q-B3 (doc 15) | — |
| D-008 | Legal-entity matching for New vs Existing customer | OPEN | Business owner | Brief §2 | Cohort accuracy | Define matching keys (doc 09 §6) | — |
| D-009 | SKU naming, standard variants, final prices and add-ons | OPEN | Product owner | Brief §1 "not finalized" | Commerce launch | Provide catalogue sheet (doc 15) | — |
| D-010 | Order confirmation triggers per order type, reservation expiry, stock exceptions | OPEN | Operations | Brief §1 | Inventory integrity | Agent proposal in doc 08 §3, for approval | — |
| D-011 | Warranty duration, exclusions, commissioning proof | **BLOCKED** | Business / legal | Brief: "never invent it" | Warranty portal | Await approved policy document | — |
| D-012 | Shipping / returns / terms / privacy / warranty policy publication | OPEN | Legal / business | Brief §1 | Launch readiness | Draft → legal review | — |
| D-013 | Written consent to publish the apartment case study | **BLOCKED** | Business owner | Brief: verbal is not enough | Projects page content | Obtain signed consent | — |
| D-014 | Independent review of datasheets, safety/quality reports, ecosystem compatibility tests | OPEN | Engineering | Brief §1 | Claims on site | Provide evidence pack (doc 15 §E) | — |
| D-015 | Original brand assets (vector logo, colours, fonts) and usage rights | OPEN | Business owner | Not yet received | Design | Provide assets + font licences | — |
| D-016 | Hosting details: Railway region, account/workspace ownership, monthly cost target, staging vs prod | OPEN | User | Unknown | Infra plan | Answer Q-I1..I5 | — |
| D-017 | Repo owner/name/privacy/default branch + GitHub authentication | **BLOCKED** | User | Audit: active `gh` account is `morapua2030`, not `ahmedatia` | Any GitHub action | User chooses resolution path (doc 00 §4, doc 17) | — |
| D-018 | Framework / CMS / commerce stack | PROPOSED | Agent → user | Doc 04/05: Next.js + Payload CMS 3 (embedded) + PostgreSQL modular monolith, **subject to a time-boxed spike** | Everything | User approves spike | — |
| D-019 | App-store launch status of Android/iOS apps | OPEN | Business owner | Apps reported ready but unpublished | Site CTAs | Confirm timeline | — |
| D-020 | Delivery capacity, national coverage, paid site-survey process and price | OPEN | Operations | Brief §1 | RFQ qualification | Answer Q-O1..O3 | — |
| D-021 | MVP-A / MVP-B / MVP-C boundaries | PROPOSED | Agent → user | Doc 14 | Roadmap | User approves or edits | — |
| D-022 | Approval authority while there is only one admin (customisations, contract-value corrections, content publication) | OPEN | Business owner | Brief §7 | Controls / audit | Proposal: named approver list + self-approval logged with reason (doc 10 §6) | — |
| D-023 | Upload file types, limits, CAD policy, retention | PROPOSED | Agent → user | Doc 07 §5 | Security | User approves | — |
| D-024 | URL scheme `/ar` and `/en` (no default unprefixed locale) | PROPOSED | Agent | Doc 11 | SEO | User approves | — |
| D-025 | Reporting currency EGP. Original currency + FX preserved | APPROVED (initial) | Business owner | Brief §2 "Reporting currency initially EGP" | Data model | — | Stated in brief |
| D-026 | Payment gateway | DEFERRED | — | Brief §3 | — | Revisit after MVP-B | — |
| D-027 | ClickUp API integration | DEFERRED | — | Brief §1 | — | Manual handoff only | — |
| D-028 | 3D house / 2D simulator | DEFERRED | — | Brief §1 | — | Revisit after budget/perf validation | — |
| D-029 | Marketplace, web device control, configurator | DEFERRED | — | Brief §3 | — | — | — |
| D-030 | Execution environment: local Windows laptop (Claude Code) vs Antigravity cloud | OPEN | User | Audit doc 00 §1 | Persistence, tooling | User confirms where implementation will run | — |
| D-031 | Local PostgreSQL strategy (native install on `D:` vs Docker Desktop vs CI-only) | PROPOSED | Agent → user | Audit R-3/R-4 | Integration testing | Recommend native PostgreSQL 17/18 on `D:` | — |
| D-032 | Git commit identity (`user.name`/`user.email`) for this repo | OPEN | User | Audit B-2 | Commit attribution | User provides identity | — |

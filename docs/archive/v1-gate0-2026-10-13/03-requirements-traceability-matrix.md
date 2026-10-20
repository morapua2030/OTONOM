# 03 — Requirements Traceability Matrix (RTM)

Columns: Requirement → source → design doc → proposed release (doc 14) → acceptance test IDs (doc 12) → status.
Release codes: **A** = MVP-A, **B** = MVP-B, **C** = MVP-C, **D** = deferred.

| Req ID | Summary | Source | Design doc | Release | Acceptance tests | Status |
|---|---|---|---|---|---|---|
| FR-WEB-01 | AR/EN, RTL/LTR, hreflang | Brief §1 | 11 | A | AT-I18N-01..05 | Draft |
| FR-WEB-02 | Page set | Brief §3 | 01, 11 | A | AT-WEB-01 | Draft |
| FR-WEB-03 | Homepage narrative order | Brief §1 | 11 | A | AT-WEB-02 (content review) | Draft |
| FR-WEB-04 | Brand assets | Brief §1 | 11 | A | AT-WEB-03 (design review) | Blocked on D-015 |
| FR-WEB-05 | Claims governance | Brief §1 | 11, 10 | A | AT-CMS-06 | Draft |
| FR-WEB-06 | No fake app badges | Brief §1 | 11 | A | AT-WEB-04 | Draft |
| FR-WEB-07 | Project-specific integration wording | Brief §1 | 11 | A | AT-CMS-06 | Draft |
| FR-WEB-08 | Policy pages gated by approval | Brief §1 | 11 | A | AT-CMS-07 | Blocked on D-012 |
| FR-RFQ-01 | RFQ form | Brief §1/§3 | 07 | A | AT-RFQ-01..03 | Draft |
| FR-RFQ-02 | Private secure uploads | Brief §1 | 07 §5, 10 | A | AT-RFQ-04..08, AT-SEC-04 | Draft |
| FR-RFQ-03 | Confirmation + reference | Proposal | 07 | A | AT-RFQ-09 | Draft |
| FR-RFQ-04 | Free call / paid survey | Brief §1 | 07 §4 | A | AT-RFQ-10 | Draft (price OPEN) |
| FR-RFQ-05 | Attribution capture | Brief §2 | 09 | A | AT-ATT-01..03 | Draft |
| FR-RFQ-06 | Abuse protection | Proposal | 10 | A | AT-SEC-05 | Draft |
| FR-PRJ-01 | Pipeline state machine | Brief §6 | 07 §2 | A | AT-PRJ-01..04 | Draft |
| FR-PRJ-02 | Org matching / dedupe | Brief §2/§6 | 07 §3, 09 §6 | A | AT-PRJ-05..06 | Draft |
| FR-PRJ-03 | Assignment / SLA | Brief §6 | 07 §6 | A | AT-PRJ-07 | Draft |
| FR-PRJ-04 | Proposal versions | Brief §6 | 07 §7 | A | AT-PRJ-08 | Draft |
| FR-PRJ-05 | Contract register | Brief §6 | 07 §8, 09 | A | AT-PRJ-09..10 | Draft |
| FR-PRJ-06 | Attribution classification | Brief §2 | 09 | A | AT-ATT-04..10 | Draft |
| FR-PRJ-07 | Manual ClickUp handoff | Brief §1 | 07 §9 | A | AT-PRJ-11 | Draft |
| FR-COM-01 | Catalogue | Brief §1 | 08 §1 | A (display) / B (purchase) | AT-COM-01 | Blocked on D-009 |
| FR-COM-02 | Cart + order submission | Brief §1 | 08 §2 | B | AT-COM-02..04 | Draft |
| FR-COM-03 | Manual payments | Brief §1 | 08 §5 | B | AT-COM-05..06 | Draft |
| FR-COM-04 | Ledger + reservation at confirmation | Brief §1 | 08 §3-4 | B | AT-INV-01..06 | Draft |
| FR-COM-05 | Serial traceability | Brief §1 | 08 §6 | B | AT-SER-01..04 | Draft |
| FR-COM-06 | Order tracking | Brief §3 | 08 §2 | B | AT-COM-07 | Draft |
| FR-COM-07 | Shipping / installation pricing | Brief §1 | 08 §7 | B | AT-COM-08 | Blocked on amounts |
| FR-COM-08 | Custom work via quote | Brief §1 | 08 §2 | B | AT-COM-09 | Draft |
| FR-COM-09 | Store workspace | Brief §1 | 05 §4 | B | AT-ADM-02 | Draft |
| FR-WAR-01 | Accounts + device registration | Brief §1 | 08 §8 | C (bridge form in A) | AT-WAR-01..03 | Draft |
| FR-WAR-02 | Warranty policy versioned | Brief §1 | 08 §8 | C | AT-WAR-04..05 | Blocked on D-011 |
| FR-WAR-03 | Service / RMA lifecycle | Brief §1 | 08 §9 | C (intake form in A) | AT-WAR-06..08 | Draft |
| FR-CMS-01 | Localized content | Brief §1 | 11 | A | AT-CMS-01 | Draft |
| FR-CMS-02 | Draft → Review → Publish | Brief §1 | 11 §2 | A | AT-CMS-02..03 | Draft |
| FR-CMS-03 | Case-study consent | Brief §1 | 11 §4 | A | AT-CMS-04 | Draft |
| FR-CMS-04 | SEO artefacts | Proposal | 11 §5 | A | AT-SEO-01..05 | Draft |
| FR-CMS-05 | AI copy flagged + reviewed | Brief §1 | 11 §2 | A | AT-CMS-05 | Draft |
| FR-RPT-01 | Sourced / Assisted / Total / cohorts | Brief §2 | 09 | A (v0) / C (full) | AT-ATT-11..15 | Draft |
| FR-RPT-02 | Pipeline separate | Brief §2 | 09 | A | AT-ATT-16 | Draft |
| FR-RPT-03 | Supporting KPIs | Brief §2 | 09 §8 | C | AT-ATT-17 | Draft |
| FR-RPT-04 | Drill-down traceability | Proposal | 09 | A | AT-ATT-18 | Draft |
| FR-ADM-01 | Single admin, workspaces, RBAC-ready | Brief §1 | 05 §4, 10 | A | AT-ADM-01..02 | Draft |
| FR-ADM-02 | Admin MFA | Proposal | 10 §4 | A | AT-SEC-01 | Draft (spike item) |
| FR-ADM-03 | Audit log | Brief §5 | 06 §5, 10 | A | AT-AUD-01..03 | Draft |
| NFR-PERF-01 | Core Web Vitals | Proposal | 12 | A | AT-PERF-01 | Draft |
| NFR-A11Y-01 | WCAG 2.2 AA | Proposal | 12 | A | AT-A11Y-01..02 | Draft |
| NFR-SEC-01 | ASVS L2 | Proposal | 10 | A | AT-SEC-* | Draft |
| NFR-PRIV-01 | PDPL alignment, consent | Proposal | 10 §7 | A | AT-PRIV-01..03 | Draft (legal review) |
| NFR-REL-01 | Backup + tested restore | Proposal | 13 | A (pre-launch) | AT-OPS-01 | Draft |
| NFR-OBS-01 | Observability | Proposal | 13 | A | AT-OPS-02 | Draft |
| NFR-COST-01 | Cost target | Brief §7 | 13 | — | — | OPEN |

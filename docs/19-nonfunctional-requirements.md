# Non-Functional Requirements

| Doc ID | OTONOM-DOC-19 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. Thresholds PROPOSED (DR-044 OPEN) |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Provisional, measurable NFR targets for validation. **None is a claim of achieved performance.**

## 2. Requirements
| ID | Area | Requirement (PROPOSED threshold) | Measurement | Status |
|---|---|---|---|---|
| NFR-PERF-01 | Web vitals | p75 on representative mid-range Android over 4G: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 for Home, Developers, Project, Product, RFQ | Lighthouse lab + field RUM (consented) | PROPOSED |
| NFR-PERF-02 | Page weight | Home ≤ 1.5 MB transferred on first load (excluding user-initiated video) | Lab | PROPOSED |
| NFR-PERF-03 | Media | Responsive images (AVIF/WebP), lazy-loaded video with poster and user control, no autoplay with sound, 3D only on user action | Review | PROPOSED |
| NFR-PERF-04 | API | Order confirmation p95 ≤ 500 ms at launch load. RFQ submit p95 ≤ 1 s excluding uploads | Load test (Stage 6) | PROPOSED |
| NFR-A11Y-01 | Accessibility | WCAG 2.2 AA in AR and EN | axe + manual keyboard + screen reader (NVDA/TalkBack) | PROPOSED |
| NFR-SEO-01 | SEO | SSR content for key pages. Valid hreflang/canonical. Sitemap per locale | Automated checks | PROPOSED |
| NFR-SEC-01 | Security | OWASP ASVS v4 Level 2 for admin/portal. No high/critical findings at release | Review + tests | PROPOSED |
| NFR-PRIV-01 | Privacy | PII minimisation, consent, retention schedule implemented | Review | PROPOSED (legal) |
| NFR-REL-01 | Availability | 99.5 % monthly for the public site (target, not SLA) | Uptime monitor | OPEN (cost-dependent) |
| NFR-REL-02 | Backup | DB daily automated + PITR if available. Object storage versioning for contracts/evidence | Config + **restore drill** | PROPOSED |
| NFR-REL-03 | RPO / RTO | RPO ≤ 24 h (≤ 1 h if PITR), RTO ≤ 8 h | Restore drill (OPS-AT-001) | OPEN |
| NFR-OBS-01 | Observability | Correlation ID from browser action → API → audit. Structured logs without payment proofs/drawings. Error tracking | Review | PROPOSED |
| NFR-OBS-02 | Alerts | Failed orders spike, reconciliation mismatch, 5xx rate, upload rejection spike, privileged account changes | Alert tests | PROPOSED |
| NFR-I18N-01 | Localization | 100 % key coverage for public + portal UI in both locales. CI check | Automated | PROPOSED |
| NFR-MAINT-01 | Maintainability | Strict TS, schema validation at boundaries, migrations reviewed, domain test coverage on state machines ≥ 90 % branches | CI (later) | PROPOSED |
| NFR-COST-01 | Cost | Monthly infra ceiling | — | **OPEN** (owner, D-Q13) |
| NFR-SAFE-01 | Safe failure | On transaction/validation failure: no order confirmation, no coverage creation. Customer sees an actionable status | Tests | PROPOSED |
| NFR-DATA-01 | Integrity | DB constraints + app validation. Exact money types. UTC time | Review + tests | PROPOSED |

## 3. Dependencies
Thresholds depend on hosting region/plan (DR-036), media assets, and budget. Revisit after the spike (S9) and Stage 6.

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner sets the cost ceiling. ENG confirms the thresholds after the spike.

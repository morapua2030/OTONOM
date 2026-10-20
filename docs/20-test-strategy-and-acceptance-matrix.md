# Test Strategy and Acceptance Matrix

| Doc ID | OTONOM-DOC-20 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. **All application tests: NOT RUN (no application exists)** |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Test layers, the critical acceptance matrix traced to requirements, the evidence format, go/no-go gates, and an edge-case coverage audit (master Part XVII).

## 2. Test layers (for later authorised implementation)
| Layer | Scope | Tooling (proposed) |
|---|---|---|
| Static | strict TS, lint, schema consistency, i18n key completeness | tsc, ESLint, custom i18n checker |
| Unit | pricing, RFQ transitions, attribution rules, warranty calc, serial transitions | Vitest |
| DB integration | **real PostgreSQL**: transactions, constraints, isolation, concurrency, migrations | Vitest + PostgreSQL (local native or CI service, both later) |
| API/service | auth, CSRF, permissions, file refs, idempotency, outbox | Vitest/supertest-style |
| E2E | bilingual RFQ, cart/order, quote, contract → KPI, warranty claim/ticket | Playwright (Chromium, WebKit, mobile viewport) |
| Security | cross-customer access, harmful uploads, XSS, invalid auth, rate limits | Custom suites + ZAP baseline |
| Accessibility | keyboard, contrast, form errors, RTL screen-reader spot checks | axe + manual |
| Performance | CWV on representative devices, DB load on confirmation, media weight | Lighthouse, k6 |
| Recovery | restore drill, transaction failure replay, email outage | Scripts |
| Content review | claims/consent, spec accuracy, translation correctness | Checklists (human) |

## 3. Critical acceptance matrix
| Test ID | Scenario | Required result | Req. | Status |
|---|---|---|---|---|
| RFQ-AT-001 | Valid Egyptian developer submits RFQ (AR and EN) | One request, ack, audit entry, no private leak | FR-RFQ-001/004 | NOT RUN |
| RFQ-AT-002 | Upload exceeds size / disallowed type / executable renamed `.pdf` | Rejected safely with localized feedback | FR-RFQ-003 | NOT RUN |
| RFQ-AT-003 | Another company guesses an RFQ document URL | Denied and logged | FR-RFQ-003 | NOT RUN |
| RFQ-AT-004 | Duplicate submit after timeout | Same reference returned | FR-RFQ-005 | NOT RUN |
| RFQ-AT-005 | RFQ without any upload | Fully accepted | FR-RFQ-003 | NOT RUN |
| CRM-AT-001 | RFQ → signed contract | Opportunity/proposal/contract chain traceable | FR-CRM-* | NOT RUN |
| CRM-AT-002 | Attribution changed after signing | Unauthorised rejected. Authorised audited (before/after/reason) | FR-ATT-002 | NOT RUN |
| CRM-AT-003 | Illegal state transition (e.g. TRIAGE → CONTRACT_SIGNED) | Rejected server-side | FR-CRM-001 | NOT RUN |
| CRM-AT-004 | `CONTRACT_SIGNED` without evidence/value | Rejected | FR-CRM-006 | NOT RUN |
| KPI-AT-001 | One Sourced + one Assisted contract | Each counted once in exclusive totals | FR-ATT-001 | NOT RUN |
| KPI-AT-002 | Same org, new independent contract | Existing cohort. Attribution from the new opportunity | FR-ATT-004 | NOT RUN |
| KPI-AT-003 | Amendment to a signed contract | Net adjustment per policy. Not duplicated | FR-CRM-006 | NOT RUN (policy OPEN) |
| KPI-AT-004 | Page view only | Not Assisted | FR-ATT-003 | NOT RUN |
| KPI-AT-005 | Cohort totals | New + Existing = total eligible | FR-RPT-002 | NOT RUN |
| KPI-AT-006 | All invariants on the synthetic fixture (doc 09 §11) | All hold. Drill-down matches | FR-RPT-002 | NOT RUN |
| SHOP-AT-001 | Fixed base + standard options | Correct transparent subtotal | FR-PRC-001 | NOT RUN |
| SHOP-AT-002 | Custom integration item | No final price or payment commitment | FR-PRC-001 | NOT RUN |
| SHOP-AT-003 | Transfer proof uploaded | Not PAID until staff verify | FR-PAY-001 | NOT RUN |
| SHOP-AT-004 | Client-sent price tampered | Ignored. Server re-prices | FR-ORD-001 | NOT RUN |
| SHOP-AT-005 | Unsupported shipping zone | Quote path. Never zero or invented | FR-SHP-001 | NOT RUN |
| SHOP-AT-006 | Order-status enumeration | Not possible. Rate-limited | FR-ORD-002 | NOT RUN |
| STOCK-AT-001 | Two confirmations for the last unit | Exactly one succeeds. Never negative | FR-INV-002 | NOT RUN |
| STOCK-AT-002 | Confirmation retried | No duplicate reservation or order | FR-INV-002 | NOT RUN |
| STOCK-AT-003 | Cancel after reservation | Exactly one release, traceable | FR-INV-003 | NOT RUN |
| STOCK-AT-004 | Return before QA | Not available until QA disposition | FR-INV-001 | NOT RUN |
| SERIAL-AT-001 | Duplicate serial | Rejected/quarantined | FR-SER-001 | NOT RUN |
| SERIAL-AT-002 | Installed unit enters service | Full lineage proven | FR-SER-003 | NOT RUN |
| WAR-AT-001 | Stranger enters someone's serial | No private data. Claim requires verification | FR-WAR-001 | NOT RUN |
| WAR-AT-002 | Duration unapproved | No fabricated expiry | FR-WAR-003 | NOT RUN |
| WAR-AT-003 | Device replaced | Old/new lineage traceable | FR-SVC-002 | NOT RUN |
| WAR-AT-004 | Staff-only diagnosis | Hidden from the customer | FR-SVC-003 | NOT RUN |
| CMS-AT-001 | Editor saves draft | Public serves the last published version | FR-CMS-002 | NOT RUN |
| CMS-AT-002 | AR + EN release | Routes, metadata, forms, direction correct | FR-WEB-001 | NOT RUN |
| CMS-AT-003 | Case study with verbal consent only | Publication blocked | FR-CMS-003 | NOT RUN |
| CMS-AT-004 | Claim with USER_STATED evidence | Publication blocked | FR-CMS-003 | NOT RUN |
| SEC-AT-001 | Customer accesses a foreign order/RFQ/ticket | Denied on the server | FR-IAM-001 | NOT RUN |
| SEC-AT-002 | Admin changes a contract total | Old/new, actor, reason, timestamp kept | FR-AUD-001 | NOT RUN |
| SEC-AT-003…009 | Brute force, XSS, CSRF, SQLi, leakage, DoS limits, staff over-access | Mitigations effective (doc 18) | NFR-SEC-01 | NOT RUN |
| SEO-AT-001 | Localized canonical/hreflang | Valid and consistent | NFR-SEO-01 | NOT RUN |
| SEO-AT-002 | Private/staging URLs | Not indexable, access-controlled | FR-CMS (SEO) | NOT RUN |
| PERF-AT-001 | Mobile visit to Home | Meets approved budgets. 3D not required | NFR-PERF-01 | NOT RUN |
| A11Y-AT-001 | Keyboard-only RFQ + checkout, both locales | Completable. Errors announced | NFR-A11Y-01 | NOT RUN |
| OPS-AT-001 | Restore from backup | Consistent data after restore | NFR-REL-02 | NOT RUN |

Any failed **mandatory** test blocks release of that feature. A happy-path UI is not completion.

## 4. Evidence-of-completion format
Requirement IDs · test IDs · reproducible workspace state/version · dependencies · command/method · expected vs actual · date/time and environment · sanitised logs/screenshot references · defects + severity · `PASS`/`FAIL`/`BLOCKED`/`NOT RUN` · reviewer + follow-ups. No manufactured screenshots or logs.

## 5. Go/no-go gates (summary)
- **Business:** prices, terms, support process, installation coverage, contract-value policy, content permissions.
- **Technical:** critical transactions and permissions pass, migration/recovery plan, AR/EN routes, mobile performance, no high-risk vulnerabilities.
- **Operational:** named owners for leads/orders/support, payment verification, escalation, warranty activation.
- **Legal/content:** warranty wording, policies, written consents, reviewed claims.
- **Deployment:** separate explicit authorisation. **Currently forbidden.**

## 6. Edge-case coverage audit (master Part XVII)
| Section | Cases | Covered | Partial | Open | Where |
|---|---|---|---|---|---|
| 17.1 B2B sales | 13 | 10 | 1 | 2 (master/child value rule. Survey fee accounting) | doc 08 §13 |
| 17.2 Commerce | 13 | 12 | 0 | 1 (COD rules engine values) | docs 10 §10, 11 §5.3, 12 §9 |
| 17.3 Warranty/service | 12 | 8 | 1 (ownership transfer) | 3 (delayed commissioning start rule, external damage policy, duration) | doc 13 §11 |
| 17.4 Content | 11 | 11 | 0 | 0 | doc 14 §9 |
| 17.5 Architecture/reliability | 12 | see below | | | |

17.5 detail:
| Case | Handling | Status |
|---|---|---|
| CMS migrations touching transaction tables | Separate schemas + write-ownership rule (doc 17 §2, §7) | COVERED (design) |
| Railway ephemeral filesystem loses uploads | Durable object storage required (doc 25) | COVERED |
| DB connection exhaustion | Pooling + limits (doc 25) | PARTIAL (values in spike) |
| Expiry job runs twice | Idempotent release (I-4) | COVERED |
| Email failure after RFQ commit | Outbox. Idempotent retry returns the same ref | COVERED |
| Analytics script fails | No dependency for RFQ/order acceptance | COVERED |
| Malicious file in media optimiser | Quarantine. No server-side processing of private files at launch | COVERED |
| Locale change during checkout | Server-side state | COVERED |
| Stale price | Re-pricing + acceptance | COVERED |
| Dashboard query timeout | "Unavailable" + timestamp, never stale-as-live | COVERED |
| Manual adjustment of a signed contract | Amendment records. Two value fields | COVERED |
| Environment mislabelled as Antigravity | Verified in doc 00 | COVERED (VERIFIED_BY_AGENT) |

## Change log
2.0-draft, 2026-10-13: created. All application tests NOT RUN.

## Next review decision
The owner accepts the matrix as the release contract. It gets extended per story in Stage 2+.

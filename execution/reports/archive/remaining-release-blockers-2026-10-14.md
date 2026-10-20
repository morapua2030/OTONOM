# Remaining Release Blockers — OTONOM Website

Status date: 2026-10-14. Current state: **local development only, synthetic data, not deployed.** The architecture is PROVISIONAL (Option A).
Nothing in this list may be resolved by the agent: each item needs an owner, legal or operations decision, an asset, or an infrastructure authorisation.

Labels: **BLOCKED** = cannot proceed without an external input. **NOT TESTED** = verification impossible locally. **PROPOSED** = an agent draft awaiting a decision.

## A. Owner / business decisions (BLOCKED)
| # | Item | Blocks | Current local behaviour |
|---|---|---|---|
| B-01 | Approve the architecture (Option A PROVISIONAL → approved) | Any non-local environment | Local development continues on Option A |
| B-02 | Controller prices, SKU scheme (DR-016 PROPOSED), shipping fees/zones | W1 store go-live (G-1) | Store endpoints return 404 in PREVIEW. SKUs are synthetic, stock is 0, there are no prices |
| B-03 | Warranty duration and terms (DR-024) | Warranty portal, CL-16 | Warranty policy rows cannot be APPROVED without a duration. The portal is gated |
| B-04 | Returns/refund policy (Consumer Protection Law 181/2018 review) | Checkout | Checkout is gated. The policy pages are placeholders |
| B-05 | Partner/trade pricing and partner programme terms | Partner pages | Placeholder copy only |
| B-06 | Survey-fee amount and invoicing rule | Paid site survey step | Pipeline records "fee agreed" + invoice ref only. No amount is shown |
| B-07 | Cohort rule for group companies (PD-07) | KPI cohort for related organisations | Exact `organisation_ref` match only. Groups need human links |
| B-08 | Attribution override approver policy (single vs dual approval) | KPI governance | Overrides need a reason and record `single_actor`. Dual approval is optional |
| B-09 | Official brand files (logo, colours, typography) | Visual design sign-off | Placeholder tokens |
| B-10 | Real company facts, team, addresses, licences | Corporate pages | Placeholder copy marked PLACEHOLDER |

## B. Legal / compliance (BLOCKED)
| # | Item | Blocks |
|---|---|---|
| B-11 | Privacy notice (PDPL 151/2020) + data-retention schedule | Public RFQ form. Currently a placeholder link. Any public preview |
| B-12 | Terms of use, cookie notice | Public preview |
| B-13 | Written consent per case study / customer logo / photo | Publishing any case study. Enforced in code: publish is refused without a valid consent record |
| B-14 | Certification claims (CE etc.) and the "Works with" claims (CL-04..07) | Integrations page. Registry entries are not publishable until evidence is reviewed |
| B-15 | E-invoicing / tax handling for store orders | W1 commerce |

## C. Infrastructure / operations (BLOCKED or NOT TESTED)
| # | Item | Status |
|---|---|---|
| B-16 | Hosting authorisation (Railway or other), environments, domains, DNS | NOT AUTHORISED |
| B-17 | Version control (Git) for the codebase | Deferred by the owner. Code exists only on `D:\otonom` and in its ZIP backups |
| B-18 | Production PostgreSQL (managed), backups, PITR, restore drill on the target | NOT TESTED (local `pg_dump`/restore only, V-9) |
| B-19 | Object storage with private ACL + antivirus scanning for uploads | NOT TESTED. Public RFQ uploads stay disabled (variant P-A) |
| B-20 | Email provider (SPF/DKIM/DMARC) for RFQ acknowledgements and staff alerts | Not configured. No emails sent |
| B-21 | Shared rate-limit store (current limiter is in-memory, single process) | Required before multi-instance hosting |
| B-22 | Reverse-proxy trust config (`OTONOM_TRUST_PROXY`) on the real platform | Must be verified on the target |
| B-23 | Performance on Linux target (Windows numbers in V-7 are not representative) | NOT TESTED |
| B-24 | Payment gateway selection and contract (for W1 online payment) | BLOCKED. Only manual verified payments are modelled |
| B-25 | Monitoring, error tracking, uptime alerts, log retention | Not selected |
| B-26 | Upgrade-migration path test (Payload minor upgrade with data) | NOT TESTED |

## D. Quality gates still open
| # | Item | Status |
|---|---|---|
| B-27 | Human review of Arabic/RTL rendering (V-6 found 3 bidi defects, V6-D1..D3) | PENDING human review. Fixes go in shared bidi-safe components |
| B-28 | Accessibility audit (WCAG 2.2 AA) with assistive technology | Not done |
| B-29 | Admin-panel RTL/Arabic editing check by real editors | NOT TESTED |
| B-30 | Independent security review / penetration test before any public exposure | Not done |
| B-31 | Cross-system consistency (domain contract committed, CMS stage update failed) | Mitigated by ordering and a retry-safe endpoint. A reconciliation job is still to be built |
| B-32 | Copywriting in Arabic and English by a human, beyond the placeholder copy | Not done |

## E. W1 commercial scope still to build or decide
| # | Item | Status |
|---|---|---|
| B-33 | Storefront UI: product pages with approved prices, cart, checkout form | Not built. The domain order API exists behind the gate |
| B-34 | Customer accounts (registration, login, devices) | Not built. The order API currently assumes guest checkout (PROPOSED) |
| B-35 | Service tickets | Not built (gated: 404 in PREVIEW, 501 in COMMERCIAL) |
| B-36 | Confirm PROPOSED controls: four-eyes price approval, shipping "to be quoted", stock reserved at staff confirmation, one contract per opportunity | Owner confirmation needed |
| B-37 | Coverage start event (delivery / installation / commissioning) and claim triage SLA | BLOCKED (owner/legal). Coverage activation currently takes an explicit start date from staff |

**The website is not complete and not production-ready.** A public preview requires at least B-01, B-09–B-14, B-16, B-17, B-18, B-20, B-22, B-27, B-28 and B-30.

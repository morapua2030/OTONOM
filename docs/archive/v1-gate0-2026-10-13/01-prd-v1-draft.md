# 01 — PRD v1 (DRAFT)

> **Status: DRAFT — not approved.** Requirements here restate the kickoff brief and add proposals.
> Each item is tagged: **[A]** stated as approved in the brief · **[B]** stated as fact or desire in the brief, details unconfirmed · **[P]** proposal by the agent · **[O]** open decision.
> Nothing tagged [P] or [O] may be treated as approved.

## 1. Product summary
OTONOM is an Egyptian Smart Home and automation company. It builds its own smart relay controllers (4/6/16-channel) and delivers custom integration and complete Smart Home projects. The website must:
1. establish technical credibility,
2. win high-value B2B projects (primary),
3. sell controllers directly (secondary), and
4. support customers after the sale (warranty and service).

Identity: **OTONOM Smart Home Systems / Advanced Integration / Custom Automation** [B]. ERP, software and PCB activities stay secondary [B].

## 2. Goals and success metrics
- Commercial KPI framework: see `09-kpi-attribution-spec.md`.
  - **[A]** Count all eligible new signed contracts, for new and existing customers, with the two cohorts reported separately.
  - **[A]** `Website-Sourced` and `Website-Assisted` are mutually exclusive per contract, with no double counting.
  - **[O]** North Star choice: Sourced alone vs Total Influenced. Recommendation in doc 09.
- Supporting [P]: RFQ→qualified rate, proposal→signed rate, average signed contract value, sales cycle length, attribution coverage %, estimated gross margin, capacity utilisation.
- Site quality [P]: Core Web Vitals "good" at p75 on mobile, WCAG 2.2 AA, full AR/EN parity on launch pages.

## 3. Audiences and personas
| Persona | Priority | Primary need | Primary conversion |
|---|---|---|---|
| Real-estate developer / compound developer | P1 [B] | Credible partner for multi-unit rollout, references, capacity | Project RFQ |
| Electrical / finishing contractor | P1 [B] | Reliable hardware + integration support, partner terms | Project RFQ / partner inquiry |
| Integration partner | P1 [B] | Technical depth, integration options | Partner inquiry |
| Villa / apartment owner | P2 [B] | Trustworthy solution, showcase, price clarity | Consultation request / RFQ / shop |
| DIY / installer buying controllers | P3 [B] | Product specs, price, delivery | Cart → order |
| Existing customer | P2 [B] | Warranty status, service, RMA | Service request |
| OTONOM admin/engineer (internal) | — | Triage, quote, track, report | Internal workspace |

## 4. Market and brand constraints
- Egypt first. Gulf expansion possible later [B]. Currency EGP at launch [B].
- Positioning: premium but accessible. No unsupported superlatives [B].
- Visual: clean, restrained, minimal, Apple-like. Keep the existing vector logo, colours and fonts [B]. Brand assets have not been received yet [O].
- **Arabic and English at launch, with correct RTL/LTR** [A/B].
- The homepage tells the story, then shows executed projects, integration depth and trust, and only then retail products [B].

## 5. Functional requirements

### 5.1 Public website (WEB)
| ID | Requirement | Tag |
|---|---|---|
| FR-WEB-01 | AR/EN locales with locale-prefixed URLs (`/ar/...`, `/en/...`), `dir` switching, `hreflang`, language switcher that keeps the equivalent page | B + P (URL scheme) |
| FR-WEB-02 | Pages: Home, About, Solutions, Developers & Contractors, Projects/Case Studies, Technology & Integrations, Shop, Support, Contact/Consultation, Insights (blog) | B |
| FR-WEB-03 | Homepage narrative order: story → projects → integration depth → trust → products | B |
| FR-WEB-04 | Brand system uses OTONOM's original logo, colours and fonts (pending asset delivery and rights confirmation) | B / O |
| FR-WEB-05 | **Claims governance:** compatibility (Alexa, Apple Home, Google Home, Home Assistant), safety, local-operation and performance claims are publishable only when linked to an approved evidence record. "Certified" wording is forbidden unless a certificate exists | B + P |
| FR-WEB-06 | No app-store badges or download links until the apps are actually published | B |
| FR-WEB-07 | Project demonstrations (doors/garage, TV, audio, lighting, HVAC, gas/alarm, scenes) are described as **project-specific integrations**, never as native capabilities of every controller | B |
| FR-WEB-08 | Policy pages (shipping, returns, privacy, terms, warranty) are published only after business/legal approval. Until then they are hidden, or shown with "under preparation" plus a contact route | B + P |

### 5.2 B2B RFQ (RFQ) — see doc 07
| ID | Requirement | Tag |
|---|---|---|
| FR-RFQ-01 | RFQ form: requester and organisation, role, project type, number of units, region/governorate, requirements, optional budget band, optional timeline, preferred contact channel, consent checkboxes | B |
| FR-RFQ-02 | Engineering file upload (PDF, images, CAD) to **private** storage, with type and size validation, a malware-scanning strategy, signed short-lived access, and a retention policy. Never public | B |
| FR-RFQ-03 | Confirmation screen + email with a human-readable reference (e.g. `RFQ-2026-000123`) | P |
| FR-RFQ-04 | Request a free introductory call. A paid on-site survey is offered by agreement only (price/invoicing OPEN) | B |
| FR-RFQ-05 | Attribution capture: first-touch landing page, referrer, UTMs, timestamps, all consent-aware | B + P |
| FR-RFQ-06 | Abuse protection: rate limiting, bot challenge (e.g. Cloudflare Turnstile), honeypot, server-side validation | P |

### 5.3 Projects workspace (PRJ) — internal
| ID | Requirement | Tag |
|---|---|---|
| FR-PRJ-01 | RFQ inbox and opportunity pipeline with the state machine in doc 07 | B |
| FR-PRJ-02 | Organisation/contact matching and duplicate detection, with a merge audit trail | B |
| FR-PRJ-03 | Engineer assignment, internal notes, SLA timers (targets OPEN) | B + P |
| FR-PRJ-04 | Versioned proposals with an approval record | B |
| FR-PRJ-05 | Contract register: contract ID, signature evidence, value, currency, amendments, cancellations | B |
| FR-PRJ-06 | Attribution classification at opportunity level, carried to contracts. Manual overrides require a reason and are audited | A + B |
| FR-PRJ-07 | Manual ClickUp handoff: a copyable structured summary. **No API integration in MVP** | B |

### 5.4 Commerce (COM) — see doc 08
| ID | Requirement | Tag |
|---|---|---|
| FR-COM-01 | Catalogue: 4/6/16-channel controllers, standard variants and priced options (SKUs and prices **OPEN**) | B / O |
| FR-COM-02 | Cart and order submission (guest checkout vs account: OPEN, proposal = guest + optional account) | B / P |
| FR-COM-03 | Manual payments: cash on delivery, bank transfer, e-wallet (providers OPEN). Optional payment-proof upload and admin verification. No gateway | B |
| FR-COM-04 | Inventory per model/variant via an append-only ledger. **Stock is reserved at order confirmation**, not at cart | B |
| FR-COM-05 | Serial numbers assigned at fulfilment, traceable through installation, warranty and RMA | B |
| FR-COM-06 | Customer order tracking (reference + email/phone verification, or account) | B |
| FR-COM-07 | Shipping fees by zone/rule (amounts OPEN). Installation is quoted per project, never auto-priced | B |
| FR-COM-08 | Custom firmware or integration requests go through engineer review and a quote, never direct checkout | B |
| FR-COM-09 | Store workspace kept separate from the Projects workspace, with shared identity | B |

### 5.5 Warranty and service (WAR) — see doc 08
| ID | Requirement | Tag |
|---|---|---|
| FR-WAR-01 | Customer account. Device registration by serial number, linked to an order or project | B |
| FR-WAR-02 | Warranty start = installation/commissioning date. Duration comes from a **versioned policy (duration BLOCKED until approved)** | B / O |
| FR-WAR-03 | Service request / RMA intake and lifecycle (intake → diagnosis → repair/replace → closure → escalation) | B |

### 5.6 CMS (CMS) — see doc 11
| ID | Requirement | Tag |
|---|---|---|
| FR-CMS-01 | Localized pages, projects/case studies, blog, media, SEO metadata | B |
| FR-CMS-02 | Draft → Review → Publish with revision history and rollback | B |
| FR-CMS-03 | Case studies require a **written publication consent** record (document upload + scope) before publishing | B |
| FR-CMS-04 | Sitemap, canonical URLs, `hreflang`, Open Graph, JSON-LD structured data | P |
| FR-CMS-05 | AI-assisted copy is flagged and needs human review before publishing | B |

### 5.7 Reporting (RPT) — see doc 09
| ID | Requirement | Tag |
|---|---|---|
| FR-RPT-01 | Report Website-Sourced, Website-Assisted and Total Website-Influenced signed contract value, sliced by New/Existing customer. Deduplicated by contract ID | A |
| FR-RPT-02 | Qualified pipeline value is shown separately and never added to signed value | A |
| FR-RPT-03 | Supporting KPIs as listed in §2 | B |
| FR-RPT-04 | Every reported number can be traced to the underlying records (drill-down + audit trail) | P |

### 5.8 Administration (ADM)
| ID | Requirement | Tag |
|---|---|---|
| FR-ADM-01 | One admin initially, with distinct Store and Projects workspace navigation. The data model supports future granular RBAC | B |
| FR-ADM-02 | MFA required for admin accounts | P |
| FR-ADM-03 | Immutable audit log for attribution, stock, contract, warranty, publication and permission events | B + P |

## 6. Non-functional requirements [P]
| ID | Requirement |
|---|---|
| NFR-PERF-01 | Core Web Vitals at p75 mobile: LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on public pages |
| NFR-A11Y-01 | WCAG 2.2 AA on public pages, forms and the customer portal, in both directions |
| NFR-SEO-01 | Server-rendered public pages, clean localized slugs, sitemap per locale, structured data |
| NFR-SEC-01 | OWASP ASVS v4 Level 2 as the baseline for admin and portal. OWASP Top 10 coverage in tests |
| NFR-PRIV-01 | Alignment with Egypt's Personal Data Protection Law No. 151/2020 (legal counsel to confirm current obligations). Consent-aware analytics |
| NFR-REL-01 | Daily backups with a documented and **tested** restore. Proposed RPO ≤ 24 h, RTO ≤ 8 h (OPEN) |
| NFR-OBS-01 | Structured logs, error tracking, uptime/health checks, audit trail |
| NFR-MAINT-01 | Strict TypeScript, versioned migrations, automated tests, ADRs for significant decisions |
| NFR-COST-01 | Monthly infrastructure cost target (**OPEN**) |
| NFR-I18N-01 | Arabic typography (font with Arabic + Latin coverage), Eastern/Western numerals policy (OPEN), bidi-safe rendering of mixed content (SKUs, phone numbers) |

## 7. Out of scope for the MVP [B]
Railway production deployment (until approved) · automatic ClickUp integration · payment gateway/card processing · full 3D house / 2D simulator · multi-vendor marketplace · device control from the web · automated configurator · a broad distributor portal (only a basic partner inquiry flow).

## 8. Key assumptions to validate
1. A single developer plus AI coding agents builds and maintains the platform.
2. Order volume is low at launch (tens per month, not thousands). Manual payment verification is acceptable.
3. One admin user at launch. Engineers may later need their own accounts.
4. Customers mostly use mobile. Arabic is the primary language for retail, while B2B audiences use both languages.

## 9. Open items
See `02-decision-register.md` and `15-open-questions-and-evidence-request.md`.

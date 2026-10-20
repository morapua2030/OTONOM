# 19 — Epics, Stories, Dependencies and Effort

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. **Estimates are ranges with low confidence. Not commitments** |
|---|---|---|---|---|---|---|---|

## 1. Sizing scale (ideal developer-days, unassisted-equivalent)
| Size | Range |
|---|---|
| S | 1–3 d |
| M | 3–6 d |
| L | 6–10 d |

Stack-dependent stories carry extra uncertainty until ADR-01 is decided.

## 2. Epics and stories
Format per story: title — role/value — acceptance pointer — dependencies — risk — size.

### E01 Platform foundation (B2) — 28–56 d
| ID | Story | Acceptance | Deps | Risk | Size |
|---|---|---|---|---|---|
| E01-S1 | Project configuration and environments (local/staging) — Eng: a reproducible base | Builds locally. Env config documented | ADR-01, install approval | M | S |
| E01-S2 | Identity + RBAC (Owner/Admin/Engineer/Store/Editor/Customer) — Owner: least privilege | T-SEC role matrix | E01-S1 | H | M |
| E01-S3 | MFA for privileged roles — Owner: account safety | Doc 16 V-5 | E01-S2 | H | M |
| E01-S4 | Locale routing `/ar` `/en`, `hreflang`, switcher — Visitors: language parity | T-SEO-01, IA-AC-01 | E01-S1 | M | M |
| E01-S5 | Design tokens + base components (RTL-aware) — all | 360 px, a11y checks | Brand assets (else neutral tokens) | M | L |
| E01-S6 | Audit log (append-only) — Owner: traceability | T-AUD-01 | E01-S1 | M | S |
| E01-S7 | File storage service + quarantine + signed URLs — Eng: safe files | V-3, T-RFQ-06/07 | Storage decision | H | L |
| E01-S8 | Outbox + email notifications (AR/EN templates) — Customers: reliable messages | T-OPS-02 | Email provider choice | M | S |
| E01-S9 | Stage feature flags (PV/CR), server-side — Owner: G-1 enforcement | T-PV-01/02 | E01-S2 | H | S |
| E01-S10 | Logging, error tracking, health/ready endpoints — Eng: operability | V-7 measurements | E01-S1 | M | M |

### E02 CMS and content governance — 23–44 d
| ID | Story | Acceptance | Deps | Risk | Size |
|---|---|---|---|---|---|
| E02-S1 | Content types + block library | Doc 10 §1 | E01 | M | L |
| E02-S2 | Workflow DRAFT→IN_REVIEW→APPROVED→PUBLISHED + server gates | V-4, T-CMS-01…05 | E02-S1 | H | L |
| E02-S3 | Revisions + rollback | T-CMS-01 | E02-S2 | L | S |
| E02-S4 | Media assets with rights + consent records + revocation | T-CMS-03/06 | E01-S7 | H | M |
| E02-S5 | Claim registry + claim snippets + lint list | T-CLM-01…04 | E02-S1 | H | M |
| E02-S6 | SEO: metadata, sitemaps, JSON-LD, redirects | T-SEO-01, T-CMS-07/08 | E01-S4 | M | M |
| E02-S7 | Single-actor flag + weekly digest | T-CMS-10 | E01-S8 | L | S |

### E03 Public site (PV page set) — 19–42 d
| ID | Story | Size |
|---|---|---|
| E03-S1 | Home (PV variant with preview banner) | M |
| E03-S2 | Business pages (developers, contractors, partners) | M |
| E03-S3 | Solutions + scenario explorer (cards) | M |
| E03-S4 | Technology + integrations page (registry-driven) | M |
| E03-S5 | Projects index/detail (consent-gated) + process-story fallback | M |
| E03-S6 | Insights | S |
| E03-S7 | Contact + consultation | S |
| E03-S8 | Gated placeholders + `/preview` explainer | S |
| E03-S9 | Privacy notice page (content from legal) | S |
Acceptance: doc 04 IA-AC-*, doc 05 fallbacks, T-PV-02/03. Deps: E01, E02, content inputs. Risk: content delays (H).

### E04 RFQ and intake — 15–31 d
| ID | Story | Size |
|---|---|---|
| E04-S1 | RFQ form, steps 1–2 (P-A, no files) | M |
| E04-S2 | RFQ uploads (P-B) with quarantine/scan | L |
| E04-S3 | Consultation request | S |
| E04-S4 | Partner inquiry | S |
| E04-S5 | Abuse controls (bot, rate limit, honeypot, idempotency) | M |
| E04-S6 | Acknowledgement emails AR/EN | S |
Acceptance: T-RFQ-01…08. Deps: E01-S7 (S2), E01-S8. Risk: P-B security (H).

### E05 Projects workspace (CRM) — 27–51 d
| ID | Story | Size |
|---|---|---|
| E05-S1 | RFQ inbox + triage view (score, coverage flag) | M |
| E05-S2 | Opportunity state machine + guards + SLA timers | M |
| E05-S3 | Organisations/contacts, dedupe suggestions, reversible merge | L |
| E05-S4 | Qualification checklist + advisory score | S |
| E05-S5 | Consultation + paid survey records | S |
| E05-S6 | Proposals with versions + approval | L |
| E05-S7 | Contracts, amendments, cancellations (+ attribution lock hook) | L |
| E05-S8 | ClickUp handoff summary | S |
Acceptance: T-CRM-01…04, doc 06 stories. Deps: E01, E04. Risk: M.

### E06 Attribution and KPI — 20–38 d
| ID | Story | Size |
|---|---|---|
| E06-S1 | Consent-aware touchpoint capture | S |
| E06-S2 | Classification + review + lock at signature | M |
| E06-S3 | Overrides with audit + overrides report | S |
| E06-S4 | KPI read models (as-recorded + vintage) | L |
| E06-S5 | Executive + attribution-quality dashboards | L |
| E06-S6 | Reconciliation exceptions | M |
Acceptance: T-KPI-01…18. Deps: E05. Finance decisions for final formulas. Risk: M.

### E07 Catalogue and pricing (CR) — 18–34 d
| ID | Story | Size |
|---|---|---|
| E07-S1 | Models/SKUs/variants | M |
| E07-S2 | Options + compatibility rules | M |
| E07-S3 | Price versions + display rules (quote-required) | M |
| E07-S4 | Quotes (engineer approval, customer acceptance, expiry) | L |
| E07-S5 | Partner terms (private, approval-gated) | M |

### E08 Orders and payments (CR) — 25–47 d
| ID | Story | Size |
|---|---|---|
| E08-S1 | Cart (server pricing, idempotency) | M |
| E08-S2 | Checkout submission (guest + OTP status access) | L |
| E08-S3 | Staff review + confirm (T1/T2 per decision) | M |
| E08-S4 | Manual payment verification + unique references + refunds | M |
| E08-S5 | Shipping zones + COD eligibility rules | M |
| E08-S6 | Order status lookup (non-enumerable) | S |
| E08-S7 | Cancellations, expiry, returns/inspection | L |

### E09 Inventory and serials (CR) — 20–38 d
| ID | Story | Size |
|---|---|---|
| E09-S1 | Ledger + stock projection + constraints | L |
| E09-S2 | Reservation service (confirm/release, idempotent) | L |
| E09-S3 | Allocation/picking with serial scan | M |
| E09-S4 | Reconciliation job + alerts | S |
| E09-S5 | Serial import + duplicate quarantine | M |
| E09-S6 | Adjustments with approval | S |

### E10 Commissioning and warranty (CR) — 24–44 d
| ID | Story | Size |
|---|---|---|
| E10-S1 | Commissioning capture (offline-capable design) | L |
| E10-S2 | Warranty policy versioning + live-selling gate (G-4) | M |
| E10-S3 | Coverage computation + display rules | M |
| E10-S4 | Customer accounts (verification) | M |
| E10-S5 | Device claim/ownership verification + transfer | L |
| E10-S6 | Portal pages (devices, warranties) | M |

### E11 Service and RMA (CR) — 10–21 d
| ID | Story | Size |
|---|---|---|
| E11-S1 | Ticket intake with safety triage | M |
| E11-S2 | RMA state machine + fault classes | M |
| E11-S3 | Diagnosis, replacement linkage | M |
| E11-S4 | Customer status timeline (internal notes hidden) | S |

### E12 Operations and readiness — 23–44 d
| ID | Story | Size |
|---|---|---|
| E12-S1 | Backups + restore drill | M |
| E12-S2 | Monitoring + alerts | M |
| E12-S3 | Runbooks (incident, payments, service) | S |
| E12-S4 | Staff onboarding + role setup | S |
| E12-S5 | Data onboarding (prices, stock, serials, legacy customers/devices) | L |
| E12-S6 | Operational rehearsal (B7) | M |
| E12-S7 | Accessibility, performance and security passes | L |

## 3. Effort roll-up
| Scope | Ideal days (sum of ranges) |
|---|---|
| All epics E01–E12 | **252–490** |
| Preview path (E01, E02, E03, E04 without P-B uploads, E05, ~50 % of E06, ~50 % of E12) | **128–255** (+6–10 with P-B) |

Conversion to calendar time for **one developer with AI agents**:
- **AI factor** (acceleration on implementation, net of review/testing): 1.3 (pessimistic) to 1.8 (optimistic).
- **Focus factor** (meetings, support, decisions, rework): 0.75.

| Scope | Optimistic | Mid (factor 1.5, mid sizes) | Pessimistic |
|---|---|---|---|
| Preview path | ≈ 19 weeks | ≈ 34 weeks | ≈ 52 weeks |
| Full (to commercial release) | ≈ 37 weeks | ≈ 66 weeks | ≈ 100 weeks |

Excluded from these numbers: the spike (3–5 d), waiting time for owner/legal inputs, content production.

**Comparison with the earlier estimates (11–17 weeks to preview, 23–36 weeks total, ±40 %):**
- This bottom-up view is about **1.5–2× higher**.
- Reasons: the earlier figures didn't itemise data onboarding, operational rehearsal, consent/claim governance, full RBAC/MFA, reconciliation, or the preview gating work.
- **Confidence remains low.** Sizes are pre-stack and pre-spike. Re-estimate after B1.

### Levers that shorten the schedule (each needs owner approval)
- P-A instead of P-B in the preview.
- English-only admin UI.
- Fewer dashboards at first (executive only).
- Partner terms after the commercial release.
- Hosted email/scanning services instead of self-hosted.

## 4. Sequencing and critical path
B1 spike → E01 → (E02 ∥ E04-S1) → E03 → E05 → E06-S1…S3 → **PV gate** → E07 → E09 → E08 → E10 → E11 → E12-S5/S6 → **CR gate**.

The parallelism available to one developer is interleaving, not true parallel work. Documentation and content work (owner/legal) runs truly in parallel.

**Integration-test milestones:**
- after E01: auth/flags/audit
- after E05: RFQ → contract → KPI
- after E09: concurrency suite
- after E11: full lineage
- before CR: complete regression

## Sign-off (Wave 11c)
12 epics, 4–10 stories each ✅ · Ranges + assumptions ✅ · Comparison with earlier estimates ✅

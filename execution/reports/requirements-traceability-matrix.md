# Requirements Traceability Matrix — Implementation Status

Source rows: planning doc 22 §1 (52 rows), the governing traceability. Status as of 2026-10-15. Local development only.
Status values:
- **IMPLEMENTED+TESTED:** code exists and an automated test executed in this session covers it.
- **PARTIAL:** some of it is built.
- **BLOCKED:** needs an owner, legal or external input.
- **NOT STARTED.**

Test suite keys:
| Key | Suite |
|---|---|
| ACC | `tests/src/acceptance.ts` |
| SURF | `surface.ts` |
| JRN | `journey.ts` |
| CMS | `cms.ts` |
| PRT | `portal.ts` |
| SEC | `security.ts` |
| VIS | `visual.ts` |
| D-* | domain `node:test` files: `kpi`, `kpi-invariants`, `w1`, `lifecycle`, `service` |
| U | `web/test/bidi.test.ts` |

| # | Requirement (doc 22) | Implementation | Evidence (tests) | Status |
|---|---|---|---|---|
| 1 | Bilingual AR/EN at launch (FR-WEB-001) | `/ar` `/en` routing, RTL/LTR, per-page localized metadata, hreflang/canonical, language switch keeps the page | VIS (lang/dir, HREFLANG, LANGSWITCH, BIDI), U | IMPLEMENTED+TESTED. Copy is placeholder |
| 2 | Honest preview (G-2) | Preview banner, `/preview`, informational gated pages, noindex | ACC G-2 (10), VIS | IMPLEMENTED+TESTED |
| 3 | No sales in preview (G-1) | Server-side stage gate on every commerce/portal route (404 in PREVIEW); OWNER-only, audited stage flip | ACC G-1/W7, PRT P-PREVIEW-CLOSED, SURF STAGE | IMPLEMENTED+TESTED |
| 4 | Developer page | Pains, process, engagement models, FAQs, RFQ CTA | VIS, JRN pages | IMPLEMENTED+TESTED (placeholder copy; no capacity claims) |
| 5 | Structured B2B intake (FR-RFQ-001) | Single-page bilingual RFQ (progressive steps not built) | ACC RFQ, JRN | PARTIAL (no multi-step UI) |
| 6 | No duplicate leads (FR-RFQ-005) | Idempotency key; 90-day duplicate suggestion; duplicate-opportunity guard at conversion | ACC RFQ-IDEMPOTENT*, RFQ-DEDUPE; JRN J-DUP-* | IMPLEMENTED+TESTED |
| 7 | Safe drawings (FR-RFQ-003) | Variant P-A: no public uploads; private files fail closed until scanned CLEAN | JRN J-NO-UPLOAD-*, SEC private file | PARTIAL: AV + storage BLOCKED (B-19) |
| 8 | Spam resistance | Honeypot, rate limit, idempotency | ACC honeypot / rate limit | IMPLEMENTED+TESTED (no CAPTCHA) |
| 9 | Engagement model capture | RFQ field → carried to the opportunity | ACC, JRN | IMPLEMENTED+TESTED |
| 10 | Free call / paid survey | FREE_CONSULTATION stage; paid survey needs fee agreement + invoice ref | ACC, JRN | IMPLEMENTED+TESTED (fee amount BLOCKED) |
| 11 | Controlled pipeline (FR-CRM-001) | RFQ and opportunity state machines, server-enforced | ACC CRM (18), JRN | IMPLEMENTED+TESTED |
| 12 | Organisation dedupe (FR-CRM-002) | Match suggestions; explicit human choice; no auto-merge | JRN J-ORG-MATCH | IMPLEMENTED+TESTED (simple normalisation) |
| 13 | Proposal integrity | OWNER approval with document, validity, capacity note; version increments; expiry check before sending | ACC OPP-*, JRN | IMPLEMENTED+TESTED |
| 14 | Contract evidence | Signature evidence required; FX for foreign currency; one contract per opportunity | D-kpi, ACC CONTRACT | IMPLEMENTED+TESTED |
| 15 | Manual ClickUp handoff | Plain-text handoff summary without file links | ACC HANDOFF | IMPLEMENTED+TESTED |
| 16 | Attributable signed value (FR-ATT-001) | Attribution locked at signature from evidenced proposal | JRN J-SIGN, J-KPI | IMPLEMENTED+TESTED |
| 17 | No double counting | PK per contract; exclusive classes | D-kpi-invariants (4 seeds) | IMPLEMENTED+TESTED |
| 18 | New vs existing cohorts | Cohort frozen at signature; cross-tab | D-kpi, D-kpi-invariants, JRN | IMPLEMENTED+TESTED (group rule PD-07 OPEN) |
| 19 | Audited corrections | Override with reason, append-only history, single-actor flag | D-kpi, D-kpi-invariants | IMPLEMENTED+TESTED |
| 20 | Pipeline separate | KPI-008 in its own block | ACC KPI-OWNER | IMPLEMENTED+TESTED |
| 21 | Reconciled reporting | Identities + independent oracle + additivity | D-kpi-invariants | IMPLEMENTED+TESTED |
| 22 | North Star headline | Configurable OWNER setting, default UNSELECTED | ACC NORTHSTAR-* | IMPLEMENTED+TESTED. Selection BLOCKED (PD-06) |
| 23 | Trustworthy content | Draft → Review → Approve → Publish → Withdraw, four-eyes, server-enforced | CMS, spike V-4 | IMPLEMENTED+TESTED |
| 24 | Consent for case studies | Signed consent reference, scope, final revocation, auto-withdrawal | ACC CASE-*, CMS | IMPLEMENTED+TESTED (no real consents exist) |
| 25 | Evidence-backed claims | Registry; OWNER + evidence to publish; derived page claim status; auto-withdraw on downgrade | ACC CLAIM-*, CMS | IMPLEMENTED+TESTED |
| 26 | AI copy reviewed | `aiAssisted` flag + mandatory review workflow | — (flag not tested separately) | PARTIAL |
| 27 | SEO | Localized title/description, canonical, hreflang, sitemap, robots noindex (preview), SEO fields | VIS SEO (79), ACC SEO | IMPLEMENTED+TESTED (indexing intentionally off) |
| 28 | No fake app badges | CL-10 PROHIBITED in the registry; no badges in the code | ACC claims | IMPLEMENTED+TESTED |
| 29 | Least privilege | Permission matrix, explicit access, separate DB roles | SURF (84), SEC, spike V-2 | IMPLEMENTED+TESTED |
| 30 | Admin account safety | Session-bound TOTP/recovery by default; exact DR-063 Production OWNER exception is a separate post-Payload server authorization decision bound to immutable ID/email/role/environment. Shared account/IP throttles, lockout, session invalidation and audit remain enforced | ACC MFA, CMS SESS-*, SEC AUTH; `web/test/production-owner-auth.test.ts` | IMPLEMENTED+TESTED LOCALLY; hosted Production acceptance pending |
| 31 | Audit integrity | Append-only audit (trigger + grants), correlation ids, CMS decisions audited | CMS AUDIT-*, D-* | IMPLEMENTED+TESTED |
| 32 | Privacy compliance | Placeholder notice only | — | **BLOCKED** (legal, B-11) |
| 33 | Correct product choice (catalogue) | Controller / variant / addition model | D-lifecycle | PARTIAL: real catalogue BLOCKED |
| 34 | Honest custom pricing (quote rule) | Custom quote request → OWNER quote with validity → customer acceptance | D-lifecycle, ACC W7 | IMPLEMENTED+TESTED |
| 35 | Price tamper-proof | Server-side pricing from approved prices; client prices ignored; line snapshot | D-w1, D-lifecycle | IMPLEMENTED+TESTED |
| 36 | Partner pricing private | Never published; no partner price model built | — | PARTIAL (terms BLOCKED, B-05) |
| 37 | Manual payments safe | Record/verify/reject, unique external ref, total cap | D-lifecycle | IMPLEMENTED+TESTED |
| 38 | Shipping correctness | Per-order staff quote | D-lifecycle | **BLOCKED** (tariff, B-02) |
| 39 | COD eligibility | COD supported; eligibility rules not defined | — | BLOCKED (rule PROPOSED) |
| 40 | No oversell | Atomic reservation | spike V-1 (160), D-lifecycle (50 concurrent) | IMPLEMENTED+TESTED |
| 41 | Stock integrity | DB checks + ledger | D-lifecycle | IMPLEMENTED+TESTED |
| 42 | Serial traceability | Serial registry, allocation, shipping, replacement history | D-lifecycle, D-service | IMPLEMENTED+TESTED |
| 43 | Warranty from commissioning | Commissioning records; coverage start entered by staff | D-service | PARTIAL (start event + duration BLOCKED) |
| 44 | No invented warranty dates | Dates only from an approved policy; none exists | D-service, PRT P-NO-INVENTED-DATES | IMPLEMENTED+TESTED |
| 45 | Policy gate before live selling | Coverage refuses without an approved policy; stage gate | ACC W1-COVERAGE-BLOCKED | IMPLEMENTED+TESTED |
| 46 | Ownership verification | Order token / commissioning code / staff review | D-service, PRT | IMPLEMENTED+TESTED |
| 47 | Service/RMA tracking | Tickets, RMA state machine, replacements | D-service, PRT | IMPLEMENTED+TESTED |
| 48 | Safety escalation (W-08) | SAFETY ticket category → URGENT, guidance code, "not an emergency service", cannot be resolved before a recorded human callback (DB constraint) | D-service (safety test), PRT P-SAFETY | IMPLEMENTED+TESTED (guidance wording needs legal/safety review) |
| 49 | Recoverability | `app/tools/backup-restore-drill.sh`: dump → restore → row-count comparison (69 tables identical) + invariants | drill report in `app/backups/` | PARTIAL: local only; target backups/PITR BLOCKED (B-18) |
| 50 | Operational readiness | — | — | NOT STARTED (hosting not authorised) |
| 51 | No device control | No IoT/device-control code exists (by design) | code review | IMPLEMENTED (by absence) |
| 52 | Future hosting fit | Measurements on Windows only | spike V-7, W11 | DEFERRED |

## Totals (52 rows)
| Status | Rows |
|---|---|
| IMPLEMENTED+TESTED | 39 |
| PARTIAL | 7 (#5, #7, #26, #33, #36, #43, #49) |
| BLOCKED | 3 (#32, #38, #39) |
| NOT STARTED | 1 (#50 operational readiness, needs hosting) |
| DEFERRED | 1 (#52) |
| Implemented by absence | 1 (#51 no device control) |

"IMPLEMENTED+TESTED" means implemented and tested **locally with synthetic data**. Several of these rows still need business inputs before they can serve real users (see `remaining-release-blockers.md`).

### S5 evidence addendum (2026-10-16)

- No product requirement or proposed business rule changed.
- The test-execution requirement now has fresh isolated evidence: `execution/evidence/s6-final-20261018/summary.json` (1180/1180, all steps exit 0).
- The browser/HTTP data-isolation obligation is now implemented in `app/tests/run-all.sh` with a disposable `otonom_e2e_*` clone and verified teardown.
- Staff operations UI blocker B-40 is resolved locally; human Arabic/editor/accessibility and independent-security acceptance criteria remain open.

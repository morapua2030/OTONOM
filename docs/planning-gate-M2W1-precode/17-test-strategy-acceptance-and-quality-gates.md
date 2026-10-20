# 17 — Test Strategy, Acceptance and Quality Gates

| Version | 3.0-draft | Date | 2026-10-13 | Status | **All tests NOT EXECUTED** (no application exists) |
|---|---|---|---|---|---|---|---|

## 1. Test types (future)
Static (types, lint, i18n keys) · unit (rules, state machines) · DB integration (real PostgreSQL) · API/authz matrix · E2E (Playwright-class, desktop + mobile, AR + EN) · security (negative, upload, injection) · accessibility (automated + manual screen reader) · performance (lab + field) · recovery (backup/restore, job replay) · content review (human checklists).

## 2. Verification matrix
Severity: **C** = critical (release blocker), **H** = high, **M** = medium. Phase: PV / CR / FUT. All rows `NOT EXECUTED`.

| ID | Domain | Preconditions | Intent / input | Steps (high level) | Expected | Sev | Type | Phase | Req | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| T-RFQ-01 | RFQ | Form live | Valid AR submission | Fill step 1 → submit | RFQ created, ref shown, AR ack | C | E2E | PV | FR-RFQ-001 | Eng |
| T-RFQ-02 | RFQ | — | Missing required field | Submit | Localized field error, no RFQ | H | E2E | PV | FR-RFQ-001 | Eng |
| T-RFQ-03 | RFQ | — | Double submit / retry | Resubmit with the same key | Same ref, 1 RFQ | C | API | PV | FR-RFQ-005 | Eng |
| T-RFQ-04 | RFQ | P-B | `.exe` renamed `.pdf` | Upload | Rejected | C | Security | PV/CR | FR-RFQ-003 | Eng |
| T-RFQ-05 | RFQ | P-B | 30 MB DWG | Upload | Rejected with the limit | H | E2E | PV/CR | FR-RFQ-003 | Eng |
| T-RFQ-06 | RFQ | P-B | EICAR test file | Upload | Quarantined, never downloadable | C | Security | PV/CR | FR-RFQ-003 | Eng |
| T-RFQ-07 | RFQ | Files exist | Wrong user requests a file | GET with another ID | 403 + audit | C | Security | PV/CR | doc 14 T-07 | Eng |
| T-RFQ-08 | RFQ | — | Bot flood | 50 posts/min | Rate-limited | H | Security | PV | FR-RFQ-005 | Eng |
| T-CRM-01 | CRM | RFQ exists | Illegal transition | INITIAL_QUALIFICATION → WON_SIGNED | Rejected | C | API | PV | doc 06 §2 | Eng |
| T-CRM-02 | CRM | — | Duplicate contacts same org | Merge + undo | Both records restored | H | Integration | PV | doc 06 §1.4 | Eng |
| T-CRM-03 | CRM | PROPOSAL_SENT / NEGOTIATION | Move to WON_SIGNED without evidence | Submit | Blocked | C | API | PV | doc 06 §3 | Eng |
| T-CRM-04 | CRM | Proposal sent | Edit an accepted version | Edit | Blocked | H | API | PV | doc 06 §3 | Eng |
| T-KPI-01…18 | KPI | Illustrative dataset | Per doc 07 §12 | — | Per doc 07 | C/H | Integration | PV/CR | doc 07 | Eng/Finance |
| T-CMS-01…10 | CMS | — | Per doc 10 §6 | — | Per doc 10 | C/H | Integration/E2E | PV | doc 10 | Eng/Content |
| T-CLM-01…04 | Claims | — | Per doc 11 §5 | — | Per doc 11 | C | Integration | PV | doc 11 | Content/Eng |
| T-PV-01 | Preview gating | PV flags | POST order endpoint | Call the API | Disabled (404/403), nothing written | C | API | PV | G-1 | Eng |
| T-PV-02 | Preview gating | PV | Visit `/ar/checkout` | Browse | Info page, no form, `noindex` | C | E2E | PV | G-1/G-2 | Eng |
| T-PV-03 | Preview copy | PV | Scan pages for forbidden phrases ("buy now", store badges, "warranty portal") | Content lint | 0 hits | H | Content | PV | G-2 | Content |
| T-COM-01 | Cart | CR | Base + options | Add → view | Correct subtotal | H | E2E | CR | doc 08 §2 | Eng |
| T-COM-02 | Cart | CR | Custom line | Add | "Final price subject to quotation". No payment instructions | C | E2E | CR | BR-03 | Eng |
| T-COM-03 | Pricing | CR | Tampered client price | POST | Ignored | C | Security | CR | T-10 | Eng |
| T-COM-04 | Shipping | CR | Unsupported zone | Checkout | Quote path | H | E2E | CR | doc 08 | Eng |
| T-COM-05 | COD | CR | Over-cap / non-eligible | Checkout | COD hidden | H | E2E | CR | BR-09 | Eng |
| T-COM-06 | Payment | CR | Proof uploaded | — | Not VERIFIED until staff verify | C | API | CR | doc 08 §5 | Eng |
| T-COM-07 | Payment | CR | Reuse of an external reference | Verify 2 orders | 2nd rejected | C | API | CR | T-11 | Eng |
| T-COM-08 | Partner pricing | CR | Partner terms approved | Partner order. Public product page | Partner price applied server-side only. Never shown publicly or accepted from the client | H | API/E2E | CR | FR3-CRM-001 | Eng |
| T-INV-01 | Inventory | CR | Last unit, concurrency | doc 16 V-1 | 1 success | C | DB integration | CR | INV-1/2 | Eng |
| T-INV-02 | Inventory | CR | Replay confirm | — | No double reservation | C | DB integration | CR | INV-3 | Eng |
| T-INV-03 | Inventory | CR | Cancel twice | — | 1 release | C | DB integration | CR | INV-4 | Eng |
| T-INV-04 | Inventory | CR | Ledger drift injected | Reconciliation job | Alert, no auto-fix | H | Integration | CR | INV-7 | Eng |
| T-SER-01 | Serial | CR | Duplicate serial import | Import | Quarantine + ticket | C | Integration | CR | doc 09 | Eng |
| T-SER-02 | Serial | CR | Full lineage | Order → commission → coverage → RMA → replace | Traceable | C | E2E | CR | doc 09 | Eng |
| T-WAR-01 | Warranty | CR | Serial-only claim | Enter serial | No data, claim requires proof | C | Security | CR | G-3 | Eng |
| T-WAR-02 | Warranty | Policy unapproved | View coverage | — | No end date, "terms pending" | C | E2E | staging | G-3 | Eng |
| T-WAR-03 | Warranty | Policy unapproved | Enable live selling flag | Config | Blocked by gate check | C | Config/API | CR | G-4 | Eng/Owner |
| T-WAR-04 | Warranty | Policy approved later | Approve the policy | — | Coverages computed + audit | H | Integration | CR | doc 09 | Eng |
| T-WAR-05 | RMA | CR | Ticket transitions | Walk the states | Legal transitions only | H | API | CR | doc 09 §5.1 | Eng |
| T-WAR-06 | RMA | CR | Internal note | Customer view | Hidden | C | Security | CR | doc 09 | Eng |
| T-WAR-07 | Safety | CR | Safety symptom selected | Submit | Guidance + urgent flag | C | E2E | CR | W-08 | Eng/Service |
| T-SEC-01…14 | Security | — | doc 14 threats | — | Mitigations hold | C/H | Security | PV/CR | doc 14 | Eng |
| T-AUD-01 | Audit | — | Update/delete an audit row | Direct DB as app role | Denied | C | DB | PV | ADR-06 | Eng |
| T-A11Y-01 | A11y | — | Keyboard-only RFQ (AR, EN) | Complete | Success. Errors announced | H | Manual + auto | PV | NFR | Eng |
| T-A11Y-02 | A11y | CR | Keyboard-only checkout | Complete | Success | H | Manual + auto | CR | NFR | Eng |
| T-I18N-01 | i18n | — | Missing translation key | CI check | Fails the build | H | Static | PV | doc 10 | Eng |
| T-SEO-01 | SEO | — | hreflang/canonical | Crawl | Reciprocal, valid | M | Automated | PV | doc 10 §4 | Eng |
| T-PERF-01 | Perf | — | Home mobile | Lab run | Within budget (TBD) | M | Perf | PV | NFR | Eng |
| T-OPS-01 | Recovery | Backup exists | Restore drill | Restore to scratch | Data consistent, app boots | C | Recovery | PV (before go-live) | doc 20 | Eng |
| T-OPS-02 | Recovery | — | Email provider down | Submit RFQ | RFQ saved. Outbox retries | H | Integration | PV | doc 13 §3 | Eng |
| T-UPG-01 | Upgrade | — | Migration on a copy of prod-like data | Run | No data loss. Rollback tested | H | Recovery | PV/CR | doc 15 | Eng |

## 3. Quality gates
| Gate | Criteria | Phase |
|---|---|---|
| QG-1 Story done | Acceptance criteria met. Tests for the story added and green. Docs updated. No new critical/high security findings | Build |
| QG-2 PV release | All PV critical tests green. Preview security gate (doc 14 §6) for the chosen variant. Privacy notice live. Consented content only. Restore drill passed. Owner sign-off | PV |
| QG-3 CR release | All CR critical tests green. **W1/G-3/G-4 satisfied.** Operational rehearsal (doc 18). Policies approved. Owner + legal sign-off | CR |
| QG-4 Deploy | Separate authorisation (currently prohibited) | — |

## Sign-off (Wave 11a)
Every test has an ID, phase, requirement and owner ✅ · Everything is NOT EXECUTED ✅

# Preview Readiness (B2B preview, M2) — 2026-10-15

**Determination: READY FOR INTERNAL REVIEW only. NOT ready for a public preview.**

## Ready for internal review (local, synthetic data)
- Bilingual site (AR RTL / EN):
  - home, solutions, developers, contractors/partners, technology/integrations, projects (process story), consultation, RFQ, support, preview notice;
  - commerce and portal pages are informational only and gated.
- **RFQ intake (variant P-A):** validation, idempotency, honeypot, shared rate limit, duplicate detection, no uploads.
- **Projects workspace (API):**
  - triage;
  - conversion with organisation matching and duplicate guard;
  - pipeline with consultation, paid survey and proposal approval;
  - contract signature;
  - attribution, KPI report (with funnel) and reconciliation.
- **CMS:**
  - four-eyes workflow;
  - claims registry gate;
  - consents;
  - media;
  - SEO fields;
  - revision history and audit.
- **Staff security:** MFA, lockout, session handling. The security self-review passed.
- **Tests:** latest full regression 1069/1069 (see `waves/W10-test-automation-regression.md`).

## Must be done before ANY public preview (all open)
| Gate | Blocker |
|---|---|
| Owner approves architecture and the preview scope | B-01 |
| Brand files + final AR/EN copy written/edited by humans | B-09, B-10, B-32 |
| Privacy notice, terms, cookie notice (legal) | B-11, B-12 |
| Real consents / claim evidence for anything shown about clients or compatibility | B-13, B-14 |
| Hosting authorisation, Git, backups/PITR on target, proxy config, e-mail provider | B-16, B-17, B-18, B-20, B-22 |
| Human Arabic/RTL review (checklist ready) | B-27 |
| Accessibility audit with assistive technology | B-28 |
| Independent security review | B-30 |
| Indexing decision (currently `noindex` everywhere, robots disallow) | — |

## Unsafe to launch publicly as-is
- Placeholder copy and brand tokens could be mistaken for company statements.
- There is no approved privacy text, but the RFQ form collects personal data.
- Notifications (RFQ acknowledgements) are missing, because no e-mail is sent.

## S5 verification addendum (2026-10-16)

- Local functional verdict remains **PASS for covered automated scope**, based on the isolated S6 1180/1180 run.
- Public launch verdict remains **BLOCKED** by the human, legal, brand, infrastructure and independent-security items above.
- HTTP, Edge and visual suites now write to a disposable `otonom_e2e_*` clone; `otonom_dev` stayed PREVIEW.

## S7 addendum (2026-10-18)

- Internal UX verdict improved: refined AR/EN home, IA, progressive RFQ, staff mobile fixes and 111 fresh screenshots.
- Final local evidence is **1430/1430** with Edge E2E 42/42 and visual/bidi/a11y/SEO/i18n 961/961.
- Public preview remains **BLOCKED** by the same owner/legal/brand/human/external/deployment gates. The privacy placeholder cannot authorize public PII collection.

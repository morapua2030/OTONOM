# WAVE 3 — B2B Preview Journey

Journey under test: Homepage → Solutions → Projects/Case studies → RFQ → Triage/Qualification → Conversion → Engineering review → Free consultation → Paid site survey → Proposal (draft → owner approval → sent) → Contract signature → Attribution and cohort in the KPI report.

## 1. Gaps found and closed
| ID | Gap | Risk | Fix |
|---|---|---|---|
| W3-G1 | There was no formal RFQ → opportunity step. Opportunities were created by hand, with no link to the RFQ | Lost origin evidence; website attribution unprovable | `POST /api/workspace/rfqs/:id/convert` (crm.write). It works only for a **QUALIFIED** RFQ and is idempotent (one RFQ → at most one opportunity). It carries the origin evidence (RFQ ref, submission time, landing page, UTM) into the opportunity and audits the conversion in the domain audit trail |
| W3-G2 | The `rfq` link on opportunities and the `opportunity` link on RFQs were writable by any CRM user | Website sourcing could be faked for any opportunity | Both links are system-only: they are reset in hooks unless set by the conversion endpoint |
| W3-G3 | WEBSITE_SOURCED / WEBSITE_ASSISTED could be proposed with no evidence | KPI inflation | Website attribution needs a linked website RFQ or a written evidence note of at least 10 characters (422 `ATTRIBUTION_EVIDENCE_REQUIRED`) |
| W3-G4 | The attribution proposal stayed editable after signature | CMS and domain disagree | Frozen once the stage is WON_SIGNED or DELIVERY_HANDOFF. Changes after signature go only through the audited domain override (reason required) |
| W3-G5 | No organisation matching. A new organisation for every lead would break the NEW/EXISTING cohort | Cohort misclassification | `GET /api/workspace/rfqs/:id/matches` suggests similar organisations (normalised names), existing contacts (same e-mail/phone) and open opportunities from the same person. Conversion **requires an explicit human choice** when a similar organisation exists (409 `ORGANISATION_MATCH_REQUIRED`). Nothing is auto-merged |
| W3-G6 | No duplicate-opportunity guard | Double counting in the pipeline | Conversion refuses when the same person already has an open opportunity (409 `POSSIBLE_DUPLICATE_OPPORTUNITY`). Staff either attach the RFQ to that opportunity (`linkToOpportunityId`) or override with a written reason |

## 2. Verified behaviour (journey suite: **35/35 pass**, `app/tests/results/journey-latest.json`)
- **Public pages** along the journey are reachable in Arabic.
- **No uploads (variant P-A):**
  - a multipart submission with a PDF to `/api/rfq` → 422;
  - an anonymous upload to private files → 403;
  - malformed JSON → 422, with no 500 and nothing stored.
- **Error recovery:** a retry with the same idempotency key after a lost response returns the same reference.
- **Triage:**
  - an unqualified RFQ cannot be converted (409);
  - an editor cannot convert (403);
  - INITIAL_QUALIFICATION ↔ NEEDS_INFO works;
  - QUALIFIED is terminal, with no silent reopening (409).
- **Conversion and matching:**
  - a similar organisation needs an explicit choice;
  - the converted opportunity starts at ENGINEERING_REVIEW with the RFQ link and origin evidence;
  - a repeat conversion returns the same opportunity;
  - the conversion is audited exactly once.
- **Duplicates:** a second RFQ from the same person is detected. Overriding needs a reason; the RFQ was attached to the existing opportunity.
- **Pipeline:**
  - consultation → paid survey (fee agreement) → draft → owner approval → sent;
  - skipping from consultation to PROPOSAL_SENT → 409;
  - the RFQ link cannot be rewritten.
- **Signature:**
  - the owner signs;
  - WEBSITE_SOURCED is locked;
  - the first contract of the organisation is NEW;
  - the CMS proposal is frozen;
  - KPI-001 rises by exactly the signed value, and the identities hold.
- **Cohort:** the second contract of the same organisation is EXISTING (and NON_WEBSITE).

**Regression after the changes:**
| Suite | Result |
|---|---|
| Acceptance | 93/93 |
| Generated-surface probe | 84/84 |

## 3. Not done / blocked in this wave
- **Real case studies / apartment videos:** BLOCKED. Publication needs written consent (enforced in code); no real media was used.
- **Spam protection:** stays honeypot + rate limit + idempotency. No CAPTCHA, because a third-party service needs approval.
- **Staff UI for conversion:** the API is complete, but there is no dedicated button in the Payload admin yet (backlog: a custom admin view for the Projects workspace).
- **Organisation matching quality:** simple normalisation only. The cohort rule for group companies stays open for the owner (PD-07).

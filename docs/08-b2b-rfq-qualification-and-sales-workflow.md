# B2B RFQ, Qualification and Sales Workflow

| Doc ID | OTONOM-DOC-08 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
RFQ intake, the case lifecycle, qualification, consultation, the paid survey, proposals, contracts, handoff, attribution hooks and audit. Implements FR-RFQ-*, FR-CRM-* (doc 03).

## 2. Vocabulary (normalised)
| Term | Definition |
|---|---|
| Lead | Any inbound contact (form, call, referral) before triage |
| RFQ | A structured project brief submitted through the website. Its payload is immutable after submit |
| Opportunity | The commercial pursuit of one project scope for one organisation. Several RFQs/contacts can link to it |
| Proposal | A versioned commercial offer for an opportunity |
| Contract | A signed agreement with unique identity. Amendments are linked records |
| Handoff | The transfer to delivery (manual ClickUp entry) |

## 3. RFQ case state machine
| # | From | To | Actor | Guard / required data | Side effects | Optional? |
|---|---|---|---|---|---|---|
| 1 | (form) | `SUBMITTED` | Visitor | Valid payload, bot check passed, idempotency key | Ack email (no attachments), audit, attribution snapshot | — |
| 2 | `DRAFT` | `SUBMITTED` | Visitor | Only if "save draft" is approved (OPEN) | — | Yes |
| 3 | `SUBMITTED` | `TRIAGE` | System/Engineer | — | SLA timer starts | — |
| 4 | `TRIAGE` | `NEEDS_INFORMATION` | Engineer | Question text | Customer message logged. SLA paused | Yes |
| 5 | `NEEDS_INFORMATION` | `TRIAGE` | Engineer/system | Customer reply or timeout | SLA resumes | — |
| 6 | `TRIAGE` | `DECLINED` | Engineer | **Reason code + text** | Polite decline message (template) | — |
| 7 | `TRIAGE` | `QUALIFIED` | Engineer | Qualification checklist + advisory score recorded | Opportunity created/linked. `qualified_at` → pipeline | — |
| 8 | `QUALIFIED` | `ENGINEERING_REVIEW` | Engineer | — | — | — |
| 9 | `ENGINEERING_REVIEW` | `CONSULTATION_SCHEDULED` | Engineer | Date/time, channel | Invite | Yes |
| 10 | `CONSULTATION_SCHEDULED` | `CONSULTATION_COMPLETED` | Engineer | Notes (approved) | — | — |
| 11 | `ENGINEERING_REVIEW` / `CONSULTATION_COMPLETED` | `SITE_SURVEY_PROPOSED` | Engineer | **Fee agreement accepted** (amount, credit policy) | Invoice reference | Yes (paid) |
| 12 | `SITE_SURVEY_PROPOSED` | `SITE_SURVEY_COMPLETED` | Engineer | Survey report file | — | — |
| 13 | `SITE_SURVEY_PROPOSED` | `CONSULTATION_COMPLETED` | Engineer | Survey cancelled + reason + fee outcome (refund/credit/forfeit: policy OPEN) | — | — |
| 14 | `ENGINEERING_REVIEW` / `CONSULTATION_COMPLETED` / `SITE_SURVEY_COMPLETED` | `PROPOSAL_IN_PREPARATION` | Engineer | — | — | — |
| 15 | `PROPOSAL_IN_PREPARATION` | `PROPOSAL_SENT` | Approver | Proposal version approved internally | PDF stored privately | — |
| 16 | `PROPOSAL_SENT` | `NEGOTIATION` | Engineer | — | New versions supersede old ones (history kept) | Yes |
| 17 | `PROPOSAL_SENT` / `NEGOTIATION` | `WON` | Engineer | Customer acceptance evidence | — | — |
| 18 | `WON` | `CONTRACT_SIGNED` | Authorised role | **Signed evidence file + verified value + currency + signed date** | Contract record. **Attribution frozen.** Cohort evaluated | — |
| 19 | `CONTRACT_SIGNED` | `DELIVERY_HANDOFF` | Engineer/Ops | Handoff checklist + owner | ClickUp summary generated | — |
| 20 | any open | `ON_HOLD` | Engineer | **Reason + next follow-up date** | Reminder | — |
| 21 | `ON_HOLD` | previous state | Engineer | — | — | — |
| 22 | any open (pre-signature) | `LOST` | Engineer | **Reason code + text** | — | — |
| 23 | `LOST` / `DECLINED` | `TRIAGE` (reopen) | Engineer | Reason | Audit. Same opportunity unless scope changed materially (then a new opportunity, linked) | Yes |

Rules:
- Every transition is server-validated, timestamped, attributed to an actor and audited.
- Illegal transitions are rejected.
- Backward moves need a reason.
- Retries are idempotent (same target state, no duplicate side effects).

## 4. Intake form (progressive)
**Step 1 (required):** contact name · email and/or phone (at least one; both recommended) · organisation (optional for homeowners) · customer type (`DEVELOPER`, `CONTRACTOR`, `CONSULTANT`, `PARTNER`, `HOMEOWNER`, `OTHER`) · project type · governorate/city · approximate units **or** circuits · basic scope (free text, 20–2000 chars) · contact consent · preferred channel.
**Step 2 (optional):** project phase · timeline · services sought (supply/design/installation/custom integration) · ecosystem preference · budget range (EGP bands OPEN) · floors/buildings · commissioning window · technical notes.
**Step 3 (optional):** documents (DR-047). The RFQ stays fully usable without uploads.

Privacy notice inline: purpose, who sees the files, retention (doc 18 §6).

## 5. File intake (summary; controls in doc 18 §5)
Allow-list PDF, JPG/PNG/WEBP/HEIC, DWG, DXF (IFC optional). Reject ZIP/RAR/7z, executables, macro-enabled Office files and double extensions · magic-byte check · per-file and aggregate limits · opaque object keys · quarantine → scan → private store · short-lived signed URLs for authorised staff only · downloads audited · acknowledgement emails never attach or link files publicly.

## 6. Duplicates and organisation matching
- **Suggest** a duplicate when: same normalised email/phone within 90 days, **or** same organisation key + similar location/scope.
- A human confirms. Merge keeps both records (`duplicate_of`), moves touchpoints, and is reversible and audited.
- Organisation keys per DR-049. Never merge on name similarity alone.
- Multiple contacts from one organisation on the same project join one opportunity. A different project creates a different opportunity.

## 7. Qualification (advisory, never automatic rejection)
| Factor | Weight (PROPOSED) | Scale |
|---|---|---|
| Project fit (segment, scope relevance) | 20 % | 0–5 |
| Customer legitimacy (verifiable organisation/person) | 15 % | 0–5 |
| Technical feasibility | 20 % | 0–5 |
| Timeline readiness | 10 % | 0–5 |
| Expected gross margin | 15 % | 0–5 (estimate) |
| Service location vs coverage | 10 % | 0–5 |
| Internal delivery capacity at the requested window | 10 % | 0–5 |
The score is displayed with the factor breakdown. The engineer's decision and reason are recorded. Weights are reviewed quarterly.

## 8. Service-level targets (PROPOSED, need staffing confirmation)
| Event | Target |
|---|---|
| Automated acknowledgement | Immediate |
| First human response | 1 business day |
| Triage decision | 3 business days |
| Proposal after required inputs | Project-dependent. Default 10 business days |
Timers pause in `NEEDS_INFORMATION` and `ON_HOLD`. Breaches show on the Projects dashboard (they reveal bottlenecks, not blame).

## 9. Consultation and paid survey
- The free call creates `ConsultationRecord` (no invoice).
- The paid survey needs a disclosed fee and terms (DR-012), customer acceptance, an invoice reference and a payment status.
- Accounting for cancellation, refund, or credit against the contract is **OPEN** (finance).
- Survey fees are **not** contract value unless finance decides otherwise.

## 10. Proposals
Versioned (`v1…n`). Exactly one current version. Contents: structured line items (catalogue SKUs, standard options, quoted services), exclusions, assumptions, validity date, currency, internal approval (actor/time), customer response. An accepted version is immutable. Superseded versions are kept.

## 11. Contracts
- Required: unique `CTR-` reference, organisation, opportunity, accepted proposal version, signed date, signed evidence file, original currency, `signed_value_at_signature`, tax treatment (policy OPEN), contract type, status.
- **No digital-signature provider is approved.** Capture evidence of externally signed contracts (legal review OPEN).
- **Amendments:** separate signed records (± delta, effective date, evidence) that update `current_net_contract_value`. The original is never overwritten.
- **Cancellation:** status + effective date + reason + recognition adjustment (doc 09 §5).
- **Master/child contracts** (e.g. compound master + per-building): child contracts link to the master. Reporting counts **obligations once**. A rule is needed for whether the master carries value or only the children (OPEN, recommend: value on the signed instrument that creates the obligation, with no value on umbrella frameworks).

## 12. Handoff
Checklist: scope summary, contract ref, value, site contacts (private), key file **references** (not links), assigned operations owner, target dates. A "Copy handoff summary" produces text for manual ClickUp entry. No API token is stored.

## 13. Edge cases (coverage)
| Case (master §17.1) | Handling | Status |
|---|---|---|
| Same contractor, multiple RFQs, different emails | Org-key dedupe suggestion + merge | COVERED |
| Developer changes legal entity after RFQ | Organisation relationship `successor_of`. Cohort uses the group link if confirmed | PARTIAL (DR-049) |
| Contractor starts lead, developer signs directly | Opportunity org = signing entity. Contractor recorded as `influencer` contact. Attribution per origin evidence | COVERED |
| Master + building contracts | §11 rule | OPEN (finance) |
| One RFQ → two independent contracts | Two contracts on one or two opportunities. Each counted once | COVERED |
| Proposal revised 3× | Versioning, accepted version immutable | COVERED |
| Meeting held, no approved notes | No Assisted inference | COVERED |
| Lead on hold 6 months then revived | Same opportunity. Cohort evaluated at signature | COVERED |
| Contract signed then cancelled | Both events kept. Adjustment | COVERED (policy OPEN) |
| Client refuses to upload drawings | Upload optional | COVERED |
| Phone referral entered manually | `NON_WEBSITE` origin with notes | COVERED |
| Paid survey cancelled/refunded/credited | §9 | OPEN (finance) |
| Engineer overloaded | SLA breach dashboard | COVERED |

## 14. Audit events
`rfq.submitted`, `rfq.state_changed`, `rfq.merged`, `opportunity.created`, `qualification.scored`, `proposal.version_approved`, `contract.signed`, `contract.amended`, `contract.cancelled`, `attribution.classified`, `attribution.overridden`, `file.downloaded`.

## Change log
2.0-draft, 2026-10-13: rewritten to the v2 state names. Qualification scoring and edge-case table added.

## Next review decision
The owner approves the states, SLA targets (or marks them OPEN), the upload policy, and the qualification weights.

# 06 — B2B RFQ, Qualification, CRM and Proposals

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. State topology PROPOSED |
|---|---|---|---|---|---|---|---|

Sources: M3P §1.4, §9. `docs/08` (v2 EXTRACTED). Doc 01 (OD-13, OD-15, OD-16).

## 1. RFQ data capture
### 1.1 Step 1, required (short)
| Field | Type / validation | Purpose |
|---|---|---|
| Full name | 2–100 chars | Contact |
| Email and/or phone | ≥1 required. Email RFC-valid. Phone E.164 (EG default +20) | Contact, dedupe |
| Organisation name | Optional for homeowners | Dedupe, cohort |
| Customer type | DEVELOPER / CONTRACTOR / CONSULTANT / PARTNER / HOMEOWNER / OTHER | Routing |
| Project type | COMPOUND / MULTI_UNIT_BUILDING / VILLA / APARTMENT / COMMERCIAL / OTHER | Routing |
| Location | Governorate (list) + city/area (text) | Coverage check |
| Size | Units (int 1–100000) **or** approximate circuits | Scoping |
| Requested systems | Multi-select: lighting, climate/HVAC, AV/TV, multi-zone audio, doors/garage, gas/alarm integration, scenes, other | Scoping |
| Engagement model | SUPPLY_ONLY / SUPPLY_INSTALL_PROGRAM / DESIGN_BUILD / UNSURE | Proposal template |
| Brief description | 20–2000 chars | Context |
| Consents | Processing consent (required). Marketing (optional) | Privacy |

### 1.2 Step 2, optional enrichment
Project name · construction stage (PLANNING / DESIGN / STRUCTURE / FINISHING / OCCUPIED) · timeline (<3m, 3–6m, 6–12m, >12m, unknown) · budget band (EGP bands OPEN) · number of buildings/floors · preferred contact time/channel · how they heard about OTONOM (list + other) · ecosystem preference (Alexa / Google / Apple / Home Assistant / none / unsure).

### 1.3 Step 3, optional files (variant P-B, or CR only)
| Rule | Proposal (DR-047, PROPOSED) |
|---|---|
| Types | PDF; JPG/PNG/WEBP/HEIC; DWG, DXF. IFC/RVT/SKP **OPEN** (size and parsing risk) |
| Rejected | ZIP/RAR/7z, executables, scripts, macro-enabled Office, double extensions, polyglots (magic-byte mismatch) |
| Limits | 25 MB per file. ≤ 10 files. ≤ 100 MB per RFQ |
| Flow | Upload to quarantine → malware scan → private store. Staff download via short-lived signed URL with an audit entry. Never emailed |
| Retention | Lost/declined: 24 months (PROPOSED, legal OPEN). Won: contract term + statutory period |
| **Preview rule** | If the security gate (doc 14 §6) isn't met, **no file upload in the preview** (variant P-A) |

### 1.4 Duplicate and organisation matching
- **Contact match (suggestion):** same normalised email or E.164 phone within 90 days.
- **Organisation keys (DR-049, PROPOSED), in order of strength:** tax registration no. → commercial registry no. → normalised legal name + governorate → email domain (excluding free-mail domains) → human-confirmed group link.
- **Never auto-merge.** Merge is reversible, keeps `duplicate_of`, and is audited.
- **Multi-contact accounts:** one Organisation, many Contacts with roles (procurement, technical, finance, consultant). An opportunity has a primary contact plus "influencers" (e.g. the contractor contact on a developer's opportunity).

## 2. Lifecycle state machine (PROPOSED topology)
`SUBMITTED → INITIAL_QUALIFICATION → NEEDS_INFO ⇄ … | QUALIFIED → ENGINEERING_REVIEW → FREE_CONSULTATION → PAID_SITE_SURVEY (optional) → PROPOSAL_DRAFT → PROPOSAL_APPROVED → PROPOSAL_SENT → NEGOTIATION → WON_SIGNED | LOST | ON_HOLD | CANCELLED → DELIVERY_HANDOFF`

| State | Owner/actor | Entry evidence | Allowed next | Validation | Next action | Timer (PROPOSED) |
|---|---|---|---|---|---|---|
| SUBMITTED | System | Valid payload, bot check, idempotency key | INITIAL_QUALIFICATION | Schema, rate limit | Auto-ack | — |
| INITIAL_QUALIFICATION | Engineer | — | NEEDS_INFO, QUALIFIED, LOST (declined), CANCELLED (spam) | Decline/spam requires a reason code | Triage | 1 business day to first human response |
| NEEDS_INFO | Engineer | Question sent | INITIAL_QUALIFICATION, LOST (no response) | — | Await reply | Paused. Auto-reminder at 5 days. Close at 21 days (OPEN) |
| QUALIFIED | Engineer | Checklist + advisory score + capacity check | ENGINEERING_REVIEW, ON_HOLD | Score factors recorded | Assign engineer | 3 business days |
| ENGINEERING_REVIEW | Engineer | Scope notes | FREE_CONSULTATION, PAID_SITE_SURVEY, PROPOSAL_DRAFT, ON_HOLD, LOST | — | Plan | — |
| FREE_CONSULTATION | Engineer | Meeting record (date, attendees, approved notes) | PAID_SITE_SURVEY, PROPOSAL_DRAFT, ON_HOLD, LOST | Notes required to exit | — | — |
| PAID_SITE_SURVEY | Engineer + owner | **Accepted fee agreement + invoice ref** | PROPOSAL_DRAFT, ON_HOLD, LOST | Payment status recorded (survey fee accounting OPEN) | Survey report | — |
| PROPOSAL_DRAFT | Engineer | Version n created | PROPOSAL_APPROVED | Line items, exclusions, validity date, currency | Internal review | — |
| PROPOSAL_APPROVED | Approver (owner. Single-actor exception logged) | Approval record | PROPOSAL_SENT, PROPOSAL_DRAFT (rework) | Approver ≠ author when possible | Send | — |
| PROPOSAL_SENT | Engineer | Delivery record | NEGOTIATION, WON_SIGNED, LOST, ON_HOLD | Validity not expired | Follow-up | Reminder at 7 days |
| NEGOTIATION | Engineer/owner | — | PROPOSAL_DRAFT (new version), WON_SIGNED, LOST, ON_HOLD | — | — | — |
| WON_SIGNED | Authorised role | **Signed document + value + currency + signed date + accepted proposal version** | DELIVERY_HANDOFF | Contract record created. Attribution frozen. Cohort evaluated | Handoff | — |
| LOST | Engineer | Reason code + text | INITIAL_QUALIFICATION (reopen with reason) | — | — | — |
| ON_HOLD | Engineer | Reason + follow-up date | previous state | — | Reminder | On the follow-up date |
| CANCELLED | Engineer/owner | Reason (spam, duplicate merged, withdrawn) | — | — | — | — |
| DELIVERY_HANDOFF | Engineer/ops | Checklist + ops owner | — (opportunity closed. Contract lives on) | — | ClickUp manual entry | — |

**Guards against stage skipping:** the server rejects transitions not in "Allowed next". Backward moves need a reason. `WON_SIGNED` is impossible without the contract evidence fields. Proposal approval is required before sending.

## 3. Proposal and contract model
| Object | Key rules |
|---|---|
| Proposal | Versioned. One current version. Fields: line items (catalogue SKU / standard option / quoted service), technical annexes (private files), scope exclusions, assumptions, validity date, currency (EGP default), tax treatment flag (OPEN), approval record, customer response. An accepted version is immutable |
| Contract | `CTR-` reference, organisation, opportunity, accepted proposal version, signed date, evidence file, `signed_value_at_signature` (pre-tax, PROPOSED), currency + FX snapshot, milestones (optional), status ACTIVE / AMENDED / CANCELLED / COMPLETED |
| Amendment / variation | Separate signed record: ±delta, effective date, evidence, reason. Updates `current_net_value`. The original is never overwritten |
| Cancellation | Full or partial: effective date, reason, evidence, recognition adjustment (doc 07) |
| Master/child | Child contracts link to a master framework. Counting rule OPEN (doc 07 §6) |
| Delivery capacity check | Required checkbox + note at PROPOSAL_APPROVED: installation window vs known capacity (data OPEN) |

**Website admin vs manual/ClickUp:**
- Website admin owns the RFQ, opportunity, proposal metadata/files, contract record, attribution and audit.
- ClickUp (manual) owns delivery task management, scheduling and site execution.
- The website produces a copyable handoff summary with no file links.

## 4. Fraud and error prevention
| Risk | Control |
|---|---|
| Fake/spam RFQs | Bot protection, rate limits, honeypot, triage "spam" reason |
| Duplicate submissions | Idempotency key. Dedupe suggestions |
| Public exposure of plans | Private storage, signed URLs, no email attachments, RBAC |
| Accidental contract-value change | Value editable only through an amendment record. Re-authentication. Audit |
| Stage skipping | Server-side transition table |
| Impersonating an organisation | No self-service org accounts in PV. Staff verify legitimacy at qualification |
| Insecure merging | Reversible merges. Merge requires engineer/owner role. Audit |

## 5. User stories (conditions of satisfaction + unhappy paths)
| ID | Story | Conditions of satisfaction | Unhappy paths |
|---|---|---|---|
| RFQ-US-01 | As a developer, I submit a short project brief in Arabic so OTONOM can assess fit | Step 1 ≤ 11 fields. Reference shown. AR acknowledgement | Invalid phone → localized error. Network drop → draft preserved. Double click → one RFQ |
| RFQ-US-02 | As a contractor, I add optional details later in the same session | Step 2 saved to the same RFQ | Session expired → resubmission returns the same reference (idempotent) |
| RFQ-US-03 | As a developer, I attach floor plans (P-B/CR) | Accepted types only. Scan status recorded | 30 MB DWG rejected with the limit. `.exe` renamed `.pdf` rejected. Infected file quarantined |
| RFQ-US-04 | As a homeowner, I book a free consultation without uploading anything | Consultation request created | Outside coverage → honest message, still recorded |
| RFQ-US-05 | As an engineer, I triage new RFQs by fit and region | Inbox sorted by score. Coverage flag | Decline without a reason → blocked |
| RFQ-US-06 | As an engineer, I merge a duplicate RFQ from a second contact of the same company | Merge with audit. Undo available | Merge across different projects → warning + reason |
| RFQ-US-07 | As an engineer, I request missing information | NEEDS_INFO with the timer paused | No reply in 21 days → LOST (no_response), reversible |
| RFQ-US-08 | As an engineer, I record a paid site survey | Requires an accepted fee + invoice ref | Missing fee agreement → transition blocked |
| RFQ-US-09 | As an engineer, I prepare proposal v2 after negotiation | v1 superseded, kept read-only | Editing an accepted version → blocked |
| RFQ-US-10 | As the owner, I approve a proposal before it is sent | Approval recorded. Single-actor flag if author = approver | Expired validity → must re-issue |
| RFQ-US-11 | As an authorised user, I record a signed contract | Evidence + value + date required. Attribution frozen | Missing evidence → blocked. Value typo → fix only via an amendment record |
| RFQ-US-12 | As an engineer, I hand off to delivery | Handoff summary generated. Ops owner set | Capacity conflict flagged |
| RFQ-US-13 | As a partner, I apply for partner terms | Partner inquiry record. Manual eligibility review | Public request for a price list → no prices exposed |

## 6. Permissions per action
| Action | Engineer | Owner/Admin | Editor | Store |
|---|---|---|---|---|
| View RFQ + files | Assigned / all (config) | ✅ | ❌ | ❌ |
| Transition states | ✅ (except approval/sign) | ✅ | ❌ | ❌ |
| Approve proposal | ❌ (configurable) | ✅ | ❌ | ❌ |
| Record contract | ❌ (configurable) | ✅ | ❌ | ❌ |
| Merge organisations | ✅ (audited) | ✅ | ❌ | ❌ |
| Change attribution | ❌ | ✅ (reason) | ❌ | ❌ |

## Sign-off (Wave 4)
No missing transition from lead to contract ✅ · Permissions per action ✅ · 13 stories ✅

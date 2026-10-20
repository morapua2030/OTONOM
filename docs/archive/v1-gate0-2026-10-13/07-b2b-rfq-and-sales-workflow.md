# 07 — B2B RFQ and Sales Workflow (DRAFT)

## 1. Two linked objects
- **RFQ** = an inbound submission (immutable payload + triage status).
- **Opportunity** = the sales process. Several RFQs, from duplicates or multiple contacts, can link to one opportunity. Attribution is classified **at opportunity level** (doc 09).

## 2. Opportunity state machine

| From | To | Optional? | Guard / approval | Side effects |
|---|---|---|---|---|
| (RFQ `Submitted`) | `New` (opportunity created) | — | Triage: not spam, not duplicate (or merged) | Attribution auto-proposal created |
| `New` | `Needs Information` | optional | — | Request info message logged |
| `New` / `Needs Information` | `Qualification` | — | — | — |
| `Qualification` | `Engineering Review` | — | Qualification checklist complete (budget fit, scope, region coverage, timeline) | `qualified_at` set → counts toward Qualified Pipeline |
| `Qualification` | `Lost` / `Disqualified` | — | Reason required | — |
| `Engineering Review` | `Consultation` | optional | — | Free intro call scheduled |
| `Consultation` / `Engineering Review` | `Site Survey` | optional | **Paid survey requires a written agreement** (fee + invoice ref) | Survey appointment, invoice ref |
| `Engineering Review` / `Consultation` / `Site Survey` | `Proposal` | — | Proposal v1 approved by the approver (D-022) | Proposal PDF stored |
| `Proposal` | `Negotiation` | optional | — | New proposal versions supersede old ones |
| `Proposal` / `Negotiation` | `Won` | — | Customer acceptance evidence | — |
| `Won` | `Signed Contract` | — | Contract record with signed document, value, currency, signature date | **Attribution locked** (changes now need an override). Cohort New/Existing frozen |
| `Signed Contract` | `Delivery Handoff` | — | Handoff checklist + manual ClickUp summary | — |
| any open stage | `On Hold` | — | Reason + review date | — |
| `On Hold` | previous stage | — | — | — |
| any open stage | `Lost` | — | Lost reason (enum + text) | — |

Rules:
- Backward moves are allowed but audited, with a reason.
- `Won` without a signed contract does **not** count in signed contract value.
- Reopening `Lost` creates an audit event. It does not create a new opportunity, unless the scope changed materially (judgment call, logged).

## 3. Duplicates and organisation matching
- **Duplicate RFQ detection (suggestion only, a human confirms):** same normalised email or phone within 90 days, **or** same organisation `normalized_key` + similar project text.
- **Organisation matching keys, in order of strength:** tax registration no. → commercial registry no. → normalised legal name + governorate → email domain (excluding free-mail domains). Final rules are OPEN (D-008).
- Merges keep both records (`duplicate_of`), move touchpoints, and write an audit event. Merges can be undone.
- Multiple contacts from one organisation link to the same opportunity when it is the same project, and get a new opportunity when it is a different project.

## 4. Free call vs paid site survey
- The free introductory call is a **service step only**, with no invoice.
- A paid site survey needs an explicit agreement (fee, scope, whether the fee is credited against a later contract: OPEN), an invoice reference, and a payment status. Survey revenue is **not** contract value unless finance decides otherwise (D-007).
- The website never shows a survey price until it is approved.

## 5. RFQ file uploads — PROPOSED policy (D-023)
| Aspect | Proposal |
|---|---|
| Accepted types | PDF; images (JPG, PNG, WEBP, HEIC); CAD: **DWG, DXF**; optionally **IFC, RVT, SKP** (OPEN, since large BIM files raise cost); ZIP **not** accepted at MVP (scanning complexity) |
| Validation | Extension allow-list + magic-byte sniffing + server-side size check. Reject double extensions and executables |
| Limits | 25 MB per file, 10 files, 100 MB per RFQ (tune after real samples) |
| Storage | Private bucket, random object keys, no public ACL. Pre-signed PUT into quarantine |
| Scanning | ClamAV worker. Status shown to the admin. Infected files are deleted and audited |
| Access | Admin only, short-lived signed GET, every download audited. No in-browser CAD rendering |
| Retention | doc 06 §4 |
| Customer communication | Privacy notice explains purpose, retention, and who sees the blueprints |

## 6. Assignment and SLA (proposals, targets OPEN)
| Event | Proposed target |
|---|---|
| RFQ acknowledgement (auto email) | immediate |
| First human response | 1 business day |
| Qualification decision | 3 business days |
| Proposal after required survey | 10 business days (project-dependent) |
SLA timers pause in `Needs Information` and `On Hold`.

## 7. Proposals
Versioned (v1, v2…). Exactly one `sent`/current version at a time. Sending requires approval (single-admin rule in doc 10 §6). PDF stored privately. Line items can reference catalogue variants or free-text engineering services.

## 8. Contracts, amendments, cancellations
- A contract requires: signed document (file), `signed_at`, value, currency, FX snapshot if not EGP, contract type.
- Amendments are separate records (delta + evidence). The original value is never overwritten.
- Cancellation: status + effective date + reason. Reporting treatment is OPEN (D-007): proposal = report gross signed value and cancellations as separate negative adjustments in the period they occur.

## 9. ClickUp handoff (manual)
"Copy handoff summary" button: generates structured text (customer, scope, contract ref, value, key files list as references, not file links, plus the engineer). It is pasted into ClickUp by hand. No API token is stored.

## 10. Acceptance tests (summary; full list in doc 12)
- AT-RFQ-01: valid AR and EN submissions create an RFQ with a ref and send an acknowledgement in the same locale.
- AT-RFQ-04..08: disallowed type, oversized file, executable renamed `.pdf`, direct object URL without signature → all rejected.
- AT-PRJ-01..04: illegal transitions are rejected server-side. Every transition writes an audit event.
- AT-PRJ-09: `Signed Contract` cannot be set without signature evidence + value.
- AT-ATT-08: changing attribution after signature without a reason fails. With a reason, it succeeds and records before/after.

# Warranty, Commissioning, Service and RMA

| Doc ID | OTONOM-DOC-13 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. Warranty duration BLOCKED |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Commissioning, warranty policy versioning and coverage, secure device ownership, the customer portal, service tickets and RMA. It also sets out the **first-launch packaging options**.

## 2. First-launch commitment and packaging options
The owner requires a warranty and service portal **from the first commercial release** (DR-025). The earlier v1 proposal to defer it to "MVP-C" with a contact-form bridge is **withdrawn as a default** (doc 02, C-01).

| Option | Description | Pros | Cons | Status |
|---|---|---|---|---|
| **W1** (requirement-preserving) | No public commercial launch until a minimal but **genuine** portal works: verified ownership, commissioning-based coverage record, ticket + RMA intake/status | Consistent trust, honours the requirement | Longer time to first commercial release | **Recommended** for the commercial launch |
| **W2** (trade-off, needs approval) | Earlier *B2B marketing/RFQ preview* goes live without store checkout and without shipping serialised products through the platform. Warranty is handled by assisted support (phone/email) until the portal ships. **Never called a portal** | Earlier lead generation | Not the full commercial launch. Must be labelled "preview" | PROPOSED exception |

## 3. Warranty policy model
- `WarrantyPolicyVersion`: version, effective_from, `duration_months` (**NULL until approved**), start rule, exclusions{ar,en}, transfer rule, replacement-coverage rule, approved_by/at, legal review ref.
- Owner statement: "more than two years". **Not adopted.** The system must never fabricate 2, 3 or 5 years, or lifetime.
- While unapproved, coverage is `PENDING_POLICY_APPROVAL`. The UI says "Registered — warranty terms pending confirmation", with **no end date**.
- Start event: `commissioned_at` (DR-023). Rules OPEN for:
  - delayed installation (cap on the gap between delivery and commissioning?)
  - units sold without OTONOM installation (DR-057)
  - technician rescheduling
  - replacement units (remaining vs new coverage)
  - ownership transfer
  - exclusions for travel, consumables, misuse, external electrical events

## 4. Commissioning
`CommissioningRecord`: unit, site (private), technician, installed_at, commissioned_at, checklist result, evidence (photo/form, private), customer acknowledgement (OPEN), firmware version. It must work **offline** (no assumption that the device can be validated online on site): data is captured on site and synced later, with conflict handling.

## 5. Secure device ownership
A serial alone never grants access. Ownership is established through one of:
1. Order link: an authenticated customer whose verified email/phone matches the order.
2. Installer commissioning record naming the customer account.
3. One-time claim code delivered with the unit or by the technician (if the owner approves producing codes).
4. Human review for legacy devices, with evidence (invoice, photo).

Object-level authorisation applies to every request. Precise installation addresses and maps are never public. Staff access is need-to-know.

## 6. Service and RMA states
```text
Coverage: DEVICE_PENDING_COMMISSIONING → COMMISSIONED → WARRANTY_EVALUATION_PENDING → COVERED | OUT_OF_COVERAGE | UNDETERMINED (incl. PENDING_POLICY_APPROVAL)

Service: SERVICE_DRAFT → SERVICE_SUBMITTED → TRIAGE ⇄ MORE_INFORMATION_REQUIRED → ENGINEER_ASSIGNED → DIAGNOSIS
       → RMA_APPROVED | RMA_DECLINED | ONSITE_VISIT_REQUIRED → REPAIR_IN_PROGRESS | REPLACEMENT_IN_PROGRESS
       → RESOLVED → CUSTOMER_CONFIRMED | CLOSED   (+ REOPENED → TRIAGE, + ESCALATED from any open state)
```
| Exception | Rule |
|---|---|
| No customer response | Auto-reminder, then `CLOSED` (reason "no response") after N days (OPEN) |
| Repeated fault | Flag after the 2nd ticket on the same unit within 90 days. Escalate |
| Reopened ticket | Allowed within N days of closure. Audit |
| Missing proof | Stays `UNDETERMINED`. Customer told what is needed |
| **Safety symptom** (burning smell, sparks, gas alarm issues) | The form shows a prominent instruction: disconnect power if safe, contact emergency services / gas company / a qualified electrician. Ticket marked urgent for human callback. **The website is not an emergency system** |
| Conflicting technician updates | Optimistic revision. The later writer must merge |
| Disputed closure | Customer can dispute → `REOPENED` + escalation |

## 7. Portal page contracts
| Route | Shows | Never shows |
|---|---|---|
| `/account/devices` | Verified devices: model, masked serial (e.g. last 4), site nickname, commission date | Others' devices, full address publicly |
| `/account/warranties` | Coverage status from the approved policy. Dates only when the policy is approved | Invented end dates |
| `/account/service-requests` | Own tickets, customer-visible events, uploads, contact preferences | Internal notes, wiring diagrams marked internal |
| `/account/service-requests/[id]` | Status timeline, replies, authorised documents | Staff-only diagnosis |
| `/support/warranty` | Public policy version (once approved) + contact | Draft policy text |

## 8. Replacement lineage
`ReplacementLink(old_unit, new_unit, rma_id, coverage_rule_applied)`. The new unit inherits the remaining coverage or gets new coverage, per policy (OPEN). Both units keep their history.

## 9. Privacy and retention
Least privilege · server-side ownership checks · access logs on sensitive documents · retention per legal review · account deletion must not erase statutory service/warranty records (anonymise the account link and keep the obligations: legal to confirm).

## 10. Acceptance scenarios
WAR-AT-001 (stranger can't claim a device by serial) · WAR-AT-002 (no fabricated expiry) · WAR-AT-003 (replacement lineage) · empty-state with claim path · attachment scan failure keeps the ticket safe · staff-only notes hidden · account deletion keeps obligations.

## 11. Edge cases (master §17.3)
| Case | Handling | Status |
|---|---|---|
| Commissioned months after purchase | Start rule OPEN (DR-057) | OPEN |
| Never commissioned / disputed date | `UNDETERMINED` + evidence request | COVERED |
| Property sold/rented | Ownership transfer workflow (policy OPEN). Tenants can be added as a "site user" without ownership | PARTIAL |
| Installer recorded the wrong serial | Correction with audit (doc 12 §9) | COVERED |
| External electrical damage | Diagnosis outcome + exclusion reference | OPEN (policy) |
| Safety alarm report | §6 safety rule | COVERED |
| Internal wiring diagram uploaded by staff | Attachment visibility flag defaults to `INTERNAL` | COVERED |
| Account removal with active obligations | §9 | COVERED (legal OPEN) |
| Multiple technicians | Revisioned updates | COVERED |
| Disputed closure | Reopen/escalate | COVERED |

## 12. Inputs required
Signed warranty policy (E-04), RMA SOP (E-05), claim-code feasibility (ENG), legacy device list (OPS).

## Change log
2.0-draft, 2026-10-13: created. W1/W2 options. The v1 deferral is withdrawn.

## Next review decision
The owner chooses W1 or W2 (tied to DR-041) and supplies the warranty policy and RMA SOP.

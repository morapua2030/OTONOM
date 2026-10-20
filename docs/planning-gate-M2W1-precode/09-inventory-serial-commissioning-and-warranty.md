# 09 — Inventory, Serials, Commissioning and Warranty

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. CR scope. W1 binding |
|---|---|---|---|---|---|---|---|

## 1. SKU and variant policy (PROPOSED)
- **Scheme proposal:** `OTN-RC{04|06|16}-{HWREV}-{VARIANT}` (e.g. `OTN-RC06-A-STD`). Owner approval required (DR-016).
- A **variant** = a physical/standard build difference that changes stock (enclosure, power supply). Options that don't change the physical unit are order-line options, not SKUs.
- **Custom firmware never creates a new SKU by default.** The unit keeps its SKU. `firmware_profile` is recorded on the serial at allocation/commissioning.
- Custom jobs carry a `custom_job_id` on the order line/quote for traceability.

## 2. Stock model and invariants
Quantities per SKU × location:
- `on_hand_saleable`
- `reserved` (confirmed orders, not yet allocated)
- `allocated` (serials picked)
- `quarantine`
- `returned_pending_inspection`
- `in_service` (RMA)

Derived: `available = on_hand_saleable − reserved − allocated`.

| ID | Invariant |
|---|---|
| INV-1 | `available ≥ 0` always (DB constraint + conditional update) |
| INV-2 | Confirmation and reservation commit in one transaction, or neither does |
| INV-3 | A replayed confirmation (same idempotency key / order revision) never reserves twice |
| INV-4 | Release happens once. Reservation status `ACTIVE→RELEASED` is a guarded transition |
| INV-5 | A serial has at most one active allocation |
| INV-6 | Every quantity change is an append-only ledger entry with type, actor, reason and reference |
| INV-7 | Conservation: Σ ledger movements = current quantities. A daily reconciliation detects drift and alerts, never auto-fixes |
| INV-8 | Returned units become saleable only after an inspection disposition |

Ledger movement types: RECEIPT · QA_PASS · QA_FAIL · RESERVE · RELEASE · ALLOCATE · DEALLOCATE · SHIP · RETURN_RECEIVED · RESTOCK · QUARANTINE · SCRAP · ADJUSTMENT (reason + approver) · REPLACEMENT_OUT.

### 2.1 Reservation algorithm (pseudocode, not executable)
```text
confirmOrder(orderId, expectedRevision, idempotencyKey, actor):
  if idempotency record exists for key -> return stored result
  BEGIN TRANSACTION (isolation sufficient to prevent lost updates)
    load order FOR UPDATE; require status = PENDING_REVIEW/QUOTE_ACCEPTED and revision = expectedRevision
    for each line:
      conditional decrement: reserved += qty WHERE available >= qty  (per SKU+location)
      if 0 rows affected -> ROLLBACK; return OUT_OF_STOCK_ON_CONFIRM(line)
      insert reservation(ACTIVE), insert ledger(RESERVE)
    set order CONFIRMED, revision+1; insert audit event; store idempotency result
  COMMIT
```
Worker retries (e.g. the reservation-expiry job) use the same guarded transitions, so re-running them is safe.

## 3. Serial lifecycle and provenance
`RECEIVED → QA_PENDING → QA_PASSED | QA_FAILED → AVAILABLE → ALLOCATED → SHIPPED | INSTALLED → COMMISSIONED → (warranty per policy) → IN_SERVICE → REPAIRED | REPLACED → RETURNED → (refurbished AVAILABLE | SCRAPPED) → RETIRED`

| Topic | Requirement | Status |
|---|---|---|
| Electronic identity source | Firmware/NVS, MCU unique ID or cloud registry | **SOURCE MISSING** (engineering) |
| Immutability | Must survive a firmware reflash. If not, a mapping table between the label and the electronic ID is needed | OPEN |
| Retrieval | Technician reads it on site, ideally offline (app/Bluetooth/label QR) | OPEN |
| Uniqueness | Unique normalised serial. Duplicates → quarantine + engineering ticket | APPROVED (need) |
| Firmware traceability | `firmware_version` + `firmware_profile` captured at allocation and at commissioning | PROPOSED |
| Ownership | Time-bounded ownership records. Exactly one active owner. Transfer workflow | PROPOSED |

## 4. Commissioning
- Record: serial(s), site (private), installer/technician, `installed_at`, `commissioned_at`, checklist result, evidence (photo/form, private), firmware, customer acknowledgement (OPEN).
- **Offline-capable capture:** the technician may lack connectivity on site. The form must support capture-now-sync-later, with conflict detection (later implementation).
- Proposed rule to prevent indefinite unactivated warranty (**legal review required**): if a unit isn't commissioned within X days of delivery (X OPEN), coverage starts at delivery + X. Alternatively, for non-installed retail units, coverage starts at the customer's self-registration with proof of purchase.

## 5. Warranty (W1)
| Element | Rule |
|---|---|
| Policy | Versioned `WarrantyPolicy`: duration, start rule, exclusions, transfer, replacement coverage, approval record. **Duration not approved → `DURATION_UNAPPROVED`** |
| Coverage record | `COVERAGE_PENDING` (no commissioning yet) → `COVERAGE_ACTIVE` (commissioned + approved policy) → `COVERAGE_EXPIRED` / `VOID` (per policy) |
| Live selling | Not allowed while the policy is `DURATION_UNAPPROVED` (G-4) |
| Display | End date shown **only** from an approved policy. Never computed from a default |
| Ownership proof | Order match (verified email/phone) · commissioning record naming the customer · one-time claim code (if produced) · human review for legacy devices |
| Serial ≠ credential | Entering a serial alone never reveals data or grants a claim |

### 5.1 Service/RMA states
`SUBMITTED → TRIAGE ⇄ INFO_REQUIRED → REMOTE_TROUBLESHOOTING → (RESOLVED) | ONSITE_VISIT | RMA_APPROVED | RMA_DECLINED → RECEIVED → DIAGNOSED (fault class) → REPAIR | REPLACE | REFUND (policy) | REJECT (out of coverage/misuse) → RETURNED_TO_CUSTOMER → RESOLVED → CLOSED` (plus `REOPENED`, `ESCALATED`)

**Fault classes (proposed):** manufacturing defect · firmware defect · installation fault · external electrical event · misuse/physical damage · no fault found.

**Qualified technicians:** only Engineer-role users can set DIAGNOSED outcomes. The customer sees simplified statuses.

### 5.2 Separation from IoT control
The portal shows ownership, coverage and tickets. It **never** controls devices, never displays device credentials, and never exposes home network details.

## 6. Edge cases (≥ 15)
| # | Case | Handling | Status |
|---|---|---|---|
| W-01 | Concurrent purchase of the last unit | INV-1/2. One succeeds | Designed |
| W-02 | Partial shipment | Allocation per shipped quantity. Remaining reserved | Designed |
| W-03 | Damaged return | `returned_pending_inspection` → disposition | Designed |
| W-04 | Warranty transfer on property sale | Ownership transfer request + proof. Old owner loses access. Coverage continues per policy | Policy OPEN |
| W-05 | Lost serial label | Electronic ID read by a technician. Label reissue with audit | Depends on the serial method |
| W-06 | Duplicate serial detected | Quarantine both, engineering ticket, block claims | Designed |
| W-07 | Delayed commissioning (months after delivery) | §4 proposed rule | Legal OPEN |
| W-08 | Gas/safety alarm-related ticket | Safety guidance shown. Urgent flag. Human callback. The site is not an emergency service | Designed |
| W-09 | Technician rework (wrong wiring found) | Ticket class "installation fault". Internal cost. Coverage unaffected | Designed |
| W-10 | Installer recorded the wrong serial | Correction record (old/new, reason). Links updated | Designed |
| W-11 | Reflash changes the electronic ID | Mapping table + engineering check | OPEN |
| W-12 | Replacement unit coverage | Inherit remaining or new term per policy | Policy OPEN |
| W-13 | Legacy pre-platform device claim | Human review with invoice/photo | Designed |
| W-14 | Customer deletes the account | Ownership anonymised. Warranty/service records retained per legal | Legal OPEN |
| W-15 | Ticket reopened after closure | Within N days → REOPENED. Else new ticket linked | Designed |
| W-16 | Unit sold without installation (retail DIY with electrician) | Coverage start by self-registration + proof (policy OPEN) | OPEN |
| W-17 | Reservation-expiry job runs twice | Guarded release (INV-4) | Designed |
| W-18 | Cancel after allocation | DEALLOCATE + RELEASE exactly once | Designed |

## 7. Planned tests (NOT EXECUTED)
INV-T01 concurrency on the last unit · INV-T02 replay confirmation · INV-T03 double release · INV-T04 reconciliation drift detection · SER-T01 duplicate serial · SER-T02 lineage (order → commissioning → coverage → RMA → replacement) · WAR-T01 serial-only claim denied · WAR-T02 no end date without an approved policy · WAR-T03 live selling blocked when the policy is unapproved (configuration gate) · WAR-T04 internal notes hidden · WAR-T05 safety ticket flagged.

## Sign-off (Wave 6b)
Invariants explicit ✅ · ≥ 15 edge cases (18) ✅ · No invented warranty duration ✅ · IoT control separated ✅

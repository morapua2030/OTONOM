# Inventory, Reservations and Serialised Units

| Doc ID | OTONOM-DOC-12 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Stock accounting states, ledger mechanics, transactional reservation, release and expiry, reconciliation, and the serialised unit lifecycle with uniqueness and traceability.

## 2. Stock quantities (per SKU × location)
| Quantity | Meaning |
|---|---|
| `physical_on_hand` | Units physically held in a saleable or non-saleable condition |
| `held_reservations` | Quantity reserved by confirmed orders, not yet allocated |
| `allocatable_available` | `saleable_on_hand − held_reservations − allocated_for_fulfillment` (must stay ≥ 0) |
| `allocated_for_fulfillment` | Specific units picked/assigned to order lines |
| `damaged_quarantined` | Not saleable. Awaiting decision |
| `returned_pending_inspection` | Returned. Not saleable until QA disposition |
| `in_service` | Units in RMA/repair (company-held) |

## 3. Ledger
Append-only `inventory_ledger` entries: `RECEIPT`, `QA_PASS`, `QA_FAIL`, `RESERVE`, `RELEASE`, `ALLOCATE`, `DEALLOCATE`, `SHIP`, `RETURN_RECEIVED`, `RETURN_TO_STOCK`, `QUARANTINE`, `SCRAP`, `ADJUSTMENT` (needs reason + actor + approver), `REPLACEMENT_OUT`. A `stock_levels` projection is updated in the **same transaction**, with DB CHECK constraints (`>= 0`).

## 4. Transaction invariants
| # | Invariant | Mechanism (to prove in the spike) |
|---|---|---|
| I-1 | Available quantity never < 0 | Conditional update `... WHERE allocatable_available >= :q` or row lock + CHECK constraint |
| I-2 | Confirmation and reservation commit together or not at all | Single DB transaction |
| I-3 | Confirming twice never reserves twice | Idempotency key + order status/revision guard |
| I-4 | Releasing twice never increments twice | Reservation status `ACTIVE → RELEASED` guarded update |
| I-5 | One unit can't be allocated to two orders | Partial unique index on active allocation per unit |
| I-6 | Adjustments have reason, actor and audit | Domain service enforces. DB role prevents direct writes |
| I-7 | Out-of-stock is explicit | Confirmation returns `OUT_OF_STOCK`. No silent oversell |
| I-8 | Serials are unique | Unique constraint on normalised serial |

Illustrative SQL (concept only):
```sql
UPDATE stock_levels SET held_reservations = held_reservations + :q
 WHERE sku_id = :sku AND location_id = :loc
   AND saleable_on_hand - held_reservations - allocated_for_fulfillment >= :q;  -- 0 rows ⇒ OUT_OF_STOCK ⇒ ROLLBACK
```

## 5. Serialised unit lifecycle
```text
RECEIVED → QA_PENDING → QA_PASSED | QA_FAILED(→ QUARANTINE/SCRAP)
QA_PASSED → AVAILABLE → (RESERVED: quantity-level, optional unit-level) → ALLOCATED_TO_ORDER (picked)
→ SHIPPED | INSTALLED → COMMISSIONED → WARRANTY_ACTIVE (under approved policy) / WARRANTY_PENDING_POLICY
→ SERVICE → RMA → REPAIRED (back to customer) | REPLACED (→ RETURNED → QA → AVAILABLE(refurb flag) | SCRAPPED) → RETIRED
```
- **Electronic ID source:** firmware/NVS, MCU unique ID or cloud registry is unknown. **Verify** (DR-018).
- Requirements: readable by an authorised technician offline, stable across firmware reflash, never duplicated on replacement, reconciled with physical label/QR (if any).
- A serial is an **identifier, not a credential**. It never proves ownership.

## 6. Traceability links
`SerializedUnit` ↔ `OrderLine` (allocation) ↔ `Shipment` / `CommissioningRecord` ↔ `DeviceOwnershipRecord` ↔ `WarrantyCoverage` ↔ `ServiceTicket` / `RMA` ↔ `ReplacementLink`. All are time-bounded (ownership and allocation can change), so the model avoids naive 1:1 constraints.

## 7. Reconciliation and jobs
| Job | Frequency | Behaviour |
|---|---|---|
| Ledger vs projection reconcile | Daily | Recompute from the ledger. Alert on mismatch. Never auto-fix silently |
| Reservation expiry | Every 15 min (proposal) | Idempotent release. Runs safely if executed twice |
| Physical count | Monthly | Adjustments with reasons + approver |
| Serial duplicate scan | On import + daily | Duplicates → quarantine + alert |

## 8. Acceptance scenarios
STOCK-AT-001 (two concurrent confirmations for the last 16CH unit → exactly one succeeds) · STOCK-AT-002 (retry → no duplicate) · STOCK-AT-003 (cancel → exactly one release) · SERIAL-AT-001 (duplicate serial rejected/quarantined) · SERIAL-AT-002 (full lineage order → commissioning → warranty → RMA) · return increases availability only after QA disposition · cancellation after allocation reverses allocation and reservation exactly once.

## 9. Edge cases (master §17.2)
| Case | Handling | Status |
|---|---|---|
| Replacement shipped without a new sale | `REPLACEMENT_OUT` ledger entry linked to RMA. Warranty lineage | COVERED |
| A unit in service accidentally made saleable by a return adjustment | Only `QA_PASSED` units can enter AVAILABLE. Units with an open RMA are blocked | COVERED |
| Reflash causes a duplicate ID or mismatch | Unique constraint + quarantine + technician correction workflow with audit | COVERED (mechanism OPEN) |
| Installer records the wrong serial, corrects it later | Correction record (old/new, reason, actor). Downstream links updated | COVERED |
| Expiry job runs twice | Guarded update (I-4) | COVERED |

## 10. Inputs required
Initial stock counts and locations (E-10), SKU scheme (E-07), serial generation/read method (E-11).

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
ENG documents the serial mechanism. OPS confirms the stock locations and QA step.

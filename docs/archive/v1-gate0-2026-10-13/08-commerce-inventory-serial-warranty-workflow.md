# 08 — Commerce, Inventory, Serial, Warranty and RMA Workflow (DRAFT)

## 1. Catalogue structure
| Concept | Definition | Example (illustrative, not approved) |
|---|---|---|
| Product | Marketing-level item | "OTONOM Smart Relay Controller" |
| Model | Hardware family | 4CH, 6CH, 16CH |
| Variant / SKU | Purchasable unit with fixed options | `OTN-RC-04-…` (**format OPEN, D-009**) |
| Standard option | Priced, no engineering review | e.g. enclosure type, power supply (OPEN) |
| Firmware customisation | **Not purchasable directly** → quote | — |
| Integration service | **Quote only** | — |
| Price component | base price, option surcharge, shipping fee, (tax treatment OPEN) | — |
| Installation | Project-dependent → quote. Never an automatic cart price | — |

## 2. Order types and confirmation triggers (PROPOSED, D-010)
| Order type | Created by | What "Confirmed" means | Confirmed by |
|---|---|---|---|
| `STANDARD` (shop checkout) | Customer | Stock available **and** (COD: phone/WhatsApp verification done) **or** (bank/e-wallet: payment verified, or admin accepts pending payment) | Admin action |
| `CUSTOM_QUOTED` | Admin from an accepted quote | Quote accepted + deposit received (deposit % OPEN) | Admin |
| `PROJECT_SUPPLY` | Admin from a signed contract | Contract signed + delivery schedule agreed | Admin |

### Order state machine
```
Cart ──submit──► Submitted ──► PendingReview ──► AwaitingPayment? ──► Confirmed ──► (Reserved) ──► Fulfilment ──► Shipped ──► Delivered ──► Completed
                    │               │                  │                 │                                   │
                    └──► Cancelled ◄┴──────────────────┴── (expiry) ─────┴─► Cancelled (release reservation)  └─► Installed (if installation) ─► Completed
                                                                           Delivered/Completed ─► ReturnRequested ─► Returned / Refunded (manual)
```
- **Reservation happens exactly at the `Confirmed` transition**, atomically with it (brief requirement). `Reserved` is not a separate user-visible step. It is a property of `Confirmed` orders.
- Submitted orders that are never confirmed expire after N days (proposal: 3 days for bank/e-wallet without proof, 2 days for unreachable COD). They are cancelled with **no stock impact**.
- Confirmed orders that are later cancelled release their reservations through `RELEASE` ledger entries.

## 3. Out-of-stock and concurrency
- At submission: soft check only (show "available / limited / on request"). The order is still accepted if the policy allows backorder (OPEN, proposal: no backorder for STANDARD).
- At confirmation: **hard check inside the transaction.** If stock is insufficient → confirmation fails with a clear admin message (options: partial, wait, cancel). No oversell is possible.
- Two admins confirming at the same time: the conditional update guarantees that only one succeeds when stock is short.

## 4. Inventory ledger mechanics
```sql
-- inside one transaction, per order line:
UPDATE stock_levels SET reserved = reserved + :qty
 WHERE variant_id = :v AND location_id = :loc AND on_hand - reserved >= :qty;   -- 0 rows → insufficient stock → ROLLBACK
INSERT INTO inventory_ledger (type, qty, variant_id, location_id, reference_type, reference_id, actor_id) VALUES ('RESERVE', :qty, ...);
INSERT INTO reservations (...); INSERT INTO audit_events (...);
UPDATE orders SET status = 'CONFIRMED', confirmed_at = now(), confirmed_by = :actor WHERE id = :o AND status IN ('PENDING_REVIEW','AWAITING_PAYMENT');
```
| Event | Ledger entries | on_hand | reserved |
|---|---|---|---|
| Goods receipt | `RECEIPT +q` | +q | — |
| Confirm order | `RESERVE q` | — | +q |
| Cancel confirmed order | `RELEASE q` | — | −q |
| Ship / fulfil | `FULFIL q` (consumes reservation) | −q | −q |
| Customer return accepted to stock | `RETURN +q` | +q | — |
| Scrap / damage | `SCRAP q` | −q | — |
| Stock count correction | `ADJUSTMENT ±q` + reason + approver | ±q | — |

- **Reconciliation job (daily):** recompute `stock_levels` from the ledger and alert on any mismatch. Monthly physical count produces `ADJUSTMENT`s with reasons.
- **Idempotency:** submission keyed by `idempotency_key`. Confirmation is idempotent through a status guard (`WHERE status IN (...)`).

## 5. Manual payment verification (no gateway)
| Method | Flow | Verification evidence |
|---|---|---|
| COD | Confirm by phone/WhatsApp → ship → courier collects → mark `verified` on remittance | Courier remittance reference |
| Bank transfer | Show bank details **only after order submission** → customer uploads proof (optional) → admin matches the bank statement | Bank statement line ref + proof file |
| E-wallet (provider OPEN, e.g. InstaPay / mobile wallets) | Same as bank transfer | Transaction ref |
- An uploaded proof is **not** proof of payment. Only a matched statement line is. The status changes `pending → verified` with `verified_by`, and the action is audited.
- Refunds are manual. A refund record links to the payment, with a reason and an approver.

## 6. Serial number lifecycle
```
in_stock ─allocate(order line / project)─► allocated ─ship─► shipped ─commission─► installed
   ▲                                          │                                   │
   └──────────── deallocate (audited) ◄───────┘                     RMA ─► returned ─► (refurbished→in_stock | scrapped)
```
- Serials are allocated during fulfilment (picking), by scan or manual entry. Variant/serial mismatches are rejected.
- A partial unique index guarantees **one active assignment per serial**.
- Commissioning record: installed_at, commissioned_at, technician, site ref, optional evidence (checklist/photo). **Warranty starts at `commissioned_at`** (brief), or a fallback rule for non-installed retail units (OPEN: e.g. delivery date).

## 7. Shipping and installation
- Shipping fee by governorate zone table (amounts OPEN). The fee is a separate order line, so it is not mixed with product revenue.
- Installation is always a quote. Installation capacity limits are shown on the site as "subject to scheduling" (D-020).

## 8. Warranty
- `WarrantyPolicy` is versioned. Each coverage records the policy version in force at commissioning.
- **`duration_months` stays NULL until approved (D-011).** While it is NULL, the portal shows "Warranty registered — terms to be confirmed" and never shows an end date.
- Ownership: device registration through an order match (email/phone + order ref) or admin verification. Transfers between owners are audited (OPEN whether they are allowed).

## 9. RMA lifecycle
```
Requested ─► Triage ─► (Remote troubleshooting resolved → Closed)
                 └──► Approved for return ─► Received ─► Diagnosis ─► Repair | Replace | Refund | Reject(out of warranty / misuse)
                                                             └─► Shipped back ─► Closed      Escalation: any state ─► Escalated (owner + due date)
```
- A replacement creates a new serial assignment. The old serial goes `returned`, then gets a disposition.
- Every state change is audited. Customer-visible statuses are a simplified mapping.
- The existing OTONOM RMA documents must be reviewed so that this flow can be aligned with them (doc 15).

## 10. Acceptance tests (summary)
AT-INV-01 no oversell under 50 concurrent confirmations · AT-INV-02 ledger and projection reconcile · AT-INV-03 cancel releases exactly once · AT-COM-04 replayed submission returns the same order · AT-COM-05 client-sent price ignored · AT-SER-02 a serial cannot have two active assignments · AT-WAR-04 coverage not displayed with an end date while duration is NULL · AT-WAR-07 RMA replacement links old and new serials.

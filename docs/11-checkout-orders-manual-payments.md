# Checkout, Orders and Manual Payments

| Doc ID | OTONOM-DOC-11 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Cart and checkout behaviour, the order state machine with exceptions, confirmation rules per order type, COD/bank/wallet handling, order-status security and idempotency. Stock mechanics are in doc 12.

## 2. Order types
| Type | Origin | Confirmation meaning |
|---|---|---|
| `STANDARD` | Shop checkout (standard SKUs/options only) | Staff-approved: stock available, customer verified per method, price accepted |
| `CUSTOM_QUOTED` | Accepted `PriceQuote` | Engineer + customer approval, deposit rule (OPEN) satisfied |
| `PROJECT_SUPPLY` | Signed contract | Contract signed + delivery schedule agreed |

## 3. State machine
### 3.1 Main path
```text
CART → CHECKOUT_DRAFT → SUBMITTED → [CUSTOMER_VERIFICATION_PENDING] → STAFF_REVIEW_PENDING
     → [QUOTATION_REQUIRED → CUSTOMER_PRICE_ACCEPTANCE_PENDING] → CONFIRMED ⇒ STOCK_RESERVED (same transaction)
     → [PAYMENT_PENDING | PAYMENT_VERIFICATION_PENDING] → FULFILLMENT_PENDING → PICKED_SERIALS_ASSIGNED
     → SHIPPED | SCHEDULED_FOR_INSTALLATION → DELIVERED | COMMISSIONED → COMPLETED
```
### 3.2 Transition table (key rows)
| From | To | Actor | Guard | Side effects |
|---|---|---|---|---|
| CHECKOUT_DRAFT | SUBMITTED | Customer | Valid payload. Server re-priced. Idempotency key unique. Terms + privacy consent | Order ref (non-sequential), ack message |
| SUBMITTED | CUSTOMER_VERIFICATION_PENDING | System | Method requires verification (e.g. COD phone check) | OTP/call task |
| SUBMITTED / CUSTOMER_VERIFICATION_PENDING | STAFF_REVIEW_PENDING | System/Staff | — | — |
| STAFF_REVIEW_PENDING | QUOTATION_REQUIRED | Staff | A custom element is detected | Quote created |
| QUOTATION_REQUIRED | CUSTOMER_PRICE_ACCEPTANCE_PENDING | Staff | Quote approved by engineer | Quote sent |
| STAFF_REVIEW_PENDING / CUSTOMER_PRICE_ACCEPTANCE_PENDING | CONFIRMED (+STOCK_RESERVED) | Store operator | `expectedOrderRevision` matches. Price accepted. **Reservation succeeds atomically** | Reservations, ledger entries, audit |
| CONFIRMED | PAYMENT_PENDING / PAYMENT_VERIFICATION_PENDING | System | Bank/wallet method | Payment instructions shown (from controlled config) |
| PAYMENT_VERIFICATION_PENDING | FULFILLMENT_PENDING | Store operator | Payment **verified** against financial records, or a policy allows fulfilment before verification (COD) | Payment record verified_by/at/ref |
| FULFILLMENT_PENDING | PICKED_SERIALS_ASSIGNED | Store operator | One unique serial per unit, SKU match | Serial assignments |
| PICKED_SERIALS_ASSIGNED | SHIPPED / SCHEDULED_FOR_INSTALLATION | Store/ops | — | Shipment or installation appointment |
| SHIPPED | DELIVERED | Ops/courier ref | — | — |
| SCHEDULED_FOR_INSTALLATION | COMMISSIONED | Technician | Commissioning record | Warranty evaluation triggered |
| DELIVERED / COMMISSIONED | COMPLETED | System/Staff | COD collected (if COD). Return window policy (OPEN) | — |

### 3.3 Exception states
| State | Entered from | Rule |
|---|---|---|
| `EXPIRED` | SUBMITTED…PENDING states | Auto after N days without verification/acceptance (proposal: 3 days bank/wallet, 2 days unreachable COD). No stock impact if not yet confirmed. **Release if confirmed** |
| `DECLINED` | STAFF_REVIEW_PENDING | Reason required |
| `CANCELLED` | Any pre-shipment state | Reason. Reservation released **exactly once** |
| `OUT_OF_STOCK` | Confirmation attempt | Confirmation fails cleanly. Options: wait / partial / cancel |
| `PAYMENT_REJECTED` | PAYMENT_VERIFICATION_PENDING | Reason. Customer can re-submit proof within the window |
| `PARTIALLY_FULFILLED` | FULFILLMENT_PENDING | Explicit split lines |
| `FAILED_FULFILLMENT` | SHIPPED | Courier failure/refused COD → release or return-to-stock per inspection |
| `RETURN_REQUESTED` → `RETURNED` | DELIVERED/COMPLETED | Per returns policy (BLOCKED, DR-043). Inspection before restock |
| `REFUND_PENDING` | RETURNED / CANCELLED after payment | Manual refund with approver |

Customer clicking "Submit" ≠ staff confirmation. The UI says "Order received — awaiting confirmation".

## 4. Confirmation rules per type (PROPOSED for DR-017)
| Type | Confirm when |
|---|---|
| STANDARD + COD | Phone/WhatsApp verification done, zone eligible (DR-050), stock available |
| STANDARD + bank/wallet | Stock available. Confirm, then wait for verification (reservation held for a window, OPEN) **or** confirm only after verification (choose one: owner decision) |
| CUSTOM_QUOTED | Quote accepted + deposit verified (deposit % OPEN) |
| PROJECT_SUPPLY | Contract signed + schedule agreed |

## 5. Payment methods
### 5.1 Cash on delivery
Eligible only for standard SKUs, in supported zones, under a value cap (OPEN). Not for custom firmware or installation contracts. A missed or refused delivery → `FAILED_FULFILLMENT`, then return-to-stock after inspection, which releases the allocation.

### 5.2 Bank transfer and e-wallet
- Instructions come from controlled business configuration, shown only after submission.
- Customer proof upload is accepted securely (private storage).
- **Proof ≠ payment.** Staff verify against authorised financial records and record `verified_by`, `verified_at`, `payment_reference`, `amount`.
- Anti-duplicate check: the same reference can't be used on two orders.
- Never mark `PAID` from customer evidence alone.
- No full financial credentials in logs.

### 5.3 Edge cases
| Case | Handling | Status |
|---|---|---|
| Two transfers for one order | Second payment record → overpayment → refund task | COVERED |
| Payment into the wrong business account | Manual reconciliation record with an approver | COVERED (process OPEN) |
| Quantity changed after proof upload | Order revision. Payment re-evaluated | COVERED |
| Order expires during staff review of a transfer | Expiry is suspended while state = PAYMENT_VERIFICATION_PENDING with proof received | PROPOSED |
| COD eligibility varies by geography/value/install | DR-050 rules engine (config table) | PROPOSED |
| Locale switch during checkout | Order state server-side. Locale only affects presentation | COVERED |
| Stale price in an open tab | Server re-pricing + acceptance | COVERED |

## 6. Order-status security
- Public reference is non-sequential (e.g. `ORD-7Q4K-2M9X`).
- Lookup requires reference + verified email/phone OTP, or an authenticated account.
- Rate-limited. Responses don't reveal whether a reference exists.
- No address/payment details on the public status page beyond what is needed.

## 7. Idempotency and concurrency
```ts
// Contract illustration (not implementation authorisation)
interface SubmitOrderCommand { idempotencyKey: string; locale: 'ar'|'en'; lines: {skuId: string; optionIds: string[]; qty: number}[];
  customer: {...}; shipping: {...}; paymentMethod: 'COD'|'BANK_TRANSFER'|'EWALLET'; consents: {terms: true; privacy: true} }
interface ConfirmOrderCommand { orderId: string; approvedByUserId: string; expectedOrderRevision: number; idempotencyKey: string }
interface ConfirmOrderResult { orderId: string; status: 'CONFIRMED'|'STOCK_RESERVED'; reservationIds: string[]; revision: number }
```
- Same submission key → same order.
- Same confirmation key → same result, no second reservation.
- Revision mismatch → reject with "order changed, reload".

## 8. Notifications (AR/EN templates, provider TBD)
Received · verification needed · confirmed · payment instructions · payment verified/rejected · shipped/scheduled · delivered/commissioned · cancelled/expired. Sent through an outbox, so that email failure never rolls back an order.

## Change log
2.0-draft, 2026-10-13: created from master v2 §5.3. Reconciles the CONFIRMED/STOCK_RESERVED atomicity (C-11).

## Next review decision
The owner picks the bank/wallet confirmation variant (§4), the COD rules, and the expiry windows.

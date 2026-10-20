# WAVE 7 — Commerce Foundation (local development only, behind the server-side gate)

**Nothing here is live.** Every public store route returns 404 in PREVIEW (verified). No catalogue item, price, shipping fee or quote amount exists in the development database. Domain tests use **synthetic fixture amounts in disposable databases only**.

## 1. Implemented
| Capability | Implementation | Business inputs still BLOCKED |
|---|---|---|
| Controller models 4 / 6 / 16 channels | `domain.skus.kind = CONTROLLER` with `model` RC04/RC06/RC16 (DB check: a controller needs a model) | Real SKU list and codes (DR-016) |
| Variants and standard additions | `variant_of` + `attributes` (e.g. finish). `kind = ADDITION`, optionally non-serialised. An addition cannot be bought without a controller | Which variants and additions exist |
| Prices | DRAFT → APPROVED by OWNER, four-eyes, one approved price per SKU, price snapshot on each order line (WAVE 1/W1) | All prices (B-02) |
| Cart | Stateless server-side pricing `POST /api/shop/cart/price` from approved prices only; shipping always "to be quoted" | — |
| Custom firmware quotation | `POST /api/shop/quotes` → QUOTE_PENDING. OWNER issues amount + validity (`/api/admin/orders/:id/quote`) → QUOTED. Customer accepts with the order token before expiry → PENDING_REVIEW → normal confirmation | Quote amounts (per request) |
| Order lifecycle | QUOTE_PENDING → QUOTED → PENDING_REVIEW → CONFIRMED (atomic reservation, spike V-1) → ALLOCATED (serials) → SHIPPED → COMPLETED. CANCELLED / EXPIRED terminal. Revision counter, audit row on every step | — |
| Shipping | Staff enters the shipping amount for each order; payment cannot be recorded before shipping is quoted | Shipping tariff/zones (B-02) |
| Payments (simulation, no gateway) | Manual records: PENDING → VERIFIED (unique external reference) or REJECTED (reason required). Total of open + verified payments ≤ order total. COD verified at delivery | Gateway selection (B-24) |
| Inventory ledger | RESERVE / RELEASE / ALLOCATE / SHIP rows for every movement. Ledger rows cannot be deleted by the application role | — |
| Serial allocation | Exact serial count per serialised line, matching SKU, IN_STOCK only. The reservation is consumed and stock moves reserved → allocated | — |
| Cancellation and release | Allowed before shipment. Releases reservations, returns allocated serials to stock, rejects pending payments, flags `refundRequired` when money was verified. After shipment → RMA (WAVE 8) | Returns/refund policy (B-04) |
| Idempotency | Order submission and quote request are keyed; confirmation is keyed (V-1); allocation, shipping and cancellation are state-idempotent (replay returns the same state) | — |
| Out-of-stock | Confirmation returns OUT_OF_STOCK when available stock is short; released stock becomes available again | — |
| Guest access | HMAC access token per order (key in `.local-secrets`). Status and quote acceptance need ref + token in a header; a wrong token gets the same 404 as an unknown ref (no oracle) | Customer accounts (WAVE 8) |

**PROPOSED rules for owner confirmation:**
- Prepaid orders need verified payment covering the total before serial allocation; COD may be allocated before payment, and completion requires the COD payment to be verified.
- Stock is reserved at staff confirmation, not at website submission.
- Shipping is quoted per order.

## 2. Tests
| Suite | Result |
|---|---|
| Domain lifecycle (`packages/domain/test/lifecycle.test.ts`) | **8/8** — catalogue integrity; cart pricing; full prepaid flow with every guard (shipping-before-payment, overpayment, payment-before-allocation, serial count/SKU mismatch, duplicate verification, unique external ref); cancellation after allocation (serials and stock returned, refund flag); COD flow; custom quote with expiry/token checks; ledger/stock/audit invariants; **concurrent allocation of one serial to two orders → exactly one wins** |
| Domain total | **31/31** |
| HTTP acceptance (new W7 checks) | 7/7, **104/104** overall |

The W7 HTTP checks cover:
- **PREVIEW:** all four public routes are closed.
- **Staff role boundaries:** editor cannot allocate or cancel; store cannot issue quotes; engineer cannot record payments.
- **COMMERCIAL** (inside try/finally):
  - cart refuses unpriced SKUs;
  - quote request returns a token;
  - status needs the token;
  - store cancels the synthetic request.

## 3. Not done / limits
- **Storefront UI** (product pages, cart, checkout forms): not built. The APIs exist; UI depends on catalogue, prices and policies (B-02, B-33).
- **Reservation expiry** for unpaid confirmed orders (3 days, existing job) is not yet tied to payment status: product rule pending.
- **Staff screens:** there is no dedicated staff UI for the lifecycle steps (API only); backlog.
- **Invoicing / e-invoicing** (ETA): BLOCKED (B-15).

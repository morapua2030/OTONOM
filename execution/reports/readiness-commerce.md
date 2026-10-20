# Commerce Readiness (W1 store) — 2026-10-15

**Determination: FOUNDATION IMPLEMENTED AND TESTED LOCALLY — NOT READY to activate.** The store stays disabled server-side (PREVIEW). Activating COMMERCIAL today would sell nothing anyway: no price is approved, so every order is refused.

## Implemented and tested (local, synthetic)
Catalogue model (controllers 4/6/16, variants, additions):
- server-side cart pricing;
- custom-firmware quotes (OWNER-issued, expiring, token-accepted);
- order lifecycle (review → atomic reservation → shipping quote → manual payments → serial allocation → shipping → completion);
- cancellation with stock/serial release;
- idempotency;
- out-of-stock handling;
- inventory ledger;
- guest order access tokens.

Evidence:
- domain lifecycle 9/9, including 50-way concurrency and a serial race;
- acceptance W7 checks.

## Blocking activation
| Need | Blocker |
|---|---|
| SKU list, prices (VAT basis), shipping tariff | B-02 (owner) |
| Returns / refund policy | B-04 (legal) |
| E-invoicing / tax handling | B-15 |
| Payment approach (gateway or manual-only) | B-24 |
| Storefront UI (product pages, cart, checkout forms) | B-33 (needs the above first) |
| Customer notifications (order confirmation) | B-20 / B-41 |
| Privacy + terms | B-11 / B-12 |
| Hosting, backups, monitoring | B-16, B-18, B-25 |
| PROPOSED controls confirmed (P-01, P-04…P-08) | B-36 |

## Unsafe to activate
Without approved prices, policies, notifications and legal texts, a live checkout would create unenforceable or non-compliant orders.

## S5 verification addendum (2026-10-16)

**Verdict: PARTIAL (local only), BLOCKED for commercial activation.** Store staff/API/domain regressions passed inside the S6 1180/1180 isolated run. `otonom_dev` still has zero prices and Commerce remains unavailable to PREVIEW visitors. No commercial blocker was waived.

## S7 addendum (2026-10-18)

The gated public view now explains 4/6/16 controller categories and shows `PRICE NOT CONFIGURED`; the internal Store workspace is clearer on mobile. This reduces B-33's UI gap but does not add sellable product pages, prices, tax, policies or checkout. Final S7 tests passed 1430/1430 and public mutations remain disabled. Activation verdict stays **BLOCKED**.

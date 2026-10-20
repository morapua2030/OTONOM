# 08 — Commerce: Pricing, Cart, Orders and Payments

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. **Commercial Release (CR) only. Not live in the preview (G-1)** |
|---|---|---|---|---|---|---|---|

## 1. Purchase paths
| Path | What it is | Checkout? | Approval |
|---|---|---|---|
| **Standard** | A 4/6/16 controller SKU with no options | Yes (CR) | Staff confirmation |
| **Configured (pre-priced)** | SKU + standard priced options validated by the compatibility rules | Yes (CR) | Staff confirmation |
| **Custom Engineering** | Custom firmware/integration as a quoted service line | Only after an engineer-approved quote + customer acceptance | Engineer + customer |
| **Full Project RFQ** | Design/supply/installation project | Never via cart → doc 06 | Proposal/contract |

## 2. Price components
| Component | Source | Display | Status |
|---|---|---|---|
| Base controller price | PriceVersion per SKU | Public (when approved) | Prices SOURCE MISSING |
| Standard option price | PriceVersion per option | Public | SOURCE MISSING |
| Custom firmware/integration | Quote | "Quotation required" | APPROVED rule |
| Installation/commissioning | Quote (project-dependent) | "Quotation required" | APPROVED rule |
| Shipping | Zone tariff | At checkout. An unsupported zone → quote path | Tariff SOURCE MISSING |
| Taxes | Policy | Inclusive/exclusive label | OPEN (finance) |
| Partner/reseller discount | Approved individual terms | Never public | APPROVED (approval-gated) |

Totals: if any required line is a quote → **"Known subtotal — final price subject to quotation"**, and the order can't be confirmed as payable until the quote is accepted.

## 3. Order lifecycle (proposed states)
`DRAFT_CART → SUBMITTED → PENDING_REVIEW → [QUOTE_PENDING → QUOTE_ACCEPTED] → CONFIRMED (reservation committed atomically) → ALLOCATED (serials picked) → PREPARED → SHIPPED | SCHEDULED_INSTALL → DELIVERED | INSTALLED → COMPLETED`

Payment sub-status (parallel): `NOT_DUE → AWAITING_PAYMENT → PROOF_SUBMITTED → VERIFIED | REJECTED → REFUND_PENDING → REFUNDED`

Exceptions: `EXPIRED`, `CANCELLED`, `OUT_OF_STOCK_ON_CONFIRM` (confirmation fails, order stays PENDING_REVIEW with a flag), `PARTIALLY_SHIPPED`, `DELIVERY_FAILED`, `RETURN_REQUESTED → RETURN_RECEIVED → INSPECTED → RESTOCKED | SCRAPPED`.

**"Reserved"** in M3P's sequence is the property of a CONFIRMED order with active reservations. It is not a separate user action (doc 01, C-RES).

## 4. "Confirmation depends on order type": decision table (PROPOSED, owner to approve)
| Order type | Payment method | Confirm (reserve stock) when… | Payment verified when… | Ship when… |
|---|---|---|---|---|
| Standard/Configured | COD | Customer reachable + verified (call/WhatsApp) + eligible zone + under the COD cap | On courier remittance | After confirmation |
| Standard/Configured | Bank transfer | **Option T1:** at staff review (reserve, hold N days for payment). **Option T2:** only after payment is verified | Staff match to the bank statement | After verification |
| Standard/Configured | E-wallet | Same as bank (T1/T2) | Staff match to the wallet statement | After verification |
| Custom Engineering | Bank/wallet | Quote accepted + deposit verified (deposit % OPEN) | Deposit/balance verified | Per quote |
| Project supply | Per contract | Contract signed + schedule | Per contract milestones | Per schedule |

**Recommendation:** T1 with a 3-business-day hold. It reduces lost sales while keeping stock honest. **Owner decision OPEN.**

## 5. Manual payment controls
- Payment instructions come from controlled settings, shown only after submission. Changes to them are audited.
- **Proof upload ≠ payment.** Verification requires matching the actual statement line: amount, date, sender reference, and the order reference in the transfer note if possible.
- Uniqueness: one `external_reference` can't verify two orders. A duplicate triggers an exception.
- Overpayment or a double transfer → refund task with approver. Underpayment → `AWAITING_PAYMENT` with the difference shown.
- No gateway callbacks exist. If a gateway is added later, callbacks must be signed and idempotent (future).
- Never auto-mark PAID.

## 6. Shipping vs installation
Shipping is a separate line priced from the zone tariff. Installation is a separate quoted service, scheduled by the internal team (capacity OPEN). An order can be "Delivered" but not "Installed". Warranty activation depends on commissioning (doc 09).

## 7. Cart and checkout behaviours
- Server-side re-pricing at submit. A price change since viewing → show the difference and require acceptance.
- Idempotency key per checkout attempt.
- Guest checkout allowed. Order status needs reference + OTP (email/phone) or an account.
- Order references are non-sequential.
- COD eligibility checked live (zone, value cap, item types).
- Locale switch keeps the cart (server-side).

## 8. Edge cases
| # | Case | Handling |
|---|---|---|
| CE-01 | Two buyers try to confirm the last unit | Only one confirmation reserves. The other gets OUT_OF_STOCK_ON_CONFIRM (doc 09 INV-T01) |
| CE-02 | Customer double-clicks submit | One order (idempotency) |
| CE-03 | Price changed between submit and confirm | Re-acceptance required, or honour the submitted price (policy OPEN, recommend honouring for 3 days) |
| CE-04 | Custom line added to a standard cart | Order becomes QUOTE_PENDING. No payment instructions until the quote is accepted |
| CE-05 | Shipping zone unsupported | Quote path. Never 0 or invented |
| CE-06 | COD refused at the door | DELIVERY_FAILED → return to stock after inspection. Customer flagged (policy OPEN) |
| CE-07 | Two transfers for one order | Second → overpayment refund task |
| CE-08 | Transfer to the wrong account | Manual reconciliation record with approver |
| CE-09 | Quantity changed after proof upload | New order revision. Payment re-evaluated |
| CE-10 | Order expires while staff review a proof | Expiry suspended while PROOF_SUBMITTED |
| CE-11 | Partial shipment | PARTIALLY_SHIPPED. Remaining reservation kept |
| CE-12 | Damaged return | INSPECTED → SCRAPPED or repair. Refund per returns policy (BLOCKED) |
| CE-13 | Partner places an order at negotiated terms | Partner price applied server-side from approved terms. Never client-supplied |
| CE-14 | Customer removes custom work after quote approval | New quote revision. The old one is superseded |

## 9. Preview behaviour (G-1)
Controller pages are informational. No cart, no checkout, no order forms, no payment instructions. "Talk to us about supply" leads to RFQ (supply-only) or contact.

## Sign-off (Wave 6a)
Four paths separated ✅ · Confirmation table PROPOSED, not approved ✅ · Proof ≠ payment ✅

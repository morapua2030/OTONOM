# 18 — M2 + W1 Release Plan (Preview → Commercial)

| Version | 3.0-draft | Date | 2026-10-13 | Status | **M2 + W1 APPROVED (strategy)**. Blocks, scope and dates PROPOSED |
|---|---|---|---|---|---|---|---|

## 1. Delivery blocks
| Block | Purpose | Contents | Entry gate | Exit gate | Public? |
|---|---|---|---|---|---|
| **B0 Planning gate (now)** | Documentation, decisions | This pack | — | Owner review | No |
| **B1 Architecture spike** | Prove/disprove the stack | Doc 16 V-1…V-7 (+V-8…10 optional) | Owner authorises the spike, runtime, installs, thresholds | Spike report → ADR-01 decision | No |
| **B2 Platform foundation** | Shared base | Identity/RBAC/MFA, localization, CMS core + workflow, audit, file storage, outbox, design tokens, preview flags | Implementation authorised + ADR-01 | QG-1 per story | No (staging only) |
| **B3 M2 Preview foundation** | Preview content + lead capture | Pages (doc 04 PV set), case studies (consented), claim registry, RFQ variant P-A or P-B, Projects workspace, attribution capture, ClickUp handoff | B2 + content inputs | QG-2 checks pass in staging | No |
| **B4 M2 B2B Preview release** | Public preview | Labelled preview, no checkout, no portal claims | QG-2 + **owner go-live approval + deployment approval** | Live preview monitoring | **Yes (labelled preview)** |
| **B5 Commercial foundation** | Commerce + warranty core | Catalogue, pricing, cart/orders, manual payments, inventory/serials, commissioning, warranty model, tickets/RMA, customer accounts. Built on synthetic data | B2 (can run in parallel with B3/B4 after B2) | Integration tests green | No |
| **B6 Data onboarding + policies** | Real inputs | Prices, SKUs, stock counts, serial import, legacy devices/customers, tariff, policies (warranty, shipping, returns, terms, privacy update) | Owner/legal inputs | Data validated. Policies signed (G-4) | No |
| **B7 Operational rehearsal** | Prove operations | Dry-run orders end-to-end with staff, payment verification, fulfilment, commissioning capture, ticket handling, incident drill | B5 + B6 | Rehearsal report | No |
| **B8 W1 Commercial release** | First commercial launch | Store + warranty/service portal + all PV features | QG-3 + owner + legal + deployment approval | Hypercare period (e.g. 2 weeks, OPEN) | **Yes** |
| **B9 Post-commercial** | Enhancements | Case-study library, interactive scenarios, 3D/2D, partner depth, gateway, ClickUp sync evaluation, marketplace study | Separate approvals | — | Later |

**Distinctions kept explicit:**
- staging (internal) ≠ public preview ≠ commercial release.
- A public preview is never "production-complete".

## 2. Preview (B4) rules (G-1, G-2, OD-13)
- No web retail checkout or sales acceptance. Commerce/portal mutations are disabled server-side (T-PV-01).
- Preview label on every page + `/preview` explainer.
- No claims of a live store/portal, published apps, certifications or unverified integrations.
- Existing warranty service runs off-site through the current process. The support page explains how to reach it.
- **Variant P-A (informational + basic contact)** vs **P-B (full RFQ with uploads)**: P-B only if the doc 14 §6 gate passes. **Recommendation:** launch with P-A if the scanning/storage controls aren't ready, then upgrade to P-B inside the preview once the gate passes. This keeps B2B value early without weakening security.
- Even P-A collects PII, so the privacy notice, consent, retention, rate limiting and admin MFA are mandatory.

## 3. Commercial release (B8) launch / no-launch conditions
| # | Condition | Source | Launch blocked if not met |
|---|---|---|---|
| L-1 | Ownership verification works (non-serial-only) | G-3 | ✅ |
| L-2 | Coverage linked to verified commissioning records | G-3 | ✅ |
| L-3 | **Approved written warranty policy** (duration, exclusions, start rules) | G-4, W1 | ✅ |
| L-4 | Tickets/RMA with customer-visible status | G-3 | ✅ |
| L-5 | Consumer, shipping, returns and payment policies approved | G-4 | ✅ |
| L-6 | Prices, SKUs, tariff, tax treatment approved and loaded | doc 08 | ✅ |
| L-7 | Inventory counts + serial data loaded and reconciled | doc 09 | ✅ |
| L-8 | All CR critical tests green (doc 17) | QG-3 | ✅ |
| L-9 | Operational rehearsal passed. Named staff for orders/payments/service | doc 20 | ✅ |
| L-10 | Backup/restore drill passed. Monitoring live | doc 15/20 | ✅ |
| L-11 | Deployment explicitly authorised | OD-07 | ✅ |

## 4. Dependency graph (text)
```text
B0 ─► B1 ─► B2 ─┬─► B3 ─► B4 (Preview live)
                └─► B5 ─┐
     Owner/legal inputs ─► B6 ─┴─► B7 ─► B8 (Commercial live) ─► B9
Content inputs (brand, consent, evidence) ─► B3
Security gate (doc 14 §6) ─► P-B within B3/B4
```
Critical path to the commercial release: likely **B6 (policies + data)**, not code. Parallelism: B5 can run alongside B3/B4 once B2 exists (one developer: B5 interleaves with B3/B4, which costs calendar time).

## 5. What can shift only with owner approval
Moving P-B from the preview to the commercial release · moving partner terms to post-CR · dropping the Arabic admin UI (V-6) · reducing the hypercare period · anything that weakens G-1…G-4 (not allowed without a new owner decision).

## Sign-off (Wave 11b)
Distinct blocks ✅ · Preview ≠ production ✅ · W1 conditions explicit ✅

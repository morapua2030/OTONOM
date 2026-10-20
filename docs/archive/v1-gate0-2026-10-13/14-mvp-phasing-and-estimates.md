# 14 — MVP Phasing and Estimates (PROPOSED, D-021)

> These are rough-order-of-magnitude estimates (**low confidence, ±40 %**) for **one developer working with AI coding agents**, full-time. They exclude content production, photography, legal drafting and waiting on decisions, and they assume the spike (doc 05 §9) passes.
> No approved requirement is removed. Items are **sequenced**, not dropped. Each trade-off is stated so the business can choose.

## Why stage it
The full brief covers a bilingual CMS, a B2B CRM, commerce with inventory and serials, a warranty portal and attribution reporting. That is the scope of several products. Shipping it all at once delays the **highest-value goal (B2B project acquisition)** by months and concentrates risk.

## MVP-A — "Credibility + B2B pipeline" (first public launch)
| Included | Notes |
|---|---|
| Bilingual public site (all 10 page areas), brand, SEO, accessibility | Shop area shows the catalogue + specs + "Request quote / Order inquiry" (no cart yet) |
| CMS with Draft → Review → Publish, case studies with consent gating, claims/evidence gating | — |
| B2B RFQ with private uploads (scanned or quarantined), confirmation, abuse protection | — |
| Projects workspace: RFQ triage, opportunity state machine, proposals (file + version), contract register, attribution classification + audit, ClickUp copy summary | — |
| Attribution report v0 (Sourced / Assisted / Total, New/Existing, pipeline separate) | Simple tables + CSV export |
| **Bridge for warranty/service:** a public "Service request" form (serial no. + contact + description + files) that lands in the admin | Not the full portal. Covers the "service at launch" need |
| Admin MFA, audit log, backups + restore drill, observability | — |
| **Estimate** | **9–13 weeks** |

**Trade-off:** retail customers can't check out online at launch. They submit an order inquiry and are handled manually. B2B value ships first.

## MVP-B — "Controller store"
| Included | Notes |
|---|---|
| Cart, order submission, COD / bank transfer / e-wallet instructions, payment verification | Requires D-009 (SKUs/prices) and shipping amounts |
| Inventory ledger, reservation at confirmation, reconciliation | — |
| Serial allocation at fulfilment, commissioning records | Serial data also feeds MVP-C |
| Order tracking, Store workspace, transactional emails AR/EN | — |
| **Estimate** | **6–9 weeks** |

## MVP-C — "Customer portal + full reporting"
| Included | Notes |
|---|---|
| Customer accounts, device registration by serial, warranty status (versioned policy) | End dates shown only after D-011 is approved |
| Service tickets + RMA lifecycle, customer-visible statuses | Align with OTONOM's existing RMA documents |
| Full KPI suite (conversion rates, cycle time, margin when cost data exists) | — |
| Partner inquiry approval flow (basic) | — |
| **Estimate** | **5–8 weeks** |

## Alternative ordering (if retail revenue is more urgent)
A′ = MVP-A minus the attribution report (manual spreadsheet export instead) **plus** the MVP-B store. This adds about 5–7 weeks to the first launch. Not recommended, because the store depends on unfinalised SKUs and prices (D-009) and would block the launch.

## Critical-path dependencies
| Dependency | Blocks |
|---|---|
| GitHub identity + repo approval (D-017) | any code work |
| Stack approval + spike (D-018) | MVP-A build |
| Brand assets (D-015) | visual design |
| Written consent for case studies (D-013) | Projects page content |
| Evidence pack for integrations (D-014) | Technology & Integrations content |
| Policy approvals (D-012) | launch |
| SKUs/prices/shipping (D-009) | MVP-B |
| Warranty policy (D-011) | MVP-C warranty dates |

## Non-goals (all phases until re-approved)
Payment gateway, ClickUp API, 3D house / 2D simulator, marketplace, web device control, configurator, broad distributor portal.

## Top delivery risks
1. Decisions arrive late (prices, warranty, consent) → content gaps at launch.
2. Arabic copy quality: needs a native editor, not only AI.
3. The single admin becomes a bottleneck for content review, RFQ response and order verification.
4. Spike reveals framework gaps → fallback to Option A adds roughly 3–5 weeks to MVP-A.

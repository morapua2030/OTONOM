# 04 — Information Architecture, Sitemap and Navigation

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT (paper design only) |
|---|---|---|---|---|---|---|---|

## 1. URL and locale strategy (PROPOSED, DR-046)
| Rule | Proposal | Rationale |
|---|---|---|
| Locale prefix | Every public route under `/ar/…` and `/en/…` | Explicit, cache-friendly, clean `hreflang` pairs |
| Root `/` | 302 to `/ar` or `/en` by cookie → `Accept-Language` → default `/ar`. Bots get `x-default` = `/ar` | Egypt-first audience |
| Slugs | Latin, kebab-case in both locales (e.g. `/ar/projects/new-cairo-apartment`) | Avoids percent-encoded Arabic URLs. Arabic slugs remain OPEN |
| Canonical | Self-referencing per locale. `hreflang` ar/en + `x-default` | SEO |
| Gated routes in PV | `/…/shop/*` (catalogue may be informational), `/…/cart`, `/…/checkout`, `/…/order-status`, `/…/account/*` return a localized "Available at commercial launch" page with **no form** and `noindex` | G-1, G-2 |
| Admin | `/admin` (not localized, never indexed, MFA) | Security |

## 2. Navigation
### 2.1 Primary navigation (desktop)
| Item | PV | CR |
|---|---|---|
| Solutions | ✅ | ✅ |
| For Business (Developers, Contractors, Partners) | ✅ | ✅ |
| Projects | ✅ (only consented items; else "Our process") | ✅ |
| Technology | ✅ | ✅ |
| Controllers / Shop | "Controllers" (informational, label "Online ordering at commercial launch") | "Shop" |
| Support | Contact-based support info (G-1) | Warranty & Service portal |
| Primary CTA button | **Request a Proposal** | Request a Proposal |
| Secondary | Locale switch (AR/EN), Book a consultation | + Account/Login, Cart |

Mobile: hamburger with the same order. The sticky bottom CTA "Request a Proposal" appears on B2B pages only.

### 2.2 Footer
Company (About, Contact, Insights) · Business (Developers, Contractors, Partners, Request a Proposal) · Support (Help, Warranty & Service: PV text "via our support team", CR link to portal) · Legal (Privacy; Terms, Shipping, Returns, Warranty **shown only when approved**) · Preview notice (PV) · Social links (owner to supply).

## 3. Page inventory by stage
Legend: **PV** = in B2B Preview · **CR** = commercial release · **L** = later · **G** = gated placeholder in PV.

| Route (after locale) | Page | PV | CR | Notes |
|---|---|---|---|---|
| `/` | Home | PV | CR (adds a shop/support band) | doc 05 |
| `/about` | About | PV | ✅ | Company facts from the approved profile |
| `/solutions` | Solutions hub | PV | ✅ | |
| `/solutions/multi-unit-developments` | Multi-unit | PV | ✅ | P1 priority |
| `/solutions/villas`, `/solutions/apartments` | Segment pages | PV | ✅ | |
| `/solutions/scenarios` | Room & scenario explorer (2D, non-interactive cards in PV) | PV | ✅ | 3D/2D interactive = L |
| `/business/developers` | Developers & compounds | PV | ✅ | |
| `/business/contractors` | Contractors & consultants | PV | ✅ | |
| `/business/partners` | Partner programme + inquiry | PV | ✅ | No public prices |
| `/business/request-a-proposal` | RFQ | PV (variant P-A contact or P-B full RFQ) | ✅ full | doc 06 |
| `/consultation` | Free consultation request | PV | ✅ | |
| `/projects` | Projects index | PV (consented only, or the process story) | ✅ | |
| `/projects/[slug]` | Case study | PV (consented) | ✅ | Written consent gate |
| `/technology` | Technology hub | PV | ✅ | |
| `/technology/controllers` | Controller overview (4/6/16) | PV (no ratings until a datasheet is approved) | ✅ | |
| `/technology/integrations` | Integration explainer + claim-gated matrix | PV (safe copy) | ✅ | doc 11 |
| `/technology/documentation` | Approved public docs | PV (when available) | ✅ | |
| `/shop`, `/shop/controllers/[slug]` | Store | G (informational product pages, no add-to-cart) | CR | |
| `/cart`, `/checkout`, `/order-status` | Ordering | G | CR | |
| `/support` | Support hub | PV (contact path) | CR (portal entry) | |
| `/support/warranty` | Warranty info | G ("terms to be published") | CR (approved policy) | G-4 |
| `/support/service` | Service request | PV: contact instructions | CR: portal | |
| `/account`, `/account/devices`, `/account/warranties`, `/account/service-requests[/id]` | Customer portal | G | CR | W1 |
| `/login`, `/register`, `/claim-device` | Auth | — | CR | |
| `/insights`, `/insights/[slug]` | Articles | PV | ✅ | |
| `/contact` | Contact | PV | ✅ | |
| `/legal/privacy` | Privacy | **PV (required before any PII collection)** | ✅ | |
| `/legal/terms`, `/shipping`, `/returns`, `/warranty` | Policies | — | CR (approved, G-4) | |
| `/preview` | "About this preview" explainer | PV | removed | G-2 |

## 4. Contextual CTAs
| Context | CTA | Destination |
|---|---|---|
| Any B2B page | Request a Proposal | RFQ / contact (P-A) |
| Solutions/scenarios | Book a free consultation | `/consultation` |
| Controller page (PV) | "Talk to us about supply" | RFQ (supply-only) or contact |
| Controller page (CR) | Add to cart / Request custom quote | Cart / RFQ |
| Case study | "Plan a similar project" | RFQ with the project type pre-filled |
| Support (PV) | Contact support | Existing channel |

## 5. Breadcrumbs, search, 404
Breadcrumbs on all depth ≥ 2 pages (localized, RTL-aware). Site search is DEFERRED (low content volume). Localized 404/500 pages with contact and Request-a-Proposal links.

## 6. IA acceptance criteria (planned, NOT EXECUTED)
- IA-AC-01: every PV page has AR/EN equivalents and reciprocal `hreflang`.
- IA-AC-02: in PV, no route accepts an order or warranty claim (form absent, server rejects).
- IA-AC-03: gated pages are `noindex` and state "commercial launch".
- IA-AC-04: no footer/legal link points to an unapproved policy.
- IA-AC-05: primary CTA reachable within one interaction from every B2B page on mobile.

## Sign-off (Wave 3a)
Stage-tagged inventory ✅ · No fake buttons (G pages have no actions) ✅

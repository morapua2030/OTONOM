# OTONOM public route and component matrix

Every route below is rendered for both `/ar` (RTL) and `/en` (LTR). The Hybrid 03 layer is loaded once by the shared site layout, so the same tokens, shell, focus treatment and responsive rules apply without duplicating route logic.

| Experience | Routes | Primary implementation | Hybrid 03 coverage |
|---|---|---|---|
| Home | `/` | localized home page, `CorporateHome`, shared shell | Editorial hero, balanced four-discipline presentation, technical stage and CTA hierarchy |
| Services | `/services`, `/services/software-engineering`, `/services/iot-embedded`, `/services/custom-engineering`, `/services/smart-home-automation` | `ServiceExperience`, service discovery/explorer | Shared service hero, technical rows, deliverables, process and CTA grammar |
| Corporate and process | `/about`, `/engineering-process`, `/build-with-us` | `CorporatePage` | Editorial hero, evidence-aware capability rows and dark engineering sections |
| Solutions | `/solutions`, `/solutions/multi-unit-developments`, `/solutions/villas`, `/solutions/apartments`, `/solutions/scenarios` | localized catch-all marketing page and structured blocks | Shared typography, grids, buttons, cards, dividers and truthful CTA treatment |
| Business | `/business/developers`, `/business/contractors`, `/business/partners`, `/business/request-a-proposal` | localized catch-all page, structured blocks, gated proposal form | Shared B2B treatment; existing privacy and intake gates preserved |
| Portfolio | `/projects`, `/projects/[published-slug]` | `PortfolioExplorer`, project detail template | Editorial portfolio hero, URL-synchronised filters/search, empty state and related navigation |
| Products / D6 | `/products`, `/products/4r`, `/products/6r`, `/products/16r`, `/products/compare` | `ProductGrid`, product template, `SmartProductSelector` | Genuine product imagery, approved facts and preliminary channel-count guidance only |
| D5 Project Builder | `/start-project` | `ProjectBuilder` | Six-stage flow, visible progress, selected/focus states, privacy explanation and summary workflow |
| D5 packages | `/smart-home/packages` | `SmartHomePackages` | Approved Premium, Plus and Essential facts/order, price caveat and project-builder links |
| Technology | `/technology`, `/technology/controllers`, `/technology/integrations`, `/technology/documentation` | localized catch-all page, product grid and evidenced-claims view | Shared engineering language; unpublished claims/downloads remain withheld |
| Contact and support | `/contact`, `/consultation`, `/support`, `/support/service` | localized catch-all page and consultation route | Shared forms/content primitives; existing availability and privacy behavior preserved |
| Institutional | `/insights`, `/legal/privacy` | localized catch-all page | Shared reading measure, metadata, breadcrumb and section treatment |
| Preview-only content | `/preview`, `/preview/bidi-samples` | preview page and bidi samples | Remains non-production/private according to the existing deployment gate |
| Gated customer surfaces | `/account`, `/shop`, `/cart`, `/checkout`, `/support/warranty` | gated informational pages | No public commerce, payment, account/device operation or warranty activation |

Shared components: `SiteHeader`, `SiteFooter`, `BrandLogo`, navigation menus, buttons, fields, cards, breadcrumbs, empty states, product cards and section wrappers. Shared visual source: `app/web/src/app/(site)/hybrid03.css`; portfolio-specific refinements remain in `portfolio.css`.

Operational routes (`/staff/login`, `/admin`, Payload/API and GraphQL surfaces) retain their independent authentication and security presentation and are not rebranded by the public-site layer.

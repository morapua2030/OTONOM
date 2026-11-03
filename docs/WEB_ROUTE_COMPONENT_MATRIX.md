# OTONOM public route and component matrix

Every route below is rendered for both `/ar` (RTL) and `/en` (LTR). The design layer (`v2.css`, DR-099, with the v3.1 classes appended) is loaded once by the shared site layout over the earlier CSS, so the same tokens, fonts, shell, focus treatment and responsive rules apply without duplicating route logic. The locked Hybrid 03 logo files are unchanged.

| Experience | Routes | Primary implementation | Design coverage |
|---|---|---|---|
| Home | `/` | `HomeMix` (`components/home-mix.tsx`) | Home (mix), DR-100: 16R hero, 16R spotlight + 4R/6R cards, package items, package cards (Choose → WhatsApp), four disciplines → service pages, entry chips, steps, Alexa band, business band |
| Services index | `/services` | `ServicesIndex` (`components/v3-pages.tsx`) | Owner decision (DR-109): inner hero, the four discipline cards from Home, navy CTA band |
| Service pages | `/services/iot-embedded`, `/services/software-engineering`, `/services/custom-engineering` | `ServiceV3` | v3.1 "05 Service": hero with circuit visual (Talk → WhatsApp, Start → `/start-project?service=<slug>`), icon cards, "Where do you start?" chips → WhatsApp, steps, FAQ accordion (`FaqAccordion`), CTA band |
| Smart home | `/services/smart-home-automation` | `SmartHomeLanding` | v3.1 "01 Home": 16R hero, package items, package cards (Choose → Contact), steps, controller cards, Alexa band |
| Company | `/about` | `CompanyV3` | v3.1 "07 Company": how we operate, the four disciplines, CTA band |
| Business | `/business/developers`, `/business/contractors` | `BusinessV3` | v3.1 "10 Business": offer cards, steps, Call and WhatsApp |
| Portfolio | `/projects`, `/projects/[published-slug]` | `WorkEmptyV3` while 0 entries; `PortfolioOverview` / project detail otherwise | v3.1 "08 Our work" empty state (DR-098, DR-106); the existing explorer renders if entries are ever published |
| Products | `/products`, `/products/4r`, `/products/6r`, `/products/16r` | `ControllerRows` (`components/products.tsx`), `ProductV3` | v2 Controllers header and one row card per controller; v3.1 "06 Product" without a spec table (specs out of scope, DR-106). The Smart Product Selector is not rendered (DR-109) |
| Start a project | `/start-project` | `StartProject` (`components/StartProject.tsx`), `lib/start-message.ts` | v3.1 "09 Start a project": three chip groups (`aria-pressed`, toggle off), live message, one WhatsApp button; `?service=` / `?package=` preselect the field from an allow-list; no form, input or storage |
| Packages | `/smart-home/packages` | `SmartHomePackages`, `PackageTiles`, `PackageComparison` | v2 Packages: cards with photo tiles and ×N badges, Choose → `/contact?package=<id>`, comparison table in a labelled scroll region, `#package-{id}` anchors |
| Contact | `/contact` | dedicated route + `ContactBooking` (`lib/contact.ts`) | v2 Contact (DR-101): package chips, Call and WhatsApp cards with the message preview, the public address (DR-106); no form or storage |
| Support | `/support` | `SupportV3` | v3.1 "Support": last updated, the support line, a warranty-disabled note (feature gate), tips, CTA band |
| Gated customer surfaces | `/account`, `/shop`, `/cart`, `/checkout`, `/support/warranty` | gated informational pages | Unchanged gates: no public commerce, payment, account/device operation or warranty activation |
| Preview-only content | `/preview`, `/preview/bidi-samples` | preview page and bidi samples | Remains non-production/private according to the existing deployment gate |

## Retired routes (308, DR-107)

The proxy answers `GET`/`HEAD` with a 308. The locale is kept and the query and hash are dropped. None of these routes are in the nav, the footer or the sitemap.

| From | To |
|---|---|
| `/solutions` and all sub-pages | `/services` |
| `/engineering-process` | `/about` |
| `/build-with-us` | `/start-project` |
| `/products/compare` | `/products` |
| `/consultation`, `/business/request-a-proposal` | `/contact` |
| `/business/partners` | `/business/contractors` |
| `/technology` and all sub-pages | `/products` |
| `/insights` | `/` |
| `/support/service` | `/support` |
| `/legal/privacy` | `/contact` (DR-108; every privacy link is removed) |

`legacyRouteRedirect()` (`lib/deployment.ts`) holds the map. Only in the local synthetic test harness (`OTONOM_TEST_PAGES=1`, never on Vercel, never preview-locked) do these pages still render, so the existing stored-XSS, claims-gate and RFQ security suites keep running unchanged.

## Shared pieces

- **Language switch:** `LangSwitch` builds its link with `localeSwitchHref()` (`lib/locale-switch.ts`). It keeps only allow-listed, validated state: the portfolio query on `/projects`, `package` and `service` on `/start-project`, and a `#package-{id}` anchor on `/smart-home/packages`.
- **Shared components:**
  - `SiteHeader`: wordmark; nav Home · Smart Home · Controllers · Packages · Services ▾ · Our work · Contact; drawer below 1000px; Book a visit.
  - `SiteFooter`: three link columns, then a Contact column (phone, address, WhatsApp, Contact, Support), then logo, language link and ©.
  - v3 building blocks (`components/v3.tsx`): `InnerHero`, `SplitTitle`, `Circuit`, `Icon`, `IconCards`, `StepCards`, `CtaBand`.
  - Also: `BrandLogo`, `Swash`/`SwashText`, buttons, cards and empty states.
- **Copy:** verbatim from the design in `lib/site-copy.ts` and `lib/site-copy-inner.ts`. Contact details come from `lib/contact.ts` only.
- **404:** unknown language-code paths (e.g. `/xx`) render the Arabic localized 404 inside the shell (proxy rewrite, status 404).

Operational routes (`/staff/login`, `/admin`, Payload/API and GraphQL surfaces) keep their own authentication and security presentation and are not rebranded by the public-site layer.

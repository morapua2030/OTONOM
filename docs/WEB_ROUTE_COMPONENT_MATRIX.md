# OTONOM public route and component matrix

Every route below is rendered for both `/ar` (RTL) and `/en` (LTR). The design layer (`v2.css`, DR-099, with the v3.1 classes appended) is loaded once by the shared site layout over the earlier CSS, so the same tokens, fonts, shell, focus treatment and responsive rules apply without duplicating route logic. The locked Hybrid 03 logo files are unchanged.

| Experience | Routes | Primary implementation | Design coverage |
|---|---|---|---|
| Home | `/` | `HomeMix` (`components/home-mix.tsx`) | Home (mix), DR-100: 16R hero (See packages · Try your smart home · Start your project), 16R spotlight + 4R/6R cards, package items, package cards (Choose → WhatsApp), four disciplines → service pages, entry chips, steps, Alexa band, business band |
| Services index | `/services` | `ServicesIndex` (`components/v3-pages.tsx`) | Owner decision (DR-109): inner hero, the four discipline cards from Home, navy CTA band |
| Service pages | `/services/iot-embedded`, `/services/software-engineering`, `/services/custom-engineering` | `ServiceV3` | v3.1 "05 Service": hero with circuit visual (Talk → WhatsApp, Start → `/start-project?service=<slug>`), icon cards, "Where do you start?" chips → WhatsApp, steps, FAQ accordion (`FaqAccordion`), CTA band |
| Smart home | `/services/smart-home-automation` | `SmartHomeLanding` | v3.1 "01 Home": 16R hero (with the v4 simulator button), package items, package cards (Choose → Contact), steps, controller cards, Alexa band |
| Company | `/about` | `CompanyV3` | v3.1 "07 Company": how we operate, the four disciplines, CTA band |
| Business | `/business/developers`, `/business/contractors` | `BusinessV3` | v3.1 "10 Business": offer cards, steps, Call and WhatsApp |
| Portfolio | `/projects`, `/projects/[published-slug]` | `WorkEmptyV3` while 0 entries; `PortfolioOverview` / project detail otherwise | v3.1 "08 Our work" empty state (DR-098, DR-106); the existing explorer renders if entries are ever published |
| Products | `/products`, `/products/4r`, `/products/6r`, `/products/16r` | `ControllerRows` (`components/products.tsx`), `ProductV3` | v2 Controllers header and one row card per controller; v3.1 "06 Product" without a spec table (specs out of scope, DR-106). The Smart Product Selector (`SmartProductSelector`, logic `lib/product-selector.ts`, message `lib/selector-message.ts`) is back directly under the controller cards, restyled to v3 (DR-112): channel and room modes, suggested controller(s), covering packages without prices, one WhatsApp button, the estimate line and a link to `/try`. The Controllers header and the 16R page link to the simulator |
| Start a project | `/start-project` | `StartProject` (`components/StartProject.tsx`), `lib/start-message.ts` | v3.1 "09 Start a project": three chip groups (`aria-pressed`, toggle off), live message, one WhatsApp button; `?service=` / `?package=` preselect the field from an allow-list; no form, input or storage |
| Try your smart home | `/try` (`?demo=` allow-list) | `Simulator` (`components/simulator/`, client, loaded on this route only), `lib/simulator/{rules,copy,plan,demo}.ts` | v4 "12 Simulator" (DR-110, DR-111): four stages with scroll-tracking pills, home presets, room cards, sticky panel / mobile bottom bar and sheet, lock switch, package tiles, upsell and compare, floor plan with day/night and device effects, 24-hour timeline, Alexa commands, nine routines with Premium gating, gas alert, plan summary, WhatsApp plan message (≤ 900 characters), copy plan, CTA band. Demo only: no form or text input, no network, storage, cookies or analytics |
| Packages | `/smart-home/packages` | `SmartHomePackages`, `PackageTiles`, `PackageComparison` | v2 Packages: cards with photo tiles and ×N badges, Choose → `/contact?package=<id>`, comparison table in a labelled scroll region, `#package-{id}` anchors; v4 banner above the comparison linking to `/try` |
| Contact | `/contact` | dedicated route + `ContactBooking` (`lib/contact.ts`) | v2 Contact (DR-101): package chips, Call and WhatsApp cards with the message preview, the public address (DR-106); no form or storage |
| Support | `/support` | `SupportV3` | v3.1 "Support": last updated, the support line, a warranty-disabled note (feature gate), tips, CTA band |
| Gated customer surfaces | `/account`, `/shop`, `/cart`, `/checkout`, `/support/warranty` | gated informational pages | Unchanged gates: no public commerce, payment, account/device operation or warranty activation |
| Preview-only content | `/preview`, `/preview/bidi-samples` | preview page and bidi samples | Remains non-production/private according to the existing deployment gate |

## Final release additions (DR-114)

| Area | Route | Components | Notes |
|---|---|---|---|
| Privacy | `/legal/privacy` | `app/(site)/[locale]/legal/privacy/page.tsx`, `lib/privacy-draft.ts` | Admin text, headings and paragraphs only; redirects to `/contact` until the OWNER approves it. Footer link and sitemap entry only when approved |
| Booking form | `/contact`, `/try` stage 4 | `BookingForm` (client), `lib/leads.ts`, `lib/booking-token.ts` | Rendered only when the privacy text is approved AND intake is enabled; posts to `POST /api/booking` |
| Announcement | every page | `[locale]/layout.tsx` (`.announce-bar`) | Admin global; off by default |
| Metrics | every page, including `/try` | `MetricsBeacon` (client) → `POST /api/e` | Only `{event, route, locale}`; DNT/GPC respected. On `/try` the simulator raises `otonom:metric` page events (sim_start, sim_stage_2..4, plan_sent); it has no network code itself |
| Staff invite | `/staff/invite` (admin host) | `StaffInviteAccept` | One-time token in the URL fragment |
| Admin | `/admin/sales`, Users → invite (OWNER) | `SalesView`, `InviteStaff` | Leads cards, metrics, OWNER CSV export |
| API | `POST /api/booking`, `POST /api/e`, `GET /api/cron/daily`, `GET /api/metrics/summary`, `GET /api/leads-export`, `POST /api/staff/invite(/accept)` | `endpoints/final-release.ts` | Public host serves only the first three (allow-list); the rest are staff-only on the admin host |

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

- **Language switch:** `LangSwitch` builds its link with `localeSwitchHref()` (`lib/locale-switch.ts`). It keeps only allow-listed, validated state: the portfolio query on `/projects`, `package` and `service` on `/start-project`, an allow-listed `demo` preset on `/try`, and a `#package-{id}` anchor on `/smart-home/packages`.
- **Shared components:**
  - `SiteHeader`: wordmark; nav Home · Smart Home · Controllers · Packages · Services ▾ · Our work · Contact; drawer below 1000px (adds "Try your smart home" after Packages, v4); Book a visit.
  - `SiteFooter`: three link columns (Smart home column includes "Try your smart home", v4), then a Contact column (phone, address, WhatsApp, Contact, Support), then logo, language link and ©.
  - v3 building blocks (`components/v3.tsx`): `InnerHero`, `SplitTitle`, `Circuit`, `Icon`, `IconCards`, `StepCards`, `CtaBand`.
  - Also: `BrandLogo`, `Swash`/`SwashText`, buttons, cards and empty states.
- **Copy:** verbatim from the design in `lib/site-copy.ts` and `lib/site-copy-inner.ts`. Contact details come from `lib/contact.ts` only.
- **404:** unknown language-code paths (e.g. `/xx`) render the Arabic localized 404 inside the shell (proxy rewrite, status 404).

Operational routes (`/staff/login`, `/admin`, Payload/API and GraphQL surfaces) keep their own authentication and security presentation and are not rebranded by the public-site layer.

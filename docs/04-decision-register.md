# Decision Register

| Doc ID | OTONOM-DOC-04 | Version | 2.0-draft | Date | 2026-10-13 | Status | Living register |
|---|---|---|---|---|---|---|---|

## 1. Rules
- Allowed statuses: `APPROVED`, `CONFIRMED_BY_USER`, `PROPOSED`, `OPEN`, `BLOCKED`, `DEFERRED`, `VERIFIED_BY_AGENT`.
- `APPROVED` means **recorded as approved in master prompt v2**, which the owner supplied on 2026-10-13. Original approval timestamps were not provided, so the "Approved at" column cites the source instead of a time.
- `CONFIRMED_BY_USER` ≠ technically verified.
- A suggestion by a previous assistant is never `APPROVED` unless the owner said so.
- Conflicts with external files must be shown, never silently overwritten.

## 2. Register (DR-001 … DR-045 from master prompt v2, enriched)
Owner abbreviations:
- **BO** = business owner
- **ENG** = engineering lead
- **FIN** = finance
- **LEG** = legal counsel
- **OPS** = operations
- **AG** = agent (documentation only)

| ID | Topic | Decision / position | Status | Owner | Evidence required | Impact | Next action | Approved at |
|---|---|---|---|---|---|---|---|---|
| DR-001 | Core identity | Smart Home, advanced integration, controllers | APPROVED | BO | — | Copy, IA | Validate public copy | Master prompt v2 |
| DR-002 | Market | Egypt first, Gulf later (no launch claim) | APPROVED | BO | Coverage proof | Shipping/installation zones | — | Master prompt v2 |
| DR-003 | B2B targeting | Developers, compounds, multi-unit, contractors, partners | APPROVED | BO | — | IA, KPIs | Rank sub-segments if needed | Master prompt v2 |
| DR-004 | Conversion focus | High-value signed contract outcomes | APPROVED | BO | — | KPI design | Numeric targets OPEN | Master prompt v2 |
| DR-005 | Cohort scope | All eligible new contracts, new + existing customers, separate cohorts | APPROVED | BO | — | Data model | Entity matching (DR-049) | Master prompt v2 |
| DR-006 | Attribution | Sourced vs Assisted distinct, exclusive, no double counting | APPROVED | BO | — | Data model | Evidence rubric approval (doc 09 §4) | Master prompt v2 |
| DR-007 | North Star | Sourced-only recommended by assistants. Owner has not chosen | **PROPOSED** | BO | — | Dashboards, incentives | Owner chooses (doc 27 D-Q1) | — |
| DR-008 | Homepage | Story/project-first, consultation/RFQ-first | APPROVED in principle | BO | — | Design | Content/layout review | Master prompt v2 |
| DR-009 | Brand | Existing logo/colours/fonts, minimal | APPROVED | BO | **Asset files + font licences** | Design | Supply assets | Master prompt v2 |
| DR-010 | Languages | AR + EN at launch | APPROVED | BO | — | Everything | Locale URL scheme (DR-046) | Master prompt v2 |
| DR-011 | B2B RFQ | Progressive brief + optional CAD/PDF/images | APPROVED | BO | — | Security | Formats/limits (DR-047) | Master prompt v2 |
| DR-012 | Consultation | Free call. Paid site survey per disclosed policy | APPROVED | BO | Fee/terms document | RFQ flow, invoicing | Provide survey policy | Master prompt v2 |
| DR-013 | Projects team | Engineers triage technical leads | CONFIRMED_BY_USER | BO/ENG | Staffing/capacity | SLA | Define roles/SLA | — |
| DR-014 | Product lineup | 4/6/16 relay controllers | CONFIRMED_BY_USER | ENG | **Datasheets** | Catalogue | Review datasheets | — |
| DR-015 | Pricing | Base price + priced standard add-ons. Custom by quote | APPROVED | BO | Price list | Shop | Provide prices/options/taxes | Master prompt v2 |
| DR-016 | SKU catalogue | Not specified | OPEN | BO/OPS | SKU list | Inventory | Propose/approve scheme | — |
| DR-017 | Inventory | Reserve at staff-approved order confirmation | APPROVED in principle | OPS | — | Integrity | Approve per-order-type transitions (doc 11 §4) | Master prompt v2 |
| DR-018 | Serial | Unique electronic ID reportedly exists | CONFIRMED_BY_USER | ENG | Read method, uniqueness proof | Traceability | Document mechanism | — |
| DR-019 | Shipping | Fees exist | CONFIRMED_BY_USER | OPS | **Fee schedule** | Checkout | Provide tariff | — |
| DR-020 | Installation | Internal team. Project-priced. Electrician required | CONFIRMED_BY_USER | OPS | Coverage/capacity | Promises on site | Provide coverage/capacity | — |
| DR-021 | Checkout | Cart/order submission. Bank/wallet/COD | APPROVED | BO/OPS | Payment instructions | Orders | COD eligibility (DR-050) | Master prompt v2 |
| DR-022 | Payment gateway | Not selected | DEFERRED | BO | — | — | Revisit after launch | — |
| DR-023 | Warranty start | Installation/commissioning | APPROVED in principle | BO/LEG | Commissioning proof rules | Warranty calc | Edge rules (doc 13 §3) | Master prompt v2 |
| DR-024 | Warranty duration | "More than two years" stated. Exact term not adopted | **BLOCKED** | BO/LEG | **Signed warranty policy** | Portal end dates | Formal sign-off | — |
| DR-025 | Warranty portal | Required at first commercial launch | APPROVED | BO | — | Release packaging | Choose W1/W2 (DR-041) | Master prompt v2 |
| DR-026 | RMA procedures | Reportedly documented | CONFIRMED_BY_USER | OPS | **RMA SOP** | Service design | Supply SOP | — |
| DR-027 | Content workflow | Draft/Review/Publish. AI copy human-reviewed | APPROVED | BO | — | CMS | Accept single-actor exception (DR-051) | Master prompt v2 |
| DR-028 | Workspaces | Store Admin + Projects Admin | APPROVED | BO | — | Admin IA | Role design (doc 18) | Master prompt v2 |
| DR-029 | Integration page | Deep technical architecture + compatibility | APPROVED | BO/ENG | Sanitised docs | Content | Supply diagrams | Master prompt v2 |
| DR-030 | Ecosystems | Tested per owner. No universal certification claim | CONFIRMED_BY_USER | ENG | **Test reports** | Claims | Evidence review | — |
| DR-031 | Project media | Apartment videos reportedly available | CONFIRMED_BY_USER | BO | Files + privacy review | Case study | Supply files | — |
| DR-032 | Publishing consent | Only verbal for the apartment | **BLOCKED** | BO | **Written signed consent** | Projects page | Obtain consent | — |
| DR-033 | Mobile apps | Ready, not published | CONFIRMED_BY_USER | BO | Store URLs when live | CTAs | — | — |
| DR-034 | 3D/2D | Desktop 3D / mobile 2D later | DEFERRED | BO | ROI/perf study | — | — | — |
| DR-035 | ClickUp | Manual first. No automation | APPROVED | BO | — | Ops | Runbook | Master prompt v2 |
| DR-036 | Cloud infrastructure | Actual resources unknown | OPEN | BO | Account info (future gate, no secrets) | Hosting plan | Future infra gate | — |
| DR-037 | Architecture | Next.js + Payload 3 + PostgreSQL candidate | PROPOSED | ENG/BO | **Spike results** | Everything | Approve spike (D-Q3) | — |
| DR-038 | Railway | Future host. Deploy deferred and prohibited | APPROVED | BO | — | — | No action | Master prompt v2 |
| DR-039 | Git/GitHub | Completely postponed | APPROVED for this session | BO | — | No VCS work | None unless asked | Master prompt v2 |
| DR-040 | Environment | Antigravity Cloud is the intended **primary** environment (owner, round 2). Its cloud nature is unverified, see DR-062 | APPROVED (intent) | BO | Verified environment evidence | Spike/impl location | Verify per doc 31 §4 | Owner round-2 decision, 2026-10-13 |
| DR-041 | First release packaging | **M2 + W1 provisionally preferred by owner.** Definitions in doc 21 §4 / doc 13 §2. Consistency points in doc 31 §5 need confirmation | PROPOSED (owner-preferred, provisional) | BO | Owner confirms doc 31 §5 points 1–4 | Roadmap | Owner confirmation | — |
| DR-042 | Product claims | Verify datasheets and test reports | OPEN | ENG | Evidence pack | Content | Review (doc 24) | — |
| DR-043 | Policies | Shipping/returns/privacy/terms/warranty not approved | BLOCKED | LEG/BO | Approved texts | Launch | Draft + legal review | — |
| DR-044 | Performance/security SLOs | Numeric targets unspecified | OPEN | ENG/BO | Cost/env discovery | NFRs | Agent proposals in doc 19 | — |
| DR-045 | Contract value recognition | Pre-tax, explicit amendments, cancellation adjustments proposed | PROPOSED | FIN | Finance sign-off | KPI values | Finance review (doc 09 §5) | — |

## 3. Additional decisions raised by this planning pass
| ID | Topic | Position | Status | Owner | Next action |
|---|---|---|---|---|---|
| DR-046 | Locale URL scheme | `/ar/...` and `/en/...` for all public routes. `/` negotiates with an override cookie. `x-default` → `/ar` | PROPOSED | BO/AG | Approve |
| DR-047 | RFQ upload policy | PDF, JPG/PNG/WEBP/HEIC, DWG, DXF. IFC optional. No ZIP/RAR, no executables or macros. 25 MB/file, 10 files, 100 MB/RFQ. Quarantine until scanned | PROPOSED | ENG/BO | Approve after threat review |
| DR-048 | Architecture fallback | If spike veto criteria fail → candidate D (lean custom) | PROPOSED | ENG | Approve with DR-037 |
| DR-049 | Customer entity matching | Tax reg. no. → commercial registry no. → normalised legal name + governorate → human-confirmed group link. Never name similarity alone | PROPOSED | BO/FIN | Approve |
| DR-050 | COD eligibility | Standard SKUs only. Supported zones only. Value cap (amount OPEN). No custom/installation orders | PROPOSED | OPS | Approve + set cap |
| DR-051 | Single-actor review exception | Same person may review and publish while they are the only operator. Recorded per item. Weekly digest to a second named owner | PROPOSED | BO | Approve + name second person |
| DR-052 | Order status access | Non-sequential public reference + phone/email OTP or account. Never sequential IDs | PROPOSED | ENG | Approve |
| DR-053 | Money representation | Exact integer minor units (or `NUMERIC`) + ISO currency. No floats | PROPOSED | ENG | Approve in spike |
| DR-054 | Local PostgreSQL for spike | Native install on the Windows laptop: **declined by owner (round 2)** | BLOCKED | BO | PostgreSQL to be sourced in the verified target environment |
| DR-055 | Non-Git backup of planning docs | ZIP authorised by owner (round 2). Executed: `D:\otonom-backups\` snapshot1 + snapshot2, hash-verified | APPROVED (owner round 2, 2026-10-13). Executed | BO | Owner copies to off-disk storage manually (R-25) |
| DR-056 | v1 docs | Archived under `docs/archive/v1-gate0-2026-10-13/`. v2 is authoritative | VERIFIED_BY_AGENT (action done) | AG | — |
| DR-057 | Shipping before commissioning | Retail units without OTONOM installation: warranty start rule OPEN (e.g. delivery date or self-commissioning registration) | OPEN | BO/LEG | Decide with DR-024 |
| DR-058 | Partner pricing | Private partner prices only after manual eligibility approval. Never public | PROPOSED | BO | Approve |
| DR-059 | Architecture spike | Approved **in principle** by owner. Execution blocked until the environment is verified and V-1…V-7 are reviewed (thresholds proposed in doc 31 §7) | BLOCKED | BO/ENG | Environment verification + threshold approval |
| DR-060 | Unexplained `.git` directory in `D:\otonom` | Must not be modified or deleted | APPROVED (restriction, owner round 2) | BO | None |
| DR-061 | Windows/VS Code/Claude Code workspace | No development there without separate authorisation | APPROVED (restriction, owner round 2) | BO | None |
| DR-062 | Antigravity cloud workspace availability | Not verifiable from the Claude Code session (no Antigravity tool). Public sources describe Antigravity as local-first. Remote use via SSH to a cloud VM is unverified | BLOCKED | BO | Owner picks A1/A2/A3 and runs doc 31 §4 Step B |
| DR-063 | Production OWNER authentication exception | The exact immutable Production `team@otonomiot.com` OWNER record may authenticate with owner-chosen password only. Owner explicitly accepted credential-stuffing, phishing, reuse, takeover and privileged-modification risk. Exact environment/ID/email/role matching, throttling, lockout, audit, secure cookies, CSRF controls and session revocation are mandatory; MFA remains mandatory everywhere else | APPROVED (owner, 2026-10-24) | BO | Implement, test and verify hosted Production without weakening other identities |

**Gap note — DR-064–DR-091:** recorded in the owner's private local register (security, hosting and release-operation decisions). They are intentionally not published (see DR-071/DR-074). This is a numbering note, not a decision.

## 3a. Owner decisions recorded 2026-11-03 (DR-092–DR-112)
| ID | Topic | Decision / position | Status | Owner | Evidence required | Impact | Next action | Approved at |
|---|---|---|---|---|---|---|---|---|
| DR-092 | AI continuity | Planning with Claude in chat and execution by Claude Code/Codex in Antigravity on `D:\otonom` continue without resetting scope, architecture, brand or release rules. Supersedes DR-061 for this scope | APPROVED (owner) | BO | — | Agent workflow | Keep `docs/ai/` current | Owner chat, recorded 2026-11-03; original date unverified |
| DR-093 | Release freeze | Hybrid 03 is the official identity for existing and new UI. D6–D8 continue on the Hybrid lineage. The team lead reviews a protected Preview first. Production changes only on an explicit owner release command with fresh G01–G16 evidence for the exact candidate | APPROVED (owner) | BO | Fresh G01–G16 verdict | Release, UI | Team-lead Preview review | Owner chat, recorded 2026-11-03; original date unverified |
| DR-094 | R16 = 16R | The "R16 Smart Controller" in the package brochure is the OTONOM 16R controller (owner-confirmed 2026-11-02). Package items may link to the 16R product page; package names, prices and quantities stay unchanged | APPROVED (owner) | BO | — | Package copy and links | None | Owner chat 2026-11-02, recorded 2026-11-03 |
| DR-095 | Team-lead access | Use a Vercel Shareable Link on the review Preview. Keep project-wide Vercel Authentication enabled. Retire the temporary reviewer access after the link works (procedure handled privately) | APPROVED (owner) | BO | Link works on the exact Preview | Review access | Create the link in S4 | Owner chat, recorded 2026-11-03; original date unverified |
| DR-096 | PR strategy | D6 commits are added to PR #16 (one combined review PR) by fast-forward only, after the pre-push audit and full QA. No rebase or force | APPROVED (owner) | BO | Pre-push audit + full QA | Git / PR | S3 then S4 | Owner chat, recorded 2026-11-03; original date unverified |
| DR-097 | Product truthfulness | Public product copy uses confirmed facts only (names, channel counts, genuine images, package composition). Technical specs stay "awaiting approval" until the owner or engineering supply verified data | APPROVED (owner) | BO | Datasheets / engineering data | Product copy | Owner supplies verified specs (S5) | Owner chat, recorded 2026-11-03; original date unverified |
| DR-098 | D4 case-study content | Deferred. The portfolio framework stays live with zero entries until materials and written client permissions exist | APPROVED (owner) | BO | Materials + written client permission | Portfolio | None until materials exist | Owner chat, recorded 2026-11-03; original date unverified |
| DR-099 | Visual design v2 | The owner's Claude Design v2 look (tokens, typography, components) becomes the site-wide UI style. The Hybrid 03 logo and brand asset files are unchanged and used byte-for-byte. Existing routes and features are preserved (option A). Supersedes the Hybrid 03 page styling in DR-093 only; the DR-093 release freeze is unchanged | APPROVED (owner) | BO | Team-lead review of the v2 Preview; `validate_brand.py` PASS | All public pages | D8-C plan, then batches C1–C8 | Owner chat 2026-11-03 |
| DR-100 | Home page | Home is "Home (mix)": engineering company and smart home together, smart home first, with the 16R controller as the hero product | APPROVED (owner) | BO | — | `/` in both locales | D8-C C2 | Owner chat 2026-11-03 |
| DR-101 | Public contact channel | Phone/WhatsApp +20 109 072 1847 is published on the site. "Book a visit" opens WhatsApp with a prefilled message. There is no web form, no backend and no storage for these links | APPROVED (owner) | BO | — | Header, footer, home, contact, packages | D8-C C1/C5 (`lib/contact.ts`) | Owner chat 2026-11-03 |
| DR-102 | Package and product claims | Owner-confirmed facts: every package includes Amazon Alexa and voice control works with the controllers; the controllers control lighting, AC and devices; OTONOM installs; installation is included in the package price. Specs beyond channel counts stay "awaiting approval" (DR-097) | APPROVED (owner) | BO | — | Home, packages, controllers copy | D8-C C2–C4 | Owner chat 2026-11-03 |
| DR-103 | 16R display name | The package item is displayed as "16R Smart Controller" everywhere; the brochure name "R16" is the same product (DR-094) | APPROVED (owner) | BO | — | Package data and copy | D8-C data batch | Owner chat 2026-11-03 |
| DR-104 | Fonts | Inter (English body), DM Serif Display (English headings) and IBM Plex Sans Arabic (Arabic), self-hosted with no runtime request to a font provider and no CSP change | APPROVED (owner) | BO | Build output serves fonts from the site origin | Typography | D8-C C1 | Owner chat 2026-11-03 |
| DR-105 | Brochure and component imagery | Owner confirmed rights to all five component images, including the Alexa device image, under owner responsibility (2026-11-03). They are published as WebP with all metadata removed and no edits; Alexa is referred to descriptively only, with no Amazon/Alexa logos or badges | APPROVED (owner) | BO | — | Home and packages imagery | D8-C photo batch | Owner chat 2026-11-03 |
| DR-106 | Design v3.1 inner pages and scope | Inner pages follow the owner's Claude Design v3.1. Public address: "Creativa Damanhour, Colleges Complex" / «كريتيفا دمنهور، مجمع الكليات» (footer Contact column and Contact page, single source `lib/contact.ts`). Out of scope for this release: controller specs (no spec table), privacy-page text and real projects (Our work shows the empty state). Design placeholders (sample cards, optional bands, privacy blocks) never ship | APPROVED (owner) | BO | — | Inner pages, footer, contact | D8-C v3 batches | Owner chat 2026-11-03 |
| DR-107 | Routes outside the design | 308 redirects with the locale kept and the query dropped, removed from nav, footer and sitemap: `/solutions` (+ sub-pages) → `/services`; `/engineering-process` → `/about`; `/build-with-us` → `/start-project`; `/products/compare` → `/products`; `/consultation` → `/contact`; `/business/request-a-proposal` → `/contact`; `/business/partners` → `/business/contractors`; `/technology` (+ sub-pages) → `/products`; `/insights` → `/`; `/support/service` → `/support`; `/legal/privacy` → `/contact`. Gated pages are unchanged. Nothing is removed from Git history. The local synthetic test harness keeps the legacy pages only so existing security suites keep running | APPROVED (owner) | BO | 308 checks on the public profile | Routing | D8-C V7 | Owner chat 2026-11-03 |
| DR-108 | Privacy page | The privacy page is removed for this release (308 to Contact) and every link to it, including consent links, is removed. The site collects no personal data through forms. Approved privacy text remains a release item for the owner | APPROVED (owner) | BO | — | Footer, drawer, consent text | D8-C V7 | Owner chat 2026-11-03 |
| DR-109 | Controllers and services pages | The D6 Smart Product Selector is removed from `/products` (kept in Git history); the page is the v2 header plus controller cards. **The selector part is superseded by DR-112 (selector restored).** `/services` is a short index with the four discipline cards and the CTA band | APPROVED (owner) | BO | — | `/products`, `/services` | D8-C V3 | Owner chat 2026-11-03 |
| DR-110 | Simulator calculation facts | 1 channel = 1 line: one lighting line is one channel, and one device (heater, water pump, extractor fan, curtain, garage door or any other device) is one channel. AC is controlled by the IR remote and uses no channel. Controllers can be combined in one home; extra controllers beyond the package are priced at the visit. Above 64 channels the page shows "your project needs an engineer review". Packages, prices and contents are exactly those of `lib/smart-home-packages.ts`; upsell lines are derived from the prices (+8,000 to Plus, +12,000 to Premium). The gas sensor gives a loud alarm and a phone notification on a leak. Routines are shown as examples our team sets up with the customer; lock-based routines are Premium | APPROVED (owner) | BO | Unit tests on the ported rules | `/try`, selector | D8-C v4 V2 | Owner chat 2026-11-03 |
| DR-111 | "Try your smart home" simulator | Design v4 screen "12 Simulator" ships at `/{locale}/try` with entry points on Home, the Smart Home page, Packages, Controllers, the 16R page, the mobile drawer and the footer. It is a demonstration only: not connected to any device, no form or text input, no network request, no storage or cookies, no analytics; the only outbound action is the visitor's own WhatsApp tap. `?demo=` accepts only the design's preset names. Simulator-only colours are scoped to the page. CSP, intake, commerce, payments, warranty and device control are unchanged | APPROVED (owner) | BO | `sim:browser` suite, axe in every demo state | `/try`, entry points, sitemap | D8-C v4 V3/V4 | Owner chat 2026-11-03 |
| DR-112 | Smart Product Selector restored | Removing the selector from `/products` was a mistake: it returns directly under the controller cards, restyled to v3 (chips, white cards with navy borders, pills, short Egyptian-Arabic copy), with both modes and the logic in `lib/product-selector.ts` unchanged. The result shows the suggested controller(s), the covering package(s) without prices, one WhatsApp button with a message built only from the choices, the line "This is an initial estimate; the engineer confirms it at the visit" and a link to the simulator. Supersedes the selector part of DR-109 | APPROVED (owner) | BO | Restored selector tests | `/products` | D8-C v4 V1 | Owner chat 2026-11-03 |
| DR-113 | D8-C v5 polish and release-gate hardening | (1) `run-all.sh` exits non-zero when any step fails, the summary counts a failure or a suite has no fresh result (self-tested); (2) document titles, meta description and Open Graph/Twitter text are plain text: no bidi control characters and no double spaces (bidi isolation stays in the visible page body); (3) the localized 404 and the unknown-locale 404 have their own localized title; (4) the footer language link reads "English" / "عربي" as in the design (the header keeps "EN"); (5) fonts stay self-hosted with the same look: Arabic files subset to the Arabic block, hashed file names cached as immutable, CSP unchanged; no font preload, because preloading each locale's LCP heading face was measured against the v4 baseline and reverted under the owner's rule (keep the byte savings, revert only the preload). DR-104 stands (same families, same origin) | APPROVED (owner) | BO | `run-all-selftest` step; `d8c-v5` unit tests; visual META-PLAIN and 404-TITLE checks; pixel comparison of 52 reference screenshots | Release gate, every page head, 404, footer, fonts | D8-C v5 | Owner chat 2026-11-04 |
| DR-114 | Final release: admin integration and Production | The current version becomes the final Production site, fully integrated with the admin. (1) One Production deployment, two hosts. The public site is marketing-only and allow-lists exactly `POST /api/e`, `POST /api/booking` and the CRON_SECRET-only `GET /api/cron/daily`. The admin is served only on `OTONOM_ADMIN_URL`, is noindex, and has no link from the public site; a move to the company domain is env + domains only (`docs/ai/DOMAIN_MOVE.md`). (2) Packages, controllers, contact settings, announcement bar, simulator routines and rules, and service FAQs are managed in the admin. All text comes in AR + EN pairs, with drafts, review, publish, versions and audit. The site reads published content with tag revalidation and falls back to the built-in values. Production is seeded with exactly today's values. (3) Roles: SALES (leads, metrics); CONTENT = EDITOR, publishing only when the OWNER allows it. (4) Booking requests reuse the intake security model: consent, honeypot, signed minimum fill time, rate limit, validation and idempotency. The form is visible only when the OWNER has approved the privacy text AND enabled intake, both audited switches; this supersedes the 'no form' part of DR-101 under those switches. Leads are deleted 12 months after the last activity (owner-editable). Simplified form (owner, 2026-11-04): the contact page offers two equal options, «احجز بالواتساب» (unchanged) and «احجز بالفورم», plus the Call button. The form asks only for the name (2–60 characters), an Egyptian mobile (010/011/012/015 + 8 digits; +20, spaces and Arabic digits are normalised), the package (Premium / Plus / Essential / not sure, preselected from `?package=`) and consent, with an optional collapsed note (up to 500 characters); area and preferred time were removed. In the simulator, «ابعت خطتك للفريق» opens the same form with the plan attached read-only (up to 900 characters). First paint (owner, 2026-11-04): the self-hosted `@font-face` rules are part of the main stylesheet, so every page waits on the same stylesheets as v4, and the metrics code is loaded only after the page load event, when the browser is idle; page views, clicks and simulator events before that are recorded and sent then. Release LCP check: a paired back-to-back measurement against `624b70b2`, 20 cold runs per page on the eight measured pages, every page's median within +50 ms. (5) Privacy-first metrics store only (event, route, locale, day) → count; no IP, user agent, cookie or identifier. The simulator counts too: it raises allow-listed page events, and its no-network rule allows exactly one same-origin beacon to `/api/e` with an allow-listed event (owner decision 2026-11-04). (6) Resend e-mail: new-lead alert, a daily digest of leads waiting > 24 h, and a Sunday summary. Without a key, sending is skipped and the lead is kept. (7) Staff invitations by one-time link; MFA is forced at first sign-in; no shared accounts. (8) `/legal/privacy` returns as a page shown only after the OWNER approves the admin text (supersedes DR-108). (9) Release only with the owner's S2 phrase and fresh G01–G16 evidence on the exact SHA | APPROVED (owner) | BO | `final-release` HTTP suite, host routing unit tests, full chain | Admin, public site, release | Final release | Owner instruction 2026-11-04 |
| DR-115 | Vercel plan | The final release runs on the Vercel Hobby plan for now; the owner may move to a paid plan later. No pricing or billing details are recorded. The Hobby limits that matter here: cron jobs run at most once a day (the daily job fits) and the plan is for non-commercial use, so the plan is re-checked before any commercial use | APPROVED (owner) | BO | Recorded; re-checked before commercial use | Hosting | Final release | Owner decision 2026-11-05 |

## 4. Status summary
| Status | Count | Decisions |
|---|---|---|
| APPROVED (incl. "in principle") | 50 | DR-001–006, 008–012, 015, 017, 021, 023, 025, 027–029, 035, 038, 039, 040, 055, 060, 061, 063, 092–114 |
| CONFIRMED_BY_USER | 9 | DR-013, 014, 018, 019, 020, 026, 030, 031, 033 |
| PROPOSED | 13 | DR-007, 037, 041 (owner-preferred), 045, 046, 047, 048, 049, 050, 051, 052, 053, 058 |
| OPEN | 5 | DR-016, 036, 042, 044, 057 |
| BLOCKED | 6 | DR-024, 032, 043, 054, 059, 062 |
| DEFERRED | 2 | DR-022, 034 |
| VERIFIED_BY_AGENT | 1 | DR-056 |

Total: 86 published decisions (DR-001–063 and DR-092–114; updated 2026-11-04). DR-064–091 are private and not counted here.

## Change log
2.10-draft, 2026-11-05: DR-115 added (Vercel Hobby plan for now, owner decision). The final release went live on 2026-11-05.

2.9-draft, 2026-11-04: DR-114 amended by the owner the same day (simplified booking form; first paint: fonts inside the main stylesheet, metrics code after the page load).

2.8-draft, 2026-11-04: DR-114 added (final release: admin integration, two hosts, admin-managed content, booking requests behind the privacy and intake switches, privacy-first metrics, Resend e-mail, staff invitations, privacy page; supersedes DR-108 and the 'no form' part of DR-101 under the switches).

2.7-draft, 2026-11-04: DR-113 added (D8-C v5: release-gate exit code, plain-text titles and meta, localized 404 title, footer language name, font delivery).

2.6-draft, 2026-11-03: DR-110–DR-112 added (simulator calculation facts, the simulator at `/try`, Smart Product Selector restored; DR-109 selector part superseded).

2.5-draft, 2026-11-03: DR-106–DR-109 added (design v3.1 inner pages and scope, legacy-route redirects, privacy page removal, controllers/services pages).

2.4-draft, 2026-11-03: DR-105 added (owner-confirmed rights to the five brochure component images).

2.3-draft, 2026-11-03: DR-099–DR-104 added from owner chat (design v2, home, contact channel, confirmed package claims, 16R display name, fonts). DR-099 supersedes only the Hybrid 03 page styling in DR-093.

2.2-draft, 2026-11-03: DR-092–DR-098 added from owner chat (recorded 2026-11-03). Gap note added for the private DR-064–DR-091. Earlier entries are unchanged.

2.1-draft, 2026-10-24: DR-063 added from explicit owner approval; no named technical approver is recorded or invented.

2.0-draft, 2026-10-13: register rebuilt from master prompt v2. DR-046…058 added. The v1 register (D-001…D-032) is archived and superseded.

## Next review decision
The owner resolves DR-007 and DR-041. The spike approval covers DR-037, 048, 053 and 054.

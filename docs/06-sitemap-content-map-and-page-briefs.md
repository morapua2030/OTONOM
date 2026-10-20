# Sitemap, Content Map and Page Briefs

| Doc ID | OTONOM-DOC-06 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. Functional proposal, not a build list |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
The functional sitemap, the homepage sequence, page briefs with SEO intent, copy needs, CTAs and publication blockers. Grouping is preferred over thin duplicate pages.

## 2. Sitemap v1 (proposed, routes shown without locale prefix; all public routes live under `/ar` and `/en` per DR-046)
| Route | Purpose | Release | Publication blockers |
|---|---|---|---|
| `/` | Home | Launch | Brand assets (DR-009), ≥1 consented project (DR-032) or an honest alternative |
| `/about` | Company, team, approach | Launch | Approved company facts |
| `/solutions` | Hub | Launch | — |
| `/solutions/for-apartments` · `/for-villas` · `/multi-unit-developments` | Segment solutions | Launch | Evidence per claim |
| `/solutions/by-room` · `/by-function` · `/smart-scenes` | Scenario browsing | Launch (merge into hub sections if content is thin) | Implemented vs concept labelling |
| `/business` | B2B hub | Launch | — |
| `/business/developers` | P-DEV landing | Launch | Capacity statement only if proven (DR-020) |
| `/business/contractors` | P-CON landing | Launch | — |
| `/business/partners` | Partner programme + inquiry | Launch | No discount percentages until agreed (DR-058) |
| `/business/request-a-proposal` | RFQ | Launch | Upload policy (DR-047), privacy notice (DR-043) |
| `/projects`, `/projects/[slug]` | Case studies | Launch | **Written consent per project** (DR-032) |
| `/technology` | Hub | Launch | — |
| `/technology/controllers` | Hardware overview | Launch | Datasheets (DR-014) |
| `/technology/integrations` | Integration architecture | Launch | Sanitised diagrams (DR-029) |
| `/technology/compatibility` | Capability matrix (doc 15) | Launch | Test evidence (DR-030) |
| `/technology/documentation` | Public docs | Launch | Approved doc versions |
| `/shop`, `/shop/controllers`, `/shop/controllers/[slug]` | Catalogue | Commercial launch | Prices/SKUs (DR-015/016), datasheets |
| `/cart`, `/checkout`, `/order-status` | Ordering | Commercial launch | Payment instructions, shipping tariff, terms |
| `/support`, `/support/warranty`, `/support/service`, `/support/help` | Support | Commercial launch | Warranty policy (DR-024), RMA SOP (DR-026) |
| `/insights`, `/insights/[slug]` | Articles | Launch (≥3 articles) | Editorial review |
| `/contact`, `/consultation` | Contact, homeowner consultation | Launch | — |
| `/account`, `/account/devices`, `/account/warranties`, `/account/service-requests[/id]` | Customer portal | Commercial launch (W1) | Ownership verification design |
| `/admin/*` | Workspaces | Internal | Not indexed. Access-controlled |
| `/legal/privacy` · `/terms` · `/shipping` · `/returns` · `/warranty` | Policies | Before any data collection (privacy) / commercial launch (others) | Legal approval (DR-043) |

## 3. Homepage sequence (approved principle, proposed content)
| # | Section | Content | CTA | Evidence gate |
|---|---|---|---|---|
| 1 | Hero | "Integrated intelligent spaces" message. Genuine imagery (authorised) | Primary: Request a Project Proposal / Book a Consultation. Secondary: View Real Projects | Image rights |
| 2 | Trust strip | Engineering, service and process values. Counts/testimonials **only if proven** | — | Counts sourced from records |
| 3 | Featured project(s) | Results + technical scope. Identity and security details protected | Read case study | Written consent |
| 4 | For developers & contractors | Multi-unit planning, technical review, supply partnership | Go to Business | — |
| 5 | Advanced integration | Real cross-system scenes, with limits stated | Explore integrations | Test evidence |
| 6 | Solutions matrix | Rooms / functions / scenes | Explore | — |
| 7 | How we work | Scope → design → supply → installation → commissioning → support | Book consultation | — |
| 8 | Controllers | 4/6/16 with base price where approved + "how to select" warning | View controllers | Prices, datasheets |
| 9 | Engineering proof | Datasheets, tests, compatibility qualifications. Warranty terms only after approval | Documentation | Evidence states |
| 10 | Final CTA | Short, accessible, mobile-friendly | Request proposal | — |

**Not acceptable:** a software-agency landing page, a store-only front, or an autoplay heavy 3D hero.
**Performance:** hero LCP budget (doc 19) validated with the real assets.

## 4. Page briefs
| Page | SEO intent (examples, AR+EN keywords to be researched) | Must include | Must not | Acceptance |
|---|---|---|---|---|
| Developers | "smart home for compounds / developers Egypt" | Pains, solution types, high-level architecture, unit repeatability, commissioning workflow, engagement models, examples, engineering FAQs, RFQ CTA | Unproven scale/capacity claims | A qualified prospect understands the scope and reaches the RFQ in ≤ 2 clicks. Upload is available but optional |
| Contractors/partners | "smart relay controller supplier Egypt" | Eligibility, benefits, collaboration models, docs entry, partner inquiry | Public partner prices/discounts | A partner lead type is distinct from consumer purchase |
| Solutions | "smart lighting control villa", etc. | Scenarios, required components, dependencies, safety caveats, implemented vs concept labels | "Safe because Alexa can trigger it" | Every scenario is labelled `IMPLEMENTED` or `CONCEPT` |
| Case study | project-type queries | Consent state (internal), sector, location granularity, objectives, categories, scope, sanitised diagram, media, verified outcomes, limitations, approved testimonial, date, CTA | Publishing on verbal consent. Entry codes, SSIDs, faces without consent | Publish guard blocks if consent is missing |
| Product detail | "4 channel smart relay controller price" | Model, channels, use cases, ratings **from approved datasheet**, qualified-installation notice, network/offline characteristics, firmware options, base + option prices, quote items, fulfilment expectation, shipping/warranty per policy, docs, disclaimers, Add to cart / Request custom quote | Invented ratings or warranty | All numeric specs trace to a datasheet revision |
| Integrations/compatibility | "home assistant relay controller", etc. | Matrix per doc 15 | "Works with all Apple Home devices", certification badges | Each row has a last-verified date and evidence ID |
| Warranty/service | "OTONOM warranty" | Eligibility, serial linkage, commissioning proof, ticket flow, covered/uncertain items | Any end date before policy approval. Data reveal by serial | Policy version shown |
| Insights | educational long-tail | Choosing channel count, custom vs standard integration, local vs remote control, cabinet planning (non-DIY), multi-unit procurement, commissioning handover | DIY electrical instructions, unsupported ratings | Technical review recorded |

## 5. Content production map (owner inputs required)
| Content | Source | Owner | Status |
|---|---|---|---|
| Company story, About | Company profile PDF (not supplied) | BO | Missing |
| Case study #1 (apartment) | Footage + written consent | BO | BLOCKED |
| Controller pages | Datasheets | ENG | Missing |
| Integration matrix | Test reports | ENG | Missing |
| Policies | Legal drafts | LEG | Missing |
| Articles (launch set ×3–5) | Engineering knowledge + editor | ENG/editor | Not started |

## 6. Grouping guidance
If `/solutions/by-room`, `/by-function` and `/smart-scenes` don't each have ≥ 3 substantive, distinct scenarios at launch, merge them into tabbed sections of `/solutions` to avoid thin pages. Add them as separate URLs later.

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner approves the sitemap grouping and the homepage order, and supplies the content inputs in §5.

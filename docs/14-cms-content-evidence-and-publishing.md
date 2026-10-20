# CMS, Content Evidence and Publishing

| Doc ID | OTONOM-DOC-14 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Localized content model, editorial workflow, evidence states, media rights and consent, bilingual behaviour and SEO.

## 2. Content types
| Type | Key localized fields | Gates |
|---|---|---|
| `SitePage` | title, slug, sections, SEO | locales, SEO |
| `LandingSection` | heading, body, CTA | — |
| `Solution` | scenario, components, dependencies, safety caveats, `IMPLEMENTED`/`CONCEPT` label | evidence for IMPLEMENTED |
| `IntegrationCapability` / `CompatibilityEntry` | see doc 15 matrix | evidence + last-verified date |
| `ProductMarketingContent` | description, use cases, FAQs (prices/ratings come from catalogue/datasheet, **not** CMS text) | datasheet link |
| `ProjectCaseStudy` | objectives, scope, outcomes, limitations, testimonial | **written consent per asset** |
| `ProjectMedia` | alt text, captions, crops (desktop/mobile) | rights + consent + redaction review |
| `TestEvidenceReference` | evidence ID, scope, date | reviewer |
| `Testimonial` | quote, attribution | permission for quote + name + photo |
| `CompanyInfo` / `Team` | — | approval |
| `BlogArticle` | title, excerpt, body, tags | technical review |
| `FAQ`, `PolicyPage`, `GlobalNavigation`, `SEOConfig`, `CallToAction`, `HomepageFeaturedItems` | — | PolicyPage: legal approval |

**Hard rule:** inventory, payments, contracts, warranty ownership and attribution are **never** CMS-editable text (FR-CMS-005). The warranty period shown in a policy page comes from the approved `WarrantyPolicyVersion`, not from free text.

## 3. Editorial workflow
| Status | Actor | Exit criteria |
|---|---|---|
| `DRAFT` | Author (AI can propose drafts/translations, with sources listed) | Author submits |
| `IN_REVIEW` | Reviewer | Facts, visuals, legal permission, technical claims, bilingual completeness checked (checklist recorded) |
| `APPROVED` | Approver | Required evidence states confirmed for claims |
| `PUBLISHED` | System on approver action (or scheduled, if approved later) | Auditable revision: time, actor, locale state, source references |
| `WITHDRAWN` | Approver | Taken offline. Revisions and audit retained |

Publishing a new draft never affects the live version until it is published (CMS-AT-001).

**Single-actor exception (DR-051):** while only one operator exists, the same user may pass review and approval. Each such item records `single_actor_exception=true`, and a weekly digest goes to a second named person. The site never advertises a multi-person review process.

## 4. Evidence states for claims
| State | Meaning | Publishable? |
|---|---|---|
| `UNSUPPORTED` | No source | No. Exclude the claim |
| `USER_STATED` | Owner reports it | No (planning context only) |
| `DOCUMENTED_INTERNAL` | Backed by a reviewed internal test/datasheet | Yes, with precise wording |
| `PROJECT_VERIFIED` | Real project evidence reviewed. Limits clear | Yes, as a project-specific statement |
| `THIRD_PARTY_CERTIFIED` | Valid certificate, ID, scope and authorised use verified | Yes, certificate wording allowed |
| `PUBLICATION_AUTHORIZED` | Separate axis: consent/release granted for exact media and claims | Required for client media |

A claim can be technically proven yet unpublishable (privacy/IP). Both axes are checked.

## 5. Media screening checklist (before any project media is published)
Doors/locks/keypads/entry codes · addresses, street views, building signage · faces and voices (adults, **children**) · Wi-Fi SSIDs, router screens, app screens with tokens · device serials/QR codes · alarm panels and gas equipment details · third-party trademarks · reflections showing private content. Blurring a face does **not** fix a visible access-control detail.

## 6. Case study and testimonial consent
`ConsentRecord`: subject, signed document, scope (client name, location granularity, imagery, video, audio, performance claims, quotes), duration, revocation process, signer, date. Verbal consent = **blocked** (apartment case: DR-032). If consent is missing, an anonymised composite may be used only if genuinely adequate and clearly labelled, and lawful (legal check). Fabricated reviews, scores or star ratings are never used.

## 7. Bilingual behaviour
- Genuine RTL/LTR (not a CSS flip). Direction-aware components.
- Locale routes per DR-046. Deliberate slugs (proposal: Latin slugs in both locales to avoid encoded URLs; Arabic slugs OPEN).
- No hard-coded strings. All UI, validation errors, statuses, emails and policies are localized.
- Dates: stored UTC, shown in `Africa/Cairo`. EGP formatting explicit.
- **Public technical specs are never half-translated:** a missing locale blocks publication of that item (no silent fallback on spec pages). Marketing pages: fallback policy OPEN (recommend blocking at launch too).
- Translation of numbers/units (voltage, current) needs engineering review of both versions.

## 8. SEO
- robots, sitemap per locale, canonical, `hreflang` pairs + `x-default`, Open Graph per locale, JSON-LD (`Organization`, `Product` without ratings, `Article`, `BreadcrumbList`, `FAQPage`).
- Distinct, high-intent B2B pages. No keyword-stuffed duplicates.
- Private RFQs, orders, staff pages, device details, contracts, internal docs: protected by **access control first**, with `noindex` as defence in depth. Staging is never indexable.
- Analytics: RFQ start/completion and consultation clicks, consent-aware. Proposal and contract outcomes come from server-side CRM, not trackers.

## 9. Edge cases (master §17.4)
| Case | Handling | Status |
|---|---|---|
| Video shows an entry keypad / family member | Screening checklist §5 blocks it | COVERED |
| "Works with Apple Home" overstated | Evidence state + doc 15 wording rules | COVERED |
| Arabic spec changes voltage meaning | Engineering review of both locales for spec fields | COVERED |
| Testimonial approved for one use only | Consent scope + duration fields | COVERED |
| Logo font licensing | Asset licence check (doc 07) | COVERED |
| June marketing PDF outdated in October | Evidence has `valid_until`/version. Stale evidence flags content | COVERED |
| 6CH discontinued but linked from an article | Product status `DISCONTINUED` → banner + link checker job | COVERED |
| Editor changes the public warranty period | The period isn't CMS text (§2 hard rule) | COVERED |
| Mobile crop hides critical context | Crops reviewed per breakpoint in the media checklist | COVERED |
| No permission → generic example | Clearly labelled, lawful only | COVERED |
| Search engine finds a staging draft | Auth on drafts/staging + noindex | COVERED |

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
The owner approves the evidence-state model and the single-actor exception, and names a second reviewer.

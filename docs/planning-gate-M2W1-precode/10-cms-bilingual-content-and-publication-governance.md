# 10 — CMS, Bilingual Content and Publication Governance

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT |
|---|---|---|---|---|---|---|---|

## 1. Content model (localized fields `{ar, en}`)
| Type | Key fields | Publish prerequisites |
|---|---|---|
| Page | title, slug, blocks[], SEO{title, description, ogImage} | both locales complete, SEO present, review done |
| Block library | hero, text, media, feature-grid, process-steps, case-study-strip, CTA, FAQ, spec-table (bound to datasheet records), claim-snippet (bound to the claim registry) | Bound blocks inherit their source gates |
| Case study | objectives, scope, systems, outcomes, limitations, testimonial ref, media[], consentRecordId | **valid written consent covering every asset and statement** + media screening |
| Article | title, excerpt, body, tags, author, reviewer | technical review for technical topics |
| Scenario | rooms, components, dependencies, safety note, `IMPLEMENTED/CONCEPT` | IMPLEMENTED needs an evidence ID |
| Product marketing | narrative, use cases, FAQ (no prices/ratings typed in) | linked datasheet for any spec |
| Policy page | body, version, approvedBy, effectiveDate | legal approval (G-4) |
| Global | nav, footer, contact, preview banner text | owner approval |
| Media asset | file, alt{ar,en}, captions, crops, rights, consentRecordId?, screeningResult | rights + screening |

**Hard boundary:** prices, stock, orders, payments, contracts, attribution, warranty terms and ownership are **not** CMS content. Blocks can only *display* them from their owning modules.

## 2. Workflow
`DRAFT → IN_REVIEW → APPROVED → PUBLISHED → WITHDRAWN` (+ optional `SCHEDULED`, DEFERRED)

| Transition | Who | Server-side checks |
|---|---|---|
| DRAFT→IN_REVIEW | Editor | Required fields per locale |
| IN_REVIEW→APPROVED | Reviewer | Checklist: facts, claims (registry status), consent, media screening, translation, SEO, accessibility (alt text) |
| APPROVED→PUBLISHED | Owner/Admin | All gates re-evaluated at publish time. A stale consent/evidence blocks it |
| PUBLISHED→WITHDRAWN | Owner/Admin | Reason. Redirect rule if the URL changes |
| Any edit of PUBLISHED | Editor | Creates a new DRAFT revision. Live content unchanged until republished |

- **Single-actor exception:** while one admin exists, reviewer = publisher is allowed but recorded (`single_actor=true`) and appears in the weekly digest (recipient OPEN).
- **Authorisation:** enforced on the server and API, not just the UI. Direct API calls to publish without passing the gates must fail (spike V-4).
- **AI assistance:** AI drafts are allowed. `ai_assisted=true` is stored, sources are listed, and human review is mandatory before publish.

## 3. Localization rules
- Locale completeness: public pages require both locales (no silent fallback) at PV and CR. An explicitly single-locale page needs owner approval and is excluded from `hreflang`.
- Technical values (voltages, currents, channel counts) are bound fields, not free text, so translation can't alter them.
- Arabic copy is native-reviewed. A glossary (AR/EN) of technical terms is maintained.
- Dates: stored UTC, displayed in Africa/Cairo. Currency EGP format. Western digits for specs and prices (PROPOSED).

## 4. SEO governance
Per-locale title/description/OG · canonical self-reference · `hreflang` ar/en/x-default · sitemap index + per-locale sitemaps generated from PUBLISHED content only · JSON-LD from structured fields (`Organization`, `Product` without ratings, `Article`, `BreadcrumbList`, `FAQPage`) · `noindex` on gated/preview placeholders, account, admin, drafts · redirects on slug change.

## 5. Revocation and expiry
- Consent revoked → affected items are auto-withdrawn within a defined time (OPEN, e.g. 48 h), with an alert.
- Evidence expired (`review_by` date passed) → content flagged and the owner notified. Publish of new revisions blocked until re-review.
- Product discontinued → banner + link-checker job flags references.

## 6. Planned tests (NOT EXECUTED)
CMS-T01 draft edit doesn't change live · CMS-T02 publish blocked when a locale is incomplete · CMS-T03 case study blocked without written consent · CMS-T04 claim snippet with OWNER_REPORTED status blocks publish · CMS-T05 direct API publish by an editor role rejected · CMS-T06 consent revocation withdraws content · CMS-T07 sitemap excludes drafts/gated pages · CMS-T08 hreflang reciprocal · CMS-T09 spec values identical in AR/EN · CMS-T10 single-actor approval logged.

## Sign-off (Wave 7a)
Server-side gates ✅ · CMS vs transactional boundary ✅ · Consent gate ✅

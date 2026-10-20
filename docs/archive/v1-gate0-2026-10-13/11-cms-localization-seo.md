# 11 — CMS, Localization and SEO (DRAFT)

## 1. Content types
| Type | Localized fields | Notes |
|---|---|---|
| Page (About, Solutions, Developers & Contractors, Technology & Integrations, Support, Contact, policies) | title, slug, blocks, SEO | Block-based layout (hero, feature grid, case-study strip, CTA, FAQ, specs table) |
| Case study (Project) | title, slug, summary, challenge, solution, results, gallery captions, SEO | Requires a **ConsentRecord** covering the media and details used |
| Post (Insights) | title, slug, excerpt, body, SEO | Author, publish date, tags |
| Product page | name, slug, description, specs, FAQs, SEO | Linked to catalogue variants. Prices come from the catalogue, not the CMS |
| Integration page | ecosystem, method, tested versions, limitations, evidence links | Must link EvidenceRecords |
| Global | navigation, footer, contact info, social links, legal entity info | — |

## 2. Workflow: Draft → Review → Publish
| Status | Who | Rules |
|---|---|---|
| `draft` | editor | free editing. Autosave versions |
| `in_review` | editor → reviewer | locked for editing except by the reviewer |
| `approved` | reviewer | ready. Optionally scheduled |
| `published` | system/reviewer | Publish guard: (a) both `ar` and `en` required fields complete, unless the item is explicitly single-locale; (b) `ai_assisted` items need reviewer confirmation; (c) case studies need a valid, unrevoked ConsentRecord; (d) claims need linked EvidenceRecords; (e) SEO title/description present |
| `unpublished` | reviewer | removed from the site. Redirect rules handled |

Revision history keeps every published version, with rollback to any previous version. With a single admin, the reviewer is the same person. The review step is still recorded as a checklist confirmation (doc 10 §6).

## 3. Localization
- Locales: `ar` (RTL), `en` (LTR). Routes: `/ar/...` and `/en/...`. Root `/` redirects based on `Accept-Language`, with a cookie override (PROPOSED, D-024). There is no auto-redirect for bots: `/` serves an `x-default` chooser or Arabic (OPEN).
- Slugs per locale (Arabic slugs vs transliterated Latin slugs: **OPEN**. Proposal: Latin slugs for both, which avoids percent-encoded URLs).
- `dir` and `lang` on `<html>`. CSS logical properties (`margin-inline-start`) everywhere. Icons that imply direction get mirrored.
- Fonts: OTONOM brand font if provided and licensed for web. It needs an Arabic counterpart with matching weight (OPEN, D-015).
- Numerals: Western Arabic numerals (0–9) for prices, SKUs and phone numbers in both locales (proposal). Eastern Arabic numerals in body copy is an editorial choice (OPEN).
- Bidi: wrap SKUs, phone numbers, emails and code in `<bdi>`/`dir="ltr"` spans.
- Translation: human-reviewed. Machine/AI drafts are flagged `ai_assisted`.

## 4. Case-study consent
A ConsentRecord stores the signed document, its scope (name shown? photos? video? location/compound name? quotes?), the signer and the date. Publishing checks the scope against the content. Revocation unpublishes the content within a defined time. **The apartment case study is blocked until written consent exists (D-013).**

## 5. SEO
- SSR/SSG pages. `generateMetadata` per locale. Canonical per locale URL. `hreflang` pairs + `x-default`.
- `sitemap.xml` (index + per-locale), `robots.txt` (block `/admin`, `/api`, portal).
- JSON-LD: `Organization`, `LocalBusiness` (if an address is public), `Product` (no `aggregateRating` unless real reviews exist), `Article`, `BreadcrumbList`, `FAQPage` where relevant.
- Open Graph/Twitter cards per locale.
- Performance budgets: images via `next/image` (AVIF/WEBP), font subsetting, no heavy 3D on the homepage in MVP.
- Content strategy priorities (proposal): Developers & Contractors landing page, case studies, an integration explainer for each ecosystem written with honest limits, and a "how a smart-home project works with OTONOM" process page.

## 6. Claims governance (summary)
| Claim type | Allowed wording | Requires |
|---|---|---|
| Ecosystem compatibility | "Tested with Home Assistant via [method] (version X, date)" | EvidenceRecord (test report) |
| Certification | "Certified for …" | Official certificate. Otherwise forbidden |
| Local operation | Exact behaviour when the internet/cloud is down | Engineering test evidence |
| Safety | Describe physical fail-safes. No "guarantees safety" | Engineering + legal review |
| Project results | Only what consent covers and what was measured | ConsentRecord + project data |

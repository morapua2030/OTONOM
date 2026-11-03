# OTONOM — Open owner approvals

Do not treat any open item as agreed. Ask only about the items relevant to the task in hand.

| # | Decision needed | Status | Blocks what | Who |
|---|---|---|---|---|
| 1 | Team-lead approval of, or feedback on, the Hybrid 03 design | `BLOCKED` | PR #16 merge; public Hybrid launch | Team lead, then BO |
| 2 | Final go/no-go for Production promotion | `BLOCKED` | Canonical promotion (DR-093) | BO, with a fresh G01–G16 verdict |
| 3 | Verified product specs, images, accessories, stock and device prices | `CONTENT PENDING` | Spec rows, definitive selection or availability claims (DR-097) | BO and ENG |
| 4 | Package inclusions and exclusions (installation, shipping, tax, site prep, wiring, commissioning, price validity, zones) | `CONTENT PENDING` | Any all-inclusive or binding-quote wording | BO, OPS, LEG |
| 5 | Intake privacy policy, consent text, retention and deletion | `BLOCKED` | Public personal-data submission | BO and LEG |
| 6 | Lead ownership, recipients, SLA, notification provider or ClickUp runbook | `BLOCKED` | Claims of a working lead workflow | BO and OPS |
| 7 | Case-study consent, originals and measurable outcomes | `DEFERRED` (DR-098) | Public project stories | BO and the client |
| 8 | SKU, VAT, shipping, COD, returns and payment rules | `BLOCKED` | Commerce activation | BO, FIN, OPS, LEG |
| 9 | Warranty start, duration, exclusions, RMA and service SLA | `BLOCKED` | D7 live warranty and service features | BO, LEG, OPS |
| 10 | North Star, attribution and finance definitions | `BLOCKED` | Operational dashboards and incentives | BO and FIN |
| 11 | Any new paid provider, capacity or billing | `BLOCKED` | Creating billable resources | BO |
| 12 | Retire the temporary reviewer access once the Shareable Link works | `PLANNED` (DR-095) | Closing the review-access item | BO (handled privately) |
| 13 | Turn on the marketing-only mode at release (recommended: makes the site indexable and closes API/private routes on the public host) | `PROPOSED` (D8-D) | Release configuration; indexing | BO |
| 14 | Where staff/admin is served after marketing-only, and how gates G05–G11 are evidenced there | `PROPOSED` (D8-D) | Release gates; admin access | BO and ENG |
| 15 | Confirm in the Vercel UI: uploads disabled, preview-lock flag unset, site URL = canonical origin (agent never reads values) | `PROPOSED` (D8-D) | Release configuration | BO |
| 16 | Production database plan: no migrations expected; read-only identity and migration re-check (G04) | `PROPOSED` (D8-D) | G04/G15 | BO and ENG |
| 17 | Performance budgets for the release (proposal in `RELEASE_CHECKLIST.md`) | `PROPOSED` (D8-D) | Post-release acceptance | BO |
| 18 | Monitoring minimum (proposal: scheduled GitHub Actions page check, no new vendor) | `PROPOSED` (D8-D) | Post-release watch | BO |
| 19 | Privacy page text (still open). Contact channel: phone/WhatsApp `RESOLVED` by DR-101; address and social links still not provided | `PARTIAL` | Public release content | BO and LEG |
| 20 | Legacy `public/brand/otonom-logo.png` (unused, still served): keep or retire | `PROPOSED` (D8-D) | Asset hygiene | BO |

## Resolved

| Decision | Resolution |
|---|---|
| R16 in the package brochure vs the OTONOM 16R controller | `RESOLVED` — DR-094: R16 is the 16R controller |
| How D6 commits reach review | `RESOLVED` — DR-096: fast-forward onto PR #16 after the pre-push audit and full QA; running it is S4 |
| Visual direction, home page, contact channel, package claims, 16R display name, fonts | `RESOLVED` — DR-099–DR-104 (owner chat 2026-11-03); implementation is D8-C |

# Owner Decisions and Blockers

## Decisions that code must not invent

- Final architecture approval.
- Commercial controller SKUs, variants, approved prices, VAT basis, shipping tariff, partner terms, and survey fee.
- Warranty duration, exclusions, replacement treatment, coverage-start details, returns/refunds, and service SLAs.
- Primary North Star KPI, group-company cohort rule, attribution override approval model, and finance-approved FX rounding.
- Official brand assets, company facts, final Arabic/English copy, case-study rights, certifications and compatibility evidence.
- Hosting, domains/DNS, Git policy, e-mail provider, analytics/consent tooling, object storage/AV, payment gateway, and monitoring.

## Legal / external blockers

Privacy and retention, terms/cookies, consumer/returns wording, e-invoicing/tax, consent wording, safety guidance, written media consent, independent security review, formal accessibility review, and human Arabic/editor review.

## Current register

`execution/reports/remaining-release-blockers.md` reports 39 still open as of 2026-10-15: 25 unchanged, seven reduced, and seven new; five original technical blockers were resolved locally. This number must be revalidated against S4 before reuse.

## S4 proposals awaiting confirmation

- Round each foreign-currency contract/adjustment to EGP minor units before aggregation.
- Require a review note when returning content to its author.
- Permit RFQ assignment only to users with CRM write permission.

Implementation is evidence of behavior, not owner approval. Preserve `PROPOSED` until explicitly confirmed.

## Release distinction

- Local B2B functional review may progress with synthetic data.
- Public B2B preview remains blocked by brand/content/legal/infrastructure/human/security gates.
- Commerce and warranty remain local-only and PREVIEW-gated.
- Commercial release is blocked by the full W1 policy and operations set.


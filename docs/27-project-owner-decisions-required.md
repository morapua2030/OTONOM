# Project-Owner Decisions Required

| Doc ID | OTONOM-DOC-27 | Version | 2.0-draft | Date | 2026-10-13 | Status | Awaiting owner |
|---|---|---|---|---|---|---|---|

Only the decisions that block the **next** gates. Each has options and a recommendation (a recommendation is **not** an approval).

## Group A — immediate (blocks P3/spike and roadmap)
| ID | Decision | Options | Recommendation | Why it matters |
|---|---|---|---|---|
| D-Q1 | North Star (DR-007) | (1) Website-Sourced Signed Value · (2) Total Website-Influenced Signed Value | **(1)**, with (2) shown beside it. Revisit after 2 quarters | Dashboard headline, incentives |
| D-Q2 | First-launch packaging (DR-041, DR-025) | M1 complete launch · M2 preview + commercial launch with portal · M3 legacy bridge (exception) | **M2 + W1**: preview labelled as such. Commercial launch includes a real warranty portal | Timeline, honesty of the "launch" claim |
| D-Q3 | Authorise the architecture spike (DR-037) | Yes (3–5 days, synthetic data, no Git, no deploy) · No · Later | **Yes**, after reviewing this pack | Converts the recommendation into evidence |
| D-Q12 | Environment for the spike/implementation (DR-040 vs observed) | This Windows laptop (Claude Code) · Antigravity Cloud · other | Owner's choice. If the laptop: approve the native PostgreSQL install on `D:` (DR-054) | Spike can't run real-DB tests without PostgreSQL |
| D-Q13 | Non-Git backup of `docs/` (DR-055) | ZIP to a location you choose · none | **ZIP** to a cloud-synced or external folder you choose | Docs exist only on the local disk |

## Group B — commerce and warranty (blocks Stages 4–5)
| ID | Decision / input |
|---|---|
| D-Q4 | Warranty duration, start rule, exclusions (E-04) |
| D-Q5 | Prices, options, shipping tariff, payment instructions, tax/invoice policy (E-06, E-08, E-09) |
| D-Q6 | SKU scheme + stock counts (E-07, E-10) |
| D-Q7 | Serial read/uniqueness method + commissioning process (E-11) |
| D-Q8 | Returns/repair policy + support contacts (E-05, E-12) |
| D-Q14 | Bank/wallet confirmation variant (doc 11 §4), COD rules (DR-050), expiry windows |

## Group C — trust and operations (blocks Stage 3 content)
| ID | Decision / input |
|---|---|
| D-Q9 | Written consent for the apartment media: when, and which media (E-16) |
| D-Q10 | Datasheets, test reports, company profile, brand assets (E-01…E-03, E-13…E-15) |
| D-Q11 | Installation capacity and coverage (E-20) |
| D-Q15 | Name a second person for the weekly sensitive-change digest (DR-051) |

## Group D — finance (blocks KPI finalisation)
| ID | Decision |
|---|---|
| D-Q16 | Contract-value recognition (DR-045): pre-tax, amendments, cancellations, master/child, FX rule |
| D-Q17 | Customer entity matching (DR-049) + historical customer list (E-17) |

## Minimum answer set to unlock the next step
**D-Q2, D-Q3, D-Q12** (and D-Q13 for safety of the docs). Everything else can proceed as explicit pending decisions.

## Change log
2.0-draft, 2026-10-13: created.

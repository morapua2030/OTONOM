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

## 4. Status summary
| Status | Count | Decisions |
|---|---|---|
| APPROVED (incl. "in principle") | 26 | DR-001–006, 008–012, 015, 017, 021, 023, 025, 027–029, 035, 038, 039, 040, 055, 060, 061 |
| CONFIRMED_BY_USER | 9 | DR-013, 014, 018, 019, 020, 026, 030, 031, 033 |
| PROPOSED | 13 | DR-007, 037, 041 (owner-preferred), 045, 046, 047, 048, 049, 050, 051, 052, 053, 058 |
| OPEN | 5 | DR-016, 036, 042, 044, 057 |
| BLOCKED | 6 | DR-024, 032, 043, 054, 059, 062 |
| DEFERRED | 2 | DR-022, 034 |
| VERIFIED_BY_AGENT | 1 | DR-056 |

Total: 62 decisions (updated after owner round 2 on 2026-10-13).

## Change log
2.0-draft, 2026-10-13: register rebuilt from master prompt v2. DR-046…058 added. The v1 register (D-001…D-032) is archived and superseded.

## Next review decision
The owner resolves DR-007 and DR-041. The spike approval covers DR-037, 048, 053 and 054.

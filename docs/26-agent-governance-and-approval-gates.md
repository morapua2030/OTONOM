# Agent Governance and Approval Gates

| Doc ID | OTONOM-DOC-26 | Version | 2.0-draft | Date | 2026-10-13 | Status | Binding for agents unless the owner changes it |
|---|---|---|---|---|---|---|---|

## 1. Gates
| Gate | Scope | Allowed | Exit | Status |
|---|---|---|---|---|
| **P0** Environment & evidence reconciliation | Read-only inspection. Read supplied docs | Inspection, Markdown | Audit + ledger | ✅ Done (docs 00, 02) |
| **P1** PRD baseline | Flows, FRs, states, KPIs, evidence, tests | Markdown | Owner review | ✅ Drafted (03–15, 20) |
| **P2** Architecture decision review | Options, recommendation, spike plan | Markdown | Owner decision | ✅ Drafted (16–17). **STOP here** |
| **P3** Implementation authorisation | Spike, then scaffolding/app code | Code **only after explicit owner command** | Spike report / stage exits | ⛔ Not authorised |
| **P4** Domain implementation checkpoints | Stages 2–6 slices | Per-slice approval | Per doc 21 exits | ⛔ |
| **P5** Deployment preparation | Runbook, verification | **No Railway resources without separate approval** | Doc 25 checklist | ⛔ |

## 2. Current permissions
| Activity | Status |
|---|---|
| Read-only environment inspection | ALLOWED |
| Writing English Markdown docs in the workspace | ALLOWED |
| Conceptual diagrams/ERDs in text | ALLOWED |
| Technology comparison on paper | ALLOWED |
| Architecture spike | NEEDS SEPARATE APPROVAL |
| App scaffolding, source tree, database init, package installs | NOT ALLOWED YET |
| **Any Git/GitHub inspection, auth or operation** | **PROHIBITED** (DR-039) |
| **Railway login/provision/deploy** | **PROHIBITED** (DR-038) |
| External paid resources | PROHIBITED without explicit approval |
| Publishing customer media | PROHIBITED until written consent + review |
| Real customer data in tests | PROHIBITED (synthetic fixtures only) |

## 3. Stop rules
Stop and ask when:
- a step would create a cost, an external resource or a public endpoint
- a step would touch Git/GitHub or Railway
- a step would install system software
- evidence is missing for a claim
- a private file would be exposed
- a business decision materially affects data integrity
- the environment differs from what was assumed

## 4. Working rules
- Separate observed / user-stated / proposed / blocked.
- Never say a test passed without running it. Record commands and outputs.
- Never invent prices, durations, ratings, certificates, URLs, capacities or account details.
- Update doc 04 when decisions change. Keep originals (archive, don't delete).
- Report to the owner in Arabic (Egyptian). Write docs and code in English.
- Without Git: protect deliverables with an owner-approved non-Git backup (ZIP). Never use version control as a workaround.

## 5. Quality expectations for later code (summary)
Explicit module ownership · typed contracts · transactions for financial/stock writes · small vertical slices with tests · no fake data presented as real · human review of public claims and of finance/safety logic · synthetic fixtures · exact logs linked to requirement IDs · decision log for deviations.

## Change log
2.0-draft, 2026-10-13: created. Supersedes archived v1 doc 16 (which included Git rules, now removed).

## Next review decision
The owner confirms the gates and opens P3 (spike) when ready.

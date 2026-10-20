# Source Index

| Source | Inspected | Evidence strength / note |
|---|---:|---|
| `execution/reports/otonom-chatgpt-handoff-ar.md` | yes | Current narrative handoff, updated 2026-10-16 but still contains historical sections. |
| `execution/waves/S3-staff-workspaces-browser-e2e.md` | yes | Direct S3 implementation/evidence map. |
| `execution/waves/S4-s3-continuation-waves-0-8.md` | yes | Direct latest implementation report and S4 limitations. |
| `execution/evidence/s4-final-20261016/summary.json` | yes | Machine-readable archived result: 1114/1114, all exits zero. Historical until reproduced. |
| `execution/reports/test-results-verified.md` | yes | Updated through S6 isolated final: 1180/1180. |
| `execution/reports/remaining-release-blockers.md` | yes | Reconciled after S6: 37 open; B-38 and B-40 resolved locally. |
| `execution/reports/owner-decisions-required.md` | yes | Updated with S4 proposals; authoritative for unresolved business inputs. |
| `execution/reports/follow-on-backlog.md` | yes | Reprioritized after S5; completed staff UI, Edge E2E and DB isolation separated. |
| `execution/reports/architecture-decision-assessment.md` | yes | Provisional architecture assessment, not owner approval. |
| `docs/planning-gate-M2W1-precode/01...` | yes | Owner-approved decision ledger; strongest business-requirement source. |
| `docs/planning-gate-M2W1-precode/16...` | yes | Original spike criteria and limitations. |
| `docs/planning-gate-M2W1-precode/23...` | yes | Historical pre-code gate; later approvals/code supersede its execution block. |
| `app/package.json`, package manifests, `tests/run-all.sh` | yes | Current executable scripts and dependency versions. |
| Current `app/web/src`, `app/packages/domain/src`, migrations | mapped | Actual implementation paths, preferred over reports when inconsistent. |
| Transfer ZIP in Downloads | yes, read-only | Contains complete missing §4–§9 and handoff instruction; no project/transcript. |
| Two local Claude JSONL candidates | metadata/structure only | OTONOM continuity confirmed by dates/CWD; raw content not copied or disclosed. |
| PostgreSQL metadata | yes, read-only | Reachable `otonom_dev`, v17.11, 70 non-system tables. |

## Known discrepancies

- Historical S3–S5 totals remain preserved, but S6 establishes the current total as 1180 after CSP, surface, pagination, and ledger coverage.
- The follow-on backlog now moves staff UI, Edge E2E, and disposable E2E database isolation to the completed section.
- B-40 is resolved locally; its human/editor review obligations remain separately open under B-27/B-29.
- The S4 report says the continuation was truncated, but the supplied ZIP now restores the missing text. Codex should complete only the unaddressed checklist items.

# Delivery round S4 — S3 continuation against the restored §4–§9 (2026-10-16)

**Instruction source:** "OTONOM — S3 Continuation: Original Missing Sections §4–§9". **The pasted text arrived truncated again, inside WAVE 8.** Received: §4 (reporting), WAVE 0–7 complete, and the start of WAVE 8. **Not received:** the rest of WAVE 8, WAVE 9–10 and §6–§9. They are not addressed and not claimed.

**Method:** S3 was not redone. WAVE 0–8 were used as a coverage checklist against S3; only the gaps were built, and each was proved in the real browser and the database.

## 1. Environment incidents (VERIFIED)
| Incident | Evidence | Handling |
|---|---|---|
| PostgreSQL stopped twice because the machine shut down (2026-10-16 morning, then again mid-round) | Logs `postgres-server-20261016.log` and `postgres-server-20261016b.log`: "database system was interrupted" → `redo done` → "ready to accept connections" | Restarted with `pg_ctl` (no service). Normal crash recovery, no errors. Integrity checked by a full regression (1095/1095) and by the presence of the latest migration and its columns |
| **Cause of the 601 s CMS suite in S3 identified** | The old server log shows a checkpoint of 268 s with `sync=92 s` exactly during that run; the first recovery also spent about 9 minutes syncing the data directory | **Slow disk writes** on the host, not an application defect. Recorded as an environment limitation; it explains run-time variance |

## 2. Fresh baseline (WAVE 0)
After recovery and before any change: **1095/1095**, every step exit 0 (`evidence/s4-baseline-20261016/`).

## 3. Gap analysis WAVE 1–8 vs S3, and what was built
| WAVE item | State after S3 | S4 action |
|---|---|---|
| W1 Owner/Admin operational overview | Missing | **`/admin/overview`**: role-aware blocks (projects queue, assigned to me, open opportunities, proposals awaiting owner approval; contracts this year, value and unattributed count; content waiting / approved; open and urgent tickets; pending orders and price proposals) plus the stage banner. Each block appears only with the matching read permission; counts only, no invented money |
| W1 Engineer "assigned RFQs" | Missing | "Assign to me" action; "Assigned to me" filter; **server rule: the assignee must hold `crm.write`** (422 `ASSIGNEE_NOT_ELIGIBLE`) |
| W1 searchable / paginated tables | Status filter only | Search (ref, organisation, name, governorate), pagination (25 per page), filters preserved across pages |
| W1 / W5 content editor–reviewer workflow, review comments | Generic Payload screens only | **`/admin/content-review`**: queue by status; checks per item (Arabic complete, English complete, claim status, written consent, media screening); last editor shown; links to edit and revision history. **Review note is required when returning content to the author.** It is recorded with its author only together with a status change, cannot be edited or forged afterwards, and is written to the audit log |
| W4 KPI filters + drill-down to records | Date range only | Drill-down filtered by cohort, attribution and project type; totals from the same server rows; **sanitized CSV export** (no e-mails, phones or evidence references; formula injection neutralised; UTF-8 BOM for Excel) |
| W4 "independent oracle, not the production aggregate" | The oracle tolerated up to 4 piastres of FX rounding drift | **Real defect fixed:** the KPI report rounded *after* summing foreign-currency contracts, so a total could differ by 1 piastre from the sum of its contracts. The rule is now: each contract or adjustment is converted to EGP and rounded on its own, then summed (**PROPOSED** rule for finance confirmation). The oracle now uses exact integer arithmetic and **every tolerance was removed**. 7/7 for 4 seeds |
| W3 failure-path E2Es (double submit, network loss) | API-level only | In Edge: a double click creates exactly one RFQ; with the network cut, the Arabic error shows, the entered data stays, nothing is stored, and the retry succeeds once |
| W7 capture of console errors / failed requests | Missing | The driver records console errors, uncaught exceptions, failed requests, 5xx responses and **any request to another host** |
| W8 third-party data leakage | Not checked | **Real finding fixed:** the Payload admin requested staff avatars from **gravatar.com**, which would send a hash of every staff e-mail to a third party. It was blocked by our CSP only by luck. Now disabled (`admin.avatar: 'default'`) and guarded by an E2E check |

## 4. Tests added in this round
| Suite | New checks |
|---|---|
| Domain | Drill-down rows reconcile exactly with the KPI figures; filters partition the rows; invalid filters refused |
| CMS (HTTP) | Review note required; note and author recorded; note cannot be forged outside a transition |
| E2E (Edge) | 26 → **41**: double submit, offline + retry, owner overview, editor overview limits, KPI drill-down vs DB, CSV content, search, assign to me, assignee eligibility, content return-with-note, author sees the note (no approve control), different reviewer approves, publish, withdraw, zero page errors, zero third-party requests |

Full regression result: see §6.

## 5. Not done / limits
- Instruction parts not received (rest of WAVE 8, WAVE 9–10, §6–§9): unknown, not addressed.
- Owner/finance confirmation needed for the per-contract FX rounding rule (PROPOSED).
- Screen-reader testing: not done (needs a human). Human visual review: still PENDING.
- Admin interface chrome remains English (A4).
- The host's slow disk means run durations vary widely; this is not representative of any target platform.

## 6. Final regression (VERIFIED, `evidence/s4-final-20261016/`)
| Suite | Tests | Pass | Fail |
|---|---|---|---|
| domain | 41 | 41 | 0 |
| web-unit | 7 | 7 | 0 |
| acceptance | 107 | 107 | 0 |
| surface | 84 | 84 | 0 |
| journey | 36 | 36 | 0 |
| cms | 29 | 29 | 0 |
| portal | 17 | 17 | 0 |
| security | 23 | 23 | 0 |
| **e2e (Edge)** | **41** | **41** | 0 |
| visual | 729 | 729 | 0 |
| **Total** | **1114** | **1114** | **0** |

Every step exited 0, including the production build. Dev-database invariants after the run: stage PREVIEW, North Star UNSELECTED, 0 prices / warranty policies / coverage / publishable claims / published pages / valid consents / customer accounts / open quotes.

**Not "all tests passed":** human visual review, screen readers, independent security review, other browsers and any target-platform test were not run.

## 7. Addendum (2026-10-16): database-handling rules of §3, received in a later paste
| Rule (§3) | Finding | Action |
|---|---|---|
| Verified backup before any migration | **Deviation:** the S4 migration `20261016_111606_review_notes` (additive: 4 nullable columns on 2 tables and their version tables) ran without a fresh backup. The last verified backup at that point was from the start of S3 (2026-10-15 11:35) | Verified backup + restore drill taken now: `app/backups/otonom_dev-20261016-160735.dump`, 70 tables, identical row counts, 0 stock violations, 4 append-only triggers. Rule followed from now on |
| Never run setup/migrate against an unidentified database | Only the identifier syntax was checked | `assertSafeTarget()` in `packages/domain/src/migrate.ts`: setup and domain migrations abort unless the host is local and the name is `otonom_dev`, `otonom_test_*`, `otonom_e2e_*` or `otonom_restore_drill`. Unit test added; domain suite **42/42** |
| Prefer a separate `otonom_e2e_*` database for browser E2E | E2E still uses `otonom_dev` with uniquely tagged synthetic fixtures (every run verified to leave the dev-DB invariants intact) | **Not done yet**: backlog item. The guard already allows `otonom_e2e_*` names |

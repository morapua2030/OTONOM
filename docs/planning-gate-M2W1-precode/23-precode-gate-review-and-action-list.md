# 23 — Pre-Code Gate Review and Action List

| Version | 3.0-draft | Date | 2026-10-13 | Status | **STOPPED BEFORE CODE: OWNER APPROVAL REQUIRED** |
|---|---|---|---|---|---|---|---|

## 1. Gate verdicts
| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | M2 + W1 commercial strategy | **APPROVED** | Owner M3P §2.1–2.2. Doc 01 §3 |
| 2 | Planning package coherence | **PASS** for the planning scope (see §2) | 26 artefacts written and verified (doc 00 §7). Contradiction audit (doc 22 §3) with 6 fixes. Traceability 52 rows |
| 3 | Architecture recommendation | **PROPOSED, not tested** (A primary, C fallback) | Doc 12. Scores A≈C under sensitivity |
| 4 | Spike thresholds | **OPEN** (revised proposals in doc 16) | Doc 16 §3 |
| 5 | Spike execution | **NOT AUTHORISED** | OD-05 |
| 6 | Implementation | **NOT AUTHORISED** | OD-08 |
| 7 | Preview publishing | **NOT AUTHORISED** | Needs QG-2 + go-live + deployment approval |
| 8 | Commercial launch | **NOT AUTHORISED** | Needs QG-3, L-1…L-11 |
| 9 | Git/GitHub | **DEFERRED AND OUT OF SCOPE** | OD-06 |
| 10 | Railway | **NOT DEPLOYED, DEFERRED** | OD-07 |

## 2. Why "PASS" for planning coherence (and its limits)
**PASS means:** every M3P artefact exists with substantive content, traceability exists, and the contradictions found were fixed or recorded.

**It does NOT mean:** requirements are approved, estimates are reliable, or any evidence (datasheets, tests, consent, policies) exists.

Business blockers remain (doc 21). They block **launches**, not the planning gate.

## 3. Next approval pack (grouped, prioritised)
### Group 1 — unlocks the spike (and therefore architecture selection)
| # | Decision | Recommended default | Alternative | Reason | Risk if delayed | Unlocks |
|---|---|---|---|---|---|---|
| A1 | Authorise the spike (isolated folder `D:\otonom\spike\`, synthetic data, 5-working-day cap, no Git/deploy) | Yes | Postpone | The stack can't be chosen on scores (A≈C) | Whole programme waits | B1 |
| A2 | Test runtime: portable or native PostgreSQL on `D:` (W-DB-3/W-DB-1) + local storage stand-in. Install Node packages in the spike folder only | W-DB-3 | Container. Remote disposable DB | No external transfer. Low footprint | Spike blocked | B1 |
| A3 | Approve the revised V-1…V-6 acceptance and V-7 "measure-only" (+ optionally V-8…V-10) | Approve | Edit thresholds | Measurable, realistic | Spike ambiguous | B1 evaluation |
| A4 | Arabic admin UI required? (V-6) | English admin acceptable at first | Arabic admin mandatory | Reduces risk/effort | V-6 ambiguity | B1 |

### Group 2 — shapes the preview
| # | Decision | Default | Alternative | Unlocks |
|---|---|---|---|---|
| B1 | Preview variant | P-A first, P-B when the gate passes | P-B from day one | B3 scope |
| B2 | Engage counsel for the privacy notice + retention schedule now | Yes | Later (delays PV) | PV go-live |
| B3 | Written consent request to the apartment client | Start now | Process-story only | Featured project |
| B4 | Name a second person for the weekly sensitive-change digest | Name someone | None (higher governance risk) | Governance |

### Group 3 — commercial-release inputs (can run in parallel)
Warranty policy drafting (PD-08) · returns/shipping/terms/payment policies (PD-14) · price list, SKU scheme approval, options, stock counts (PD-11) · serial method note (engineering) · installation capacity statement (PD-12) · T1/T2 confirmation + COD rules (PD-15) · finance memo on contract accounting (PD-07).

### Group 4 — governance
North Star NS-A vs NS-B (PD-06) · estimate levers (doc 19 §3) · off-device backup (PD-20).

## 4. Immediate action list (owner)
1. Decide Group 1 (A1–A4).
2. Copy `D:\otonom-backups\*.zip` off the laptop (doc 15 §2.1). Optionally request a snapshot3 covering this new pack.
3. Start the legal workstream (privacy first, then warranty and consumer policies).
4. Request written consent from the apartment client.
5. Collect the evidence pack: datasheets, test reports, brand files, RMA SOP.

## Sign-off (Wave 12c)
Ten separate verdicts ✅ · Approval pack grouped with defaults ✅ · Stopped before code ✅

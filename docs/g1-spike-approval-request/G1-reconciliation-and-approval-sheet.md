# G1 — Source Reconciliation and Owner Approval Sheet (planning only)

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-10-14 |
| Status | **AWAITING OWNER APPROVAL. Spike NOT authorised. Nothing executed** |
| Trigger | "OTONOM — G1 Owner Approval and Architecture Spike Execution Master Prompt" (owner, 2026-10-14) |
| Location rule | This is a planning-only report. **No `spike/` directory was created** |

## 1. Read-only observations (this session)
| Item | Observed |
|---|---|
| Host | Antigravity IDE 2.5.5 (`Get-Process -Id $env:VSCODE_PID`, product name and version). Local Windows. Agent = Claude Code extension |
| Workspace | `D:\otonom`. `D:\otonom\spike` does **not** exist |
| Disk free | `D:` 146.4 GB. `C:` 15.6 GB |
| Toolchain | node v24.20.0, npm 11.19.0, pnpm 10.33.0. psql/pg_ctl/docker **not found** |
| npm global prefix | `C:\Users\omar3\AppData\Roaming\npm` (read only, unchanged) |
| Shared package caches | `D:\.pnpm-store` and `D:\npm-cache` exist (from an earlier listing in this conversation). A default `pnpm install` would write to the shared store **outside** the spike folder |
| Ports 3000/3001/5432/5433 | Free |
| MSVC runtime (`vcruntime140*.dll`) | Present (needed by PostgreSQL Windows binaries) |
| Admin rights | **No** (the session isn't elevated). A portable PostgreSQL via `initdb`/`pg_ctl` doesn't need admin |
| Windows Defender real-time | **Enabled**. An EICAR test file written to disk would be detected/quarantined by Defender |
| Network (HEAD requests only, no downloads) | registry.npmjs.org 200 · enterprisedb.com 200 · postgresql.org 200 |
| Source docs | All 13 cited `planning-gate-M2W1-precode` docs + `docs/16…` + `docs/31…` present |
| `.git` | Not read, not touched. (The IDE now reports the folder as a git repository. The agent ran no git command) |

## 2. Reconciliation: approved / proposed / blocked
| Item | Status | Source |
|---|---|---|
| M2 + W1, G-1…G-4 | APPROVED | precode doc 01 §3 |
| Antigravity IDE on local Windows | APPROVED | precode doc 01 OD-01 |
| Stack A vs C | PROPOSED (A ≈ C on judgement scores) | precode doc 12 |
| Revised V-1…V-7 (+V-8…10) | PROPOSED | precode doc 16 |
| Spike execution, installs, PostgreSQL, network downloads | **NOT AUTHORISED (awaiting A1–A8)** | this prompt §2 |
| Git/GitHub, Railway, production code, real data | PROHIBITED | this prompt §3 |

## 3. Discrepancies between this prompt and the existing sources
| ID | Topic | Existing source | This prompt | Proposed resolution |
|---|---|---|---|---|
| D-1 | V-2 rejection codes | doc 16: "100 % rejected with 403" | Accepts 401/403/404 per the endpoint contract | Adopt the prompt (no mutation is the real criterion) |
| D-2 | V-1 idempotency | doc 16: same-key replay | Adds "same key + different payload → deterministic rejection" | Adopt |
| D-3 | V-3 EICAR / scanner | doc 16: EICAR → INFECTED required | EICAR optional, only with a scanner + explicit approval | **Recommend no EICAR** (Defender is active on the laptop. No scanner installed. A scanner like ClamAV would be an extra install not in A2). Test fail-closed while `PENDING`. AV detection = NOT TESTED |
| D-4 | V-4 revocation | doc 16: cache check | Adds a measured revocation interval for withdrawn content | Adopt |
| D-5 | V-5 sessions | doc 16: role change invalidates | Adds password change + MFA disable | Adopt |
| D-6 | V-6 reviewer | doc 16: reviewer session | Automated checks alone are insufficient. A native Arabic reviewer is needed for a full PASS | Owner (or a named Arabic reader) performs the visual check, else PARTIAL |
| D-7 | V-9 reversibility | doc 16: "migration round-trip" | No reversibility claim without real downgrade scripts | Adopt |
| D-8 | Scope vs timebox | doc 16: 5 days | A **and** C for V-1…V-10 in ≤ 5 days | Tight. Priority order: V-1, V-2 (both options) → V-4 → V-3 → V-5 → V-6 → V-7 → V-8…10. Anything not reached = NOT TESTED |
| D-9 | Cleanup vs test resets | — | "No automatic cleanup" (A6) | V-1 (20 runs) and V-9 (restore) **require** truncating/recreating the disposable spike DB. Ask the owner to allow destructive resets **inside the spike test DB only** |
| D-10 | Package install scripts | — | — | pnpm 10 blocks dependency build scripts by default. Payload/Next may need `esbuild`/`sharp`-style native builds. Approval must cover allowing build scripts for listed packages only |
| D-11 | Package cache location | — | "Pause for storage outside the permitted directory" | The default pnpm store `D:\.pnpm-store` is outside the spike. Option (a): set `store-dir` inside the spike (isolated, more download). Option (b): allow the existing shared store |
| D-12 | Browser for E2E (V-4 crawl, V-6, V-10) | — | — | Playwright normally downloads browsers (hundreds of MB). Proposal: use the **already-installed Microsoft Edge** (channel) or HTTP-level tests. No browser download |
| D-13 | MFA in option A | — | — | Payload's built-in TOTP availability is **unverified**. It may need a custom auth strategy or a community plugin (an extra dependency to vet) |
| D-14 | Timebox definition | — | "Five working days" | Define it as 5 calendar working days from approval, with a daily Arabic checkpoint, or as an effort cap. The owner chooses |

## 4. Pre-declared dependency candidates (names only; exact versions resolved at install time and recorded in the lockfile and evidence)
| Group | Packages (candidate) | Origin |
|---|---|---|
| Option A | `next`, `react`, `react-dom`, `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `graphql` (Payload peer), `typescript`, `@types/node`, `@types/react` (+ their transitive deps) | registry.npmjs.org |
| Option C | `next`, `react`, `react-dom`, `pg`, `otplib` (TOTP), `typescript`, `@types/*`. Passwords via built-in `node:crypto` scrypt (no extra dep) | registry.npmjs.org |
| Shared tests | `vitest`, `tsx`. Optionally `playwright-core` (no browser download, uses installed Edge) | registry.npmjs.org |
| Database | PostgreSQL Windows x64 binaries **ZIP** (latest supported major available as a ZIP at download time), run with `initdb`/`pg_ctl`, data dir inside the spike, `127.0.0.1:5433`, test-only role/db. **No service. No PATH change** | EDB official download (if a ZIP is unavailable for the chosen version → pause and ask) |

Disk estimate (rough): PostgreSQL ≈ 0.3–0.5 GB · option A node_modules ≈ 0.6–1.0 GB · option C ≈ 0.3–0.5 GB · test DB/evidence < 1 GB. **Total < 3 GB on `D:`**.

Anything outside this list → pause and ask.

## 5. Approval matrix A1–A8 (recommended defaults; the owner must reply explicitly)
| ID | Decision | Recommended | Consequence of YES |
|---|---|---|---|
| A1 | Execute the bounded spike | YES, ≤ 5 working days, `D:\otonom\spike\architecture-feasibility-YYYYMMDD\` only | Synthetic test code + local runs in that folder |
| A2 | Tools/dependencies | Portable PostgreSQL ZIP on `D:` (no service). The §4 package list only. Allow build scripts for listed packages only. Package store **inside the spike folder** (D-11a) | Downloads of the listed items only. Anything else pauses |
| A3 | Criteria | Revised V-1…V-6 with the D-1…D-7 adjustments. V-7 measure-only. V-8/9/10 included as exploratory | Exactly that protocol. No invented thresholds |
| A4 | Admin language | English admin accepted initially. Public site fully bilingual. Arabic content fields/RTL must be correct | V-6 run on English admin + Arabic content |
| A5 | Upload storage | Local private stand-in only. No bucket. **No EICAR** (D-3) | Cloud ACL = NOT VERIFIED. AV = NOT TESTED |
| A6 | Artifacts/cleanup | Keep all evidence. No automatic deletion. **Allow resetting the disposable spike DB between runs** (D-9) | Manifest + retention. Archive only after owner review |
| A7 | Network | Only the §4 downloads from official sources. No telemetry opt-in (disable Next.js telemetry). No uploads. No accounts | Download log in the evidence |
| A8 | Extra tests | V-8, V-9, V-10 within the timebox | Shortfall reported as NOT TESTED |
| A9 (new) | Timebox definition (D-14) | 5 calendar working days from approval + daily Arabic checkpoint | — |
| A10 (new) | Arabic visual reviewer for V-6 (D-6) | The owner (or a named person) reviews 20 samples once | Without it, V-6 = PARTIAL |

**Blank or ambiguous answer = not authorised.**

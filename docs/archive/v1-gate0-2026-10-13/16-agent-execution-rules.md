# 16 — Agent Execution Rules

These rules apply to any AI coding agent working on this project (Claude Code, Antigravity, ChatGPT/Codex, etc.).

## 1. Authorisation model
- Every action that is **external, hard to reverse, or costly** needs explicit, specific, fresh approval: repo creation, push, CI activation, deployment, installing system software, creating cloud resources, spending money.
- Approvals are **not transferable**: approval to create a repo is not approval to push, and approval to push once is not approval to push again to `main`.
- Each phase ends at a gate (doc 12 §3). The agent stops and reports in Arabic.

## 2. Hard prohibitions (until lifted in writing)
1. No deployment anywhere. No Railway resources. No GitHub↔Railway link.
2. No push, force-push, history rewrite or branch deletion without approval.
3. No changes to the user's Git/GitHub identity (`gh auth switch/login/logout`, global git config) without approval.
4. No credentials in chat, files, commit messages, remote URLs or logs.
5. No modification of unrelated folders on the machine (e.g. `D:\OTONOM_Blender_Project`, other projects on `D:`).
6. No publishing of unverified compatibility, certification, safety, warranty or price claims.
7. No customer files (CAD, photos, contracts) committed to Git.

## 3. Evidence discipline
- Separate **observed / told by user / proposed / blocked** in every report.
- Never claim tests passed without running them. Quote the actual command and result.
- Never invent IDs, URLs, versions, prices, durations or account names.
- Update `02-decision-register.md` when a decision changes. Keep approvals with date and source.

## 4. Engineering conventions (once implementation is authorised)
- TypeScript strict. Validation (zod or similar) at every boundary.
- Business-critical transitions only through domain services, with transactions + idempotency + audit (doc 05 §3).
- Migrations are versioned and reviewed. No destructive migration without a backup + restore plan.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`…). Small PRs. Branches `feat/…`, `chore/…`, `docs/…`.
- No direct pushes to `main` once branch protection exists.
- Tests accompany domain logic. Integration tests use a real PostgreSQL.
- `.gitignore` exists before the first `git add`. `.env.example` holds names only.

## 5. Reporting
- User-facing reports: Arabic (Egyptian preferred). Technical identifiers in English.
- Docs, code, commit messages: English.
- Every checkpoint states: attempted, observed, succeeded/failed, files touched, unverified items, approvals needed, deployment-prohibition status.

# OTONOM — AI continuity map

One owner file per concern. Do not create competing rulebooks; update the owning file instead.

| Concern | Owning file |
|---|---|
| Binding rules | `AGENTS.md` (all agents), `CLAUDE.md` (Claude Code operating context) |
| Verified current state | `docs/ai/CURRENT_STATUS.md` |
| Roadmap D1–D8 and execution order | `docs/ai/ROADMAP_D1_D8.md` |
| Decisions | `docs/04-decision-register.md` (public). Later private decisions DR-064..DR-091 live only in the owner's local root checkout register and are never published. |
| Open owner approvals | `docs/ai/OPEN_APPROVALS.md` |
| Next authorized work | `docs/ai/NEXT_ACTIONS.md` |
| Design system | `docs/WEB_DESIGN_SYSTEM.md` and `docs/WEB_ROUTE_COMPONENT_MATRIX.md` |
| Release gates | `docs/33-release-readiness-gate.md` |
| Raw evidence | `execution/evidence/` (git-ignored, never committed) |

Status legend used in these files: `LIVE` / `PREVIEW` / `IMPLEMENTED (local only)` / `PARTIAL` / `PLANNED` / `CONTENT PENDING` / `BLOCKED` / `DEFERRED` / `PROPOSED`. Unknown facts are written `UNKNOWN`; facts copied from an earlier run are marked `HISTORICAL`.

This repository is public. Tracked files must not contain secrets, credentials, personal contact data, hosting project/team/deployment identifiers, reviewer identities, customer data or raw evidence.

## Session start checklist

1. Read `AGENTS.md`, `CLAUDE.md` and any nested instructions that apply.
2. Read `CURRENT_STATUS.md`, `NEXT_ACTIONS.md` and the decision register. Open the full master handover in private evidence only when needed.
3. Check `git status`, the branch, `origin/main` and PR #16. Never overwrite dirty or interrupted work.
4. Re-verify only the facts the current task depends on (for example a route, a branch head or a schema).
5. Confirm the phase, the latest owner decision, the intended work and the real blockers in a few lines, then proceed once authorized.

## Milestone end checklist

1. Update `CURRENT_STATUS.md` with the source SHA, PR, test results and Preview state.
2. Record any new explicit owner decision in the decision register without deleting earlier rationale.
3. Refresh `NEXT_ACTIONS.md` and `OPEN_APPROVALS.md`.
4. Write one execution report covering user-visible changes and their evidence.
5. Keep secrets, personal information and raw operational logs out of the repository and shared reports.

These files are the continuity layer. No automatic memory service is assumed.

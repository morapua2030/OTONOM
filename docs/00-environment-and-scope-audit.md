# Environment and Scope Audit

| Field | Value |
|---|---|
| Doc ID | OTONOM-DOC-00 |
| Version | 2.0-draft |
| Date | 2026-10-13 (~22:20 EET) |
| Author | Claude Code agent (`claude-opus-5-5`) |
| Review status | DRAFT. Observations are factual; nothing here is an approval |
| Governing instruction | `OTONOM-WEB-MASTER-2026-10-13` v2.0 (master prompt supplied by the owner in this session) |

## 1. Purpose and scope
This document identifies the **actual** runtime of this planning session and records its limits. Per master prompt §0 item 4, the earlier v1 audit is **not** reused as proof. All checks below were re-run in this session.

**Prohibited in this audit and observed as not done:** any Git or GitHub command, inspection, authentication or configuration; any Railway login, provisioning or deployment; any application scaffolding; any package installation; any external spend.

## 2. Verdict on the environment
| Question | Answer | Evidence |
|---|---|---|
| Is this Google Antigravity Cloud? | **NO** | Hostname `LAPTOP-JTL6TGC3`, Windows NT 10.0.26200. Environment-variable **names** show `VSCODE_*`, `CLAUDECODE`, `CLAUDE_CODE_*`, `CLAUDE_AGENT_SDK_VERSION`. There are no Antigravity/Google/cloud markers. Values were not printed |
| What is it? | **Claude Code (Agent SDK) running inside the VS Code extension on the owner's local Windows 11 Home laptop** | as above |
| Workspace path | `D:\otonom` | `Get-Location` |
| Persistence | Local NTFS disk: files survive session restarts. **No backup has been verified.** No cloud sync observed for this folder | Disk listing |
| Write capability | Yes (workspace + session scratchpad) | Write test in scratchpad succeeded and was cleaned up |
| Terminal | PowerShell 5.1.26100.7705 and Git-Bash/MSYS2 (`MINGW64_NT-10.0-26200 3.6.10`) | `$PSVersionTable`, `uname` |
| Browser | Microsoft Edge and Google Chrome are installed (not on PATH). The agent has no browser automation tool in use | File existence check |

**Consequence:** the master prompt was written for Antigravity, but this session ran locally. Because all permitted work is local, reversible Markdown authoring, the agent proceeded with planning here. The owner should confirm where future gates (spike, implementation) will run (see `27-project-owner-decisions-required.md`, D-Q12).

## 3. Toolchain (observed this session)
| Tool | Version | Relevance |
|---|---|---|
| Node.js | v24.20.0 | Candidate runtime for the Next.js stack (spike must confirm the supported LTS) |
| npm | 11.19.0 | — |
| pnpm | 10.33.0 | Preferred package manager candidate |
| Python | 3.14.3 | Utility scripting only |
| VS Code | 1.141.0 | Editor |
| Docker | **NOT FOUND** | No containers available |
| PostgreSQL / `psql` | **NOT FOUND** | The real-DB transaction tests needed by the spike can't run until PostgreSQL is available |
| Railway CLI | **NOT FOUND** | Not installed. Not to be installed now |
| Archive tools | `tar` (MSYS), PowerShell `Compress-Archive` | Usable for an owner-approved, non-Git ZIP backup of planning docs |

Not checked by design: `git`, `gh`, SSH material, credential stores (master prompt: Git/GitHub entirely out of scope).

## 4. Capacity
| Resource | Observed |
|---|---|
| CPU / RAM | 12 logical processors / 15.8 GB (from the earlier inspection of the same machine. Not re-queried, as the hardware is unchanged) |
| Disk `C:` | 142.3 GB used / **14.3 GB free** (tight for container tooling) |
| Disk `D:` | 785.1 GB used / 146.4 GB free |

## 5. Workspace inventory before this session's writes
| Item | Observation | Action taken |
|---|---|---|
| `D:\otonom\docs\*.md` (19 files, v1 planning pack written by the agent earlier on 2026-10-13, 22:06–22:13) | Present | **Moved, not deleted,** to `docs/archive/v1-gate0-2026-10-13/` to avoid confusion with the v2 numbering. Content unchanged |
| `D:\otonom\.git\` (created 2026-10-13 **22:17**, contains a `gk` subfolder) | **Present. Not created by the agent.** It appeared after the v1 docs were written. The `gk` subfolder suggests a GitKraken/GitLens tool | **Not inspected, not modified, not used.** Recorded only because it was visible in a plain directory listing. Git/GitHub stays out of scope |
| Other folders on `D:` (e.g. `OTONOM_Blender_Project`) | Not re-listed this session | Untouched |

**Note for the owner:** a version-control folder exists in the workspace. The agent's file writes in `docs/` will appear as working-tree changes to whatever tool created it. The agent performed **zero** Git operations.

## 6. Previous documents and sources: availability
| Source | Available in this environment? | Used? |
|---|---|---|
| v1 planning pack (`docs/archive/v1-gate0-2026-10-13/`) | Yes | Yes, as secondary material. Corrected where v2 overrides it (notably the warranty-portal deferral and all Git/GitHub content) |
| Master prompt v2 (this session) | Yes (in the conversation) | **Primary source of truth** |
| Kickoff prompt v1 (earlier in this conversation) | Yes | Secondary |
| "Ten discovery rounds" raw transcripts | **No.** Only their consolidation inside master prompt §2.4 | Consolidation used. Raw rounds not reviewable |
| ChatGPT Library PDFs (product/company overview, business plan) | **No** | Not used. Requested in doc 24 |
| Datasheets, test reports, brand files, policies, RMA SOP, project media | **No** | Not used. Requested in doc 24 |

## 7. Readiness for later gates
| Later need | Status in this environment |
|---|---|
| Write planning docs | ✅ Done |
| Run a Next.js/Payload spike | ⚠️ Node/pnpm present. **PostgreSQL missing.** Needs owner approval to install PostgreSQL natively on `D:`, or a different environment |
| Real-DB concurrency tests | ❌ Blocked until PostgreSQL is available |
| Durable backup of planning docs without Git | ⚠️ Possible via an owner-approved ZIP to a location the owner picks. **Not done** |

## 8. Commands executed (all read-only)
```text
Get-Location; [Environment]::OSVersion; $env:PROCESSOR_ARCHITECTURE; $env:COMPUTERNAME; $PSVersionTable
Get-ChildItem Env: | names matching ANTIGRAVITY|GOOGLE|CLOUD|CODESPACE|GITPOD|VSCODE|CLAUDE|TERM_PROGRAM|WSL|CONTAINER (names only)
Get-PSDrive (C, D); Get-ChildItem -Recurse -Force D:\otonom (names/sizes/timestamps only)
<tool> --version for node npm pnpm python docker psql railway code; uname -srm
scratchpad write/read/delete test; existence checks for Edge/Chrome executables; command -v tar; Get-Command Compress-Archive
```
File-system change performed: `Move-Item` of the 19 v1 docs into `docs/archive/v1-gate0-2026-10-13/`.

## 9. Scope compliance statement
- Git/GitHub operations: **0**
- Railway actions: **0**
- Application code written: **none**
- Packages installed: **none**
- External resources or costs: **none**

## Change log
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-13 | v1 workspace audit (archived) |
| 2.0-draft | 2026-10-13 | Re-audit under master prompt v2. Git/GitHub removed from scope. `.git` observation recorded. v1 docs archived |

## Next review decision
The owner confirms the execution environment for the spike and implementation gates (D-Q12) and decides on a non-Git backup of the docs (D-Q13).

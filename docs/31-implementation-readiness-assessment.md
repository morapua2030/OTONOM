# Implementation-Readiness Assessment (Corrected)

| Doc ID | OTONOM-DOC-31 |
|---|---|
| Version | 1.0-draft |
| Date | 2026-10-13 |
| Status | DRAFT. Assessment only. **Implementation not started, not authorised** |

**Trigger:** Owner Decision & Environment Correction (2026-10-13, round 2).

## 1. Owner decisions recorded (round 2)
| Decision | Status recorded | Register |
|---|---|---|
| Antigravity Cloud is the intended primary environment. No development on the Windows/VS Code/Claude Code workspace without separate authorisation | APPROVED (owner, round 2) | DR-040, DR-061 |
| M2 + W1 provisionally preferred, pending verification of definitions | **PROPOSED, owner-preferred.** Not APPROVED | DR-041 |
| Next.js + Payload 3 + PostgreSQL remains a candidate | PROPOSED (unchanged) | DR-037 |
| Spike approved in principle. Execution blocked until the environment is verified and V-1…V-7 are reviewed | BLOCKED | DR-059 |
| Non-destructive ZIP backup of planning docs authorised | APPROVED and executed | DR-055 |
| No local PostgreSQL install | BLOCKED (declined by owner) | DR-054 |
| No modification/deletion of the unexplained `.git` directory | APPROVED (restriction) | DR-060 |
| No Git/GitHub, no Railway, no production services, no app code | APPROVED (restrictions) | DR-038, DR-039 |

## 2. Why the previous executions ran on Windows
1. Both prompts were pasted into the **Claude Code extension inside VS Code** on the owner's laptop (`LAPTOP-JTL6TGC3`).
2. Claude Code runs where its host launched it. It cannot move itself into another product's runtime.
3. This session has **no Antigravity connector or tool**. Nothing in its toolset can open, inspect or execute inside an Antigravity workspace.
4. The first run (kickoff prompt) detected and reported the mismatch, then continued with read-only and planning work.
5. The second run (master prompt v2, §0 item 4: "report plainly and request direction") again reported the mismatch, but **proceeded with documentation instead of stopping for direction**. The agent treated the paste as implicit direction. That was a judgement call the owner did not explicitly authorise, and it is recorded here as a process deviation. No prohibited action (Git, Railway, code, installs, spend) occurred in either run.

## 3. Is a cloud workspace available and accessible from this session?
| Check | Result | Basis |
|---|---|---|
| Antigravity tool/connector in this session | **None** | Inventory of the agent's own available tools (no tool call needed) |
| Ability to reach an Antigravity workspace | **Not possible from this session** | Same |
| Other cloud execution exposed to this agent | Anthropic-hosted Claude Code remote execution exists as a capability, but it is **not Antigravity**. Using it would send workspace content to an external service | **Not used** (owner forbids silent upload of company documents) |
| What "Antigravity" is, per public sources | Primarily a **local desktop IDE/agent platform**. Agents operate on the local machine by default. Remote use is reported via VS-Code-style Remote-SSH (e.g. Coder, a VPS, Google Cloud Workstations). Some reports say the agent may not fully initialise over Remote-SSH. "Remote Control" (Antigravity 2.0) reaches sessions running on **your own computer** from a browser, so it is not a cloud workspace | Web search 2026-10-13. Mostly community/third-party sources, **no official Google confirmation found**. Treat as UNVERIFIED |

**Conclusion:** a cloud workspace **cannot be verified** from here. Per the owner's instruction, the agent stops and provides instructions (§4). **No substitute local audit was performed.**

## 4. User-actionable instructions to establish and verify the intended environment
### Step A — Decide what "Antigravity Cloud" means (owner)
| Option | What it is | Cost/approval | Notes |
|---|---|---|---|
| A1 | Antigravity desktop + a **cloud VM** (e.g. Google Cloud Workstations or Compute Engine) opened via Remote-SSH | Creates a paid cloud resource. **Owner must create and approve it** | Closest to a "cloud workspace". Check that the agent works over Remote-SSH |
| A2 | Antigravity desktop + a managed remote-workspace platform (e.g. Coder) | Platform/VM cost | Same SSH model |
| A3 | Antigravity desktop running **locally** (no cloud) | None | Not a cloud workspace. The owner must decide whether that is acceptable |

### Step B — Verify inside Antigravity (the Antigravity agent or the owner runs these. Read-only)
```bash
hostname; uname -a; cat /etc/os-release           # OS identity
pwd; df -h .; ls -la                               # workspace path, disk
curl -s -m 3 -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/zone   # returns a zone ⇒ running on Google Compute (cloud evidence)
node --version; pnpm --version; psql --version     # toolchain (do NOT install anything yet)
```
Record whether files survive a workspace restart: create a marker file, restart, check it.
**Do not** run Git/GitHub commands. **Do not** log into Railway.

### Step C — Transfer the planning docs (owner, manual)
Copy `D:\otonom-backups\OTONOM-planning-docs-v2-2026-10-13-snapshot2.zip` into the verified workspace by your own chosen method (not Git), extract it, and confirm the file count (52) and spot-check SHA-256 hashes.

### Step D — Hand the planning context to the Antigravity agent
That agent is a different system. It needs `docs/README.md`, `docs/29-chatgpt-handoff-ar.md`, this document, and the master prompt. It must repeat Phase 0 **in that environment**.

## 5. MVP packaging: definitions and trade-offs (for D-Q2 verification)
The definitions live in **doc 21 §4** (M1/M2/M3) and **doc 13 §2** (W1/W2). Doc 27 D-Q2 only references them. Note: the decision register entry is **DR-041**. "D-Q2" is the question ID in doc 27.

| Code | Definition (verbatim intent) | Business trade-off |
|---|---|---|
| M1 | Everything P0 ships together: site, CMS, RFQ/CRM/attribution, store/inventory/serials, real warranty portal | Single, coherent launch and maximum trust. Longest time to any public presence (~23–36 wks, low confidence). Largest release risk |
| M2 | (a) **Public Lead-Generation Preview**: marketing, projects, RFQ, consultation, basic analytics, no shop/warranty claims → (b) **Commercial Store Launch**: catalogue, orders, inventory, policies + minimal real warranty portal (checkout withheld until the portal is ready) → (c) enhancements | B2B leads start earlier (~11–17 wks to preview). Two public milestones must be labelled honestly. Total effort is the same as M1, just sequenced |
| M3 | Leads + request-only products. Orders and warranty handled **outside** the site for a period | Fastest and cheapest, but **diverges from the first-commercial-launch portal requirement**. Exception only |
| W1 | No public commercial launch until a genuine portal works (verified ownership, commissioning-based coverage record, ticket + RMA intake/status) | Honours the requirement. Couples the store launch to portal readiness |
| W2 | Earlier B2B preview without store checkout and without shipping serialised products through the platform. Warranty via assisted support. Never called a portal | Earlier presence, but warranty stays offline longer |

**Consistency check for "M2 + W1"** (needs owner confirmation before APPROVED):
1. During the M2(a) preview, **no products are sold through the platform**, and existing customers' warranty/service continues through the **current off-platform process**. This is W2-like *behaviour* during the preview, and it is acceptable only because the preview is **not** the commercial launch.
2. The preview is publicly labelled as a preview, with no claims of shop or warranty functionality.
3. The "minimal real warranty portal" in M2(b) contains at least: verified device ownership, commissioning-based coverage record, `PENDING_POLICY_APPROVAL` display (no invented dates), service-ticket and RMA intake + status, and hidden internal notes.
4. **Proposed gate:** the commercial launch also requires an **approved warranty policy (DR-024)**. Selling with unpublished warranty terms is a legal/commercial risk (R-03).

## 6. Readiness by gate
| Gate / stage | Readiness | Blockers |
|---|---|---|
| P0–P2 planning | ✅ Drafted (docs 00–30). Owner review in progress | Decisions in §8 |
| **P3a spike** | ❌ **NOT READY** | (1) Target environment unverified (DR-062). (2) PostgreSQL availability in the target is unknown; local install declined. (3) V-1…V-7 not yet reviewed/approved by the owner. (4) S3-compatible test storage needs a decision (any cloud bucket = external resource → owner approval). (5) Synthetic fixtures not yet specified |
| Stage 2 foundation | ❌ | Spike outcome. DR-037 decision |
| Stage 3 B2B core | ❌ | + brand assets, written consent, evidence pack, privacy notice |
| Stage 4 store | ❌ | + prices, SKUs, tariff, tax policy, datasheets, serial mechanism |
| Stage 5 warranty | ❌ | + warranty policy, RMA SOP |
| Stage 6 hardening | ❌ | All of the above |
| Stage 7 deployment | ⛔ Prohibited | Separate authorisation |

## 7. Spike acceptance conditions: proposed thresholds for owner review
| ID | Condition | Proposed pass threshold |
|---|---|---|
| V-1 | Atomic reservation | 50 concurrent confirmations for a stock of 1 → exactly 1 success, 0 negative stock, 0 duplicate reservations, in 3 consecutive runs on real PostgreSQL |
| V-2 | Domain authz independent of CMS | A content-editor role cannot write orders, stock, payments, contracts, attribution or warranty via any admin/API route (automated negative tests) |
| V-3 | Private uploads | Unsigned or expired URL → denied. No public ACL. File not listed in any public endpoint |
| V-4 | Reviewed publication | Draft/in-review revisions never served publicly. Publish blocked without review + both locales |
| V-5 | Admin MFA | TOTP enforced for admin, or a documented compensating control the owner accepts |
| V-6 | Arabic RTL | Admin usable in Arabic for core tasks. Public RTL renders mixed AR/EN fields correctly |
| V-7 | Operability | Production build succeeds. Idle memory ≤ 512 MB, cold start ≤ 10 s (**proposed numbers, owner to confirm**) |

## 8. Unresolved decisions (blocking the next steps)
- DR-062: environment definition and verification (A1/A2/A3)
- DR-041: M2+W1 confirmation of §5 points 1–4
- V-1…V-7 threshold approval (DR-059)
- Spike storage choice
- DR-007 North Star
- DR-024 warranty policy
- DR-032 written consent
- DR-043 policies
- DR-045 contract-value recognition

## 9. Risks added or changed
| ID | Risk | Sev | Mitigation |
|---|---|---|---|
| R-23 | "Antigravity Cloud" may not exist as a native hosted workspace, so the work is blocked by an undefined environment | High | Owner chooses A1/A2/A3 |
| R-24 | Antigravity agent over Remote-SSH reportedly unreliable | Medium | Verify in Step B before committing |
| R-25 | Backup on the same physical disk (`D:`) as the source | Medium | Owner copies the ZIP to an external drive or approved storage manually |
| R-26 | Context loss when switching agents (Claude Code → Antigravity agent) | Medium | Docs 29/31 + master prompt as handoff. Re-audit there |

## Change log
1.0-draft, 2026-10-13: created after owner round-2 decisions.

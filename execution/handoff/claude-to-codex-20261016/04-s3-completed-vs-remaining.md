# S3 / S4 Coverage: Completed vs Remaining

| Area | State | Evidence / remaining work |
|---|---|---|
| W0 source reconciliation and baseline | DONE WITH EVIDENCE | S3 1069 baseline; S4 1095 baseline; source and manifests inspected. Codex fresh run still required. |
| W1 staff information architecture | DONE WITH EVIDENCE | Projects, KPI, Store, Service, Overview, Content Review views; role-aware actions and tables. Human UX review remains pending. |
| W2 auth, sessions, MFA, RBAC | DONE WITH EVIDENCE for covered routes | API and Edge tests include MFA-pending denial and role boundaries. Real email recovery remains blocked. |
| W3 B2B RFQ browser journey | DONE WITH EVIDENCE for one representative flow | Edge covers Arabic RFQ through contract/KPI plus double-submit and offline retry. Upload remains correctly disabled. |
| W4 contracts, attribution, KPI UX | DONE WITH EVIDENCE | Filters, drill-down, CSV, exact independent oracle. FX rounding rule is PROPOSED pending finance confirmation. |
| W5 CMS evidence UX | DONE WITH EVIDENCE for custom queue + HTTP workflow | Return note, distinct reviewer, publish/withdraw covered. Generic Payload edit screens are not comprehensively browser-tested. |
| W6 commerce/warranty foundations gated | DONE WITH EVIDENCE locally | Internal staff flows covered; public routes remain PREVIEW-gated. No real policy/value activation. |
| W7 real browser and accessibility | PARTIAL | Edge/CDP and 360/768/1366 visual automation exist. Human Arabic, screen reader, other browsers, and formal WCAG review remain pending. |
| W8 security/operations | PARTIAL | Negative suite, headers, third-party request guard and backup drill exist. Independent security review and target operations remain blocked. |
| W9 integration/regression/performance | DONE WITH LOCAL EVIDENCE / TARGET BLOCKED | S6 isolated run: 1180/1180 and build pass. Local performance evidence exists; target-platform proof remains blocked. |
| W10 blocker burn-down and final handoff | DONE FOR THIS ROUND | B-38 and B-40 are closed locally with objective evidence; 37 remain open. S5/S6 reports contain the reconciled verdicts. |
| §6 explicit seven verdicts | DONE | Separate verdicts are in `execution/waves/S5-codex-migration-and-s3-closeout.md`. |
| §7 artifact contract | PARTIAL | Existing reports cover much of it; this durable migration package closes the Codex continuity gap. |
| §8 final handoff and next slice | TODO | Update this package after fresh baseline and material changes. |
| §9 continuous execution | ACTIVE | Continue only remaining authorized local work; do not restart completed waves blindly. |

## Highest-value remaining local items

1. Run a controlled framework-upgrade rehearsal on a disposable database copy.
2. Server-render the language switch and evaluate static/ISR only where compatible with nonce CSP.
3. Add reconciliation scheduling and an alert hook without choosing deployment infrastructure.
4. Keep human/legal/commercial/deployment items explicitly open.

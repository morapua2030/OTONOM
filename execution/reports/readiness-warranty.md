# Warranty Portal Readiness (W1) — 2026-10-15

**Determination: FOUNDATION IMPLEMENTED AND TESTED LOCALLY — NOT READY.** The portal stays disabled server-side (PREVIEW). Guardrails G-3/G-4 stand: no commercial warranty portal until the warranty and legal policies are approved.

## Implemented and tested (local, synthetic)
- **Customers:** accounts (no e-mail verification yet).
- **Device ownership:** order token, one-time commissioning code, or staff review; no oracle; one verified owner per serial.
- **Commissioning:** records per serial.
- **Coverage:**
  - policy versions (approval requires a duration);
  - coverage states;
  - **no coverage dates anywhere without an approved policy.**
- **Service:**
  - service tickets, IDOR-safe;
  - safety escalation (urgent, guidance, callback required);
  - RMA state machine with reasons;
  - replacements with append-only history and ownership transfer.

Evidence:
- domain service 8/8;
- portal 17/17.

## Blocking activation
| Need | Blocker |
|---|---|
| Warranty duration and terms; coverage start event; replacement-coverage rule; SLAs | B-03, B-37 |
| Legal review of warranty terms, safety guidance wording, consumer protection obligations | B-04, B-11, B-12 |
| E-mail verification + notifications for customers | B-20, B-41 |
| Customer portal UI (sign-up, devices, tickets) | Product backlog; depends on B-03, B-20 and B-41. B-40 concerned staff operations and is resolved locally |
| Attachment handling for tickets (needs AV + storage) | B-19 |
| Hosting, backups, monitoring | B-16, B-18, B-25 |

## Unsafe to activate
Without an approved policy the portal could only show "no coverage record" for every device. Without e-mail verification, accounts cannot be trusted for ownership-sensitive actions beyond the proof methods implemented.

## S5 verification addendum (2026-10-16)

**Verdict: PARTIAL (local only), BLOCKED for activation.** Ownership/service/RMA automated coverage passed inside the S6 1180/1180 isolated run. `otonom_dev` still has zero warranty policies and zero coverage records; the public portal remains PREVIEW-gated.

## S7 addendum (2026-10-18)

The public gated view now explicitly states policy-not-approved, ownership-verification and server-disabled service status; Service staff tables were corrected for mobile. Portal remains 17/17 and full S7 is 1430/1430. No warranty policy, duration, SLA, e-mail verification or public activation was added; verdict stays **BLOCKED**.

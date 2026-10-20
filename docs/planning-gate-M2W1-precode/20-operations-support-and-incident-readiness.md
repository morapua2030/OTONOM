# 20 — Operations, Support and Incident Readiness

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. Responsibilities are **assumptions** until the owner names people |
|---|---|---|---|---|---|---|---|

## 1. RACI (R = responsible, A = accountable, C = consulted, I = informed)
| Activity | Owner | Engineering | Content | Support | Finance | Legal | Installer | Admin |
|---|---|---|---|---|---|---|---|---|
| Approve releases (PV/CR) | A | R | C | C | C | C | I | I |
| Content publication | A | C (technical claims) | R | I | — | C (policies) | — | I |
| RFQ triage/qualification | A | R | — | I | — | — | C (capacity) | — |
| Proposal approval / contract record | A/R | C | — | — | C | C | — | — |
| Attribution overrides | A/R | — | — | — | C | — | — | — |
| Order confirmation | A | — | — | R (Store) | I | — | — | R |
| Payment verification | A | — | — | R (Store) | C | — | — | — |
| Stock adjustments | A | — | — | R (Store) | C | — | — | — |
| Commissioning records | A | R | — | — | — | — | R | — |
| Warranty decisions / RMA | A | R | — | R | C | C | C | — |
| Policies (warranty, privacy, shipping, returns, terms) | A | C | C | C | C | R | — | — |
| Incident response | A | R | I | C | I | C (data breach) | — | C |
| Backups/restore drills | A | R | — | — | — | — | — | I |

**Today one person likely holds Owner, Admin and most R roles**, with engineers on sales leads.

## 2. Bottlenecks and minimum safe processes
| Bottleneck | Minimum process |
|---|---|
| Single admin approves everything | Single-actor flags + weekly digest to a second named person. Batch approvals at a fixed daily time |
| Engineers handle sales leads | Qualification score + SLA dashboard. Template replies for NEEDS_INFO. Decline reasons |
| Manual payment verification | Daily bank/wallet statement check at a fixed time. Unique-reference rule |
| Commissioning data capture | Checklist-driven form. Same-day submission rule |
| Content production | Editorial calendar. Native Arabic reviewer |

## 3. Support model
| Stage | Channel | Promise |
|---|---|---|
| PV | Existing phone/WhatsApp/email (owner to confirm), shown on `/support` | "Our team will respond during business hours". **No portal, no SLA claims** |
| CR | Portal tickets + existing channels | Published response targets **only after staffing is confirmed** |

Ticket priority (proposed):
- **P1 Safety:** response within business hours or immediate callback, plus an emergency disclaimer.
- **P2 System down**
- **P3 Partial fault**
- **P4 Question**

## 4. Incident readiness (planned)
| Incident type | Detection | First actions | Owner |
|---|---|---|---|
| Site down | Uptime alert | Status check, rollback to the last good release, notify the owner | Eng |
| Data exposure (e.g. RFQ file) | Audit anomaly / report | Revoke signed URLs, rotate credentials, assess scope, legal consult (breach notification duties to be confirmed) | Eng + Legal |
| Payment fraud suspicion | Duplicate reference alert | Hold the order, verify the statement, contact the customer | Store + Finance |
| Oversell / reconciliation drift | Job alert | Freeze confirmations for the SKU, reconcile, customer communication | Store + Eng |
| Content error (wrong claim) | Report | Withdraw content, correct, review registry | Content |
| Account compromise | MFA/login anomaly | Disable the account, revoke sessions, audit review | Eng |

DR objectives (RPO/RTO) and uptime targets: **OPEN** (doc 15 §4).

## 5. Account recovery and staff onboarding/offboarding
- **Customer recovery:** verified email/phone OTP. Never via serial number.
- **Staff recovery:** owner-approved reset + MFA re-enrolment, audited.
- **Onboarding:** role assignment, MFA enrolment, runbook reading.
- **Offboarding:** disable the account, revoke sessions, rotate shared secrets, transfer ownership of open items.

## 6. Release rollback
- Keep the previous build artefact.
- Make database migrations backward-compatible (expand/contract) so the app can roll back without a DB restore.
- Destructive migrations need backup + approval.
- Feature flags allow disabling a feature without a redeploy.

## 7. Preview service-promise limitations
The preview must not imply order fulfilment, warranty handling via the site, response-time guarantees, or installation availability in all regions.

## Sign-off (Wave 11d)
RACI ✅ · Bottlenecks + minimum processes ✅ · Incident playbook ✅

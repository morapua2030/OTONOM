# WAVE 4 — Administration and CMS Hardening

All behaviour below is verified with **direct API requests** (`app/tests/src/cms.ts`, 26 checks), not only through the UI.

## 1. Findings and fixes
| ID | Finding | Severity | Fix | Check |
|---|---|---|---|---|
| W4-1 | Claim publishability was **self-declared** per page (`claimStatus` editable by the editor), so the claims registry could be bypassed | HIGH | `claimsUsed` (relation to registry claims). `claimStatus` is derived by the system at publish time and read-only | CMS-CLAIMSTATUS-DERIVED, CMS-CLAIM-GATE |
| W4-2 | One person (e.g. ADMIN, who holds edit + review + publish) could write, approve and publish alone | MEDIUM | Four-eyes: the last editor of the content cannot approve it (`SELF_REVIEW`). **PROPOSED** control for owner confirmation | CMS-FOUR-EYES, CMS-OTHER-REVIEWER |
| W4-3 | A claim that lost its evidence stayed visible inside already-published pages | HIGH | A claim downgrade automatically withdraws published pages and case studies relying on it (same mechanism as consent revocation) | CMS-CLAIM-DOWNGRADE-WITHDRAWS |
| W4-4 | CMS decisions were not audited: workflow, consent, claims, stage flips (only role changes were) | MEDIUM | `auditRow()` writes these to the append-only `domain.audit_events`: `content.*`, `claim.status`, `consent.*`, `media.*`, `settings.stage`, `rfq.convert` | CMS-AUDIT-*, AUDIT-STAGE, AUDIT-APPEND-ONLY |
| W4-5 | A consent had no signed-document reference or scope, and a revoked consent could be set back to VALID | MEDIUM | `evidenceRef` required; `scope` (CASE_STUDY / CLIENT_NAME / LOGO / PHOTOS / VIDEO / QUOTE); revocation is final; versions | CMS-CONSENT-* |
| W4-6 | No media management for the public site | — | New `media` collection: PNG/JPEG/WebP only (SVG and video refused), max 5 MB; bilingual alt text required; client-property photos need a VALID consent with PHOTOS scope **and** privacy screening; publisher approval; any change to approved media returns it to DRAFT; consent revocation withdraws the media and the file stops being served | MEDIA-* (9) |
| W4-7 | Case studies had no SEO fields; SEO fields had no length limits | LOW | Localized `seoTitle` (≤70) / `seoDescription` (≤170) on pages and case studies | build + schema |
| W4-8 | No revision history for organisations, contacts, consents, settings | LOW | Versions enabled | migration `20261014_225104_wave4_cms_hardening` |
| W4-9 | Session cookie was `secure: false` unconditionally | MEDIUM (production) | `secure` is automatic when `OTONOM_SITE_URL` is https | config |

## 2. Verified session and authentication behaviour
| Behaviour | Result |
|---|---|
| Logout | Ends the server session; the old cookie gets 401 |
| Password change | Ends the user's other sessions |
| 10 failed logins | Lock the account: the correct password is then refused and `lock_until` is set in the database |
| Role change | Clears sessions and MFA bindings (spike V-5, still in place) |
| Password-only (MFA-pending) session | Cannot open the admin panel or call protected APIs (acceptance) |

## 3. Editorial vs transactional boundary (unchanged, re-verified)
- The CMS database role has no rights on schema `domain`.
- Editors cannot read CRM or KPI.
- Domain mutations only go through `/api/workspace/*` and `/api/admin/*` endpoints with role + MFA checks (surface probe 84/84).

## 4. Regression
| Suite | Result |
|---|---|
| Acceptance | 93/93 |
| Surface | 84/84 |
| Journey | 36/36 |
| CMS | 26/26 |

The journey suite was run twice in a row. The first rerun exposed a real bug, now fixed: the duplicate-opportunity guard counted **closed (signed) opportunities** as duplicates. Only open opportunities count now, and a regression check was added.

## 5. Open / not done
- **Admin UI polish.** Editors still see a "Publish changes" button that the server refuses. The workflow has no dedicated buttons and there is no custom Projects/KPI admin view (backlog).
- **Arabic admin UI chrome** (A4: English acceptable initially).
- **Media storage.** Local disk only; production object storage + ACL + antivirus is BLOCKED (B-19).
- **Transactional audit.** CMS audit rows are written on a separate connection, not in Payload's transaction (documented limitation; a reconciliation job is in the backlog).

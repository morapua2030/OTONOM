# Security, Privacy and Threat Model

| Doc ID | OTONOM-DOC-18 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. Not legal advice |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
This platform handles corporate blueprints, prospective contract values, customer addresses, device serials, warranty records and payment evidence. It is treated as a **sensitive transactional system**. The scope covers threats, mitigations, the permission matrix, file controls, privacy and operational security.

## 2. Assets (by impact)
1. RFQ files (CAD, plans, site photos).
2. Privileged admin accounts.
3. Customer PII, addresses, installation sites.
4. Contract values and attribution (financial reporting integrity).
5. Inventory, serials and warranty records.
6. Payment evidence.
7. Published technical/safety claims (legal exposure).
8. Secrets (DB, storage, email, bot-protection keys).

## 3. Threats and mitigations
| ID | Threat | Mitigations | Test |
|---|---|---|---|
| T-01 | IDOR/BOLA on RFQ files, orders, tickets, devices | Server-side ownership checks on every query. Non-enumerable references. Signed short-lived URLs issued only after authz | SEC-AT-001, RFQ-AT-003, WAR-AT-001 |
| T-02 | Admin compromise alters contracts, stock, payments, claims | MFA by default; DR-063 is an owner-accepted password-only exception for one immutable Production OWNER identity. Least privilege, strict RBAC, security-change audit and session revocation remain mandatory | SEC-AT-002 |
| T-03 | Brute force, credential stuffing, session fixation/theft | Account and IP rate limits, progressive cooldown buckets, Payload lockout, strong passphrase policy, generic errors, secure cookies (HttpOnly, Secure, SameSite), session expiry/revocation | SEC-AT-003 |
| T-04 | Malicious uploads (malware, decompression bombs, polyglots, path traversal) | Allow-list, magic bytes, size quotas, no archives, opaque keys, quarantine + scan, no server-side CAD parsing at launch | RFQ-AT-002 |
| T-05 | Stored XSS (CMS rich text, RFQ text, service notes) | Sanitised rich text, output encoding, strict CSP with nonces, admin views escape customer text | SEC-AT-004 |
| T-06 | CSRF / confused deputy on privileged routes | CSRF tokens or same-site + origin checks on mutations. No GET mutations | SEC-AT-005 |
| T-07 | SQL injection / unsafe filters | Parameterised queries/ORM, allow-listed sort/filter fields | SEC-AT-006 |
| T-08 | Race conditions in stock/confirmation | Transactions, conditional updates, idempotency (doc 12) | STOCK-AT-001/002 |
| T-09 | Duplicate manual payment verification | Unique payment reference per order. Verification idempotent | SHOP-AT-003 |
| T-10 | Leakage via errors, analytics, logs, exports | Generic errors with correlation ID, PII redaction, no third-party analytics on private pages, permissioned exports | SEC-AT-007 |
| T-11 | Public media links / indexing of private objects | Separate public/private buckets, private ACLs, noindex as defence in depth | SEO-AT-002 |
| T-12 | DoS via uploads, requests, email floods, transcoding | Rate limits, payload caps, queue-based email, no on-the-fly video transcoding at launch | SEC-AT-008 |
| T-13 | Misleading compatibility/safety claims | Evidence states + safety wording rules (docs 14, 15) | CMS-AT-003 |
| T-14 | Future IoT/voice control abuse | **Out of scope.** No device control from the website (master §8.9) | — |
| T-15 | Supply chain (npm packages) | Lockfile, minimal dependencies, audit, build-script allow-list, pinned versions | Stage 6 |
| T-16 | Staff over-access to private home details | Need-to-know roles, access logging, no blanket impersonation | SEC-AT-009 |

## 4. Permission matrix (draft; final needs owner approval)
| Action | Visitor | Customer | Engineer | Store op. | Content editor | Admin |
|---|---|---|---|---|---|---|
| View published pages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit own RFQ | ✓ | ✓ | as visitor | as visitor | as visitor | ✓ |
| View private RFQ documents | ✗ | own, verified | assigned/authorised | ✗ | ✗ | need-to-know |
| Approve custom integration | ✗ | ✗ | role-specific | ✗ | ✗ | configurable |
| Confirm store order | ✗ | ✗ | if assigned | ✓ | ✗ | ✓ |
| Verify payment | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Adjust stock | ✗ | ✗ | ✗ | approved ops | ✗ | ✓ (audited) |
| Publish technical claims | ✗ | ✗ | technical review | ✗ | editorial workflow | approval per governance |
| View own warranty records | ✗ | own only | assigned case | as needed | ✗ | authorised |
| Edit signed contract value | ✗ | ✗ | authorised sales/finance role | ✗ | ✗ | restricted + audited |
| Override attribution | ✗ | ✗ | authorised reviewer | ✗ | ✗ | restricted + audited |
| Export reports with PII | ✗ | ✗ | ✗ | ✗ | ✗ | restricted + audited |
One admin account at launch, but every check is role-based so new roles are a configuration change.

## 5. File intake and storage controls
- Two trust zones: public media vs private customer files (separate buckets/prefixes and credentials).
- Validate extension + MIME + content signature + size + aggregate quota.
- CAD allow-list (DR-047). Previews are not generated at launch.
- Opaque random keys. Original filename kept only as metadata (sanitised).
- Quarantine until scanned (scanner choice in the spike: self-hosted ClamAV service vs a managed scanning API, cost/privacy trade-off).
- Short-lived signed URLs only for authorised users. Downloads logged.
- Notifications never attach or publicly link customer files.
- Cleanup of temporary, failed and expired uploads per retention.

## 6. Privacy and compliance (checklist for counsel; not legal advice)
| Item | Note |
|---|---|
| Egypt Personal Data Protection Law No. 151/2020 and its executive regulations | Counsel to confirm the current obligations (licensing/registration with the data protection centre, DPO, breach notice, cross-border transfer) |
| Privacy notice AR/EN | Purposes, categories, retention, recipients (hosting, email, storage), rights, contact |
| Cookies/analytics consent | Prefer first-party, privacy-friendly analytics. Consent banner if non-essential |
| Lawful basis | For RFQ files, customer records, marketing |
| Retention schedule | RFQ files (won/lost), payment proofs, contracts, warranty, audit logs |
| Consumer protection | Returns/refunds, warranty representations, price display, e-invoicing where applicable |
| Cross-border hosting | Railway regions are outside Egypt, so the transfer implications need review |
| Future Gulf markets | Separate review (e.g. KSA/UAE PDPL) |
| Data subject requests | Procedure for access, rectification and deletion that preserves statutory records |

## 7. Operational security
Environment separation (local/test/staging/production) · secrets in a managed store per environment, never in files or docs · key rotation owner per secret · least-privilege DB roles (audit table insert-only) · backups encrypted, with restore tested · security headers (HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors) · dependency hygiene.

## 8. Single-operator risk
No segregation of duties is possible with one person. Compensating controls: mandatory reasons on sensitive changes, immutable audit, weekly digest to a second named person, MFA, and a two-person rule enabled as soon as a second account exists (DR-051).

### 8.1 Production OWNER password-only exception (DR-063)

On 2026-10-24 the owner explicitly accepted credential-stuffing, phishing, password-reuse, account-takeover and privileged-modification risk for exactly one Production record: canonical email `team@otonomiot.com`, role `OWNER`, and its configured immutable Payload subject ID. The exception is not an MFA success: authorization is a separate server-side policy decision after genuine Payload password authentication.

The decision fails closed unless all exact conditions hold: explicit enable flag, Vercel Production, Preview lock absent, public-marketing-only mode absent, canonical lower-case email, OWNER role and immutable subject ID. Deletion/recreation, a case variant, missing configuration, local/Preview execution or any other account restores normal session-bound MFA. Email OTP, TOTP and recovery endpoints are unavailable only to that exact exempt identity.

Compensating controls are mandatory: the existing 14–128 character password policy, Payload password hashing, per-account and per-IP shared-database throttles, one-minute burst cooldown plus ten-minute account/IP windows, Payload lockout, generic login errors, Secure/HttpOnly/SameSite cookies, origin checks, eight-hour session expiry, session revocation on password/role changes, pseudonymous failed-login audit, successful-login/logout/security-change audit and unchanged OWNER RBAC. Provisioning and recovery use an owner-controlled one-time local workflow with the password on stdin; secrets must never enter argv, environment variables, files, Git, screenshots or reports.

## Change log
2.1-draft, 2026-10-24: recorded DR-063 and the exact owner-approved Production OWNER password-only exception with compensating controls; MFA remains mandatory elsewhere.

2.0-draft, 2026-10-13: created. Permission matrix from master v2 §9.2, extended with payment verification and exports.

## Next review decision
The owner approves the permission matrix. Counsel reviews §6.

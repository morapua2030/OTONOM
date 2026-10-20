# Security Assessment (self-review) — updated 2026-10-18

> Self-assessment by the implementing agent with synthetic data on a local build. **Required before any public exposure: an independent security review / penetration test (B-30).**

Full threat-by-threat analysis: `waves/W09-security-reliability.md`.

## Posture summary
| Area | Status |
|---|---|
| Authentication | Staff: password + session-bound TOTP (also for `Authorization: JWT`), recovery codes, lockout after 10 failures, logout / password / role change end sessions. Customers: password only (e-mail verification BLOCKED) |
| Authorisation | Permission matrix; explicit collection + field access; domain endpoints role + MFA checked; customer endpoints scoped by session identity. Generated REST/GraphQL surface probed (139 checks) |
| Data integrity | DB constraints, row locks, idempotency keys, append-only audit/ledger/attribution/replacement tables, least-privilege DB roles (CMS role has no domain access) |
| Input handling | Parameterised SQL; Payload query guards (hidden fields not queryable); React escaping; no raw-HTML sinks; upload type sniffing; no SVG/video |
| Browser protections | Per-response nonce CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`, no script `'unsafe-inline'`), `frame-ancestors 'none'`, `object-src 'none'`; X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP; HttpOnly + SameSite=Lax cookies; Secure + HSTS automatically on https |
| Abuse resistance | Shared PostgreSQL rate limits (hashed keys), honeypot, no enumeration oracles (registration, claims, orders) |
| Privacy | No raw IPs stored; secrets in `.local-secrets/` (never printed); synthetic data only; dumps treated as secret |

## Evidence
| Suite | Result |
|---|---|
| security | 28/28 |
| surface | 139/139 (all 11 registered collections × 5 identities included) |
| portal | 17/17 (IDOR, CSRF, no oracle) |
| CMS sessions / audit | 29/29 |
| S7 focused Edge CSP | 11/11 (two navigations, matching script nonces, rotation, no blocked scripts/Console errors, hydration true) |
| S7 real Edge E2E | 42/42 |
| spike V-2…V-5 | passed |

Focused capture: `execution/evidence/s7-final-20261018/edge-csp-diagnostic.json`. `/staff/login` is request-time rendered; the production build lists it as dynamic. No duplicated CSP, nonce mismatch, cached nonce or `strict-dynamic` incompatibility was observed. The historical hydration failure remains a B-38 regression case and is now covered on every full run.

## Known weaknesses (open)
1. No dependency vulnerability scan (B-39; needs network authorisation).
2. Customer accounts without e-mail verification (B-41).
3. Payload's authorisation/validation errors logged at ERROR (by design; monitoring must filter).
4. Antivirus and private object storage NOT TESTED (B-19).
5. HTTPS / proxy / multi-instance behaviour NOT TESTED (B-22, B-44).
6. CMS audit rows written outside Payload's transaction (documented; reconciliation covers the business-critical path).

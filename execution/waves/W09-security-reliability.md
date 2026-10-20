# WAVE 9 — Security and Reliability (self-review)

> **This is a self-review by the implementing agent, using synthetic data only. It is NOT a substitute for the independent security review / penetration test required before any public exposure (release blocker B-30).**

## 1. Threat coverage
| Threat | Controls in code | Regression evidence | Status |
|---|---|---|---|
| Unauthorised RFQ file access | Public RFQ has no uploads (variant P-A); multipart refused. Private files: owner/role-scoped read; never served unless the scan is CLEAN (423 even for an admin); no storage path exposed | journey J-NO-UPLOAD-*; security SEC-PRIVATE-FILE-PENDING; spike V-3 | Mitigated (local). **AV scanning + cloud ACL NOT TESTED** |
| IDOR | Customer identity from the session only; every customer query scoped; same 404 for foreign or unknown objects. Staff collections role-scoped (crm.read etc.); order status needs an HMAC token | portal P-TICKET-IDOR, P-DEVICES-SCOPED; security SEC-IDOR-CRM; acceptance W7 token checks | Mitigated + tested |
| Privilege escalation | Explicit collection + field access. Role field OWNER-only. Self-escalation, owner creation and user hijack blocked. Registration forces CUSTOMER. Stage flip and North Star OWNER-only | surface 84 checks (5 identities × REST/GraphQL); portal P-CUSTOMER-LIMITS | Mitigated + tested |
| Injection (SQL) | All domain SQL parameterised. The only interpolations are constants; `OTONOM_DB` restricted to a plain identifier (added this wave). Payload queries through its ORM | static scan (W09 §2) | Mitigated |
| Query oracles on secrets | Payload rejects `where` / `sort` on fields without read access (400) | SEC-ORACLE-* (8) | Mitigated + tested |
| Stored XSS | React escaping on every public render; no `dangerouslySetInnerHTML` / `innerHTML` / `eval` in app code; handoff summary is `text/plain`; CSP added | SEC-STORED-XSS (payload published through the real workflow, rendered escaped) | Mitigated + tested |
| CSRF | Payload honours the session cookie only for allowed origins; custom guard rejects foreign `Origin` on writes; SameSite=Lax cookie | SEC-CSRF-STAFF (no effect), portal P-CSRF | Mitigated + tested |
| Session theft / fixation | HttpOnly + SameSite=Lax; Secure automatically on https; server-side sessions (`useSessions`); MFA bound to the session id; logout, password change and role change end sessions; tokens not returned in responses | SEC-COOKIE-FLAGS, SEC-JWT-*, cms SESS-* | Mitigated (HTTPS behaviour NOT TESTED locally) |
| Authentication bypass | MFA required for staff on every privileged path, including `Authorization: JWT` header auth; account lockout after 10 failures; no API keys enabled | SEC-JWT-HEADER-MFA, cms SESS-LOCKOUT, acceptance MFA-* | Mitigated + tested |
| Upload validation bypass | Media: PNG/JPEG/WebP only, content type sniffed (HTML disguised as PNG refused), no SVG/video; private files: magic bytes / extension rules (spike V-3) | SEC-UPLOAD-SPOOF, cms MEDIA-NO-* | Mitigated + tested |
| Inventory race conditions | Conditional UPDATE + row locks + idempotency keys; serial allocation guarded by status predicate | spike V-1 (160 reps × 2 processes), domain serial race test | Mitigated + tested |
| Audit-log manipulation | Append-only triggers + revoked UPDATE/DELETE/TRUNCATE for the application role (audit, ledger, attribution changes, serial replacements); CMS decisions audited | cms AUDIT-APPEND-ONLY, domain ledger tests | Mitigated + tested. Separate-connection limitation documented |
| Duplicate payment confirmation | Unique verified (method, external_ref); state check (PENDING only); total cap | domain lifecycle tests | Mitigated + tested (domain level) |
| Contract / attribution manipulation | RFQ↔opportunity links system-only; website attribution needs evidence; frozen after signature; override OWNER-only with a reason; contract adjustments OWNER-only | journey J-*-SYSTEM-ONLY, J-ATTR-*; security SEC-ATTRIBUTION-MANIPULATION | Mitigated + tested |
| Information disclosure | No stack traces/SQL in responses; GraphQL introspection not available anonymously; domain errors exposed only as stable codes; no `x-powered-by` | SEC-ERROR-LEAK, SEC-GRAPHQL-INTROSPECTION, acceptance APP-SEC-HEADERS | Mitigated + tested |
| Clickjacking / mixed content | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`; COOP same-origin | SEC-CSP-* | Mitigated |
| Enumeration | Same answer for existing/non-existing accounts (registration), serials (claims) and orders (token) | portal P-REGISTER, P-CLAIM-NO-ORACLE | Mitigated + tested |
| Brute force | Rate limits: RFQ, quotes, order status, registration, claims, MFA; login lockout | acceptance RFQ rate limit; domain/portal | Partial: in-memory limiter is single-process (B-21) |

## 2. Changes made in this wave
- **Content-Security-Policy** (same-origin only, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri`/`form-action 'self'`), Cross-Origin-Opener-Policy, and HSTS automatically when served over https.
  - **Remaining weakness:** `'unsafe-inline'` for scripts/styles, needed by the Next/Payload bootstrap. A nonce-based CSP is in the backlog.
- **`OTONOM_DB`** validated as a plain identifier before use in setup DDL.
- **New regression suite** `tests/src/security.ts`: **23/23 pass.**

## 3. Not covered by this self-review
- **Not tested at all here:**
  - dependency vulnerability audit (`pnpm audit` needs network access to the advisory database; no network use was authorised for this);
  - SAST/DAST tooling;
  - TLS configuration;
  - production secrets management and rotation;
  - DoS resistance;
  - email/notification flows (none exist);
  - Payload admin UI XSS via rich text (no rich-text fields are used).
- **Assumed rather than verified:** the independence of the Payload-generated surface beyond the probed endpoints. The surface probe covers known collections and globals; new collections need adding to it (convention).
- **Spike-only evidence:** antivirus scanning and the cloud storage ACL were never tested.

## 4. Hygiene note (disclosed)
The stored-XSS test publishes a synthetic payload on the `insights` page and then withdraws it. Its first cleanup only updated the **draft** version, so the withdrawn page's main record and **72 revision rows** of that synthetic page kept the payload text (never publicly rendered: the page was withdrawn).
- On 2026-10-15 these rows were overwritten with neutral text by direct SQL (main table: 2 rows; version table: 72 rows).
- This rewrote revision history of a **synthetic test page only**; no real content or other history was touched.
- The test now cleans up through the main record.

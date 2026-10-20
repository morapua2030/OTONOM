# S7 B-38 staff-login hydration security regression

## Classification

Treated as a security regression because a nonce CSP with `strict-dynamic` can make staff authentication unusable if Next bootstrap scripts do not receive the request nonce. CSP was not disabled or weakened; `script-src` still excludes `'unsafe-inline'`.

## Historical failure

The first S6 attempt returned a nonce CSP on `/staff/login`, but the statically rendered bootstrap scripts had no nonce. Edge blocked hydration and E2E timed out waiting for the form. S6 fixed the root cause by adding `export const dynamic = 'force-dynamic'` to the staff login page.

## S6-to-current comparison without Git

The S6 report identifies four application elements: `lib/csp.ts`, `proxy.ts`, removal of static CSP in `next.config.mjs`, and dynamic `/staff/login`. Direct inspection of current S7 source found all four preserved with the same security model. S7 did not alter those application files; it added a focused Edge diagnostic and integrated it into `run-all.sh`.

The production build lists `/staff/login` as `ƒ` and lists `ƒ Proxy (Middleware)`. Request CSP and `x-nonce` are overwritten by the proxy, preventing an incoming-header nonce from being trusted.

## Actual current Edge capture

Evidence: `execution/evidence/s7-final-20261018/edge-csp-diagnostic.json`.

| Check | Navigation 1 | Navigation 2 |
|---|---|---|
| Document status | 200 | 200 |
| CSP header count (`script-src`) | 1 | 1 |
| Cache policy | `private, no-cache, no-store, max-age=0, must-revalidate` | same |
| Script tags | 11 | 11 |
| Script nonce mismatch | 0 | 0 |
| Blocked script URLs | none | none |
| Edge Console errors/exceptions | none | none |
| React form hydrated | true | true |
| Nonce | present | present and different from #1 |

All external and inline Next scripts recorded in the JSON carry their response's nonce. Script responses are successful. There is no CSP header duplication, nonce reuse/mismatch, observable caching issue or `strict-dynamic` incompatibility.

## Regression result

- Unit CSP: 2/2 focused and 11/11 web-unit total.
- HTTP security: 28/28, including public/admin/staff script nonce checks.
- Focused real Edge: 11/11.
- Full real Edge E2E: 42/42, including password + TOTP staff login.
- Full isolated regression: 1430/1430.

Verdict: **B-38 remains RESOLVED-LOCAL**. Independent security review and target proxy/platform verification remain separate open gates.


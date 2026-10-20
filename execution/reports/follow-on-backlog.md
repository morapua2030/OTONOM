# Follow-on Development Backlog (prioritised)

Legend:
- **Can start now (local):** no owner input needed.
- **After decision:** needs an owner, legal or hosting decision first.

## Can start now (local, no business decisions needed)
| # | Item | Why | Size |
|---|---|---|---|
| 4 | Server-render the language switch; static/ISR for pages without live data | Reduce JS (~140 KB) and server load | M |
| 6 | Payload/Next upgrade rehearsal on a copy of the dev DB | B-43 | M |
| 8 | Reconciliation scheduling (cron-like job) + alerting hook | B-31 operations | S |

## Completed in S3–S6

- Staff Projects, KPI, Store, Service, Overview and Content Review workspaces, with server-side permissions.
- Real Microsoft Edge E2E for representative staff/public happy and failure paths: 41/41 in the S5 run.
- HTTP/browser suites now run against a unique disposable `otonom_e2e_*` clone and remove it on exit, protecting `otonom_dev` from regression writes.
- B-38 nonce-based script CSP, including real-browser hydration coverage.
- Paginated Payload reads for funnel KPI and reconciliation paths; bounded chunking for large `in` filters.
- Ledger-based `on_hand` reconciliation plus migration 009 for unambiguous opening stock.
- Payload collection registration and generated-surface probing now share one collection manifest; all 11 collections are exercised for five identities.

## Completed in S7

- Progressive two-step RFQ, expanded public IA/wayfinding, polished bilingual preview and localized 404.
- Store/service mobile-label fixes, action feedback and confirmations.
- Gated 4/6/16 information UI with `PRICE NOT CONFIGURED`; no public commerce activation.
- Focused real-Edge CSP diagnostics and 111-screen visual review package.
- Final isolated regression: 1430/1430; all 12 steps exit 0.

## After owner / legal / hosting decisions
| # | Item | Depends on |
|---|---|---|
| 11 | Storefront UI (product pages, cart, checkout) | B-02, B-04, B-15 |
| 12 | Customer portal UI (sign-up, devices, tickets) | B-03, B-20, B-41 |
| 13 | E-mail notifications (RFQ ack, order, ticket) + customer e-mail verification | B-20 |
| 14 | Real brand system + native AR/EN copy; imagery with rights metadata | B-09, B-10, B-32, B-13 |
| 15 | Staging environment (non-public), backups/PITR, monitoring, proxy config, two-instance tests | B-16, B-18, B-22, B-25, B-44 |
| 16 | Antivirus + private object storage → enable RFQ drawings (variant P-B) | B-19 |
| 17 | Payment gateway integration (if chosen) | B-24 |
| 18 | Analytics with consent (doc 05 events) | B-42 |
| 19 | Independent security review; accessibility audit; human RTL review | B-30, B-28, B-27 |
| 20 | Warranty policy activation, coverage start automation, SLA timers | B-03, B-37 |

## Deferred by the owner
3D/2D house explorer · device control/IoT (ADR-11: none) · Railway/hosting implementation.

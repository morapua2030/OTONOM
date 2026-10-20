# 13 — Proposed Module Boundaries and Conceptual Data Model

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. Conceptual design, **not a schema. No code** |
|---|---|---|---|---|---|---|---|

## 1. Bounded contexts (M3P §13) and mapping to v2 modules
| # | Context | Owns (writes) | v2 modules merged |
|---|---|---|---|
| BC-1 | Identity & Permissions | users, roles, role assignments, sessions, MFA factors, customer accounts | identity-access |
| BC-2 | Company / Organisation / Contacts | organisations, contacts, org links (group/successor), merge records | organization |
| BC-3 | Projects / RFQ & Opportunity | RFQs, RFQ files metadata, opportunities, qualification, consultations, surveys | rfq, opportunity |
| BC-4 | Proposals & Contracts | proposals (versions), contracts, amendments, cancellations | proposal-contract |
| BC-5 | Analytics & Attribution | touchpoints, attribution evidence, classifications, overrides, KPI read models | attribution, analytics |
| BC-6 | Catalogue / Pricing / Discounts | families, models, SKUs, options, compatibility rules, price versions, partner terms, quotes | catalog, pricing |
| BC-7 | Orders & Payments | carts, orders, order lines, payment records, refunds, shipments | orders, payments-manual |
| BC-8 | Inventory & Serial | locations, ledger, stock levels, reservations, serial units, allocations | inventory |
| BC-9 | Commissioning / Warranty / RMA | commissioning records, ownership records, warranty policies, coverage, tickets, RMAs, replacement links | commissioning, warranty, service-rma |
| BC-10 | CMS / Media / Publication Evidence | content items, revisions, media assets, consent records, claim registry, evidence records | cms-content |
| BC-11 | Support & Notifications | outbox, templates, notification log, support contacts | notification |
| BC-12 | Cross-cutting | audit events, file objects, idempotency keys, jobs, monitoring hooks | audit + infra |

**Write rule:** only the owning context writes its entities, through its service interface. Reads across contexts go through read models or explicit queries. The CMS (BC-10) has **no** write path into BC-4/5/6/7/8/9.

## 2. Key entities (IDs, uniqueness, relations, lifecycle, invariants)
| Entity | ID | Unique constraints | Key relations | Lifecycle | Invariants |
|---|---|---|---|---|---|
| User | UUIDv7 | email (ci) | roles (N:M) | ACTIVE/DISABLED | Privileged roles require MFA |
| CustomerAccount | UUIDv7 | email (ci). Phone (E.164) unique when verified | owns DeviceOwnership | PENDING_VERIFY/ACTIVE/CLOSED | Closing keeps service history (anonymised link) |
| Organisation | UUIDv7 | tax_reg_no (nullable unique). commercial_reg_no (nullable unique) | contacts, opportunities, contracts | ACTIVE/MERGED | MERGED keeps `merged_into` |
| Contact | UUIDv7 | (org, normalised email) | org | ACTIVE/MERGED | — |
| RFQ | UUIDv7 + public ref `RFQ-YYYY-XXXXXX` (non-sequential) | idempotency_key | contact, org?, opportunity? | per doc 06 | Payload immutable after submit |
| Opportunity | UUIDv7 + `OPP-…` | — | org, RFQs (N), proposals, contracts | per doc 06 | One current attribution classification |
| Proposal | UUIDv7 | (opportunity, version) | opportunity, lines | DRAFT/APPROVED/SENT/SUPERSEDED/ACCEPTED/REJECTED/EXPIRED | Accepted = immutable. One current |
| Contract | UUIDv7 + `CTR-…` | public ref | org, opportunity, accepted proposal, amendments | ACTIVE/AMENDED/CANCELLED/COMPLETED | No contract without evidence + value + signed_at. Cohort + class frozen at signature |
| ContractAmendment | UUIDv7 | — | contract | SIGNED | Delta ≠ 0. Evidence required |
| AttributionClassification | UUIDv7 | one active per opportunity | opportunity, overrides | PROPOSED/CONFIRMED/LOCKED | Single class |
| SKU | UUIDv7 + code | code | model, price versions, serials | ACTIVE/DISCONTINUED | — |
| PriceVersion | UUIDv7 | (SKU/option, valid_from) | — | — | Immutable once referenced by an order |
| Order | UUIDv7 + `ORD-…` | idempotency_key. Public ref | lines, payments, reservations | per doc 08 | Revision for optimistic concurrency |
| PaymentRecord | UUIDv7 | (method, external_reference) unique when verified | order | per doc 08 | Verified requires actor + reference |
| StockLevel | (SKU, location) | PK | — | — | available ≥ 0 (CHECK) |
| LedgerEntry | UUIDv7 | — | SKU, location, reference | append-only | No update/delete |
| Reservation | UUIDv7 | — | order line | ACTIVE/RELEASED/CONSUMED | Guarded transitions |
| SerialUnit | UUIDv7 | normalised serial | SKU, allocations, ownerships, coverage, tickets | per doc 09 | One active allocation. One active owner |
| CommissioningRecord | UUIDv7 | — | serial(s), technician, site | DRAFT/SUBMITTED/VERIFIED | Coverage starts only from VERIFIED |
| WarrantyPolicy | UUIDv7 | version | coverages | DRAFT/APPROVED/RETIRED | Duration null ⇒ cannot be APPROVED |
| WarrantyCoverage | UUIDv7 | one per serial per policy period | serial, policy | PENDING/ACTIVE/EXPIRED/VOID | end date only if the policy is APPROVED |
| ServiceTicket / RMA | UUIDv7 + `RMA-…` | — | serial, customer | per doc 09 | Internal notes are never customer-visible |
| ContentItem / Revision | UUIDv7 | (type, slug, locale) | media, consents, claims | per doc 10 | Live = latest PUBLISHED revision |
| ConsentRecord | UUIDv7 | — | subject, assets | ACTIVE/REVOKED/EXPIRED | Publication checks scope |
| Claim / EvidenceRecord | UUIDv7 | claim code | content | per doc 11 | Publishable statuses only |
| FileObject | UUIDv7 | storage key | owner entity | QUARANTINED/CLEAN/INFECTED/DELETED | Private never has a public URL |
| AuditEvent | UUIDv7 | — | polymorphic | append-only | Insert-only DB role |
| IdempotencyKey | (scope, key) | PK | result ref | — | — |

**Money:** exact decimal (integer minor units or NUMERIC) + ISO currency. **Time:** UTC `timestamptz`.

## 3. Transaction boundaries (PostgreSQL, conceptual)
| Operation | Single transaction includes | Isolation note |
|---|---|---|
| Confirm order | order status/revision + reservations + ledger + stock levels + audit + idempotency record | Row-level locking or conditional updates. Must be tested across **multiple processes** (doc 16 V-1) |
| Release/cancel | reservation status + ledger + stock + order + audit | Guarded status change |
| Allocate serials | allocation rows + serial status + stock (reserved→allocated) + audit | Unique active allocation |
| Verify payment | payment status + order payment sub-status + audit | Unique external reference |
| Sign contract | contract + attribution lock + cohort evaluation + opportunity state + audit | — |
| Amend contract | amendment + current_net_value + audit | — |
| Commission | commissioning VERIFIED + coverage creation (if policy APPROVED) + audit | — |
| Publish content | revision status + gates re-check + audit | Gate re-evaluated inside the transaction |
| Notifications | written to the outbox **inside** the business transaction. Sent asynchronously | Email failure never rolls back business state |

## 4. API protection rules (design)
1. Every mutation checks role permissions **and** object ownership on the server.
2. No client-supplied prices, discounts, totals, attribution classes or stock values are trusted.
3. Unsafe operations take an `Idempotency-Key`. Concurrency-sensitive operations take an `expectedRevision`.
4. Public endpoints are rate-limited, and bot-protected where forms exist.
5. In PV, commerce/portal mutation endpoints are **disabled server-side** (not just hidden).
6. Errors return `{code, messageKey, fieldErrors?, correlationId}` without internal details.
7. Admin endpoints require MFA-verified sessions for privileged roles.

## 5. Domain events (outbox)
RfqSubmitted · OpportunityStageChanged · ProposalApproved · ContractSigned/Amended/Cancelled · AttributionLocked/Overridden · OrderSubmitted/Confirmed/Cancelled · PaymentVerified/Rejected · SerialAllocated · DeviceCommissioned · CoverageActivated · TicketStatusChanged · ContentPublished/Withdrawn · ConsentRevoked.

## Sign-off (Wave 8b)
12 contexts with write ownership ✅ · Invariants per entity ✅ · Transaction boundaries ✅ · No executable code ✅

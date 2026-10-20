# Proposed Domain and Data Model

| Doc ID | OTONOM-DOC-17 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. Conceptual. Not a schema |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
Modules, entities, relationships, key semantics (money, time, IDs), domain events and boundary contracts. Physical schema design happens after the spike.

## 2. Modules and write ownership
| Module | Owns (writes) | Readers |
|---|---|---|
| identity-access | users, roles, permissions, sessions, MFA | all |
| organization | organisations, contacts, entity links, cohort rules | crm, attribution, service |
| rfq | RFQ payloads, attachments metadata, triage state | opportunity |
| opportunity | opportunities, qualification, ownership | proposal-contract, attribution |
| proposal-contract | proposals, contracts, amendments | attribution, analytics |
| attribution | touchpoints, evidence, classifications, overrides | analytics |
| catalog | families, models, SKUs, options, compatibility, documents | pricing, orders |
| pricing | price versions, quotes, approvals | orders |
| orders | carts, orders, lines, status | inventory, payments-manual |
| inventory | ledger, stock levels, reservations, serialised units | orders, service |
| payments-manual | payment records, proofs, verification | orders, analytics |
| commissioning | commissioning records, technicians | warranty |
| warranty | policy versions, ownership records, coverage | service-rma |
| service-rma | tickets, actions, RMA, replacement links | warranty |
| cms-content | content, revisions, media, consent, evidence refs | public site |
| notification | outbox, templates | — |
| analytics | read models, metric queries | dashboards |
| audit | append-only audit events (insert-only DB role) | all (read by authorised roles) |

**Boundary rule:** only the owning module writes its tables, through its service API. The CMS has no write path to inventory, payments, contracts, attribution or warranty.

## 3. Conceptual relationships
```text
Organization 1─N Contact ; Organization 1─N CustomerAccount ; Organization 1─N RFQ ; Organization N─N Organization (group/successor links)
RFQ N─0..1 Opportunity ; Opportunity 1─N Proposal(version) ; Opportunity 0─N Contract ; Contract 1─N ContractAmendment
Opportunity 1─N AttributionEvidence ; Contract 1─1 AttributionClassification(snapshot) 1─N AttributionChange ; Contract 1─N ContractAuditEvent
ProductFamily 1─N ProductModel 1─N SKU ; SKU 1─N PriceVersion ; StandardOption N─N ProductModel (via CompatibilityRule)
SKU 1─N SerializedUnit ; SKU 1─N InventoryLedgerEntry ; SKU 1─N InventoryReservation
Order 1─N OrderLine ; Order 0─N InventoryReservation ; OrderLine 0─N SerializedUnitAssignment(time-bounded) ; Order 0─N ManualPaymentRecord
SerializedUnit 0─N CommissioningRecord ; 0─N OwnershipRecord(time-bounded) ; 0─N WarrantyCoverage ; 0─N ServiceTicket ; ServiceTicket 0─N RMAEvent
ReplacementLink(old_unit, new_unit, rma)
ContentItem 1─N ContentRevision ; CaseStudy 0─N MediaAsset ; CaseStudy 0─N EvidenceReference ; MediaAsset 0─N PublishingConsent
FileObject (private|public, scan_status, retention) referenced by RFQ, PaymentRecord, Contract, ConsentRecord, CommissioningRecord, Ticket
```
Avoid naive 1:1 constraints where entities can be transferred or replaced over time (ownership, assignment, coverage). Use time-bounded rows with partial unique indexes ("one active").

## 4. Key semantics
| Topic | Rule |
|---|---|
| IDs | UUIDv7 internal keys. Human references per type (`RFQ-`, `OPP-`, `CTR-`, `ORD-`, `RMA-`): non-sequential for customer-facing refs |
| Money | Exact: integer minor units or `NUMERIC(14,2)` + ISO currency. Never floats (DR-053) |
| FX | Stored per contract: original amount/currency, rate, date, source |
| Time | `timestamptz` in UTC. Display in `Africa/Cairo` |
| Revisions | `revision` integer on orders, quotes, contracts, tickets for optimistic concurrency |
| Idempotency | `idempotency_keys(scope, key, result_ref)` unique |
| Soft delete | Content only. Financial, stock, warranty and audit records are never hard-deleted |
| PII | Separate PII columns. Minimised in logs/exports. Retention per legal review |
| Localization | `{ar, en}` fields for content. Transactional enums are stored as codes and localized at render |

## 5. Domain events (internal, via outbox)
| Event | Producer | Consumers |
|---|---|---|
| `RfqSubmitted` | rfq | notification, attribution |
| `OpportunityStageChanged` | opportunity | analytics |
| `ProposalVersionApproved` | proposal-contract | notification |
| `ContractSigned` / `ContractAmended` / `ContractCancelled` | proposal-contract | attribution (freeze), analytics |
| `AttributionClassified` / `AttributionOverridden` | attribution | analytics, audit |
| `OrderSubmitted` / `OrderConfirmed` | orders | inventory (sync within the tx for reservation), notification |
| `StockReserved` / `StockReleased` | inventory | analytics |
| `PaymentVerified` / `PaymentRejected` | payments-manual | orders, notification |
| `SerialAssigned` | inventory | warranty |
| `DeviceCommissioned` | commissioning | warranty |
| `WarrantyCoverageCreated` | warranty | notification |
| `ServiceTicketStatusChanged` | service-rma | notification |
| `ContentPublished` / `ContentWithdrawn` | cms-content | cache revalidation |

Reservation happens **inside** the confirmation transaction, not via an async event. Notifications are async through the outbox.

## 6. Boundary contracts (illustrative; not implementation authorisation)
```ts
type RfqSubmission = {
  idempotencyKey: string; locale: 'ar'|'en';
  contact: { name: string; email?: string; phone?: string; organization?: string };
  customerType: 'DEVELOPER'|'CONTRACTOR'|'CONSULTANT'|'PARTNER'|'HOMEOWNER'|'OTHER';
  project: { type: string; governorate: string; city?: string; units?: number; circuits?: number; scope: string;
             phase?: string; timeline?: string; services?: string[]; ecosystems?: string[]; budgetBand?: string };
  fileIds?: string[]; consents: { contact: true; privacy: true; marketing?: boolean };
  attribution?: { landingPage?: string; referrer?: string; utm?: Partial<Record<'source'|'medium'|'campaign'|'term'|'content', string>> };
  botToken: string;
};
type ConfirmOrderCommand = { orderId: string; approvedByUserId: string; expectedOrderRevision: number; idempotencyKey: string };
type AttributionOverride = { contractId: string; from: AttributionClass; to: AttributionClass; reason: string; actorId: string; approverId?: string };
type AttributionClass = 'WEBSITE_SOURCED'|'WEBSITE_ASSISTED'|'NON_WEBSITE'|'UNKNOWN';
```
Consistent error contract (proposal): `{ code, messageKey, fieldErrors?, correlationId }`. Messages are localized client-side from `messageKey`.

## 7. Migration questions (to resolve in Stage 2)
1. Do Payload-managed tables and domain tables share a schema, or are they separate Postgres schemas (recommend separate)?
2. Import of historical customers/contracts for cohort accuracy (E-17).
3. Import of existing serial records (E-11) and their quality checks.
4. Backward-compatible state-enum migrations.
5. Restore-test procedure for both migration streams.

## Change log
2.0-draft, 2026-10-13: created from master v2 §8.6–8.8, consolidating v1 doc 06.

## Next review decision
Confirmed during the spike (S4–S7). A physical schema is drafted in Stage 2.

# 06 — Domain Model and Data Contracts (DRAFT)

Conventions: `id UUIDv7` PK · `created_at/updated_at timestamptz (UTC)` · `*_minor BIGINT` money + `currency CHAR(3)` · localized text = `{ ar: string, en: string }` · soft-delete only where stated. Hard deletes of financial, stock or audit data are **forbidden**.

## 1. Entity overview

```
Organization 1─* Contact          Organization 1─* Opportunity 1─* Proposal(version)
RFQ *─1 Opportunity (after triage)  Opportunity 1─* Contract 1─* ContractAmendment
Opportunity 1─* Touchpoint          Opportunity 1─1 AttributionClassification (current) 1─* AttributionChange
Product 1─* Variant(SKU) 1─* PriceVersion       Variant 1─* SerialUnit
Order 1─* OrderLine *─1 Variant     Order 1─* PaymentRecord     Order 1─* Shipment
InventoryLedgerEntry *─1 Variant    Reservation *─1 OrderLine
SerialUnit 1─* SerialAssignment (order line / project) 1─0..1 Commissioning
Customer 1─* DeviceRegistration *─1 SerialUnit   WarrantyPolicy(version) 1─* WarrantyCoverage
ServiceTicket 0..1─1 RMA            AuditEvent (polymorphic: entity_type, entity_id)
FileObject (private/public, scan_status) linked from RFQ, PaymentRecord, ConsentRecord, Ticket
ContentItem(localized, revisions) ; ConsentRecord (case study publication)
```

## 2. Core entities (key fields only)

### CRM
| Entity | Key fields |
|---|---|
| Organization | `legal_name`, `trade_name`, `tax_registration_no?`, `commercial_registry_no?`, `country`, `governorate`, `normalized_key` (for matching), `customer_since?` (first signed contract date, derived) |
| Contact | `org_id?`, `full_name`, `email`, `phone_e164`, `role`, `preferred_language`, `consents{marketing, processing}` |
| RFQ | `ref` (`RFQ-YYYY-NNNNNN`), `submitted_at`, `contact snapshot`, `project_type`, `units_count`, `region`, `requirements_text`, `budget_band?`, `timeline?`, `files[]`, `locale`, `attribution_snapshot` (first-touch, referrer, utm_*, landing_page), `duplicate_of?`, `opportunity_id?`, `status` |
| Opportunity | `ref`, `org_id`, `primary_contact_id`, `stage` (doc 07), `owner_engineer_id`, `qualified_at?`, `estimated_value_minor?`, `currency`, `lost_reason?`, `on_hold_reason?` |
| Proposal | `opportunity_id`, `version`, `status (draft/sent/superseded/accepted/rejected)`, `total_minor`, `currency`, `document_file_id`, `approved_by?`, `approved_at?` |
| Contract | `ref` (`CTR-…`), `opportunity_id`, `org_id`, `signed_at`, `signature_evidence_file_id`, `value_minor`, `currency`, `fx_rate_to_egp?`, `fx_source?`, `tax_treatment (OPEN)`, `contract_type (project/supply/service/maintenance – OPEN)`, `status (active/amended/cancelled/completed)`, `customer_cohort (New/Existing, frozen at signature)` |
| ContractAmendment | `contract_id`, `effective_at`, `delta_minor`, `reason`, `evidence_file_id`, `actor_id` |

### Attribution (doc 09)
| Entity | Key fields |
|---|---|
| Touchpoint | `opportunity_id?`, `contact_id?`, `rfq_id?`, `type` (rfq_submitted, consultation_booked, datasheet_requested, partner_inquiry, chat_started, manual_note…), `occurred_at`, `channel`, `utm_*`, `referrer`, `evidence` |
| AttributionClassification | `opportunity_id`, `class` (`WEBSITE_SOURCED`, `WEBSITE_ASSISTED`, `NON_WEBSITE`, `UNKNOWN`), `basis` (rule id), `classified_by`, `classified_at`, `locked_at?` (at contract signature) |
| AttributionChange | `classification_id`, `before`, `after`, `reason`, `actor_id`, `approved_by?`, `at` |

### Commerce, inventory, serials (doc 08)
| Entity | Key fields |
|---|---|
| Product | `slug{ar,en}`, `name{ar,en}`, `model (4CH/6CH/16CH)`, `status`, `datasheet_file_id?` |
| Variant | `sku` (format OPEN), `product_id`, `option_values`, `active` |
| PriceVersion | `variant_id`, `amount_minor`, `currency`, `valid_from`, `valid_to?`, `vat_inclusive (OPEN)` |
| Order | `ref`, `type (STANDARD/CUSTOM_QUOTED/PROJECT_SUPPLY)`, `status`, `customer snapshot`, `shipping address`, `totals`, `idempotency_key UNIQUE`, `payment_method`, `confirmed_at?`, `confirmed_by?` |
| OrderLine | `order_id`, `variant_id`, `qty`, `unit_price_minor` (snapshot), `price_version_id` |
| PaymentRecord | `order_id`, `method (COD/BANK_TRANSFER/EWALLET)`, `amount_minor`, `status (pending/verified/rejected/refunded)`, `proof_file_id?`, `verified_by?`, `verified_at?`, `external_ref?` |
| InventoryLedgerEntry | `variant_id`, `location_id`, `type (RECEIPT/ADJUSTMENT/RESERVE/RELEASE/FULFIL/RETURN/SCRAP)`, `qty` (signed), `reference_type/id`, `actor_id`, `reason`, `at` (append-only) |
| StockLevel (projection) | `variant_id`, `location_id`, `on_hand`, `reserved`, CHECK `on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand` |
| Reservation | `order_line_id`, `qty`, `status (active/released/consumed)`, `expires_at?` |
| SerialUnit | `serial` UNIQUE, `variant_id`, `firmware_version?`, `manufactured_at?`, `status (in_stock/allocated/shipped/installed/returned/scrapped)` |
| SerialAssignment | `serial_id`, `order_line_id?` or `project_id?`, `assigned_at`, `active` (partial unique index: one active per serial) |
| Commissioning | `serial_assignment_id`, `installed_at`, `commissioned_at`, `technician_id`, `evidence_file_id?` (form/photo), `site_ref` |

### Service
| Entity | Key fields |
|---|---|
| WarrantyPolicy | `version`, `effective_from`, `duration_months` (**null until approved**), `exclusions{ar,en}`, `approved_by`, `approved_at` |
| DeviceRegistration | `customer_id`, `serial_id`, `verified_by (order match/manual)`, `registered_at` |
| WarrantyCoverage (derived/stored) | `serial_id`, `policy_version`, `starts_at = commissioned_at`, `ends_at` |
| ServiceTicket | `ref`, `customer_id`, `serial_id?`, `category`, `description`, `status`, `files[]` |
| RMA | `ref`, `ticket_id`, `serial_id`, `status` (doc 08 §9), `diagnosis`, `resolution (repair/replace/refund/reject)`, `replacement_serial_id?` |

### Content and compliance
| Entity | Key fields |
|---|---|
| ContentItem | `type (page/case_study/post/product_page)`, localized fields, `workflow_status (draft/in_review/approved/published/unpublished)`, `ai_assisted bool`, `claims[]→EvidenceRecord`, `seo{title,description,og_image}{ar,en}` |
| EvidenceRecord | `claim_text`, `type (compat_test/certificate/datasheet/safety_report)`, `file_id`, `scope/limits`, `reviewed_by`, `valid_until?` |
| ConsentRecord | `subject (customer/org)`, `scope (name/photos/video/location/quote)`, `signed_file_id`, `signed_at`, `revoked_at?` |
| FileObject | `bucket`, `key`, `visibility (private/public)`, `mime`, `size_bytes`, `sha256`, `scan_status (pending/clean/infected/error)`, `retention_until?` |
| AuditEvent | `id`, `at`, `actor_type/id`, `action`, `entity_type/id`, `before JSONB`, `after JSONB`, `reason?`, `request_id`, `ip_hash?` (append-only, DB role has INSERT only) |

## 3. Data contracts (boundary DTOs, validated with zod or similar)

### 3.1 `POST /api/rfq` (public)
```ts
type RfqSubmission = {
  idempotencyKey: string;            // UUID generated client-side per form instance
  locale: 'ar' | 'en';
  contact: { fullName: string; email: string; phone: string /* E.164 */; role?: string; organization?: string };
  project: {
    type: 'compound' | 'multi_unit_building' | 'villa' | 'apartment' | 'commercial' | 'other';
    unitsCount?: number;             // int 1..100000
    region: string;                  // governorate code (EG-xx); country for non-EG
    requirements: string;            // 20..5000 chars
    budgetBand?: 'lt_100k' | '100k_500k' | '500k_2m' | 'gt_2m' | 'undisclosed'; // EGP bands — OPEN
    timeline?: 'lt_3m' | '3_6m' | '6_12m' | 'gt_12m' | 'unknown';
    wantsIntroCall: boolean;
    wantsSiteSurvey: boolean;        // paid by agreement — no price shown until approved
  };
  fileIds: string[];                 // from completed upload sessions, max N (doc 07 §5)
  consents: { processing: true; marketing?: boolean };
  attribution?: { landingPage?: string; referrer?: string; utm?: Record<'source'|'medium'|'campaign'|'term'|'content', string> ; firstSeenAt?: string };
  turnstileToken: string;
};
// 201 → { ref: 'RFQ-2026-000123' } ; 409 on idempotency replay returns the same ref
```

### 3.2 `POST /api/orders` (public, MVP-B)
```ts
type OrderSubmission = {
  idempotencyKey: string;
  locale: 'ar' | 'en';
  lines: { variantId: string; qty: number }[];  // server re-prices from active PriceVersion
  customer: { fullName: string; email: string; phone: string };
  shipping: { governorate: string; city: string; addressLine: string; notes?: string };
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'EWALLET';
  consents: { terms: true; processing: true };
};
// Prices are NEVER accepted from the client.
```

### 3.3 Audit event (internal)
```ts
type AuditEvent = { action: string; entityType: string; entityId: string; actor: { type: 'user'|'system'|'customer'; id: string };
  before?: unknown; after?: unknown; reason?: string; requestId: string; at: string };
```

## 4. Retention (PROPOSED, needs legal review)
| Data | Proposed retention |
|---|---|
| RFQ files of lost/unqualified RFQs | 24 months after last activity, then delete (configurable) |
| RFQ files of won projects | contract term + statutory period (legal to define) |
| Payment proofs | per tax/accounting requirements (finance to define) |
| Audit events | ≥ 7 years for financial/stock events (finance to confirm) |
| Marketing consent logs | as long as processing continues + limitation period |

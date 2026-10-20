-- 004: W1 commerce + warranty claims (all behind the PREVIEW/COMMERCIAL server-side gate).
-- No prices, shipping fees or warranty durations are seeded: they are owner decisions (BLOCKED). Until an OWNER approves a
-- price, an order for that SKU is refused (PRICE_NOT_APPROVED); until a warranty policy is approved, coverage cannot start.

CREATE TABLE domain.sku_prices (
  id           uuid PRIMARY KEY,
  sku_id       text NOT NULL REFERENCES domain.skus(id),
  price_minor  bigint NOT NULL CHECK (price_minor > 0),
  currency     char(3) NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  vat_included boolean NOT NULL,
  status       text NOT NULL CHECK (status IN ('DRAFT','APPROVED','RETIRED')),
  proposed_by  text NOT NULL,
  approved_by  text,
  approved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approved_price_needs_approver CHECK (status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT price_four_eyes CHECK (approved_by IS NULL OR approved_by <> proposed_by)
);
CREATE UNIQUE INDEX sku_prices_one_approved ON domain.sku_prices(sku_id) WHERE status = 'APPROVED';

-- customer-facing order data (guest checkout until customer accounts exist); price snapshot per line
ALTER TABLE domain.orders
  ADD COLUMN channel          text NOT NULL DEFAULT 'STAFF' CHECK (channel IN ('STAFF','WEBSITE')),
  ADD COLUMN customer_name    text,
  ADD COLUMN customer_email   text,
  ADD COLUMN customer_phone   text,
  ADD COLUMN governorate      text,
  ADD COLUMN payment_method   text CHECK (payment_method IS NULL OR payment_method IN ('COD','BANK_TRANSFER','EWALLET')),
  ADD COLUMN subtotal_minor   bigint,
  ADD COLUMN shipping_status  text NOT NULL DEFAULT 'TO_BE_QUOTED' CHECK (shipping_status IN ('TO_BE_QUOTED','QUOTED','NOT_APPLICABLE'));
ALTER TABLE domain.order_lines
  ADD COLUMN unit_price_minor bigint,
  ADD COLUMN price_id         uuid REFERENCES domain.sku_prices(id);

CREATE TABLE domain.warranty_claims (
  id                    uuid PRIMARY KEY,
  ref                   text NOT NULL UNIQUE,
  serial                text NOT NULL REFERENCES domain.serial_units(serial),
  contact_name          text NOT NULL,
  contact_email         text,
  contact_phone         text,
  description           text NOT NULL,
  coverage_at_submit    text NOT NULL CHECK (coverage_at_submit IN ('COVERAGE_ACTIVE','COVERAGE_PENDING','COVERAGE_EXPIRED','VOID','NO_COVERAGE_RECORD')),
  status                text NOT NULL CHECK (status IN ('SUBMITTED','TRIAGE','ACCEPTED','REJECTED','RESOLVED')),
  decision_reason       text,
  decided_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_needs_reason CHECK (status NOT IN ('ACCEPTED','REJECTED') OR (decision_reason IS NOT NULL AND decided_by IS NOT NULL)),
  CONSTRAINT claim_contact CHECK (contact_email IS NOT NULL OR contact_phone IS NOT NULL)
);
CREATE INDEX warranty_claims_serial ON domain.warranty_claims(serial);
CREATE UNIQUE INDEX warranty_coverage_one_active ON domain.warranty_coverage(serial) WHERE status IN ('COVERAGE_PENDING','COVERAGE_ACTIVE');

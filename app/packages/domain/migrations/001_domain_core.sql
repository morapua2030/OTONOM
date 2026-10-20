-- 001: core transactional schema (orders, inventory ledger, reservations, idempotency, audit, manual payments).
-- Applied by packages/domain/src/migrate.ts as the database owner; application role gets least privilege (see grants).

CREATE SCHEMA IF NOT EXISTS domain;

CREATE TABLE domain.skus (
  id    text PRIMARY KEY,
  code  text NOT NULL UNIQUE,
  model text NOT NULL CHECK (model IN ('RC04','RC06','RC16')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISCONTINUED'))
);

CREATE TABLE domain.stock_levels (
  sku_id       text NOT NULL REFERENCES domain.skus(id),
  location_id  text NOT NULL DEFAULT 'MAIN',
  on_hand      integer NOT NULL,
  reserved     integer NOT NULL DEFAULT 0,
  allocated    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (sku_id, location_id),
  CONSTRAINT stock_non_negative CHECK (on_hand >= 0 AND reserved >= 0 AND allocated >= 0),
  CONSTRAINT stock_available_non_negative CHECK (reserved + allocated <= on_hand)
);

CREATE TABLE domain.orders (
  id            uuid PRIMARY KEY,
  ref           text UNIQUE,
  type          text NOT NULL DEFAULT 'STANDARD' CHECK (type IN ('STANDARD','CUSTOM_QUOTED','PROJECT_SUPPLY')),
  status        text NOT NULL CHECK (status IN ('PENDING_REVIEW','QUOTE_PENDING','CONFIRMED','CANCELLED','EXPIRED','COMPLETED')),
  revision      integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz,
  confirmed_by  text
);

CREATE TABLE domain.order_lines (
  id        uuid PRIMARY KEY,
  order_id  uuid NOT NULL REFERENCES domain.orders(id),
  sku_id    text NOT NULL REFERENCES domain.skus(id),
  qty       integer NOT NULL CHECK (qty > 0)
);

CREATE TABLE domain.reservations (
  id             uuid PRIMARY KEY,
  order_line_id  uuid NOT NULL REFERENCES domain.order_lines(id),
  sku_id         text NOT NULL,
  location_id    text NOT NULL,
  qty            integer NOT NULL CHECK (qty > 0),
  status         text NOT NULL CHECK (status IN ('ACTIVE','RELEASED','CONSUMED')),
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  released_at    timestamptz
);
CREATE UNIQUE INDEX reservations_one_active_per_line ON domain.reservations(order_line_id) WHERE status = 'ACTIVE';

CREATE TABLE domain.inventory_ledger (
  id              bigserial PRIMARY KEY,
  sku_id          text NOT NULL,
  location_id     text NOT NULL,
  type            text NOT NULL CHECK (type IN ('RECEIPT','RESERVE','RELEASE','ALLOCATE','SHIP','ADJUSTMENT')),
  qty             integer NOT NULL,
  reference_type  text NOT NULL,
  reference_id    text NOT NULL,
  actor           text NOT NULL,
  reason          text,
  correlation_id  text,
  at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE domain.idempotency_keys (
  scope         text NOT NULL,
  key           text NOT NULL,
  request_hash  text NOT NULL,
  result        jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

CREATE TABLE domain.audit_events (
  id              bigserial PRIMARY KEY,
  at              timestamptz NOT NULL DEFAULT now(),
  actor_type      text NOT NULL,
  actor_id        text NOT NULL,
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       text NOT NULL,
  before          jsonb,
  after           jsonb,
  reason          text,
  correlation_id  text NOT NULL
);
CREATE INDEX audit_events_entity ON domain.audit_events(entity_type, entity_id);

CREATE TABLE domain.payments (
  id            uuid PRIMARY KEY,
  order_id      uuid NOT NULL REFERENCES domain.orders(id),
  method        text NOT NULL CHECK (method IN ('COD','BANK_TRANSFER','EWALLET')),
  amount_minor  bigint NOT NULL CHECK (amount_minor > 0),
  currency      char(3) NOT NULL DEFAULT 'EGP',
  status        text NOT NULL CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  external_ref  text,
  verified_by   text,
  verified_at   timestamptz
);
CREATE UNIQUE INDEX payments_unique_verified_ref ON domain.payments(method, external_ref) WHERE status = 'VERIFIED';

CREATE OR REPLACE FUNCTION domain.forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %: % is not allowed', TG_TABLE_NAME, TG_OP USING ERRCODE = '42501';
END $$;

CREATE TRIGGER ledger_append_only BEFORE UPDATE OR DELETE ON domain.inventory_ledger
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON domain.audit_events
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

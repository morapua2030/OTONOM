-- 010: S10/S11 local after-sales foundation. No public feature or policy is enabled here.

-- Serial identity is deliberately conservative: case and surrounding whitespace only.
CREATE UNIQUE INDEX serial_units_canonical_unique ON domain.serial_units ((upper(btrim(serial))));
ALTER TABLE domain.serial_units ADD CONSTRAINT serial_is_canonical CHECK (serial = upper(btrim(serial)));
ALTER TABLE domain.serial_units DROP CONSTRAINT serial_units_status_check;
ALTER TABLE domain.serial_units ADD CONSTRAINT serial_units_status_check
  CHECK (status IN ('IN_STOCK','ALLOCATED','SHIPPED','INSTALLED','COMMISSIONED','RETURNED','QUARANTINED','SCRAPPED'));

-- A published policy version is an immutable fact. The only allowed mutation is retirement.
CREATE OR REPLACE FUNCTION domain.protect_warranty_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'APPROVED' THEN
    IF NEW.id <> OLD.id OR NEW.version <> OLD.version OR
       NEW.duration_months IS DISTINCT FROM OLD.duration_months OR
       NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
       NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
       NEW.status NOT IN ('APPROVED','RETIRED') THEN
      RAISE EXCEPTION 'approved warranty policy facts are immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER warranty_policy_immutable BEFORE UPDATE ON domain.warranty_policies
  FOR EACH ROW EXECUTE FUNCTION domain.protect_warranty_policy();

ALTER TABLE domain.device_ownerships DROP CONSTRAINT device_ownerships_method_check;
ALTER TABLE domain.device_ownerships ADD CONSTRAINT device_ownerships_method_check
  CHECK (method IN ('ORDER_TOKEN','COMMISSIONING_CODE','STAFF_REVIEW','REPLACEMENT','TRANSFER'));

CREATE TABLE domain.ownership_transfers (
  id                 uuid PRIMARY KEY,
  serial             text NOT NULL REFERENCES domain.serial_units(serial),
  from_customer_ref  text NOT NULL,
  to_customer_ref    text NOT NULL,
  token_hash         text NOT NULL,
  status             text NOT NULL CHECK (status IN ('PENDING','ACCEPTED','CANCELLED','EXPIRED')),
  expires_at         timestamptz NOT NULL,
  accepted_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfer_distinct_owners CHECK (from_customer_ref <> to_customer_ref),
  CONSTRAINT accepted_transfer_has_date CHECK (status <> 'ACCEPTED' OR accepted_at IS NOT NULL)
);
CREATE UNIQUE INDEX ownership_transfer_one_pending ON domain.ownership_transfers(serial) WHERE status='PENDING';

ALTER TABLE domain.service_tickets
  ADD COLUMN idempotency_key text,
  ADD COLUMN request_hash text,
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN last_transition_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX service_ticket_idempotency ON domain.service_tickets(customer_ref, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX service_tickets_queue ON domain.service_tickets(status, priority, created_at DESC);

CREATE TABLE domain.service_ticket_events (
  id          bigserial PRIMARY KEY,
  ticket_id   uuid NOT NULL REFERENCES domain.service_tickets(id),
  event_type  text NOT NULL CHECK (event_type IN ('OPENED','ASSIGNED','STATUS_CHANGED','CALLBACK','DIAGNOSIS','CUSTOMER_NOTE')),
  actor       text NOT NULL,
  from_status text,
  to_status   text,
  note        text,
  revision    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_ticket_events_ticket ON domain.service_ticket_events(ticket_id, id);
CREATE TRIGGER service_ticket_events_append_only BEFORE UPDATE OR DELETE ON domain.service_ticket_events
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

CREATE TABLE domain.service_diagnoses (
  id          uuid PRIMARY KEY,
  ticket_id   uuid NOT NULL REFERENCES domain.service_tickets(id),
  diagnosis   text NOT NULL,
  parts_note  text,
  recorded_by text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_diagnoses_ticket ON domain.service_diagnoses(ticket_id, created_at DESC);
CREATE TRIGGER service_diagnoses_append_only BEFORE UPDATE OR DELETE ON domain.service_diagnoses
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

ALTER TABLE domain.rmas
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN received_at timestamptz,
  ADD COLUMN inspected_at timestamptz;

CREATE TABLE domain.rma_inspections (
  id             uuid PRIMARY KEY,
  rma_id         uuid NOT NULL UNIQUE REFERENCES domain.rmas(id),
  condition      text NOT NULL CHECK (condition IN ('UNOPENED','FUNCTIONAL','REPAIRABLE','DAMAGED','UNSAFE','UNKNOWN')),
  serial_matches boolean NOT NULL,
  notes          text NOT NULL,
  inspected_by   text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER rma_inspections_append_only BEFORE UPDATE OR DELETE ON domain.rma_inspections
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

CREATE TABLE domain.rma_actions (
  id          uuid PRIMARY KEY,
  rma_id      uuid NOT NULL REFERENCES domain.rmas(id),
  action      text NOT NULL CHECK (action IN ('REPAIR','REPLACEMENT','REFUND_REVIEW','RETURN_TO_CUSTOMER','QUARANTINE','RESTOCK','WRITE_OFF')),
  note        text NOT NULL,
  recorded_by text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rma_actions_rma ON domain.rma_actions(rma_id, created_at);
CREATE UNIQUE INDEX rma_one_final_stock_action ON domain.rma_actions(rma_id)
  WHERE action IN ('RESTOCK','WRITE_OFF');
CREATE TRIGGER rma_actions_append_only BEFORE UPDATE OR DELETE ON domain.rma_actions
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

CREATE TABLE domain.service_outbox (
  id             uuid PRIMARY KEY,
  aggregate_type text NOT NULL CHECK (aggregate_type IN ('TICKET','RMA','OWNERSHIP')),
  aggregate_id   text NOT NULL,
  event_type     text NOT NULL,
  locale         text NOT NULL CHECK (locale IN ('ar','en')),
  payload        jsonb NOT NULL,
  status         text NOT NULL DEFAULT 'PREVIEW_ONLY' CHECK (status IN ('PREVIEW_ONLY','CANCELLED')),
  dedupe_key     text NOT NULL UNIQUE,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER service_outbox_append_only BEFORE UPDATE OR DELETE ON domain.service_outbox
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

-- After-sales stock movement types are explicit; receipt/adjustment semantics remain unchanged.
ALTER TABLE domain.inventory_ledger DROP CONSTRAINT inventory_ledger_type_check;
ALTER TABLE domain.inventory_ledger ADD CONSTRAINT inventory_ledger_type_check
  CHECK (type IN ('RECEIPT','RESERVE','RELEASE','ALLOCATE','SHIP','ADJUSTMENT','RETURN_QUARANTINE','RESTOCK','WRITE_OFF'));
CREATE UNIQUE INDEX inventory_rma_effect_once ON domain.inventory_ledger(reference_type, reference_id, type)
  WHERE reference_type='rma';

-- Merchandising drafts are a review queue only. Approval does not alter the public code registry.
CREATE TABLE domain.product_merchandising_drafts (
  id          uuid PRIMARY KEY,
  sku_id      text NOT NULL REFERENCES domain.skus(id),
  title_ar    text NOT NULL,
  title_en    text NOT NULL,
  summary_ar  text NOT NULL,
  summary_en  text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
  status      text NOT NULL CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','REJECTED')),
  revision    integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  proposed_by text NOT NULL,
  reviewed_by text,
  review_note text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchandising_bilingual CHECK (length(btrim(title_ar)) > 0 AND length(btrim(title_en)) > 0 AND length(btrim(summary_ar)) > 0 AND length(btrim(summary_en)) > 0),
  CONSTRAINT merchandising_four_eyes CHECK (status <> 'APPROVED' OR (reviewed_by IS NOT NULL AND reviewed_by <> proposed_by))
);
CREATE INDEX product_merchandising_queue ON domain.product_merchandising_drafts(status, sort_order, created_at);

-- 006: W1 warranty portal + service foundation (local development, behind the PREVIEW/COMMERCIAL gate).
-- No warranty duration is stored anywhere: coverage dates exist only once an OWNER-approved policy exists (DR-024 BLOCKED).
-- Customers are identified by their CMS user id as text ('user:<id>'); the domain never trusts a client-supplied owner.

CREATE TABLE domain.commissioning_records (
  id                 uuid PRIMARY KEY,
  serial             text NOT NULL REFERENCES domain.serial_units(serial),
  project_ref        text,
  installed_at       timestamptz NOT NULL,
  commissioned_at    timestamptz NOT NULL,
  technician         text NOT NULL,
  checklist          jsonb NOT NULL DEFAULT '{}'::jsonb,
  claim_code_hash    text,                -- one-time code handed to the resident (sha256); cleared once used
  recorded_by        text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commissioned_after_install CHECK (commissioned_at >= installed_at)
);
CREATE UNIQUE INDEX commissioning_one_per_serial ON domain.commissioning_records(serial);

CREATE TABLE domain.device_ownerships (
  id           uuid PRIMARY KEY,
  serial       text NOT NULL REFERENCES domain.serial_units(serial),
  customer_ref text NOT NULL,
  status       text NOT NULL CHECK (status IN ('PENDING','VERIFIED','REJECTED','REVOKED')),
  method       text NOT NULL CHECK (method IN ('ORDER_TOKEN','COMMISSIONING_CODE','STAFF_REVIEW','REPLACEMENT')),
  evidence     text,
  decided_by   text,
  decided_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_recorded CHECK (status = 'PENDING' OR decided_at IS NOT NULL)
);
CREATE UNIQUE INDEX device_one_verified_owner ON domain.device_ownerships(serial) WHERE status = 'VERIFIED';
CREATE UNIQUE INDEX device_one_open_claim_per_customer ON domain.device_ownerships(serial, customer_ref) WHERE status IN ('PENDING','VERIFIED');

CREATE TABLE domain.service_tickets (
  id            uuid PRIMARY KEY,
  ref           text NOT NULL UNIQUE,
  serial        text NOT NULL REFERENCES domain.serial_units(serial),
  customer_ref  text NOT NULL,
  category      text NOT NULL CHECK (category IN ('FAULT','CONFIGURATION','INSTALLATION','OTHER')),
  description   text NOT NULL,
  status        text NOT NULL CHECK (status IN ('OPEN','TRIAGE','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED')),
  assigned_to   text,
  resolution    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resolved_has_resolution CHECK (status NOT IN ('RESOLVED','CLOSED') OR resolution IS NOT NULL)
);
CREATE INDEX service_tickets_customer ON domain.service_tickets(customer_ref);

CREATE TABLE domain.rmas (
  id                  uuid PRIMARY KEY,
  ref                 text NOT NULL UNIQUE,
  ticket_id           uuid NOT NULL REFERENCES domain.service_tickets(id),
  serial              text NOT NULL REFERENCES domain.serial_units(serial),
  status              text NOT NULL CHECK (status IN ('REQUESTED','APPROVED','REJECTED','RECEIVED','INSPECTED','REPAIRED','REPLACED','RETURNED','CLOSED')),
  decision_reason     text,
  replacement_serial  text REFERENCES domain.serial_units(serial),
  coverage_at_request text NOT NULL,
  created_by          text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rma_decision_reason CHECK (status NOT IN ('APPROVED','REJECTED') OR decision_reason IS NOT NULL),
  CONSTRAINT rma_replacement CHECK (status <> 'REPLACED' OR replacement_serial IS NOT NULL)
);
CREATE UNIQUE INDEX rma_one_open_per_serial ON domain.rmas(serial) WHERE status NOT IN ('REJECTED','RETURNED','CLOSED');

CREATE TABLE domain.serial_replacements (
  id          bigserial PRIMARY KEY,
  old_serial  text NOT NULL REFERENCES domain.serial_units(serial),
  new_serial  text NOT NULL REFERENCES domain.serial_units(serial),
  rma_id      uuid NOT NULL REFERENCES domain.rmas(id),
  replaced_by text NOT NULL,
  replaced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_units CHECK (old_serial <> new_serial)
);
CREATE TRIGGER serial_replacements_append_only BEFORE UPDATE OR DELETE ON domain.serial_replacements FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

-- correction of 005 (applied migrations are never edited): a warranty replacement ships through an RMA, not an order line,
-- so only ALLOCATED units must reference an order line
ALTER TABLE domain.serial_units DROP CONSTRAINT allocated_serial_has_line;
ALTER TABLE domain.serial_units ADD CONSTRAINT allocated_serial_has_line CHECK (status <> 'ALLOCATED' OR order_line_id IS NOT NULL);

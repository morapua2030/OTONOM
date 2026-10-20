-- 002: signed contracts, amendments, attribution (exclusive classes, locked at signature) and cohort.
-- Opportunities/organisations live in the CMS schema; they are referenced here by stable text refs (no cross-schema FK).

CREATE TABLE domain.contracts (
  id                        uuid PRIMARY KEY,
  ref                       text NOT NULL UNIQUE,
  opportunity_ref           text NOT NULL UNIQUE,  -- one signed contract per opportunity (further scope = amendment); makes signing retry-safe
  organisation_ref          text NOT NULL,
  contract_type             text NOT NULL CHECK (contract_type IN ('PROJECT','SUPPLY','SERVICE','MAINTENANCE')),
  signed_at                 timestamptz NOT NULL,
  signed_value_minor        bigint NOT NULL CHECK (signed_value_minor > 0),
  current_net_value_minor   bigint NOT NULL,
  currency                  char(3) NOT NULL DEFAULT 'EGP',
  fx_rate_to_egp            numeric(18,6),
  fx_date                   date,
  evidence_ref              text NOT NULL,
  cohort                    text NOT NULL CHECK (cohort IN ('NEW','EXISTING')),
  status                    text NOT NULL CHECK (status IN ('ACTIVE','AMENDED','CANCELLED','COMPLETED')),
  created_by                text NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fx_required_for_foreign CHECK (currency = 'EGP' OR (fx_rate_to_egp IS NOT NULL AND fx_date IS NOT NULL))
);
CREATE INDEX contracts_signed_at ON domain.contracts(signed_at);

CREATE TABLE domain.contract_adjustments (
  id            uuid PRIMARY KEY,
  contract_id   uuid NOT NULL REFERENCES domain.contracts(id),
  kind          text NOT NULL CHECK (kind IN ('AMENDMENT','CANCELLATION')),
  delta_minor   bigint NOT NULL CHECK (delta_minor <> 0),
  effective_at  timestamptz NOT NULL,
  reason        text NOT NULL,
  evidence_ref  text NOT NULL,
  created_by    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- exactly one class per contract (primary key = contract_id) => no double counting by construction
CREATE TABLE domain.attribution (
  contract_id    uuid PRIMARY KEY REFERENCES domain.contracts(id),
  class          text NOT NULL CHECK (class IN ('WEBSITE_SOURCED','WEBSITE_ASSISTED','NON_WEBSITE','UNKNOWN')),
  basis_rule     text NOT NULL CHECK (basis_rule IN ('R-S','R-A','R-N','R-U','OVERRIDE')),
  evidence_note  text,
  locked         boolean NOT NULL DEFAULT true,
  classified_by  text NOT NULL,
  classified_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE domain.attribution_changes (
  id           bigserial PRIMARY KEY,
  contract_id  uuid NOT NULL REFERENCES domain.contracts(id),
  before       text NOT NULL,
  after        text NOT NULL,
  reason       text NOT NULL,
  actor        text NOT NULL,
  approver     text,
  single_actor boolean NOT NULL,
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER attribution_changes_append_only BEFORE UPDATE OR DELETE ON domain.attribution_changes
  FOR EACH ROW EXECUTE FUNCTION domain.forbid_mutation();

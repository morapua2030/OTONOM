-- 003: warranty policy versions and coverage (W1). Duration may be NULL (DURATION_UNAPPROVED) — then no end date can exist.

CREATE TABLE domain.warranty_policies (
  id               uuid PRIMARY KEY,
  version          integer NOT NULL UNIQUE,
  duration_months  integer CHECK (duration_months IS NULL OR duration_months > 0),
  status           text NOT NULL CHECK (status IN ('DRAFT','APPROVED','RETIRED')),
  approved_by      text,
  approved_at      timestamptz,
  CONSTRAINT approved_policy_needs_duration CHECK (status <> 'APPROVED' OR (duration_months IS NOT NULL AND approved_by IS NOT NULL))
);

CREATE TABLE domain.serial_units (
  serial      text PRIMARY KEY,
  sku_id      text NOT NULL REFERENCES domain.skus(id),
  status      text NOT NULL CHECK (status IN ('IN_STOCK','ALLOCATED','SHIPPED','INSTALLED','COMMISSIONED','RETURNED','SCRAPPED')),
  firmware    text
);

CREATE TABLE domain.warranty_coverage (
  id          uuid PRIMARY KEY,
  serial      text NOT NULL REFERENCES domain.serial_units(serial),
  policy_id   uuid REFERENCES domain.warranty_policies(id),
  status      text NOT NULL CHECK (status IN ('COVERAGE_PENDING','COVERAGE_ACTIVE','COVERAGE_EXPIRED','VOID')),
  starts_at   timestamptz,
  ends_at     timestamptz,
  CONSTRAINT no_end_without_policy CHECK (ends_at IS NULL OR policy_id IS NOT NULL)
);

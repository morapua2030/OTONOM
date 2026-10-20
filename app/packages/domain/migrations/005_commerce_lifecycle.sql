-- 005: W1 commerce lifecycle (local development, behind the PREVIEW/COMMERCIAL gate). No catalogue items, prices,
-- shipping fees or quotes are seeded: product data and every amount come from the owner / authorised staff.

-- catalogue: controllers (4/6/16 channels) + standard additions; variants point at their base controller
ALTER TABLE domain.skus ALTER COLUMN model DROP NOT NULL;
ALTER TABLE domain.skus ADD COLUMN kind text NOT NULL DEFAULT 'CONTROLLER' CHECK (kind IN ('CONTROLLER','ADDITION'));
ALTER TABLE domain.skus ADD COLUMN variant_of text REFERENCES domain.skus(id);
ALTER TABLE domain.skus ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE domain.skus ADD COLUMN serialised boolean NOT NULL DEFAULT true;
ALTER TABLE domain.skus ADD CONSTRAINT controller_has_model CHECK (kind <> 'CONTROLLER' OR model IS NOT NULL);

-- order lifecycle: custom quote (QUOTE_PENDING → QUOTED) → PENDING_REVIEW → CONFIRMED (reserved) → ALLOCATED (serials)
--                  → SHIPPED → COMPLETED; CANCELLED / EXPIRED terminal
ALTER TABLE domain.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE domain.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('QUOTE_PENDING','QUOTED','PENDING_REVIEW','CONFIRMED','ALLOCATED','SHIPPED','COMPLETED','CANCELLED','EXPIRED'));
ALTER TABLE domain.orders
  ADD COLUMN shipping_minor     bigint CHECK (shipping_minor IS NULL OR shipping_minor >= 0),
  ADD COLUMN quote_minor        bigint CHECK (quote_minor IS NULL OR quote_minor > 0),
  ADD COLUMN quote_valid_until  timestamptz,
  ADD COLUMN quote_requirements text,
  ADD COLUMN quoted_by          text,
  ADD COLUMN cancelled_reason   text,
  ADD COLUMN cancelled_by       text,
  ADD CONSTRAINT quote_needs_validity CHECK (quote_minor IS NULL OR (quote_valid_until IS NOT NULL AND quoted_by IS NOT NULL)),
  ADD CONSTRAINT cancel_needs_reason CHECK (status <> 'CANCELLED' OR cancelled_reason IS NOT NULL);

-- serial allocation to order lines
ALTER TABLE domain.serial_units ADD COLUMN order_line_id uuid REFERENCES domain.order_lines(id);
CREATE INDEX serial_units_order_line ON domain.serial_units(order_line_id);
ALTER TABLE domain.serial_units ADD CONSTRAINT allocated_serial_has_line CHECK (status NOT IN ('ALLOCATED','SHIPPED') OR order_line_id IS NOT NULL);

-- payments: rejected payments keep a reason
ALTER TABLE domain.payments ADD COLUMN rejected_reason text, ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

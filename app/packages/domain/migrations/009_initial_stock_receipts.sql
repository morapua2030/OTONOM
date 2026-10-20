-- Give pre-ledger opening stock an explicit provenance without masking rows that
-- already have ledger history. Any later mismatch is reported by reconciliation.
INSERT INTO domain.inventory_ledger(
  sku_id, location_id, type, qty, reference_type, reference_id, actor, reason, correlation_id
)
SELECT
  s.sku_id,
  s.location_id,
  'RECEIPT',
  s.on_hand,
  'migration',
  '009-initial-stock-' || s.sku_id || '-' || s.location_id,
  'migration-009',
  'opening balance recorded when ledger reconciliation was introduced',
  'migration-009'
FROM domain.stock_levels s
WHERE s.on_hand > 0
  AND NOT EXISTS (
    SELECT 1
    FROM domain.inventory_ledger l
    WHERE l.sku_id = s.sku_id AND l.location_id = s.location_id
  );

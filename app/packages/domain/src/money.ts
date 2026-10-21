import { DomainError } from './tx.ts';

/**
 * Monetary values cross the PostgreSQL bigint / JavaScript number boundary.
 * Refuse any value that cannot be represented exactly; callers must never
 * silently round an authoritative amount.
 */
export function minorUnits(value: unknown, code = 'INVALID_AMOUNT', allowZero = false): number {
  const amount = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isSafeInteger(amount) || (allowZero ? amount < 0 : amount <= 0)) throw new DomainError(code);
  return amount;
}

export function multiplyMinor(unitPrice: unknown, quantity: number): number {
  const unit = minorUnits(unitPrice, 'INVALID_PRICE');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new DomainError('INVALID_LINES');
  const line = unit * quantity;
  if (!Number.isSafeInteger(line) || line <= 0) throw new DomainError('AMOUNT_OUT_OF_RANGE');
  return line;
}

export function addMinor(values: readonly unknown[]): number {
  let total = 0;
  for (const value of values) {
    const amount = minorUnits(value, 'INVALID_AMOUNT', true);
    total += amount;
    if (!Number.isSafeInteger(total) || total < 0) throw new DomainError('AMOUNT_OUT_OF_RANGE');
  }
  return total;
}

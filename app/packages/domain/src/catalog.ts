import { DomainError } from './tx.ts';

export const MODEL_FACTS = {
  '4r': { domainModel: 'RC04', channels: 4 },
  '6r': { domainModel: 'RC06', channels: 6 },
  '16r': { domainModel: 'RC16', channels: 16 },
} as const;

export type ProductModel = keyof typeof MODEL_FACTS;
export type DomainModel = (typeof MODEL_FACTS)[ProductModel]['domainModel'];
export type CatalogReviewState = 'DRAFT' | 'ENGINEERING_REVIEW' | 'APPROVED_INTERNAL' | 'VISIBLE_INFORMATIONAL' | 'PURCHASABLE_GATED';
export type SpecificationReviewState = 'VERIFIED' | 'PROPOSED' | 'PENDING_REVIEW' | 'REJECTED' | 'APPROVED_FOR_PUBLICATION';

export function parseProductModel(value: unknown): ProductModel {
  const model = String(value ?? '').trim().toLowerCase();
  if (!(model in MODEL_FACTS)) throw new DomainError('INVALID_PRODUCT_MODEL');
  return model as ProductModel;
}

export function parseSkuCode(value: unknown): string {
  const code = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) throw new DomainError('INVALID_SKU_CODE');
  return code;
}

export function catalogState(input: {
  engineeringReviewed: boolean;
  approvedInternal: boolean;
  visibleInformational: boolean;
  purchaseGateOpen: boolean;
  hasApprovedPrice: boolean;
}): CatalogReviewState {
  if (!input.engineeringReviewed) return 'ENGINEERING_REVIEW';
  if (!input.approvedInternal) return 'DRAFT';
  if (!input.visibleInformational) return 'APPROVED_INTERNAL';
  if (!input.purchaseGateOpen || !input.hasApprovedPrice) return 'VISIBLE_INFORMATIONAL';
  return 'PURCHASABLE_GATED';
}

export function approvedSpecifications<T extends { key: string; value?: unknown; state: SpecificationReviewState }>(records: readonly T[]) {
  return records
    .filter((record) => record.state === 'APPROVED_FOR_PUBLICATION' && record.value !== undefined && record.value !== null && String(record.value).trim() !== '')
    .map(({ key, value }) => ({ key, value }));
}

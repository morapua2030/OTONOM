import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvedSpecifications, catalogState, MODEL_FACTS, parseProductModel, parseSkuCode } from '../src/catalog.ts';
import { addMinor, minorUnits, multiplyMinor } from '../src/money.ts';
import { passwordPolicyError } from '../src/credentials.ts';

test('S10 product truth maps only 4R, 6R and 16R to their confirmed channel counts', () => {
  assert.deepEqual(MODEL_FACTS, {
    '4r': { domainModel: 'RC04', channels: 4 },
    '6r': { domainModel: 'RC06', channels: 6 },
    '16r': { domainModel: 'RC16', channels: 16 },
  });
  assert.equal(parseProductModel(' 16R '), '16r');
  assert.throws(() => parseProductModel('8r'), /INVALID_PRODUCT_MODEL/);
});

test('SKU parsing is stable and rejects unsafe or empty identifiers', () => {
  assert.equal(parseSkuCode(' syn-rc04-a_std '), 'SYN-RC04-A_STD');
  for (const bad of ['', 'x', '../sku', 'sku with spaces', 'a'.repeat(65)]) assert.throws(() => parseSkuCode(bad), /INVALID_SKU_CODE/);
});

test('informational publication and purchasability are independent states', () => {
  assert.equal(catalogState({ engineeringReviewed: true, approvedInternal: true, visibleInformational: true, purchaseGateOpen: false, hasApprovedPrice: false }), 'VISIBLE_INFORMATIONAL');
  assert.equal(catalogState({ engineeringReviewed: true, approvedInternal: true, visibleInformational: true, purchaseGateOpen: true, hasApprovedPrice: true }), 'PURCHASABLE_GATED');
  assert.equal(catalogState({ engineeringReviewed: false, approvedInternal: false, visibleInformational: false, purchaseGateOpen: false, hasApprovedPrice: false }), 'ENGINEERING_REVIEW');
});

test('only explicit publication approvals survive the specification projection', () => {
  const visible = approvedSpecifications([
    { key: 'channels', value: 4, state: 'APPROVED_FOR_PUBLICATION' as const },
    { key: 'voltage', value: 'TO VERIFY', state: 'PENDING_REVIEW' as const },
    { key: 'claim', value: 'rejected', state: 'REJECTED' as const },
    { key: 'empty', value: '', state: 'APPROVED_FOR_PUBLICATION' as const },
  ]);
  assert.deepEqual(visible, [{ key: 'channels', value: 4 }]);
});

test('minor-unit arithmetic refuses fractional, negative and unsafe amounts', () => {
  assert.equal(minorUnits(123_45), 123_45);
  assert.equal(multiplyMinor(123_45, 2), 246_90);
  assert.equal(addMinor([123_45, 0, 100]), 124_45);
  for (const bad of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.POSITIVE_INFINITY]) {
    assert.throws(() => minorUnits(bad), /INVALID_AMOUNT/);
  }
  assert.throws(() => multiplyMinor(Number.MAX_SAFE_INTEGER, 2), /AMOUNT_OUT_OF_RANGE/);
  assert.throws(() => addMinor([Number.MAX_SAFE_INTEGER, 1]), /AMOUNT_OUT_OF_RANGE/);
});

test('privileged credential policy rejects short, common and identity-derived passwords', () => {
  assert.equal(passwordPolicyError('Synthet!c-Unique-47', 'owner@example.com'), null);
  assert.equal(passwordPolicyError('Short-1!'), 'PASSWORD_TOO_SHORT');
  assert.equal(passwordPolicyError('Password-Common-47!'), 'PASSWORD_TOO_PREDICTABLE');
  assert.equal(passwordPolicyError('Owner-Unique-Value-47!', 'owner@example.com'), 'PASSWORD_TOO_PREDICTABLE');
});

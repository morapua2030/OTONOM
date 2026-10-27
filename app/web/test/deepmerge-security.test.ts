import assert from 'node:assert/strict';
import test from 'node:test';
import { deepMerge, deepMergeWithCombinedArrays, deepMergeWithSourceArrays } from 'payload';

const malicious = (body: string) => JSON.parse(body) as Record<string, unknown>;

test('Payload deep merge rejects prototype-mutating keys for every CVE-2026-93753 target shape', () => {
  const nullPrototype = deepMerge(Object.create(null), malicious('{"__proto__":{"isAdmin":true}}')) as Record<string, unknown>;
  const nullPlaceholder = deepMerge({ session: null }, malicious('{"session":{"__proto__":{"isAdmin":true}}}')) as { session: Record<string, unknown> };
  const poisonedTarget = deepMerge(malicious('{"__proto__":{"isAdmin":true}}'), {}) as Record<string, unknown>;
  const arrayClone = deepMerge([], [malicious('{"__proto__":{"isAdmin":true}}')]) as Array<Record<string, unknown>>;

  for (const value of [nullPrototype, nullPlaceholder.session, poisonedTarget, arrayClone[0]]) {
    assert.equal(Object.hasOwn(value, 'isAdmin'), false);
    assert.equal(value.isAdmin, undefined);
    assert.equal(Object.getPrototypeOf(value), Object.prototype);
  }
});

test('Payload merge compatibility retains ordinary values and both array strategies', () => {
  assert.deepEqual(deepMerge({ nested: { first: true } }, { nested: { second: true } }), { nested: { first: true, second: true } });
  assert.deepEqual(deepMergeWithCombinedArrays({ values: ['a'] }, { values: ['b'] }), { values: ['a', 'b'] });
  assert.deepEqual(deepMergeWithSourceArrays({ values: ['a'] }, { values: ['b'] }), { values: ['b'] });
});

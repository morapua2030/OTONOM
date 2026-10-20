import assert from 'node:assert/strict';
import test from 'node:test';
import { chunksOf, collectPages } from '../src/lib/pagination.ts';

test('collectPages follows Payload nextPage until the complete result is collected', async () => {
  const seen: Array<[number, number]> = [];
  const docs = await collectPages(async (page, limit) => {
    seen.push([page, limit]);
    return page === 1
      ? { docs: [1, 2], hasNextPage: true, nextPage: 2 }
      : { docs: [3], hasNextPage: false, nextPage: null };
  }, 2);
  assert.deepEqual(docs, [1, 2, 3]);
  assert.deepEqual(seen, [[1, 2], [2, 2]]);
});

test('collectPages rejects a non-advancing cursor and chunksOf bounds IN filters', async () => {
  await assert.rejects(() => collectPages(async () => ({ docs: [], hasNextPage: true, nextPage: 1 })), /INVALID_NEXT_PAGE/);
  assert.deepEqual(chunksOf([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

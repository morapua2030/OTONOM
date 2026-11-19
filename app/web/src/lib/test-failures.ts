import { APIError, type CollectionAfterChangeHook } from 'payload';
import { testHarnessBuild } from './test-harness.ts';

/**
 * Test harness only (audit 2026-11-18, X-04 / AI7-01; tests/src/audit-commit.ts). With the request header
 * `x-otonom-test-fail-after-change: 1` the save fails AFTER every afterChange hook has run, so its transaction rolls
 * back: the test then proves that no audit row of the failed change stays behind. Never active in a normal build.
 */
export const failAfterChangeForTests: CollectionAfterChangeHook = ({ req, doc }) => {
  if (testHarnessBuild() && req.headers?.get?.('x-otonom-test-fail-after-change') === '1') {
    throw new APIError('Synthetic failure after the change (test harness).', 500);
  }
  return doc;
};

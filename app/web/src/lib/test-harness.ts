/**
 * Test-only switches exist only in a build made for the local / CI test harness (audit 2026-11-18, AI3-01).
 *
 * `OTONOM_TEST_HARNESS_BUILD=1` at `next build` time is inlined by next.config.ts (`env`), so in every other build
 * (Vercel included) this function returns the compile-time constant false: the fixed e-mail MFA code, the test e-mail
 * provider and the synthetic harness flags cannot be switched on by any runtime variable. The runtime fences (not on
 * Vercel, the explicit test variables) stay as a second line. Unit tests (no build) read the variable at call time.
 * Read it only through this literal: an `env` parameter is never replaced at build time.
 */
export function testHarnessBuild(): boolean {
  return process.env.OTONOM_TEST_HARNESS_BUILD === '1';
}

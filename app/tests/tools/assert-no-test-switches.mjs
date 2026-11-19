#!/usr/bin/env node
// Audit 2026-11-18, AI3-01: a normal production build (no OTONOM_TEST_HARNESS_BUILD) must contain no test-only switch.
// Scans the server output of `next build` for:
//  - a runtime read of the harness flag (next.config.mjs must have inlined it as '' at build time), and
//  - the fixed e-mail MFA code variable (its branch must be gone as dead code).
// Usage: node tests/tools/assert-no-test-switches.mjs <path to web/.next>. Exit 1 when any is found, 2 when there is
// nothing to scan.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'web/.next', 'server');
const FORBIDDEN = [
  ['runtime read of the harness flag', /process\.env\.OTONOM_TEST_HARNESS_BUILD|process\.env\[["']OTONOM_TEST_HARNESS_BUILD["']\]/],
  ['the fixed e-mail MFA code variable', /OTONOM_EMAIL_OTP_TEST_CODE/],
];
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(c|m)?js$/.test(name)) files.push(p);
  }
};
try {
  walk(root);
} catch {
  console.error(`no build output at ${root}`);
  process.exit(2);
}
if (!files.length) {
  console.error(`no server JavaScript under ${root}`);
  process.exit(2);
}
let found = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const [what, re] of FORBIDDEN) {
    if (re.test(text)) {
      found++;
      console.error(`FOUND ${what}: ${path.relative(root, f)}`);
    }
  }
}
console.log(`${files.length} server files scanned, ${found} test-only switch reference(s) found`);
process.exit(found ? 1 : 0);

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sha = (rel: string) => createHash('sha256').update(readFileSync(new URL(`../${rel}`, import.meta.url))).digest('hex');

test('/favicon.ico is the unmodified official OTONOM favicon (browsers request it on pages without an icon link)', () => {
  // The admin host's staff and admin pages declare no icon, so the browser asks for /favicon.ico (2026-11-05 release check).
  assert.equal(sha('public/favicon.ico'), sha('public/brand/otonom/assets/icons/favicon.ico'));
  assert.equal(sha('public/brand/otonom/assets/icons/favicon.ico'), 'ce2c34c5f70f2d9ad45b87b7c17ab7e48ec52d80010dd187fbd10f59177faeef');
});

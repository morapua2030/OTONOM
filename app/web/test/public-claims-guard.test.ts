import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const GATED = /^app\/\(site\)\/\[locale\]\/(shop|cart|checkout|account|support\/warranty|preview)\//;
const PUBLIC_ROOTS = ['components', 'lib', 'app/(site)'];

function publicSources(): Array<[string, string]> {
  const files: Array<[string, string]> = [];
  for (const root of PUBLIC_ROOTS) {
    for (const entry of readdirSync(new URL(`${root}/`, SRC), { recursive: true }) as string[]) {
      const rel = `${root}/${entry.replaceAll('\\', '/')}`;
      if (!/\.(ts|tsx)$/.test(rel) || rel.startsWith('components/admin/') || GATED.test(rel)) continue;
      files.push([rel, readFileSync(new URL(rel, SRC), 'utf8')]);
    }
  }
  return files;
}

test('public components and copy never offer a cart or an immediate purchase', () => {
  const files = publicSources();
  assert.ok(files.length > 20, 'the scan must cover the public sources');
  for (const [rel, source] of files) {
    for (const phrase of [/add to cart/i, /buy now/i, /أضف إلى السلة/, /اشترِ الآن/]) {
      assert.doesNotMatch(source, phrase, `${rel} contains a purchase claim`);
    }
  }
});

test('gated commerce and portal pages stay out of the sitemap and always send noindex', () => {
  const sitemap = readFileSync(new URL('app/(site)/sitemap.xml/route.ts', SRC), 'utf8');
  const listed = sitemap.slice(sitemap.indexOf('const STATIC'), sitemap.indexOf('];'));
  for (const path of ['/shop', '/cart', '/checkout', '/account', '/support/warranty', '/preview']) {
    assert.equal(listed.includes(`'${path}'`), false, `${path} must not be in the sitemap`);
  }
  const gated = readFileSync(new URL('components/Gated.tsx', SRC), 'utf8');
  assert.match(gated, /description: d\.gated\.body, noindex: true \}\)/);
});

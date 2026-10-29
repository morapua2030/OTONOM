import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PRODUCTS, PRODUCT_MODELS, PRODUCT_REVIEW_NOTICE, productByModel, publicProductProjection } from '../src/lib/products.ts';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('public product registry contains exactly the owner-confirmed 4R, 6R and 16R models', () => {
  assert.deepEqual(PRODUCTS.map((product) => product.model), [...PRODUCT_MODELS]);
  assert.deepEqual(PRODUCTS.map((product) => product.channels), [4, 6, 16]);
  assert.equal(new Set(PRODUCTS.map((product) => product.image)).size, 3);
  for (const product of PRODUCTS) {
    assert.equal(product.publicationStatus, 'OWNER_CONFIRMED_CORE_ONLY');
    assert.equal(productByModel(product.model), product);
    const publicPath = path.join(webRoot, 'public', product.image.replace(/^\//, ''));
    assert.ok(existsSync(publicPath), `missing ${product.image}`);
    const bytes = readFileSync(publicPath);
    for (const metadataChunk of ['caBX', 'tEXt', 'iTXt', 'zTXt', 'eXIf']) {
      assert.equal(bytes.includes(Buffer.from(metadataChunk, 'ascii')), false, `${product.image} retains ${metadataChunk} metadata`);
    }
  }
});

test('public product model cannot carry unapproved technical, price or warranty fields', () => {
  const publicJson = JSON.stringify(PRODUCTS).toLowerCase();
  for (const forbidden of ['voltage', 'current', 'amp', 'watt', 'ip rating', 'certification', 'price', 'warranty duration']) {
    assert.equal(publicJson.includes(forbidden), false, `unexpected public field or claim: ${forbidden}`);
  }
});

test('runtime public projection strips review-only and commercial fields', () => {
  const projected = publicProductProjection({
    ...PRODUCTS[0],
    voltage: 'UNVERIFIED',
    certification: 'UNVERIFIED',
    priceMinor: 123,
    warrantyDuration: 12,
  } as any);
  assert.deepEqual(Object.keys(projected).sort(), ['alt', 'channels', 'fit', 'image', 'model', 'name', 'publicationStatus', 'summary']);
  assert.equal(JSON.stringify(projected).includes('UNVERIFIED'), false);
  assert.equal(JSON.stringify(projected).includes('123'), false);
});

test('public product notice uses launch-safe wording', () => {
  assert.doesNotMatch(PRODUCT_REVIEW_NOTICE.en, /preview/i);
  assert.doesNotMatch(PRODUCT_REVIEW_NOTICE.ar, /معاينة/);
  assert.match(PRODUCT_REVIEW_NOTICE.en, /public information site/i);
});

test('website chrome uses the approved Hybrid 03 logo assets', () => {
  const chrome = readFileSync(path.join(webRoot, 'src', 'components', 'site.tsx'), 'utf8');
  const brand = readFileSync(path.join(webRoot, 'src', 'components', 'BrandLogo.tsx'), 'utf8');
  assert.match(brand, /\/brand\/otonom\/assets\/svg\/primary_light\.svg/);
  assert.match(brand, /\/brand\/otonom\/assets\/svg\/primary_dark\.svg/);
  assert.ok(existsSync(path.join(webRoot, 'public', 'brand', 'otonom', 'assets', 'svg', 'primary_light.svg')));
  assert.ok(existsSync(path.join(webRoot, 'public', 'brand', 'otonom', 'assets', 'svg', 'primary_dark.svg')));
  assert.doesNotMatch(chrome, /\/brand\/otonom-logo\.png/);
  assert.doesNotMatch(chrome, /brand-mark/);
});

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { c } from '../src/lib/content.ts';
import { PRODUCTS, productChannelLabel, requireProductByModel, type ProductModel } from '../src/lib/products.ts';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(webRoot, 'src');
const read = (relative: string) => readFileSync(path.join(srcRoot, relative), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [full] : [];
  });
}

test('every registry product keeps its confirmed core fields', () => {
  assert.equal(PRODUCTS.length, 3);
  for (const product of PRODUCTS) {
    assert.ok(product.model, 'model');
    assert.ok(product.name, `${product.model} name`);
    assert.ok([4, 6, 16].includes(product.channels), `${product.model} channels`);
    assert.match(product.image, /^\/products\/otonom-(4r|6r|16r)\.png$/);
    assert.equal(requireProductByModel(product.model), product);
  }
  assert.throws(() => requireProductByModel('99r' as ProductModel), /missing model "99r"/);
});

test('productChannelLabel returns exactly the approved channel phrases', () => {
  const labels = PRODUCTS.map((product) => [productChannelLabel(product, 'en'), productChannelLabel(product, 'ar')]);
  assert.deepEqual(labels, [
    ['four channels', 'أربع قنوات'],
    ['six channels', 'ست قنوات'],
    ['sixteen channels', 'ست عشرة قناة'],
  ]);
});

test('content.ts no longer carries a second controller model list', () => {
  for (const locale of ['en', 'ar'] as const) {
    const controllers = c(locale).controllers;
    assert.equal('models' in controllers, false, `${locale} controllers.models must not exist`);
    assert.ok(controllers.title && controllers.note, `${locale} controllers title/note are still used by technology/controllers`);
  }
  assert.doesNotMatch(read('lib/content.ts'), /models\s*:/);
});

test('gated shop list and RFQ model options read from the product registry', () => {
  const gated = read('components/Gated.tsx');
  assert.match(gated, /from '@\/lib\/products\.ts'/);
  assert.match(gated, /PRODUCTS\.map\(/);
  assert.doesNotMatch(gated, /controllers\.models/);
  assert.match(gated, /INFORMATION ONLY/);
  assert.match(gated, /PRICE NOT CONFIGURED/);
  assert.match(gated, /data-stage="PREVIEW"/);

  const rfq = read('components/RfqForm.tsx');
  assert.match(rfq, /import \{[^}]*\bPRODUCTS\b[^}]*\} from '\.\.\/lib\/products\.ts'/);
  assert.match(rfq, /value=\{product\.model\}/);
  for (const model of ['4r', '6r', '16r']) {
    assert.doesNotMatch(rfq, new RegExp(`<option value="${model}"`), `literal ${model} option`);
  }
  assert.doesNotMatch(rfq, /\['4r', '6r', '16r'\]/);
});

test('no source file outside lib/products.ts hard-codes a product image path', () => {
  const registry = path.join(srcRoot, 'lib', 'products.ts');
  const offenders = sourceFiles(srcRoot)
    .filter((file) => file !== registry && readFileSync(file, 'utf8').includes('/products/otonom-'))
    .map((file) => path.relative(webRoot, file));
  assert.deepEqual(offenders, []);
});

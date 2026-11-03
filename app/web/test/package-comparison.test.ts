import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { packageComparisonRows, SMART_HOME_PACKAGES, type SmartHomePackage } from '../src/lib/smart-home-packages.ts';

test('packageComparisonRows follows first appearance in registry order', () => {
  const firstSeen: string[] = [];
  for (const entry of SMART_HOME_PACKAGES) for (const item of entry.items) if (!firstSeen.includes(item.name.en)) firstSeen.push(item.name.en);
  assert.deepEqual(packageComparisonRows().map((row) => row.key), firstSeen);
  assert.deepEqual(Object.keys(packageComparisonRows()[0].cells), SMART_HOME_PACKAGES.map((entry) => entry.id));
});

test('packageComparisonRows marks unlisted items as null and keeps listed quantities', () => {
  const rows = new Map(packageComparisonRows().map((row) => [row.key, row]));
  assert.deepEqual(rows.get('Smart Lock')?.cells, { premium: 1, plus: null, essential: null });
  const r16 = rows.get('16R Smart Controller');
  assert.deepEqual(r16?.cells, { premium: 2, plus: 2, essential: 1 });
  assert.equal(r16?.model, '16r');
  for (const row of rows.values()) if (row.key !== '16R Smart Controller') assert.equal(row.model, undefined, `${row.key} must not claim a model`);
});

test('packageComparisonRows is derived from the data it is given', () => {
  const cloned = structuredClone(SMART_HOME_PACKAGES) as SmartHomePackage[];
  cloned[2].items.push({ name: { en: 'Synthetic Test Item', ar: 'عنصر اختبار' }, quantity: 3 });
  cloned[1].items = cloned[1].items.filter((item) => item.name.en !== 'Gas Sensor');
  const rows = new Map(packageComparisonRows(cloned).map((row) => [row.key, row]));
  assert.deepEqual(rows.get('Synthetic Test Item')?.cells, { premium: null, plus: null, essential: 3 });
  assert.equal(rows.get('Gas Sensor')?.cells.plus, null);
  assert.equal(packageComparisonRows().some((row) => row.key === 'Synthetic Test Item'), false, 'the registry is not mutated');
});

test('PackageComparison says "Not in this package" with an accessible name and never claims exclusions', () => {
  const source = readFileSync(new URL('../src/components/SmartHomePackages.tsx', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('function comparisonCell'), source.indexOf('export function SmartHomePackages'));
  assert.ok(block.includes("<span aria-hidden=\"true\">—</span><span className=\"sr-only\">{tx(locale, 'غير مدرج في الباقة', 'Not in this package')}</span>"));
  assert.ok(block.includes("'قارن المكونات', 'Compare what’s included'"));
  assert.doesNotMatch(block, /not included|excluded|غير مشمول|غير متضمن|مستبعد/i);
  assert.match(block, /packageComparisonRows\(\)/);
  assert.match(block, /formatPackageAmount\(entry\.priceEgp\)\}<\/bdi> \{packageCurrency\(locale\)\}/);
  assert.match(block, /role="region" aria-label=\{caption\} tabIndex=\{0\}/);
  assert.match(block, /href=\{`\/\$\{locale\}\/products\/\$\{row\.model\}`\}/);
  assert.doesNotMatch(block, /'(Amazon Alexa|Smart Lock|IR Remote|Gas Sensor|16R Smart Controller)'/, 'item names come from the registry');
  const comparisonAt = source.indexOf('<PackageComparison locale={locale} />');
  assert.ok(comparisonAt > source.indexOf('data-testid="smart-home-packages"') && comparisonAt < source.indexOf('className="package-caveat"'), 'the caveat stays right under the table');
  const page = readFileSync(new URL('../src/app/(site)/[locale]/smart-home/packages/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /<SmartHomePackages locale=\{locale\} comparison \/>/);
});

test('rows with any multi-unit package show every listed quantity; all-single rows show Listed', () => {
  const rows = new Map(packageComparisonRows().map((row) => [row.key, row]));
  const r16 = rows.get('16R Smart Controller');
  assert.equal(r16?.showQuantities, true);
  assert.deepEqual(SMART_HOME_PACKAGES.map((entry) => r16?.cells[entry.id]), [2, 2, 1]);
  for (const row of rows.values()) {
    const listed = Object.values(row.cells).filter((quantity): quantity is number => quantity !== null);
    assert.equal(row.showQuantities, listed.some((quantity) => quantity > 1), `${row.key} quantity display is derived`);
  }
  const cloned = structuredClone(SMART_HOME_PACKAGES) as SmartHomePackage[];
  cloned[0].items = cloned[0].items.map((item) => (item.name.en === 'Gas Sensor' ? { ...item, quantity: 2 } : item));
  assert.equal(packageComparisonRows(cloned).find((row) => row.key === 'Gas Sensor')?.showQuantities, true);
  const source = readFileSync(new URL('../src/components/SmartHomePackages.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(showQuantities\) return <strong><bdi dir="ltr">×\{quantity\}<\/bdi><\/strong>;/);
  assert.match(source, /comparisonCell\(row\.cells\[entry\.id\], row\.showQuantities, locale\)/);
});

test('the package table title sits outside the scroll region and the swipe hint is hidden from assistive tech', () => {
  const source = readFileSync(new URL('../src/components/SmartHomePackages.tsx', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('export function PackageComparison'), source.indexOf('export function SmartHomePackages'));
  const title = block.indexOf('<h3 className="package-compare-title">{caption}</h3>');
  const hint = block.indexOf('<p className="package-compare-hint" aria-hidden="true">');
  const region = block.indexOf('role="region" aria-label={caption} tabIndex={0}');
  assert.ok(title > -1 && hint > title && region > hint, 'title, then hint, then the scroll region');
  assert.ok(block.includes("'اسحب الجدول لعرض باقي الباقات', 'Swipe the table to see all packages'"));
  assert.match(block, /<caption className="sr-only">\{caption\}<\/caption>/);
  const css = readFileSync(new URL('../src/app/(site)/hybrid03.css', import.meta.url), 'utf8');
  assert.match(css, /\.package-compare-hint \{ display: none;/);
  assert.match(css, /@media \(max-width: 600px\) \{\s*\.package-compare-hint \{ display: block; \}/);
});

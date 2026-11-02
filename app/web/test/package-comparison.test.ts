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
  const r16 = rows.get('R16 Smart Controller');
  assert.deepEqual(r16?.cells, { premium: 2, plus: 2, essential: 1 });
  assert.equal(r16?.model, '16r');
  for (const row of rows.values()) if (row.key !== 'R16 Smart Controller') assert.equal(row.model, undefined, `${row.key} must not claim a model`);
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

test('PackageComparison says "Not listed in the brochure" and never claims exclusions', () => {
  const source = readFileSync(new URL('../src/components/SmartHomePackages.tsx', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('function comparisonCell'), source.indexOf('export function SmartHomePackages'));
  assert.ok(block.includes("'غير مذكور في البروشور', 'Not listed in the brochure'"));
  assert.ok(block.includes("'مقارنة محتويات الباقات كما وردت في البروشور', 'Package contents as listed in the brochure'"));
  assert.doesNotMatch(block, /not included|excluded|غير مشمول|غير متضمن|مستبعد/i);
  assert.match(block, /packageComparisonRows\(\)/);
  assert.match(block, /formatPackagePrice\(entry\.priceEgp, locale\)/);
  assert.match(block, /role="region" aria-label=\{caption\} tabIndex=\{0\}/);
  assert.match(block, /href=\{`\/\$\{locale\}\/products\/\$\{row\.model\}`\}/);
  assert.doesNotMatch(block, /'(Amazon Alexa|Smart Lock|IR Remote|Gas Sensor|R16 Smart Controller)'/, 'item names come from the registry');
  const comparisonAt = source.indexOf('<PackageComparison locale={locale} />');
  assert.ok(comparisonAt > source.indexOf('data-testid="smart-home-packages"') && comparisonAt < source.indexOf('className="package-caveat"'), 'the caveat stays right under the table');
  const page = readFileSync(new URL('../src/app/(site)/[locale]/smart-home/packages/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /<SmartHomePackages locale=\{locale\} comparison \/>/);
});

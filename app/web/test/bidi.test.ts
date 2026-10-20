// Unit tests for bidi run isolation (spike V-6 defects D1–D3) and SEO metadata helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolateRuns } from '../src/components/bidi.tsx';
import { pageMetadata, summarise } from '../src/lib/seo.ts';

const ltr = (s: string) => isolateRuns(s).filter((r) => r.ltr).map((r) => r.s);

test('parenthesised Latin token is isolated together with its brackets (D1)', () => {
  assert.deepEqual(ltr('عينات الاتجاه المختلط (V-6)'), ['(V-6)']);
  assert.deepEqual(ltr('وحدة التحكم (RC04) بأربع قنوات'), ['(RC04)']);
});

test('percent, units and superscripts stay inside the run (D3)', () => {
  assert.deepEqual(ltr('نسبة التغطية 80% من العقود'), ['80%']);
  assert.deepEqual(ltr('مقطع 2.5 mm² للكابل'), ['2.5 mm²']);
  assert.deepEqual(ltr('الحمل 10 A / 230 V AC لكل قناة'), ['10 A / 230 V AC']);
});

test('phone numbers, e-mails, references and file names are single runs (D2)', () => {
  assert.deepEqual(ltr('اتصل على +20 100 000 0000 الآن'), ['+20 100 000 0000']);
  assert.deepEqual(ltr('راسلنا synthetic.buyer@example.com اليوم'), ['synthetic.buyer@example.com']);
  assert.deepEqual(ltr('المرجع RFQ-2026-ABC234 قيد المراجعة'), ['RFQ-2026-ABC234']);
  assert.deepEqual(ltr('الملف Villa-A_Ground-Floor_rev3.dwg مطلوب'), ['Villa-A_Ground-Floor_rev3.dwg']);
});

test('multi-word Latin names are one run; Arabic conjunction splits runs', () => {
  assert.deepEqual(ltr('التكامل مع Home Assistant وGoogle Home'), ['Home Assistant', 'Google Home']);
});

test('pure Arabic text has no LTR runs; reconstruction is lossless', () => {
  const s = 'نصمم ونورّد ونركّب ونشغّل أنظمة المنازل الذكية.';
  assert.deepEqual(ltr(s), []);
  for (const x of ['مثال (RC16) و 4 و6 و16 قناة — 80%.', 'OTONOM شركة مصرية']) assert.equal(isolateRuns(x).map((r) => r.s).join(''), x);
});

test('pageMetadata: canonical + reciprocal hreflang for the same path, always noindex', () => {
  const m = pageMetadata({ locale: 'ar', path: '/business/developers', title: 't' }) as any;
  assert.equal(m.alternates.canonical, '/ar/business/developers');
  assert.deepEqual(m.alternates.languages, { ar: '/ar/business/developers', en: '/en/business/developers', 'x-default': '/ar/business/developers' });
  assert.equal(m.robots.index, false);
  assert.equal((pageMetadata({ locale: 'en', path: '/', title: 't' }) as any).alternates.canonical, '/en');
});

test('summarise keeps the first sentence and caps the length', () => {
  assert.equal(summarise('First sentence. Second one.'), 'First sentence.');
  assert.equal(summarise('جملة أولى؟ ثانية.'), 'جملة أولى؟');
  assert.ok((summarise('x'.repeat(400)) ?? '').length <= 160);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { allServicePages, servicePage, servicePaths } from '../src/lib/services.ts';

test('D3 exposes five substantive service experiences in both locales', () => {
  assert.deepEqual(servicePaths, [
    'services',
    'services/software-engineering',
    'services/iot-embedded',
    'services/custom-engineering',
    'services/smart-home-automation',
  ]);
  for (const locale of ['ar', 'en'] as const) {
    const pages = allServicePages(locale);
    assert.equal(pages.length, 5);
    for (const page of pages) {
      assert.ok(page.title.length > 20, `${locale}/${page.path}: short title`);
      assert.ok(page.summary.length > 80, `${locale}/${page.path}: shallow summary`);
      assert.ok(page.capabilities.length >= 3, `${locale}/${page.path}: shallow capabilities`);
      assert.ok(page.scenarios.length >= 4, `${locale}/${page.path}: missing scenarios`);
      assert.equal(page.entryPoints.length, 4, `${locale}/${page.path}: missing entry stages`);
      assert.equal(page.process.length, 5, `${locale}/${page.path}: incomplete process`);
      assert.ok(page.deliverables.length >= 4, `${locale}/${page.path}: shallow deliverables`);
      assert.ok(page.faqs.length >= 5, `${locale}/${page.path}: shallow FAQ`);
      assert.ok(page.related.length >= 3, `${locale}/${page.path}: missing cross-service links`);
    }
  }
});

test('specialist pages include the required deep anchors and journeys', () => {
  const software = servicePage('en', 'services/software-engineering')!;
  assert.deepEqual(software.capabilities.map((item) => item.id), ['web-apps', 'mobile', 'erp-crm', 'saas', 'apis', 'analytics', 'modernization', 'automation']);
  const embedded = servicePage('en', 'services/iot-embedded')!;
  assert.deepEqual(embedded.capabilities.map((item) => item.id), ['electronics-pcb', 'firmware', 'sensors', 'controllers', 'connectivity', 'telemetry', 'platforms', 'validation']);
  const custom = servicePage('en', 'services/custom-engineering')!;
  assert.deepEqual(custom.capabilities.map((item) => item.id), ['idea-to-prototype', 'prototype-rescue', 'existing-system']);
  assert.equal(custom.journeys?.length, 3);
  assert.equal(servicePage('en', 'services/smart-home-automation')?.productProof, true);
});

test('D3 copy is evidence-aware and serves individuals and businesses', () => {
  const overview = servicePage('en', 'services')!;
  assert.match(overview.summary, /individuals and businesses/i);
  const copy = JSON.stringify({ ar: allServicePages('ar'), en: allServicePages('en') }).toLowerCase();
  for (const forbidden of ['guaranteed savings', 'best in egypt', '100% compatible', 'buy now', 'checkout now', 'lifetime warranty', 'certified by']) {
    assert.equal(copy.includes(forbidden), false, `unapproved claim: ${forbidden}`);
  }
  assert.match(copy, /illustrative|توضيحي/);
  assert.match(copy, /not a feasibility|لا يقدم هذا الموقع عرض سعر/);
});

test('service discovery remains client-only and non-collecting', () => {
  const source = readFileSync(new URL('../src/components/ServiceExplorer.tsx', import.meta.url), 'utf8');
  assert.match(source, /^'use client';/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /<form|fetch\(|localStorage|sessionStorage|XMLHttpRequest/);
});

test('D3 service routes remain in the public sitemap', () => {
  const source = readFileSync(new URL('../src/app/(site)/sitemap.xml/route.ts', import.meta.url), 'utf8');
  for (const path of servicePaths) assert.match(source, new RegExp(`/${path.replaceAll('/', '\\/')}`));
});

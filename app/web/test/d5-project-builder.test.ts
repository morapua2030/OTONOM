import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateRfq } from '../src/lib/rfq-validate.ts';
import { SMART_HOME_PACKAGES, smartHomePackage } from '../src/lib/smart-home-packages.ts';

test('D5 package registry preserves the approved order, prices and controller quantities', () => {
  assert.deepEqual(SMART_HOME_PACKAGES.map((entry) => entry.id), ['premium', 'plus', 'essential']);
  assert.deepEqual(SMART_HOME_PACKAGES.map((entry) => entry.priceEgp), [44_000, 32_000, 24_000]);
  assert.deepEqual(SMART_HOME_PACKAGES.map((entry) => entry.items.find((item) => item.name.en === 'R16 Smart Controller')?.quantity), [2, 2, 1]);
  assert.ok(smartHomePackage('premium'));
  assert.equal(smartHomePackage('unexpected'), null);
});

test('D5 package copy does not claim checkout, warranty or ambiguous inclusions', () => {
  const copy = JSON.stringify(SMART_HOME_PACKAGES).toLowerCase();
  for (const forbidden of ['checkout', 'warranty', 'tax included', 'shipping included', 'installation included', 'free installation']) {
    assert.equal(copy.includes(forbidden), false, `unapproved package claim: ${forbidden}`);
  }
});

const builderPayload = {
  kind: 'RFQ',
  idempotencyKey: Array.from({ length: 32 }, () => '0').join(''),
  locale: 'en',
  source: 'PROJECT_BUILDER_V1',
  clientKind: 'INDIVIDUAL',
  projectStage: 'IDEA',
  disciplines: ['SMART_HOME'],
  package: 'premium',
  details: { outcome: 'I want a clear smart-home automation starting point.', governorate: 'CAIRO' },
  fullName: 'Synthetic D5 User',
  email: 'synthetic@example.test',
  customerType: 'INDIVIDUAL',
  projectType: 'SMART_HOME',
  governorate: 'CAIRO',
  systems: ['SMART_HOME'],
  engagementModel: 'UNSURE',
  description: 'I want a clear smart-home automation starting point.',
  consentProcessing: true,
  consentMarketing: false,
};

test('D5 Project Builder validates a structured brief without requiring a fake unit count', () => {
  const result = validateRfq(builderPayload);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.attribution?.builder?.packageId, 'premium');
  assert.deepEqual(result.value.attribution?.builder?.disciplines, ['SMART_HOME']);
  assert.equal(result.value.units, undefined);
});

test('D5 backend rejects client-supplied prices and unknown packages', () => {
  const priceAttempt = validateRfq({ ...builderPayload, price: 1 });
  assert.equal(priceAttempt.ok, false);
  if (!priceAttempt.ok) assert.equal(priceAttempt.errors.package, 'server_canonical_only');
  const unknownPackage = validateRfq({ ...builderPayload, package: 'vip' });
  assert.equal(unknownPackage.ok, false);
  if (!unknownPackage.ok) assert.equal(unknownPackage.errors.package, 'invalid');
});

test('Project Builder remains ephemeral and query input is allowlisted', () => {
  const source = readFileSync(new URL('../src/components/ProjectBuilder.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.match(source, /isSmartHomePackageId\(packageValue\)/);
  assert.match(source, /SERVICE_DISCIPLINE\[serviceValue\]/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /project-intake-disabled/);
});

test('D5 public routes are localized and indexed in the sitemap', () => {
  const sitemap = readFileSync(new URL('../src/app/(site)/sitemap.xml/route.ts', import.meta.url), 'utf8');
  assert.match(sitemap, /\/start-project/);
  assert.match(sitemap, /\/smart-home\/packages/);
  const packagePage = readFileSync(new URL('../src/app/(site)/[locale]/smart-home/packages/page.tsx', import.meta.url), 'utf8');
  assert.match(packagePage, /generateMetadata/);
  assert.match(packagePage, /SmartHomePackages/);
});

test('public RFQ endpoint has origin, rate-limit and idempotency protections', () => {
  const endpoint = readFileSync(new URL('../src/endpoints/index.ts', import.meta.url), 'utf8');
  const intake = endpoint.slice(endpoint.indexOf("path: '/rfq'"), endpoint.indexOf("path: '/workspace/opportunities"));
  assert.match(intake, /mutationOriginGuard\(req\)/);
  assert.match(intake, /rateLimit\(`rfq:/);
  assert.match(intake, /idempotencyKey/);
  assert.match(intake, /PUBLIC_INTAKE_DISABLED/);
});

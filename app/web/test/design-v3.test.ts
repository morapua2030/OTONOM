import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { initialStartSelection, startMessage } from '../src/lib/start-message.ts';
import { legacyRouteRedirect } from '../src/lib/deployment.ts';
import { ADDRESS } from '../src/lib/contact.ts';
import { SITE_COPY } from '../src/lib/site-copy.ts';
import { INNER } from '../src/lib/site-copy-inner.ts';

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('start-project builds the design message for chip combinations (verbatim buildStart)', () => {
  const none = { who: null, stage: null, field: null } as const;
  assert.equal(startMessage('en', none), "Hi OTONOM, I'd like to talk about a project.");
  assert.equal(startMessage('en', { who: 'co', stage: 'idea', field: 'iot' }), "Hi OTONOM, we're a company, I have an idea in IoT and I'd like to talk about a project.");
  assert.equal(startMessage('en', { who: null, stage: null, field: 'soft' }), "Hi OTONOM, I'm interested in software and I'd like to talk about a project.");
  assert.equal(startMessage('en', { who: 'ind', stage: 'unsure', field: 'unsure' }), "Hi OTONOM, I'm an individual, I'm not sure yet and I'd like to talk about a project.");
  assert.equal(startMessage('ar', none), 'أهلًا OTONOM، عايز أتكلم عن مشروع.');
  assert.equal(startMessage('ar', { who: 'ind', stage: 'proto', field: 'smart' }), 'أهلًا OTONOM، أنا فرد، عندي نموذج أولي في مجال المنزل الذكي وعايز أتكلم عن مشروع.');
  assert.equal(startMessage('ar', { who: null, stage: null, field: 'custom' }), 'أهلًا OTONOM، مهتم بمجال الهندسة المخصصة وعايز أتكلم عن مشروع.');
});

test('start-project preselects the field from the allow-listed query only', () => {
  assert.equal(initialStartSelection({ service: 'iot-embedded' }).field, 'iot');
  assert.equal(initialStartSelection({ service: 'software-engineering' }).field, 'soft');
  assert.equal(initialStartSelection({ service: 'smart-home' }).field, 'smart');
  assert.equal(initialStartSelection({ package: 'plus' }).field, 'smart');
  assert.equal(initialStartSelection({ service: '<script>', package: 'nope' }).field, null);
});

test('start-project has no form, no input and stores nothing', () => {
  for (const file of ['components/StartProject.tsx', 'app/(site)/[locale]/start-project/page.tsx', 'lib/start-message.ts']) {
    const source = read(file);
    assert.doesNotMatch(source, /<form|<input|<textarea|<select|fetch\(|localStorage|sessionStorage|document\.cookie|sendBeacon/, file);
  }
  const chips = read('components/StartProject.tsx');
  assert.match(chips, /aria-pressed=\{selection\[group\] === id\}/);
  assert.match(chips, /current\[group\] === id \? null : id/, 'a chip toggles off when pressed again');
  assert.match(chips, /href=\{whatsappHref\(message\)\}/);
});

test('design placeholders never ship', () => {
  const PLACEHOLDER = /\[optional|\[sample\]|\[empty state\]|approved privacy text|owner content/i;
  assert.doesNotMatch(JSON.stringify(SITE_COPY), PLACEHOLDER);
  assert.doesNotMatch(JSON.stringify(INNER), PLACEHOLDER);
  for (const file of ['components/v3-pages.tsx', 'components/v3.tsx', 'components/site.tsx', 'components/StartProject.tsx']) assert.doesNotMatch(read(file), PLACEHOLDER, file);
  assert.doesNotMatch(read('components/v3-pages.tsx'), /<table|showOptional/, 'no spec table: specs are out of scope (DR-106)');
});

test('no Privacy link anywhere in nav, drawer, footer or consent text (DR-108)', () => {
  for (const file of ['components/site.tsx', 'components/RfqForm.tsx', 'components/ProjectBuilder.tsx', 'components/v3-pages.tsx', 'components/Gated.tsx']) {
    assert.doesNotMatch(read(file), /legal\/privacy/, file);
  }
  assert.doesNotMatch(JSON.stringify(SITE_COPY), /"privacy"/);
});

test('the address comes from lib/contact.ts only', () => {
  assert.equal(ADDRESS.ar, 'كريتيفا دمنهور، مجمع الكليات');
  assert.equal(ADDRESS.en, 'Creativa Damanhour, Colleges Complex');
  for (const file of ['components/site.tsx', 'app/(site)/[locale]/contact/page.tsx']) {
    const source = read(file);
    assert.match(source, /ADDRESS\[locale\]/, file);
    assert.doesNotMatch(source, /Creativa|كريتيفا/, `${file} must not hard-code the address`);
  }
});

test('legacy routes redirect with the locale kept; gated and new pages never redirect (DR-107)', () => {
  const env = {} as NodeJS.ProcessEnv;
  const cases: Array<[string, string]> = [
    ['/ar/solutions', '/ar/services'], ['/en/solutions/villas', '/en/services'], ['/ar/engineering-process', '/ar/about'], ['/en/build-with-us', '/en/start-project'],
    ['/ar/products/compare', '/ar/products'], ['/en/consultation', '/en/contact'], ['/ar/business/request-a-proposal', '/ar/contact'], ['/en/business/partners', '/en/business/contractors'],
    ['/ar/technology', '/ar/products'], ['/en/technology/integrations', '/en/products'], ['/ar/insights', '/ar'], ['/en/support/service', '/en/support'], ['/ar/legal/privacy', '/ar/contact'],
  ];
  for (const [from, to] of cases) assert.equal(legacyRouteRedirect(from, env), to, from);
  for (const path of ['/ar', '/en/services', '/ar/products', '/en/support', '/ar/support/warranty', '/en/account', '/ar/shop', '/en/cart', '/ar/checkout', '/en/preview', '/ar/start-project', '/en/business/developers', '/ar/solutionsx', '/api/ready']) {
    assert.equal(legacyRouteRedirect(path, env), null, path);
  }
  assert.equal(legacyRouteRedirect('/ar/insights', { OTONOM_TEST_PAGES: '1' } as NodeJS.ProcessEnv), null, 'local synthetic harness keeps legacy pages for security suites');
  assert.equal(legacyRouteRedirect('/ar/insights', { OTONOM_TEST_PAGES: '1', VERCEL: '1' } as NodeJS.ProcessEnv), '/ar', 'never kept on Vercel');
  const proxy = read('proxy.ts');
  assert.match(proxy, /NextResponse\.redirect\(destination, 308\)/);
  assert.match(proxy, /destination\.search = '';/, 'the query is dropped');
});

test('FAQ accordion: native buttons with aria-expanded and aria-controls, one item open at a time', () => {
  const faq = read('components/FaqAccordion.tsx');
  assert.match(faq, /<button type="button" aria-expanded=\{expanded\} aria-controls=\{panel\}/);
  assert.match(faq, /setOpen\(expanded \? -1 : index\)/);
  assert.match(faq, /hidden=\{!expanded\}/);
});

test('support page keeps stating that online warranty and service requests are disabled (feature gate)', () => {
  const pages = read('components/v3-pages.tsx');
  assert.match(pages, /data-testid="warranty-disabled"><Bidi text=\{t\.warrantyOff\}/);
  assert.match(INNER.en.warrantyOff, /disabled/);
  assert.match(INNER.ar.warrantyOff, /معطّلة/);
});

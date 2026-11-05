import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { selectorMessage, selectorModel } from '../src/lib/selector-message.ts';
import { localeSwitchHref } from '../src/lib/locale-switch.ts';

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('selector WhatsApp message is built only from the choices (DR-112)', () => {
  assert.equal(selectorMessage('ar', { channels: 20, rooms: 3, model: selectorModel('ar', 20) }), 'أهلًا OTONOM، محتاج حوالي 20 قناة في 3 أوضة، والمقترح 2 × 16R.');
  assert.equal(selectorMessage('ar', { channels: 4, rooms: null, model: selectorModel('ar', 4) }), 'أهلًا OTONOM، محتاج حوالي 4 قناة، والمقترح 4R.');
  assert.equal(selectorMessage('en', { channels: 6, rooms: 2, model: selectorModel('en', 6) }), 'Hi OTONOM, I need about 6 channels in 2 rooms, and the suggestion is 6R.');
  assert.equal(selectorModel('ar', 16), '16R');
  assert.equal(selectorModel('en', 32), '2 × 16R');
  assert.equal(selectorModel('ar', 48), 'مراجعة مهندس');
  assert.equal(selectorModel('en', 48), 'an engineer review');
});

test('selector is back on /products under the controller cards, with the simulator link', () => {
  const page = read('app/(site)/[locale]/products/page.tsx');
  assert.ok(page.indexOf('<ControllerRows') < page.indexOf('<SmartProductSelector'), 'selector directly under the controller cards');
  const selector = read('components/SmartProductSelector.tsx');
  assert.match(selector, /data-testid="selector-whatsapp"/);
  assert.match(selector, /data-testid="selector-sim-link"/);
  assert.ok(selector.includes("'ده تقدير مبدئي، والمهندس بيأكد في الزيارة.'"));
});

test('simulator entry points: home, smart home, packages banner, controllers, 16R, drawer and footer', () => {
  for (const file of ['components/home-mix.tsx', 'components/v3-pages.tsx', 'components/SmartHomePackages.tsx', 'app/(site)/[locale]/products/page.tsx']) {
    assert.match(read(file), /\/try/, file);
    assert.match(read(file), /SIM_ENTRY\[locale\]\.cta/, file);
  }
  const product = read('components/v3-pages.tsx');
  assert.match(product, /model === '16r' \? <a className="btn secondary" href=\{L\(locale, '\/try'\)\}/);
  const site = read('components/site.tsx');
  assert.match(site, /drawer \? <SiteNavLink href=\{L\('\/try'\)\}/);
  assert.match(site, /\[SIM_ENTRY\[locale\]\.cta, '\/try'\]/);
  assert.match(read('app/(site)/sitemap.xml/route.ts'), /'\/try'/);
});

test('language switch on /try keeps only an allow-listed demo preset', () => {
  assert.equal(localeSwitchHref('/ar/try', '?demo=night', '', 'en'), '/en/try?demo=night');
  assert.equal(localeSwitchHref('/en/try', '?demo=gas&x=1', '', 'ar'), '/ar/try?demo=gas');
  assert.equal(localeSwitchHref('/ar/try', '?demo=<script>', '', 'en'), '/en/try');
  assert.equal(localeSwitchHref('/ar/try', '?demo=fresh', '', 'en'), '/en/try');
  assert.equal(localeSwitchHref('/ar/try', '', '#sim-s3', 'en'), '/en/try');
});

test('locale switch (on every page) imports only the tiny demo allow-list, not the simulator rules', () => {
  const ls = read('lib/locale-switch.ts');
  assert.match(ls, /from '\.\/simulator\/demo\.ts'/);
  assert.doesNotMatch(ls, /simulator\/(rules|copy|plan)/);
  assert.doesNotMatch(read('lib/simulator/demo.ts'), /^import /m);
});

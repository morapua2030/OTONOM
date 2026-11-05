import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { localeSwitchHref } from '../src/lib/locale-switch.ts';
import { isBuilderServiceKey, SERVICE_DISCIPLINE } from '../src/lib/builder-query.ts';

test('start-project keeps only a valid package and a Builder service key', () => {
  assert.equal(localeSwitchHref('/ar/start-project', '?package=plus&service=smart-home', '', 'en'), '/en/start-project?package=plus&service=smart-home');
  assert.equal(localeSwitchHref('/en/start-project', '?package=PREMIUM', '', 'ar'), '/ar/start-project?package=premium');
  assert.equal(localeSwitchHref('/ar/start-project', '?package=evil&service=smart-home', '', 'en'), '/en/start-project?service=smart-home');
  assert.equal(localeSwitchHref('/ar/start-project', '?package=plus&service=constructor&utm=x', '', 'en'), '/en/start-project?package=plus');
  assert.equal(localeSwitchHref('/ar/start-project', '?package=%3Cscript%3E', '#x', 'en'), '/en/start-project');
});

test('packages page keeps only a registered package anchor', () => {
  assert.equal(localeSwitchHref('/ar/smart-home/packages', '', '#package-plus', 'en'), '/en/smart-home/packages#package-plus');
  assert.equal(localeSwitchHref('/en/smart-home/packages', '?package=plus', '#package-essential', 'ar'), '/ar/smart-home/packages#package-essential');
  assert.equal(localeSwitchHref('/ar/smart-home/packages', '', '#x', 'en'), '/en/smart-home/packages');
  assert.equal(localeSwitchHref('/ar/smart-home/packages', '', '#package-vip', 'en'), '/en/smart-home/packages');
  assert.equal(localeSwitchHref('/ar/products', '', '#package-plus', 'en'), '/en/products', 'the anchor is only kept on the packages page');
});

test('projects keeps the portfolio query exactly as before', () => {
  assert.equal(localeSwitchHref('/ar/projects', '?category=smart-home&q=%20villa%20', '', 'en'), '/en/projects?category=smart-home&q=villa');
  assert.equal(localeSwitchHref('/en/projects', '?category=unknown', '', 'ar'), '/ar/projects');
});

test('other routes keep nothing extra and unknown paths go to the target home', () => {
  assert.equal(localeSwitchHref('/ar/products/compare', '?package=plus&service=smart-home', '#top', 'en'), '/en/products/compare');
  assert.equal(localeSwitchHref('/ar', '?q=1', '', 'en'), '/en');
  assert.equal(localeSwitchHref('/en/', '', '', 'ar'), '/ar/');
  assert.equal(localeSwitchHref('/staff/login', '?next=1', '', 'en'), '/en');
  assert.equal(localeSwitchHref('/arabic', '', '', 'en'), '/en');
});

test('the Builder and the locale switch share one service map', () => {
  assert.equal(isBuilderServiceKey('smart-home'), true);
  assert.equal(isBuilderServiceKey('constructor'), false);
  assert.equal(SERVICE_DISCIPLINE['smart-home'], 'SMART_HOME');
  const builder = readFileSync(new URL('../src/components/ProjectBuilder.tsx', import.meta.url), 'utf8');
  assert.match(builder, /from '@\/lib\/builder-query\.ts'/);
  assert.doesNotMatch(builder, /const SERVICE_DISCIPLINE/);
  const lang = readFileSync(new URL('../src/components/LangSwitch.tsx', import.meta.url), 'utf8');
  assert.match(lang, /import \{ localeSwitchHref \} from '\.\.\/lib\/locale-switch\.ts'/);
  for (const event of ['popstate', 'hashchange', 'otonom:portfolio-query']) assert.ok(lang.includes(`addEventListener('${event}'`), event);
  assert.doesNotMatch(lang, /localStorage|sessionStorage|document\.cookie/);
});

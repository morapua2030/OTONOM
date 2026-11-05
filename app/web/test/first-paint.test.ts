// First paint (owner decision, 2026-11-04): the page waits on the same two stylesheets as v4, and the site metrics
// code is loaded only after the page load event. The production HTML is checked in tests/src/final-release.ts.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
});

test('the site layout imports exactly the shared site.css and the main hybrid03.css + v2.css; the fonts are in v2.css', () => {
  const layout = read('app/(site)/[locale]/layout.tsx');
  const sheets = [...layout.matchAll(/^import '([^']+\.css)';$/gm)].map((m) => m[1]);
  assert.deepEqual(sheets, ['../site.css', '../hybrid03.css', '../v2.css'], 'no separate font stylesheet');
  const v2 = read('app/(site)/v2.css');
  assert.equal((v2.match(/@font-face \{/g) ?? []).length, 14, 'ten self-hosted faces and four metric-matched fallbacks');
  assert.equal((v2.match(/src: url\('\/fonts\/[a-z0-9-]+\.[0-9a-f]{10}\.woff2'\) format\('woff2'\);/g) ?? []).length, 10);
});

test('the metrics code is not part of the page: the layout does not render it and nothing imports it statically', () => {
  const layout = read('app/(site)/[locale]/layout.tsx');
  assert.doesNotMatch(layout, /MetricsBeacon/);
  const site = read('components/site.tsx');
  assert.match(site, /import \{ DeferredMetrics \} from '\.\/DeferredMetrics\.tsx';/);
  assert.match(site, /<DeferredMetrics \/>\n {4}<\/footer>/, 'rendered once, inside SiteFooter');
  for (const file of walk(SRC)) {
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/^import (type )?\{[^}]*\} from '[^']*MetricsBeacon(?:\.tsx)?';$/gm)) {
      assert.equal(m[1], 'type ', `${file}: only a type-only import of MetricsBeacon is allowed (the code loads after the page load)`);
    }
  }
});

test('DeferredMetrics sends nothing itself and loads MetricsBeacon only after the load event, when the browser is idle', () => {
  const loader = read('components/DeferredMetrics.tsx');
  assert.doesNotMatch(loader, /sendBeacon|fetch\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|document\.cookie|https?:\/\//);
  assert.match(loader, /^import type \{ EarlyMetrics \} from '\.\/MetricsBeacon\.tsx';$/m);
  assert.equal((loader.match(/import\('\.\/MetricsBeacon\.tsx'\)/g) ?? []).length, 1, 'one dynamic import');
  assert.match(loader, /if \(document\.readyState === 'complete'\) afterLoad\(\);\n\s+else window\.addEventListener\('load', afterLoad, \{ once: true \}\);/);
  assert.match(loader, /idle = idleApi \? window\.requestIdleCallback\(loadBeacon, \{ timeout: 3000 \}\) : window\.setTimeout\(loadBeacon, 200\);/);
  // the dynamic import sits only inside loadBeacon, which only afterLoad schedules
  const loadBeacon = loader.slice(loader.indexOf('const loadBeacon'), loader.indexOf('const afterLoad'));
  assert.match(loadBeacon, /import\('\.\/MetricsBeacon\.tsx'\)/);
});

test('MetricsBeacon takes over in one synchronous step: stop recording, listen, then send what was recorded', () => {
  const beacon = read('components/MetricsBeacon.tsx');
  const takeOver = beacon.slice(beacon.indexOf('    handover();'));
  const order = ['    handover();', "document.addEventListener('click', onClick, { capture: true });", "window.addEventListener('otonom:metric', onSim);", 'for (const x of early.events.splice(0))'].map((s) => takeOver.indexOf(s));
  assert.ok(order.every((i) => i >= 0) && order.every((i, k) => k === 0 || i > order[k - 1]), `order ${order}`);
  // recorded events keep the page they happened on, and only allow-listed simulator events are sent
  assert.match(beacon, /if \(x\.kind === 'click'\) sendClick\(x\.target, x\.path\);\n\s+else if \(typeof x\.e === 'string' && SIM_EVENTS\.has\(x\.e\)\) send\(x\.e, x\.path\);/);
  assert.match(beacon, /for \(const page of early\.pages\.splice\(0\)\) send\('page_view', page\);/);
});

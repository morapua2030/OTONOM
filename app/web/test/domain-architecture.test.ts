// Architecture guards for the framework-independent domain package. They run with the web unit tests because CI does
// not run the domain tests (those need PostgreSQL). Audit 2026-11-18 (X1) found an import cycle orders.ts <-> commerce.ts.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const domainSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'domain', 'src');
const sources = new Map(readdirSync(domainSrc).filter((name) => name.endsWith('.ts')).map((name) => [name, readFileSync(path.join(domainSrc, name), 'utf8')]));

/** Runtime imports between domain modules (`import type` is erased at runtime, so it cannot form a load cycle). */
function runtimeImports(text: string): string[] {
  return [...text.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+'\.\/([\w-]+\.ts)'/gm)].map((match) => match[1]);
}

test('the domain package has no import cycles', () => {
  const graph = new Map([...sources].map(([name, text]) => [name, runtimeImports(text)]));
  const state = new Map<string, 'visiting' | 'done'>();
  const cycles: string[] = [];
  const visit = (name: string, trail: string[]) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'visiting') {
      cycles.push([...trail.slice(trail.indexOf(name)), name].join(' -> '));
      return;
    }
    state.set(name, 'visiting');
    for (const next of graph.get(name) ?? []) visit(next, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of graph.keys()) visit(name, []);
  assert.deepEqual(cycles, []);
});

test('the domain package imports nothing from the web app', () => {
  const offenders = [...sources]
    .filter(([, text]) => /\bfrom\s+'(?:@\/|\.\.\/\.\.\/web\/|@otonom\/web)/.test(text) || /\bimport\(\s*'(?:@\/|\.\.\/\.\.\/web\/)/.test(text))
    .map(([name]) => name);
  assert.deepEqual(offenders, []);
});

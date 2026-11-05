import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { isolateRuns } from '../src/components/bidi.tsx';
import { formatPackageAmount, formatPackagePrice } from '../src/lib/smart-home-packages.ts';
import { formatNumber } from '../src/lib/format.ts';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

test('Bidi keeps the spaces outside the isolate and wraps the sentence in one inline element', () => {
  const runs = isolateRuns('كنترولر 16R الذكي');
  assert.deepEqual(runs, [{ ltr: false, s: 'كنترولر ' }, { ltr: true, s: '16R' }, { ltr: false, s: ' الذكي' }]);
  assert.deepEqual(isolateRuns('16 قناة تحكم'), [{ ltr: true, s: '16' }, { ltr: false, s: ' قناة تحكم' }]);
  const source = readFileSync(path.join(SRC, 'components/bidi.tsx'), 'utf8');
  const bidi = source.slice(source.indexOf('export function Bidi('), source.indexOf('const LRI'));
  // A single wrapper means a flex parent (pill, button) sees one item, so the spaces next to the <bdi> are kept.
  assert.match(bidi, /<span className="bidi-text">\s*\{isolateRuns\(text\)\.map/);
});

test('Arabic copy never glues an Arabic letter to a Latin/number run without a space', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) { if (!['migrations', 'fonts'].includes(name)) walk(full); } else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  };
  walk(SRC);
  const TOUCH = /[ء-ؿف-ي][A-Za-z0-9]|[A-Za-z0-9][ء-ؿف-ي]/g;
  const found: string[] = [];
  for (const file of files) {
    readFileSync(file, 'utf8').split('\n').forEach((raw, index) => {
      const line = raw.replace(/\\[nrt]/g, ' '); // escape sequences such as "\n" are not letters
      for (const match of line.matchAll(TOUCH)) {
        // Allowed: a one-letter Arabic prefix (و ب ل ف ك) attached to the following word, as Arabic orthography requires.
        if (/[ء-ي]/.test(match[0][0]) && /(^|[\s"'`(«{>])[وبلفك]$/.test(line.slice(0, (match.index ?? 0) + 1))) continue;
        found.push(`${path.relative(SRC, file)}:${index + 1}: ${line.slice(Math.max(0, (match.index ?? 0) - 16), (match.index ?? 0) + 18).trim()}`);
      }
    });
  }
  assert.deepEqual(found, []);
});

test('Arabic pages use Latin digits for prices and figures (design v2)', () => {
  const ARABIC_INDIC = /[٠-٩۰-۹]/;
  for (const value of [formatPackagePrice(44_000, 'ar'), formatPackageAmount(44_000), formatNumber(1234, 'ar')]) assert.doesNotMatch(value, ARABIC_INDIC, value);
  assert.equal(formatPackageAmount(44_000), '44,000');
});

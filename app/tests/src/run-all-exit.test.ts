// Release-gate self-test for run-all.sh's exit code (D8-C v5). It sources the SAME run-all-lib.sh that run-all.sh
// uses (step, the test-only failure hook and run_all_verdict) in a throw-away results folder, so it proves the real
// decision logic without building or starting anything. run-all.sh runs this file as its "run-all-selftest" step.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'run-all-lib.sh');
const bashPath = (p: string) => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => `/${d.toLowerCase()}`);
const BASH = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

/** Suites block shaped like run-all's summary.json. */
const suites = (over: Record<string, unknown> = {}) => ({
  domain: { tests: 3, pass: 3, fail: 0 },
  visual: { tests: 5, pass: 5, fail: 0, exit: 0, at: '2026-11-04T00:00:00.000Z' },
  ...over,
});
const total = (s: Record<string, any>) => Object.values(s).reduce((a: any, x: any) => ({ tests: a.tests + (x.tests || 0), pass: a.pass + (x.pass || 0), fail: a.fail + (x.fail || 0) }), { tests: 0, pass: 0, fail: 0 });

/** Runs `steps` (bash lines using step/inject_selftest_failure) then run_all_verdict, exactly as run-all.sh ends. */
function run(steps: string, summary: Record<string, unknown> | null, env: Record<string, string> = {}) {
  const out = mkdtempSync(path.join(tmpdir(), 'otonom-run-all-selftest-'));
  try {
    if (summary) writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary));
    const script = `set -u\nOUT='${bashPath(out)}'\n. '${bashPath(LIB)}'\n: > "$OUT/steps.tsv"\n${steps}\nrun_all_verdict\nexit $?\n`;
    const childEnv = { ...process.env, ...env };
    if (!('OTONOM_RUN_ALL_SELFTEST_INJECT_FAILURE' in env)) delete childEnv.OTONOM_RUN_ALL_SELFTEST_INJECT_FAILURE;
    const r = spawnSync(BASH, ['-c', script], { encoding: 'utf8', env: childEnv });
    const tsv = readFileSync(path.join(out, 'steps.tsv'), 'utf8');
    return { code: r.status, stdout: r.stdout, tsv };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

const passSummary = () => { const s = suites(); return { steps: [], suites: s, total: total(s) }; };

test('all steps pass and the summary has no failure → exit 0', () => {
  const r = run('step alpha true\nstep beta sh -c "exit 0"', passSummary());
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /RUN-ALL PASSED/);
  assert.equal(r.tsv.trim().split('\n').map((l) => l.split('\t').slice(0, 2).join(':')).join(','), 'alpha:0,beta:0', 'steps.tsv keeps its name<TAB>exit<TAB>seconds rows');
});

test('one fake failing step → non-zero exit and the step is named', () => {
  const r = run('step alpha true\nstep fake-failing-step sh -c "exit 7"\nstep gamma true', passSummary());
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAILED STEP: fake-failing-step \(exit 7\)/);
  assert.match(r.tsv, /^gamma\t0\t/m, 'later steps still run after a failure');
});

test('the test-only hook adds one failing step without skipping the real ones → non-zero exit', () => {
  const r = run('step real-one true\nstep real-two true\ninject_selftest_failure', passSummary(), { OTONOM_RUN_ALL_SELFTEST_INJECT_FAILURE: '1' });
  assert.equal(r.code, 1, r.stdout);
  assert.deepEqual(r.tsv.trim().split('\n').map((l) => l.split('\t')[0]), ['real-one', 'real-two', 'selftest-injected-failure']);
  assert.match(r.stdout, /FAILED STEP: selftest-injected-failure \(exit 1\)/);
});

test('without the hook variable, inject_selftest_failure adds nothing', () => {
  const r = run('step real-one true\ninject_selftest_failure', passSummary());
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.tsv.trim().split('\n').length, 1);
});

test('every step exits 0 but the summary counts a failure → non-zero exit', () => {
  const s = suites({ visual: { tests: 5, pass: 4, fail: 1, exit: 0, at: 'x' } });
  const r = run('step alpha true', { steps: [], suites: s, total: total(s) });
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /summary total\.fail = 1/);
});

test('a suite with NO FRESH RESULT → non-zero exit even if its fail count were 0', () => {
  const s = suites({ e2e: { tests: 0, pass: 0, fail: 0, exit: 0, error: 'NO FRESH RESULT (suite crashed or did not run)' } });
  const r = run('step alpha true', { steps: [], suites: s, total: total(s) });
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAILED SUITE: e2e \(NO FRESH RESULT/);
});

test('a missing summary.json or an empty steps.tsv → non-zero exit', () => {
  assert.equal(run('step alpha true', null).code, 1);
  assert.equal(run('', passSummary()).code, 1);
});

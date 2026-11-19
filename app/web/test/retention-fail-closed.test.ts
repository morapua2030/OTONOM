// Audit 2026-11-18, AI3-02: the daily lead retention job must fail closed. When the owner's retention setting cannot
// be read (or is not a valid period) it deletes NOTHING, records the reason in domain.job_runs.result and logs an error.
// The old code fell back to 12 months and deleted leads. No database: the domain pool is a recording fake.
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { PayloadRequest } from 'payload';
import { runDailyJobs } from '../src/endpoints/final-release.ts';

type Query = { sql: string; params: unknown[] };
const g = globalThis as unknown as { __otonomDomainPool?: unknown };
const THURSDAY = new Date('2026-11-19T07:00:00Z'); // not a Sunday in Cairo, so no weekly summary
const realError = console.error;

/** A domain pool that records every query. `claimed` decides whether the INSERT ... ON CONFLICT DO NOTHING wins. */
function fakeDomainPool(claimed = true) {
  const queries: Query[] = [];
  const pool = {
    queries,
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      const insert = /INSERT INTO domain\.job_runs/.test(sql);
      return { rowCount: insert && !claimed ? 0 : 1, rows: insert && !claimed ? [] : [{ job: params[0] }] };
    },
  };
  g.__otonomDomainPool = pool;
  return pool;
}

/** Two leads are older than any cutoff; the digest query finds nothing. */
function fakeRequest(findGlobal: () => Promise<unknown>) {
  const deleted: unknown[] = [];
  const req = {
    headers: new Headers(),
    payload: {
      findGlobal,
      find: async (args: { where?: Record<string, unknown> }) => ({ docs: args.where && 'lastActivityAt' in args.where ? [{ id: 'old-1' }, { id: 'old-2' }] : [] }),
      delete: async (args: { id: unknown }) => {
        deleted.push(args.id);
        return {};
      },
    },
  } as unknown as PayloadRequest;
  return { req, deleted };
}

function captureErrors() {
  const lines: string[] = [];
  console.error = (...args: unknown[]) => void lines.push(args.map(String).join(' '));
  return lines;
}

const retentionInsert = (pool: { queries: Query[] }) => pool.queries.find((q) => /INSERT INTO domain\.job_runs/.test(q.sql) && q.params[0] === 'lead_retention');

afterEach(() => {
  console.error = realError;
  delete g.__otonomDomainPool;
});

test('settings cannot be read: nothing is deleted, the reason is stored in job_runs.result and logged', async () => {
  const pool = fakeDomainPool();
  const { req, deleted } = fakeRequest(async () => {
    throw new Error('connection terminated unexpectedly');
  });
  const errors = captureErrors();
  const out = await runDailyJobs(req, THURSDAY);
  assert.deepEqual(deleted, [], 'no lead may be deleted without the owner setting');
  assert.deepEqual(out.retention, { deleted: 0, skipped: 'SETTINGS_UNREADABLE' });
  const insert = retentionInsert(pool);
  assert.ok(insert, 'the run is recorded');
  assert.match(insert.sql, /INSERT INTO domain\.job_runs\(job, run_key, result\)/, 'the reason is written with the claim (the domain role cannot UPDATE job_runs)');
  assert.deepEqual(JSON.parse(String(insert.params[2])), { deleted: 0, skipped: 'SETTINGS_UNREADABLE' });
  assert.ok(errors.some((e) => /lead_retention skipped, nothing deleted: SETTINGS_UNREADABLE \(connection terminated unexpectedly\)/.test(e)), errors.join('\n'));
});

test('settings without a valid period: nothing is deleted (no 12-month default)', async () => {
  for (const intake of [null, {}, { retentionMonths: null }, { retentionMonths: 0 }, { retentionMonths: 37 }, { retentionMonths: 1.5 }, { retentionMonths: '24' }]) {
    const pool = fakeDomainPool();
    const { req, deleted } = fakeRequest(async () => intake);
    const errors = captureErrors();
    const out = await runDailyJobs(req, THURSDAY);
    assert.deepEqual(deleted, [], JSON.stringify(intake));
    assert.deepEqual(out.retention, { deleted: 0, skipped: 'SETTINGS_INVALID' }, JSON.stringify(intake));
    assert.deepEqual(JSON.parse(String(retentionInsert(pool)?.params[2])), { deleted: 0, skipped: 'SETTINGS_INVALID' });
    assert.ok(errors.some((e) => /SETTINGS_INVALID/.test(e)));
    console.error = realError;
  }
});

test('a skipped run that already ran today reports ALREADY_RAN', async () => {
  fakeDomainPool(false);
  const { req, deleted } = fakeRequest(async () => {
    throw new Error('down');
  });
  captureErrors();
  const out = await runDailyJobs(req, THURSDAY);
  assert.deepEqual(deleted, []);
  assert.deepEqual(out.retention, { skipped: 'ALREADY_RAN' });
});

test('a valid setting still deletes leads older than the owner period', async () => {
  fakeDomainPool();
  const { req, deleted } = fakeRequest(async () => ({ retentionMonths: 24 }));
  const out = (await runDailyJobs(req, THURSDAY)) as { retention: { deleted: number; cutoff: string } };
  assert.deepEqual(deleted, ['old-1', 'old-2']);
  assert.equal(out.retention.deleted, 2);
  assert.equal(out.retention.cutoff, '2024-11-19T07:00:00.000Z', '24 months before the run');
});

// Production pool regression (2026-11-15 incident). Runs against a server started with the PRODUCTION pool setting
// (OTONOM_PG_POOL_MAX=2, see run-all.sh). Before the fix every REST/admin save deadlocked there: Payload keeps one
// connection for itself and an update reads the document lock outside its transaction. Each save below must finish
// quickly, concurrent saves must not deadlock, nothing may stay "idle in transaction", and the CMS pool must stay
// within its configured size. Synthetic data on the disposable clone only.
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, cmsPoolMax, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const PROD_POOL = process.env.OTONOM_PG_POOL_MAX ?? '';
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
const users: any[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const by = (r: string) => users.find((u) => u.role === r)!;
const last = new Map<string, number>();
const START = Math.floor(Date.now() / 30000);
async function code(k: string, s: string) { for (;;) { const t = Math.floor(Date.now() / 30000); if (t > (last.get(k) ?? START)) { last.set(k, t); return generate({ secret: s }); } await sleep(1000); } }
async function login(role: string) {
  const u = by(role);
  const c = new Client(BASE, role, true);
  await c.post('/api/users/login', { email: u.email, password: u.password });
  const v = await c.post('/api/mfa/verify', { code: await code(u.email, u.totp) });
  if (v.status !== 200) throw new Error(`login ${role} ${v.status}`);
  return c;
}
/** Resolves with the response, or { status: 0 } after `ms` (a hang is a failure, never a wait). */
async function within<T extends { status: number }>(p: Promise<T>, ms: number): Promise<{ status: number; ms: number; r?: T }> {
  const t = Date.now();
  const r = await Promise.race([p, sleep(ms).then(() => null)]);
  return { status: r ? r.status : 0, ms: Date.now() - t, r: r ?? undefined };
}
let peak = 0;
const sampleConnections = async () => {
  const n = Number((await su.query(`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND usename = 'otonom_cms'`)).rows[0].count);
  peak = Math.max(peak, n);
  return n;
};
const stuckTransactions = async () => Number((await su.query(`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND state LIKE 'idle in transaction%' AND now() - state_change > interval '3 seconds'`)).rows[0].count);
function png(w = 32, h = 24): Buffer {
  const ch = (t: string, d: Buffer) => { const tb = Buffer.from(t); const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([tb, d])) >>> 0); return Buffer.concat([l, tb, d, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 90)]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), ch('IEND', Buffer.alloc(0))]);
}

async function main() {
  rec.add('P-POOL-PRODUCTION-SETTING', 'POOL', 'the server runs with the Production pool setting (OTONOM_PG_POOL_MAX=2); the CMS pool is sized for Payload\'s kept connection + concurrent saves', PROD_POOL === '2' && cmsPoolMax({ OTONOM_PG_POOL_MAX: '2' } as any) === 5, { PROD_POOL, cmsPoolMax: cmsPoolMax({ OTONOM_PG_POOL_MAX: '2' } as any) });
  const owner = await login('OWNER');
  const editor = await login('EDITOR');
  const sampler = setInterval(() => void sampleConnections().catch(() => undefined), 200);

  // a booking request to work on (the switches on, as in Production)
  await owner.post('/api/globals/privacy-policy', { approved: true });
  await owner.post('/api/globals/intake-settings', { enabled: true, retentionMonths: 12 });
  const anon = new Client(BASE, 'anon', true);
  const leadIds: number[] = [];
  const t = (await anon.get('/ar/contact')).text.match(/\d{13}\.[A-Za-z0-9_-]{43}/)?.[0] ?? '';
  await sleep(3300);
  for (let i = 0; i < 3; i++) {
    const b = await anon.post('/api/booking', { name: `Pool Lead ${i}`, phone: `010${String(77_000_000 + i).padStart(8, '0')}`, package: 'plus', message: '', plan: '', consent: true, website: '', t, idempotencyKey: randomUUID().replace(/-/g, ''), source: 'contact', locale: 'ar' }, { 'x-forwarded-for': `10.77.0.${i}` });
    leadIds.push((await su.query(`SELECT id FROM cms.leads WHERE ref=$1`, [b.json?.ref])).rows[0]?.id);
  }

  // 1) the exact incident: an admin save of a booking request (status + note), as the edit view sends it
  const t1 = new Date();
  const save = await within(owner.req('PATCH', `/api/leads/${leadIds[0]}?depth=0&locale=ar`, { json: { status: 'NOT_INTERESTED', notes: [{ text: 'TEST — scenario check, ignore' }] } }), 15_000);
  const row = (await su.query(`SELECT status, (SELECT count(*)::int FROM cms.leads_notes n WHERE n._parent_id = l.id) AS notes FROM cms.leads l WHERE id=$1`, [leadIds[0]])).rows[0];
  const audits = Number((await su.query(`SELECT count(*) FROM domain.audit_events WHERE entity_id=$1 AND action IN ('lead.status','lead.note') AND at >= $2`, [String(leadIds[0]), t1])).rows[0].count);
  rec.add('P-LEAD-SAVE', 'POOL', 'an admin save of a booking request (status + note) finishes at once, is stored and audited', save.status === 200 && save.ms < 5000 && row?.status === 'NOT_INTERESTED' && row?.notes === 1 && audits === 2, { status: save.status, ms: save.ms, row, audits });

  // 2) media: upload (create) and approve (update)
  const f = new FormData();
  f.append('file', new Blob([new Uint8Array(png())], { type: 'image/png' }), `pool-${randomBytes(3).toString('hex')}.png`);
  const up = await within(owner.req('POST', '/api/media', { body: f }), 15_000);
  const mid = up.r?.json?.doc?.id;
  await owner.patch(`/api/media/${mid}?locale=ar`, { alt: 'صورة اختبار' });
  await owner.patch(`/api/media/${mid}?locale=en`, { alt: 'Test image' });
  const approve = await within(owner.patch(`/api/media/${mid}`, { status: 'APPROVED' }), 15_000);
  rec.add('P-MEDIA-UPLOAD-APPROVE', 'POOL', 'uploading an image and approving it both finish at once', up.status === 201 && approve.status === 200 && up.ms < 5000 && approve.ms < 5000, { upload: up.status, uploadMs: up.ms, approve: approve.status, approveMs: approve.ms });

  // 3) site content publish, a global save, a user update, a consent update (every update path with hooks)
  const pkg = (await owner.get('/api/catalog-packages?where[packageId][equals]=plus&draft=true&depth=0')).json?.docs?.[0];
  const publish = await within(owner.req('PATCH', `/api/catalog-packages/${pkg.id}`, { json: { priceEgp: pkg.priceEgp, _status: 'published' } }), 15_000);
  const glob = await within(owner.post('/api/globals/announcement', { enabled: false, _status: 'published' }), 15_000);
  const ed = by('EDITOR');
  const user = await within(owner.patch(`/api/users/${ed.id}`, { canPublishContent: false }), 15_000);
  const consent = await owner.post('/api/consents', { subject: 'Pool consent', status: 'VALID', scope: ['PHOTOS'], evidenceRef: 'SYNTHETIC' });
  const consentUpd = await within(owner.patch(`/api/consents/${consent.json?.doc?.id}`, { subject: 'Pool consent edited' }), 15_000);
  const draft = await within(editor.req('PATCH', `/api/catalog-packages/${pkg.id}?draft=true`, { json: { badgeEn: pkg.badgeEn ?? '', _status: 'draft' } }), 15_000);
  const slow = [publish, glob, user, consentUpd, draft].filter((x) => x.status !== 200 || x.ms >= 5000);
  rec.add('P-UPDATES-WITH-HOOKS', 'POOL', 'publishing site content, saving a global, updating a user, a consent and an editor draft all finish at once', slow.length === 0, { publish: [publish.status, publish.ms], global: [glob.status, glob.ms], user: [user.status, user.ms], consent: [consentUpd.status, consentUpd.ms], draft: [draft.status, draft.ms] });

  // 4) concurrent saves + reads (what several staff, or one edit view, send at once)
  const burst = await Promise.all([
    within(owner.req('PATCH', `/api/leads/${leadIds[1]}?depth=0&locale=ar`, { json: { status: 'CONTACTED' } }), 20_000),
    within(owner.req('PATCH', `/api/leads/${leadIds[2]}?depth=0&locale=ar`, { json: { notes: [{ text: 'Pool burst note' }] } }), 20_000),
    within(owner.req('PATCH', `/api/catalog-packages/${pkg.id}?draft=true`, { json: { badgeAr: pkg.badgeAr ?? '', _status: 'draft' } }), 20_000),
    within(owner.patch(`/api/media/${mid}?locale=en`, { alt: 'Test image 2' }), 20_000),
    within(editor.req('PATCH', `/api/catalog-packages/${pkg.id}?draft=true`, { json: { badgeEn: pkg.badgeEn ?? '', _status: 'draft' } }), 20_000),
    within(owner.patch(`/api/consents/${consent.json?.doc?.id}`, { subject: 'Pool consent burst' }), 20_000),
    within(owner.get('/api/users/me'), 20_000),
    within(owner.get('/api/leads?limit=10&depth=1'), 20_000),
    within(owner.get(`/admin/collections/leads/${leadIds[0]}`), 20_000),
    within(editor.get('/api/catalog-packages?limit=3&depth=1'), 20_000),
  ]);
  rec.add('P-CONCURRENT-SAVES', 'POOL', '6 saves and 4 reads at the same moment all finish (no deadlock, no 5xx) within 15 s', burst.every((x) => x.status > 0 && x.status < 500 && x.ms < 15_000), burst.map((x) => [x.status, x.ms]));
  // more simultaneous saves than the pool has connections: they must queue, never deadlock
  const many = await Promise.all(Array.from({ length: 12 }, (_, i) => within(owner.req('PATCH', `/api/leads/${leadIds[i % 3]}?depth=0&locale=ar`, { json: { notes: [{ text: `Pool queue note ${i}` }] } }), 30_000)));
  rec.add('P-MORE-SAVES-THAN-CONNECTIONS', 'POOL', '12 saves at once (more than the pool size) all succeed by queueing, none fails or hangs', many.every((x) => x.status === 200 && x.ms < 25_000), many.map((x) => [x.status, x.ms]));

  // 5) afterwards: the server answers at once, nothing is left inside a transaction, the pool stayed in its size
  await sleep(1000);
  const me = await within(owner.get('/api/users/me'), 5000);
  const stuck = await stuckTransactions();
  clearInterval(sampler);
  await sampleConnections();
  rec.add('P-NO-STUCK-TRANSACTION', 'POOL', 'after all saves: /api/users/me answers at once and no connection is left "idle in transaction"', me.status === 200 && me.ms < 2000 && stuck === 0, { me: me.status, ms: me.ms, stuck });
  rec.add('P-POOL-BOUNDED', 'POOL', 'the CMS connections never exceeded the configured pool size (5 with the Production setting)', peak > 0 && peak <= 5, { peak });

  await owner.post('/api/globals/intake-settings', { enabled: false, retentionMonths: 12 });
  await owner.post('/api/globals/privacy-policy', { approved: false });
  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'pool-production-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});

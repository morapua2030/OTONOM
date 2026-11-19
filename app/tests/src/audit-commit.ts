// Audit 2026-11-18, X-04 / AI7-01: an admin change and its audit row stand or fall together. For leads, packages,
// controllers, media and users, a save is made to fail AFTER all its hooks ran (test-harness header
// x-otonom-test-fail-after-change, so the save's transaction rolls back): no audit row of it may stay behind. The same
// save without the header must leave exactly one audit row. Runs against the harness build; synthetic data only.
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const FAIL = { 'x-otonom-test-fail-after-change': '1' };
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
function png(w: number, h: number): Buffer {
  const ch = (t: string, d: Buffer) => { const tb = Buffer.from(t); const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([tb, d])) >>> 0); return Buffer.concat([l, tb, d, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 77)]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), ch('IEND', Buffer.alloc(0))]);
}
/** Audit rows for one entity (optionally one action prefix) written since `since`. */
const audits = async (entityType: string, entityId: string | number, actionPrefix: string, since: Date) =>
  Number((await su.query(`SELECT count(*) FROM domain.audit_events WHERE entity_type=$1 AND entity_id=$2 AND action LIKE $3 AND at >= $4`, [entityType, String(entityId), `${actionPrefix}%`, since])).rows[0].count);

async function main() {
  const owner = await login('OWNER');

  // ---------------- leads: a status change ----------------
  await owner.post('/api/globals/privacy-policy', { approved: true });
  await owner.post('/api/globals/intake-settings', { enabled: true, retentionMonths: 12 });
  const anon = new Client(BASE, 'anon', true);
  const t = (await anon.get('/ar/contact')).text.match(/\d{13}\.[A-Za-z0-9_-]{43}/)?.[0] ?? '';
  await sleep(3300);
  const booked = await anon.post('/api/booking', { name: 'Audit Commit Lead', phone: '01099887766', package: 'plus', message: '', plan: '', consent: true, website: '', t, idempotencyKey: randomBytes(16).toString('hex'), source: 'contact', locale: 'ar' }, { 'x-forwarded-for': `10.9.${randomBytes(1)[0]}.${randomBytes(1)[0]}` });
  const leadId = (await su.query(`SELECT id FROM cms.leads WHERE ref=$1`, [booked.json?.ref])).rows[0]?.id;
  let since = new Date();
  const leadFail = await owner.req('PATCH', `/api/leads/${leadId}?depth=0`, { json: { status: 'CONTACTED' }, headers: FAIL });
  const leadAfterFail = (await su.query(`SELECT status FROM cms.leads WHERE id=$1`, [leadId])).rows[0]?.status;
  const leadFailAudits = await audits('lead', leadId, 'lead.', since);
  const leadOk = await owner.req('PATCH', `/api/leads/${leadId}?depth=0`, { json: { status: 'CONTACTED' } });
  const leadOkAudits = await audits('lead', leadId, 'lead.status', since);
  rec.add('A-LEAD', 'AUDIT', 'lead status change: a failed save leaves the lead and the audit trail untouched; a successful one leaves exactly one audit row', booked.status === 201 && leadFail.status >= 500 && leadAfterFail === 'NEW' && leadFailAudits === 0 && leadOk.status === 200 && leadOkAudits === 1, { booked: booked.status, fail: leadFail.status, statusAfterFail: leadAfterFail, failAudits: leadFailAudits, ok: leadOk.status, okAudits: leadOkAudits });

  // ---------------- packages and controllers: a review-state change ----------------
  for (const [slug, entityType, id] of [['catalog-packages', 'catalog_package', 'A-PACKAGE'], ['catalog-controllers', 'catalog_controller', 'A-CONTROLLER']] as const) {
    const doc = (await owner.get(`/api/${slug}?limit=1&depth=0&draft=true`)).json?.docs?.[0];
    since = new Date();
    const before = (await owner.get(`/api/${slug}/${doc?.id}?depth=0&draft=true`)).json?.reviewState;
    const fail = await owner.req('PATCH', `/api/${slug}/${doc?.id}?depth=0&draft=true`, { json: { reviewState: 'IN_REVIEW' }, headers: FAIL });
    const after = (await owner.get(`/api/${slug}/${doc?.id}?depth=0&draft=true`)).json?.reviewState;
    const failAudits = await audits(entityType, doc?.id, 'site_content.', since);
    const ok = await owner.req('PATCH', `/api/${slug}/${doc?.id}?depth=0&draft=true`, { json: { reviewState: 'IN_REVIEW' } });
    const okAudits = await audits(entityType, doc?.id, 'site_content.', since);
    rec.add(id, 'AUDIT', `${slug}: a failed save changes nothing and leaves no audit row; a successful one leaves exactly one`, !!doc && before !== 'IN_REVIEW' && fail.status >= 500 && after === before && failAudits === 0 && ok.status === 200 && okAudits === 1, { id: doc?.id, before, fail: fail.status, after, failAudits, ok: ok.status, okAudits });
  }

  // ---------------- media: an upload (local disk in the harness) ----------------
  const upload = (name: string, headers: Record<string, string> = {}) => {
    const f = new FormData();
    f.append('file', new Blob([new Uint8Array(png(30, 20))], { type: 'image/png' }), name);
    return owner.req('POST', '/api/media', { body: f, headers });
  };
  since = new Date();
  const failName = `audit-fail-${randomBytes(3).toString('hex')}.png`;
  const mediaFail = await upload(failName, FAIL);
  const failRows = Number((await su.query(`SELECT count(*) FROM cms.media WHERE filename LIKE $1`, [`${failName.replace('.png', '')}%`])).rows[0].count);
  const failMediaAudits = Number((await su.query(`SELECT count(*) FROM domain.audit_events WHERE entity_type='media' AND action LIKE 'media.%' AND at >= $1`, [since])).rows[0].count);
  const mediaOk = await upload(`audit-ok-${randomBytes(3).toString('hex')}.png`);
  const okMediaAudits = await audits('media', mediaOk.json?.doc?.id, 'media.', since);
  rec.add('A-MEDIA', 'AUDIT', 'media upload: a failed save leaves no record and no audit row; a successful one leaves exactly one', mediaFail.status >= 500 && failRows === 0 && failMediaAudits === 0 && mediaOk.status === 201 && okMediaAudits === 1, { fail: mediaFail.status, failRows, failMediaAudits, ok: mediaOk.status, okMediaAudits });

  // ---------------- users: a role change ----------------
  const email = `audit-commit-${randomBytes(3).toString('hex')}@otonom.local`;
  const created = await owner.post('/api/users', { email, password: `Audit-Commit-${randomBytes(9).toString('base64url')}aA1!`, role: 'EDITOR' });
  const userId = created.json?.doc?.id;
  since = new Date();
  const roleFail = await owner.req('PATCH', `/api/users/${userId}?depth=0`, { json: { role: 'STORE' }, headers: FAIL });
  const roleAfterFail = (await su.query(`SELECT role FROM cms.users WHERE id=$1`, [userId])).rows[0]?.role;
  const roleFailAudits = await audits('user', userId, 'user.role_change', since);
  const roleOk = await owner.req('PATCH', `/api/users/${userId}?depth=0`, { json: { role: 'STORE' } });
  const roleOkAudits = await audits('user', userId, 'user.role_change', since);
  rec.add('A-USER', 'AUDIT', 'user role change: a failed save keeps the role and leaves no audit row; a successful one leaves exactly one', created.status === 201 && roleFail.status >= 500 && roleAfterFail === 'EDITOR' && roleFailAudits === 0 && roleOk.status === 200 && roleOkAudits === 1, { created: created.status, fail: roleFail.status, roleAfterFail, failAudits: roleFailAudits, ok: roleOk.status, okAudits: roleOkAudits });

  // ---------------- the writer: actor type and one correlation id per request ----------------
  const row = (await su.query(`SELECT actor_type, actor_id, correlation_id FROM domain.audit_events WHERE entity_type='user' AND entity_id=$1 AND action='user.role_change' ORDER BY at DESC LIMIT 1`, [String(userId)])).rows[0];
  const ownerId = String(by('OWNER').id);
  rec.add('A-WRITER', 'AUDIT', 'the audit row names the signed-in actor as a user and carries a correlation id', row?.actor_type === 'user' && row?.actor_id === ownerId && typeof row?.correlation_id === 'string' && row.correlation_id.length > 0, row);

  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'audit-commit-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  await su.end();
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

// Generated-surface probe (Payload REST + GraphQL + custom endpoints) for every identity, against the running local build.
// Asserts "no effect" by checking the database after each attempt, not only the HTTP status.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { collectionSlugs } from '../../web/src/collections/index.ts';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const START = Math.floor(Date.now() / 30000);
const count = async (sql: string) => Number((await su.query(sql)).rows[0].n);

async function staff(role: string): Promise<Client> {
  const u = users.find((x) => x.role === role)!;
  const c = new Client(BASE, role, true);
  if ((await c.post('/api/users/login', { email: u.email, password: u.password })).status !== 200) throw new Error(`login ${role}`);
  while (Math.floor(Date.now() / 30000) <= START) await sleep(1000);
  const v = await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) });
  if (v.status !== 200) throw new Error(`mfa ${role} ${v.status}`);
  return c;
}

const denied = (st: number) => st === 401 || st === 403;
const PUBLIC_COLLECTIONS = new Set(['pages', 'case-studies', 'claims', 'media']);
const HIDDEN_FIELDS = /totpSecret|recoveryCodes|mfaVerifiedSids|lastTotpStep|passwordResetToken|idempotencyKey/;

async function main() {
  const ids: Record<string, Client> = { ANON: new Client(BASE, 'anon', true) };
  for (const r of ['EDITOR', 'STORE', 'ENGINEER', 'ADMIN']) ids[r] = await staff(r);
  const victimId = users.find((u) => u.role === 'OWNER')!.id;
  const rfqId = (await su.query(`SELECT id FROM cms.rfqs ORDER BY id LIMIT 1`)).rows[0]?.id;

  for (const [who, c] of Object.entries(ids)) {
    // Every configured collection is probed automatically. A newly registered collection is
    // denied to anonymous callers unless it is explicitly classified as public here.
    for (const slug of collectionSlugs) {
      const r = await c.get(`/api/${slug}?limit=1&depth=0`);
      const anonymousPrivate = denied(r.status) || (r.status === 200 && Array.isArray(r.json?.docs) && r.json.docs.length === 0);
      const expectedStatus = who === 'ANON' && !PUBLIC_COLLECTIONS.has(slug) ? anonymousPrivate : [200, 401, 403].includes(r.status);
      rec.add(
        `SURF-${who}-COLLECTION-${slug}`,
        'GENERATED-SURFACE',
        `${who}: configured collection ${slug} has an explicit safe read outcome`,
        expectedStatus && !HIDDEN_FIELDS.test(r.text),
        { status: r.status },
      );
    }
    // ---- users: self-registration, escalation, secrets ----
    const u0 = await count(`SELECT count(*)::int n FROM cms.users`);
    const owners0 = await count(`SELECT count(*)::int n FROM cms.users WHERE role='OWNER'`);
    const uc = await c.post('/api/users', { email: `x${randomBytes(3).toString('hex')}@example.com`, password: 'Synthetic-Pass-123!', role: 'OWNER' });
    const u1 = await count(`SELECT count(*)::int n FROM cms.users`);
    const owners1 = await count(`SELECT count(*)::int n FROM cms.users WHERE role='OWNER'`);
    rec.add(`SURF-${who}-USER-CREATE`, 'SURFACE', `${who}: cannot create users / owners`, denied(uc.status) && u1 === u0 && owners1 === owners0, { status: uc.status, u0, u1, owners0, owners1 });
    await c.patch(`/api/users/${victimId}`, { role: 'EDITOR', email: 'hijack@example.com' });
    const v = (await su.query(`SELECT role, email FROM cms.users WHERE id=$1`, [victimId])).rows[0];
    rec.add(`SURF-${who}-USER-HIJACK`, 'SURFACE', `${who}: cannot change the owner's role/email`, v.role === 'OWNER' && v.email !== 'hijack@example.com', v);
    const me = users.find((u) => u.role === who);
    if (me) {
      await c.patch(`/api/users/${me.id}`, { role: 'OWNER', mfaVerifiedSids: ['x'], lastTotpStep: 0 });
      const r = (await su.query(`SELECT role FROM cms.users WHERE id=$1`, [me.id])).rows[0];
      rec.add(`SURF-${who}-SELF-ESCALATE`, 'SURFACE', `${who}: cannot escalate own role`, r.role === who, r);
    }
    const list = await c.get('/api/users?limit=50&depth=0');
    rec.add(`SURF-${who}-USER-SECRETS`, 'SURFACE', `${who}: user listing never exposes TOTP/recovery/session data`, !/totpSecret|recoveryCodes|mfaVerifiedSids|lastTotpStep|"hash"|"salt"/.test(list.text), list.status);
    // ---- collections: create/update/delete where the identity has no business ----
    const before = {
      rfqs: await count(`SELECT count(*)::int n FROM cms.rfqs`),
      claimsPublishable: await count(`SELECT count(*)::int n FROM cms.claims WHERE status IN ('INDEPENDENTLY_DEMONSTRATED','CERTIFIED')`),
      consents: await count(`SELECT count(*)::int n FROM cms.consents`),
    };
    const rf = await c.post('/api/rfqs', { ref: 'RFQ-FORGED', status: 'QUALIFIED' });
    const rd = rfqId ? await c.del(`/api/rfqs/${rfqId}`) : { status: 403 };
    // roles allowed to manage consents are not exercised here (would create a real VALID consent row)
    const cf = ['ADMIN', 'OWNER'].includes(who) ? { status: 403 } : await c.post('/api/consents', { subject: 'forged', status: 'VALID' });
    const claimRow = (await su.query(`SELECT id FROM cms.claims ORDER BY id LIMIT 1`)).rows[0];
    const claimEn = (await su.query(`SELECT claim FROM cms.claims_locales WHERE _parent_id=$1 AND _locale='en'`, [claimRow.id])).rows[0]?.claim;
    // a realistic attempt: valid localized payload, so only authorisation/business rules can stop it
    await c.patch(`/api/claims/${claimRow.id}?locale=en`, { status: 'CERTIFIED', claim: 'Probe claim text' });
    const after = {
      rfqs: await count(`SELECT count(*)::int n FROM cms.rfqs`),
      claimsPublishable: await count(`SELECT count(*)::int n FROM cms.claims WHERE status IN ('INDEPENDENTLY_DEMONSTRATED','CERTIFIED')`),
      consents: await count(`SELECT count(*)::int n FROM cms.consents`),
    };
    const canConsent = ['ADMIN', 'OWNER'].includes(who);
    rec.add(`SURF-${who}-RFQ-FORGE-DELETE`, 'SURFACE', `${who}: cannot forge or delete RFQs`, denied(rf.status) && denied(rd.status) && after.rfqs === before.rfqs, { create: rf.status, del: rd.status, before, after });
    rec.add(`SURF-${who}-CLAIM-CERTIFY`, 'SURFACE', `${who}: cannot make a claim publishable (CERTIFIED) — owner + evidence only`, after.claimsPublishable === before.claimsPublishable, { before, after });
    // never leave a probe-induced publishable claim behind
    await su.query(`UPDATE cms.claims SET status='OWNER_REPORTED' WHERE id=$1 AND status IN ('INDEPENDENTLY_DEMONSTRATED','CERTIFIED')`, [claimRow.id]);
    await su.query(`UPDATE cms.claims_locales SET claim=$2 WHERE _parent_id=$1 AND _locale='en'`, [claimRow.id, claimEn]);
    rec.add(`SURF-${who}-CONSENT-FORGE`, 'SURFACE', `${who}: cannot create consent records`, canConsent || (denied(cf.status) && after.consents === before.consents), { status: cf.status, before, after });
    // ---- settings / internal collections ----
    const sg = await c.post('/api/globals/settings', { stage: 'COMMERCIAL' });
    const st = (await su.query(`SELECT stage FROM cms.settings LIMIT 1`)).rows[0]?.stage;
    rec.add(`SURF-${who}-STAGE`, 'SURFACE', `${who}: cannot switch to COMMERCIAL`, denied(sg.status) && st === 'PREVIEW', { status: sg.status, st });
    for (const p of ['/api/payload-migrations', '/api/payload-preferences', '/api/payload-locked-documents', '/api/payload-kv']) {
      const r = await c.get(p);
      const myId = users.find((u) => u.role === who)?.id;
      const foreign = (r.json?.docs ?? []).filter((d: any) => p !== '/api/payload-preferences' || Number(d.user?.value?.id ?? d.user?.value ?? d.user?.id ?? d.user) !== myId);
      rec.add(`SURF-${who}-INTERNAL-${p}`, 'SURFACE', `${who}: internal collection ${p} exposes nothing beyond own preferences`, r.status === 403 || r.status === 404 || foreign.length === 0, { status: r.status, foreign: foreign.length });
    }
    // ---- GraphQL ----
    const g = await c.req('POST', '/api/graphql', { json: { query: `mutation { updateSettings(data: { stage: COMMERCIAL }) { stage } }` } });
    const st2 = (await su.query(`SELECT stage FROM cms.settings LIMIT 1`)).rows[0]?.stage;
    rec.add(`SURF-${who}-GQL-STAGE`, 'SURFACE', `${who}: GraphQL cannot switch stage`, st2 === 'PREVIEW', { status: g.status });
    const gq = await c.req('POST', '/api/graphql', { json: { query: `{ Rfqs(limit: 5) { docs { ref submitted { email phone } } } }` } });
    const leaks = /@example\.com|\+20/.test(gq.text);
    rec.add(`SURF-${who}-GQL-RFQ-PII`, 'SURFACE', `${who}: GraphQL does not leak RFQ PII to roles without crm.read`, ['ENGINEER', 'ADMIN'].includes(who) ? true : !leaks, { status: gq.status, leaks });
    // ---- domain endpoints (role matrix) ----
    const dom: Array<[string, string, string[]]> = [
      ['/api/admin/stock/adjust', 'stock.adjust', ['ADMIN']],
      ['/api/admin/prices/00000000-0000-0000-0000-000000000000/approve', 'price.approve', []],
      ['/api/reports/kpi', 'kpi.read', ['ADMIN']],
    ];
    for (const [p, perm, allowed] of dom) {
      const r = p.includes('kpi') ? await c.get(p) : await c.post(p, { skuId: 'sku-rc04', delta: 1, reason: 'probe', idempotencyKey: randomUUID() });
      const ok = allowed.includes(who) ? r.status !== 401 && r.status !== 403 : r.status === 401 || r.status === 403;
      rec.add(`SURF-${who}-${perm}`, 'SURFACE', `${who}: ${perm} ${allowed.includes(who) ? 'allowed' : 'denied'}`, ok, r.status);
    }
  }
  // stock adjust by ADMIN above changed synthetic stock by +1: revert to keep the dev DB neutral
  const admin = ids.ADMIN;
  await admin.post('/api/admin/stock/adjust', { skuId: 'sku-rc04', delta: -1, reason: 'revert surface probe', idempotencyKey: randomUUID() });
  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'surface-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});

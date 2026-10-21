// WAVE 4 — administration and CMS hardening, verified through direct API requests (not the UI) on the running local build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const START = Math.floor(Date.now() / 30000);
const tag = randomBytes(3).toString('hex');
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const auditCount = async (action: string, entityId: string | number) => Number((await su.query(`SELECT count(*)::int n FROM domain.audit_events WHERE action=$1 AND entity_id=$2`, [action, String(entityId)])).rows[0].n);

async function staff(role: string) {
  const u = users.find((x) => x.role === role)!;
  const c = new Client(BASE, role, true);
  await c.post('/api/users/login', { email: u.email, password: u.password });
  while (Math.floor(Date.now() / 30000) <= START) await sleep(1000);
  const v = await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) });
  if (v.status !== 200) throw new Error(`mfa ${role} ${v.status}`);
  return c;
}
const upload = (c: Client, name: string, bytes: Buffer, type: string, fields: Record<string, string> = {}) => {
  const f = new FormData();
  f.append('file', new Blob([bytes], { type }), name);
  if (Object.keys(fields).length) f.append('_payload', JSON.stringify(fields));
  return c.req('POST', '/api/media', { body: f });
};

async function main() {
  const anon = new Client(BASE, 'anon', true);
  const owner = await staff('OWNER');
  const admin = await staff('ADMIN');
  const eng = await staff('ENGINEER');
  const editor = await staff('EDITOR');

  // ---------- 1. four-eyes review + derived claim status ----------
  const slug = `test-${tag}`;
  const pg1 = await admin.post('/api/pages?locale=ar&draft=true', { slug, title: 'صفحة اختبار', body: 'نص اختبار', claimStatus: 'CERTIFIED' });
  const pid = pg1.json?.doc?.id;
  await admin.patch(`/api/pages/${pid}?locale=en&draft=true`, { title: 'Test page', body: 'Test body' });
  const row0 = (await su.query(`SELECT claim_status, last_edited_by FROM cms.pages WHERE id=$1`, [pid])).rows[0];
  rec.add('CMS-CLAIMSTATUS-DERIVED', 'CMS', 'editor cannot self-declare claimStatus (derived from registry claims)', row0.claim_status === 'NONE', row0);
  rec.add('CMS-LASTEDITOR', 'CMS', 'last editor recorded by the system', row0.last_edited_by === String(users.find((u) => u.role === 'ADMIN')!.id), row0);
  await admin.patch(`/api/pages/${pid}`, { workflowStatus: 'IN_REVIEW' });
  const self = await admin.patch(`/api/pages/${pid}`, { workflowStatus: 'APPROVED' });
  rec.add('CMS-FOUR-EYES', 'CMS', 'the last editor cannot approve their own content', self.status === 409 && self.text.includes('SELF_REVIEW'), self.text.slice(0, 120));
  // the page relies on a registry claim that is not publishable
  const cl4 = (await su.query(`SELECT id FROM cms.claims WHERE code='CL-04'`)).rows[0].id;
  const noNote = await admin.patch(`/api/pages/${pid}`, { workflowStatus: 'DRAFT' });
  rec.add('CMS-REVIEW-NOTE-REQUIRED', 'CMS', 'returning content to draft without a review note is refused', noNote.status === 422 && noNote.text.includes('REVIEW_NOTE_REQUIRED'), noNote.text.slice(0, 120));
  await admin.patch(`/api/pages/${pid}`, { workflowStatus: 'DRAFT', reviewNote: 'Synthetic review: claim reference needed' });
  const nr = (await su.query(`SELECT review_note, review_note_by, workflow_status FROM cms.pages WHERE id=$1`, [pid])).rows[0];
  rec.add('CMS-REVIEW-NOTE-RECORDED', 'CMS', 'the review note and its author are recorded with the transition', nr?.workflow_status === 'DRAFT' && nr?.review_note === 'Synthetic review: claim reference needed' && nr?.review_note_by === String(users.find((u) => u.role === 'ADMIN')!.id), nr);
  const forged = await editor.patch(`/api/pages/${pid}`, { reviewNote: 'forged note', reviewNoteBy: '999' });
  const nr2 = (await su.query(`SELECT review_note, review_note_by FROM cms.pages WHERE id=$1`, [pid])).rows[0];
  rec.add('CMS-REVIEW-NOTE-SYSTEM', 'CMS', 'a review note cannot be edited or forged outside a status change', nr2?.review_note === 'Synthetic review: claim reference needed' && nr2?.review_note_by === nr?.review_note_by, { status: forged.status, nr2 });
  await editor.patch(`/api/pages/${pid}`, { claimsUsed: [cl4] });
  await editor.patch(`/api/pages/${pid}`, { workflowStatus: 'IN_REVIEW' });
  rec.add('CMS-OTHER-REVIEWER', 'CMS', 'a different reviewer can approve', (await eng.patch(`/api/pages/${pid}`, { workflowStatus: 'APPROVED' })).status === 200, null);
  const blocked = await admin.patch(`/api/pages/${pid}`, { workflowStatus: 'PUBLISHED', _status: 'published' });
  rec.add('CMS-CLAIM-GATE', 'CMS', 'publishing content that relies on an unverified claim is blocked', blocked.status === 422 && blocked.text.includes('CLAIM_NOT_PUBLISHABLE'), blocked.text.slice(0, 160));
  // a synthetic claim made publishable by the owner, then downgraded → the page is withdrawn automatically
  const tc = await eng.post('/api/claims?locale=en', { code: `TEST-${tag}`, claim: 'Synthetic test claim (not a product claim)', status: 'REVIEW_PENDING' });
  const tcid = tc.json?.doc?.id;
  try {
    await owner.patch(`/api/claims/${tcid}?locale=en`, { status: 'INDEPENDENTLY_DEMONSTRATED', evidenceRef: 'TR-SYN', evidenceNote: 'synthetic' });
    await editor.patch(`/api/pages/${pid}`, { claimsUsed: [tcid] });
    await editor.patch(`/api/pages/${pid}`, { workflowStatus: 'IN_REVIEW' });
    await eng.patch(`/api/pages/${pid}`, { workflowStatus: 'APPROVED' });
    const pub = await admin.patch(`/api/pages/${pid}`, { workflowStatus: 'PUBLISHED', _status: 'published' });
    rec.add('CMS-PUBLISH-OK', 'CMS', 'content using only publishable claims publishes after independent review', pub.status === 200, pub.status);
    await owner.patch(`/api/claims/${tcid}?locale=en`, { status: 'REVIEW_PENDING' });
    const after = (await su.query(`SELECT workflow_status, _status FROM cms.pages WHERE id=$1`, [pid])).rows[0];
    rec.add('CMS-CLAIM-DOWNGRADE-WITHDRAWS', 'CMS', 'downgrading a claim withdraws the published content relying on it', after.workflow_status === 'WITHDRAWN' && after._status === 'draft', after);
    rec.add('CMS-AUDIT-WORKFLOW', 'AUDIT', 'approval, publication and withdrawal are in the audit trail', (await auditCount('content.approved', pid)) >= 1 && (await auditCount('content.published', pid)) === 1 && (await auditCount('content.withdrawn', pid)) === 1, null);
    rec.add('CMS-AUDIT-CLAIM', 'AUDIT', 'claim status changes are audited', (await auditCount('claim.status', tcid)) >= 3, await auditCount('claim.status', tcid));
  } finally {
    await owner.patch(`/api/claims/${tcid}?locale=en`, { status: 'LEGALLY_BARRED' });
  }

  // ---------- 2. consents ----------
  const noEv = await admin.post('/api/consents', { subject: `Synthetic client ${tag}` });
  rec.add('CMS-CONSENT-EVIDENCE', 'CONSENT', 'a consent record needs the signed-consent reference', noEv.status === 400 || noEv.status === 422, noEv.status);
  const cons = await admin.post('/api/consents', { subject: `Synthetic client ${tag}`, evidenceRef: `doc:consent-${tag}`, scope: ['PHOTOS'] });
  const consId = cons.json?.doc?.id;
  rec.add('CMS-CONSENT-AUDIT', 'AUDIT', 'consent recording is audited', (await auditCount('consent.record', consId)) === 1, null);

  // ---------- 3. media ----------
  const svg = await upload(editor, 'x.svg', SVG, 'image/svg+xml');
  rec.add('MEDIA-NO-SVG', 'MEDIA', 'SVG (script-capable) uploads are refused', svg.status >= 400, svg.status);
  const vid = await upload(editor, 'clip.mp4', Buffer.from('00000018667479706d703432', 'hex'), 'video/mp4');
  rec.add('MEDIA-NO-VIDEO', 'MEDIA', 'video uploads are refused (BLOCKED pending hosting + consent decisions)', vid.status >= 400, vid.status);
  const up = await upload(editor, `site-${tag}.png`, PNG_1PX, 'image/png', { status: 'APPROVED' });
  const mid = up.json?.doc?.id;
  rec.add('MEDIA-UPLOAD-DRAFT', 'MEDIA', 'editor upload starts as DRAFT whatever the client sends', up.status === 201 && up.json.doc.status === 'DRAFT', { status: up.status, st: up.json?.doc?.status });
  const fileUrl = up.json?.doc?.url ? new URL(up.json.doc.url, BASE).pathname : '';
  const anonFile = await anon.get(fileUrl);
  const anonList = await anon.get('/api/media');
  rec.add('MEDIA-NOT-PUBLIC', 'MEDIA', 'draft media is not publicly readable (document and file)', (anonFile.status === 403 || anonFile.status === 404) && (anonList.json?.docs?.length ?? 0) === 0, { file: anonFile.status, list: anonList.json?.docs?.length });
  const edApprove = await editor.patch(`/api/media/${mid}`, { status: 'APPROVED' });
  rec.add('MEDIA-APPROVE-ROLE', 'MEDIA', 'editor cannot approve media', edApprove.status === 403, edApprove.status);
  const noAlt = await admin.patch(`/api/media/${mid}`, { status: 'APPROVED' });
  rec.add('MEDIA-ALT', 'MEDIA', 'approval needs Arabic and English alt text', noAlt.status === 422 && noAlt.text.includes('ALT_AR_MISSING') && noAlt.text.includes('ALT_EN_MISSING'), noAlt.text.slice(0, 160));
  await editor.patch(`/api/media/${mid}?locale=ar`, { alt: 'لوحة تحكم اصطناعية' });
  await editor.patch(`/api/media/${mid}?locale=en`, { alt: 'Synthetic control panel', depictsClientProperty: true });
  const noConsent = await admin.patch(`/api/media/${mid}`, { status: 'APPROVED' });
  rec.add('MEDIA-CONSENT', 'MEDIA', "a client's property photo needs a valid PHOTOS consent and privacy screening", noConsent.status === 422 && noConsent.text.includes('CONSENT_NOT_VALID') && noConsent.text.includes('MEDIA_NOT_SCREENED'), noConsent.text.slice(0, 160));
  await editor.patch(`/api/media/${mid}`, { consent: consId, privacyScreened: true });
  const ok = await admin.patch(`/api/media/${mid}`, { status: 'APPROVED' });
  const pubFile = await anon.get(fileUrl);
  rec.add('MEDIA-APPROVED-PUBLIC', 'MEDIA', 'approved media becomes publicly readable', ok.status === 200 && pubFile.status === 200, { approve: ok.status, file: pubFile.status });
  // ---------- 4. consent revocation is final and withdraws media ----------
  await admin.patch(`/api/consents/${consId}`, { status: 'REVOKED' });
  const m2 = (await su.query(`SELECT status FROM cms.media WHERE id=$1`, [mid])).rows[0];
  const reFile = await anon.get(fileUrl);
  rec.add('MEDIA-CONSENT-REVOKE', 'MEDIA', 'revoking the consent withdraws the media and hides the file', m2.status === 'WITHDRAWN' && (reFile.status === 403 || reFile.status === 404), { status: m2.status, file: reFile.status });
  await admin.patch(`/api/consents/${consId}`, { status: 'VALID' });
  const c2 = (await su.query(`SELECT status FROM cms.consents WHERE id=$1`, [consId])).rows[0];
  rec.add('CMS-CONSENT-FINAL', 'CONSENT', 'a revoked consent cannot be re-validated (new signed consent needed)', c2.status === 'REVOKED', c2);

  // ---------- 5. sessions: logout, password change, lockout ----------
  const kpiBefore = await admin.get('/api/reports/kpi');
  await admin.post('/api/users/logout', {});
  const stale = new Client(BASE, 'stale', true);
  stale.cookies = new Map(admin.cookies);
  const kpiAfter = await stale.get('/api/reports/kpi');
  rec.add('SESS-LOGOUT', 'SESSION', 'after logout the old session cannot be reused', kpiBefore.status === 200 && kpiAfter.status === 401, { before: kpiBefore.status, after: kpiAfter.status });
  const tmpEmail = `tmp-${tag}@example.com`;
  const tmpPw = `Tmp-${randomBytes(9).toString('base64url')}aA1!`;
  const tmp = await owner.post('/api/users', { email: tmpEmail, password: tmpPw, role: 'CUSTOMER' });
  const tmpId = tmp.json?.doc?.id;
  try {
    const a = new Client(BASE, 'a', true);
    const b = new Client(BASE, 'b', true);
    await a.post('/api/users/login', { email: tmpEmail, password: tmpPw });
    await b.post('/api/users/login', { email: tmpEmail, password: tmpPw });
    const meB0 = await b.get('/api/users/me');
    const ch = await a.patch(`/api/users/${tmpId}`, { password: `${tmpPw}-2` });
    const meB1 = await b.get('/api/users/me');
    rec.add('SESS-PASSWORD-CHANGE', 'SESSION', 'a password change ends the other sessions of that user', !!meB0.json?.user && ch.status === 200 && !meB1.json?.user, { before: !!meB0.json?.user, change: ch.status, after: !!meB1.json?.user });
    const l = new Client(BASE, 'l', true);
    for (let i = 0; i < 10; i++) await l.post('/api/users/login', { email: tmpEmail, password: 'wrong-password' });
    const locked = await l.post('/api/users/login', { email: tmpEmail, password: `${tmpPw}-2` });
    const lk = (await su.query('SELECT lock_until > now() AS locked, login_attempts FROM cms.users WHERE id=$1', [tmpId])).rows[0];
    rec.add('SESS-LOCKOUT', 'SESSION', 'after 10 failed attempts the account is locked (correct password refused, lock recorded)', (locked.status === 401 || locked.status === 423 || locked.status === 403) && lk?.locked === true, { status: locked.status, lk });
  } finally {
    if (tmpId) await owner.del(`/api/users/${tmpId}`);
  }

  // ---------- 6. stage flips are audited ----------
  const n0 = Number((await su.query(`SELECT count(*)::int n FROM domain.audit_events WHERE action='settings.stage'`)).rows[0].n);
  try {
    await owner.post('/api/globals/settings', { stage: 'COMMERCIAL' });
  } finally {
    await owner.post('/api/globals/settings', { stage: 'PREVIEW' });
  }
  const n1 = Number((await su.query(`SELECT count(*)::int n FROM domain.audit_events WHERE action='settings.stage'`)).rows[0].n);
  const st = (await su.query(`SELECT stage FROM cms.settings LIMIT 1`)).rows[0].stage;
  rec.add('AUDIT-STAGE', 'AUDIT', 'both stage flips audited; stage back to PREVIEW', n1 - n0 === 2 && st === 'PREVIEW', { delta: n1 - n0, st });
  const tamper = await su.query(`SET ROLE otonom_domain; UPDATE domain.audit_events SET action='x' WHERE id=(SELECT max(id) FROM domain.audit_events)`).then(() => 'updated', (e) => String(e.message));
  await su.query('RESET ROLE').catch(() => {});
  rec.add('AUDIT-APPEND-ONLY', 'AUDIT', 'the application role cannot modify audit rows', /permission denied|append-only/.test(tamper), tamper);

  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'cms-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});

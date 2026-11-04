// Final release (owner 2026-11-04) HTTP suite against the local production build on a disposable clone (run-all.sh,
// harness flags). Covers: admin-managed content (seeded = built-in values, drafts hidden, publish revalidates,
// validation, roles), booking requests (hidden until BOTH audited switches are on, consent, anti-spam, idempotency,
// rate limit, audit), lead work by SALES (statuses, append-only notes, personal fields protected), staff invitation
// (one-time link, password policy, forced MFA), privacy-first metrics (no identifiers stored), the daily job
// (CRON_SECRET, digest, retention, once per day), the privacy page gating and "no admin link in public HTML".
// Synthetic data only. Runs LAST in run-all so the content and switch changes never affect the other suites.
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const CRON = process.env.OTONOM_TEST_CRON_SECRET ?? '';
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const byRole = (r: string) => users.find((u) => u.role === r)!;
const lastStep = new Map<string, number>();
const START_STEP = Math.floor(Date.now() / 30000);
const ip = () => `10.${Array.from(randomBytes(3)).join('.')}`;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

async function code(key: string, secret: string) {
  for (;;) {
    const s = Math.floor(Date.now() / 30000);
    if (s > (lastStep.get(key) ?? START_STEP)) {
      lastStep.set(key, s);
      return generate({ secret });
    }
    await sleep(1000);
  }
}
async function login(u: U) {
  const c = new Client(BASE, u.role, true);
  const r = await c.post('/api/users/login', { email: u.email, password: u.password });
  if (r.status !== 200) throw new Error(`login ${u.role} ${r.status}`);
  const v = await c.post('/api/mfa/verify', { code: await code(u.email, u.totp) });
  if (v.status !== 200) throw new Error(`mfa ${u.role} ${v.status}`);
  return c;
}
const audit = async (action: string, since: Date) => Number((await su.query(`SELECT count(*) FROM domain.audit_events WHERE action=$1 AND at >= $2`, [action, since])).rows[0].count);
const leadCount = async () => Number((await su.query(`SELECT count(*) FROM cms.leads`)).rows[0].count);
const tokenFrom = (html: string) => html.match(/\d{13}\.[A-Za-z0-9_-]{43}/)?.[0] ?? null;
const lead = (t: string, over: Record<string, unknown> = {}) => ({
  name: 'Synthetic Lead', phone: '01012345678', package: 'plus', message: 'Synthetic test request',
  plan: '', consent: true, website: '', t, idempotencyKey: randomUUID().replace(/-/g, ''), source: 'contact', locale: 'ar', ...over,
});

async function main() {
  const t0 = new Date();
  const anon = new Client(BASE, 'anon', true);
  const owner = await login(byRole('OWNER'));
  const editor = await login(byRole('EDITOR'));
  const engineer = await login(byRole('ENGINEER'));

  // ---------------- Content: seeded values equal the built-in site; drafts hidden; publish revalidates ----------------
  const pk = await anon.get('/api/catalog-packages?limit=10');
  rec.add('F-CONTENT-SEEDED', 'CONTENT', 'the three packages are seeded and published (anonymous read of published content)', pk.status === 200 && pk.json?.docs?.length === 3, { status: pk.status, n: pk.json?.docs?.length });
  const premium = (await owner.get('/api/catalog-packages?where[packageId][equals]=premium&draft=true')).json?.docs?.[0];
  const page0 = await anon.get('/ar/smart-home/packages');
  rec.add('F-CONTENT-UNCHANGED', 'CONTENT', 'the packages page shows the seeded price (44,000), same as before the admin integration', page0.status === 200 && page0.text.includes('44,000'), page0.status);
  const draft = await owner.req('PATCH', `/api/catalog-packages/${premium?.id}?draft=true`, { json: { priceEgp: 45_000, _status: 'draft' } });
  const page1 = await anon.get('/ar/smart-home/packages');
  rec.add('F-CONTENT-DRAFT-HIDDEN', 'CONTENT', 'a saved draft never reaches the public site', draft.status === 200 && page1.text.includes('44,000') && !page1.text.includes('45,000'), { draft: draft.status });
  const pub = await owner.req('PATCH', `/api/catalog-packages/${premium?.id}`, { json: { priceEgp: 45_000, _status: 'published' } });
  let shown = false;
  for (let i = 0; i < 10 && !shown; i++) { shown = (await anon.get('/ar/smart-home/packages')).text.includes('45,000'); if (!shown) await sleep(500); }
  rec.add('F-CONTENT-PUBLISH-REVALIDATES', 'CONTENT', 'publishing in the admin updates the public page at once (tag revalidation)', pub.status === 200 && shown, { pub: pub.status, shown });
  rec.add('F-CONTENT-PUBLISH-AUDITED', 'CONTENT', 'every publish is audited', (await audit('site_content.published', t0)) >= 1, null);
  await owner.req('PATCH', `/api/catalog-packages/${premium?.id}`, { json: { priceEgp: 44_000, _status: 'published' } });
  const edDraft = await editor.req('PATCH', `/api/catalog-packages/${premium?.id}?draft=true`, { json: { nameEn: 'Premium', _status: 'draft', reviewState: 'IN_REVIEW' } });
  const edPub = await editor.req('PATCH', `/api/catalog-packages/${premium?.id}`, { json: { priceEgp: 1_000, _status: 'published' } });
  rec.add('F-ROLE-EDITOR-DRAFT-ONLY', 'RBAC', 'CONTENT (EDITOR) saves drafts and submits for review but cannot publish unless the OWNER allows it', edDraft.status === 200 && edPub.status === 403, { edDraft: edDraft.status, edPub: edPub.status });
  const badPrice = await owner.req('PATCH', `/api/catalog-packages/${premium?.id}?draft=true`, { json: { priceEgp: 12.5, _status: 'draft' } });
  const emptyPair = await owner.req('PATCH', `/api/catalog-packages/${premium?.id}?draft=true`, { json: { nameAr: '   ', _status: 'draft' } });
  const badPhone = await owner.post('/api/globals/contact-settings?draft=true', { phoneE164: '0109', whatsappE164: '+201090721847', addressAr: 'x', addressEn: 'x', _status: 'draft' });
  rec.add('F-CONTENT-VALIDATION', 'CONTENT', 'bad prices, empty AR/EN pairs and bad phone formats are rejected', badPrice.status === 400 && emptyPair.status === 400 && badPhone.status === 400, { badPrice: badPrice.status, emptyPair: emptyPair.status, badPhone: badPhone.status });

  // ---------------- Staff invitation → SALES user with forced MFA ----------------
  const salesEmail = `sales-${randomBytes(4).toString('hex')}@otonom.local`;
  const inviteByEditor = await editor.post('/api/staff/invite', { email: salesEmail, role: 'SALES', delivery: 'shown_once' });
  const invite = await owner.post('/api/staff/invite', { email: salesEmail, role: 'SALES', delivery: 'shown_once' });
  const token = String(invite.json?.link ?? '').split('#')[1] ?? '';
  rec.add('F-INVITE-OWNER-ONLY', 'STAFF', 'only the OWNER invites staff; the one-time link is shown once', inviteByEditor.status === 403 && invite.status === 201 && invite.json?.delivery === 'SHOWN_ONCE' && /^[A-Za-z0-9_-]{43}$/.test(token), { ed: inviteByEditor.status, owner: invite.status });
  const stored = await su.query(`SELECT token_hash FROM domain.staff_invites ORDER BY created_at DESC LIMIT 1`);
  rec.add('F-INVITE-HASH-ONLY', 'STAFF', 'only the SHA-256 of the invite token is stored', stored.rows[0]?.token_hash?.length === 64 && stored.rows[0].token_hash !== token, null);
  const weak = await anon.post('/api/staff/invite/accept', { token, password: 'short' });
  const salesPassword = `Syn-${randomBytes(12).toString('base64url')}-Pw1!`;
  const accept = await anon.post('/api/staff/invite/accept', { token, password: salesPassword });
  const reuse = await anon.post('/api/staff/invite/accept', { token, password: salesPassword });
  rec.add('F-INVITE-ACCEPT-ONCE', 'STAFF', 'the password policy applies and a link works exactly once', weak.status === 422 && accept.status === 200 && reuse.status === 400, { weak: weak.status, accept: accept.status, reuse: reuse.status });
  const sales = new Client(BASE, 'SALES', true);
  const sl = await sales.post('/api/users/login', { email: salesEmail, password: salesPassword });
  const beforeMfa = await sales.get('/api/leads');
  const enroll = await sales.post('/api/mfa/enroll', {});
  const enrollVerify = await sales.post('/api/mfa/enroll/verify', { code: await code(salesEmail, enroll.json?.secret ?? '') });
  rec.add('F-INVITE-MFA-FORCED', 'STAFF', 'the invited person signs in with their own password and must enroll MFA before any staff data', sl.status === 200 && [401, 403].includes(beforeMfa.status) && enroll.status === 200 && enrollVerify.status === 200, { login: sl.status, beforeMfa: beforeMfa.status, enroll: enroll.status, verify: enrollVerify.status });

  // ---------------- Booking: hidden and closed until BOTH switches are on ----------------
  const closed = await anon.post('/api/booking', lead('0'), { 'x-forwarded-for': ip() });
  const contact0 = await anon.get('/ar/contact');
  const privacy0 = await anon.get('/ar/legal/privacy');
  const sitemap0 = await anon.get('/sitemap.xml');
  rec.add('F-BOOKING-OFF', 'LEADS', 'with privacy unapproved and intake off: no form, the endpoint answers 404, the privacy page redirects to /contact', closed.status === 404 && closed.json?.code === 'BOOKING_DISABLED' && !contact0.text.includes('booking-form-contact') && [307, 308].includes(privacy0.status) && (privacy0.headers.get('location') ?? '').endsWith('/ar/contact') && !sitemap0.text.includes('legal/privacy'), { closed: closed.status, privacy: privacy0.status });
  const salesIntake = await sales.post('/api/globals/intake-settings', { enabled: true, retentionMonths: 12 });
  await editor.post('/api/globals/privacy-policy', { approved: true });
  const privacyAfterEditor = (await owner.get('/api/globals/privacy-policy')).json;
  rec.add('F-SWITCHES-OWNER-ONLY', 'RBAC', 'only the OWNER turns intake on and approves the privacy text', salesIntake.status === 403 && privacyAfterEditor?.approved !== true, { salesIntake: salesIntake.status, privacyApproved: privacyAfterEditor?.approved });
  const ownPrivacy = await owner.post('/api/globals/privacy-policy', { approved: true });
  const contact1 = await anon.get('/ar/contact');
  rec.add('F-BOOKING-ONE-SWITCH', 'LEADS', 'the privacy approval alone does not show the form', ownPrivacy.status === 200 && !contact1.text.includes('booking-form-contact'), ownPrivacy.status);
  const ownIntake = await owner.post('/api/globals/intake-settings', { enabled: true, retentionMonths: 12 });
  rec.add('F-SWITCHES-AUDITED', 'LEADS', 'both switches are audited', ownIntake.status === 200 && (await audit('privacy.approved', t0)) >= 1 && (await audit('intake.settings', t0)) >= 1, null);
  let contact2 = await anon.get('/ar/contact');
  for (let i = 0; i < 6 && !contact2.text.includes('booking-form-contact'); i++) { await sleep(500); contact2 = await anon.get('/ar/contact'); }
  const privacy1 = await anon.get('/ar/legal/privacy');
  const sitemap1 = await anon.get('/sitemap.xml');
  const home1 = await anon.get('/ar');
  rec.add('F-BOOKING-ON', 'LEADS', 'with both switches on: the form, the privacy page, its footer link and its sitemap entry appear', contact2.text.includes('booking-form-contact') && privacy1.status === 200 && privacy1.text.includes('privacy-page') && sitemap1.text.includes('/ar/legal/privacy') && home1.text.includes('footer-privacy'), { privacy: privacy1.status });

  // ---------------- Booking: consent, anti-spam, validation, idempotency, rate limit ----------------
  const fresh = tokenFrom(contact2.text) ?? '';
  const fast = await anon.post('/api/booking', lead(fresh), { 'x-forwarded-for': ip() });
  const n0 = await leadCount();
  const honey = await anon.post('/api/booking', lead(fresh, { website: 'http://spam.example' }), { 'x-forwarded-for': ip() });
  rec.add('F-BOOKING-ANTISPAM', 'LEADS', 'honeypot and too-fast submissions get a neutral answer and store nothing', fast.status === 202 && honey.status === 202 && (await leadCount()) === n0, { fast: fast.status, honey: honey.status });
  const forged = await anon.post('/api/booking', lead(`${Date.now() - 60_000}.${'A'.repeat(43)}`), { 'x-forwarded-for': ip() });
  rec.add('F-BOOKING-TOKEN-SIGNED', 'LEADS', 'a forged timing token is refused (the form must be loaded from the site)', forged.status === 422 && forged.json?.code === 'FORM_EXPIRED', forged.status);
  await sleep(3200);
  const noConsent = await anon.post('/api/booking', lead(fresh, { consent: false }), { 'x-forwarded-for': ip() });
  const badPhone2 = await anon.post('/api/booking', lead(fresh, { phone: '0201234' }), { 'x-forwarded-for': ip() });
  const tooLong = await anon.post('/api/booking', lead(fresh, { message: 'x'.repeat(501) }), { 'x-forwarded-for': ip() });
  const shortName = await anon.post('/api/booking', lead(fresh, { name: 'A' }), { 'x-forwarded-for': ip() });
  const longName = await anon.post('/api/booking', lead(fresh, { name: 'x'.repeat(61) }), { 'x-forwarded-for': ip() });
  const noPkg = await anon.post('/api/booking', lead(fresh, { package: 'gold' }), { 'x-forwarded-for': ip() });
  rec.add('F-BOOKING-VALIDATION', 'LEADS', 'consent is required; Egyptian mobile only; name 2–60; allow-listed package; over-long text is rejected (never truncated)', noConsent.status === 422 && noConsent.json?.fieldErrors?.consent === 'REQUIRED' && badPhone2.json?.fieldErrors?.phone === 'EGYPTIAN_MOBILE' && tooLong.json?.fieldErrors?.message === 'TOO_LONG' && shortName.json?.fieldErrors?.name === 'TOO_SHORT' && longName.json?.fieldErrors?.name === 'TOO_LONG' && noPkg.json?.fieldErrors?.package === 'REQUIRED', { noConsent: noConsent.status, badPhone: badPhone2.json?.fieldErrors, tooLong: tooLong.json?.fieldErrors, shortName: shortName.json?.fieldErrors, longName: longName.json?.fieldErrors, noPkg: noPkg.json?.fieldErrors });
  const body = lead(fresh, { phone: '٠١١٢٣٤٥٦٧٨٩', source: 'simulator', plan: 'Synthetic plan: 6 rooms, 13 channels' });
  const ok = await anon.post('/api/booking', body, { 'x-forwarded-for': ip() });
  const replay = await anon.post('/api/booking', body, { 'x-forwarded-for': ip() });
  rec.add('F-BOOKING-CREATED', 'LEADS', 'a valid request is stored once with a BK reference; a retry returns the same reference', ok.status === 201 && /^BK-\d{4}-[A-Z2-9]{6}$/.test(ok.json?.ref ?? '') && replay.status === 200 && replay.json?.ref === ok.json?.ref, { ok: ok.status, replay: replay.status });
  const row = (await su.query(`SELECT phone, consent_given, consent_privacy_version, status, source, plan FROM cms.leads WHERE ref=$1`, [ok.json?.ref])).rows[0];
  rec.add('F-BOOKING-STORED', 'LEADS', 'phone normalised to +20…, consent and the privacy text date kept with the lead, status NEW, the simulator plan attached', row?.phone === '+201123456789' && row?.consent_given === true && /^\d{4}-\d{2}-\d{2}$/.test(row?.consent_privacy_version ?? '') && row?.status === 'NEW' && row?.source === 'simulator' && row?.plan === 'Synthetic plan: 6 rooms, 13 channels', row);
  // owner 2026-11-04: the simplified form. Area and preferred time are gone from the form, the API and the database;
  // an old client that still sends them is accepted and they are dropped; +20 / spaces are normalised; a plan is kept
  // only for simulator requests.
  const leadCols = (await su.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='cms' AND table_name IN ('leads', '_leads_v')`)).rows.map((r: any) => r.column_name);
  const legacy = await anon.post('/api/booking', lead(fresh, { phone: '+20 101 234 5678', area: 'Damanhour', preferredTime: 'Evening', plan: 'a plan from the contact page' }), { 'x-forwarded-for': ip() });
  const legacyRow = (await su.query(`SELECT phone, plan, source FROM cms.leads WHERE ref=$1`, [legacy.json?.ref])).rows[0];
  const contactForm = contact2.text.match(/<form[^>]*data-testid="booking-form-contact"[\s\S]*?<\/form>/)?.[0] ?? '';
  const formNames = [...new Set([...contactForm.matchAll(/ name="([a-zA-Z]+)"/g)].map((m) => m[1]))].sort();
  const preset = await anon.get('/ar/contact?package=premium');
  const unknown = await anon.get('/ar/contact?package=gold');
  rec.add('F-BOOKING-SIMPLIFIED', 'LEADS', 'the form has only name, mobile, package, consent, the optional note and the honeypot; two equal options (WhatsApp / form) plus Call; ?package= preselects via the allow-list; no area / preferred time columns; legacy fields dropped; plan only from the simulator',
    JSON.stringify(formNames) === JSON.stringify(['consent', 'message', 'name', 'package', 'phone', 'website']) && ['contact-options', 'option-whatsapp', 'option-form', 'contact-call', 'احجز بالواتساب', 'احجز بالفورم', 'عايز تضيف ملاحظة؟', 'موافق إن OTONOM تتواصل معايا بخصوص طلبي'].every((x) => contact2.text.includes(x)) &&
    /<input(?=[^>]*name="package")(?=[^>]*value="premium")(?=[^>]*checked="")[^>]*>/.test(preset.text) && !/<input(?=[^>]*name="package")(?=[^>]*checked="")[^>]*>/.test(unknown.text) &&
    !leadCols.some((c: string) => /area|preferred_time/.test(c)) && legacy.status === 201 && legacyRow?.phone === '+201012345678' && legacyRow?.plan === null && legacyRow?.source === 'contact',
    { formNames, leadCols: leadCols.filter((c: string) => /area|preferred|plan|message/.test(c)), legacy: legacy.status, legacyRow });
  rec.add('F-BOOKING-AUDITED', 'LEADS', 'every new lead is audited', (await audit('lead.created', t0)) >= 1, null);
  const rlIp = ip();
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await anon.post('/api/booking', lead(fresh, { phone: '01012345678' }), { 'x-forwarded-for': rlIp })).status);
  rec.add('F-BOOKING-RATE-LIMIT', 'LEADS', 'the 6th request from one client within the hour is refused', statuses[5] === 429 && statuses.slice(0, 5).every((s) => s === 201), statuses);
  const cross = await new Client(BASE, 'evil').post('/api/booking', lead(fresh), { origin: 'https://evil.example', 'x-forwarded-for': ip() });
  rec.add('F-BOOKING-CSRF', 'LEADS', 'a cross-origin submission is refused', cross.status === 403, cross.status);

  // ---------------- Roles on leads ----------------
  const leadsBySales = await sales.get('/api/leads?limit=5');
  const leadsByEditor = await editor.get('/api/leads?limit=5');
  const leadsByEngineer = await engineer.get('/api/leads?limit=5');
  const leadsAnon = await anon.get('/api/leads?limit=5');
  rec.add('F-ROLE-LEADS-READ', 'RBAC', 'SALES sees leads; CONTENT (EDITOR), ENGINEER and anonymous do not', leadsBySales.status === 200 && leadsBySales.json?.docs?.length > 0 && leadsByEditor.status === 403 && leadsByEngineer.status === 403 && [401, 403].includes(leadsAnon.status), { sales: leadsBySales.status, editor: leadsByEditor.status, engineer: leadsByEngineer.status, anon: leadsAnon.status });
  const exportSales = await sales.get('/api/leads-export');
  const exportOwner = await owner.get('/api/leads-export');
  rec.add('F-ROLE-EXPORT-OWNER', 'RBAC', 'only the OWNER exports leads (CSV, audited)', exportSales.status === 403 && exportOwner.status === 200 && (exportOwner.headers.get('content-type') ?? '').startsWith('text/csv') && exportOwner.text.includes('ref,') === false && exportOwner.text.includes('"ref"') && (await audit('lead.export', t0)) >= 1, { sales: exportSales.status, owner: exportOwner.status });
  const salesPublish = await sales.req('PATCH', `/api/catalog-packages/${premium?.id}`, { json: { priceEgp: 1_000, _status: 'published' } });
  rec.add('F-ROLE-SALES-NO-PUBLISH', 'RBAC', 'SALES cannot change or publish site content', [401, 403].includes(salesPublish.status), salesPublish.status);
  const leadId = (await su.query(`SELECT id FROM cms.leads WHERE ref=$1`, [ok.json?.ref])).rows[0]?.id;
  const work = await sales.req('PATCH', `/api/leads/${leadId}`, { json: { status: 'CONTACTED', phone: '+201000000000', notes: [{ text: 'Synthetic first call' }] } });
  const work2 = await sales.req('PATCH', `/api/leads/${leadId}`, { json: { notes: [{ text: 'tampered' }, { text: 'Synthetic second note' }] } });
  const after = (await su.query(`SELECT phone, status FROM cms.leads WHERE id=$1`, [leadId])).rows[0];
  const notes = (await su.query(`SELECT text FROM cms.leads_notes WHERE _parent_id=$1 ORDER BY _order`, [leadId])).rows.map((r: any) => r.text);
  rec.add('F-LEAD-WORK', 'LEADS', 'SALES moves the status and adds notes; notes are append-only; personal fields stay as submitted', work.status === 200 && work2.status === 200 && after?.status === 'CONTACTED' && after?.phone === '+201123456789' && JSON.stringify(notes) === JSON.stringify(['Synthetic first call', 'Synthetic second note']), { after, notes });
  rec.add('F-LEAD-AUDITED', 'LEADS', 'status changes and notes are audited', (await audit('lead.status', t0)) >= 1 && (await audit('lead.note', t0)) >= 1, null);

  // ---------------- Metrics: aggregates only ----------------
  const count = async (e: string, r: string) => Number((await su.query(`SELECT coalesce(sum(count),0) AS n FROM domain.site_metrics WHERE event=$1 AND route=$2`, [e, r])).rows[0].n);
  const m0 = await count('page_view', '/ar/contact');
  const hit = await anon.post('/api/e', { e: 'page_view', r: '/ar/contact', l: 'ar', ip: '1.2.3.4', ua: 'x', id: 'abc' }, { 'user-agent': BROWSER_UA, 'x-forwarded-for': ip() });
  const bot = await anon.post('/api/e', { e: 'page_view', r: '/ar/contact', l: 'ar' }, { 'user-agent': 'Googlebot/2.1', 'x-forwarded-for': ip() });
  const junk = await anon.post('/api/e', { e: 'drop_table', r: '/ar/contact?x=1', l: 'ar' }, { 'user-agent': BROWSER_UA, 'x-forwarded-for': ip() });
  const m1 = await count('page_view', '/ar/contact');
  rec.add('F-METRICS-COUNT', 'METRICS', 'an allowed event is counted once; bots are not counted; junk is rejected', hit.status === 204 && bot.status === 204 && junk.status === 400 && m1 === m0 + 1, { hit: hit.status, bot: bot.status, junk: junk.status, m0, m1 });
  const cols = (await su.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='domain' AND table_name='site_metrics' ORDER BY ordinal_position`)).rows.map((r: any) => r.column_name);
  rec.add('F-METRICS-NO-IDENTIFIERS', 'METRICS', 'the metrics table holds only event, route, locale, day and count (no IP, user agent, cookie or identifier)', JSON.stringify(cols) === JSON.stringify(['event', 'route', 'locale', 'day', 'count']), cols);
  rec.add('F-METRICS-NO-COOKIE', 'METRICS', 'the metrics endpoint sets no cookie', !hit.headers.get('set-cookie'), null);
  const sumSales = await sales.get('/api/metrics/summary');
  const sumEditor = await editor.get('/api/metrics/summary');
  rec.add('F-ROLE-METRICS', 'RBAC', 'SALES reads the metrics summary; CONTENT (EDITOR) does not', sumSales.status === 200 && Array.isArray(sumSales.json?.funnel) && sumEditor.status === 403, { sales: sumSales.status, editor: sumEditor.status });

  // ---------------- Daily job: secret, retention, digest, once per day ----------------
  const noAuth = await anon.get('/api/cron/daily');
  const wrongAuth = await anon.get('/api/cron/daily', { authorization: 'Bearer wrong-secret-wrong-secret-wrong-secret' });
  rec.add('F-CRON-SECRET', 'JOBS', 'the daily job needs the CRON_SECRET bearer token', noAuth.status === 401 && wrongAuth.status === 401, { noAuth: noAuth.status, wrong: wrongAuth.status });
  await su.query(`UPDATE cms.leads SET last_activity_at = now() - interval '3 years', created_at = now() - interval '3 years' WHERE ref <> $1 AND id = (SELECT id FROM cms.leads WHERE ref <> $1 ORDER BY id LIMIT 1)`, [ok.json?.ref]);
  const nOld = await leadCount();
  const run1 = await anon.get('/api/cron/daily', { authorization: `Bearer ${CRON}` });
  const run2 = await anon.get('/api/cron/daily', { authorization: `Bearer ${CRON}` });
  rec.add('F-CRON-RETENTION', 'JOBS', 'leads past the retention window are deleted (audited); recent ones stay', run1.status === 200 && run1.json?.retention?.deleted >= 1 && (await leadCount()) === nOld - run1.json.retention.deleted && (await audit('lead.retention_delete', t0)) >= 1 && (await su.query(`SELECT 1 FROM cms.leads WHERE ref=$1`, [ok.json?.ref])).rowCount === 1, run1.json);
  rec.add('F-CRON-DIGEST', 'JOBS', 'the digest lists NEW leads older than 24 h (sent with the test provider)', run1.json?.digest && typeof run1.json.digest.waiting === 'number', run1.json?.digest);
  rec.add('F-CRON-ONCE', 'JOBS', 'a second call the same day repeats nothing', run2.status === 200 && run2.json?.digest?.skipped === 'ALREADY_RAN' && run2.json?.retention?.skipped === 'ALREADY_RAN', run2.json);

  // ---------------- Announcement bar and public HTML ----------------
  const ann = await owner.post('/api/globals/announcement', { enabled: true, textAr: 'إعلان تجريبي', textEn: 'Synthetic announcement', link: '/ar/contact', _status: 'published' });
  let annShown = false;
  for (let i = 0; i < 6 && !annShown; i++) { annShown = (await anon.get('/en')).text.includes('announcement-bar'); if (!annShown) await sleep(500); }
  const annBad = await owner.post('/api/globals/announcement', { enabled: true, textAr: '', textEn: '', _status: 'published' });
  await owner.post('/api/globals/announcement', { enabled: false, _status: 'published' });
  rec.add('F-ANNOUNCEMENT', 'CONTENT', 'the announcement bar shows when published and enabled; text is required', ann.status === 200 && annShown && [400, 422].includes(annBad.status), { ann: ann.status, annBad: annBad.status });
  const pages = await Promise.all(['/ar', '/en', '/ar/contact', '/en/try', '/ar/legal/privacy'].map((p) => anon.get(p)));
  const adminLinks = pages.map((p) => (p.text.match(/href="\/(?:admin|staff)[^"]*"/g) ?? []).length);
  rec.add('F-NO-ADMIN-LINK', 'HOSTS', 'no link to the admin or the staff sign-in in public HTML', adminLinks.every((n) => n === 0), adminLinks);

  // ---------------- First paint (owner decision, 2026-11-04) ----------------
  // Every page waits on the same stylesheets as v4: the shared one and the main one, with the @font-face rules inside
  // the main one (no fonts-only stylesheet); /try adds the simulator's own stylesheet, as in v4. No script the page
  // HTML refers to (script tags, preloads, the RSC payload) carries the metrics beacon code: DeferredMetrics loads it
  // only after the page load event.
  const assets = new Map<string, Promise<string>>();
  const asset = (href: string) => {
    if (!assets.has(href)) assets.set(href, anon.get(href).then((r) => (r.status === 200 ? r.text : `HTTP ${r.status}`)));
    return assets.get(href)!;
  };
  const BEACON_CODE = /sendBeacon|["'`]\/api\/e["'`]/;
  const firstPaint: Record<string, { sheets: number; expected: number; fontSheets: number; fontsInMain: boolean; scripts: number; withBeaconCode: string[] }> = {};
  for (const p of ['/ar', '/en', '/ar/try', '/en/try', '/ar/smart-home/packages', '/en/smart-home/packages', '/ar/products', '/en/products', '/ar/contact']) {
    const html = (await anon.get(p)).text;
    const sheets = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((t) => /\srel="stylesheet"/.test(t)).map((t) => t.match(/\shref="([^"]+)"/)?.[1] ?? '');
    const scripts = [...new Set(html.match(/\/_next\/static\/chunks\/[A-Za-z0-9_.~-]+\.js/g) ?? [])];
    const fontCss = (await Promise.all(sheets.map(asset))).filter((css) => css.includes('@font-face'));
    const withBeaconCode = (await Promise.all(scripts.map(async (s) => (BEACON_CODE.test(await asset(s)) ? s : '')))).filter(Boolean);
    firstPaint[p] = { sheets: sheets.length, expected: p.endsWith('/try') ? 3 : 2, fontSheets: fontCss.length, fontsInMain: fontCss.length === 1 && fontCss[0].includes('--v2-navy'), scripts: scripts.length, withBeaconCode };
  }
  rec.add('F-FIRST-PAINT', 'PERF', 'each page waits on the same stylesheets as v4 (the fonts inside the main one) and loads no metrics code before the page load event', Object.values(firstPaint).every((f) => f.sheets === f.expected && f.fontSheets === 1 && f.fontsInMain && f.scripts > 0 && f.withBeaconCode.length === 0), firstPaint);

  // leave the switches off again (the clone is dropped after the run anyway)
  await owner.post('/api/globals/intake-settings', { enabled: false, retentionMonths: 12 });
  await owner.post('/api/globals/privacy-policy', { approved: false });

  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'final-release-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

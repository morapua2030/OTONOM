// Final release (owner 2026-11-04): unit tests for the pure parts of the admin integration.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { bookingVisible, egyptianMobile, retentionCutoff, validateLead } from '../src/lib/leads.ts';
import { checkBookingToken, issueBookingToken } from '../src/lib/booking-token.ts';
import { cairoDay, isBotAgent, isMetricEvent, metricRoute, METRIC_EVENTS } from '../src/lib/metrics.ts';
import { escapeHtml, leadAlertEmail, leadsNotifyTo, notificationsConfigured, sendMail } from '../src/lib/notify-email.ts';
import { cronAuthorized, csvCell } from '../src/endpoints/final-release.ts';
import { DEFAULT_SITE_CONTENT, mergeContent, packagesFrom } from '../src/lib/site-content.ts';
import { canPublishSiteContent } from '../src/lib/content-workflow.ts';
import { SMART_HOME_PACKAGES } from '../src/lib/smart-home-packages.ts';
import { can } from '@otonom/domain';

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const KEY = 'k'.repeat(40);
const lead = (over: Record<string, unknown> = {}) => ({ name: 'Ali', phone: '01012345678', package: 'plus', consent: true, source: 'contact', locale: 'ar', idempotencyKey: 'test-idempotency-0000000001', ...over });

test('booking form is visible only when BOTH audited switches are on', () => {
  assert.equal(bookingVisible({ privacyApproved: false, intakeEnabled: false }), false);
  assert.equal(bookingVisible({ privacyApproved: true, intakeEnabled: false }), false);
  assert.equal(bookingVisible({ privacyApproved: false, intakeEnabled: true }), false);
  assert.equal(bookingVisible({ privacyApproved: true, intakeEnabled: true }), true);
});

test('lead validation: consent required, Egyptian mobile only, allow-listed package, over-long text rejected (not truncated)', () => {
  assert.equal(validateLead(lead()).ok, true);
  const v = validateLead(lead({ phone: '٠١١٢٣٤٥٦٧٨٩' }));
  assert.ok(v.ok && v.value.phone === '+201123456789', 'Arabic-Indic digits normalised to +20');
  for (const [over, field, code] of [
    [{ consent: false }, 'consent', 'REQUIRED'], [{ consent: 'true' }, 'consent', 'REQUIRED'], [{ phone: '+441234567890' }, 'phone', 'EGYPTIAN_MOBILE'],
    [{ phone: '0201234567' }, 'phone', 'EGYPTIAN_MOBILE'], [{ package: 'gold' }, 'package', 'REQUIRED'], [{ message: 'x'.repeat(501) }, 'message', 'TOO_LONG'],
    [{ source: 'simulator', plan: 'x'.repeat(901) }, 'plan', 'TOO_LONG'], [{ name: 'A' }, 'name', 'TOO_SHORT'], [{ name: '' }, 'name', 'REQUIRED'], [{ name: 'x'.repeat(61) }, 'name', 'TOO_LONG'],
    [{ phone: '' }, 'phone', 'REQUIRED'], [{ source: 'ads' }, 'source', 'INVALID'], [{ idempotencyKey: 'short' }, 'idempotencyKey', 'INVALID'],
  ] as const) {
    const r = validateLead(lead(over));
    assert.ok(!r.ok && (r.errors as any)[field] === code, `${JSON.stringify(over)} → ${field}=${code}`);
  }
  const bidi = validateLead(lead({ name: 'Ali‮ evil', message: 'hi⁦x⁩' }));
  assert.ok(bidi.ok && !/[‪-‮⁦-⁩]/.test(bidi.value.name + bidi.value.message), 'bidi overrides stripped from free text');
  assert.equal(egyptianMobile('01512345678'), '+201512345678');
  assert.equal(egyptianMobile('01312345678'), null);
});

test('simplified booking form (owner 2026-11-04): name 2–60, the mobile forms people type, no area / preferred time, plan only from the simulator', () => {
  for (const raw of ['01012345678', '010 1234 5678', '+20 101 234 5678', '+201012345678', '+20 010 1234 5678', '00201012345678', '201012345678', '1012345678', '010-1234-5678', '(010) 1234.5678', '٠١٠١٢٣٤٥٦٧٨', '۰۱۰۱۲۳۴۵۶۷۸', ' 010 1234 5678 ']) {
    assert.equal(egyptianMobile(raw), '+201012345678', raw);
  }
  for (const raw of ['0221234567', '01312345678', '0101234567', '010123456789', '+441012345678', '+2101012345678', 'abc', '', '0'.repeat(41)]) assert.equal(egyptianMobile(raw), null, raw);
  const v = validateLead(lead({ name: '  Ali   Hassan ', area: 'Damanhour', preferredTime: 'Evening' }));
  assert.ok(v.ok && v.value.name === 'Ali Hassan', 'inner spaces collapsed, ends trimmed');
  assert.ok(v.ok && !('area' in v.value) && !('preferredTime' in v.value), 'removed fields are ignored, never stored');
  for (const name of ['ab', 'محمد', 'x'.repeat(60), 'A😀']) assert.equal(validateLead(lead({ name })).ok, true, name);
  assert.equal(validateLead(lead({ message: 'x'.repeat(500) })).ok, true);
  const sim = validateLead(lead({ source: 'simulator', plan: 'p'.repeat(900) }));
  assert.ok(sim.ok && sim.value.plan?.length === 900, 'a 900-character plan is accepted from the simulator');
  const contact = validateLead(lead({ plan: 'a plan sent from the contact page' }));
  assert.ok(contact.ok && contact.value.plan === null, 'a plan is kept only for simulator requests');
});

test('booking form markup: only the owner’s fields, accessible names, honeypot and consent kept', () => {
  const form = read('components/BookingForm.tsx');
  assert.deepEqual([...form.matchAll(/ name="([a-z]+)"/g)].map((m) => m[1]).sort(), ['consent', 'message', 'name', 'package', 'phone', 'website']);
  assert.match(form, /type="text" autoComplete="name" maxLength=\{LEAD_LIMITS\.name\}/);
  assert.match(form, /type="tel" inputMode="tel" autoComplete="tel"/);
  assert.match(form, /type="radio" name="package"/, 'package chips are a real radio group');
  assert.doesNotMatch(form, /area|preferredTime/);
  for (const copy of ["'احجز زيارة'", "'وصلنا طلبك! هنكلمك قريب.'", "'عايز تضيف ملاحظة؟'", "'موافق إن OTONOM تتواصل معايا بخصوص طلبي'", "'مش متأكد'"]) assert.ok(form.includes(copy), copy);
  assert.match(form, /aria-expanded=\{noteOpen\}/, 'the note is collapsed behind a disclosure button');
  assert.match(form, /className="booking-hp" aria-hidden="true"/, 'honeypot kept');
  assert.match(form, /name="consent" type="checkbox" required/);
  assert.match(form, /role="region" aria-labelledby=\{f\('plan-label'\)\} tabIndex=\{0\}/, 'the simulator plan is a read-only, keyboard-scrollable preview');
  const contact = read('components/ContactBooking.tsx');
  assert.ok(contact.includes("'احجز بالواتساب'") && contact.includes("'احجز بالفورم'"), 'two equal options on the contact page');
  assert.doesNotMatch(contact, /import \{ BookingForm \}/, 'the form code is not loaded while the form is off');
});

test('timing token: signed, too fast below 3 s, expired after 6 h, forged refused', () => {
  const now = 1_800_000_000_000;
  const t = issueBookingToken(now, KEY);
  assert.equal(checkBookingToken(t, now + 1000, KEY), 'TOO_FAST');
  assert.equal(checkBookingToken(t, now + 3500, KEY), 'OK');
  assert.equal(checkBookingToken(t, now + 7 * 3600_000, KEY), 'EXPIRED');
  assert.equal(checkBookingToken(t, now + 3500, 'x'.repeat(40)), 'INVALID', 'another secret');
  assert.equal(checkBookingToken(`${now - 60_000}.${'A'.repeat(43)}`, now, KEY), 'INVALID', 'forged older timestamp');
  assert.equal(checkBookingToken(undefined, now, KEY), 'INVALID');
});

test('retention cutoff is N months before now (1–36, default 12)', () => {
  const now = new Date('2026-11-04T12:00:00Z');
  assert.equal(retentionCutoff(now, 12).toISOString().slice(0, 10), '2025-11-04');
  assert.equal(retentionCutoff(now, 0).toISOString().slice(0, 10), '2025-11-04');
  assert.equal(retentionCutoff(now, 99).toISOString().slice(0, 10), '2023-11-04');
});

test('metrics: fixed event list, locale paths only (no query, ids or junk), bots ignored, Cairo day', () => {
  assert.equal(isMetricEvent('page_view'), true);
  assert.equal(isMetricEvent('drop_table'), false);
  assert.ok(METRIC_EVENTS.every((e) => /^[a-z][a-z0-9_]{1,31}$/.test(e)), 'every event fits the database CHECK');
  assert.deepEqual(metricRoute('/ar/smart-home/packages'), { route: '/ar/smart-home/packages', locale: 'ar' });
  assert.deepEqual(metricRoute('/en/try?demo=gas'), { route: '/en/try', locale: 'en' });
  for (const bad of ['/fr/x', '/ar/a/b/c/d/e', '/ar/<script>', 'https://x.example/ar', '/ar/UPPER', '', 42]) assert.equal(metricRoute(bad), null, String(bad));
  assert.equal(isBotAgent('Googlebot/2.1'), true);
  assert.equal(isBotAgent(''), true);
  assert.equal(isBotAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140 Safari/537.36'), false);
  assert.equal(cairoDay(new Date('2026-11-04T23:30:00Z')), '2026-11-05');
});

test('the metrics client sends only event, route and locale; no storage or cookie; honours DNT/GPC; simulator events allow-listed', () => {
  const beacon = read('components/MetricsBeacon.tsx');
  assert.match(beacon, /JSON\.stringify\(\{ e, r: where\.r, l: where\.l \}\)/);
  assert.match(beacon, /navigator\.sendBeacon\('\/api\/e'/);
  assert.doesNotMatch(beacon, /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|https?:\/\/(?!wa\.me\/')/, 'the only URL is the wa.me prefix used to recognise WhatsApp clicks');
  // owner decision A (2026-11-04): metrics ON for /try; the beacon accepts only the five simulator event names
  assert.match(beacon, /const SIM_EVENTS = new Set\(\['sim_start', 'sim_stage_2', 'sim_stage_3', 'sim_stage_4', 'plan_sent'\]\);/);
  assert.match(beacon, /if \(typeof e === 'string' && SIM_EVENTS\.has\(e\)\) send\(e, location\.pathname\);/);
  // the simulator never talks to the network: it only raises allow-listed page events
  const sim = read('components/simulator/Simulator.tsx');
  assert.doesNotMatch(sim, /sendBeacon|fetch\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.match(sim, /type SimMetric = 'sim_start' \| 'sim_stage_2' \| 'sim_stage_3' \| 'sim_stage_4' \| 'plan_sent';/);
  assert.match(sim, /window\.dispatchEvent\(new CustomEvent\('otonom:metric', \{ detail: \{ e \} \}\)\)/);
  assert.match(beacon, /doNotTrack === '1' \|\| n\.globalPrivacyControl === true/);
});

test('e-mail: skipped without a provider, sent only to the allowed recipient, HTML escaped, no personal data in the subject', async () => {
  const none = await sendMail({ to: 'team@otonomiot.com', subject: 's', text: 't', html: 'h', idempotencyKey: 'k' }, 'team@otonomiot.com', {} as NodeJS.ProcessEnv);
  assert.deepEqual(none, { sent: false, reason: 'NOT_CONFIGURED' });
  const env = { OTONOM_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_' + 'x'.repeat(30), OTONOM_EMAIL_FROM: 'OTONOM <noreply@otonomiot.com>' } as NodeJS.ProcessEnv;
  assert.equal(notificationsConfigured(env), true);
  let called = 0;
  const fake = (async () => { called++; return new Response(JSON.stringify({ id: 'email_123456789' }), { status: 200 }); }) as typeof fetch;
  assert.deepEqual(await sendMail({ to: 'other@example.com', subject: 's', text: 't', html: 'h', idempotencyKey: 'k' }, 'team@otonomiot.com', env, fake), { sent: false, reason: 'RECIPIENT_NOT_ALLOWED' });
  assert.equal(called, 0);
  assert.deepEqual(await sendMail({ to: 'TEAM@otonomiot.com', subject: 's', text: 't', html: 'h', idempotencyKey: 'k' }, 'team@otonomiot.com', env, fake), { sent: true, id: 'email_123456789' });
  assert.equal(notificationsConfigured({ OTONOM_EMAIL_PROVIDER: 'test', OTONOM_EMAIL_TEST_MODE: '1', VERCEL: '1' } as NodeJS.ProcessEnv), false, 'test provider never on Vercel');
  const mail = leadAlertEmail({ ref: 'BK-2026-ABCDEF', id: 7, name: '<script>x</script>', phone: '+201012345678', package: 'plus', source: 'simulator', hasNote: true, hasPlan: true }, 'https://otonom-admin.vercel.app');
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
  assert.doesNotMatch(mail.subject, /script|201012345678|Simulator/, 'subject carries only the reference');
  assert.match(mail.text, /المصدر \/ Source: المحاكي \/ Simulator/);
  assert.match(mail.text, /مرفق \/ Attached: ملاحظة \/ note \+ خطة المحاكي \/ simulator plan/);
  assert.doesNotMatch(mail.text, /Area|المنطقة/, 'area is no longer collected');
  assert.equal(escapeHtml(`"'&<>`), '&quot;&#39;&amp;&lt;&gt;');
  assert.equal(leadsNotifyTo({ OTONOM_LEADS_NOTIFY_TO: ' Team@OtonomIoT.com ' } as NodeJS.ProcessEnv), 'team@otonomiot.com');
  assert.equal(leadsNotifyTo({ OTONOM_LEADS_NOTIFY_TO: 'not-an-email' } as NodeJS.ProcessEnv), null);
});

test('daily job needs a CRON_SECRET of at least 32 characters (constant-time compare); CSV cells cannot start a formula', () => {
  const env = { CRON_SECRET: 's'.repeat(40) } as NodeJS.ProcessEnv;
  assert.equal(cronAuthorized(`Bearer ${'s'.repeat(40)}`, env), true);
  assert.equal(cronAuthorized(`Bearer ${'s'.repeat(39)}`, env), false);
  assert.equal(cronAuthorized(null, env), false);
  assert.equal(cronAuthorized(`Bearer ${'s'.repeat(10)}`, { CRON_SECRET: 's'.repeat(10) } as NodeJS.ProcessEnv), false, 'short secrets are refused');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+201012345678'), `"'+201012345678"`);
  assert.equal(csvCell('Ali'), '"Ali"');
});

test('site content: every section falls back on its own; invalid admin data never reaches the page', () => {
  assert.deepEqual(mergeContent({}).packages, DEFAULT_SITE_CONTENT.packages);
  assert.equal(mergeContent({}).fromAdmin.length, 0);
  const good = SMART_HOME_PACKAGES.map((p, i) => ({ packageId: p.id, nameAr: p.name.ar, nameEn: p.name.en, priceEgp: p.priceEgp + 1000, mostComplete: !!p.badge, badgeAr: p.badge?.ar, badgeEn: p.badge?.en, items: p.items.map((it) => ({ key: it.key, nameAr: it.name.ar, nameEn: it.name.en, quantity: it.quantity, model: it.model })), order: i, active: true }));
  assert.equal(packagesFrom(good)?.[0]?.priceEgp, 45_000);
  const bad = good.map((p, i) => (i === 0 ? { ...p, priceEgp: 12.5 } : p));
  const m = mergeContent({ packages: bad, contact: { _status: 'published', phoneE164: 'abc', whatsappE164: '+201090721847', addressAr: 'x', addressEn: 'y' } });
  assert.deepEqual(m.packages, DEFAULT_SITE_CONTENT.packages, 'an invalid price keeps the built-in packages');
  assert.deepEqual(m.contact, DEFAULT_SITE_CONTENT.contact, 'an invalid phone keeps the built-in contact');
  assert.equal(mergeContent({ announcement: { _status: 'published', enabled: true, textAr: 'أ', textEn: 'A', link: 'javascript:alert(1)' } }).announcement?.link, null, 'unsafe links are dropped');
  assert.equal(mergeContent({ announcement: { _status: 'published', enabled: true, textAr: 'أ', textEn: 'A', activeTo: '2020-01-01' } }).announcement, null, 'expired announcement hidden');
  assert.equal(mergeContent({ intake: { enabled: true } }).intakeEnabled, true);
  assert.equal(mergeContent({ privacy: { bodyAr: 'نص', bodyEn: 'Text', approved: 'yes' } }).privacy.approved, false, 'only a real true approves');
});

test('publishing rights: OWNER/ADMIN; EDITOR only when the OWNER allowed it; SALES never; MFA required', () => {
  const mfa = (role: string, extra: Record<string, unknown> = {}) => ({ id: 1, role, _sid: 's', mfaVerifiedSids: ['s'], ...extra });
  assert.equal(canPublishSiteContent(mfa('OWNER') as any), true);
  assert.equal(canPublishSiteContent(mfa('ADMIN') as any), true);
  assert.equal(canPublishSiteContent(mfa('EDITOR') as any), false);
  assert.equal(canPublishSiteContent(mfa('EDITOR', { canPublishContent: true }) as any), true);
  assert.equal(canPublishSiteContent(mfa('SALES', { canPublishContent: true }) as any), false);
  assert.equal(canPublishSiteContent({ id: 1, role: 'OWNER', _sid: 's', mfaVerifiedSids: [] } as any), false, 'MFA pending');
  assert.equal(can('SALES', 'leads.read'), true);
  assert.equal(can('EDITOR', 'leads.read'), false);
  assert.equal(can('SALES', 'leads.export'), false);
  assert.equal(can('SALES', 'content.edit'), false);
  assert.equal(can('OWNER', 'privacy.approve') && can('OWNER', 'intake.settings') && can('OWNER', 'staff.invite'), true);
  assert.equal(can('ADMIN', 'privacy.approve') || can('ADMIN', 'intake.settings') || can('ADMIN', 'staff.invite'), false);
});

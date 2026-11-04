/**
 * Server-side notification e-mail via Resend (final release, owner 2026-11-04). No SDK: one fetch, a 10 s timeout and
 * an idempotency key per message. Without a configured provider nothing is sent (`NOT_CONFIGURED`) and the caller
 * keeps working: leads still land in the admin. The test provider is local-only (never on Vercel) and logs no content.
 * Subjects never contain personal data; every value placed in HTML is escaped.
 */
type FetchLike = typeof fetch;
export type MailResult = { sent: true; id: string } | { sent: false; reason: 'NOT_CONFIGURED' | 'RECIPIENT_NOT_ALLOWED' | 'PROVIDER_FAILED' };
export type Mail = { to: string; subject: string; text: string; html: string; idempotencyKey: string };

const norm = (v: string | undefined | null) => (v ?? '').trim().toLowerCase();
const senderOk = (v: string) => /^(?:[^<>\r\n]{1,80}\s*)?(?:<)?[^<>\s]+@[^<>\s]+(?:>)?$/.test(v);

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** The team mailbox for alerts and digests (OTONOM_LEADS_NOTIFY_TO); null when not configured. */
export function leadsNotifyTo(env: NodeJS.ProcessEnv = process.env): string | null {
  const v = norm(env.OTONOM_LEADS_NOTIFY_TO);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

export function notificationsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.OTONOM_EMAIL_PROVIDER === 'test') return env.OTONOM_EMAIL_TEST_MODE === '1' && env.VERCEL !== '1';
  const key = env.RESEND_API_KEY?.trim() ?? '';
  const from = env.OTONOM_EMAIL_FROM?.trim() ?? '';
  return env.OTONOM_EMAIL_PROVIDER === 'resend' && key.length >= 20 && senderOk(from);
}

/**
 * Sends one message. `allowedTo` is the exact recipient the caller is permitted to write to (the team mailbox for
 * alerts, the invited person's own address for an invitation); anything else is refused.
 */
export async function sendMail(mail: Mail, allowedTo: string, env: NodeJS.ProcessEnv = process.env, fetcher: FetchLike = fetch): Promise<MailResult> {
  if (!notificationsConfigured(env)) {
    console.warn('[notify] e-mail skipped: provider not configured');
    return { sent: false, reason: 'NOT_CONFIGURED' };
  }
  if (!norm(mail.to) || norm(mail.to) !== norm(allowedTo)) return { sent: false, reason: 'RECIPIENT_NOT_ALLOWED' };
  if (env.OTONOM_EMAIL_PROVIDER === 'test') {
    if (env.OTONOM_EMAIL_TEST_FAIL === '1') return { sent: false, reason: 'PROVIDER_FAILED' };
    console.info(`[notify:test] ${mail.idempotencyKey}`);
    return { sent: true, id: `test-${mail.idempotencyKey}` };
  }
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`, 'content-type': 'application/json', 'idempotency-key': mail.idempotencyKey.slice(0, 200) },
    body: JSON.stringify({ from: env.OTONOM_EMAIL_FROM!.trim(), to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!response?.ok) {
    console.warn('[notify] e-mail provider failed');
    return { sent: false, reason: 'PROVIDER_FAILED' };
  }
  const result = (await response.json().catch(() => null)) as { id?: unknown } | null;
  return typeof result?.id === 'string' ? { sent: true, id: result.id.slice(0, 200) } : { sent: false, reason: 'PROVIDER_FAILED' };
}

const PKG: Record<string, string> = { premium: 'Premium', plus: 'Plus', essential: 'Essential', unsure: 'مش متأكد / Not sure' };
const page = (title: string, body: string) =>
  `<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Arial,sans-serif;color:#0b1f35"><main style="max-width:600px;margin:auto;padding:24px"><h1 style="color:#0066cc;font-size:22px">OTONOM</h1><h2 style="font-size:18px">${escapeHtml(title)}</h2>${body}</main></body></html>`;

/** New-lead alert: name, phone, package, area and the admin link only. The subject carries only the reference. */
export function leadAlertEmail(lead: { ref: string; name: string; phone: string; package: string; area: string; id: string | number }, adminOrigin: string) {
  const link = `${adminOrigin}/admin/collections/leads/${encodeURIComponent(String(lead.id))}`;
  const subject = `طلب حجز جديد ${lead.ref} — New booking request`;
  const rows: Array<[string, string]> = [['الاسم / Name', lead.name], ['الموبايل / Mobile', lead.phone], ['الباقة / Package', PKG[lead.package] ?? lead.package], ['المنطقة / Area', lead.area]];
  const text = `${subject}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${link}`;
  const html = page(subject, `<table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:4px 8px;color:#5a6b7e">${escapeHtml(k)}</td><td style="padding:4px 8px" dir="auto">${escapeHtml(v)}</td></tr>`).join('')}</table><p><a href="${escapeHtml(link)}">افتح الطلب في لوحة الإدارة — Open in the admin</a></p>`);
  return { subject, text, html };
}

/** Daily 9:00 Cairo digest of leads still NEW after 24 hours (references and age only, no personal data). */
export function digestEmail(waiting: Array<{ ref: string; hours: number }>, adminOrigin: string) {
  const subject = `طلبات مستنية أكتر من 24 ساعة: ${waiting.length} — Leads waiting > 24h`;
  const list = waiting.map((w) => `${w.ref} (${w.hours}h)`);
  const link = `${adminOrigin}/admin/collections/leads?where[status][equals]=NEW`;
  return { subject, text: `${subject}\n\n${list.join('\n')}\n\n${link}`, html: page(subject, `<ul>${list.map((l) => `<li dir="ltr">${escapeHtml(l)}</li>`).join('')}</ul><p><a href="${escapeHtml(link)}">لوحة الإدارة — Admin</a></p>`) };
}

/** Weekly Sunday 9:00 Cairo summary: lead counts per status and the 7-day metrics (aggregates only). */
export function weeklyEmail(stats: { leadsByStatus: Record<string, number>; newLeads: number; metrics: Record<string, number> }, adminOrigin: string) {
  const subject = 'ملخص الأسبوع — OTONOM weekly summary';
  const lines = [`طلبات جديدة / New leads (7d): ${stats.newLeads}`, ...Object.entries(stats.leadsByStatus).map(([k, v]) => `${k}: ${v}`), '', ...Object.entries(stats.metrics).map(([k, v]) => `${k}: ${v}`)];
  return { subject, text: `${subject}\n\n${lines.join('\n')}\n\n${adminOrigin}/admin`, html: page(subject, `<pre style="font-family:inherit" dir="ltr">${escapeHtml(lines.join('\n'))}</pre><p><a href="${escapeHtml(adminOrigin)}/admin">لوحة الإدارة — Admin</a></p>`) };
}

/** Staff invitation: a one-time link (the token travels in the URL fragment, never in server logs). */
export function inviteEmail(link: string) {
  const subject = 'دعوة لحساب OTONOM — Your OTONOM staff account';
  const text = `${subject}\n\nافتح الرابط ده واختار كلمة السر بتاعتك، وبعدها هتفعّل التحقق الإضافي (MFA).\nOpen this link to choose your password; you will then set up MFA.\n\n${link}\n\nالرابط يُستخدم مرة واحدة وينتهي خلال 72 ساعة. / The link works once and expires in 72 hours.`;
  return { subject, text, html: page(subject, `<p>افتح الرابط واختار كلمة السر بتاعتك، وبعدها هتفعّل التحقق الإضافي (MFA).</p><p>Open the link to choose your password; you will then set up MFA.</p><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p>الرابط يُستخدم مرة واحدة وينتهي خلال 72 ساعة. / The link works once and expires in 72 hours.</p>`) };
}

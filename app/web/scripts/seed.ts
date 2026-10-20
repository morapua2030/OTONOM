// Seed SYNTHETIC local-development data only: staff accounts (credentials -> .local-secrets/dev_users.json),
// the claims registry from planning doc 11 (all non-publishable), synthetic SKUs. No real customer data, no prices.
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { getPayload } from 'payload';
import { generateSecret } from 'otplib';
import { makePool, SECRETS_DIR } from '@otonom/domain';
import config from '../src/payload.config.ts';

const CLAIMS: Array<[string, string, string, string, string, string]> = [
  ['CL-01', 'OWNER_REPORTED', 'LOW', 'Controllers available in 4, 6 and 16 channel models', 'وحدات تحكم متاحة بأربع وست وست عشرة قناة', 'Owner written confirmation of current lineup'],
  ['CL-02', 'OWNER_REPORTED', 'HIGH', 'Electrical ratings per channel/model', 'المواصفات الكهربائية لكل قناة وموديل', 'Approved datasheet revision'],
  ['CL-03', 'OWNER_REPORTED', 'LOW', 'Bluetooth-assisted setup and Wi-Fi connectivity', 'إعداد بمساعدة البلوتوث واتصال واي فاي', 'Datasheet / firmware release notes'],
  ['CL-04', 'OWNER_REPORTED', 'MEDIUM', 'Works with Alexa (listed functions)', 'يعمل مع Alexa (وظائف محددة)', 'Test report: method, versions, date, functions'],
  ['CL-05', 'OWNER_REPORTED', 'MEDIUM', 'Works with Google Home', 'يعمل مع Google Home', 'Test report'],
  ['CL-06', 'OWNER_REPORTED', 'MEDIUM', 'Works with Apple Home (no Apple certification claimed)', 'يعمل مع Apple Home (بدون ادعاء اعتماد Apple)', 'Test report + method (bridge vs native)'],
  ['CL-07', 'OWNER_REPORTED', 'MEDIUM', 'Works with Home Assistant', 'يعمل مع Home Assistant', 'Test report'],
  ['CL-08', 'OWNER_REPORTED', 'HIGH', 'Local control continues during internet outages (scope)', 'استمرار التحكم المحلي عند انقطاع الإنترنت (النطاق)', 'Offline behaviour matrix test'],
  ['CL-09', 'PROHIBITED', 'HIGH', 'Voice control works offline', 'التحكم الصوتي يعمل بدون إنترنت', 'Never publishable'],
  ['CL-10', 'PROHIBITED', 'LOW', 'Mobile apps available on App Store / Google Play', 'التطبيقات متاحة على المتاجر', 'Live store URLs (only when published)'],
  ['CL-11', 'OWNER_REPORTED', 'HIGH', 'Internal safety/quality testing performed', 'إجراء اختبارات سلامة وجودة داخلية', 'Test records'],
  ['CL-12', 'LEGALLY_BARRED', 'HIGH', 'Certified (CE/other)', 'معتمد (CE أو غيره)', 'Certificates with ID and scope'],
  ['CL-13', 'OWNER_REPORTED', 'CRITICAL', 'Gas/alarm integration (project-specific)', 'تكامل الغاز/الإنذار (حسب المشروع)', 'Project evidence + safety and legal review'],
  ['CL-14', 'OWNER_REPORTED', 'HIGH', 'Door/garage automation (project-specific)', 'أتمتة الأبواب والجراج (حسب المشروع)', 'Project evidence + security review'],
  ['CL-15', 'OWNER_REPORTED', 'MEDIUM', 'Installation capacity / nationwide coverage', 'قدرة التركيب / التغطية على مستوى الجمهورية', 'Operations statement'],
  ['CL-16', 'LEGALLY_BARRED', 'HIGH', 'Warranty period', 'مدة الضمان', 'Approved warranty policy (DR-024 BLOCKED)'],
  ['CL-17', 'OWNER_REPORTED', 'LOW', 'Designed/manufactured by OTONOM', 'تصميم/تصنيع OTONOM', 'Company facts'],
  ['CL-18', 'OWNER_REPORTED', 'MEDIUM', 'RF frequencies / radio specifics', 'ترددات الراديو', 'Datasheet'],
];

async function main() {
  const credentialsFile = process.env.OTONOM_SEED_CREDENTIALS_FILE?.trim() || 'dev_users.json';
  if (!/^[a-z0-9_-]+\.json$/.test(credentialsFile)) throw new Error('OTONOM_SEED_CREDENTIALS_FILE must be a safe JSON basename');
  const payload = await getPayload({ config });
  const creds: Record<string, unknown>[] = [];
  for (const role of ['OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR']) {
    const email = `${role.toLowerCase()}@otonom.local`;
    const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true, limit: 1 });
    if (existing.docs[0]) continue;
    const password = randomBytes(18).toString('base64url');
    const totp = generateSecret();
    const recovery = Array.from({ length: 5 }, () => randomBytes(8).toString('hex'));
    const doc = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email, password, role, totpSecret: totp, mfaEnabled: true, mfaVerifiedSids: [], lastTotpStep: 0, recoveryCodes: recovery.map((r) => createHash('sha256').update(r).digest('hex')) } as any,
    });
    creds.push({ id: doc.id, email, role, password, totp, recovery });
  }
  if (creds.length) writeFileSync(path.join(SECRETS_DIR, credentialsFile), JSON.stringify(creds, null, 2));
  for (const [code, status, impact, en, ar, evidence] of CLAIMS) {
    const ex = await payload.find({ collection: 'claims', where: { code: { equals: code } }, overrideAccess: true, limit: 1 });
    if (ex.docs[0]) continue;
    const doc = await payload.create({ collection: 'claims', overrideAccess: true, locale: 'en', data: { code, status, impact, claim: en, evidenceRequired: evidence } as any });
    await payload.update({ collection: 'claims', id: doc.id, overrideAccess: true, locale: 'ar', data: { claim: ar } as any });
  }
  await payload.updateGlobal({ slug: 'settings', data: { stage: 'PREVIEW' } as any, overrideAccess: true });
  // synthetic SKUs (scheme PROPOSED, DR-016) — no prices are seeded (prices not approved)
  const db = makePool('domain', 2);
  for (const [id, code, model] of [
    ['sku-rc04', 'SYN-RC04-A-STD', 'RC04'],
    ['sku-rc06', 'SYN-RC06-A-STD', 'RC06'],
    ['sku-rc16', 'SYN-RC16-A-STD', 'RC16'],
  ]) {
    await db.query(`INSERT INTO domain.skus(id, code, model) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [id, code, model]);
    await db.query(`INSERT INTO domain.stock_levels(sku_id, location_id, on_hand) VALUES ($1,'MAIN',0) ON CONFLICT DO NOTHING`, [id]);
  }
  await db.end();
  console.log(`seed done: ${creds.length} new staff accounts, ${CLAIMS.length} claims in registry, 3 synthetic SKUs (stock 0)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

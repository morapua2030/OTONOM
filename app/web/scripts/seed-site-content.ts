// Idempotent seed of the admin-managed site content with EXACTLY the values the site shows today
// (lib/site-content.ts DEFAULT_SITE_CONTENT), so nothing visible changes at release.
// - creates a record only when its key does not exist yet, and never overwrites anything edited in the admin;
// - publishes what it creates (the public site reads published content only);
// - the privacy text is seeded as an UNAPPROVED draft and booking requests stay OFF (owner switches them on).
// Contains no personal data, users or secrets. Usage: pnpm --filter @otonom/web seed:content [-- --dry-run]
import { getPayload } from 'payload';
import config from '../src/payload.config.ts';
import { DEFAULT_SITE_CONTENT, SERVICE_KEYS } from '../src/lib/site-content.ts';

const dryRun = process.argv.includes('--dry-run');
const ctx = { systemSeed: true };
const lines = (xs: readonly string[]) => xs.join('\n');

async function main() {
  const payload = await getPayload({ config });
  const report: Record<string, string> = {};
  const exists = async (collection: string, where: Record<string, unknown>) =>
    (await payload.find({ collection: collection as any, where: where as any, draft: true, overrideAccess: true, depth: 0, limit: 1 })).docs.length > 0;
  const create = async (collection: string, data: Record<string, unknown>, label: string) => {
    if (dryRun) return void (report[label] = 'would create');
    await payload.create({ collection: collection as any, data: { ...data, _status: 'published', reviewState: 'PUBLISHED' } as any, overrideAccess: true, draft: false, context: ctx });
    report[label] = 'created';
  };

  const d = DEFAULT_SITE_CONTENT;
  for (const [i, p] of d.packages.entries()) {
    const label = `catalog-packages:${p.id}`;
    if (await exists('catalog-packages', { packageId: { equals: p.id } })) { report[label] = 'kept'; continue; }
    await create('catalog-packages', {
      packageId: p.id, nameAr: p.name.ar, nameEn: p.name.en, priceEgp: p.priceEgp, mostComplete: !!p.badge,
      ...(p.badge ? { badgeAr: p.badge.ar, badgeEn: p.badge.en } : {}),
      items: p.items.map((it) => ({ key: it.key, nameAr: it.name.ar, nameEn: it.name.en, quantity: it.quantity, ...(it.model ? { model: it.model } : {}) })),
      order: i, active: true,
    }, label);
  }
  for (const [model, c] of Object.entries(d.controllers)) {
    const label = `catalog-controllers:${model}`;
    if (await exists('catalog-controllers', { model: { equals: model } })) { report[label] = 'kept'; continue; }
    await create('catalog-controllers', { model, nameAr: c.name.ar, nameEn: c.name.en, channels: c.channels, inPackages: c.inPackages }, label);
  }
  for (const [i, r] of d.routines.entries()) {
    const label = `sim-routines:${r.id}`;
    if (await exists('sim-routines', { routineId: { equals: r.id } })) { report[label] = 'kept'; continue; }
    await create('sim-routines', {
      routineId: r.id, titleAr: r.title.ar, titleEn: r.title.en, triggerAr: r.trigger.ar, triggerEn: r.trigger.en,
      actionsAr: lines(r.actions.ar), actionsEn: lines(r.actions.en), premium: r.premium, order: i, active: true,
    }, label);
  }
  for (const service of SERVICE_KEYS) {
    const label = `service-faqs:${service}`;
    if (await exists('service-faqs', { service: { equals: service } })) { report[label] = 'kept'; continue; }
    for (const [i, f] of d.faqs[service].entries()) {
      await create('service-faqs', { service, questionAr: f.q.ar, questionEn: f.q.en, answerAr: f.a.ar, answerEn: f.a.en, order: i, active: true }, `${label}#${i}`);
    }
  }

  // Globals: seeded only while they have never been saved (no updatedAt yet).
  const fresh = async (slug: string) => !((await payload.findGlobal({ slug: slug as any, draft: true, overrideAccess: true, depth: 0 })) as any)?.updatedAt;
  const seedGlobal = async (slug: string, data: Record<string, unknown>, publish = true) => {
    if (!(await fresh(slug))) return void (report[`global:${slug}`] = 'kept');
    if (dryRun) return void (report[`global:${slug}`] = 'would create');
    await payload.updateGlobal({ slug: slug as any, data: (publish ? { ...data, _status: 'published', reviewState: 'PUBLISHED' } : data) as any, overrideAccess: true, draft: false, context: ctx });
    report[`global:${slug}`] = 'created';
  };
  await seedGlobal('contact-settings', { phoneE164: d.contact.phoneE164, whatsappE164: d.contact.whatsappE164, addressAr: d.contact.address.ar, addressEn: d.contact.address.en, socials: [] });
  await seedGlobal('announcement', { enabled: false });
  await seedGlobal('sim-rules', { ...d.simRules });
  await seedGlobal('privacy-policy', { bodyAr: d.privacy.body.ar, bodyEn: d.privacy.body.en, lastUpdated: `${d.privacy.lastUpdated}T12:00:00.000Z`, approved: false }, false);
  await seedGlobal('intake-settings', { enabled: false, retentionMonths: 12 }, false);

  console.log(JSON.stringify({ dryRun, report }, null, 1));
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'seed failed');
  process.exit(1);
});

import type { Locale } from './i18n.ts';
import { publicMarketingOnly } from './deployment.ts';
import { commercialOperationsEnabled } from './server.ts';

async function payloadClient() {
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')]);
  return getPayload({ config });
}

/** Public read model through Payload's Local API WITHOUT overrideAccess: collection read access applies (published only). */
export async function publishedDoc(collection: 'pages' | 'case-studies', slug: string, locale: Locale) {
  if (publicMarketingOnly()) return null;
  const payload = await payloadClient();
  const r = await payload.find({ collection, where: { slug: { equals: slug } }, locale, draft: false, overrideAccess: false, depth: 0, limit: 1 });
  return (r.docs[0] as any) ?? null;
}

export async function publishedList(collection: 'pages' | 'case-studies', locale: Locale) {
  if (publicMarketingOnly()) return [];
  const payload = await payloadClient();
  const r = await payload.find({ collection, locale, draft: false, overrideAccess: false, depth: 0, limit: 200, sort: '-updatedAt' });
  return r.docs as any[];
}

export async function publishableClaims(locale: Locale) {
  if (publicMarketingOnly()) return [];
  const payload = await payloadClient();
  const r = await payload.find({ collection: 'claims', locale, overrideAccess: false, depth: 0, limit: 200 });
  return r.docs as any[];
}

export async function currentStage(): Promise<'PREVIEW' | 'COMMERCIAL'> {
  if (!commercialOperationsEnabled()) return 'PREVIEW';
  const payload = await payloadClient();
  const s: any = await payload.findGlobal({ slug: 'settings', overrideAccess: true });
  return s?.stage ?? 'PREVIEW';
}

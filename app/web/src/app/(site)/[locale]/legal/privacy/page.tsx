import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { loadSiteContent } from '@/lib/site-content.ts';
import { privacyBlocks } from '@/lib/privacy-draft.ts';
import { phoneDisplay } from '@/lib/contact.ts';
import { Bidi } from '@/components/bidi.tsx';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }> };
const TITLE = { ar: 'الخصوصية', en: 'Privacy' } as const;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({ locale, path: '/legal/privacy', title: TITLE[locale], description: locale === 'ar' ? 'إزاي OTONOM بتتعامل مع بياناتك لما تبعت طلب.' : 'How OTONOM handles your details when you send a request.' });
}

/**
 * Privacy text from the admin (final release, owner 2026-11-04; supersedes the DR-108 removal). Shown only after the
 * OWNER switches «اعتماد نص الخصوصية» on; until then this address keeps redirecting to /contact. The text is rendered
 * as plain headings and paragraphs (no HTML is interpreted).
 */
export default async function PrivacyPage({ params }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  const content = await loadSiteContent();
  if (!content.privacy.approved) redirect(`/${locale}/contact`);
  const contact = [phoneDisplay(content.contact.phoneE164), content.contact.email].filter(Boolean).join(' · ');
  const text = content.privacy.body[locale].replaceAll('{contact}', contact).replaceAll('{date}', content.privacy.lastUpdated);
  return (
    <article className="privacy-page v2-section" data-testid="privacy-page">
      <h1>{TITLE[locale]}</h1>
      {privacyBlocks(text).map((block, i) => (block.kind === 'h2' ? <h2 key={i}><Bidi text={block.text} locale={locale} /></h2> : <p key={i}><Bidi text={block.text} locale={locale} /></p>))}
    </article>
  );
}

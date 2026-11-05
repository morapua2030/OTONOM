import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { SIMD } from '@/lib/simulator/copy.ts';
import { isSimDemo } from '@/lib/simulator/rules.ts';
import { Simulator, type SimulatorContent } from '@/components/simulator/Simulator.tsx';
import { loadSiteContent } from '@/lib/site-content.ts';
import { bookingVisible } from '@/lib/leads.ts';
import { issueBookingToken } from '@/lib/booking-token.ts';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const S = SIMD[locale];
  return pageMetadata({ locale, path: '/try', title: S.nav, description: S.ui.lead });
}

/**
 * Design v4 "12 Simulator". The only value read from the URL is `?demo=`, checked against the design's `simDemo`
 * allow-list; any other value (or parameter) is ignored. The simulator itself is a client component used on this
 * route only, so its code is split away from every other page.
 */
export default async function TryPage({ params, searchParams }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  const raw = (await searchParams).demo;
  const demo = Array.isArray(raw) ? raw[0] : raw;
  // Admin-managed packages, rules, controller channels, routine texts and contact; the booking form in stage 4 only
  // when the OWNER approved the privacy text AND enabled intake (final release, owner 2026-11-04).
  const content = await loadSiteContent();
  const simContent: SimulatorContent = {
    packages: content.packages,
    simRules: content.simRules,
    controllers: Object.fromEntries(Object.entries(content.controllers).map(([model, c]) => [model, { channels: c.channels }])),
    routines: content.routines,
    contact: { phoneE164: content.contact.phoneE164, whatsappE164: content.contact.whatsappE164 },
    booking: bookingVisible({ privacyApproved: content.privacy.approved, intakeEnabled: content.intakeEnabled })
      ? { token: issueBookingToken(), privacyHref: `/${locale}/legal/privacy`, packages: content.packages.map((p) => ({ id: p.id, label: p.name.en })) }
      : null,
  };
  return <Simulator locale={locale} demo={isSimDemo(demo) && demo !== 'fresh' ? demo : null} content={simContent} />;
}

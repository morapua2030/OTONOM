import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { publishedList } from '@/lib/public.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { Bidi } from '@/components/bidi.tsx';
import { WaveCards } from '@/components/corporate.tsx';
import { wave } from '@/lib/wave1.ts';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: string }> };

const copy = {
  en: { eyebrow: 'Our work', title: 'Evidence, context and permission come before the case study.', body: 'We publish identified work only when the client has given written permission and the supporting facts are approved.', emptyTitle: 'What we can show responsibly today', emptyBody: 'No identified case study is approved for public release yet. The process below shows how work becomes reviewable without inventing clients or outcomes.' },
  ar: { eyebrow: 'أعمالنا', title: 'الدليل والسياق والموافقة تسبق دراسة الحالة.', body: 'ننشر الأعمال المعرّفة فقط بعد موافقة كتابية من العميل واعتماد الحقائق الداعمة.', emptyTitle: 'ما يمكننا عرضه بمسؤولية اليوم', emptyBody: 'لا توجد دراسة حالة معرّفة معتمدة للنشر العام بعد. يوضح المسار أدناه كيف يصبح العمل قابلًا للمراجعة دون اختلاق عملاء أو نتائج.' },
} as const;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({ locale, path: '/projects', title: copy[locale].title, description: summarise(copy[locale].body) });
}

export default async function Projects({ params }: P) {
  const { locale: l } = await params;
  if (!isLocale(l)) notFound();
  const locale = l as Locale;
  const d = copy[locale];
  const w = wave(locale);
  const cases = await publishedList('case-studies', locale);
  return (
    <>
      <section className="wave-page-hero">
        <p className="eyebrow">{d.eyebrow}</p>
        <h1><Bidi text={d.title} locale={locale} /></h1>
        <p className="wave-lead"><Bidi text={d.body} locale={locale} /></p>
      </section>
      {cases.length === 0 ? (
        <section className="wave-section">
          <div className="section-head"><h2>{d.emptyTitle}</h2><p>{d.emptyBody}</p></div>
          <WaveCards locale={locale} items={w.process} ordered />
          <p><a className="btn" href={`/${locale}/build-with-us`}>{locale === 'ar' ? 'ابدأ بمشروعك' : 'Start with your project'}</a></p>
        </section>
      ) : (
        <section className="wave-section">
          <div className="grid">
            {cases.map((item) => <a key={item.id} className="card" href={`/${locale}/projects/${item.slug}`}><strong><Bidi text={item.title} locale={locale} /></strong></a>)}
          </div>
        </section>
      )}
    </>
  );
}

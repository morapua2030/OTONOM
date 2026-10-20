import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import { publishedList } from '@/lib/public.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { Section } from '@/components/site.tsx';
import { Bidi } from '@/components/bidi.tsx';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = t(locale);
  return pageMetadata({ locale, path: '/projects', title: d.pages.projects.title, description: summarise(d.pages.projects.body) });
}

export default async function Projects({ params }: P) {
  const { locale: l } = await params;
  if (!isLocale(l)) notFound();
  const locale = l as Locale;
  const d = t(locale);
  const cases = await publishedList('case-studies', locale);
  const B = (s: string) => <Bidi text={s} locale={locale} />;
  return (
    <>
      <section className="hero">
        <h1>{B(d.pages.projects.title)}</h1>
        <p>{B(d.pages.projects.body)}</p>
      </section>
      {cases.length === 0 ? (
        <Section title={d.home.projectsTitle} locale={locale}>
          <ol>
            {d.home.pillars.map((p) => (
              <li key={p}>{B(p)}</li>
            ))}
          </ol>
          <p>
            <a className="btn" href={`/${locale}/business/request-a-proposal`}>
              {d.cta.similar}
            </a>
          </p>
        </Section>
      ) : (
        <div className="grid">
          {cases.map((c) => (
            <a key={c.id} className="card" href={`/${locale}/projects/${c.slug}`}>
              <strong>{B(c.title)}</strong>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

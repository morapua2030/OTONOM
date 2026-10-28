import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProjectBuilder } from '@/components/ProjectBuilder.tsx';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { publicRfqEnabled } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({
    locale,
    path: '/start-project',
    title: locale === 'ar' ? 'أداة OTONOM لبناء المشروع' : 'OTONOM Intelligent Project Builder',
    description: locale === 'ar' ? 'حوّل فكرتك أو نظامك الحالي إلى موجز مشروع منظم دون حفظ إجاباتك أثناء البناء.' : 'Turn an idea, prototype or existing system into a structured brief without storing your answers while you build it.',
  });
}

export default async function StartProjectPage({ params }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  return (
    <>
      <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
        <a href={`/${locale}`}>{locale === 'ar' ? 'الرئيسية' : 'Home'}</a>
        <span aria-current="page">{locale === 'ar' ? 'ابدأ مشروعك' : 'Start a project'}</span>
      </nav>
      <section className="hero compact-hero builder-hero">
        <p className="eyebrow">OTONOM PROJECT BUILDER</p>
        <h1>{locale === 'ar' ? 'ابدأ من سياقك، لا من اسم خدمة' : 'Start with your context, not a service label'}</h1>
        <p className="lead">{locale === 'ar' ? 'أجب عن أسئلة تتغير حسب نوع العميل ومرحلة المشروع ومجاله، ثم احصل على موجز واضح يمكنك الاحتفاظ به.' : 'Answer questions that adapt to the client, project stage and disciplines, then keep a clear brief you can use.'}</p>
      </section>
      <ProjectBuilder locale={locale} intakeEnabled={publicRfqEnabled()} />
    </>
  );
}

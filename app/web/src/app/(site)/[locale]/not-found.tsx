import type { Metadata } from 'next';
import { NotFoundBody } from '@/components/NotFoundBody.tsx';
import { notFoundTitle } from '@/lib/not-found.ts';

/** Localized 404 title (D8-A seo.404-title): "الصفحة غير موجودة — OTONOM" / "Page not found — OTONOM", never the bare "OTONOM". */
export async function generateMetadata({ params }: { params?: Promise<{ locale?: string }> }): Promise<Metadata> {
  const locale = (await params)?.locale;
  return { title: { absolute: notFoundTitle(locale) } };
}

export default function LocalizedNotFound() {
  return <NotFoundBody />;
}

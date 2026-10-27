import type { Locale } from './i18n.ts';

export const disciplines = {
  software: { en: 'Software', ar: 'البرمجيات', service: '/services/software-engineering' },
  iot: { en: 'IoT', ar: 'إنترنت الأشياء', service: '/services/iot-embedded' },
  embedded: { en: 'Embedded systems', ar: 'الأنظمة المدمجة', service: '/services/iot-embedded' },
  'smart-home': { en: 'Smart home', ar: 'المنازل الذكية', service: '/services/smart-home-automation' },
  custom: { en: 'Custom engineering', ar: 'الهندسة المخصصة', service: '/services/custom-engineering' },
} as const;
export type Discipline = keyof typeof disciplines;
export type PortfolioQuery = { category: Discipline | 'all'; q: string };
export type ProjectImage = { src: string; alt: string; caption?: string; width: number; height: number };
export type ProjectSection = { heading: string; body: string };
/** The only shape sent to public components. No CMS document, consent or reviewer is serialized. */
export type PublicProject = {
  slug: string; title: string; summary: string; categories: Discipline[];
  searchText: string; featured: boolean; hero?: ProjectImage; gallery: ProjectImage[];
  kind?: string; status?: string; timeframe?: string;
  challenge?: string; constraints?: string; solution: string; outcomes?: string;
  journey: ProjectSection[]; engineering: ProjectSection[];
  seoTitle?: string; seoDescription?: string;
};

export function isDiscipline(value: string): value is Discipline {
  return Object.hasOwn(disciplines, value);
}
export function portfolioQuery(values: { category?: unknown; q?: unknown }): PortfolioQuery {
  const category = typeof values.category === 'string' && isDiscipline(values.category) ? values.category : 'all';
  const q = typeof values.q === 'string' ? values.q.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 120) : '';
  return { category, q };
}
export function portfolioSearch(query: PortfolioQuery): string {
  const params = new URLSearchParams();
  if (query.category !== 'all') params.set('category', query.category);
  if (query.q) params.set('q', query.q);
  return params.size ? `?${params.toString()}` : '';
}
export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
}
export function filterProjects(projects: readonly PublicProject[], query: PortfolioQuery): PublicProject[] {
  const terms = normalizeSearch(query.q).split(' ').filter(Boolean);
  return projects.filter((project) => (query.category === 'all' || project.categories.includes(query.category)) && terms.every((term) => normalizeSearch(project.searchText).includes(term)));
}
export function relatedProjects(project: PublicProject, projects: readonly PublicProject[]): PublicProject[] {
  return projects.filter((other) => other.slug !== project.slug && other.categories.some((category) => project.categories.includes(category))).slice(0, 2);
}
export const portfolioCopy = {
  en: {
    eyebrow: 'OTONOM / Portfolio', title: 'Engineering,\nwith a story to tell.',
    intro: 'Software, connected products and intelligent spaces. Explore the thinking behind our work, one documented project at a time.',
    explore: 'Explore the work', start: 'Start your project', featured: 'In focus', all: 'All projects',
    explorer: 'Find the work that speaks to your idea.', search: 'Search projects', placeholder: 'Search by title or description', apply: 'Search', categories: 'Filter by discipline',
    results: 'projects', clear: 'Clear filters', empty: 'Good work deserves a well-told story.',
    emptyBody: 'We’re preparing our first documented project stories for publication. In the meantime, explore our services or tell us what you’re looking to build.',
    noResults: 'No projects match this search.', noResultsBody: 'Try a different phrase or clear the filters to see all published projects.',
    read: 'Explore case study', services: 'Explore our services', back: 'All projects',
    productLabel: 'A closer look / OTONOM products', productTitle: 'Meet the hardware.',
    productBody: 'Explore the OTONOM 4R, 6R and 16R product family.', productNote: 'OTONOM product imagery. These images do not document a customer installation.', productLink: 'Explore the products',
    together: 'Different disciplines. One considered approach.', togetherBody: 'Start with the part you need. Explore how software, electronics and smart environments connect through our services.',
    cta: 'An idea, a prototype, or a system to improve?', ctaBody: 'For individuals and businesses: let’s find a useful starting point for your project.',
    challenge: 'The challenge', constraints: 'Requirements & constraints', solution: 'The solution', outcomes: 'Documented outcomes', journey: 'The project journey', engineering: 'Inside the engineering', gallery: 'A closer look', related: 'Related work', relatedServices: 'Explore the disciplines', snapshot: 'Project at a glance', kind: 'Project type', status: 'Status', timeframe: 'Timeframe',
  },
  ar: {
    eyebrow: 'OTONOM / أعمالنا', title: 'وراء كل مشروع،\nحكاية هندسية.',
    intro: 'برمجيات، ومنتجات متصلة، ومساحات ذكية. اكتشف التفكير وراء العمل، من خلال مشروعات موثقة وتفاصيل تستحق أن تُروى.',
    explore: 'استكشف الأعمال', start: 'ابدأ مشروعك', featured: 'تحت الضوء', all: 'كل المشروعات',
    explorer: 'اكتشف ما يقترب من فكرتك.', search: 'ابحث في المشروعات', placeholder: 'ابحث بالعنوان أو الوصف', apply: 'بحث', categories: 'تصفية حسب التخصص',
    results: 'مشروعات', clear: 'مسح الفلاتر', empty: 'العمل الجيد يستحق حكاية متكاملة.',
    emptyBody: 'نجهّز أولى قصص مشروعاتنا الموثقة للنشر. إلى ذلك الحين، استكشف خدماتنا أو شاركنا ما تتطلع إلى بنائه.',
    noResults: 'لا توجد مشروعات تطابق بحثك.', noResultsBody: 'جرّب كلمات أخرى أو امسح الفلاتر لعرض جميع المشروعات المنشورة.',
    read: 'استكشف دراسة الحالة', services: 'استكشف خدماتنا', back: 'كل المشروعات',
    productLabel: 'نظرة أقرب / منتجات OTONOM', productTitle: 'تعرّف على الأجهزة.',
    productBody: 'استكشف عائلة منتجات OTONOM: ‏4R و6R و16R.', productNote: 'صور منتجات OTONOM، وليست توثيقًا لتركيب لدى عميل.', productLink: 'استكشف المنتجات',
    together: 'تخصصات مختلفة. وتفكير متكامل.', togetherBody: 'ابدأ بما تحتاج إليه. تعرّف على ترابط البرمجيات والإلكترونيات والبيئات الذكية من خلال خدماتنا.',
    cta: 'فكرة، أو نموذج أولي، أو نظام تريد تطويره؟', ctaBody: 'للأفراد والشركات: نساعدك على تحديد نقطة بداية مناسبة لمشروعك.',
    challenge: 'التحدي', constraints: 'المتطلبات والقيود', solution: 'الحل', outcomes: 'النتائج الموثقة', journey: 'رحلة المشروع', engineering: 'داخل التفاصيل الهندسية', gallery: 'نظرة أقرب', related: 'أعمال ذات صلة', relatedServices: 'استكشف التخصصات', snapshot: 'المشروع في لمحة', kind: 'نوع المشروع', status: 'الحالة', timeframe: 'الفترة',
  },
} satisfies Record<Locale, Record<string, string>>;

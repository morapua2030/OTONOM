// TEST ONLY. Bundled by d4-browser.ts into a loopback-only fixture server, never imported by Next routes.
import { createRoot } from 'react-dom/client';
import { PortfolioOverview, CaseStudyView } from '../src/components/portfolio.tsx';
import { LangSwitch } from '../src/components/LangSwitch.tsx';
import { portfolioQuery, type PublicProject } from '../src/lib/portfolio.ts';
import '../src/app/(site)/site.css';
import '../src/app/(site)/portfolio.css';

const locale = location.pathname.startsWith('/ar') ? 'ar' : 'en';
const params = new URLSearchParams(location.search);
const count = Number(params.get('count') ?? 3);
const fixtures: PublicProject[] = [
  { slug: 'test-only-alpha', title: locale === 'ar' ? 'وحدة تَحكُّم تجريبية' : 'Test-only controller', summary: locale === 'ar' ? 'مستشعر متصل للاختبار فقط' : 'Connected sensor for testing only', categories: ['iot', 'embedded'], searchText: 'test-only controller connected sensor وحدة تحكم مستشعر متصل', featured: true, solution: 'Test-only solution / حل تجريبي', gallery: [], journey: [], engineering: [] },
  { slug: 'test-only-beta', title: locale === 'ar' ? 'برنامج تجريبي' : 'Test-only software', summary: 'Synthetic fixture, never published.', categories: ['software', 'custom'], searchText: 'test-only software software برنامج تجريبي', featured: false, solution: 'Test-only software solution', gallery: [], journey: [], engineering: [] },
  { slug: 'test-only-gamma', title: locale === 'ar' ? 'منزل تجريبي' : 'Test-only home', summary: 'Synthetic fixture, never published.', categories: ['smart-home'], searchText: 'test-only home منزل تجريبي', featured: false, solution: 'Test-only solution', gallery: [], journey: [], engineering: [] },
];
const projects = count > 3 ? Array.from({ length: count }, (_, i) => ({ ...fixtures[i % 3], slug: `test-only-${i}` })) : fixtures.slice(0, count);
const detailed: PublicProject = { ...fixtures[0], kind: 'Test-only prototype', status: 'Test-only status', timeframe: 'Test-only timeframe', challenge: 'Synthetic challenge. '.repeat(20), constraints: 'Synthetic constraint.', outcomes: 'Synthetic result for template testing only.', journey: [{ heading: 'Test step', body: 'Synthetic stage.' }], engineering: [{ heading: 'Test hardware', body: 'Synthetic engineering detail.' }], hero: { src: '/products/otonom-16r.png', width: 1254, height: 1254, alt: 'Existing product asset in a synthetic LOCAL template test, not project proof' }, gallery: [{ src: '/products/otonom-4r.png', width: 1254, height: 1254, alt: 'Test layout only' }] };
document.documentElement.lang = locale;
document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
createRoot(document.getElementById('root')!).render(<><p>LOCAL SYNTHETIC TEST — NOT PUBLIC CONTENT</p><LangSwitch locale={locale} label={locale === 'ar' ? 'English' : 'العربية'} /><main className="wrap">{location.pathname.endsWith('/test-only-alpha') ? <CaseStudyView locale={locale} project={params.has('minimal') ? fixtures[0] : detailed} projects={projects} /> : <PortfolioOverview locale={locale} projects={projects} query={portfolioQuery(Object.fromEntries(params))} />}</main></>);

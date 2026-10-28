import Image from 'next/image';
import type { Locale } from '../lib/i18n.ts';
import { disciplines, portfolioCopy, relatedProjects, type PortfolioQuery, type PublicProject } from '../lib/portfolio.ts';
import { Bidi } from './bidi.tsx';
import { ProjectExplorer } from './ProjectExplorer.tsx';
import { ProjectCard } from './ProjectCard.tsx';

export function PortfolioCTA({ locale }: { locale: Locale }) {
  const d = portfolioCopy[locale];
  return <section className="pf-cta"><div><h2>{d.cta}</h2><p>{d.ctaBody}</p></div><a className="btn" href={`/${locale}/start-project`}>{d.start}<span aria-hidden="true"> ↗</span></a></section>;
}
export function PortfolioOverview({ locale, projects, query }: { locale: Locale; projects: PublicProject[]; query: PortfolioQuery }) {
  const d = portfolioCopy[locale];
  const featured = projects.filter((project) => project.featured).slice(0, 2);
  return <div className="pf-page">
    <section className="pf-hero"><p className="eyebrow"><Bidi text={d.eyebrow} locale={locale} /></p><h1>{d.title}</h1><div className="pf-hero-foot"><p>{d.intro}</p><div className="pf-actions"><a className="btn" href="#project-explorer">{d.explore}<span aria-hidden="true"> ↓</span></a><a href={`/${locale}/start-project`}>{d.start}</a></div></div></section>
    {featured.length > 0 && <section className="pf-featured" aria-labelledby="pf-featured-title"><h2 id="pf-featured-title">{d.featured}</h2>{featured.map((project) => <ProjectCard key={project.slug} project={project} locale={locale} featured />)}</section>}
    <ProjectExplorer projects={projects} locale={locale} initialQuery={query} />
    <section className="pf-product" aria-labelledby="pf-product-title">
      <div className="pf-product-copy"><p className="eyebrow"><Bidi text={d.productLabel} locale={locale} /></p><h2 id="pf-product-title">{d.productTitle}</h2><p><Bidi text={d.productBody} locale={locale} /></p><a className="pf-text-link" href={`/${locale}/products`}>{d.productLink}<span aria-hidden="true"> ↗</span></a></div>
      <figure><div className="pf-product-photos"><Image src="/products/otonom-16r.png" width={1254} height={1254} alt={locale === 'ar' ? 'صورة منتج OTONOM 16R' : 'OTONOM 16R product image'} sizes="(max-width: 760px) 90vw, 50vw" /><div><Image src="/products/otonom-4r.png" width={1254} height={1254} alt={locale === 'ar' ? 'صورة منتج OTONOM 4R' : 'OTONOM 4R product image'} sizes="(max-width: 760px) 40vw, 20vw" /><Image src="/products/otonom-6r.png" width={1254} height={1254} alt={locale === 'ar' ? 'صورة منتج OTONOM 6R' : 'OTONOM 6R product image'} sizes="(max-width: 760px) 40vw, 20vw" /></div></div><figcaption><Bidi text={d.productNote} locale={locale} /></figcaption></figure>
    </section>
    <section className="pf-disciplines"><div><h2>{d.together}</h2><p>{d.togetherBody}</p></div><ul>{Object.entries(disciplines).map(([key, category], i) => <li key={key}><a href={`/${locale}${category.service}`}><span aria-hidden="true">0{i + 1}</span>{category[locale]}<span aria-hidden="true">↗</span></a></li>)}</ul></section>
    <PortfolioCTA locale={locale} />
  </div>;
}
export function CaseStudyView({ locale, project, projects }: { locale: Locale; project: PublicProject; projects: PublicProject[] }) {
  const d = portfolioCopy[locale];
  const related = relatedProjects(project, projects);
  const paragraphs = (body: string) => body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>);
  const section = (title: string, body?: string) => body ? <section className="pf-narrative"><h2>{title}</h2><div>{paragraphs(body)}</div></section> : null;
  const snapshot = [[d.kind, project.kind], [d.status, project.status], [d.timeframe, project.timeframe]].filter(([, value]) => value);
  return <article className="pf-page pf-case">
    <nav className="pf-breadcrumb" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}><a href={`/${locale}`}>OTONOM</a><span aria-hidden="true"> / </span><a href={`/${locale}/projects`}>{d.back}</a></nav>
    <header className="pf-hero"><ul className="pf-tags">{project.categories.map((category) => <li key={category}>{disciplines[category][locale]}</li>)}</ul><h1>{project.title}</h1><p className="pf-summary">{project.summary}</p></header>
    {project.hero && <figure className="pf-case-hero"><Image src={project.hero.src} alt={project.hero.alt} width={project.hero.width} height={project.hero.height} sizes="(max-width: 1280px) 100vw, 1280px" priority />{project.hero.caption && <figcaption>{project.hero.caption}</figcaption>}</figure>}
    {snapshot.length > 0 && <section className="pf-snapshot" aria-label={d.snapshot}><dl>{snapshot.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
    {section(d.challenge, project.challenge)}{section(d.constraints, project.constraints)}
    {project.journey.length > 0 && <section className="pf-narrative"><h2>{d.journey}</h2><ol className="pf-journey">{project.journey.map((step, i) => <li key={i}><h3>{step.heading}</h3>{paragraphs(step.body)}</li>)}</ol></section>}
    {section(d.solution, project.solution)}
    {project.engineering.length > 0 && <section className="pf-engineering"><h2>{d.engineering}</h2><div className="pf-grid">{project.engineering.map((block, i) => <section key={i}><h3>{block.heading}</h3>{paragraphs(block.body)}</section>)}</div></section>}
    {project.gallery.length > 0 && <section className="pf-gallery"><h2>{d.gallery}</h2><div className="pf-grid">{project.gallery.map((image) => <figure key={image.src}><Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 760px) 100vw, 50vw" />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div></section>}
    {section(d.outcomes, project.outcomes)}
    <section className="pf-related-services"><h2>{d.relatedServices}</h2><ul>{project.categories.map((category) => <li key={category}><a href={`/${locale}${disciplines[category].service}`}>{disciplines[category][locale]} ↗</a></li>)}</ul></section>
    {related.length > 0 && <section className="pf-related"><h2>{d.related}</h2><div className="pf-grid">{related.map((item) => <ProjectCard key={item.slug} project={item} locale={locale} />)}</div></section>}
    <PortfolioCTA locale={locale} />
  </article>;
}

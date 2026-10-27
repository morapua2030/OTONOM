import Image from 'next/image';
import type { Locale } from '../lib/i18n.ts';
import { disciplines, portfolioCopy, type PublicProject } from '../lib/portfolio.ts';

export function ProjectCard({ project, locale, featured = false }: { project: PublicProject; locale: Locale; featured?: boolean }) {
  const d = portfolioCopy[locale];
  return <article className={`pf-card${featured ? ' pf-card-featured' : ''}`} data-project={project.slug}>
    <a href={`/${locale}/projects/${project.slug}`} className="pf-card-link">
      <div className={`pf-card-image${project.hero ? '' : ' pf-no-photo'}`}>
        {project.hero ? <Image src={project.hero.src} alt={project.hero.alt} width={project.hero.width} height={project.hero.height} sizes={featured ? '(max-width: 760px) 100vw, 80vw' : '(max-width: 760px) 100vw, 50vw'} /> : <span aria-hidden="true">OTONOM<span> / {d.eyebrow.split('/')[1]}</span></span>}
      </div>
      <div className="pf-card-copy">
        <ul className="pf-tags" aria-label={d.categories}>{project.categories.map((category) => <li key={category}>{disciplines[category][locale]}</li>)}</ul>
        <h3>{project.title}</h3><p>{project.summary}</p>
        {project.status && <p className="pf-status">{project.status}</p>}
        <span className="pf-text-link">{d.read}<span aria-hidden="true"> ↗</span></span>
      </div>
    </a>
  </article>;
}

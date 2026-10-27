'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Locale } from '../lib/i18n.ts';
import { disciplines, filterProjects, portfolioCopy, portfolioQuery, portfolioSearch, type PortfolioQuery, type PublicProject, type Discipline } from '../lib/portfolio.ts';
import { ProjectCard } from './ProjectCard.tsx';
import { Bidi } from './bidi.tsx';

export function ProjectExplorer({ projects, locale, initialQuery }: { projects: PublicProject[]; locale: Locale; initialQuery: PortfolioQuery }) {
  const [query, setQuery] = useState(initialQuery);
  const [input, setInput] = useState(initialQuery.q);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const d = portfolioCopy[locale];
  const visible = filterProjects(projects, query);
  const available = (Object.keys(disciplines) as Discipline[]).filter((category) => projects.some((project) => project.categories.includes(category)) || query.category === category);
  const href = (value: PortfolioQuery) => `/${locale}/projects${portfolioSearch(value)}#project-explorer`;
  const commit = (value: PortfolioQuery, replace = false) => {
    clearTimeout(timer.current);
    const next = portfolioQuery(value);
    setQuery(next); setInput(next.q);
    const url = `/${locale}/projects${portfolioSearch(next)}`;
    if (location.pathname + location.search !== url) history[replace ? 'replaceState' : 'pushState'](null, '', url);
    window.dispatchEvent(new Event('otonom:portfolio-query'));
  };
  useEffect(() => {
    const restore = () => {
      clearTimeout(timer.current);
      const params = new URLSearchParams(location.search);
      const next = portfolioQuery({ category: params.get('category'), q: params.get('q') });
      setQuery(next); setInput(next.q);
    };
    window.addEventListener('popstate', restore);
    return () => { window.removeEventListener('popstate', restore); clearTimeout(timer.current); };
  }, []);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    commit({ ...query, q: input });
  }
  return <section className="pf-explorer" id="project-explorer" aria-labelledby="pf-explorer-title">
    <div className="pf-section-heading"><p className="eyebrow">{d.all}</p><h2 id="pf-explorer-title">{d.explorer}</h2></div>
    <form action={`/${locale}/projects#project-explorer`} method="get" onSubmit={search} role="search" className="pf-search">
      {query.category !== 'all' && <input type="hidden" name="category" value={query.category} />}
      <label htmlFor="project-search">{d.search}</label>
      <div className="pf-search-row"><input id="project-search" name="q" type="search" maxLength={120} placeholder={d.placeholder} value={input} onChange={(event) => {
        const value = event.target.value;
        setInput(value); setQuery({ ...query, q: value });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => commit({ ...query, q: value }), 350);
      }} /><button className="btn" type="submit">{d.apply}</button></div>
    </form>
    <nav className="pf-filters" aria-label={d.categories}>
      {(['all', ...available] as const).map((category) => <a key={category} href={href({ category, q: input })} aria-current={query.category === category ? 'true' : undefined} onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); commit({ category, q: input });
      }}>{category === 'all' ? d.all : disciplines[category][locale]} <span>({category === 'all' ? projects.length : projects.filter((project) => project.categories.includes(category)).length})</span></a>)}
    </nav>
    <div className="pf-results-bar"><p role="status" aria-live="polite" aria-atomic="true"><Bidi text={`${visible.length} ${d.results}`} locale={locale} /></p>{(query.q || query.category !== 'all') && <a href={href({ category: 'all', q: '' })} onClick={(event) => { event.preventDefault(); commit({ category: 'all', q: '' }); document.getElementById('project-search')?.focus(); }}>{d.clear}</a>}</div>
    {visible.length ? <div className="pf-grid">{visible.map((project) => <ProjectCard key={project.slug} project={project} locale={locale} />)}</div> : <div className="pf-empty">
      <span className="pf-empty-mark" aria-hidden="true">O.</span><div><h3>{projects.length ? d.noResults : d.empty}</h3><p>{projects.length ? d.noResultsBody : d.emptyBody}</p><a className="pf-text-link" href={`/${locale}/services`}>{d.services}<span aria-hidden="true"> ↗</span></a></div>
    </div>}
  </section>;
}

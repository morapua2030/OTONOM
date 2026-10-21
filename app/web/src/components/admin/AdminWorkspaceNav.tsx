'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import s from './staff.module.css';

export type WorkspaceLink = {
  href: string;
  label: string;
  labelAr: string;
  description: string;
  group: 'Operate' | 'Govern';
};

export function AdminWorkspaceNav({ links }: { links: WorkspaceLink[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return links;
    return links.filter((link) => `${link.label} ${link.labelAr} ${link.description}`.toLocaleLowerCase().includes(needle));
  }, [links, query]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  return (
    <div className={s.navPanel} data-testid="staff-nav">
      <div className={s.navBrand} aria-label="OTONOM administration">
        <span className={s.navMark} aria-hidden="true">O</span>
        <span><strong>OTONOM</strong><small>Control workspace</small></span>
      </div>
      <label className={s.navSearch}>
        <span className={s.srOnly}>Search authorized workspaces</span>
        <span aria-hidden="true">⌕</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find workspace…"
          autoComplete="off"
        />
        <kbd aria-hidden="true">/</kbd>
      </label>
      {(['Operate', 'Govern'] as const).map((group) => {
        const grouped = visible.filter((link) => link.group === group);
        if (!grouped.length) return null;
        return (
          <nav className={s.nav} aria-label={`${group} workspaces`} key={group}>
            <span className={s.navGroup}>{group === 'Operate' ? 'Operations / التشغيل' : 'Governance / الحوكمة'}</span>
            {grouped.map((link) => {
              const active = pathname === link.href;
              return (
                <a key={link.href} href={link.href} aria-current={active ? 'page' : undefined}>
                  <span><b>{link.label}</b><small lang="ar" dir="rtl">{link.labelAr}</small></span>
                  <span className={s.navArrow} aria-hidden="true">›</span>
                </a>
              );
            })}
          </nav>
        );
      })}
      {!visible.length && <p className={s.navEmpty}>No authorized workspace matches your search.</p>}
    </div>
  );
}

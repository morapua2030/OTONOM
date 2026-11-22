'use client';
import { usePathname } from 'next/navigation';
import { Link } from '@payloadcms/ui';
import { Icon } from './icons.tsx';
import { isCurrent, type NavIcon, type NavPage } from './nav-types.ts';

export type NavLinkGroup = { key: string; label: string; pages: Array<{ key: string; href: string; icon: NavIcon; label: string; match?: readonly string[] }> };

/** The menu rows (client: the current row follows the URL). Rows look like the site's mobile drawer. */
export function NavLinks({ groups }: { groups: NavLinkGroup[] }) {
  const pathname = usePathname() ?? '';
  return (
    <div className="otn-nav__groups">
      {groups.map((g) => (
        <div key={g.key} className="otn-nav__group" role="group" aria-labelledby={`otn-nav-group-${g.key}`}>
          {/* Home is one row: its group title would only repeat the row */}
          <span className={g.key === 'home' ? 'otn-nav__group-title otn-sr-only' : 'otn-nav__group-title'} id={`otn-nav-group-${g.key}`}>{g.label}</span>
          <ul className="otn-nav__list">
            {g.pages.map((p) => {
              const current = isCurrent(p as unknown as NavPage, pathname);
              return (
                <li key={p.key}>
                  <Link className="otn-nav__link" href={p.href} prefetch={false} aria-current={current ? 'page' : undefined} id={`otn-nav-${p.key}`}>
                    <Icon name={p.icon} />
                    <span>{p.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AccountLink({ href, label, icon }: { href: string; label: string; icon: NavIcon }) {
  const pathname = usePathname() ?? '';
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className="otn-nav__link otn-nav__link--quiet" href={href} prefetch={false} aria-current={current ? 'page' : undefined} id="otn-nav-account-security">
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  );
}

import type { ServerProps } from 'payload';
import { NavHamburger, NavWrapper } from '@payloadcms/next/client';
import { Link } from '@payloadcms/ui';
import { langOf, PAGE, pick, UI } from './copy.ts';
import { Icon } from './icons.tsx';
import { A11yFixes } from './A11yFixes.tsx';
import { AdminLanguageSwitch } from './LanguageSwitch.tsx';
import { NavAutoOpen } from './NavAutoOpen.tsx';
import { ACCOUNT_PAGE, menuFor } from './nav-model.ts';
import { AccountLink, NavLinks } from './NavLinks.tsx';

/**
 * The admin menu (R3, M3): the official wordmark, the language switch, the 6 groups filtered by role, then the
 * person's own account security and «Sign out». Navigation only: every page re-checks access on its own.
 * Payload's NavWrapper/NavHamburger keep the built-in open/close and mobile behaviour.
 */
export function AdminNav(props: ServerProps) {
  const role = (props.user as { role?: string } | undefined)?.role;
  const lang = langOf(props.i18n?.language);
  const groups = menuFor(role).map((g) => ({
    key: g.key,
    label: pick(g.label, lang),
    pages: g.pages.map((p) => ({ key: p.key, href: p.href, icon: p.icon, match: p.match, label: pick(p.label, lang) })),
  }));
  const roleLabel = role && role in UI.role ? pick(UI.role[role as keyof typeof UI.role], lang) : '';
  return (
    <NavWrapper baseClass="nav">
      <NavAutoOpen />
      <A11yFixes />
      <nav className="nav__wrap otn-nav" aria-label={pick(UI.mainMenu, lang)} data-testid="staff-nav">
        <div className="otn-nav__brand">
          <Link href="/admin" prefetch={false} className="otn-nav__logo" aria-label={pick(UI.brand, lang)}>
            {/* official Hybrid 03 artwork, byte-for-byte; never mirrored in RTL */}
            {/* eslint-disable-next-line @next/next/no-img-element -- the official logo file is shown byte-for-byte (brand guardian) */}
            <img src="/brand/otonom/assets/svg/wordmark_only_light.svg" alt="OTONOM" width={820} height={162} />
          </Link>
          <AdminLanguageSwitch />
        </div>
        <NavLinks groups={groups} />
        <div className="otn-nav__footer">
          {roleLabel ? <p className="otn-nav__who">{pick(UI.signedInAs, lang)}: <strong>{roleLabel}</strong></p> : null}
          <AccountLink href={ACCOUNT_PAGE.href} icon={ACCOUNT_PAGE.icon} label={pick(PAGE.accountSecurity.name, lang)} />
          <Link className="otn-nav__link otn-nav__link--quiet" href="/admin/logout" prefetch={false} id="otn-nav-logout">
            <Icon name="logout" />
            <span>{pick(UI.logout, lang)}</span>
          </Link>
        </div>
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  );
}

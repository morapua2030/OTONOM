import type { Permission } from '@otonom/domain';

/** Menu types and the "current page" rule, with no runtime imports (safe in client components). */
export type NavPageKey =
  | 'home' | 'leads' | 'siteNumbers' | 'packages' | 'controllers' | 'media' | 'announcement' | 'faqs' | 'contact'
  | 'simRoutines' | 'simRules' | 'privacy' | 'bookingForm' | 'users' | 'accountSecurity' | 'reports' | 'settings' | 'hidden';
export type NavIcon =
  | 'home' | 'inbox' | 'chart' | 'box' | 'chip' | 'image' | 'megaphone' | 'help' | 'phone' | 'route' | 'sliders'
  | 'shield' | 'form' | 'users' | 'lock' | 'report' | 'gear' | 'eyeOff';

export type NavPage = {
  key: NavPageKey;
  href: string;
  icon: NavIcon;
  /** any of these permissions shows the page; 'staff' = every signed-in staff member */
  perms: readonly Permission[] | 'staff';
  /** extra path prefixes that mark this page as the current one */
  match?: readonly string[];
};

/** Is `pathname` the page `page` (or below it)? Home matches only /admin and /admin/overview exactly. */
export function isCurrent(page: NavPage, pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (page.href === '/admin') return clean === '/admin' || (page.match ?? []).includes(clean);
  return [page.href, ...(page.match ?? [])].some((h) => clean === h || clean.startsWith(`${h}/`));
}


import type { ServerProps } from 'payload';
import { can } from '@otonom/domain';
import s from './staff.module.css';

/** Role-aware links to the staff workspaces (navigation only — each view and endpoint re-checks permissions). */
export function StaffNav({ user }: ServerProps) {
  // rendered only inside admin pages, which Payload (and our custom views) already restrict to MFA-verified staff
  const role = (user as any)?.role as string | undefined;
  const links = [
    { href: '/admin/overview', label: 'Overview', show: !!role },
    { href: '/admin/workspace', label: 'Projects workspace', show: can(role, 'crm.read') },
    { href: '/admin/content-review', label: 'Content review', show: can(role, 'content.edit') || can(role, 'content.review') || can(role, 'content.publish') },
    { href: '/admin/kpi', label: 'KPI dashboard', show: can(role, 'kpi.read') },
    { href: '/admin/store-ops', label: 'Store operations', show: can(role, 'order.confirm') || can(role, 'price.approve') },
    { href: '/admin/service-desk', label: 'Service desk', show: can(role, 'service.manage') },
  ].filter((l) => l.show);
  if (!links.length) return null;
  return (
    <nav className={s.nav} aria-label="Staff workspaces" data-testid="staff-nav">
      <span>Workspaces</span>
      {links.map((l) => (
        <a key={l.href} href={l.href}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}

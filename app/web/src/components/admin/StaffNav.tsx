import type { ServerProps } from 'payload';
import { can } from '@otonom/domain';
import { AdminWorkspaceNav, type WorkspaceLink } from './AdminWorkspaceNav.tsx';

/** Role-aware links to the staff workspaces (navigation only — each view and endpoint re-checks permissions). */
export function StaffNav({ user }: ServerProps) {
  // rendered only inside admin pages, which Payload (and our custom views) already restrict to MFA-verified staff
  const role = (user as any)?.role as string | undefined;
  const links = [
    { href: '/admin/overview', label: 'Overview', labelAr: 'نظرة عامة', description: 'Daily priorities and safety gates', group: 'Operate', show: !!role },
    { href: '/admin/workspace', label: 'Projects workspace', labelAr: 'المشروعات والعملاء', description: 'CRM, RFQs and opportunities', group: 'Operate', show: can(role, 'crm.read') },
    { href: '/admin/store-ops', label: 'Store operations', labelAr: 'الطلبات والمخزون', description: 'Orders, inventory, serials and prices', group: 'Operate', show: can(role, 'order.confirm') || can(role, 'price.approve') },
    { href: '/admin/service-desk', label: 'Service desk', labelAr: 'الخدمة والضمان', description: 'Tickets, ownership and RMA', group: 'Operate', show: can(role, 'service.manage') },
    { href: '/admin/product-drafts', label: 'Product drafts', labelAr: 'مسودات المنتجات', description: 'Bilingual merchandising review', group: 'Govern', show: can(role, 'product.draft') || can(role, 'product.approve') },
    { href: '/admin/content-review', label: 'Content review', labelAr: 'مراجعة المحتوى', description: 'Editorial approval workflow', group: 'Govern', show: can(role, 'content.edit') || can(role, 'content.review') || can(role, 'content.publish') },
    { href: '/admin/kpi', label: 'KPI dashboard', labelAr: 'مؤشرات الأداء', description: 'Evidence-based commercial reporting', group: 'Govern', show: can(role, 'kpi.read') },
  ].filter((link) => link.show).map(({ show: _show, ...link }) => link) as WorkspaceLink[];
  if (!links.length) return null;
  return <AdminWorkspaceNav links={links} />;
}

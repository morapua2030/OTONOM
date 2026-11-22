import { can, type Permission } from '@otonom/domain';
import { GROUP, PAGE, type Pair } from './copy.ts';
import type { NavIcon, NavPage, NavPageKey } from './nav-types.ts';
export { isCurrent, type NavIcon, type NavPage, type NavPageKey } from './nav-types.ts';

/**
 * The admin menu (R3, M3): 6 groups in a fixed order. Navigation only — every page and endpoint keeps its own access
 * check, and hidden pages keep their routes (they are reachable from «Hidden pages»).
 *
 * Who sees what (decided with can(role, …)):
 * - everyone signed in sees Home;
 * - a page shows when the role can WORK ON it: the permission its collection/global needs to save, or, for a view,
 *   the permission the view itself checks (views are read-only screens);
 * - a group shows when at least one of its pages shows. Read-only access alone never adds a page.
 */
export type NavGroupKey = keyof typeof GROUP;
export const NAV: ReadonlyArray<{ key: NavGroupKey; pages: readonly NavPage[] }> = [
  { key: 'home', pages: [{ key: 'home', href: '/admin', icon: 'home', perms: 'staff', match: ['/admin/overview'] }] },
  {
    key: 'bookings',
    pages: [
      { key: 'leads', href: '/admin/collections/leads', icon: 'inbox', perms: ['leads.write'] },
      { key: 'siteNumbers', href: '/admin/sales', icon: 'chart', perms: ['metrics.read'] },
    ],
  },
  {
    key: 'catalog',
    pages: [
      { key: 'packages', href: '/admin/collections/catalog-packages', icon: 'box', perms: ['content.edit'] },
      { key: 'controllers', href: '/admin/collections/catalog-controllers', icon: 'chip', perms: ['content.edit'] },
    ],
  },
  { key: 'photos', pages: [{ key: 'media', href: '/admin/collections/media', icon: 'image', perms: ['content.edit', 'content.publish'] }] },
  {
    key: 'site',
    pages: [
      { key: 'announcement', href: '/admin/globals/announcement', icon: 'megaphone', perms: ['content.edit'] },
      { key: 'faqs', href: '/admin/collections/service-faqs', icon: 'help', perms: ['content.edit'] },
      { key: 'contact', href: '/admin/globals/contact-settings', icon: 'phone', perms: ['content.edit'] },
      { key: 'simRoutines', href: '/admin/collections/sim-routines', icon: 'route', perms: ['content.edit'] },
      { key: 'simRules', href: '/admin/globals/sim-rules', icon: 'sliders', perms: ['settings.stage'] },
      { key: 'privacy', href: '/admin/globals/privacy-policy', icon: 'shield', perms: ['content.edit'] },
    ],
  },
  {
    key: 'settings',
    pages: [
      { key: 'bookingForm', href: '/admin/globals/intake-settings', icon: 'form', perms: ['intake.settings'] },
      { key: 'users', href: '/admin/collections/users', icon: 'users', perms: ['user.role_change'] },
      { key: 'reports', href: '/admin/kpi', icon: 'report', perms: ['kpi.read'] },
      { key: 'settings', href: '/admin/globals/settings', icon: 'gear', perms: ['settings.stage'] },
      // OWNER only (settings.stage is an OWNER-only permission)
      { key: 'hidden', href: '/admin/hidden-pages', icon: 'eyeOff', perms: ['settings.stage'] },
    ],
  },
];

/**
 * Account security is personal (every staff member's own password and two-step sign-in), so it sits with «Sign out»
 * at the bottom of the menu for everyone, not inside a group (written reason: the inventory, M3).
 */
export const ACCOUNT_PAGE: NavPage = { key: 'accountSecurity', href: '/admin/account-security', icon: 'lock', perms: 'staff' };

export const pageAllowed = (role: string | undefined | null, page: NavPage) =>
  !!role && (page.perms === 'staff' ? true : page.perms.some((p) => can(role, p)));

export type VisibleGroup = { key: NavGroupKey; label: Pair; pages: Array<NavPage & { label: Pair }> };

/** The menu for one role (pure: used by the nav and by the per-role test). */
export function menuFor(role: string | undefined | null): VisibleGroup[] {
  if (!role) return [];
  return NAV.map((g) => ({
    key: g.key,
    label: GROUP[g.key],
    pages: g.pages.filter((p) => pageAllowed(role, p)).map((p) => ({ ...p, label: PAGE[p.key].name })),
  })).filter((g) => g.pages.length > 0);
}

/** Pages that are hidden from the menu but keep their routes (M3); listed on «Hidden pages». */
export const HIDDEN_PAGES: ReadonlyArray<{ href: string; name: Pair; line: Pair }> = [
  { href: '/admin/collections/pages', name: { ar: 'صفحات الموقع (قديمة)', en: 'Site pages (old)' }, line: { ar: 'نظام صفحات قديم. الموقع الحالي مش بيستخدمه.', en: 'An older page system. The current site does not use it.' } },
  { href: '/admin/collections/claims', name: { ar: 'الادعاءات', en: 'Claims' }, line: { ar: 'سجل الادعاءات اللي محتاجة دليل قبل ما تتنشر.', en: 'Claims that need evidence before they can be published.' } },
  { href: '/admin/collections/case-studies', name: { ar: 'قصص المشاريع', en: 'Case studies' }, line: { ar: 'قصص مشاريع للعملاء. فاضية دلوقتي.', en: 'Customer project stories. Empty for now.' } },
  { href: '/admin/collections/consents', name: { ar: 'موافقات الصور', en: 'Photo consents' }, line: { ar: 'موافقات العملاء على نشر صور بيوتهم.', en: "Customers' permission to publish photos of their homes." } },
  { href: '/admin/collections/organisations', name: { ar: 'الشركات', en: 'Organisations' }, line: { ar: 'شركات العملاء للمشاريع الكبيرة. مش مستخدمة دلوقتي.', en: 'Client companies for larger projects. Not in use now.' } },
  { href: '/admin/collections/contacts', name: { ar: 'جهات الاتصال', en: 'Contacts' }, line: { ar: 'أشخاص تبع الشركات دي. مش مستخدمة دلوقتي.', en: 'People at those companies. Not in use now.' } },
  { href: '/admin/collections/rfqs', name: { ar: 'طلبات عروض الأسعار', en: 'Quote requests' }, line: { ar: 'طلبات عروض أسعار للمشاريع. مش مستخدمة دلوقتي.', en: 'Project quote requests. Not in use now.' } },
  { href: '/admin/collections/opportunities', name: { ar: 'الفرص', en: 'Opportunities' }, line: { ar: 'متابعة فرص البيع للمشاريع. مش مستخدمة دلوقتي.', en: 'Project sales follow-up. Not in use now.' } },
  { href: '/admin/collections/private-files', name: { ar: 'ملفات خاصة', en: 'Private files' }, line: { ar: 'ملفات المشاريع الخاصة. فاضية دلوقتي.', en: 'Private project files. Empty for now.' } },
  { href: '/admin/workspace', name: { ar: 'مساحة المشاريع', en: 'Projects workspace' }, line: { ar: 'شركات وطلبات وفرص المشاريع في مكان واحد.', en: 'Project companies, requests and opportunities in one place.' } },
  { href: '/admin/store-ops', name: { ar: 'الطلبات والمخزون', en: 'Orders and stock' }, line: { ar: 'البيع أونلاين مقفول، فالصفحة دي مش مستخدمة.', en: 'Online selling is off, so this page is not in use.' } },
  { href: '/admin/service-desk', name: { ar: 'الخدمة والضمان', en: 'Service and warranty' }, line: { ar: 'تذاكر الخدمة والضمان. فاضية دلوقتي.', en: 'Service and warranty tickets. Empty for now.' } },
  { href: '/admin/product-drafts', name: { ar: 'مسودات المنتجات', en: 'Product drafts' }, line: { ar: 'مراجعة منتجات جديدة قبل البيع. فاضية دلوقتي.', en: 'Review of new products before sale. Empty for now.' } },
  { href: '/admin/content-review', name: { ar: 'مراجعة المحتوى', en: 'Content review' }, line: { ar: 'مراجعة صفحات وقصص المشاريع قبل النشر.', en: 'Review of pages and project stories before publishing.' } },
];

import type { ServerProps } from 'payload';
import { Link } from '@payloadcms/ui';
import { can } from '@otonom/domain';
import { LEAD_STATUSES } from '@/lib/leads.ts';
import { langOf, LEAD_STATUS_COPY, pick, UI } from '../copy.ts';
import { count as fmtCount } from '../format.ts';

type Props = ServerProps & { searchParams?: Record<string, string | string[] | undefined>; permissions?: any };

/** The status filter in the URL, in either form Payload uses (flat, or rewritten to or[0][and][0]). */
function currentStatus(searchParams: Props['searchParams']): string | null {
  for (const [k, v] of Object.entries(searchParams ?? {})) if (/status\]\[equals\]$/.test(k) && typeof v === 'string') return v;
  return null;
}

/**
 * Quick filters above the bookings table (R3, M6): All + each status, with counts. The links only set the URL filter
 * Payload's list already understands; the list itself still loads through Payload with the person's own access.
 * Counts are shown only when Payload's permissions for this request allow reading bookings (MFA included).
 */
export async function LeadQuickFilters(props: Props) {
  const role = (props.user as { role?: string } | undefined)?.role;
  const lang = langOf(props.i18n?.language);
  const readable = !!props.permissions?.collections?.leads?.read && can(role, 'leads.read');
  if (!readable || !props.payload) return null;
  const countWhere = async (where?: Record<string, unknown>) =>
    (await props.payload!.count({ collection: 'leads', where: where as any, overrideAccess: true })).totalDocs;
  const [all, ...per] = await Promise.all([countWhere(), ...LEAD_STATUSES.map((s) => countWhere({ status: { equals: s.value } }))]);
  const active = currentStatus(props.searchParams);
  const chips = [
    { key: 'ALL', label: pick(UI.all, lang), n: all, href: '/admin/collections/leads', current: !active },
    ...LEAD_STATUSES.map((s, i) => ({
      key: s.value,
      label: pick(LEAD_STATUS_COPY[s.value].label, lang),
      n: per[i] ?? 0,
      href: `/admin/collections/leads?where%5Bstatus%5D%5Bequals%5D=${s.value}`,
      current: active === s.value,
    })),
  ];
  return (
    <nav className="otn-filters" aria-label={pick(UI.quickFilters, lang)} data-testid="lead-quick-filters">
      {chips.map((c) => (
        <Link key={c.key} href={c.href} prefetch={false} className={`otn-filter otn-filter--${c.key}`} aria-current={c.current ? 'page' : undefined} data-status={c.key}>
          <span>{c.label}</span>
          <span className="otn-filter__n">{fmtCount(c.n)}</span>
        </Link>
      ))}
    </nav>
  );
}

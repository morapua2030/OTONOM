import type { ReactNode } from 'react';
import type { AdminViewServerProps } from 'payload';
import { redirect } from 'next/navigation';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { can, type Permission } from '@otonom/domain';
import { mfaOk } from '@/lib/access.ts';
import s from './staff.module.css';

export type Staff = { id: string; role: string; can: (p: Permission) => boolean };

/** Resolves the signed-in staff member (MFA verified) or null. Server-side only; every action is re-checked by its endpoint. */
export function staffOf(props: AdminViewServerProps): Staff | null {
  const u = props.initPageResult.req.user as any;
  // custom views are not covered by Payload's admin-access redirect: mirror it (no shell, no navigation)
  if (!u) redirect('/admin/login');
  if (!mfaOk(u)) redirect('/admin/unauthorized');
  return { id: String(u.id), role: u.role, can: (p) => can(u.role, p) };
}

export function StaffShell(props: AdminViewServerProps & { title: string; subtitle: string; children: ReactNode }) {
  const { initPageResult, params, searchParams } = props;
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <div className={s.page}>
          <h1>{props.title}</h1>
          <p className={s.sub}>{props.subtitle}</p>
          {props.children}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}

export function NoAccess({ need }: { need: string }) {
  return (
    <p className={s.banner} data-testid="no-access">
      Your role does not include <code>{need}</code>. Nothing on this page is available to you.
    </p>
  );
}

export const minorToEgp = (m: number | string | null | undefined) =>
  m === null || m === undefined ? '—' : `EGP ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(Number(m) / 100)}`;
export const when = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '—');

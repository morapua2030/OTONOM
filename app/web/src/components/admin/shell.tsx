import type { ReactNode } from 'react';
import type { AdminViewServerProps } from 'payload';
import { redirect } from 'next/navigation';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { can, type Permission } from '@otonom/domain';
import { mfaOk } from '@/lib/access.ts';
import { langOf, pick, SHELL_V, UI, type AdminLang } from '@/admin-ui/copy.ts';
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

/** The admin language of this request (R3). */
export const viewLang = (props: AdminViewServerProps): AdminLang => langOf(props.initPageResult.req.i18n?.language);

export function StaffShell(props: AdminViewServerProps & { title: string; subtitle: string; children: ReactNode }) {
  const { initPageResult, params, searchParams } = props;
  const role = String((initPageResult.req.user as any)?.role ?? '');
  const lang = viewLang(props);
  const roleLabel = role in UI.role ? pick(UI.role[role as keyof typeof UI.role], lang) : role.replaceAll('_', ' ');
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      req={initPageResult.req}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <div className={`${s.page} otn-page otn-staff-view`}>
          <header className="otn-page__head">
            <nav className="otn-crumbs" aria-label={pick(SHELL_V.home, lang)}>
              <a href="/admin">{pick(SHELL_V.home, lang)}</a><span aria-hidden="true">/</span><span aria-current="page">{props.title}</span>
            </nav>
            <div className="otn-title-row">
              <h1 className="otn-title">{props.title}</h1>
              {roleLabel ? <span className="otn-badge otn-badge--role" title={pick(UI.signedInAs, lang)}>{roleLabel}</span> : null}
            </div>
            <p className="otn-line">{props.subtitle}</p>
          </header>
          {props.children}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}

export function NoAccess({ need, lang = 'en' }: { need: string; lang?: AdminLang }) {
  return (
    <section className={`${s.banner} ${s.denied}`} data-testid="no-access" role="alert">
      <strong>{pick(SHELL_V.noAccessTitle, lang)}</strong>
      <p>{pick(SHELL_V.noAccessLine, lang)} <code dir="ltr">{need}</code></p>
    </section>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className={s.emptyState}><span aria-hidden="true">○</span><strong>{title}</strong><p>{detail}</p></div>;
}

export const minorToEgp = (m: number | string | null | undefined) =>
  m === null || m === undefined ? '—' : `EGP ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(Number(m) / 100)}`;
export const when = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '—');

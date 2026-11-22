import type { AdminViewServerProps } from 'payload';
import { Link } from '@payloadcms/ui';
import { can } from '@otonom/domain';
import { redirect } from 'next/navigation';
import { mfaOk } from '@/lib/access.ts';
import { AdminPage } from './AdminPage.tsx';
import { langOf, PAGE, pick, UI } from './copy.ts';
import { Icon } from './icons.tsx';
import { HIDDEN_PAGES } from './nav-model.ts';

/** «Hidden pages» (R3, M3): OWNER only. The pages are hidden from the menu only; every route still works. */
export function HiddenPagesView(props: AdminViewServerProps) {
  const u = props.initPageResult.req.user as (Parameters<typeof mfaOk>[0] & { role?: string }) | null;
  // custom views are not covered by Payload's admin-access redirect: mirror it (same rule as components/admin/shell.tsx)
  if (!u) redirect('/admin/login');
  if (!mfaOk(u)) redirect('/admin/unauthorized');
  const lang = langOf(props.initPageResult.req.i18n?.language);
  const owner = can(u?.role, 'settings.stage');
  return (
    <AdminPage {...props} title={pick(PAGE.hidden.name, lang)} line={pick(PAGE.hidden.line, lang)} testId="hidden-pages">
      {owner ? (
        <ul className="otn-hidden" data-testid="hidden-pages-list">
          {HIDDEN_PAGES.map((p) => (
            <li key={p.href} className="otn-hidden__row">
              <div>
                <p className="otn-hidden__name">{pick(p.name, lang)}</p>
                <p className="otn-hidden__line">{pick(p.line, lang)}</p>
              </div>
              <Link className="otn-chip" href={p.href} prefetch={false}>
                <span>{pick(UI.open, lang)}</span>
                <Icon name="arrow" className="otn-flip" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="otn-empty" data-testid="no-access" role="alert">{pick(UI.ownerOnly, lang)}</p>
      )}
    </AdminPage>
  );
}

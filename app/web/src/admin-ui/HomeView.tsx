import type { AdminViewServerProps, PayloadRequest, Where } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter, Link } from '@payloadcms/ui';
import { can } from '@otonom/domain';
import { mfaOk } from '@/lib/access.ts';
import { redirect } from 'next/navigation';
import { HOME, LEAD_PACKAGE_COPY, LEAD_STATUS_COPY, langOf, PAGE, pick, type AdminLang } from './copy.ts';
import { cairoHour, count as fmtCount, longDate, timeAgo } from './format.ts';
import { Icon, type IconName } from './icons.tsx';
import { StatusBadge } from './StatusBadge.tsx';

type Card = { key: string; label: string; value: string; tone?: 'attention' | 'ok' | 'off'; note?: string; href?: string; action?: string; icon: IconName };
type Latest = { id: number | string; ref: string; name: string; package: string; status: string; createdAt: string };

const leadsHref = (status?: string) => (status ? `/admin/collections/leads?where%5Bstatus%5D%5Bequals%5D=${status}` : '/admin/collections/leads');

/** Home (R3, M5): counts only, through the Local API with the signed-in person's own access (no domain schema). */
async function HomeBody({ req }: { req: PayloadRequest }) {
  const user = req.user as { role?: string } | null;
  const role = user?.role;
  const lang: AdminLang = langOf(req.i18n?.language);
  const now = new Date();
  const payload = req.payload;
  const seesBookings = can(role, 'leads.read') && can(role, 'leads.write');
  const seesPhotos = can(role, 'content.edit') || can(role, 'content.publish');
  const seesForm = seesBookings || can(role, 'intake.settings');
  const countOf = async (collection: 'leads' | 'media', where: Where) => (await payload.count({ collection, where, req, overrideAccess: false })).totalDocs;

  const cards: Card[] = [];
  let latest: Latest[] = [];
  if (seesBookings) {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
    const [fresh, week, list] = await Promise.all([
      countOf('leads', { status: { equals: 'NEW' } }),
      countOf('leads', { createdAt: { greater_than_equal: weekAgo } }),
      payload.find({ collection: 'leads', sort: '-createdAt', limit: 5, depth: 0, req, overrideAccess: false, select: { ref: true, name: true, package: true, status: true, createdAt: true } }),
    ]);
    cards.push({ key: 'new', icon: 'inbox', label: pick(HOME.cards.newBookings, lang), value: fmtCount(fresh), tone: fresh > 0 ? 'attention' : undefined, href: leadsHref('NEW'), action: pick(HOME.cards.newBookingsAction, lang) });
    cards.push({ key: 'week', icon: 'chart', label: pick(HOME.cards.week, lang), value: fmtCount(week), href: leadsHref() });
    latest = (list.docs as unknown as Latest[]).map((d) => ({ id: d.id, ref: d.ref, name: d.name, package: d.package, status: d.status, createdAt: d.createdAt }));
  }
  if (seesPhotos) {
    const drafts = await countOf('media', { status: { equals: 'DRAFT' } });
    cards.push({ key: 'photos', icon: 'image', label: pick(HOME.cards.photos, lang), value: fmtCount(drafts), tone: drafts > 0 ? 'attention' : undefined, href: '/admin/collections/media?where%5Bstatus%5D%5Bequals%5D=DRAFT', action: pick(HOME.cards.photosAction, lang) });
  }
  if (seesForm) {
    const [intake, privacy] = await Promise.all([
      payload.findGlobal({ slug: 'intake-settings', depth: 0, req, overrideAccess: false }).catch(() => null) as Promise<{ enabled?: boolean } | null>,
      payload.findGlobal({ slug: 'privacy-policy', depth: 0, req, overrideAccess: false }).catch(() => null) as Promise<{ approved?: boolean } | null>,
    ]);
    const on = !!intake?.enabled && !!privacy?.approved;
    const why = !intake?.enabled ? pick(HOME.cards.formOffWhy.intake, lang) : !privacy?.approved ? pick(HOME.cards.formOffWhy.privacy, lang) : undefined;
    cards.push({ key: 'form', icon: on ? 'check' : 'off', label: pick(HOME.cards.form, lang), value: pick(on ? HOME.cards.formOn : HOME.cards.formOff, lang), tone: on ? 'ok' : 'off', note: why, href: can(role, 'intake.settings') ? '/admin/globals/intake-settings' : undefined });
  }

  const actions: Array<{ href: string; label: string; icon: IconName }> = [];
  if (seesBookings) actions.push({ href: leadsHref(), label: pick(HOME.actions.bookings, lang), icon: 'inbox' });
  if (can(role, 'content.edit')) {
    actions.push({ href: '/admin/collections/media/create', label: pick(HOME.actions.photo, lang), icon: 'image' });
    actions.push({ href: '/admin/globals/announcement', label: pick(HOME.actions.announcement, lang), icon: 'megaphone' });
    actions.push({ href: '/admin/collections/service-faqs', label: pick(HOME.actions.faqs, lang), icon: 'help' });
    actions.push({ href: '/admin/globals/contact-settings', label: pick(HOME.actions.contact, lang), icon: 'phone' });
  }

  const greeting = pick(cairoHour(now) < 12 ? HOME.greeting.morning : HOME.greeting.evening, lang);
  return (
    <div className="otn-page otn-home" data-testid="admin-home">
      <header className="otn-page__head">
        <p className="otn-eyebrow">{longDate(now, lang)}</p>
        <h1 className="otn-title">{greeting}</h1>
        <p className="otn-line">{pick(PAGE.home.line, lang)}</p>
      </header>
      {cards.length ? (
        <section className="otn-cards" aria-label={pick(PAGE.home.name, lang)}>
          {cards.map((c) => (
            <article key={c.key} className={`otn-card otn-card--${c.tone ?? 'plain'}`} data-testid={`home-card-${c.key}`}>
              <div className="otn-card__head">
                <Icon name={c.icon} />
                <h2 className="otn-card__label">{c.label}</h2>
              </div>
              <p className="otn-card__value">{c.value}</p>
              {c.note ? <p className="otn-card__note">{c.note}</p> : null}
              {c.href && c.action ? (
                <Link className="otn-card__action" href={c.href} prefetch={false}>
                  {c.action}
                  <Icon name="arrow" className="otn-flip" />
                </Link>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      {actions.length ? (
        <section className="otn-quick" aria-labelledby="otn-quick-title">
          <h2 className="otn-section-title" id="otn-quick-title">{pick(HOME.quick, lang)}</h2>
          <ul className="otn-quick__list">
            {actions.map((a) => (
              <li key={a.href}>
                <Link className="otn-chip" href={a.href} prefetch={false}>
                  <Icon name={a.icon} />
                  <span>{a.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {seesBookings ? (
        <section className="otn-latest" aria-labelledby="otn-latest-title">
          <div className="otn-section-head">
            <h2 className="otn-section-title" id="otn-latest-title">{pick(HOME.latest, lang)}</h2>
            <Link href={leadsHref()} prefetch={false} className="otn-link">{pick(HOME.seeAll, lang)}</Link>
          </div>
          {latest.length ? (
            <ul className="otn-latest__list" data-testid="home-latest">
              {latest.map((l) => (
                <li key={String(l.id)} className="otn-latest__row">
                  <Link href={`/admin/collections/leads/${l.id}`} prefetch={false} className="otn-latest__link">
                    <span className="otn-latest__main">
                      <bdi className="otn-latest__ref" dir="ltr">{l.ref}</bdi>
                      <span className="otn-latest__name">{l.name}</span>
                    </span>
                    <span className="otn-latest__meta">
                      <span>{l.package in LEAD_PACKAGE_COPY ? pick(LEAD_PACKAGE_COPY[l.package as keyof typeof LEAD_PACKAGE_COPY], lang) : l.package}</span>
                      <span aria-hidden="true">·</span>
                      <span>{timeAgo(l.createdAt, lang, now)}</span>
                    </span>
                    <StatusBadge status={l.status} label={l.status in LEAD_STATUS_COPY ? pick(LEAD_STATUS_COPY[l.status as keyof typeof LEAD_STATUS_COPY].label, lang) : l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="otn-empty">{pick(HOME.latestEmpty, lang)}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

/** The dashboard (`/admin`): Payload already wraps it in its template. */
export async function HomeView(props: AdminViewServerProps) {
  return (
    <Gutter>
      <HomeBody req={props.initPageResult.req} />
    </Gutter>
  );
}

/** `/admin/overview` keeps working and shows Home (custom views get no template, so this one adds it). */
export async function OverviewHome(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props;
  const u = initPageResult.req.user as Parameters<typeof mfaOk>[0] | null;
  // custom views are not covered by Payload's admin-access redirect: mirror it (same rule as components/admin/shell.tsx)
  if (!u) redirect('/admin/login');
  if (!mfaOk(u)) redirect('/admin/unauthorized');
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
      viewType="dashboard"
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <HomeBody req={initPageResult.req} />
      </Gutter>
    </DefaultTemplate>
  );
}

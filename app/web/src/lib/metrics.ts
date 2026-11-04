import type pg from 'pg';

/**
 * Privacy-first site metrics (final release, owner 2026-11-04): only (event, route, locale, day) -> count is stored.
 * No IP address, user agent, cookie or identifier is ever written; the rate limiter keys on a salted hash of the
 * client address and the day (domain.rate_limits stores only that HMAC, for one window).
 */
export const METRIC_EVENTS = ['page_view', 'whatsapp_click', 'call_click', 'package_premium', 'package_plus', 'package_essential', 'sim_start', 'sim_stage_2', 'sim_stage_3', 'sim_stage_4', 'plan_sent'] as const;
export type MetricEvent = (typeof METRIC_EVENTS)[number];
export const isMetricEvent = (v: unknown): v is MetricEvent => typeof v === 'string' && (METRIC_EVENTS as readonly string[]).includes(v);

/** Path only, lower-case, locale-prefixed, at most four segments; anything else (queries, ids, junk) is refused. */
export function metricRoute(raw: unknown): { route: string; locale: 'ar' | 'en' } | null {
  if (typeof raw !== 'string' || raw.length > 80) return null;
  const path = raw.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  const m = path.match(/^\/(ar|en)((?:\/[a-z0-9-]{1,40}){0,4})$/);
  if (!m) return null;
  return { route: path, locale: m[1] as 'ar' | 'en' };
}

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|httpclient|okhttp|java\/|go-http|node-fetch|undici|axios/i;
/** Basic bot filter on the request's user agent (read, never stored). An empty user agent counts as a bot. */
export const isBotAgent = (ua: string | null | undefined) => !ua || ua.length < 10 || BOT.test(ua);

/** Calendar day in Cairo (the business day used by every report). */
export function cairoDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export async function countMetric(pool: pg.Pool, event: MetricEvent, route: string, locale: 'ar' | 'en', day = cairoDay()) {
  await pool.query(
    `INSERT INTO domain.site_metrics(event, route, locale, day, count) VALUES ($1, $2, $3, $4::date, 1)
     ON CONFLICT (event, route, locale, day) DO UPDATE SET count = domain.site_metrics.count + 1`,
    [event, route, locale, day],
  );
}

export type MetricsSummary = {
  totals: Record<'today' | 'days7' | 'days30', Partial<Record<MetricEvent, number>>>;
  topPackages: Array<{ pkg: 'premium' | 'plus' | 'essential'; count: number }>;
  funnel: Array<{ event: MetricEvent; count: number }>;
  topRoutes: Array<{ route: string; count: number }>;
};

/** Admin KPI view: today, 7 and 30 days, top package choices, the simulator funnel (30 days) and top pages. */
export async function metricsSummary(pool: pg.Pool, today = cairoDay()): Promise<MetricsSummary> {
  const totals = async (days: number) => {
    const r = await pool.query(`SELECT event, sum(count)::bigint AS n FROM domain.site_metrics WHERE day > $1::date - $2::int GROUP BY event`, [today, days]);
    return Object.fromEntries(r.rows.map((x: any) => [x.event, Number(x.n)])) as Partial<Record<MetricEvent, number>>;
  };
  const [t1, t7, t30] = await Promise.all([totals(1), totals(7), totals(30)]);
  const pk = await pool.query(`SELECT event, sum(count)::bigint AS n FROM domain.site_metrics WHERE event IN ('package_premium','package_plus','package_essential') AND day > $1::date - 30 GROUP BY event ORDER BY n DESC`, [today]);
  const pages = await pool.query(`SELECT route, sum(count)::bigint AS n FROM domain.site_metrics WHERE event='page_view' AND day > $1::date - 30 GROUP BY route ORDER BY n DESC LIMIT 10`, [today]);
  const order: MetricEvent[] = ['sim_start', 'sim_stage_2', 'sim_stage_3', 'sim_stage_4', 'plan_sent'];
  return {
    totals: { today: t1, days7: t7, days30: t30 },
    topPackages: pk.rows.map((x: any) => ({ pkg: String(x.event).replace('package_', '') as 'premium' | 'plus' | 'essential', count: Number(x.n) })),
    funnel: order.map((event) => ({ event, count: t30[event] ?? 0 })),
    topRoutes: pages.rows.map((x: any) => ({ route: x.route, count: Number(x.n) })),
  };
}

'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Privacy-first site metrics (final release, owner 2026-11-04): sends only { e: event, r: route, l: locale } to the
 * same-origin /api/e with navigator.sendBeacon. No cookie, storage, identifier or third party; nothing is sent when the
 * browser asks for no tracking (Do Not Track / Global Privacy Control).
 * On /try (owner decision 2026-11-04) the simulator raises `otonom:metric` page events; only the five simulator event
 * names below are accepted, and each becomes the same single same-origin beacon.
 * Loaded late (owner decision, 2026-11-04): DeferredMetrics loads this module only after the page's load event, when
 * the browser is idle, so it never competes with the first paint. It hands over the page views, clicks and simulator
 * events that happened before; they are sent here, each for the page it happened on.
 */
const PACKAGE_EVENTS = new Set(['package_premium', 'package_plus', 'package_essential']);
const SIM_EVENTS = new Set(['sim_start', 'sim_stage_2', 'sim_stage_3', 'sim_stage_4', 'plan_sent']);

function route(pathname: string): { r: string; l: 'ar' | 'en' } | null {
  const m = pathname.match(/^\/(ar|en)((?:\/[a-z0-9-]{1,40}){0,4})\/?$/);
  return m ? { r: `/${m[1]}${m[2] ?? ''}`, l: m[1] as 'ar' | 'en' } : null;
}

function optedOut(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.doNotTrack === '1' || n.globalPrivacyControl === true;
}

function send(e: string, pathname: string) {
  const where = route(pathname);
  if (!where || optedOut() || typeof navigator.sendBeacon !== 'function') return;
  navigator.sendBeacon('/api/e', new Blob([JSON.stringify({ e, r: where.r, l: where.l })], { type: 'application/json' }));
}

/** A click on a package card, a WhatsApp link or a phone link becomes its event, counted for the page it happened on. */
function sendClick(target: EventTarget | null, pathname: string) {
  const el = (target as Element | null)?.closest?.('a[href], [data-metric]');
  if (!el) return;
  const metric = el.getAttribute('data-metric');
  if (metric && PACKAGE_EVENTS.has(metric)) send(metric, pathname);
  const href = el.getAttribute('href') ?? '';
  if (href.startsWith('https://wa.me/')) send('whatsapp_click', pathname);
  else if (href.startsWith('tel:')) send('call_click', pathname);
}

/** What DeferredMetrics recorded before this module was loaded; every entry keeps the page it happened on. */
export type EarlyMetrics = {
  pages: string[];
  events: Array<{ kind: 'click'; target: EventTarget | null; path: string } | { kind: 'sim'; e: unknown; path: string }>;
};

export function MetricsBeacon({ early, handover }: { early: EarlyMetrics; handover: () => void }) {
  const pathname = usePathname() ?? '';
  const first = useRef(true);
  useEffect(() => {
    // First run: the page views recorded before this module loaded (they include the current page). Then: each
    // client-side navigation.
    if (first.current) {
      first.current = false;
      for (const page of early.pages.splice(0)) send('page_view', page);
      return;
    }
    send('page_view', pathname);
  }, [pathname, early]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => sendClick(event.target, location.pathname);
    const onSim = (event: Event) => {
      const e = (event as CustomEvent<{ e?: unknown }>).detail?.e;
      if (typeof e === 'string' && SIM_EVENTS.has(e)) send(e, location.pathname);
    };
    // One synchronous step, so nothing is lost or counted twice: DeferredMetrics stops recording, the live listeners
    // start, then the recorded clicks and simulator events are sent.
    handover();
    document.addEventListener('click', onClick, { capture: true });
    window.addEventListener('otonom:metric', onSim);
    for (const x of early.events.splice(0)) {
      if (x.kind === 'click') sendClick(x.target, x.path);
      else if (typeof x.e === 'string' && SIM_EVENTS.has(x.e)) send(x.e, x.path);
    }
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('otonom:metric', onSim);
    };
  }, [early, handover]);
  return null;
}

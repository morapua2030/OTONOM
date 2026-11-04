'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Privacy-first site metrics (final release, owner 2026-11-04): sends only { e: event, r: route, l: locale } to the
 * same-origin /api/e with navigator.sendBeacon. No cookie, storage, identifier or third party; nothing is sent when the
 * browser asks for no tracking (Do Not Track / Global Privacy Control).
 * On /try (owner decision 2026-11-04) the simulator raises `otonom:metric` page events; only the five simulator event
 * names below are accepted, and each becomes the same single same-origin beacon.
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

export function MetricsBeacon() {
  const pathname = usePathname() ?? '';
  useEffect(() => {
    send('page_view', pathname);
  }, [pathname]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as Element | null)?.closest?.('a[href], [data-metric]');
      if (!el) return;
      const metric = el.getAttribute('data-metric');
      if (metric && PACKAGE_EVENTS.has(metric)) send(metric, location.pathname);
      const href = el.getAttribute('href') ?? '';
      if (href.startsWith('https://wa.me/')) send('whatsapp_click', location.pathname);
      else if (href.startsWith('tel:')) send('call_click', location.pathname);
    };
    const onSim = (event: Event) => {
      const e = (event as CustomEvent<{ e?: unknown }>).detail?.e;
      if (typeof e === 'string' && SIM_EVENTS.has(e)) send(e, location.pathname);
    };
    document.addEventListener('click', onClick, { capture: true });
    window.addEventListener('otonom:metric', onSim);
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('otonom:metric', onSim);
    };
  }, []);
  return null;
}

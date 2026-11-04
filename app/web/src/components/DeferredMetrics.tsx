'use client';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import type { EarlyMetrics } from './MetricsBeacon.tsx';

/**
 * Owner decision (2026-11-04): the metrics code never competes with the first paint. This small loader ships inside
 * the site chrome's existing script (SiteFooter renders it, so it adds no request before the first paint) and sends
 * nothing itself. After the page's load event, when the browser is idle, it loads MetricsBeacon and hands over what
 * happened before: the page views, and the clicks and simulator events, each with the page it happened on.
 */
type Beacon = ComponentType<{ early: EarlyMetrics; handover: () => void }>;

export function DeferredMetrics() {
  const pathname = usePathname() ?? '';
  const early = useRef<EarlyMetrics>({ pages: [], events: [] });
  const live = useRef(false);
  const stopRecording = useRef<() => void>(() => undefined);
  const [Beacon, setBeacon] = useState<Beacon | null>(null);
  useEffect(() => {
    if (!live.current) early.current.pages.push(pathname);
  }, [pathname]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      early.current.events.push({ kind: 'click', target: event.target, path: location.pathname });
    };
    const onSim = (event: Event) => {
      early.current.events.push({ kind: 'sim', e: (event as CustomEvent<{ e?: unknown }>).detail?.e, path: location.pathname });
    };
    document.addEventListener('click', onClick, { capture: true });
    window.addEventListener('otonom:metric', onSim);
    stopRecording.current = () => {
      document.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('otonom:metric', onSim);
    };
    let cancelled = false;
    let idle = 0;
    const idleApi = typeof window.requestIdleCallback === 'function';
    const loadBeacon = () => {
      import('./MetricsBeacon.tsx')
        .then((m) => {
          if (!cancelled) setBeacon(() => m.MetricsBeacon);
        })
        .catch(() => undefined); // metrics are best effort: the page never depends on them
    };
    const afterLoad = () => {
      idle = idleApi ? window.requestIdleCallback(loadBeacon, { timeout: 3000 }) : window.setTimeout(loadBeacon, 200);
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    return () => {
      cancelled = true;
      stopRecording.current();
      window.removeEventListener('load', afterLoad);
      if (idleApi) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);
  const handover = useCallback(() => {
    live.current = true;
    stopRecording.current();
  }, []);
  return Beacon ? <Beacon early={early.current} handover={handover} /> : null;
}

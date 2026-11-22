'use client';
import { useEffect } from 'react';
import { useNav, useWindowInfo } from '@payloadcms/ui';

/**
 * Payload closes the menu on screens up to 1440 px wide, so on most laptops the owner would first see no menu.
 * On desktop widths (1025–1440 px) the menu opens once the screen size is known; phones and tablets keep Payload's
 * behaviour (closed, opened with ☰), and wider screens keep the person's saved choice. Display only.
 */
export function NavAutoOpen() {
  const { hydrated, setNavOpen } = useNav();
  const { breakpoints } = useWindowInfo();
  const large = breakpoints?.l;
  const mid = breakpoints?.m;
  useEffect(() => {
    if (!hydrated || large !== true || mid !== false) return;
    // after Payload's own effect for the same breakpoint change (it closes the menu)
    const timer = setTimeout(() => setNavOpen(true), 0);
    return () => clearTimeout(timer);
  }, [hydrated, large, mid, setNavOpen]);
  return null;
}

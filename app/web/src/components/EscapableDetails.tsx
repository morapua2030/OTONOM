'use client';
import type { KeyboardEvent, ReactNode } from 'react';

/**
 * Keyboard support for the native <details> navigation menus: Escape closes the innermost open menu and returns focus
 * to its <summary>, so keyboard users are never left inside an open disclosure. Markup and styling stay unchanged.
 */
export function closeDetailsOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
  const details = event.currentTarget;
  if (event.key !== 'Escape' || !details.open) return;
  event.stopPropagation();
  details.open = false;
  details.querySelector<HTMLElement>(':scope > summary')?.focus();
}

export function EscapableDetails({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <details className={className} onKeyDown={closeDetailsOnEscape}>
      {children}
    </details>
  );
}

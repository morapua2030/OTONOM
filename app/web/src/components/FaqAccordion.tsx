'use client';
import { useId, useState } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { Bidi } from './bidi.tsx';

/**
 * FAQ accordion (design v3.1): one item open at a time, native buttons with aria-expanded/aria-controls, so it is
 * keyboard operable (Enter/Space) without custom key handling. All answers are in the HTML for no-JS readers.
 */
export function FaqAccordion({ items, locale }: { items: ReadonlyArray<readonly [string, string]>; locale: Locale }) {
  const [open, setOpen] = useState(-1);
  const base = useId();
  return (
    <div className="v3-faq" data-testid="faq">
      {items.map(([question, answer], index) => {
        const expanded = open === index;
        const panel = `${base}-panel-${index}`;
        return (
          <div className="v3-faq-item" key={question}>
            <h3 className="v3-faq-q">
              <button type="button" aria-expanded={expanded} aria-controls={panel} onClick={() => setOpen(expanded ? -1 : index)}>
                <span><Bidi text={question} locale={locale} /></span>
                <span className="v3-faq-sign" aria-hidden="true">{expanded ? '−' : '+'}</span>
              </button>
            </h3>
            <div className="v3-faq-a" id={panel} hidden={!expanded}>
              <p><Bidi text={answer} locale={locale} /></p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

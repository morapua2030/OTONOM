'use client';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { SITE_COPY } from '@/lib/site-copy.ts';
import { INNER } from '@/lib/site-copy-inner.ts';
import { startMessage, type StartSelection } from '@/lib/start-message.ts';
import { EXTERNAL_LINK, whatsappHref } from '@/lib/contact.ts';
import { Bidi } from './bidi.tsx';

type Group = 'who' | 'stage' | 'field';

/**
 * Design v3.1 "09 Start a project": three chip groups (a chip toggles off when pressed again), a live message and one
 * WhatsApp button. There is no form and no input; nothing is stored or sent by the site (the visitor's WhatsApp sends it).
 */
export function StartProject({ locale, initial }: { locale: Locale; initial: StartSelection }) {
  const [selection, setSelection] = useState<StartSelection>(initial);
  const copy = SITE_COPY[locale].start;
  const t = INNER[locale];
  const message = startMessage(locale, selection);
  const groups: Array<[Group, string, ReadonlyArray<readonly [string, string]>]> = [['who', copy.q1, copy.who], ['stage', copy.q2, copy.stage], ['field', copy.q3, copy.field]];
  const pick = (group: Group, id: string) => setSelection((current) => ({ ...current, [group]: current[group] === id ? null : id }) as StartSelection);
  return (
    <section className="v2-section v3-start" aria-labelledby="start-title" data-testid="start-project">
      {groups.map(([group, question, options], index) => (
        <div className="v3-start-group" role="group" aria-labelledby={`start-q-${group}`} key={group}>
          <p className="v2-entry-label" id={`start-q-${group}`}><span dir="ltr">{index + 1}</span>. <Bidi text={question} locale={locale} /></p>
          <div className="v2-chip-row">
            {options.map(([id, label]) => (
              <button type="button" className="v2-chip" aria-pressed={selection[group] === id} onClick={() => pick(group, id)} key={id}>
                <Bidi text={label} locale={locale} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="v2-card v3-start-preview">
        <span className="v2-entry-label">{t.message}</span>
        <p aria-live="polite" data-testid="start-message"><Bidi text={message} locale={locale} /></p>
        <a className="btn" href={whatsappHref(message)} {...EXTERNAL_LINK} data-testid="start-whatsapp">{t.sendWa}</a>
        <p className="small"><Bidi text={t.startNote} locale={locale} /></p>
      </div>
    </section>
  );
}

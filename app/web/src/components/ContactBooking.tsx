'use client';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { SMART_HOME_PACKAGES, type SmartHomePackageId } from '@/lib/smart-home-packages.ts';
import { Bidi } from './bidi.tsx';
import { bookVisitMessage, EXTERNAL_LINK, PHONE_DISPLAY, telHref, whatsappHref } from '@/lib/contact.ts';

type Choice = SmartHomePackageId | 'unsure' | null;
const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

/**
 * Design v2 "04 Contact" (DR-101): package chips only change the prefilled WhatsApp text.
 * No form, no input, no storage and no request: the visitor's own phone or WhatsApp app does the rest.
 */
export function ContactBooking({ locale, initialPackage }: { locale: Locale; initialPackage: SmartHomePackageId | null }) {
  const [choice, setChoice] = useState<Choice>(initialPackage);
  const message = bookVisitMessage(locale, choice === 'unsure' ? null : choice);
  const chips: Array<{ id: Exclude<Choice, null>; label: string }> = [
    ...SMART_HOME_PACKAGES.map((entry) => ({ id: entry.id, label: entry.name.en })),
    { id: 'unsure', label: tx(locale, 'مش متأكد', 'Not sure yet') },
  ];
  return (
    <div className="v2-contact-side" data-testid="contact-booking">
      <div role="group" aria-labelledby="contact-package-label" className="v2-contact-chips">
        <p id="contact-package-label" className="v2-entry-label">{tx(locale, 'الباقة', 'Package')}</p>
        <div className="v2-chip-row">
          {chips.map((chip) => (
            <button type="button" className="v2-chip" key={chip.id} aria-pressed={choice === chip.id} onClick={() => setChoice(chip.id)} lang={chip.id === 'unsure' ? locale : 'en'}>
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      <div className="v2-contact-cards">
        <a className="v2-contact-card" href={telHref()}>
          <span className="v2-contact-card-title">{tx(locale, 'كلّمنا', 'Call us')}</span>
          <span className="v2-contact-number" dir="ltr">{PHONE_DISPLAY}</span>
        </a>
        <a className="v2-contact-card is-whatsapp" href={whatsappHref(message)} {...EXTERNAL_LINK} data-testid="contact-whatsapp">
          <span className="v2-contact-card-title">{tx(locale, 'واتساب', 'WhatsApp')}</span>
          <span className="v2-contact-preview"><span>{tx(locale, 'الرسالة: ', 'Message: ')}</span><Bidi text={message} locale={locale} /></span>
        </a>
      </div>
    </div>
  );
}

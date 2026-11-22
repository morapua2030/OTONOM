'use client';
import { useTranslation } from '@payloadcms/ui';
import { langOf, LEAD_STATUS_COPY, pick, UI } from '../copy.ts';
import { egyptMobileDigits } from '../format.ts';
import { Icon } from '../icons.tsx';
import { StatusBadge } from '../StatusBadge.tsx';

/** +201012345678 → "+20 10 1234 5678" (display only; links use the stored value). */
export const displayPhone = (v: string) => (/^\+20\d{10}$/.test(v) ? `${v.slice(0, 3)} ${v.slice(3, 5)} ${v.slice(5, 9)} ${v.slice(9)}` : v);

/** Phone, always left-to-right, with call and WhatsApp buttons for a valid stored Egyptian mobile only (M6). */
export function PhoneCell({ cellData }: { cellData?: unknown }) {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const phone = typeof cellData === 'string' ? cellData : '';
  const digits = egyptMobileDigits(phone);
  return (
    <span className="otn-phone">
      <bdi dir="ltr" className="otn-phone__number">{phone ? displayPhone(phone) : '—'}</bdi>
      {digits ? (
        <span className="otn-phone__actions">
          <a className="otn-icon-btn" href={`tel:+${digits}`} aria-label={`${pick(UI.call, lang)} ${phone}`} title={pick(UI.call, lang)}><Icon name="phoneCall" /></a>
          <a className="otn-icon-btn" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" aria-label={`${pick(UI.whatsapp, lang)} ${phone}`} title={pick(UI.whatsapp, lang)}><Icon name="whatsapp" /></a>
        </span>
      ) : null}
    </span>
  );
}

/** Status as a badge (colour + word) in the admin language. */
export function StatusCell({ cellData }: { cellData?: unknown }) {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const v = typeof cellData === 'string' ? cellData : '';
  const copy = LEAD_STATUS_COPY[v as keyof typeof LEAD_STATUS_COPY];
  return v ? <StatusBadge status={v} label={copy ? pick(copy.label, lang) : v} /> : <span>—</span>;
}

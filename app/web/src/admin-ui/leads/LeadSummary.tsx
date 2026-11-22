'use client';
import { useDocumentInfo, useFormFields, useTranslation } from '@payloadcms/ui';
import { langOf, LEAD_FIELDS, LEAD_STATUS_COPY, PAGE, pick, UI } from '../copy.ts';
import { dateTime, egyptMobileDigits } from '../format.ts';
import { Icon } from '../icons.tsx';
import { StatusBadge } from '../StatusBadge.tsx';

/**
 * The top of one booking (R3, M7): the page line, the status badge and when it arrived. The booking code is the page
 * title right above (owner 2026-11-22: show it once). Display only.
 */
export function LeadSummary() {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const { data, initialData } = useDocumentInfo() as { data?: Record<string, any>; initialData?: Record<string, any> };
  const doc = data ?? initialData ?? {};
  const status = useFormFields(([fields]) => fields?.status?.value) as string | undefined;
  const copy = status ? LEAD_STATUS_COPY[status as keyof typeof LEAD_STATUS_COPY] : undefined;
  return (
    <section className="otn-lead-top" data-testid="lead-summary">
      <p className="otn-line">{pick(PAGE.lead.line, lang)}</p>
      <div className="otn-lead-top__row">
        {status ? <StatusBadge status={status} label={copy ? pick(copy.label, lang) : status} /> : null}
        {doc.createdAt ? (
          <span className="otn-lead-top__when">
            <Icon name="clock" />
            {pick(LEAD_FIELDS.createdAt.label, lang)}: {dateTime(doc.createdAt, lang)}
          </span>
        ) : null}
      </div>
    </section>
  );
}

/** Call and WhatsApp for the customer (R3, M7), only for a valid stored Egyptian mobile. Display only. */
export function ContactButtons() {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const phone = useFormFields(([fields]) => fields?.phone?.value) as string | undefined;
  const digits = egyptMobileDigits(phone);
  if (!digits) return null;
  return (
    <div className="otn-lead-top__actions" data-testid="lead-contact">
      <a className="otn-btn otn-btn--outline" href={`tel:+${digits}`} data-testid="lead-call">
        <Icon name="phoneCall" />
        <span>{pick(UI.callCustomer, lang)}</span>
      </a>
      <a className="otn-btn otn-btn--outline" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" data-testid="lead-whatsapp">
        <Icon name="whatsapp" />
        <span>{pick(UI.whatsappCustomer, lang)}</span>
      </a>
    </div>
  );
}

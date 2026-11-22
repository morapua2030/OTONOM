'use client';
import { useFormFields, useTranslation } from '@payloadcms/ui';
import { langOf, LEAD_STATUS_COPY, pick, UI } from '../copy.ts';

/** One line under the status: the next step, changing with the status (R3, M4). Display only. */
export function StatusHint() {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const status = useFormFields(([fields]) => fields?.status?.value) as string | undefined;
  const copy = status ? LEAD_STATUS_COPY[status as keyof typeof LEAD_STATUS_COPY] : undefined;
  if (!copy) return null;
  return (
    <p className="otn-hint" data-testid="lead-status-hint" aria-live="polite">
      <strong>{pick(UI.nextStep, lang)}:</strong> {pick(copy.hint, lang)}
    </p>
  );
}

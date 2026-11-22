'use client';
import { FieldLabel, useField, useTranslation } from '@payloadcms/ui';
import { langOf } from '../copy.ts';
import { dateTime } from '../format.ts';

/**
 * A date the system stamps (note time, last update, consent time) shown as plain text in Cairo time and the admin
 * language, e.g. «20 نوفمبر 2026، 12:53 م». Display only: the field is read-only and its value is never changed here.
 */
export function ReadOnlyDate(props: { path: string; field?: { label?: Parameters<typeof FieldLabel>[0]['label'] } }) {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const { value } = useField<string>({ path: props.path });
  return (
    <div className="field-type otn-readonly">
      <FieldLabel label={props.field?.label} path={props.path} />
      <p className="otn-readonly__value">{dateTime(value, lang)}</p>
    </div>
  );
}

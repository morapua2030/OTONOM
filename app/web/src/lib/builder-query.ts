/** Project Builder disciplines and the `?service=` keys it accepts; shared by the Builder and the locale switch. */
export type BuilderDiscipline = 'SOFTWARE' | 'IOT_EMBEDDED' | 'CUSTOM_ENGINEERING' | 'SMART_HOME' | 'INTEGRATED' | 'UNSURE';

export const SERVICE_DISCIPLINE: Readonly<Record<string, BuilderDiscipline>> = {
  software: 'SOFTWARE',
  'software-engineering': 'SOFTWARE',
  iot: 'IOT_EMBEDDED',
  'iot-embedded': 'IOT_EMBEDDED',
  custom: 'CUSTOM_ENGINEERING',
  'custom-engineering': 'CUSTOM_ENGINEERING',
  'smart-home': 'SMART_HOME',
  integrated: 'INTEGRATED',
};

/** Own keys only, so inherited names such as `constructor` are never treated as a service. */
export function isBuilderServiceKey(value: unknown): value is string {
  return typeof value === 'string' && Object.hasOwn(SERVICE_DISCIPLINE, value);
}

/** Fired after the Builder rewrites its validated `?package` / `?service` query, so the locale switch can follow. */
export const BUILDER_QUERY_EVENT = 'otonom:builder-query';

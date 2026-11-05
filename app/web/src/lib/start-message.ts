import type { Locale } from './i18n.ts';
import { isBuilderServiceKey, SERVICE_DISCIPLINE } from './builder-query.ts';
import { isSmartHomePackageId } from './smart-home-packages.ts';

/** Start-a-project selections (design v3.1 "09 Start a project"): each group is optional and toggles off. */
export const START_WHO = ['ind', 'co'] as const;
export const START_STAGE = ['idea', 'proto', 'sys', 'unsure'] as const;
export const START_FIELD = ['smart', 'iot', 'soft', 'custom', 'unsure'] as const;
export type StartSelection = { who: (typeof START_WHO)[number] | null; stage: (typeof START_STAGE)[number] | null; field: (typeof START_FIELD)[number] | null };

const WORDS = {
  ar: {
    who: { ind: 'أنا فرد', co: 'إحنا شركة' },
    stage: { idea: 'عندي فكرة', proto: 'عندي نموذج أولي', sys: 'عندي نظام قائم', unsure: 'لسه مش متأكد' },
    field: { smart: 'المنزل الذكي', iot: 'إنترنت الأشياء', soft: 'البرمجيات', custom: 'الهندسة المخصصة' },
  },
  en: {
    who: { ind: "I'm an individual", co: "we're a company" },
    stage: { idea: 'I have an idea', proto: 'I have a prototype', sys: 'I have an existing system', unsure: "I'm not sure yet" },
    field: { smart: 'smart home', iot: 'IoT', soft: 'software', custom: 'custom engineering' },
  },
} as const;

/** Port of the design's `buildStart` (verbatim wording per locale). A field of "unsure" adds nothing, as in the design. */
export function startMessage(locale: Locale, s: StartSelection): string {
  const t = WORDS[locale];
  const w = s.who ? t.who[s.who] : null;
  const g = s.stage ? t.stage[s.stage] : null;
  const f = s.field && s.field !== 'unsure' ? t.field[s.field] : null;
  if (locale === 'en') {
    const parts = [w, g && f ? `${g} in ${f}` : g || (f ? `I'm interested in ${f}` : null)].filter(Boolean);
    return `Hi OTONOM, ${parts.length ? `${parts.join(', ')} and I'd like` : "I'd like"} to talk about a project.`;
  }
  return arabicMessage(w, g, f);
}

/** Arabic branch of the design's `buildStart`, reproduced from the AR reference file. */
function arabicMessage(w: string | null, g: string | null, f: string | null): string {
  const parts = [w, g && f ? `${g} في مجال ${f}` : g || (f ? `مهتم بمجال ${f}` : null)].filter(Boolean);
  return `أهلًا OTONOM، ${parts.length ? `${parts.join('، ')} وعايز` : 'عايز'} أتكلم عن مشروع.`;
}

const DISCIPLINE_TO_FIELD: Record<string, StartSelection['field']> = { IOT_EMBEDDED: 'iot', SOFTWARE: 'soft', CUSTOM_ENGINEERING: 'custom', SMART_HOME: 'smart' };

/** Preselect the field from the existing allow-listed query (`?service=<slug>` or `?package=<id>` → smart home). */
export function initialStartSelection(query: { service?: string | null; package?: string | null }): StartSelection {
  let field: StartSelection['field'] = null;
  if (query.service && isBuilderServiceKey(query.service)) field = DISCIPLINE_TO_FIELD[SERVICE_DISCIPLINE[query.service]] ?? null;
  if (!field && query.package && isSmartHomePackageId(query.package)) field = 'smart';
  return { who: null, stage: null, field };
}

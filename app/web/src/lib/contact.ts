import type { Locale } from './i18n.ts';
import { smartHomePackage, type SmartHomePackageId } from './smart-home-packages.ts';

/**
 * Single source of truth for the public contact channel (DR-101): phone and WhatsApp only.
 * There is no form, backend, storage or analytics: links open the visitor's own phone or WhatsApp app.
 * Message text is taken verbatim from the owner-approved Claude Design v2 reference (AR colloquial, EN).
 */
export const PHONE_E164 = '+201090721847';
export const PHONE_DISPLAY = '+20 109 072 1847';
const WHATSAPP_NUMBER = '201090721847';
/** wa.me links are capped so a long builder brief never produces an unwieldy URL. */
export const WHATSAPP_MESSAGE_MAX = 1500;

/** Public address (owner decision, DR-106): footer Contact column and the Contact page. */
export const ADDRESS = { ar: 'كريتيفا دمنهور، مجمع الكليات', en: 'Creativa Damanhour, Colleges Complex' } as const;

export const telHref = () => `tel:${PHONE_E164}`;

export function whatsappHref(message: string): string {
  const text = message.length > WHATSAPP_MESSAGE_MAX ? `${message.slice(0, WHATSAPP_MESSAGE_MAX - 1)}…` : message;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);
/** Package keys exactly as written in the reference messages (Premium / Plus / Essential). */
const packageKey = (id: SmartHomePackageId) => smartHomePackage(id)!.name.en;

export function bookVisitMessage(locale: Locale, packageId?: SmartHomePackageId | null): string {
  if (!packageId) return tx(locale, 'أهلًا OTONOM، عايز أحجز زيارة.', "Hi OTONOM, I'd like to book a visit.");
  const key = packageKey(packageId);
  return tx(locale, `أهلًا OTONOM، عايز أحجز زيارة لباقة ${key}.`, `Hi OTONOM, I'd like to book a visit for the ${key} package.`);
}

export const disciplineMessage = (locale: Locale, title: string) =>
  tx(locale, `أهلًا OTONOM، عايز أعرف أكتر عن ${title}.`, `Hi OTONOM, I'd like to know more about ${title}.`);

export const ENTRY_STAGES = ['idea', 'prototype', 'existing', 'unsure'] as const;
export type EntryStage = (typeof ENTRY_STAGES)[number];
const ENTRY: Record<EntryStage, { label: [string, string]; message: [string, string] }> = {
  idea: { label: ['عندي فكرة', 'I have an idea'], message: ['أهلًا OTONOM، عندي فكرة وعايز أبدأ مشروع.', 'Hi OTONOM, I have an idea and I’d like to start a project.'] },
  prototype: { label: ['عندي نموذج أولي', 'I have a prototype'], message: ['أهلًا OTONOM، عندي نموذج أولي وعايز أكمّله.', 'Hi OTONOM, I have a prototype and I’d like to take it further.'] },
  existing: { label: ['عندي نظام قائم', 'I have an existing system'], message: ['أهلًا OTONOM، عندي نظام قائم وعايز أطوّره.', 'Hi OTONOM, I have an existing system and I’d like to develop it.'] },
  unsure: { label: ['لسه مش متأكد', 'Not sure yet'], message: ['أهلًا OTONOM، لسه مش متأكد وعايز أتكلم عن مشروع.', 'Hi OTONOM, I’m not sure yet and I’d like to talk about a project.'] },
};
export const entryStageLabel = (locale: Locale, stage: EntryStage) => tx(locale, ...ENTRY[stage].label);
export const entryStageMessage = (locale: Locale, stage: EntryStage) => tx(locale, ...ENTRY[stage].message);

export const developerMessage = (locale: Locale) =>
  tx(locale, 'أهلًا OTONOM، أنا مطوّر عقاري وعايز أتكلم عن مشروع متعدد الوحدات.', 'Hi OTONOM, I’m a developer and I’d like to discuss a multi-unit project.');
export const contractorMessage = (locale: Locale) =>
  tx(locale, 'أهلًا OTONOM، أنا مقاول وعايز أتكلم عن مشروع متعدد الوحدات.', 'Hi OTONOM, I’m a contractor and I’d like to discuss a multi-unit project.');

/** Shared attributes for every external WhatsApp link: new tab, no opener, no referrer data passed on. */
export const EXTERNAL_LINK = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Design v3.1 `talk` message ("…I'd like to know more about {x}."), used by service and product pages. */
export const talkMessage = (locale: Locale, subject: string) => disciplineMessage(locale, subject);

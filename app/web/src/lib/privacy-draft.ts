/**
 * Privacy text DRAFT for the owner's approval (final release prompt §4, 2026-11-04). Not legal advice. It is seeded
 * into the admin ("Privacy text") and shown on /legal/privacy only after the OWNER switches «اعتماد نص الخصوصية» on.
 * `{contact}` and `{date}` are filled from the contact settings and the text's "last updated" date when rendered.
 */
export const PRIVACY_DRAFT = {
  ar: [
    '## مين إحنا',
    'OTONOM، كريتيفا دمنهور، مجمع الكليات، والتواصل على {contact}.',
    '## بنجمع إيه',
    'لما تبعت طلب: الاسم، والموبايل، والباقة، وملاحظتك لو كتبت واحدة، وخطة المحاكاة لو بعتّ الطلب من المحاكي. والموقع بيعدّ زيارات وضغطات بشكل مجمّع، من غير كوكيز تتبّع ومن غير ما يعرف إنت مين.',
    '## ليه',
    'علشان نتواصل معاك بخصوص طلبك ونحدد زيارة. مش بنبيع بياناتك ولا بنستخدمها في إعلانات.',
    '## مين بيشوفها',
    'فريق OTONOM بس، ومقدّمي الخدمة اللي الموقع شغال عليهم (الاستضافة، وقاعدة البيانات، وخدمة إرسال الإيميل) في حدود تشغيل الخدمة.',
    '## بنحتفظ بيها قد إيه',
    'لحد 12 شهر من آخر تواصل، وبعدها بتتمسح.',
    '## حقوقك',
    'تقدر تطلب تشوف بياناتك أو تصلحها أو تمسحها في أي وقت من خلال وسائل التواصل.',
    '## الأمان',
    'الوصول للبيانات محمي بحسابات شخصية وتحقق إضافي.',
    '## التحديثات',
    'آخر تحديث {date}.',
  ].join('\n\n'),
  en: [
    '## Who we are',
    'OTONOM, Creativa Damanhour, Colleges Complex. Contact us at {contact}.',
    '## What we collect',
    'When you send a request: your name, mobile number, package, your note if you add one, and your simulator plan if you send the request from the simulator. The site counts visits and clicks in aggregate, without tracking cookies and without knowing who you are.',
    '## Why',
    'To contact you about your request and arrange a visit. We do not sell your data or use it for advertising.',
    '## Who sees it',
    'Only the OTONOM team, and the service providers the site runs on (hosting, database and e-mail delivery), only as needed to run the service.',
    '## How long we keep it',
    'Up to 12 months after our last contact, after which it is deleted.',
    '## Your rights',
    'You can ask to see, correct or delete your data at any time through our contact channels.',
    '## Security',
    'Access to the data is protected by personal accounts and an additional verification step.',
    '## Updates',
    'Last updated {date}.',
  ].join('\n\n'),
} as const;

/** Splits the stored text into headings (`## …`) and paragraphs for rendering; no HTML is ever interpreted. */
export function privacyBlocks(text: string): Array<{ kind: 'h2' | 'p'; text: string }> {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => (b.startsWith('## ') ? { kind: 'h2' as const, text: b.slice(3).trim() } : { kind: 'p' as const, text: b }));
}

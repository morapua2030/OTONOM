import type { Config } from 'payload';
/**
 * OTONOM admin wording: the ONE place for every word the admin shows (R3, owner 2026-11-22).
 * Every entry is a pair { ar, en }. To change a word, change it here only.
 * Rules (checked by test/admin-copy.test.ts): both languages filled; a page line is one sentence of at most 12 words
 * in each language, with no technical words; a field help is at most 10 words.
 * Labels passed to Payload use the same pairs (Payload picks the entry for the admin language).
 */
export type Pair = { ar: string; en: string };
export type AdminLang = 'ar' | 'en';

/** The admin language from Payload's i18n (anything other than English is Arabic, the default). */
export const langOf = (language: string | undefined | null): AdminLang => (language === 'en' ? 'en' : 'ar');
/**
 * A left-to-right run inside Arabic text (phone formats, model codes, e-mails, links): wrapped in Unicode isolates
 * (LRI … PDI), the plain-text form of <bdi dir="ltr">, so «+20…» never shows as «20+…». Help texts are plain strings
 * (Payload prints them as text), so this is how they keep their direction.
 */
export const ltr = (text: string) => `\u2066${text}\u2069`;
export const pick = (pair: Pair, language: string | undefined | null): string => pair[langOf(language)];

/** Menu groups, in menu order (M3). */
export const GROUP = {
  home: { ar: 'الرئيسية', en: 'Home' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  catalog: { ar: 'الباقات والأجهزة', en: 'Packages & devices' },
  photos: { ar: 'الصور', en: 'Photos' },
  site: { ar: 'محتوى الموقع', en: 'Website content' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
} as const satisfies Record<string, Pair>;

export type PageCopy = { name: Pair; one?: Pair; line: Pair };

/** Every page in the menu: its name (plural for lists), the singular for one item, and its page line (M4). */
export const PAGE = {
  home: {
    name: { ar: 'الرئيسية', en: 'Home' },
    line: { ar: 'ملخص سريع: الحجوزات الجديدة وأهم حاجة محتاجاك النهارده.', en: 'Quick summary: new bookings and what needs you today.' },
  },
  leads: {
    name: { ar: 'طلبات الحجز', en: 'Booking requests' },
    one: { ar: 'طلب حجز', en: 'Booking request' },
    line: { ar: 'كل حجز جه من الموقع؛ كلّم العميل وبعدين غيّر الحالة.', en: 'Every booking from the website: call the customer, then update the status.' },
  },
  lead: {
    name: { ar: 'طلب حجز', en: 'Booking request' },
    line: { ar: 'بيانات الحجز: كلّم العميل، اكتب ملاحظة، وحدّث الحالة.', en: 'Booking details: call the customer, add a note, update the status.' },
  },
  siteNumbers: {
    name: { ar: 'أرقام الموقع', en: 'Site numbers' },
    line: { ar: 'أرقام الزيارات والحجوزات، من غير ما نعرف مين الزائر.', en: 'Visit and booking numbers; no visitor is identified.' },
  },
  packages: {
    name: { ar: 'الباقات', en: 'Packages' },
    one: { ar: 'باقة', en: 'Package' },
    line: { ar: 'الباقات والأسعار اللي بتظهر في الموقع؛ عدّل وبعدين انشر.', en: 'Packages and prices shown on the website; edit, then publish.' },
  },
  controllers: {
    name: { ar: 'أجهزة التحكم', en: 'Controllers' },
    one: { ar: 'جهاز تحكم', en: 'Controller' },
    line: { ar: `أجهزة التحكم ${ltr('4R')} و${ltr('6R')} و${ltr('16R')} وبياناتها في الموقع.`, en: 'The 4R, 6R and 16R controllers and their details on the site.' },
  },
  media: {
    name: { ar: 'مكتبة الصور', en: 'Photo library' },
    one: { ar: 'صورة', en: 'Photo' },
    line: { ar: 'ارفع الصورة، اكتب وصفها عربي وإنجليزي، وبعدين وافق عليها.', en: 'Upload a photo, describe it in Arabic and English, then approve it.' },
  },
  announcement: {
    name: { ar: 'شريط الإعلان', en: 'Announcement bar' },
    line: { ar: 'سطر فوق الموقع لعرض أو خبر؛ شغّله وحدد مدته.', en: 'A line above the site for news or offers, on chosen dates.' },
  },
  faqs: {
    name: { ar: 'الأسئلة الشائعة', en: 'FAQs' },
    one: { ar: 'سؤال', en: 'Question' },
    line: { ar: 'الأسئلة والإجابات اللي بتظهر في صفحات الخدمات.', en: 'Questions and answers shown on the service pages.' },
  },
  contact: {
    name: { ar: 'بيانات التواصل', en: 'Contact info' },
    line: { ar: 'التليفون والواتساب والعنوان اللي بيظهروا للعملاء.', en: 'Phone, WhatsApp and address shown to customers.' },
  },
  simRoutines: {
    name: { ar: 'سيناريوهات المحاكي', en: 'Simulator routines' },
    one: { ar: 'سيناريو', en: 'Routine' },
    line: { ar: 'نصوص السيناريوهات اللي في صفحة «جرّب».', en: 'Texts of the routines on the Try page.' },
  },
  simRules: {
    name: { ar: 'قواعد المحاكي', en: 'Simulator rules' },
    line: { ar: 'أرقام ثابتة بيحسب بيها المحاكي؛ غيّرها بحذر.', en: 'Fixed numbers the simulator uses; change them carefully.' },
  },
  privacy: {
    name: { ar: 'نص الخصوصية', en: 'Privacy text' },
    line: { ar: 'نص الخصوصية؛ لازم توافق عليه علشان فورم الحجز يظهر.', en: 'The privacy text; approve it so the booking form shows.' },
  },
  bookingForm: {
    name: { ar: 'فورم الحجز', en: 'Booking form' },
    line: { ar: 'تشغيل فورم الحجز أو قفله، ومدة الاحتفاظ بالحجوزات.', en: 'Switch the booking form on or off; choose how long bookings stay.' },
  },
  users: {
    name: { ar: 'المستخدمين', en: 'Users' },
    one: { ar: 'مستخدم', en: 'User' },
    line: { ar: 'الناس اللي بتدخل هنا، وصلاحية كل واحد.', en: 'People who can sign in here, and what each can do.' },
  },
  accountSecurity: {
    name: { ar: 'أمان الحساب', en: 'Account security' },
    line: { ar: 'باسوردك والتحقق بخطوتين لحسابك.', en: 'Your password and two-step sign-in.' },
  },
  reports: {
    name: { ar: 'التقارير', en: 'Reports' },
    line: { ar: 'مؤشرات أداء الموقع والمبيعات.', en: 'Website and sales performance indicators.' },
  },
  settings: {
    name: { ar: 'إعدادات عامة', en: 'General settings' },
    line: { ar: 'إعدادات عامة؛ البيع أونلاين مقفول دلوقتي.', en: 'General settings; online selling is off for now.' },
  },
  hidden: {
    name: { ar: 'الصفحات المخفية', en: 'Hidden pages' },
    line: { ar: 'صفحات مش مستخدمة دلوقتي، مخفية بس ومفيش حاجة اتمسحت.', en: 'Pages not in use now, only hidden; nothing was deleted.' },
  },
} as const satisfies Record<string, PageCopy>;

/** Lead statuses: labels and the next-step hint under the status (M4). Values never change. */
export const LEAD_STATUS_COPY = {
  NEW: { label: { ar: 'جديد', en: 'New' }, hint: { ar: 'كلّم العميل، وبعدها غيّر الحالة لـ «اتواصلنا».', en: 'Call the customer, then set the status to Contacted.' } },
  CONTACTED: { label: { ar: 'اتواصلنا', en: 'Contacted' }, hint: { ar: 'لو اتفقتوا على زيارة، غيّرها لـ «زيارة متحددة».', en: 'If you agreed on a visit, set Visit scheduled.' } },
  VISIT_SCHEDULED: { label: { ar: 'زيارة متحددة', en: 'Visit scheduled' }, hint: { ar: 'بعد الزيارة ابعت عرض السعر وغيّرها لـ «عرض سعر».', en: 'After the visit, send the quote and set Quote sent.' } },
  QUOTED: { label: { ar: 'عرض سعر', en: 'Quote sent' }, hint: { ar: 'تابع مع العميل لو ما ردّش.', en: "Follow up if the customer hasn't replied." } },
  FOLLOW_UP: { label: { ar: 'اتباع', en: 'Follow up' }, hint: { ar: 'اكتب ملاحظة بآخر حاجة حصلت.', en: 'Add a note with the latest update.' } },
  NOT_INTERESTED: { label: { ar: 'مش مهتم', en: 'Not interested' }, hint: { ar: 'مفيش خطوة جاية.', en: 'No next step.' } },
} as const satisfies Record<string, { label: Pair; hint: Pair }>;

/** Words used by the shell, the menu and the screens. */
export const UI = {
  brand: { ar: 'لوحة OTONOM', en: 'OTONOM admin' },
  menu: { ar: 'القائمة', en: 'Menu' },
  closeMenu: { ar: 'اقفل القائمة', en: 'Close menu' },
  mainMenu: { ar: 'القائمة الرئيسية', en: 'Main menu' },
  language: { ar: 'اللغة', en: 'Language' },
  arabic: { ar: 'عربي', en: 'عربي' },
  english: { ar: 'English', en: 'English' },
  logout: { ar: 'خروج', en: 'Sign out' },
  myAccount: { ar: 'حسابي', en: 'My account' },
  signedInAs: { ar: 'داخل باسم', en: 'Signed in as' },
  role: {
    OWNER: { ar: 'المالك', en: 'Owner' },
    ADMIN: { ar: 'مدير', en: 'Admin' },
    SALES: { ar: 'مبيعات', en: 'Sales' },
    EDITOR: { ar: 'محرر', en: 'Editor' },
    ENGINEER: { ar: 'مهندس', en: 'Engineer' },
    STORE: { ar: 'مخزن', en: 'Store' },
  },
  contentLanguage: { ar: 'لغة المحتوى اللي بتعدّله', en: "Content language you're editing" },
  call: { ar: 'اتصال', en: 'Call' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  callCustomer: { ar: 'اتصل بالعميل', en: 'Call the customer' },
  whatsappCustomer: { ar: 'واتساب للعميل', en: 'WhatsApp the customer' },
  all: { ar: 'الكل', en: 'All' },
  quickFilters: { ar: 'فلترة سريعة حسب الحالة', en: 'Quick filter by status' },
  nextStep: { ar: 'الخطوة الجاية', en: 'Next step' },
  createdAt: { ar: 'وصل', en: 'Received' },
  none: { ar: '—', en: '—' },
  open: { ar: 'افتح', en: 'Open' },
  ownerOnly: { ar: 'الصفحة دي للمالك بس.', en: 'This page is for the owner only.' },
} as const;

/** Home (M5). */
export const HOME = {
  greeting: {
    morning: { ar: 'صباح الخير', en: 'Good morning' },
    evening: { ar: 'مساء الخير', en: 'Good evening' },
  },
  cards: {
    newBookings: { ar: 'حجوزات جديدة مستنياك', en: 'New bookings waiting' },
    newBookingsAction: { ar: 'افتح الجديدة', en: 'Open new ones' },
    week: { ar: 'حجوزات آخر 7 أيام', en: 'Bookings in the last 7 days' },
    photos: { ar: 'صور مستنية موافقة', en: 'Photos waiting for approval' },
    photosAction: { ar: 'راجع الصور', en: 'Review photos' },
    form: { ar: 'فورم الحجز', en: 'Booking form' },
    formOn: { ar: 'شغّال على الموقع', en: 'On, shown on the website' },
    formOff: { ar: 'مقفول، مش ظاهر على الموقع', en: 'Off, not shown on the website' },
    formOffWhy: {
      intake: { ar: 'الفورم مقفول من «فورم الحجز».', en: 'Switched off in Booking form.' },
      privacy: { ar: 'نص الخصوصية لسه مش متوافق عليه.', en: 'The privacy text is not approved yet.' },
    },
  },
  quick: { ar: 'اختصارات', en: 'Shortcuts' },
  actions: {
    bookings: { ar: 'افتح الحجوزات', en: 'Open bookings' },
    photo: { ar: 'ارفع صورة', en: 'Upload a photo' },
    announcement: { ar: 'عدّل شريط الإعلان', en: 'Edit the announcement bar' },
    faqs: { ar: 'عدّل الأسئلة الشائعة', en: 'Edit FAQs' },
    contact: { ar: 'عدّل بيانات التواصل', en: 'Edit contact info' },
  },
  latest: { ar: 'آخر 5 حجوزات', en: 'Latest 5 bookings' },
  latestEmpty: { ar: 'مفيش حجوزات لسه.', en: 'No bookings yet.' },
  seeAll: { ar: 'كل الحجوزات', en: 'All bookings' },
} as const;

/** Field labels and help used on the booking page (M7) and the list (M6). */
export const LEAD_FIELDS = {
  ref: { label: { ar: 'كود الحجز', en: 'Booking code' } },
  name: { label: { ar: 'الاسم', en: 'Name' } },
  phone: { label: { ar: 'الموبايل', en: 'Mobile' }, help: { ar: `موبايل مصري، محفوظ بصيغة ${ltr('+20…')}`, en: 'Egyptian mobile, stored as +20…' } },
  package: { label: { ar: 'الباقة', en: 'Package' } },
  message: { label: { ar: 'ملاحظة العميل', en: "Customer's note" }, help: { ar: 'ملاحظة كتبها العميل، لحد 500 حرف.', en: 'A note the customer wrote, up to 500 characters.' } },
  plan: { label: { ar: 'خطة المحاكي', en: 'Simulator plan' }, help: { ar: 'اتبعتت أوتوماتيك من صفحة «جرّب».', en: 'Sent automatically from the Try page.' } },
  source: { label: { ar: 'جه منين', en: 'Came from' } },
  locale: { label: { ar: 'لغة العميل', en: "Customer's language" } },
  consent: { label: { ar: 'موافقة الخصوصية', en: 'Privacy consent' } },
  consentGiven: { label: { ar: 'وافق على الخصوصية', en: 'Agreed to the privacy text' } },
  consentAt: { label: { ar: 'وقت الموافقة', en: 'Agreed at' } },
  privacyVersion: { label: { ar: 'نسخة نص الخصوصية', en: 'Privacy text version' }, help: { ar: 'تاريخ نص الخصوصية اللي العميل وافق عليه.', en: 'Date of the privacy text the customer accepted.' } },
  status: { label: { ar: 'الحالة', en: 'Status' } },
  assignee: { label: { ar: 'مسؤول المتابعة', en: 'Assigned to' }, help: { ar: 'مين من الفريق بيتابع الحجز ده.', en: 'Who on the team follows this booking.' } },
  notes: { label: { ar: 'ملاحظات المتابعة', en: 'Follow-up notes' }, help: { ar: 'الملاحظات بتتضاف بس، مش بتتعدل ولا بتتمسح.', en: 'Notes are added only, never edited or removed.' } },
  note: { label: { ar: 'ملاحظة', en: 'Note' } },
  noteText: { label: { ar: 'النص', en: 'Text' } },
  noteBy: { label: { ar: 'كتبها', en: 'Written by' } },
  noteAt: { label: { ar: 'اتكتبت', en: 'Written at' } },
  lastActivityAt: { label: { ar: 'آخر تعديل', en: 'Last update' } },
  createdAt: { label: { ar: 'تاريخ الحجز', en: 'Booked on' } },
} as const;

export const LEAD_SECTIONS = {
  customer: { ar: 'العميل', en: 'Customer' },
  request: { ar: 'الطلب', en: 'Request' },
  followUp: { ar: 'المتابعة', en: 'Follow-up' },
  consent: { ar: 'موافقة الخصوصية', en: 'Privacy consent' },
  technical: { ar: 'تفاصيل تقنية', en: 'Technical details' },
} as const satisfies Record<string, Pair>;

export const LEAD_PACKAGE_COPY = {
  premium: { ar: 'بريميوم', en: 'Premium' },
  plus: { ar: 'بلس', en: 'Plus' },
  essential: { ar: 'إسنشيال', en: 'Essential' },
  unsure: { ar: 'مش متأكد', en: 'Not sure' },
} as const satisfies Record<string, Pair>;

export const LEAD_SOURCE_COPY = {
  contact: { ar: 'صفحة التواصل', en: 'Contact page' },
  simulator: { ar: 'المحاكي', en: 'Simulator' },
} as const satisfies Record<string, Pair>;

export const LOCALE_COPY = {
  ar: { ar: 'عربي', en: 'Arabic' },
  en: { ar: 'إنجليزي', en: 'English' },
} as const satisfies Record<string, Pair>;

/**
 * Staff sign-in (M8): words only. The English side keeps today's English words; the Arabic is plain Egyptian Arabic.
 * `{x}` marks a value filled in by the screen.
 */
export const STAFF_LOGIN = {
  title: { ar: 'دخول فريق OTONOM', en: 'OTONOM staff sign-in' },
  line: { ar: 'ادخل بإيميلك والباسورد، وبعدها كود التحقق.', en: 'Sign in with your e-mail and password, then your code.' },
  email: { ar: 'الإيميل', en: 'Email' },
  password: { ar: 'الباسورد', en: 'Password' },
  continue: { ar: 'كمّل', en: 'Continue' },
  working: { ar: 'استنى ثانية…', en: 'Please wait…' },
  signInFailed: { ar: 'الدخول ما نجحش. راجع الإيميل والباسورد.', en: 'Sign-in failed. Check your email and password.' },
  statusFailed: { ar: 'مش قادرين نتأكد من حالة الحماية دلوقتي. جرّب تاني.', en: 'Unable to check verification status.' },
  emailTitle: { ar: 'شوف إيميلك', en: 'Check your email' },
  emailSent: { ar: `بعتنالك كود من 6 أرقام على ${ltr('{destination}')}.`, en: 'We sent a six-digit code to {destination}.' },
  yourInbox: { ar: 'إيميلك', en: 'your inbox' },
  emailCode: { ar: 'كود الإيميل', en: 'Email verification code' },
  verifyEmail: { ar: 'تأكيد الكود', en: 'Verify email code' },
  resend: { ar: 'ابعت كود جديد', en: 'Resend code' },
  resendIn: { ar: 'تقدر تطلب كود جديد بعد {seconds} ثانية', en: 'Resend in {seconds}s' },
  expiresIn: { ar: 'الكود بيخلص بعد {seconds} ثانية.', en: 'Code expires in {seconds}s.' },
  emailInvalid: { ar: 'الكود ده مش صح. استخدم آخر إيميل وصلك وجرّب تاني.', en: 'That code is not valid. Check the latest email and try again.' },
  emailExpired: { ar: 'الكود خلص. اطلب كود جديد.', en: 'That code expired. Request a new one.' },
  emailLocked: { ar: 'محاولات غلط كتير. اطلب كود جديد.', en: 'Too many incorrect attempts. Request a new code.' },
  emailUnavailable: { ar: 'كود الإيميل مش متاح دلوقتي. جرّب كمان شوية.', en: 'Email verification is temporarily unavailable. Try again shortly.' },
  enrollText: { ar: 'لازم تربط الحساب ده بتطبيق التحقق قبل ما تدخل لوحة التحكم.', en: 'This staff account must enroll an authenticator before admin access is allowed.' },
  createKey: { ar: 'اعمل مفتاح التحقق', en: 'Create authenticator key' },
  setupText: { ar: 'ضيف المفتاح ده في تطبيق التحقق. هيظهر مرة واحدة بس.', en: 'Add this one-time setup key to your authenticator. It is shown only during enrollment.' },
  setupKey: { ar: 'مفتاح تطبيق التحقق', en: 'Authenticator setup key' },
  authenticatorCode: { ar: 'كود تطبيق التحقق', en: 'Authenticator code' },
  recoveryCode: { ar: 'كود الطوارئ', en: 'Recovery code' },
  verifyFinish: { ar: 'تأكيد وكمّل', en: 'Verify and finish' },
  verify: { ar: 'تأكيد', en: 'Verify' },
  useAuthenticator: { ar: 'استخدم تطبيق التحقق', en: 'Use authenticator code' },
  useRecovery: { ar: 'استخدم كود طوارئ', en: 'Use a recovery code' },
  mfaInvalid: { ar: 'الكود ما اتقبلش. استنى الكود اللي بعده وجرّب تاني.', en: 'Code not accepted. Wait for the next code and try again.' },
  recoveryInvalid: { ar: 'كود الطوارئ ما اتقبلش.', en: 'Recovery code not accepted.' },
  verified: { ar: 'تمام. بنفتح لوحة التحكم…', en: 'Verified. Opening the admin panel…' },
  saveRecovery: { ar: 'احفظ أكواد الطوارئ دي في مكان آمن. مش هتظهر تاني.', en: 'Save these one-time recovery codes securely. They will not be shown again.' },
  recoveryCodes: { ar: 'أكواد الطوارئ', en: 'Recovery codes' },
  admin: { ar: 'ادخل لوحة التحكم', en: 'Continue to admin' },
  forgot: { ar: 'نسيت الباسورد؟', en: 'Forgot your password?' },
  reenrollTitle: { ar: 'دخلت بكود طوارئ', en: 'Signed in with a recovery code' },
  reenrollText: {
    ar: 'موبايلك ضاع؟ اربط تطبيق تحقق جديد دلوقتي. القديم هيبطل يشتغل، وكل جلساتك التانية هتقفل، وهتاخد أكواد طوارئ جديدة.',
    en: 'Lost your phone? Set up a new authenticator now. The old one stops working, your other sessions are signed out, and you get new recovery codes.',
  },
  reenrollStart: { ar: 'اربط تطبيق تحقق جديد', en: 'Set up a new authenticator' },
  reenrollLater: { ar: 'مش دلوقتي، ادخل لوحة التحكم', en: 'Not now, continue to admin' },
  reenrollExpired: { ar: 'وقت الربط خلص. ابدأ من الأول.', en: 'This setup expired. Start again.' },
} as const satisfies Record<string, Pair>;

const fill = (text: string, vars: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** The sign-in words for one language, in the shape the sign-in screen uses (strings, and three small templates). */
export function staffLoginWords(lang: AdminLang) {
  const w = Object.fromEntries(Object.entries(STAFF_LOGIN).map(([k, v]) => [k, v[lang]])) as { [K in keyof typeof STAFF_LOGIN]: string };
  return {
    ...w,
    emailSent: (destination: string) => fill(w.emailSent, { destination }),
    resendIn: (seconds: number) => fill(w.resendIn, { seconds }),
    expiresIn: (seconds: number) => fill(w.expiresIn, { seconds }),
  };
}

/** Words that must never appear in a page line or a help text (M4). */
export const BANNED_WORDS = ['collection', 'global', 'record', 'document', 'entity', 'slug', 'schema', 'api', 'cms', 'field', 'payload', 'draft workflow'];

/** Word count used by the copy rules (Arabic and English). */
export const wordCount = (s: string) => s.replace(/[«»"“”().,:;!?؟،؛—–-]/g, ' ').split(/\s+/).filter(Boolean).length;

/**
 * A few of Payload's own words, changed so the screens use the same words as the menu (merged over Payload's
 * Arabic and English translations; every other Payload word stays Payload's).
 */
export const PAYLOAD_TRANSLATIONS = {
  ar: {
    general: { locale: 'لغة المحتوى اللي بتعدّله', dashboard: 'الرئيسية', createNew: 'إضافة جديد', createdAt: 'التاريخ' },
    authentication: { logOut: 'خروج' },
  },
  en: {
    general: { locale: "Content language you're editing", dashboard: 'Home', createdAt: 'Date' },
    authentication: { logOut: 'Sign out' },
  },
} as unknown as NonNullable<Config['i18n']>['translations']; // partial: Payload deep-merges it over its full translations

/* ---------------------------------------------------------------------------------------------------------------------
 * Every other page in the menu (M9): field labels, option labels and help. Help texts are at most 10 words.
 * ------------------------------------------------------------------------------------------------------------------- */

/** Ar/En pairs: «الاسم (عربي)» and «الاسم (English)» (M1), side by side on desktop. */
export const pairLabels = (label: Pair): { ar: Pair; en: Pair } => ({
  ar: { ar: `${label.ar} (عربي)`, en: `${label.en} (Arabic)` },
  en: { ar: `${label.ar} (English)`, en: `${label.en} (English)` },
});
/** Fields the public site does not show today (M4). */
export const NOT_ON_SITE: Pair = { ar: 'مش بيظهر على الموقع لسه.', en: 'Not shown on the site yet.' };
/** Controllers' internal fields (owner decision 11-15). */
export const INTERNAL: Pair = { ar: 'داخلي — مش بيظهر على الموقع.', en: 'Internal — not shown on the site.' };

export const REVIEW_COPY = {
  label: { ar: 'حالة المراجعة', en: 'Review state' },
  help: { ar: 'مسودة، بعدين مستنية مراجعة، بعدين منشورة.', en: 'Draft, then in review, then published.' },
  options: {
    DRAFT: { ar: 'مسودة', en: 'Draft' },
    IN_REVIEW: { ar: 'مستنية مراجعة', en: 'In review' },
    PUBLISHED: { ar: 'منشورة', en: 'Published' },
  },
} as const;
export const ORDER_COPY = { label: { ar: 'الترتيب', en: 'Order' }, help: { ar: 'الرقم الأصغر بيظهر الأول.', en: 'Smaller numbers show first.' } } as const;
export const ACTIVE_COPY = { label: { ar: 'ظاهر', en: 'Shown' }, help: { ar: 'لو مش متعلّم، مش هيظهر حتى لو منشور.', en: 'Unticked hides it, even when published.' } } as const;

export const MODEL_COPY = { '4r': { ar: '4R', en: '4R' }, '6r': { ar: '6R', en: '6R' }, '16r': { ar: '16R', en: '16R' } } as const satisfies Record<string, Pair>;

export const PACKAGE_F = {
  packageId: { label: { ar: 'الباقة', en: 'Package' }, help: { ar: 'ثابتة، مش بتتغير.', en: 'Fixed; it cannot change.' } },
  name: { label: { ar: 'الاسم', en: 'Name' } },
  price: { label: { ar: 'السعر (جنيه)', en: 'Price (EGP)' }, help: { ar: 'رقم صحيح بالجنيه، من غير كسور.', en: 'A whole number in Egyptian pounds.' } },
  mostComplete: { label: { ar: 'شارة «الأكمل»', en: '“Most complete” badge' }, help: { ar: 'بيحط الشارة على الباقة دي في الموقع.', en: 'Shows the badge on this package on the site.' } },
  badge: { label: { ar: 'نص الشارة', en: 'Badge text' }, help: { ar: 'بيظهر بس لو شارة «الأكمل» متعلّمة.', en: 'Shown only when the badge is ticked.' } },
  items: { label: { ar: 'اللي جوه الباقة', en: 'What the package includes' }, one: { ar: 'عنصر', en: 'Item' }, many: { ar: 'عناصر', en: 'Items' } },
  itemKey: { label: { ar: 'النوع', en: 'Type' } },
  itemName: { label: { ar: 'اسم العنصر', en: 'Item name' } },
  quantity: { label: { ar: 'العدد', en: 'Quantity' } },
  model: { label: { ar: 'الموديل', en: 'Model' }, help: { ar: 'بيربط العنصر بصفحة جهاز التحكم.', en: 'Links the item to its controller page.' } },
  photo: { label: { ar: 'الصورة', en: 'Photo' } },
} as const;
export const ITEM_KEY_COPY = {
  alexa: { ar: 'جهاز Amazon Alexa', en: 'Amazon Alexa device' },
  lock: { ar: 'قفل ذكي', en: 'Smart lock' },
  ir: { ar: 'ريموت IR', en: 'IR remote' },
  gas: { ar: 'حساس غاز', en: 'Gas sensor' },
  controller: { ar: 'جهاز تحكم', en: 'Controller' },
  panel: { ar: 'لوحة كهرباء وأسلاك', en: 'Electrical panel and wires' },
} as const satisfies Record<string, Pair>;

export const CONTROLLER_F = {
  model: { label: { ar: 'الموديل', en: 'Model' }, help: { ar: 'ثابت، مش بيتغير.', en: 'Fixed; it cannot change.' } },
  name: { label: { ar: 'الاسم', en: 'Name' } },
  channels: { label: { ar: 'عدد القنوات', en: 'Channels' }, help: { ar: `لازم 4 أو 6 أو 16 حسب الموديل.`, en: 'Must be 4, 6 or 16 for the model.' } },
  override: { label: { ar: 'السماح بعدد قنوات تاني', en: 'Allow another channel count' }, help: { ar: 'للمالك بس: يسمح برقم غير 4 أو 6 أو 16.', en: 'Owner only: allows a number other than 4, 6, 16.' } },
  photo: { label: { ar: 'الصورة', en: 'Photo' }, help: { ar: 'صورة الجهاز في صفحة المنتج.', en: 'The controller photo on its product page.' } },
  note: { label: { ar: 'ملاحظة', en: 'Note' } },
  inPackages: { label: { ar: 'داخل في الباقات', en: 'Part of the packages' } },
} as const;

export const ROUTINE_F = {
  routineId: { label: { ar: 'السيناريو', en: 'Routine' }, help: { ar: 'الخطوات ثابتة في البيت التجريبي؛ هنا النصوص بس.', en: 'Its steps are built in; only its texts live here.' } },
  title: { label: { ar: 'العنوان', en: 'Title' } },
  trigger: { label: { ar: 'بيبدأ إمتى', en: 'Starts when' } },
  actions: { label: { ar: 'اللي بيحصل', en: 'What happens' }, help: { ar: 'خطوة في كل سطر.', en: 'One step per line.' } },
  premium: { label: { ar: 'محتاج القفل الذكي (بريميوم)', en: 'Needs the smart lock (Premium)' } },
} as const;
export const ROUTINE_COPY = {
  morning: { ar: 'صباح الخير', en: 'Good morning' },
  leave: { ar: 'خارج من البيت', en: 'Leaving home' },
  arrive: { ar: 'وصلت البيت', en: 'Arriving home' },
  night: { ar: 'تصبح على خير', en: 'Good night' },
  guests: { ar: 'وضع الضيوف', en: 'Guests' },
  suhoor: { ar: 'السحور في رمضان', en: 'Ramadan suhoor' },
  travel: { ar: 'وإنت مسافر', en: 'While travelling' },
  pump: { ar: 'موتور المياه بمواعيد', en: 'Water pump schedule' },
  gas: { ar: 'أمان الغاز', en: 'Gas safety' },
} as const satisfies Record<string, Pair>;

export const FAQ_F = {
  service: { label: { ar: 'الخدمة', en: 'Service' } },
  question: { label: { ar: 'السؤال', en: 'Question' } },
  answer: { label: { ar: 'الإجابة', en: 'Answer' } },
} as const;
export const SERVICE_COPY = {
  iot: { ar: 'إنترنت الأشياء والأنظمة المدمجة', en: 'IoT & Embedded' },
  soft: { ar: 'هندسة البرمجيات', en: 'Software Engineering' },
  custom: { ar: 'الهندسة المخصصة والبحث والتطوير', en: 'Custom Engineering & R&D' },
} as const satisfies Record<string, Pair>;

export const CONTACT_F = {
  phone: { label: { ar: 'رقم التليفون', en: 'Phone number' }, help: { ar: `بالصيغة الدولية، زي ${ltr('+201234567890')}.`, en: 'International format, like +201234567890.' } },
  whatsapp: { label: { ar: 'رقم الواتساب', en: 'WhatsApp number' }, help: { ar: `بالصيغة الدولية، زي ${ltr('+201234567890')}.`, en: 'International format, like +201234567890.' } },
  email: { label: { ar: 'الإيميل', en: 'Email' }, help: { ar: 'بيظهر جوه نص الخصوصية بس.', en: 'Shown only inside the privacy text.' } },
  address: { label: { ar: 'العنوان', en: 'Address' } },
  hours: { label: { ar: 'مواعيد العمل', en: 'Opening hours' } },
  socials: { label: { ar: 'لينكات السوشيال ميديا', en: 'Social links' }, help: { ar: 'اللينك الفاضي مش بيظهر في الموقع.', en: 'Empty links are hidden on the site.' }, one: { ar: 'لينك', en: 'Link' }, many: { ar: 'لينكات', en: 'Links' } },
  network: { label: { ar: 'الشبكة', en: 'Network' } },
  url: { label: { ar: 'اللينك', en: 'Link' }, help: { ar: `لازم يبدأ بـ ${ltr('https://')}`, en: 'Must start with https://' } },
} as const;
export const NETWORK_COPY = {
  facebook: { ar: 'فيسبوك', en: 'Facebook' },
  instagram: { ar: 'إنستجرام', en: 'Instagram' },
  linkedin: { ar: 'لينكدإن', en: 'LinkedIn' },
  youtube: { ar: 'يوتيوب', en: 'YouTube' },
  tiktok: { ar: 'تيك توك', en: 'TikTok' },
  x: { ar: 'إكس', en: 'X' },
} as const satisfies Record<string, Pair>;

export const ANNOUNCEMENT_F = {
  enabled: { label: { ar: 'شغّال', en: 'On' }, help: { ar: 'محتاج النص العربي والإنجليزي الاتنين.', en: 'Needs both the Arabic and the English text.' } },
  text: { label: { ar: 'النص', en: 'Text' } },
  link: { label: { ar: 'اللينك', en: 'Link' }, help: { ar: `صفحة زي ${ltr('/ar/contact')} أو لينك ${ltr('https://')}.`, en: 'A page like /ar/contact, or an https:// link.' } },
  from: { label: { ar: 'يبدأ من', en: 'Starts' }, help: { ar: 'فاضي يعني من دلوقتي.', en: 'Empty means from now.' } },
  to: { label: { ar: 'ينتهي في', en: 'Ends' }, help: { ar: 'فاضي يعني من غير نهاية.', en: 'Empty means no end date.' } },
} as const;

export const SIM_RULES_F = {
  ac: { label: { ar: 'قنوات التكييف', en: 'AC channels' }, help: { ar: 'قنوات لكل تكييف؛ التكييف بالريموت يعني 0.', en: 'Channels per AC; IR-controlled AC means 0.' } },
  perDevice: { label: { ar: 'قنوات لكل جهاز', en: 'Channels per device' }, help: { ar: 'السخان أو الموتور أو الستارة: قنوات كل جهاز.', en: 'Channels each device uses (heater, pump, curtain).' } },
  review: { label: { ar: 'مراجعة مهندس فوق', en: 'Engineer review above' }, help: { ar: 'فوق العدد ده من القنوات، المحاكي يطلب مراجعة مهندس.', en: 'Above this many channels, the simulator asks for review.' } },
} as const;

export const PRIVACY_F = {
  body: { label: { ar: 'نص الخصوصية', en: 'Privacy text' }, help: { ar: `${ltr('{contact}')} و${ltr('{date}')} بيتملوا لوحدهم.`, en: '{contact} and {date} are filled in automatically.' } },
  lastUpdated: { label: { ar: 'آخر تحديث', en: 'Last updated' } },
  approved: { label: { ar: 'الموافقة على نص الخصوصية', en: 'Approve the privacy text' }, help: { ar: 'للمالك بس؛ لو اتشالت، فورم الحجز بيختفي.', en: 'Owner only; switching it off hides the booking form.' } },
  approvedBy: { label: { ar: 'وافق عليه', en: 'Approved by' } },
  approvedAt: { label: { ar: 'وقت الموافقة', en: 'Approved at' } },
} as const;

export const BOOKING_FORM_F = {
  enabled: { label: { ar: 'استقبال الحجوزات من الموقع', en: 'Accept bookings on the site' }, help: { ar: 'بيظهر بس لو نص الخصوصية متوافق عليه.', en: 'Shows only while the privacy text is approved.' } },
  retention: { label: { ar: 'الاحتفاظ بالحجوزات (شهور)', en: 'Keep bookings (months)' }, help: { ar: 'الحجز بيتمسح بعد المدة دي من آخر تعديل.', en: 'Deleted this many months after its last update.' } },
} as const;

export const USER_F = {
  role: { label: { ar: 'الدور', en: 'Role' }, help: { ar: 'بيحدد الصفحات اللي يقدر يشتغل فيها.', en: 'Decides which pages this person can work on.' } },
  canPublish: { label: { ar: 'يقدر ينشر محتوى الموقع', en: 'Can publish site content' }, help: { ar: 'للمالك بس: يسمح للمحرر إنه ينشر.', en: 'Owner only: lets an editor publish.' } },
  mfaEnabled: { label: { ar: 'التحقق بخطوتين شغّال', en: 'Two-step sign-in on' } },
} as const;
export const ROLE_COPY = { ...UI.role, CUSTOMER: { ar: 'عميل', en: 'Customer' } } as const satisfies Record<string, Pair>;

export const SETTINGS_F = {
  stage: { label: { ar: 'البيع أونلاين', en: 'Online selling' }, help: { ar: 'عرض بس: البيع أونلاين مقفول.', en: 'Display only: online selling is off.' } },
  northStar: { label: { ar: 'المؤشر الأساسي', en: 'Main indicator' }, help: { ar: 'اختيار المالك؛ بيتعلّم في التقارير بس.', en: "The owner's choice; only highlighted in Reports." } },
} as const;
export const STAGE_COPY = { PREVIEW: { ar: 'مقفول (عرض بس)', en: 'Off (display only)' }, COMMERCIAL: { ar: 'شغّال', en: 'On' } } as const satisfies Record<string, Pair>;
export const KPI_COPY = {
  UNSELECTED: { ar: 'لسه ما اتحددش', en: 'Not chosen yet' },
  'KPI-001_websiteSourced': { ar: 'جاي من الموقع بس', en: 'Website-sourced only' },
  'KPI-002_websiteAssisted': { ar: 'الموقع ساعد فيه', en: 'Website-assisted' },
  'KPI-003_totalWebsiteInfluenced': { ar: 'كل اللي الموقع أثّر فيه', en: 'Total website-influenced' },
  'KPI-004_nonWebsite': { ar: 'مش من الموقع', en: 'Not from the website' },
  'KPI-005_unknown': { ar: 'مش معروف', en: 'Unknown' },
  'KPI-006_totalEligible': { ar: 'الإجمالي', en: 'Total eligible' },
  'KPI-015_attributionCoveragePct': { ar: 'نسبة العقود المصنّفة', en: 'Attribution coverage (%)' },
  'KPI-016_overrideRatePct': { ar: 'نسبة التعديل اليدوي', en: 'Manual override rate (%)' },
} as const satisfies Record<string, Pair>;

export const MEDIA_F = {
  alt: { label: { ar: 'وصف الصورة', en: 'Photo description' }, help: { ar: 'اكتبه عربي، وبعدين غيّر «لغة المحتوى» واكتبه إنجليزي.', en: 'Write it in Arabic, switch the content language, then English.' } },
  status: { label: { ar: 'الحالة', en: 'Status' }, help: { ar: 'الصورة بتظهر في الموقع بعد الموافقة بس.', en: 'Shown on the site only after approval.' } },
  client: { label: { ar: 'صورة من بيت عميل', en: "Shows a client's home" }, help: { ar: 'لو أيوه، لازم موافقة العميل مكتوبة.', en: "If yes, the client's written consent is required." } },
  consent: { label: { ar: 'موافقة العميل', en: 'Client consent' } },
  privacy: { label: { ar: 'اتراجعت للخصوصية', en: 'Privacy checked' }, help: { ar: 'مفيش أقفال أو عناوين أو وشوش أو أسماء واي فاي.', en: 'No locks, addresses, faces, children or Wi-Fi names.' } },
  approvedBy: { label: { ar: 'وافق عليها', en: 'Approved by' } },
} as const;
export const MEDIA_STATUS_COPY = {
  DRAFT: { ar: 'مستنية موافقة', en: 'Waiting for approval' },
  APPROVED: { ar: 'متوافق عليها', en: 'Approved' },
  WITHDRAWN: { ar: 'اتسحبت', en: 'Withdrawn' },
} as const satisfies Record<string, Pair>;

/** Options with { ar, en } labels; the stored values never change. */
export const optionsOf = <V extends string>(values: readonly V[], copy: Partial<Record<V, Pair>>) =>
  values.map((value) => ({ value, label: copy[value] ?? { ar: value, en: value } }));

/** Pages hidden from the menu (M3): still reachable, listed on «Hidden pages» with one line each. */
export const HIDDEN_COPY = {
  'pages': { name: { ar: 'صفحات الموقع (قديمة)', en: 'Site pages (old)' }, line: { ar: 'نظام صفحات قديم. الموقع الحالي مش بيستخدمه.', en: 'An older page system. The current site does not use it.' } },
  'claims': { name: { ar: 'الادعاءات', en: 'Claims' }, line: { ar: 'سجل الادعاءات اللي محتاجة دليل قبل ما تتنشر.', en: 'Claims that need evidence before they can be published.' } },
  'case-studies': { name: { ar: 'قصص المشاريع', en: 'Case studies' }, line: { ar: 'قصص مشاريع للعملاء. فاضية دلوقتي.', en: 'Customer project stories. Empty for now.' } },
  'consents': { name: { ar: 'موافقات الصور', en: 'Photo consents' }, line: { ar: 'موافقات العملاء على نشر صور بيوتهم.', en: "Customers' permission to publish photos of their homes." } },
  'organisations': { name: { ar: 'الشركات', en: 'Organisations' }, line: { ar: 'شركات العملاء للمشاريع الكبيرة. مش مستخدمة دلوقتي.', en: 'Client companies for larger projects. Not in use now.' } },
  'contacts': { name: { ar: 'جهات الاتصال', en: 'Contacts' }, line: { ar: 'أشخاص تبع الشركات دي. مش مستخدمة دلوقتي.', en: 'People at those companies. Not in use now.' } },
  'rfqs': { name: { ar: 'طلبات عروض الأسعار', en: 'Quote requests' }, line: { ar: 'طلبات عروض أسعار للمشاريع. مش مستخدمة دلوقتي.', en: 'Project quote requests. Not in use now.' } },
  'opportunities': { name: { ar: 'الفرص', en: 'Opportunities' }, line: { ar: 'متابعة فرص البيع للمشاريع. مش مستخدمة دلوقتي.', en: 'Project sales follow-up. Not in use now.' } },
  'private-files': { name: { ar: 'ملفات خاصة', en: 'Private files' }, line: { ar: 'ملفات المشاريع الخاصة. فاضية دلوقتي.', en: 'Private project files. Empty for now.' } },
  'workspace': { name: { ar: 'مساحة المشاريع', en: 'Projects workspace' }, line: { ar: 'شركات وطلبات وفرص المشاريع في مكان واحد.', en: 'Project companies, requests and opportunities in one place.' } },
  'store-ops': { name: { ar: 'الطلبات والمخزون', en: 'Orders and stock' }, line: { ar: 'البيع أونلاين مقفول، فالصفحة دي مش مستخدمة.', en: 'Online selling is off, so this page is not in use.' } },
  'service-desk': { name: { ar: 'الخدمة والضمان', en: 'Service and warranty' }, line: { ar: 'تذاكر الخدمة والضمان. فاضية دلوقتي.', en: 'Service and warranty tickets. Empty for now.' } },
  'product-drafts': { name: { ar: 'مسودات المنتجات', en: 'Product drafts' }, line: { ar: 'مراجعة منتجات جديدة قبل البيع. فاضية دلوقتي.', en: 'Review of new products before sale. Empty for now.' } },
  'content-review': { name: { ar: 'مراجعة المحتوى', en: 'Content review' }, line: { ar: 'مراجعة صفحات وقصص المشاريع قبل النشر.', en: 'Review of pages and project stories before publishing.' } },
} as const satisfies Record<string, { name: Pair; line: Pair }>;

/* ---------------------------------------------------------------------------------------------------------------------
 * Custom pages that stay in the menu (M9): Site numbers, Reports, Account security, and the shared page frame.
 * The English side keeps the words existing tests check (e.g. "MFA VERIFIED", "Website-Sourced only", "N contracts").
 * ------------------------------------------------------------------------------------------------------------------- */
export const SHELL_V = {
  home: { ar: 'الرئيسية', en: 'Home' },
  noAccessTitle: { ar: 'الصفحة دي مش ضمن صلاحياتك', en: 'Access restricted' },
  noAccessLine: { ar: 'دورك ما فيهوش الصلاحية دي، ومفيش بيانات ولا أزرار ظهرت.', en: 'Your role does not include this permission. No page data or actions were exposed.' },
} as const;

export const SALES_V = {
  bookings: { ar: 'الحجوزات', en: 'Booking requests' },
  newToday: { ar: 'جديدة النهارده', en: 'New today' },
  waiting: { ar: 'جديدة ومستنية أكتر من 24 ساعة', en: 'New, waiting > 24 h' },
  byStatus: { ar: 'الحجوزات حسب الحالة', en: 'Booking requests by status' },
  status: { ar: 'الحالة', en: 'Status' },
  requests: { ar: 'العدد', en: 'Requests' },
  openBookings: { ar: 'افتح طلبات الحجز', en: 'Open booking requests' },
  export: { ar: 'تنزيل الحجوزات CSV (للمالك)', en: 'Export CSV (OWNER)' },
  metrics: { ar: 'زيارات الموقع', en: 'Site metrics' },
  metricsCaption: { ar: 'أحداث الموقع النهارده وآخر 7 و30 يوم', en: 'Site events today, last 7 days and last 30 days' },
  event: { ar: 'الحدث', en: 'Event' },
  today: { ar: 'النهارده', en: 'Today' },
  days7: { ar: '7 أيام', en: '7 days' },
  days30: { ar: '30 يوم', en: '30 days' },
  funnel: { ar: 'مراحل المحاكي (30 يوم)', en: 'Simulator funnel (30 days)' },
  topPackages: { ar: 'أكتر الباقات (30 يوم)', en: 'Top packages (30 days)' },
  topPages: { ar: 'أكتر الصفحات (30 يوم)', en: 'Top pages (30 days)' },
} as const;
export const EVENT_COPY = {
  page_view: { ar: 'مشاهدات الصفحات', en: 'Page views' },
  whatsapp_click: { ar: 'ضغطات الواتساب', en: 'WhatsApp clicks' },
  call_click: { ar: 'ضغطات الاتصال', en: 'Call clicks' },
  package_premium: { ar: 'اختاروا بريميوم', en: 'Premium chosen' },
  package_plus: { ar: 'اختاروا بلس', en: 'Plus chosen' },
  package_essential: { ar: 'اختاروا إسنشيال', en: 'Essential chosen' },
  sim_start: { ar: 'بدأوا المحاكي', en: 'Simulator started' },
  sim_stage_2: { ar: 'المحاكي: الأوض', en: 'Simulator: rooms' },
  sim_stage_3: { ar: 'المحاكي: جرّب', en: 'Simulator: try it' },
  sim_stage_4: { ar: 'المحاكي: الخطة', en: 'Simulator: plan' },
  plan_sent: { ar: 'اتبعتت خطة', en: 'Plan sent' },
} as const satisfies Record<string, Pair>;

export const SECURITY_V = {
  current: { ar: 'الحساب الحالي', en: 'Current account' },
  identity: { ar: 'الإيميل (جزء منه مخفي)', en: 'Masked identity' },
  role: { ar: 'الدور', en: 'Active role' },
  policy: { ar: 'طريقة الدخول', en: 'Authentication policy' },
  session: { ar: 'الجلسة دي', en: 'This session' },
  ownerPasswordOnly: { ar: 'المالك بالباسورد بس (استثناء)', en: 'OWNER PASSWORD-ONLY EXCEPTION' },
  enrolled: { ar: 'التحقق بخطوتين شغّال', en: 'MFA ENROLLED' },
  actionRequired: { ar: 'لازم تشغّل التحقق بخطوتين', en: 'MFA ACTION REQUIRED' },
  authorized: { ar: 'مسموحة', en: 'AUTHORIZED' },
  verified: { ar: 'متحققة بخطوتين', en: 'MFA VERIFIED' },
  notVerified: { ar: 'مش متحققة', en: 'NOT VERIFIED' },
  accountSettings: { ar: 'إعدادات الحساب', en: 'Account settings' },
  signOut: { ar: 'خروج آمن', en: 'Sign out securely' },
  notice: {
    ar: 'حسابات الفريق شخصية وتحت إيد المالك: ادعي كل واحد من تحت (لينك لمرة واحدة، والتحقق بخطوتين لازم أول دخول). تغيير الأدوار من صفحة «المستخدمين».',
    en: 'Staff accounts are personal and OWNER-controlled: invite each person below (one-time link, MFA required at first sign-in). Role changes and unlock operations stay in the protected Users collection.',
  },
  directory: { ar: 'حسابات الفريق', en: 'Staff security directory' },
  directoryCaption: { ar: 'إيميلات الفريق (جزء منها مخفي) وأدوارهم والتحقق بخطوتين', en: 'Masked staff identities, roles and MFA enrollment' },
  colIdentity: { ar: 'الإيميل', en: 'Identity' },
  colRole: { ar: 'الدور', en: 'Role' },
  colMfa: { ar: 'التحقق بخطوتين', en: 'MFA' },
  mfaOn: { ar: 'شغّال', en: 'ENROLLED' },
  mfaOff: { ar: 'مطلوب', en: 'ACTION REQUIRED' },
  openUsers: { ar: 'افتح صفحة المستخدمين', en: 'Open OWNER user management' },
  deniedTitle: { ar: 'حسابات الفريق للمالك بس', en: 'OWNER-only directory' },
  deniedLine: { ar: 'حالتك إنت ظاهرة فوق؛ بيانات باقي الفريق مش بتظهر هنا.', en: 'Your own security state is visible above. Staff directory and role-management data were not exposed.' },
} as const;

export const INVITE_V = {
  title: { ar: 'ادعي حد من الفريق', en: 'Invite a team member' },
  line: { ar: 'حساب شخصي لكل واحد؛ إيميل الفريق للتنبيهات بس، مش للدخول.', en: 'One personal account per person. The team mailbox receives notifications; it is never a shared sign-in.' },
  email: { ar: 'الإيميل', en: 'E-mail' },
  role: { ar: 'الدور', en: 'Role' },
  roles: {
    SALES: { ar: 'مبيعات — الحجوزات والأرقام', en: 'SALES — booking requests and metrics' },
    EDITOR: { ar: 'محتوى — مسودات ومراجعة', en: 'CONTENT (EDITOR) — drafts and review' },
    ADMIN: { ar: 'مدير', en: 'ADMIN' },
    ENGINEER: { ar: 'مهندس', en: 'ENGINEER' },
    STORE: { ar: 'مخزن', en: 'STORE' },
  },
  shownOnce: { ar: 'اعرض اللينك هنا بدل ما يتبعت بالإيميل', en: 'Show the link here instead of e-mailing it' },
  invite: { ar: 'ادعي', en: 'Invite' },
  inviting: { ar: 'بنعمل الدعوة…', en: 'Inviting…' },
  sent: { ar: 'إيميل الدعوة اتبعت. اللينك بيشتغل مرة واحدة وبيخلص بعد 72 ساعة.', en: 'Invitation e-mail sent. The link works once and expires in 72 hours.' },
  shown: { ar: 'ادّي اللينك ده للشخص بنفسك (بيظهر دلوقتي بس، بيشتغل مرة واحدة وبيخلص بعد 72 ساعة):', en: 'Give this one-time link to the person directly (it is shown only now, works once and expires in 72 hours):' },
  exists: { ar: 'فيه حساب بالإيميل ده بالفعل.', en: 'An account with this e-mail already exists.' },
  invalid: { ar: 'راجع الإيميل والدور.', en: 'Check the e-mail address and the role.' },
  error: { ar: 'الدعوة ما اتعملتش.', en: 'The invitation could not be created.' },
} as const;

export const RESET_V = {
  title: { ar: 'إعادة ضبط تطبيق التحقق لحد من الفريق', en: "Reset a team member's authenticator" },
  line: { ar: 'لو موبايله ضاع: جلساته بتقفل، وأول دخول جاي هيربط تطبيق جديد. بيتسجل في سجل المراجعة.', en: 'For a lost phone: their sessions end and their next sign-in asks them to set up a new authenticator. Recorded in the audit log.' },
  member: { ar: 'الشخص', en: 'Team member' },
  choose: { ar: 'اختار…', en: 'Choose…' },
  notEnrolled: { ar: 'مش مفعّل', en: 'not enrolled' },
  confirm: { ar: 'اكتب إيميله كامل للتأكيد', en: 'Type their full e-mail to confirm' },
  reset: { ar: 'إعادة الضبط', en: 'Reset authenticator' },
  resetting: { ar: 'بنعيد الضبط…', en: 'Resetting…' },
  done: { ar: 'تمام. جلساته قفلت، وهيربط تطبيق جديد أول ما يدخل.', en: 'Done. Their sessions ended; they will set up a new authenticator at their next sign-in.' },
  mismatch: { ar: 'الإيميل مش مطابق للشخص اللي اخترته.', en: 'The e-mail does not match the selected team member.' },
  error: { ar: 'إعادة الضبط ما تمتش.', en: 'The reset could not be completed.' },
} as const;

export const KPI_V = {
  from: { ar: 'من', en: 'From' },
  to: { ar: 'لحد', en: 'To' },
  load: { ar: 'اعرض', en: 'Load' },
  northStar: { ar: 'المؤشر الأساسي (قرار المالك: {x})', en: 'North Star candidates (owner decision: {x})' },
  pending: { ar: 'لسه ما اتحددش', en: 'PENDING' },
  selected: { ar: 'اتحدد {x}', en: 'selected {x}' },
  sourced: { ar: 'جاي من الموقع بس (KPI-001)', en: 'Website-Sourced only (KPI-001)' },
  influenced: { ar: 'كل اللي الموقع أثّر فيه (KPI-003 = جاي + ساعد)', en: 'Total website-influenced (KPI-003 = sourced + assisted)' },
  eligible: { ar: 'إجمالي قيمة العقود (KPI-006)', en: 'Total eligible signed value (KPI-006)' },
  coverage: { ar: 'نسبة التصنيف (KPI-015) / التعديل اليدوي (KPI-016)', en: 'Attribution coverage (KPI-015) / override rate (KPI-016)' },
  byClass: { ar: 'حسب مصدر العميل × نوعه (زي ما اتسجل)', en: 'By attribution class × cohort (as recorded)' },
  colClass: { ar: 'المصدر', en: 'Class' },
  colSigned: { ar: 'اتمضى', en: 'Signed' },
  colAmend: { ar: 'تعديلات', en: 'Amendments' },
  colCancel: { ar: 'إلغاءات', en: 'Cancellations' },
  colNet: { ar: 'الصافي', en: 'Net' },
  colNew: { ar: 'عملاء جداد', en: 'New customers' },
  colExisting: { ar: 'عملاء قدام', en: 'Existing customers' },
  identities: { ar: 'فحص الأرقام', en: 'Identities' },
  signedInPeriod: { ar: 'عقود اتمضت في الفترة', en: 'contracts signed in period' },
  vintage: { ar: 'الصافي الحالي لعقود الفترة', en: 'vintage (current net of contracts signed in period)' },
  funnel: { ar: 'المسار', en: 'Funnel' },
  rfqRate: { ar: 'نسبة تأهيل طلبات الأسعار (KPI-010)', en: 'RFQ qualification rate (KPI-010)' },
  proposalSigned: { ar: 'من عرض سعر لعقد (KPI-011)', en: 'Proposal → signed (KPI-011)' },
  medianValue: { ar: 'متوسط قيمة العقد (KPI-013)', en: 'Median signed value (KPI-013)' },
  medianCycle: { ar: 'متوسط مدة البيع (KPI-014)', en: 'Median sales cycle (KPI-014)' },
  days: { ar: 'يوم', en: 'days' },
  pipeline: { ar: 'فرص مفتوحة مؤهلة (KPI-008، مش قيمة عقود)', en: 'Qualified open pipeline (KPI-008, not signed value)' },
  reconcile: { ar: 'فحص الاتساق (البيانات ↔ اللوحة)', en: 'Consistency check (domain ↔ CMS)' },
  check: { ar: 'افحص', en: 'Check' },
  checkFix: { ar: 'افحص وصلّح', en: 'Check and repair' },
  confirmFix: { ar: 'أصلّح المشاكل اللي تتصلّح أوتوماتيك؟', en: 'Repair the issues that can be repaired automatically?' },
  drill: { ar: 'العقود اللي ورا الأرقام', en: 'Contracts behind the figures' },
  cohort: { ar: 'نوع العميل', en: 'Cohort' },
  attribution: { ar: 'المصدر', en: 'Attribution' },
  projectType: { ar: 'نوع المشروع', en: 'Project type' },
  all: { ar: 'الكل', en: 'All' },
  apply: { ar: 'طبّق', en: 'Apply' },
  csv: { ar: 'تنزيل CSV (من غير بيانات شخصية)', en: 'Export CSV (no personal data)' },
  totals: { ar: '{n} عقد · اتمضى {signed} · الصافي الحالي {net}', en: '{n} contracts · signed {signed} · current net {net}' },
  colContract: { ar: 'العقد', en: 'Contract' },
  colSignedAt: { ar: 'اتمضى في', en: 'Signed' },
  colValue: { ar: 'قيمة العقد', en: 'Signed value' },
  colCurrentNet: { ar: 'الصافي الحالي', en: 'Current net' },
  showing: { ar: 'بنعرض آخر 200 من {n}؛ ملف CSV فيه الكل.', en: 'Showing the 200 most recent of {n}; the CSV export contains all rows.' },
} as const;
export const CLASS_COPY = {
  WEBSITE_SOURCED: { ar: 'من الموقع', en: 'Website-sourced' },
  WEBSITE_ASSISTED: { ar: 'الموقع ساعد', en: 'Website-assisted' },
  NON_WEBSITE: { ar: 'مش من الموقع', en: 'Not from the website' },
  UNKNOWN: { ar: 'مش معروف', en: 'Unknown' },
} as const satisfies Record<string, Pair>;
export const COHORT_COPY = { NEW: { ar: 'جديد', en: 'New' }, EXISTING: { ar: 'قديم', en: 'Existing' } } as const satisfies Record<string, Pair>;
export const PROJECT_TYPE_COPY = {
  COMPOUND: { ar: 'كمبوند', en: 'Compound' },
  MULTI_UNIT_BUILDING: { ar: 'عمارة', en: 'Multi-unit building' },
  VILLA: { ar: 'فيلا', en: 'Villa' },
  APARTMENT: { ar: 'شقة', en: 'Apartment' },
  COMMERCIAL: { ar: 'تجاري', en: 'Commercial' },
  OTHER: { ar: 'تاني', en: 'Other' },
} as const satisfies Record<string, Pair>;

/** Fills `{name}` placeholders in a picked string. */
export const fillIn = (text: string, vars: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** Staff invitation page (M8): words only; the invitation flow is unchanged. English keeps today's words. */
export const STAFF_INVITE = {
  doneTitle: { ar: 'الباسورد اتعمل', en: 'Password set' },
  doneText: { ar: 'ادخل دلوقتي. هيطلب منك تفعّل التحقق بخطوتين قبل ما تستخدم لوحة التحكم.', en: 'Sign in now. You will be asked to set up two-step verification (MFA) before you can use the admin.' },
  goSignIn: { ar: 'روح لصفحة الدخول', en: 'Go to staff sign-in' },
  checking: { ar: 'بنتأكد من الدعوة…', en: 'Checking the invitation…' },
  missingTitle: { ar: 'لينك الدعوة مش صالح', en: 'Invitation link not valid' },
  missingText: { ar: 'افتح اللينك بالظبط من الدعوة، أو اطلب واحد جديد من المالك. كل لينك بيشتغل مرة واحدة وبيخلص بعد 72 ساعة.', en: 'Open the exact link from your invitation, or ask the OWNER for a new one. Each link works once and expires after 72 hours.' },
  invalid: { ar: 'لينك الدعوة ده مبقاش صالح (اتستخدم أو خلص أو اتلغى). اطلب واحد جديد من المالك.', en: 'This invitation link is not valid any more (used, expired or revoked). Ask the OWNER for a new one.' },
  policy: { ar: 'الباسورد مش ماشي مع الشروط: {policy}', en: 'The password does not meet the policy: {policy}' },
  policyDefault: { ar: 'استخدم من 14 لـ 128 حرف، ومتستخدمش إيميلك.', en: 'use 14 to 128 characters and do not reuse your e-mail address.' },
  mismatch: { ar: 'الباسوردين مش زي بعض.', en: 'The two passwords are different.' },
  limited: { ar: 'محاولات كتير. جرّب تاني بعد شوية.', en: 'Too many attempts. Try again in a few minutes.' },
  formTitle: { ar: 'اعمل باسورد فريق OTONOM بتاعك', en: 'Set your OTONOM staff password' },
  formText: { ar: 'اختار باسورد من 14 لـ 128 حرف مش مستخدمه في أي مكان تاني. محدش غيرك بيشوفه.', en: 'Choose a password of 14 to 128 characters that you do not use anywhere else. Nobody else sees it.' },
  newPassword: { ar: 'الباسورد الجديد', en: 'New password' },
  repeat: { ar: 'اكتب الباسورد تاني', en: 'Repeat the password' },
  save: { ar: 'احفظ الباسورد', en: 'Set password' },
  saving: { ar: 'بنحفظ…', en: 'Saving…' },
} as const satisfies Record<string, Pair>;

/** The notice above Payload's own sign-in form at /admin/login (M8). */
export const ADMIN_LOGIN_NOTICE = {
  text: { ar: 'حسابات الفريق محتاجة تحقق بخطوتين. ادخل من صفحة دخول الفريق (باسورد + كود)، وبعدها هتفتح لوحة التحكم.', en: 'Staff accounts require two-factor authentication. Please sign in through the staff sign-in page (password + authenticator code), then you will be redirected to the admin panel.' },
  link: { ar: 'صفحة دخول الفريق', en: 'Staff sign-in' },
} as const satisfies Record<string, Pair>;

/** Names for a few of Payload's own controls that have none (read by screen readers). */
export const A11Y_COPY = {
  prevPage: { ar: 'الصفحة اللي قبل', en: 'Previous page' },
  nextPage: { ar: 'الصفحة اللي بعد', en: 'Next page' },
  selectRow: { ar: 'اختار الصف ده', en: 'Select this row' },
  selectAll: { ar: 'اختار كل الصفوف', en: 'Select all rows' },
  moreOptions: { ar: 'اختيارات تانية', en: 'More options' },
} as const satisfies Record<string, Pair>;

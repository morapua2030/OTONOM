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
} as any; // a partial override; Payload deep-merges it over its full translations

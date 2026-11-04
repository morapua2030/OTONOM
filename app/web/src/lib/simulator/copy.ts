/**
 * Simulator copy (design v4 `SIMD` plus the inline strings of the "12 Simulator" markup), verbatim per locale.
 * The upsell and lock lines take their amounts from the package registry (rules.ts `UPSELL`, `PK`); they are getters so
 * they follow the admin-managed prices applied by `applySimContent`.
 */
import type { Locale } from '../i18n.ts';
import { fmtN, PK, UPSELL, type DevKey, type HomeKey, type PkgKey, type RoomTypeKey, type RoutineId } from './rules.ts';

export type PlanRoom = { name: string; desc: string; descC: string };
export type PlanInput = { home: string; homeL: string; n: number; ch: number; pkg: PkgKey; price: string; ctrl: string; extras: string; rooms: PlanRoom[]; liked: string[]; eng: boolean };

export type SimCopy = {
  dir: 1 | -1; nav: string;
  homes: Record<HomeKey, string>; homeL: Record<HomeKey, string>;
  rooms: Record<RoomTypeKey, string>; devs: Record<DevKey, string>;
  stages: readonly [string, string, string, string]; unit: string; sep: string; ac: string;
  chW: (n: number) => string; roomsW: (n: number) => string; lines: (n: number) => string;
  used: (a: number, b: number) => string; extra: (x: string) => string; extrasVal: string;
  up: Record<PkgKey, string>; adds: Record<PkgKey, string>;
  items: Record<'alexa' | 'lock' | 'ir' | 'gas' | 'ctrl' | 'panel', string>;
  eng: string;
  remove: (n: string) => string; dec: (n: string) => string; inc: (n: string) => string; devInc: (d: string, n: string) => string; devDec: (d: string, n: string) => string;
  tLight: (n: string) => string; tAc: (n: string) => string; tDev: (d: string, n: string) => string; door: (v: boolean) => string;
  cmds: readonly [string, string, string, string];
  routines: Record<RoutineId, { t: string; tr: string; a: readonly string[] }>;
  inPremium: string; everyPkg: string; try: string; playing: string; again: string; like: (n: string) => string;
  lockUp: string;
  dayPlay: string; dayPause: string; dayAgain: string; sheetOpen: string; sheetClose: string; copy: string; copied: string;
  msg: (p: PlanInput) => string; planText: (p: PlanInput) => string;
  ui: {
    eyebrow: string; h1: readonly [string, string]; lead: string; stagesLabel: string;
    s1Lead: string; pickFirst: string; pickHome: string; suggestion: string;
    linesLabel: string; acLabel: string; devicesLabel: string; addRoom: string; maxRooms: string;
    need: string; engLine: string; engWa: string; controllers: string; wantLock: string; lockInPremium: string; recommended: string; installIncluded: string; compare: string;
    dayNight: string; day: string; night: string; tapIcons: string; dayInHome: string; timeOfDay: string;
    gasTitle: string; gasAlarm: string; gasPhone: string; gasAck: string; demoOnly: string; alexaTry: string;
    routinesH: string; routinesSub: string; addLock: string;
    homeType: string; roomsH: string; totalCh: string; extraCtrl: string; likedH: string; noLiked: string; sendWa: string; estimate: string;
    ready: string; bookVisit: string; callUs: string;
  };
};

const AR: SimCopy = {
  dir: 1, nav: 'جرّب بيتك الذكي',
  homes: { apt: 'شقة', duplex: 'دوبلكس', villa: 'فيلا' }, homeL: { apt: 'لشقة', duplex: 'لدوبلكس', villa: 'لفيلا' },
  rooms: { reception: 'ريسبشن', bed: 'أوضة نوم', kids: 'أوضة أطفال', kitchen: 'مطبخ', bath: 'حمام', corridor: 'طرقة', stairs: 'سلم', office: 'مكتب', garden: 'جنينة', balcony: 'بلكونة', garage: 'جراج' },
  devs: { heater: 'سخان', pump: 'موتور مياه', fan: 'شفاط', curtain: 'ستارة', garage: 'باب جراج', other: 'جهاز تاني' },
  stages: ['بيتك', 'أوضك', 'جرّب', 'خطتك'], unit: 'ج.م', sep: '، ', ac: 'تكييف',
  chW: (n) => ((n >= 3 && n <= 10) ? 'قنوات' : 'قناة'), roomsW: (n) => ((n >= 3 && n <= 10) ? 'أوض' : 'أوضة'),
  lines: (n) => (n === 0 ? 'من غير نور' : n === 1 ? 'خط نور' : n === 2 ? 'خطين نور' : n + (n <= 10 ? ' خطوط نور' : ' خط نور')),
  used: (a, b) => `مستخدم ${a} من ${b}`, extra: (x) => `+ ${x} (السعر في الزيارة)`, extrasVal: 'السعر بيتحدد في الزيارة',
  up: {
    get Essential() { return `بـ${fmtN(UPSELL.toPlus)} ج.م زيادة تاخد Plus: ${UPSELL.toPlusChannels} قناة زيادة.`; },
    get Plus() { return `بـ${fmtN(UPSELL.toPremium)} ج.م زيادة تاخد Premium: القفل الذكي وروتينات الدخول والخروج.`; },
    Premium: 'Premium هي الباقة الأكمل.',
  },
  adds: { Essential: 'كنترولر 16R واحد، Amazon Alexa، ريموت IR، حساس غاز، لوحة كهرباء وأسلاك', Plus: 'كنترولر 16R تاني: 16 قناة زيادة', Premium: 'القفل الذكي وروتينات الدخول والخروج' },
  items: { alexa: 'Amazon Alexa', lock: 'قفل ذكي', ir: 'ريموت IR', gas: 'حساس غاز', ctrl: 'كنترولر 16R', panel: 'لوحة كهرباء وأسلاك' },
  eng: 'مشروعك محتاج مراجعة مهندس',
  remove: (n) => `شيل ${n}`, dec: (n) => `قلّل خطوط النور في ${n}`, inc: (n) => `زوّد خطوط النور في ${n}`, devInc: (d, n) => `زوّد ${d} في ${n}`, devDec: (d, n) => `قلّل ${d} في ${n}`,
  tLight: (n) => `نور ${n}`, tAc: (n) => `تكييف ${n}`, tDev: (d, n) => `${d}، ${n}`, door: (v) => (v ? 'الباب: مقفول بالقفل الذكي' : 'الباب: مفتوح'),
  cmds: ['Alexa، ولّع نور الريسبشن', 'Alexa، شغّل التكييف في أوضة النوم', 'Alexa، اطفي كل الأنوار', 'Alexa، تصبح على خير'],
  routines: {
    morning: { t: 'صباح الخير', tr: 'الساعة 7:00، أو «Alexa، صباح الخير»', a: ['نور أوضة النوم يولّع', 'الستارة تتفتح', 'السخان يشتغل'] },
    leave: { t: 'خارج من البيت', tr: 'لما تقفل الباب بالقفل الذكي', a: ['كل الأنوار تطفي', 'كل التكييفات تطفي', 'السخان يطفي', 'باب الجراج يتقفل'] },
    arrive: { t: 'وصلت البيت', tr: 'لما تفتح القفل الذكي', a: ['نور المدخل والريسبشن يولّع', 'تكييف الريسبشن يشتغل'] },
    night: { t: 'تصبح على خير', tr: '«Alexa، تصبح على خير»', a: ['كل الأنوار تطفي ما عدا الطرقة', 'تكييف أوضة النوم يفضل شغال', 'الباب يتقفل'] },
    guests: { t: 'وضع الضيوف', tr: 'أمر واحد', a: ['كل أنوار الريسبشن تولّع', 'الستارة تتقفل', 'تكييف الريسبشن يشتغل'] },
    suhoor: { t: 'السحور في رمضان', tr: 'الساعة 3:00', a: ['نور المطبخ والطرقة يولّع', 'باقي البيت يفضل هادي'] },
    travel: { t: 'وإنت مسافر', tr: 'بالليل، بمواعيد', a: ['نور الريسبشن يولّع', 'بعدها نور أوضة النوم', 'وبعدها نور المطبخ'] },
    pump: { t: 'موتور المياه بمواعيد', tr: 'في المواعيد اللي تحددها', a: ['الموتور يشتغل', 'الموتور يطفي'] },
    gas: { t: 'أمان الغاز', tr: 'لما حساس الغاز يكتشف تسريب', a: ['إنذار عالي', 'إشعار على الموبايل', 'الشفاط يشتغل', 'نور المطبخ يولّع'] },
  },
  inPremium: 'في Premium', everyPkg: 'شغال دايمًا، في كل الباقات', try: 'جرّبه', playing: 'شغّال…', again: 'جرّبه تاني', like: (n) => `عجبني: ${n}`,
  get lockUp() { return `الروتين ده محتاج القفل الذكي، وهو موجود في باقة Premium (${fmtN(PK.Premium.price)} ج.م).`; },
  dayPlay: 'شغّل اليوم', dayPause: 'إيقاف', dayAgain: 'من الأول', sheetOpen: 'التفاصيل', sheetClose: 'إخفاء', copy: 'انسخ الخطة', copied: 'اتنسخت',
  msg: (p) => {
    const head = `أهلًا OTONOM، عملت خطة ${p.homeL}: ${p.n} ${AR.roomsW(p.n)}، ${p.ch} ${AR.chW(p.ch)}`;
    if (p.eng) return head + '، ومشروعي محتاج مراجعة مهندس. عايز أحجز زيارة.';
    const base = head + `، الباقة المقترحة ${p.pkg}.` + (p.extras ? ` كنترولرات إضافية: ${p.extras}.` : '');
    const rooms = ` الأوض: ${p.rooms.map((r) => `${r.name} (${r.descC})`).join('، ')}.`;
    const liked = p.liked.length ? ` الروتينات اللي عجبتني: ${p.liked.join('، ')}.` : '';
    const full = base + rooms + liked + ' عايز أحجز زيارة.';
    return full.length <= 900 ? full : base + liked + ' عايز أحجز زيارة.';
  },
  planText: (p) => ['خطة بيتي الذكي من OTONOM', `نوع البيت: ${p.home}`, `الأوض (${p.n}):`, ...p.rooms.map((r) => `- ${r.name}: ${r.descC}`), `إجمالي القنوات: ${p.ch}`, p.eng ? 'مشروعك محتاج مراجعة مهندس' : `الكنترولرات: ${p.ctrl}`, p.eng ? '' : `الباقة المقترحة: ${p.pkg} (${p.price})`, p.extras ? `كنترولرات إضافية: ${p.extras} (السعر بيتحدد في الزيارة)` : '', p.liked.length ? `الروتينات اللي عجبتني: ${p.liked.join('، ')}` : '', 'ده تقدير مبدئي، والمهندس بيأكد كل حاجة في الزيارة. التركيب مشمول في سعر الباقة.'].filter(Boolean).join('\n'),
  ui: {
    eyebrow: 'جرّب بيتك الذكي', h1: ['صمّم بيتك، وجرّبه قبل ما ', 'نركّبه.'], lead: 'اختار نوع بيتك والأوض، ولعّب في النور والتكييف والأجهزة، وشوف الباقة اللي تناسبك.', stagesLabel: 'مراحل التجربة',
    s1Lead: 'اختار نوع بيتك، وهنحطلك اقتراح للأوض تعدّله براحتك.', pickFirst: 'اختار نوع بيتك الأول.', pickHome: 'اختار نوع البيت', suggestion: 'اقتراح، عدّله براحتك',
    linesLabel: 'خطوط النور', acLabel: 'تكييف (بالريموت)', devicesLabel: 'أجهزة (كل جهاز = قناة)', addRoom: '+ أوضة', maxRooms: 'وصلت لأقصى عدد أوض (12).',
    need: 'احتياجك', engLine: 'ابعتلنا خطتك ومهندس هيراجعها معاك.', engWa: 'كلّم مهندس على واتساب', controllers: 'الكنترولرات', wantLock: 'عايز قفل ذكي', lockInPremium: 'القفل الذكي في Premium', recommended: 'الباقة المقترحة', installIncluded: 'التركيب مشمول في سعر الباقة.', compare: 'قارن',
    dayNight: 'نهار ولا ليل', day: 'نهار', night: 'ليل', tapIcons: 'دوس على الأيقونات جوه كل أوضة.', dayInHome: 'يوم في بيتك', timeOfDay: 'وقت اليوم',
    gasTitle: 'OTONOM: تنبيه غاز في المطبخ', gasAlarm: 'إنذار عالي', gasPhone: 'إشعار على الموبايل', gasAck: 'تمام، اتعامل', demoOnly: 'ده عرض توضيحي، مش متوصل بأجهزة حقيقية.', alexaTry: 'جرّب أوامر Alexa',
    routinesH: 'روتينات تريّحك', routinesSub: 'أمثلة لروتينات بيظبطها فريقنا معاك', addLock: 'أضف القفل الذكي',
    homeType: 'نوع البيت', roomsH: 'الأوض', totalCh: 'إجمالي القنوات', extraCtrl: 'كنترولرات إضافية', likedH: 'الروتينات اللي عجبتك', noLiked: 'دوس على القلب في أي روتين علشان يتضاف هنا.', sendWa: 'ابعت خطتك على واتساب', estimate: 'ده تقدير مبدئي، والمهندس بيأكد كل حاجة في الزيارة. التركيب مشمول في سعر الباقة.',
    ready: 'جاهز نبدأ؟', bookVisit: 'احجز زيارة', callUs: 'كلّمنا',
  },
};

const EN: SimCopy = {
  dir: -1, nav: 'Try your smart home',
  homes: { apt: 'Apartment', duplex: 'Duplex', villa: 'Villa' }, homeL: { apt: 'an apartment', duplex: 'a duplex', villa: 'a villa' },
  rooms: { reception: 'Reception', bed: 'Bedroom', kids: 'Kids’ room', kitchen: 'Kitchen', bath: 'Bathroom', corridor: 'Corridor', stairs: 'Stairs', office: 'Office', garden: 'Garden', balcony: 'Balcony', garage: 'Garage' },
  devs: { heater: 'Heater', pump: 'Water pump', fan: 'Extractor fan', curtain: 'Curtain', garage: 'Garage door', other: 'Other device' },
  stages: ['Your home', 'Your rooms', 'Try it', 'Your plan'], unit: 'EGP', sep: ', ', ac: 'AC',
  chW: (n) => (n === 1 ? 'channel' : 'channels'), roomsW: (n) => (n === 1 ? 'room' : 'rooms'),
  lines: (n) => (n === 0 ? 'no lights' : n === 1 ? '1 light' : n + ' lights'),
  used: (a, b) => `Using ${a} of ${b}`, extra: (x) => `+ ${x} (price set at the visit)`, extrasVal: 'price set at the visit',
  up: {
    get Essential() { return `${fmtN(UPSELL.toPlus)} EGP more gets you Plus: ${UPSELL.toPlusChannels} more channels.`; },
    get Plus() { return `${fmtN(UPSELL.toPremium)} EGP more gets you Premium: the smart lock and arrive/leave routines.`; },
    Premium: 'Premium is the most complete package.',
  },
  adds: { Essential: 'One 16R controller, Amazon Alexa, IR remote, gas sensor, electrical panel and wires', Plus: 'A second 16R controller: 16 more channels', Premium: 'The smart lock and arrive/leave routines' },
  items: { alexa: 'Amazon Alexa', lock: 'Smart lock', ir: 'IR remote', gas: 'Gas sensor', ctrl: '16R controller', panel: 'Electrical panel & wires' },
  eng: 'Your project needs an engineer review',
  remove: (n) => `Remove ${n}`, dec: (n) => `Fewer lighting lines in ${n}`, inc: (n) => `More lighting lines in ${n}`, devInc: (d, n) => `Add ${d} in ${n}`, devDec: (d, n) => `Remove ${d} in ${n}`,
  tLight: (n) => `${n} lights`, tAc: (n) => `${n} AC`, tDev: (d, n) => `${n} ${d}`, door: (v) => (v ? 'Door: locked with the smart lock' : 'Door: unlocked'),
  cmds: ['Alexa, turn on the reception light', 'Alexa, turn on the bedroom AC', 'Alexa, turn off all the lights', 'Alexa, good night'],
  routines: {
    morning: { t: 'Good morning', tr: 'At 7:00, or “Alexa, good morning”', a: ['Bedroom light turns on', 'Curtain opens', 'Heater turns on'] },
    leave: { t: 'Leaving home', tr: 'When you lock the door with the smart lock', a: ['All lights turn off', 'All ACs turn off', 'Heater turns off', 'Garage door closes'] },
    arrive: { t: 'Back home', tr: 'When you open the smart lock', a: ['Entrance and reception lights turn on', 'Reception AC turns on'] },
    night: { t: 'Good night', tr: '“Alexa, good night”', a: ['Every light turns off except the corridor', 'Bedroom AC stays on', 'The door locks'] },
    guests: { t: 'Guest mode', tr: 'One command', a: ['Every reception light turns on', 'Curtain closes', 'Reception AC turns on'] },
    suhoor: { t: 'Suhoor in Ramadan', tr: 'At 3:00', a: ['Kitchen and corridor lights turn on', 'Everything else stays quiet'] },
    travel: { t: 'While you travel', tr: 'In the evening, on a schedule', a: ['Reception light turns on', 'Then the bedroom light', 'Then the kitchen light'] },
    pump: { t: 'Water pump schedule', tr: 'At the times you set', a: ['Pump turns on', 'Pump turns off'] },
    gas: { t: 'Gas safety', tr: 'When the gas sensor detects a leak', a: ['Loud alarm', 'Phone notification', 'Extractor fan turns on', 'Kitchen light turns on'] },
  },
  inPremium: 'In Premium', everyPkg: 'Always on, every package', try: 'Try it', playing: 'Playing…', again: 'Try again', like: (n) => `Like: ${n}`,
  get lockUp() { return `This routine needs the smart lock, which comes with the Premium package (${fmtN(PK.Premium.price)} EGP).`; },
  dayPlay: 'Play the day', dayPause: 'Pause', dayAgain: 'From the start', sheetOpen: 'Details', sheetClose: 'Hide', copy: 'Copy plan', copied: 'Copied',
  msg: (p) => {
    const head = `Hi OTONOM, I made a plan for ${p.homeL}: ${p.n} ${EN.roomsW(p.n)}, ${p.ch} ${EN.chW(p.ch)}`;
    if (p.eng) return head + ', and my project needs an engineer review. I’d like to book a visit.';
    const base = head + `, recommended package ${p.pkg}.` + (p.extras ? ` Extra controllers: ${p.extras}.` : '');
    const rooms = ` Rooms: ${p.rooms.map((r) => `${r.name} (${r.descC})`).join(', ')}.`;
    const liked = p.liked.length ? ` Routines I liked: ${p.liked.join(', ')}.` : '';
    const full = base + rooms + liked + ' I’d like to book a visit.';
    return full.length <= 900 ? full : base + liked + ' I’d like to book a visit.';
  },
  planText: (p) => ['My OTONOM smart home plan', `Home type: ${p.home}`, `Rooms (${p.n}):`, ...p.rooms.map((r) => `- ${r.name}: ${r.descC}`), `Total channels: ${p.ch}`, p.eng ? 'Your project needs an engineer review' : `Controllers: ${p.ctrl}`, p.eng ? '' : `Recommended package: ${p.pkg} (${p.price})`, p.extras ? `Extra controllers: ${p.extras} (price set at the visit)` : '', p.liked.length ? `Routines I liked: ${p.liked.join(', ')}` : '', 'This is an initial estimate. The engineer confirms everything at the visit. Installation is included in the package price.'].filter(Boolean).join('\n'),
  ui: {
    eyebrow: 'Try your smart home', h1: ['Design your home and try it before we ', 'install it.'], lead: 'Pick your home type and rooms, play with the lights, AC and devices, and see the package that fits you.', stagesLabel: 'Simulator stages',
    s1Lead: 'Pick your home type and we’ll suggest rooms you can change however you like.', pickFirst: 'Pick your home type first.', pickHome: 'Pick a home type', suggestion: 'A suggestion. Change it however you like.',
    linesLabel: 'Lighting lines', acLabel: 'AC (by remote)', devicesLabel: 'Devices (each one = 1 channel)', addRoom: '+ Room', maxRooms: 'You’ve reached the maximum of 12 rooms.',
    need: 'What you need', engLine: 'Send us your plan and an engineer will review it with you.', engWa: 'Talk to an engineer on WhatsApp', controllers: 'Controllers', wantLock: 'I want a smart lock', lockInPremium: 'The smart lock comes with Premium', recommended: 'Recommended package', installIncluded: 'Installation is included in the package price.', compare: 'Compare',
    dayNight: 'Day or night', day: 'Day', night: 'Night', tapIcons: 'Tap the icons inside each room.', dayInHome: 'A day in your home', timeOfDay: 'Time of day',
    gasTitle: 'OTONOM: Gas alert in the kitchen', gasAlarm: 'Loud alarm', gasPhone: 'Phone notification', gasAck: 'OK, handled', demoOnly: 'This is a demo. It isn’t connected to real devices.', alexaTry: 'Try Alexa commands',
    routinesH: 'Routines that make life easier', routinesSub: 'Examples of routines our team sets up with you', addLock: 'Add the smart lock',
    homeType: 'Home type', roomsH: 'Rooms', totalCh: 'Total channels', extraCtrl: 'Extra controllers', likedH: 'Routines you liked', noLiked: 'Tap the heart on any routine to add it here.', sendWa: 'Send your plan on WhatsApp', estimate: 'This is an initial estimate. The engineer confirms everything at the visit. Installation is included in the package price.',
    ready: 'Ready to start?', bookVisit: 'Book a visit', callUs: 'Call us',
  },
};

export const SIMD: Record<Locale, SimCopy> = { ar: AR, en: EN };

/** Entry-point copy (design: the "Try your smart home" buttons and the packages banner). */
export const SIM_ENTRY: Record<Locale, { cta: string; banner: string }> = {
  ar: { cta: AR.nav, banner: 'مش عارف تختار؟ جرّب بيتك وشوف الباقة اللي تناسبك.' },
  en: { cta: EN.nav, banner: 'Not sure which to pick? Try your home and see the package that fits.' },
};

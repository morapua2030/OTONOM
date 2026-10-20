// Structured PLACEHOLDER copy for the B2B preview (planning doc 05 §1–§3). Every statement here is either a process fact
// already in the planning documents or an explicitly "illustrative / confirmed per project" statement. No numbers, prices,
// capacity, certifications, project counts or compatibility claims (those require the claims registry / owner evidence).
import type { Locale } from './i18n.ts';

type Card = { title: string; body: string };
type Faq = { q: string; a: string };
type Content = {
  badges: { illustrative: string; perProject: string };
  engagement: { title: string; items: Card[] };
  process: { title: string; steps: Card[] };
  scenarios: { title: string; note: string; items: Card[] };
  controllers: { title: string; models: Card[]; note: string };
  developers: { painsTitle: string; pains: string[]; faqTitle: string; faqs: Faq[]; prepareTitle: string; prepare: string[] };
  contractors: { whoTitle: string; who: string; benefitsTitle: string; benefits: Card[]; docsNote: string };
  finalCta: { title: string; body: string };
};

const en: Content = {
  badges: { illustrative: 'Illustrative scenario', perProject: 'Scope confirmed per project' },
  engagement: {
    title: 'Engagement models',
    items: [
      { title: 'Supply only', body: 'Controllers and components supplied to your installation team, with technical documentation once approved.' },
      { title: 'Supply, installation & programming', body: 'Our team installs, programs and commissions the system unit by unit.' },
      { title: 'Design-build', body: 'From engineering design through installation, commissioning and handover for the whole project.' },
    ],
  },
  process: {
    title: 'How a project runs',
    steps: [
      { title: 'Brief', body: 'You send a request with the project type, number of units and the systems you are considering.' },
      { title: 'Engineering review', body: 'An engineer reviews the request and contacts you to clarify scope.' },
      { title: 'Consultation or site survey', body: 'A free introductory call; an on-site survey is paid and agreed in advance.' },
      { title: 'Proposal', body: 'A written proposal, approved internally before it is sent, with a validity date.' },
      { title: 'Typical-unit design', body: 'A repeatable design for each unit type before roll-out.' },
      { title: 'Installation & commissioning', body: 'Installation and documented commissioning per unit.' },
      { title: 'Handover', body: 'Handover with documentation for residents and facility management.' },
    ],
  },
  scenarios: {
    title: 'Solutions by room and function',
    note: 'Examples of what can be engineered. The exact scope, components and dependencies are confirmed for each project.',
    items: [
      { title: 'Lighting scenes', body: 'Scenes per room or per unit, controlled from wall keypads or the app.' },
      { title: 'Climate', body: 'Air-conditioning control integrated with scenes and schedules.' },
      { title: 'Audio & AV', body: 'Multi-zone audio and AV integration designed with your AV supplier.' },
      { title: 'Doors & garage', body: 'Project-specific automation; always with physical fail-safes and a licensed electrician.' },
      { title: 'Alarm integration', body: 'Project-specific integration with the alarm system after a safety review.' },
      { title: 'Voice control', body: 'Through cloud voice assistants, which need an internet connection.' },
    ],
  },
  controllers: {
    title: 'OTONOM controllers',
    models: [
      { title: '4-channel', body: 'Compact controller for smaller rooms and circuits.' },
      { title: '6-channel', body: 'Mid-size controller for typical apartment layouts.' },
      { title: '16-channel', body: 'High-density controller for larger units and distribution boards.' },
    ],
    note: 'Electrical specifications are published once the datasheet is approved. Online ordering opens with the commercial launch.',
  },
  developers: {
    painsTitle: 'What multi-unit projects need',
    pains: [
      'The same result in every unit, not a different system per apartment.',
      'Coordination with MEP contractors and the finishing schedule.',
      'A clear handover to residents and facility management.',
      'A predictable after-sales path once residents move in.',
    ],
    prepareTitle: 'Helpful to have for your request',
    prepare: ['Project type and location', 'Number of units (approximate)', 'Systems you are considering', 'Current project phase and timeline'],
    faqTitle: 'Engineering questions',
    faqs: [
      { q: 'Can you work with our electrical contractor?', a: 'Yes — in a supply-only or supply-and-programming model. The split of responsibilities is agreed for each project.' },
      { q: 'When do we receive a price?', a: 'After the engineering review and, where needed, a paid site survey. Proposals are approved internally before they are sent.' },
      { q: 'Does voice control work without internet?', a: 'No. Cloud voice assistants need an internet connection. The scope of local control is confirmed per project.' },
      { q: 'Can we see previous projects?', a: 'We publish identified projects only with the client’s written consent. In a consultation we can walk you through our method.' },
    ],
  },
  contractors: {
    whoTitle: 'Who this is for',
    who: 'Electrical contractors, MEP consultants and smart-home installers working on residential projects.',
    benefitsTitle: 'What you get',
    benefits: [
      { title: 'Engineering support', body: 'Support from our engineers during design and execution.' },
      { title: 'Documentation', body: 'Technical documentation once approved. Datasheets on request until then.' },
      { title: 'Direct supply terms', body: 'Terms are agreed directly after review. Partner pricing is never published.' },
    ],
    docsNote: 'Datasheets are shared on request until the approved revision is published.',
  },
  finalCta: { title: 'Planning a residential project?', body: 'Send us the brief and an engineer will review it.' },
};

const ar: Content = {
  badges: { illustrative: 'سيناريو توضيحي', perProject: 'يُحدد النطاق لكل مشروع' },
  engagement: {
    title: 'نماذج التعاون',
    items: [
      { title: 'توريد فقط', body: 'توريد وحدات التحكم والمكونات لفريق التركيب الخاص بك، مع الوثائق الفنية عند اعتمادها.' },
      { title: 'توريد وتركيب وبرمجة', body: 'يتولى فريقنا التركيب والبرمجة والتشغيل وحدةً بوحدة.' },
      { title: 'تصميم وتنفيذ متكامل', body: 'من التصميم الهندسي مرورًا بالتركيب والتشغيل وحتى التسليم للمشروع بالكامل.' },
    ],
  },
  process: {
    title: 'كيف يسير المشروع',
    steps: [
      { title: 'الطلب', body: 'ترسل طلبًا يوضح نوع المشروع وعدد الوحدات والأنظمة التي تفكر فيها.' },
      { title: 'المراجعة الهندسية', body: 'يراجع مهندس الطلب ويتواصل معك لتوضيح النطاق.' },
      { title: 'استشارة أو معاينة ميدانية', body: 'مكالمة تعريفية مجانية، والمعاينة الميدانية مدفوعة وبالاتفاق المسبق.' },
      { title: 'العرض', body: 'عرض مكتوب يُعتمد داخليًا قبل إرساله، وله تاريخ صلاحية.' },
      { title: 'تصميم الوحدة النموذجية', body: 'تصميم قابل للتكرار لكل نوع وحدة قبل التعميم.' },
      { title: 'التركيب والتشغيل', body: 'تركيب وتشغيل موثّق لكل وحدة.' },
      { title: 'التسليم', body: 'تسليم مع وثائق للسكان ولإدارة المرافق.' },
    ],
  },
  scenarios: {
    title: 'حلول حسب الغرفة والوظيفة',
    note: 'أمثلة لما يمكن تصميمه. يُحدد النطاق الدقيق والمكونات والمتطلبات لكل مشروع على حدة.',
    items: [
      { title: 'مشاهد الإضاءة', body: 'مشاهد لكل غرفة أو لكل وحدة، يُتحكم فيها من لوحات الحائط أو التطبيق.' },
      { title: 'التكييف', body: 'التحكم في التكييف ضمن المشاهد والجداول الزمنية.' },
      { title: 'الصوت والشاشات', body: 'صوت متعدد المناطق وتكامل الشاشات بالتنسيق مع مورد الصوتيات.' },
      { title: 'الأبواب والجراج', body: 'أتمتة حسب كل مشروع، دائمًا مع وسائل أمان يدوية وكهربائي مرخّص.' },
      { title: 'تكامل الإنذار', body: 'تكامل حسب كل مشروع مع نظام الإنذار بعد مراجعة السلامة.' },
      { title: 'التحكم الصوتي', body: 'عبر المساعدات الصوتية السحابية، وهي تحتاج اتصالًا بالإنترنت.' },
    ],
  },
  controllers: {
    title: 'وحدات تحكم OTONOM',
    models: [
      { title: '4 قنوات', body: 'وحدة مدمجة للغرف والدوائر الأصغر.' },
      { title: '6 قنوات', body: 'وحدة متوسطة لتوزيعات الشقق المعتادة.' },
      { title: '16 قناة', body: 'وحدة عالية الكثافة للوحدات الأكبر ولوحات التوزيع.' },
    ],
    note: 'تُنشر المواصفات الكهربائية بعد اعتماد ورقة البيانات. الطلب أونلاين متاح عند الإطلاق التجاري.',
  },
  developers: {
    painsTitle: 'ما تحتاجه المشروعات متعددة الوحدات',
    pains: ['نفس النتيجة في كل وحدة، لا نظام مختلف لكل شقة.', 'التنسيق مع مقاولي الكهروميكانيكا وجدول التشطيب.', 'تسليم واضح للسكان ولإدارة المرافق.', 'مسار خدمة ما بعد البيع واضح بعد السكن.'],
    prepareTitle: 'معلومات تساعدنا في طلبك',
    prepare: ['نوع المشروع وموقعه', 'عدد الوحدات التقريبي', 'الأنظمة التي تفكر فيها', 'مرحلة المشروع الحالية والجدول الزمني'],
    faqTitle: 'أسئلة هندسية',
    faqs: [
      { q: 'هل يمكنكم العمل مع مقاول الكهرباء لدينا؟', a: 'نعم، بنموذج التوريد فقط أو التوريد والبرمجة. ويُتفق على تقسيم المسؤوليات لكل مشروع.' },
      { q: 'متى نحصل على السعر؟', a: 'بعد المراجعة الهندسية، والمعاينة الميدانية المدفوعة عند الحاجة. تُعتمد العروض داخليًا قبل إرسالها.' },
      { q: 'هل يعمل التحكم الصوتي بدون إنترنت؟', a: 'لا. المساعدات الصوتية السحابية تحتاج اتصالًا بالإنترنت، ويُحدد نطاق التحكم المحلي لكل مشروع.' },
      { q: 'هل يمكننا رؤية مشروعات سابقة؟', a: 'لا ننشر مشروعات معرّفة إلا بموافقة كتابية من العميل. ويمكننا شرح منهجيتنا خلال استشارة.' },
    ],
  },
  contractors: {
    whoTitle: 'لمن هذا البرنامج',
    who: 'مقاولو الكهرباء واستشاريو الكهروميكانيكا ومركّبو أنظمة المنازل الذكية العاملون في المشروعات السكنية.',
    benefitsTitle: 'ما تحصل عليه',
    benefits: [
      { title: 'دعم هندسي', body: 'دعم من مهندسينا خلال التصميم والتنفيذ.' },
      { title: 'الوثائق', body: 'وثائق فنية عند اعتمادها، وأوراق البيانات عند الطلب حتى ذلك الحين.' },
      { title: 'شروط توريد مباشرة', body: 'تُتفق الشروط مباشرة بعد المراجعة، ولا تُنشر أسعار الشركاء.' },
    ],
    docsNote: 'تُرسل أوراق البيانات عند الطلب حتى نشر النسخة المعتمدة.',
  },
  finalCta: { title: 'تخطط لمشروع سكني؟', body: 'أرسل لنا تفاصيل المشروع وسيراجعها أحد مهندسينا.' },
};

export const content = { ar, en } as const;
export const c = (l: Locale) => content[l];

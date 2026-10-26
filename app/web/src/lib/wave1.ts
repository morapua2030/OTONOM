import type { Locale } from './i18n.ts';

export type WaveItem = { title: string; body: string; href?: string; label?: string };
export type WaveSection = { eyebrow?: string; title: string; body?: string; items?: WaveItem[] };
export type WavePage = { eyebrow: string; title: string; body: string; sections: WaveSection[]; ctaTitle: string; ctaBody: string };

const en = {
  nav: { services: 'Services', solutions: 'Solutions', work: 'Work', products: 'Products', company: 'Company', build: 'Build with us' },
  hero: {
    eyebrow: 'Technology & Engineering Solutions',
    title: 'Engineering connected ideas into dependable systems.',
    body: 'OTONOM brings embedded hardware, software and automation into one practical engineering process—for individuals, teams and businesses.',
    primary: 'Start with your project',
    secondary: 'Explore our capabilities',
    note: 'Every scope starts with discovery. Feasibility, compatibility and delivery details are confirmed after engineering review.',
  },
  servicesTitle: 'One engineering partner, four connected capabilities',
  servicesBody: 'Engage one discipline or connect them into a reviewed system. Scope and technical dependencies are agreed for each project.',
  services: [
    { title: 'IoT & Embedded Systems', body: 'Connected-device architecture, electronics, firmware and prototype planning for real operating constraints.', href: '/services/iot-embedded', label: 'Explore embedded systems' },
    { title: 'Software Engineering', body: 'Purpose-built web, mobile and backend systems shaped around the people and operations they support.', href: '/services/software-engineering', label: 'Explore software engineering' },
    { title: 'Smart Home & Automation', body: 'Structured planning for controls, scenes and integrations, reviewed against the requirements of each space.', href: '/services/smart-home-automation', label: 'Explore automation' },
    { title: 'Custom Engineering & R&D', body: 'A disciplined path from an open problem to a testable concept, prototype or system direction.', href: '/services/custom-engineering', label: 'Explore custom engineering' },
  ],
  pathsTitle: 'Start where your project is today',
  pathsBody: 'You do not need a finished specification. Choose the closest starting point and we will frame the next useful questions.',
  paths: [
    { title: 'I have an idea', body: 'Clarify the problem, users, constraints and the smallest useful proof.', href: '/build-with-us#idea' },
    { title: 'I need a prototype', body: 'Turn requirements into an architecture and a focused validation plan.', href: '/build-with-us#prototype' },
    { title: 'I have an existing system', body: 'Map the current system, risks and integration boundaries before changing it.', href: '/build-with-us#existing-system' },
    { title: 'I am not sure yet', body: 'Use a guided discovery path to identify the right engineering starting point.', href: '/build-with-us#not-sure' },
  ],
  processTitle: 'A clear path from uncertainty to evidence',
  processBody: 'Each stage creates a reviewable decision before the project moves forward.',
  process: [
    { title: 'Discover', body: 'Define the problem, users, context and constraints.' },
    { title: 'Frame', body: 'Shape the scope, interfaces, risks and success criteria.' },
    { title: 'Engineer', body: 'Design and implement the agreed hardware, software or automation work.' },
    { title: 'Validate', body: 'Test against the agreed criteria and document what the evidence supports.' },
    { title: 'Handover', body: 'Transfer the approved result with its operating and support context.' },
  ],
  audiencesTitle: 'Built for people and organisations',
  audiences: [
    { title: 'For individuals', body: 'A direct, understandable process for a home, product idea or focused technical challenge.', href: '/solutions#individuals' },
    { title: 'For businesses', body: 'A structured engagement for teams that need engineering capacity, integration or a new system.', href: '/solutions#businesses' },
  ],
  proofTitle: 'Real products, evidence-first communication',
  proofBody: 'OTONOM 4R, 6R and 16R controllers are an existing product family. Detailed claims remain withheld until the matching technical evidence is approved.',
  workTitle: 'Work shown with consent and context',
  workBody: 'We publish identified case studies only with written client permission. Until then, our work area explains the engineering method without inventing outcomes.',
  finalTitle: 'Bring us the problem, not a perfect brief.',
  finalBody: 'Choose your current project stage and see the information that makes a first engineering review useful.',
  footerBody: 'Technology and engineering solutions across embedded systems, software, automation and custom R&D.',
} as const;

const ar = {
  nav: { services: 'الخدمات', solutions: 'الحلول', work: 'أعمالنا', products: 'المنتجات', company: 'الشركة', build: 'ابدأ مشروعك' },
  hero: {
    eyebrow: 'حلول تكنولوجية وهندسية',
    title: 'نحوّل الأفكار المتصلة إلى أنظمة يمكن الاعتماد عليها.',
    body: 'تجمع OTONOM بين الأنظمة المدمجة والبرمجيات والأتمتة في مسار هندسي عملي للأفراد والفرق والشركات.',
    primary: 'ابدأ بمشروعك',
    secondary: 'استكشف قدراتنا',
    note: 'يبدأ كل نطاق بمرحلة اكتشاف. تُؤكَّد الجدوى والتوافق وتفاصيل التسليم بعد المراجعة الهندسية.',
  },
  servicesTitle: 'شريك هندسي واحد، وأربع قدرات مترابطة',
  servicesBody: 'يمكنك اختيار تخصص واحد أو ربط عدة تخصصات في نظام مُراجع. يُتفق على النطاق والاعتماديات الفنية لكل مشروع.',
  services: [
    { title: 'إنترنت الأشياء والأنظمة المدمجة', body: 'هندسة الأجهزة المتصلة والإلكترونيات والبرمجيات الثابتة وتخطيط النماذج الأولية وفق ظروف التشغيل الفعلية.', href: '/services/iot-embedded', label: 'استكشف الأنظمة المدمجة' },
    { title: 'هندسة البرمجيات', body: 'أنظمة ويب وموبايل وخلفيات برمجية مصممة حول الأشخاص والعمليات التي تخدمها.', href: '/services/software-engineering', label: 'استكشف هندسة البرمجيات' },
    { title: 'المنازل الذكية والأتمتة', body: 'تخطيط منظم للتحكم والمشاهد والتكاملات مع مراجعة متطلبات كل مساحة.', href: '/services/smart-home-automation', label: 'استكشف الأتمتة' },
    { title: 'الهندسة المخصصة والبحث والتطوير', body: 'مسار منضبط يبدأ بمشكلة مفتوحة وينتهي بمفهوم أو نموذج أو اتجاه نظام قابل للاختبار.', href: '/services/custom-engineering', label: 'استكشف الهندسة المخصصة' },
  ],
  pathsTitle: 'ابدأ من المرحلة التي وصل إليها مشروعك',
  pathsBody: 'لا تحتاج إلى مواصفة مكتملة. اختر أقرب نقطة بداية وسنحدد معك الأسئلة المفيدة التالية.',
  paths: [
    { title: 'لدي فكرة', body: 'نوضح المشكلة والمستخدمين والقيود وأصغر دليل مفيد.', href: '/build-with-us#idea' },
    { title: 'أحتاج نموذجًا أوليًا', body: 'نحوّل المتطلبات إلى معمارية وخطة تحقق مركزة.', href: '/build-with-us#prototype' },
    { title: 'لدي نظام قائم', body: 'نفهم النظام الحالي والمخاطر وحدود التكامل قبل تغييره.', href: '/build-with-us#existing-system' },
    { title: 'لست متأكدًا بعد', body: 'نستخدم مسار اكتشاف موجه لتحديد نقطة البداية الهندسية المناسبة.', href: '/build-with-us#not-sure' },
  ],
  processTitle: 'مسار واضح من الأسئلة إلى الدليل',
  processBody: 'تنتج كل مرحلة قرارًا قابلًا للمراجعة قبل الانتقال لما بعدها.',
  process: [
    { title: 'الاكتشاف', body: 'تحديد المشكلة والمستخدمين والسياق والقيود.' },
    { title: 'صياغة النطاق', body: 'توضيح النطاق والواجهات والمخاطر ومعايير النجاح.' },
    { title: 'الهندسة', body: 'تصميم وتنفيذ أعمال الأجهزة أو البرمجيات أو الأتمتة المتفق عليها.' },
    { title: 'التحقق', body: 'الاختبار مقابل المعايير المتفق عليها وتوثيق ما يدعمه الدليل.' },
    { title: 'التسليم', body: 'نقل النتيجة المعتمدة مع سياق التشغيل والدعم.' },
  ],
  audiencesTitle: 'للأفراد والمؤسسات',
  audiences: [
    { title: 'للأفراد', body: 'مسار مباشر ومفهوم لمنزل أو فكرة منتج أو تحدٍ تقني محدد.', href: '/solutions#individuals' },
    { title: 'للشركات', body: 'تعاون منظم للفرق التي تحتاج قدرات هندسية أو تكاملًا أو نظامًا جديدًا.', href: '/solutions#businesses' },
  ],
  proofTitle: 'منتجات حقيقية وتواصل قائم على الدليل',
  proofBody: 'وحدات OTONOM 4R و6R و16R عائلة منتجات قائمة. تظل الادعاءات التفصيلية محجوبة حتى اعتماد دليلها الفني المطابق.',
  workTitle: 'أعمال تُعرض بالموافقة والسياق',
  workBody: 'ننشر دراسات الحالة المعرّفة فقط بإذن كتابي من العميل. وحتى ذلك الحين نشرح منهجنا الهندسي دون اختلاق نتائج.',
  finalTitle: 'أحضر المشكلة، وليس مطلوبًا موجزًا مثاليًا.',
  finalBody: 'اختر مرحلة مشروعك الحالية واعرف المعلومات التي تجعل أول مراجعة هندسية مفيدة.',
  footerBody: 'حلول تكنولوجية وهندسية تشمل الأنظمة المدمجة والبرمجيات والأتمتة والبحث والتطوير المخصص.',
};

export const wave = (locale: Locale) => (locale === 'ar' ? ar : en);

const pagesEn: Record<string, WavePage> = {
  services: {
    eyebrow: 'Capabilities', title: 'Engineering services that connect across the whole system.', body: 'Use one capability for a focused need or combine them around a shared technical outcome.',
    sections: [{ title: en.servicesTitle, body: en.servicesBody, items: [...en.services] }, { eyebrow: 'How we engage', title: 'The interfaces matter as much as the parts.', body: 'We make ownership, dependencies, evidence and handover explicit so hardware, software and operations can move together.' }],
    ctaTitle: en.finalTitle, ctaBody: en.finalBody,
  },
  'services/iot-embedded': {
    eyebrow: 'IoT & Embedded Systems', title: 'Connected-device engineering grounded in real constraints.', body: 'We frame electronics, firmware, connectivity and system boundaries together before committing to an implementation direction.',
    sections: [{ title: 'Where we can help', items: [{ title: 'System architecture', body: 'Define device responsibilities, interfaces, power, connectivity and operating constraints.' }, { title: 'Electronics & firmware', body: 'Plan and build the agreed control, sensing and embedded behavior.' }, { title: 'Prototype planning', body: 'Choose what a prototype must prove and how that evidence will be gathered.' }] }, { title: 'What gets reviewed', body: 'Feasibility, component availability, environmental assumptions, security boundaries, test criteria and the route from prototype to a supported system.' }],
    ctaTitle: 'Start with your device or system question.', ctaBody: 'Share the operating context, current stage and the decision you need the work to support.'
  },
  'services/software-engineering': {
    eyebrow: 'Software Engineering', title: 'Software shaped around the work it needs to support.', body: 'We connect product thinking, interface design, backend engineering and operational constraints in one reviewable delivery path.',
    sections: [{ title: 'Where we can help', items: [{ title: 'Product & experience', body: 'Frame users, journeys, information and the smallest useful release.' }, { title: 'Web & mobile systems', body: 'Implement accessible interfaces and the services behind them.' }, { title: 'Backend & integrations', body: 'Design data, APIs and controlled connections to the wider system.' }] }, { title: 'What gets reviewed', body: 'Identity, permissions, data handling, dependencies, observability, accessibility and release controls are addressed in context.' }],
    ctaTitle: 'Start with the workflow or product problem.', ctaBody: 'A useful first brief explains who needs the system, what they need to achieve and what exists today.'
  },
  'services/smart-home-automation': {
    eyebrow: 'Smart Home & Automation', title: 'Automation planned around the space, its users and its operating reality.', body: 'We structure controls, scenes and integrations as an engineering scope, then verify compatibility for the specific project.',
    sections: [{ title: 'Where we can help', items: [{ title: 'Needs & scene planning', body: 'Translate daily use into rooms, circuits, scenes and control priorities.' }, { title: 'System coordination', body: 'Map control boundaries and dependencies with the wider electrical and technology scope.' }, { title: 'Commissioning context', body: 'Define checks, documentation and handover expectations before delivery.' }] }, { title: 'OTONOM controllers', body: 'The 4R, 6R and 16R family is presented with genuine product imagery. Electrical and compatibility claims remain subject to approved evidence.' }],
    ctaTitle: 'Start with the space and how it should work.', ctaBody: 'Project-specific coverage, compatibility and delivery capacity are confirmed only after review.'
  },
  'services/custom-engineering': {
    eyebrow: 'Custom Engineering & R&D', title: 'A disciplined route through problems without an off-the-shelf answer.', body: 'We reduce uncertainty by turning open questions into bounded experiments, architecture decisions and testable prototypes.',
    sections: [{ title: 'Where we can help', items: [{ title: 'Problem framing', body: 'Separate assumptions from known constraints and identify the most valuable uncertainty to resolve.' }, { title: 'Feasibility work', body: 'Explore candidate approaches and define evidence for a responsible go, change or stop decision.' }, { title: 'Prototype & validation', body: 'Build only what is needed to test the agreed technical question.' }] }, { title: 'Responsible R&D', body: 'Exploration is not presented as a guaranteed product outcome. Findings, limitations and next decisions are documented clearly.' }],
    ctaTitle: 'Start with the hardest unanswered question.', ctaBody: 'Tell us what you are trying to learn, decide or de-risk.'
  },
  solutions: {
    eyebrow: 'Solutions', title: 'Start with the outcome, then assemble the right engineering disciplines.', body: 'OTONOM works with individuals and businesses without forcing every problem into a single product category.',
    sections: [{ title: 'For individuals', items: [{ title: 'A smarter space', body: 'Plan controls and automation around how a home or focused space should operate.' }, { title: 'A product idea', body: 'Turn an idea into a bounded concept or prototype question.' }], eyebrow: 'Individuals' }, { title: 'For businesses', items: [{ title: 'A connected product', body: 'Align device, software and operational responsibilities.' }, { title: 'A business system', body: 'Shape a tailored workflow, application or integration.' }, { title: 'Engineering extension', body: 'Add focused capacity around a reviewed technical scope.' }], eyebrow: 'Businesses' }],
    ctaTitle: en.finalTitle, ctaBody: en.finalBody,
  },
  about: {
    eyebrow: 'Company', title: 'OTONOM connects hardware, software and automation through practical engineering.', body: 'We are an Egyptian technology and engineering company building a broader practice around connected systems and custom problem-solving.',
    sections: [{ title: 'What guides the work', items: [{ title: 'Evidence before claims', body: 'We say what is known, what is assumed and what still needs testing.' }, { title: 'Clarity across disciplines', body: 'Interfaces, ownership and trade-offs remain visible throughout the work.' }, { title: 'Useful handover', body: 'A result is stronger when its decisions and operating context can be understood.' }] }, { title: 'What we do not publish without approval', body: 'Client identities, confidential project details, technical claims, commercial terms and case-study outcomes stay private until their evidence and permissions are complete.' }],
    ctaTitle: 'See how the engineering process works.', ctaBody: 'Follow the path from discovery to evidence and handover.'
  },
  'engineering-process': {
    eyebrow: 'Engineering process', title: 'Move forward through explicit decisions, not hidden assumptions.', body: 'The exact delivery model changes by project, but the decision path remains clear.',
    sections: [{ title: en.processTitle, body: en.processBody, items: [...en.process] }, { title: 'Decision gates', items: [{ title: 'Scope gate', body: 'Is the problem and boundary clear enough to proceed?' }, { title: 'Architecture gate', body: 'Are interfaces, risks and validation criteria understood?' }, { title: 'Release gate', body: 'Does the evidence support the intended use and handover?' }] }],
    ctaTitle: en.finalTitle, ctaBody: en.finalBody,
  },
  'build-with-us': {
    eyebrow: 'Build with us', title: 'Choose the project stage that sounds most like yours.', body: 'Each path below is a preparation guide. This public website does not collect personal information while the intake and privacy gate is disabled.',
    sections: [{ title: 'Your starting point', items: [...en.paths] }, { title: 'Prepare for a useful first review', items: [{ title: 'Context', body: 'Who will use it, where it operates and what is happening today?' }, { title: 'Desired change', body: 'What should become possible, easier, safer or clearer?' }, { title: 'Constraints', body: 'What boundaries, systems, timing or decisions already exist?' }, { title: 'Evidence needed', body: 'What would make the next decision responsible?' }] }, { title: 'No public data collection yet', body: 'Use only an existing verified OTONOM contact channel known to you. A public contact channel will be added after its privacy, retention and operational approval is complete.' }],
    ctaTitle: 'Review the engineering process.', ctaBody: 'Understand what happens after an initial scope is accepted.'
  },
  contact: {
    eyebrow: 'Contact', title: 'Prepare the right context for a first conversation.', body: 'Public contact intake is not enabled, so this page does not ask for your name, email address or phone number.',
    sections: [{ title: 'What to prepare', items: [{ title: 'Your starting point', body: 'Idea, prototype, existing system or an open question.' }, { title: 'The context', body: 'Users, environment, current setup and known constraints.' }, { title: 'The decision', body: 'The next choice or outcome the engineering work should support.' }] }, { title: 'Current contact path', body: 'Use an existing verified OTONOM contact channel already known to you. No new public channel is published until its operational and privacy approvals are complete.' }],
    ctaTitle: 'Build a clearer project brief.', ctaBody: 'Use the guided starting paths without submitting personal data.'
  },
  support: {
    eyebrow: 'Support', title: 'Support continues through existing verified channels.', body: 'The public warranty and service portals remain disabled. This page does not create a claim, service request or warranty activation.',
    sections: [{ title: 'Before contacting support', items: [{ title: 'Identify the system', body: 'Prepare the model or project reference already available to you.' }, { title: 'Describe the observed behavior', body: 'Note what happened, when it started and any safe troubleshooting already completed.' }, { title: 'Protect sensitive information', body: 'Do not send passwords, OTPs, recovery codes or unnecessary personal data.' }] }, { title: 'Availability', body: 'Use the existing verified support channel already provided for your project or product. Coverage and warranty terms are not changed or created by this website.' }],
    ctaTitle: 'Looking for a new project?', ctaBody: 'Use Build with us to choose the right starting point.'
  },
};

const pagesAr: Record<string, WavePage> = {
  services: { eyebrow: 'القدرات', title: 'خدمات هندسية تتصل عبر النظام بالكامل.', body: 'استخدم قدرة واحدة لاحتياج محدد أو اجمع عدة قدرات حول نتيجة تقنية مشتركة.', sections: [{ title: ar.servicesTitle, body: ar.servicesBody, items: [...ar.services] }, { eyebrow: 'طريقة التعاون', title: 'الواجهات بين الأجزاء مهمة بقدر الأجزاء نفسها.', body: 'نجعل المسؤوليات والاعتماديات والأدلة والتسليم واضحة حتى تتحرك الأجهزة والبرمجيات والتشغيل معًا.' }], ctaTitle: ar.finalTitle, ctaBody: ar.finalBody },
  'services/iot-embedded': { eyebrow: 'إنترنت الأشياء والأنظمة المدمجة', title: 'هندسة أجهزة متصلة تنطلق من قيود التشغيل الحقيقية.', body: 'نراجع الإلكترونيات والبرمجيات الثابتة والاتصال وحدود النظام معًا قبل الالتزام باتجاه التنفيذ.', sections: [{ title: 'كيف يمكننا المساعدة', items: [{ title: 'معمارية النظام', body: 'تحديد مسؤوليات الأجهزة والواجهات والطاقة والاتصال وقيود التشغيل.' }, { title: 'الإلكترونيات والبرمجيات الثابتة', body: 'تخطيط وبناء وظائف التحكم والاستشعار والوظائف المدمجة المتفق عليها.' }, { title: 'تخطيط النموذج الأولي', body: 'تحديد ما يجب أن يثبته النموذج وكيف سيُجمع الدليل.' }] }, { title: 'ما تتم مراجعته', body: 'الجدوى وتوفر المكونات والافتراضات البيئية وحدود الأمان ومعايير الاختبار والانتقال من النموذج إلى نظام قابل للدعم.' }], ctaTitle: 'ابدأ بسؤالك عن الجهاز أو النظام.', ctaBody: 'شارك سياق التشغيل والمرحلة الحالية والقرار الذي يجب أن يدعمه العمل.' },
  'services/software-engineering': { eyebrow: 'هندسة البرمجيات', title: 'برمجيات تتشكل حول العمل الذي يجب أن تدعمه.', body: 'نربط تفكير المنتج وتصميم الواجهات وهندسة الخلفية والقيود التشغيلية في مسار تسليم قابل للمراجعة.', sections: [{ title: 'كيف يمكننا المساعدة', items: [{ title: 'المنتج والتجربة', body: 'صياغة المستخدمين والرحلات والمعلومات وأصغر إصدار مفيد.' }, { title: 'أنظمة الويب والموبايل', body: 'تنفيذ واجهات قابلة للوصول والخدمات التي تعمل خلفها.' }, { title: 'الخلفيات والتكاملات', body: 'تصميم البيانات والواجهات البرمجية والاتصالات المنضبطة مع النظام الأوسع.' }] }, { title: 'ما تتم مراجعته', body: 'تُعالج الهوية والصلاحيات والبيانات والاعتماديات والمراقبة والوصول وضوابط الإصدار حسب السياق.' }], ctaTitle: 'ابدأ بمشكلة سير العمل أو المنتج.', ctaBody: 'الموجز المفيد يشرح من يحتاج النظام وما الذي يريد تحقيقه وما الموجود حاليًا.' },
  'services/smart-home-automation': { eyebrow: 'المنازل الذكية والأتمتة', title: 'أتمتة تُخطط حول المكان ومستخدميه وواقعه التشغيلي.', body: 'ننظم التحكم والمشاهد والتكاملات كنطاق هندسي ثم نتحقق من التوافق للمشروع المحدد.', sections: [{ title: 'كيف يمكننا المساعدة', items: [{ title: 'تخطيط الاحتياجات والمشاهد', body: 'تحويل الاستخدام اليومي إلى غرف ودوائر ومشاهد وأولويات تحكم.' }, { title: 'تنسيق النظام', body: 'رسم حدود التحكم واعتمادياتها مع النطاق الكهربائي والتقني الأوسع.' }, { title: 'سياق التشغيل والتسليم', body: 'تحديد الفحوصات والوثائق وتوقعات التسليم قبل التنفيذ.' }] }, { title: 'وحدات تحكم OTONOM', body: 'تُعرض عائلة 4R و6R و16R بصور المنتجات الحقيقية. وتظل الادعاءات الكهربائية وادعاءات التوافق خاضعة للأدلة المعتمدة.' }], ctaTitle: 'ابدأ بالمكان والطريقة التي يجب أن يعمل بها.', ctaBody: 'تُؤكد التغطية والتوافق وقدرة التسليم الخاصة بالمشروع بعد المراجعة فقط.' },
  'services/custom-engineering': { eyebrow: 'الهندسة المخصصة والبحث والتطوير', title: 'مسار منضبط للمشكلات التي لا يناسبها حل جاهز.', body: 'نقلل عدم اليقين بتحويل الأسئلة المفتوحة إلى تجارب محددة وقرارات معمارية ونماذج قابلة للاختبار.', sections: [{ title: 'كيف يمكننا المساعدة', items: [{ title: 'صياغة المشكلة', body: 'فصل الافتراضات عن القيود المعروفة وتحديد أكثر نقاط عدم اليقين قيمة.' }, { title: 'دراسة الجدوى', body: 'استكشاف اتجاهات محتملة وتحديد دليل لقرار مسؤول بالاستمرار أو التغيير أو التوقف.' }, { title: 'النموذج والتحقق', body: 'بناء ما يلزم فقط لاختبار السؤال التقني المتفق عليه.' }] }, { title: 'بحث وتطوير مسؤول', body: 'لا يُعرض الاستكشاف كضمان لنتيجة منتج. تُوثق النتائج والقيود والقرارات التالية بوضوح.' }], ctaTitle: 'ابدأ بأصعب سؤال لم تتم إجابته.', ctaBody: 'وضح ما تريد تعلمه أو تقريره أو تقليل مخاطره.' },
  solutions: { eyebrow: 'الحلول', title: 'ابدأ بالنتيجة ثم اجمع التخصصات الهندسية المناسبة.', body: 'تعمل OTONOM مع الأفراد والشركات دون حصر كل مشكلة في فئة منتج واحدة.', sections: [{ title: 'للأفراد', eyebrow: 'الأفراد', items: [{ title: 'مساحة أذكى', body: 'تخطيط التحكم والأتمتة حول طريقة عمل المنزل أو المساحة.' }, { title: 'فكرة منتج', body: 'تحويل الفكرة إلى مفهوم محدد أو سؤال نموذج أولي.' }] }, { title: 'للشركات', eyebrow: 'الشركات', items: [{ title: 'منتج متصل', body: 'مواءمة مسؤوليات الجهاز والبرمجيات والتشغيل.' }, { title: 'نظام أعمال', body: 'صياغة سير عمل أو تطبيق أو تكامل مخصص.' }, { title: 'امتداد هندسي', body: 'إضافة قدرة مركزة حول نطاق تقني مُراجع.' }] }], ctaTitle: ar.finalTitle, ctaBody: ar.finalBody },
  about: { eyebrow: 'الشركة', title: 'تربط OTONOM الأجهزة والبرمجيات والأتمتة من خلال هندسة عملية.', body: 'نحن شركة تكنولوجيا وهندسة مصرية نبني ممارسة أوسع حول الأنظمة المتصلة وحل المشكلات المخصصة.', sections: [{ title: 'ما يوجه العمل', items: [{ title: 'الدليل قبل الادعاء', body: 'نوضح ما هو معروف وما هو مفترض وما يحتاج إلى اختبار.' }, { title: 'وضوح بين التخصصات', body: 'تظل الواجهات والمسؤوليات والمفاضلات مرئية خلال العمل.' }, { title: 'تسليم مفيد', body: 'تكون النتيجة أقوى عندما يمكن فهم قراراتها وسياق تشغيلها.' }] }, { title: 'ما لا ننشره دون اعتماد', body: 'تظل هويات العملاء وتفاصيل المشروعات السرية والادعاءات الفنية والشروط التجارية ونتائج دراسات الحالة خاصة حتى اكتمال أدلتها وموافقاتها.' }], ctaTitle: 'تعرّف على طريقة العمل الهندسية.', ctaBody: 'اتبع المسار من الاكتشاف إلى الدليل والتسليم.' },
  'engineering-process': { eyebrow: 'العملية الهندسية', title: 'تقدم عبر قرارات واضحة، لا افتراضات مخفية.', body: 'يتغير نموذج التسليم حسب المشروع، لكن مسار القرار يظل واضحًا.', sections: [{ title: ar.processTitle, body: ar.processBody, items: [...ar.process] }, { title: 'بوابات القرار', items: [{ title: 'بوابة النطاق', body: 'هل المشكلة والحدود واضحتان بما يكفي للاستمرار؟' }, { title: 'بوابة المعمارية', body: 'هل الواجهات والمخاطر ومعايير التحقق مفهومة؟' }, { title: 'بوابة الإصدار', body: 'هل يدعم الدليل الاستخدام المقصود والتسليم؟' }] }], ctaTitle: ar.finalTitle, ctaBody: ar.finalBody },
  'build-with-us': { eyebrow: 'ابدأ مشروعك', title: 'اختر المرحلة الأقرب إلى مشروعك.', body: 'كل مسار أدناه دليل تحضير. لا يجمع هذا الموقع العام بيانات شخصية ما دامت بوابة الاستقبال والخصوصية معطلة.', sections: [{ title: 'نقطة البداية', items: [...ar.paths] }, { title: 'استعد لمراجعة أولى مفيدة', items: [{ title: 'السياق', body: 'من سيستخدمه وأين يعمل وما الذي يحدث اليوم؟' }, { title: 'التغيير المطلوب', body: 'ما الذي يجب أن يصبح ممكنًا أو أسهل أو أكثر أمانًا أو وضوحًا؟' }, { title: 'القيود', body: 'ما الحدود أو الأنظمة أو التوقيت أو القرارات الموجودة؟' }, { title: 'الدليل المطلوب', body: 'ما الذي يجعل القرار التالي مسؤولًا؟' }] }, { title: 'لا جمع عام للبيانات بعد', body: 'استخدم فقط قناة OTONOM موثوقة تعرفها بالفعل. ستضاف قناة عامة بعد اكتمال اعتماد الخصوصية والاحتفاظ والتشغيل.' }], ctaTitle: 'راجع العملية الهندسية.', ctaBody: 'اعرف ما يحدث بعد قبول النطاق الأولي.' },
  contact: { eyebrow: 'تواصل', title: 'حضّر السياق المناسب لأول محادثة.', body: 'استقبال التواصل العام غير مفعل، لذلك لا تطلب هذه الصفحة اسمك أو بريدك أو رقم هاتفك.', sections: [{ title: 'ما الذي تحضره', items: [{ title: 'نقطة البداية', body: 'فكرة أو نموذج أولي أو نظام قائم أو سؤال مفتوح.' }, { title: 'السياق', body: 'المستخدمون والبيئة والإعداد الحالي والقيود المعروفة.' }, { title: 'القرار', body: 'الاختيار أو النتيجة التالية التي يجب أن يدعمها العمل الهندسي.' }] }, { title: 'مسار التواصل الحالي', body: 'استخدم قناة OTONOM موثوقة تعرفها بالفعل. لا تُنشر قناة عامة جديدة حتى اكتمال اعتماد التشغيل والخصوصية.' }], ctaTitle: 'كوّن موجزًا أوضح لمشروعك.', ctaBody: 'استخدم مسارات البداية الموجهة دون إرسال بيانات شخصية.' },
  support: { eyebrow: 'الدعم', title: 'يستمر الدعم عبر القنوات الموثوقة الحالية.', body: 'تظل بوابات الضمان والخدمة العامة معطلة. لا تنشئ هذه الصفحة مطالبة أو طلب خدمة أو تفعيل ضمان.', sections: [{ title: 'قبل التواصل مع الدعم', items: [{ title: 'حدد النظام', body: 'حضّر الطراز أو مرجع المشروع المتاح لديك.' }, { title: 'صف السلوك الملحوظ', body: 'دوّن ما حدث ومتى بدأ وأي استكشاف آمن تم بالفعل.' }, { title: 'احم المعلومات الحساسة', body: 'لا ترسل كلمات مرور أو رموز OTP أو أكواد استرداد أو بيانات شخصية غير لازمة.' }] }, { title: 'الإتاحة', body: 'استخدم قناة الدعم الموثوقة التي سبق توفيرها لمشروعك أو منتجك. لا يغيّر هذا الموقع تغطية أو شروط الضمان ولا ينشئها.' }], ctaTitle: 'هل تبحث عن مشروع جديد؟', ctaBody: 'استخدم صفحة ابدأ مشروعك لاختيار نقطة البداية المناسبة.' },
};

export const wavePage = (locale: Locale, path: string) => (locale === 'ar' ? pagesAr : pagesEn)[path];
export const wavePagePaths = Object.keys(pagesEn);

import type { Locale } from './i18n.ts';

export type ServiceItem = {
  title: string;
  body: string;
  id?: string;
  href?: string;
  label?: string;
};

export type ServiceJourney = {
  title: string;
  body: string;
  review: string;
  deliverables: string;
  href: string;
  label: string;
};

export type ServicePageContent = {
  path: ServicePath;
  eyebrow: string;
  title: string;
  summary: string;
  note: string;
  overview?: boolean;
  capabilitiesTitle: string;
  capabilitiesIntro: string;
  capabilities: ServiceItem[];
  problemsTitle: string;
  problemsIntro: string;
  problems: ServiceItem[];
  scenariosTitle: string;
  scenariosIntro: string;
  scenarios: ServiceItem[];
  entryTitle: string;
  entryIntro: string;
  entryPoints: ServiceItem[];
  processTitle: string;
  processIntro: string;
  process: ServiceItem[];
  deliverablesTitle: string;
  deliverablesIntro: string;
  deliverables: ServiceItem[];
  journeys?: ServiceJourney[];
  faqTitle: string;
  faqs: Array<{ question: string; answer: string }>;
  relatedTitle: string;
  related: ServiceItem[];
  ctaTitle: string;
  ctaBody: string;
  ctaLabel: string;
  productProof?: boolean;
};

export const servicePaths = [
  'services',
  'services/software-engineering',
  'services/iot-embedded',
  'services/custom-engineering',
  'services/smart-home-automation',
] as const;

export type ServicePath = (typeof servicePaths)[number];

const sharedEn = {
  entryTitle: 'Start from the stage you are actually in',
  entryIntro: 'A useful first review can begin with an idea, unfinished work or an established system. You do not need to rename the problem in technical language first.',
  entryPoints: [
    { title: 'I have an idea', body: 'Clarify the users, environment, constraints and the smallest question worth testing.', href: '/build-with-us#idea', label: 'Prepare an idea review' },
    { title: 'I have a prototype', body: 'Bring the current hardware, software, notes and test evidence so the next decision starts from facts.', href: '/build-with-us#prototype', label: 'Prepare a prototype review' },
    { title: 'I have an existing system', body: 'Map dependencies, risks and compatibility before extending, replacing or integrating anything.', href: '/build-with-us#existing-system', label: 'Prepare a system review' },
    { title: 'I am not sure', body: 'Describe the outcome or obstacle in plain language and use the guided starting path.', href: '/build-with-us#not-sure', label: 'Find a starting point' },
  ],
  processTitle: 'A reviewable engineering path',
  processIntro: 'The exact activities depend on the project. Each stage should produce enough evidence for the next decision.',
  process: [
    { title: 'Discover', body: 'Understand the people, environment, current assets, constraints and intended outcome.' },
    { title: 'Frame', body: 'Define scope boundaries, interfaces, assumptions, risks and success criteria.' },
    { title: 'Engineer', body: 'Design and implement only the agreed hardware, software or integration work.' },
    { title: 'Verify', body: 'Test the result against agreed criteria and record limitations as well as passes.' },
    { title: 'Handover', body: 'Transfer the approved result, source and operating context as defined in the scope.' },
  ],
  relatedTitle: 'Continue across the right disciplines',
  faqTitle: 'Questions before a first review',
  ctaLabel: 'Prepare your project start',
};

const sharedAr = {
  entryTitle: 'ابدأ من المرحلة الفعلية لمشروعك',
  entryIntro: 'يمكن أن تبدأ المراجعة الأولى من فكرة أو عمل غير مكتمل أو نظام قائم. لا تحتاج أولًا إلى صياغة المشكلة بمصطلحات تقنية.',
  entryPoints: [
    { title: 'لدي فكرة', body: 'نوضح المستخدمين والبيئة والقيود وأصغر سؤال يستحق الاختبار.', href: '/build-with-us#idea', label: 'حضّر مراجعة الفكرة' },
    { title: 'لدي نموذج أولي', body: 'أحضر العتاد أو البرمجيات الحالية والملاحظات وأدلة الاختبار ليبدأ القرار التالي من حقائق.', href: '/build-with-us#prototype', label: 'حضّر مراجعة النموذج' },
    { title: 'لدي نظام قائم', body: 'نرسم الاعتماديات والمخاطر والتوافق قبل التوسعة أو الاستبدال أو التكامل.', href: '/build-with-us#existing-system', label: 'حضّر مراجعة النظام' },
    { title: 'لست متأكدًا', body: 'صف النتيجة أو العائق بلغة بسيطة واستخدم مسار البداية الموجّه.', href: '/build-with-us#not-sure', label: 'اعثر على نقطة البداية' },
  ],
  processTitle: 'مسار هندسي قابل للمراجعة',
  processIntro: 'تتغير الأنشطة حسب المشروع، لكن يجب أن تنتج كل مرحلة دليلًا كافيًا للقرار التالي.',
  process: [
    { title: 'الاكتشاف', body: 'فهم الأشخاص والبيئة والأصول الحالية والقيود والنتيجة المطلوبة.' },
    { title: 'تحديد الإطار', body: 'توضيح حدود النطاق والواجهات والافتراضات والمخاطر ومعايير النجاح.' },
    { title: 'الهندسة', body: 'تصميم وتنفيذ أعمال العتاد أو البرمجيات أو التكامل المتفق عليها فقط.' },
    { title: 'التحقق', body: 'اختبار النتيجة مقابل المعايير المتفق عليها وتسجيل القيود بجانب النجاحات.' },
    { title: 'التسليم', body: 'نقل النتيجة والمصادر وسياق التشغيل المعتمد حسب النطاق.' },
  ],
  relatedTitle: 'انتقل بين التخصصات المناسبة',
  faqTitle: 'أسئلة قبل المراجعة الأولى',
  ctaLabel: 'حضّر بداية مشروعك',
};

const en: Record<ServicePath, ServicePageContent> = {
  services: {
    path: 'services', overview: true,
    eyebrow: 'Services',
    title: 'Technology built around your challenge.',
    summary: 'OTONOM helps individuals and businesses move from an idea, prototype or existing system toward a reviewed engineering outcome across software, electronics, connected devices and automation.',
    note: 'Every engagement begins with discovery. Feasibility, compatibility, schedule and commercial terms are confirmed only after the relevant engineering review.',
    capabilitiesTitle: 'Four capabilities, one connected view',
    capabilitiesIntro: 'Choose one focused discipline or connect several where the outcome crosses hardware and software boundaries.',
    capabilities: [
      { title: 'Software Engineering', body: 'Web, mobile, backend and operational systems shaped around a defined workflow or product problem.', href: '/services/software-engineering', label: 'Explore software engineering' },
      { title: 'IoT & Embedded Engineering', body: 'Electronics, firmware, sensing, connectivity and device-to-software architecture for reviewed operating constraints.', href: '/services/iot-embedded', label: 'Explore IoT and embedded systems' },
      { title: 'Custom Engineering, Prototyping & R&D', body: 'Feasibility, proofs of concept, prototype completion and existing-system improvement without assuming the answer in advance.', href: '/services/custom-engineering', label: 'Explore custom engineering' },
      { title: 'Smart Home & Automation', body: 'Service-led planning for controls, scenes and OTONOM controller applications, subject to project-specific review.', href: '/services/smart-home-automation', label: 'Explore smart home services' },
    ],
    problemsTitle: 'Choose by the outcome you need',
    problemsIntro: 'You do not need to know the technology name. Start with the closest real-world objective.',
    problems: [
      { title: 'Create a digital product', body: 'An app, platform, business workflow or connected-device interface.', href: '/services/software-engineering#capabilities', label: 'See software paths' },
      { title: 'Create a connected device', body: 'A controller, sensor system or electronic proof of concept with the right software boundary.', href: '/services/iot-embedded#capabilities', label: 'See embedded paths' },
      { title: 'Finish or assess a prototype', body: 'Review unfinished hardware, firmware or code before deciding what to retain or rebuild.', href: '/services/custom-engineering#prototype-rescue', label: 'See prototype rescue' },
      { title: 'Improve an existing system', body: 'Investigate an extension, integration, reliability issue or modernization path.', href: '/services/custom-engineering#existing-system', label: 'See system improvement' },
      { title: 'Plan an automated space', body: 'Translate how a home or eligible building should operate into a reviewed control scope.', href: '/services/smart-home-automation#use-cases', label: 'See automation services' },
    ],
    scenariosTitle: 'Example starting situations',
    scenariosIntro: 'These are illustrative situations, not claims about completed customer projects.',
    scenarios: [
      { title: 'Individual with an app idea', body: 'Frame the users, essential workflow and smallest useful validation before selecting an implementation path.' },
      { title: 'Business with disconnected tools', body: 'Map the current process and evaluate whether integration, workflow software or modernization is appropriate.' },
      { title: 'Founder with an unfinished device', body: 'Review the electronics, firmware, source, dependencies and test evidence before recommending a next step.' },
      { title: 'Homeowner planning automation', body: 'Clarify rooms, circuits, scenes and project constraints before product or installation decisions.' },
    ],
    ...sharedEn,
    deliverablesTitle: 'What an engagement may produce',
    deliverablesIntro: 'Deliverables are selected and agreed for the actual project; no single engagement automatically includes every layer.',
    deliverables: [
      { title: 'Requirements and decision record', body: 'A shared definition of users, constraints, assumptions, interfaces and acceptance criteria.' },
      { title: 'Architecture or prototype', body: 'A scoped technical direction or focused proof designed to answer an agreed question.' },
      { title: 'Implemented system elements', body: 'The agreed software, firmware, electronics or integration work with appropriate verification.' },
      { title: 'Verification and handover context', body: 'Evidence, limitations, source and operating documentation according to scope.' },
    ],
    faqs: [
      { question: 'Do you work with individuals as well as businesses?', answer: 'Yes. The review starts from the problem and current stage, whether the requester is an individual, founder, team or organisation.' },
      { question: 'Do I need a technical brief?', answer: 'No. A plain-language description of the outcome, users, current situation and known constraints is a useful start.' },
      { question: 'Can OTONOM join an existing project?', answer: 'Potentially. Existing source, hardware, documentation, rights, dependencies and risks need assessment before a scope can be confirmed.' },
      { question: 'Can hardware and software be combined?', answer: 'Yes where the reviewed solution needs both. Not every project requires every engineering layer.' },
      { question: 'How are feasibility, scope and pricing decided?', answer: 'They are established after discovery and technical review; this public site does not provide an automatic quote or feasibility guarantee.' },
    ],
    related: [
      { title: 'Engineering process', body: 'See how decisions move from discovery to verification and handover.', href: '/engineering-process', label: 'View the process' },
      { title: 'Build with us', body: 'Choose the closest project stage and prepare useful context without submitting personal data here.', href: '/build-with-us', label: 'Choose your starting point' },
      { title: 'Existing OTONOM products', body: 'View the current 4R, 6R and 16R controller family with evidence-aware product information.', href: '/products', label: 'Explore products' },
    ],
    ctaTitle: 'Bring the challenge, not a perfect specification.',
    ctaBody: 'Choose the stage that best matches your project and prepare the context for a responsible first review.',
    ctaLabel: 'Start with your project',
  },
  'services/software-engineering': {
    path: 'services/software-engineering',
    eyebrow: 'Software Engineering',
    title: 'Custom software shaped around the work it must support.',
    summary: 'OTONOM works with individuals, founders and organisations on new digital products and on existing software that needs assessment, extension, integration or modernization.',
    note: 'System type, architecture, integrations, schedule and delivery scope are confirmed after reviewing users, data, current assets and constraints.',
    capabilitiesTitle: 'What we can engineer',
    capabilitiesIntro: 'Each capability is scoped to a specific problem. The list describes possible work, not a claim that every system type has already been delivered.',
    capabilities: [
      { id: 'web-apps', title: 'Websites & web applications', body: 'Public experiences, authenticated tools and workflow applications with an appropriate content, data and security model.' },
      { id: 'mobile', title: 'Mobile applications', body: 'Mobile product experiences and device companions, with platform choices based on users and lifecycle needs.' },
      { id: 'erp-crm', title: 'ERP-style operations & CRM workflows', body: 'Purpose-built operational workflows for records, permissions, handoffs and reporting—after mapping the real process.' },
      { id: 'saas', title: 'SaaS & platform engineering', body: 'Multi-user product foundations, account boundaries and controlled delivery patterns where the business model requires them.' },
      { id: 'apis', title: 'APIs & systems integration', body: 'Reviewed interfaces between current tools, services or devices, including ownership and failure boundaries.' },
      { id: 'analytics', title: 'Dashboards & analytics', body: 'Decision-focused views based on defined data quality, permissions and interpretation limits.' },
      { id: 'modernization', title: 'Software modernization', body: 'Assessment-led repair, extension or replacement planning for an existing codebase and its dependencies.' },
      { id: 'automation', title: 'Workflow automation', body: 'Reduce repetitive handoffs through controlled software rules without hiding accountability or exceptions.' },
    ],
    problemsTitle: 'Problems software can address',
    problemsIntro: 'The engineering choice follows the workflow and evidence, not a fashionable technology label.',
    problems: [
      { title: 'Manual and fragmented work', body: 'Understand where information is repeated, lost or delayed before deciding what should be automated.' },
      { title: 'Disconnected systems', body: 'Review APIs, ownership, data meaning and failure handling before integration.' },
      { title: 'Legacy software needs change', body: 'Assess source, runtime, data, tests and operational risk before proposing repair or modernization.' },
      { title: 'Software must work with a device', body: 'Define the boundary between firmware, connectivity, backend, dashboard and mobile experience.' },
    ],
    scenariosTitle: 'Illustrative project scenarios',
    scenariosIntro: 'Examples below explain fit; they are not presented as delivered case studies.',
    scenarios: [
      { title: 'An individual with an app idea', body: 'Clarify the user journey, core value, data and smallest validation before committing to a full build.' },
      { title: 'An SME improving inventory and sales work', body: 'Map roles, records, exceptions and reporting before shaping an ERP-style workflow.' },
      { title: 'A founder with a half-built mobile app', body: 'Review source, ownership, dependencies, backend and release state before deciding what can be continued.' },
      { title: 'A business extending an established system', body: 'Identify integration seams, regression risk and staged release controls for the requested change.' },
      { title: 'A connected-product owner needing a dashboard', body: 'Align device telemetry, identity, data retention and user actions across the full system.' },
    ],
    ...sharedEn,
    deliverablesTitle: 'Typical software deliverables',
    deliverablesIntro: 'The agreed scope may include some of these items, depending on the project stage and responsibilities.',
    deliverables: [
      { title: 'Discovery & specification', body: 'User journeys, functional boundaries, risks, data and acceptance criteria.' },
      { title: 'UX and interface design', body: 'Information architecture and accessible interface behavior when included in scope.' },
      { title: 'Data, backend & APIs', body: 'Reviewed models, services, permissions and integrations appropriate to the system.' },
      { title: 'Web or mobile implementation', body: 'The agreed user-facing product with tests and controlled release work.' },
      { title: 'Verification & handover', body: 'Test evidence, known limits, source and operational documentation as agreed.' },
    ],
    faqs: [
      { question: 'Can you take over an existing software project?', answer: 'Potentially. OTONOM first reviews source access, ownership, architecture, dependencies, data, security and test evidence before confirming a responsible scope.' },
      { question: 'Do you work with individuals?', answer: 'Yes. Individuals, founders and organisations can all begin with a problem, idea or existing product.' },
      { question: 'Do I need a technical brief?', answer: 'No. Start with the users, desired outcome, current workflow and constraints; technical framing follows discovery.' },
      { question: 'Can software be combined with hardware?', answer: 'Yes when the reviewed architecture calls for firmware, connectivity, backend or app layers. Each interface is scoped explicitly.' },
      { question: 'How is scope and pricing decided?', answer: 'After discovery and review of the actual requirements, assets and risks. No automatic quote or guaranteed estimate is produced by this site.' },
    ],
    related: [
      { title: 'IoT & Embedded Engineering', body: 'Connect software work to electronics, firmware, sensing and device communications.', href: '/services/iot-embedded', label: 'Explore connected-device engineering' },
      { title: 'Custom Engineering & R&D', body: 'Assess an early idea, unfinished prototype or modernization uncertainty.', href: '/services/custom-engineering', label: 'Explore prototyping and R&D' },
      { title: 'Engineering process', body: 'See how scope, implementation and release evidence are reviewed.', href: '/engineering-process', label: 'View the process' },
    ],
    ctaTitle: 'Start with the workflow or product problem.',
    ctaBody: 'Explain who needs the system, what should become possible and what software or constraints already exist.',
    ctaLabel: 'Prepare a software review',
  },
  'services/iot-embedded': {
    path: 'services/iot-embedded',
    eyebrow: 'IoT & Embedded Engineering',
    title: 'Connected electronics engineered from requirements or an existing prototype.',
    summary: 'OTONOM can scope electronics, firmware, sensing, device communications and the software around a connected system—while keeping physical and digital responsibilities explicit.',
    note: 'Component choice, electrical limits, connectivity, certification, manufacturing and field suitability require project-specific evidence and are never assumed by this page.',
    capabilitiesTitle: 'The layers of a connected product',
    capabilitiesIntro: 'A project may need one layer or several. Interfaces and operating constraints are reviewed before implementation.',
    capabilities: [
      { id: 'electronics-pcb', title: 'Electronics & PCB design', body: 'Requirements-led circuits, component decisions, schematics and board work where applicable to the agreed prototype.' },
      { id: 'firmware', title: 'Embedded firmware', body: 'Controller logic, state handling, interfaces and diagnostics shaped around real device behavior.' },
      { id: 'sensors', title: 'Sensors & data acquisition', body: 'Signal, sampling and data-quality decisions tied to the environment and intended interpretation.' },
      { id: 'controllers', title: 'Controllers & gateways', body: 'Defined responsibilities between local control, connected devices and wider systems.' },
      { id: 'connectivity', title: 'Local & wireless connectivity', body: 'Protocol and topology selection only after range, power, security, interoperability and lifecycle constraints are understood.' },
      { id: 'telemetry', title: 'Telemetry & monitoring', body: 'Device data paths, alerts and observability designed with ownership and failure modes in view.' },
      { id: 'platforms', title: 'Platforms, dashboards & apps', body: 'Backend and user experiences for a connected system when software layers are part of the scope.' },
      { id: 'validation', title: 'Diagnostics & prototype validation', body: 'Focused tests and instrumentation to determine what a prototype proves and what remains uncertain.' },
    ],
    problemsTitle: 'Architecture from the physical signal to the user',
    problemsIntro: 'A typical concept may move through sensor or input, PCB and controller, firmware, optional connectivity or gateway, backend, dashboard or mobile, then verification. The path is not mandatory or always linear.',
    problems: [
      { title: 'Physical input', body: 'Define what is sensed or controlled and the environmental assumptions around it.' },
      { title: 'Electronics & controller', body: 'Assign power, processing, interfaces and protection responsibilities based on evidence.' },
      { title: 'Firmware & connectivity', body: 'Coordinate local behavior, states, communications and failure recovery.' },
      { title: 'Backend & experience', body: 'Expose only the data and controls needed by the approved dashboard or mobile workflow.' },
      { title: 'Verification', body: 'Test the agreed behavior and document limits before wider deployment decisions.' },
    ],
    scenariosTitle: 'Illustrative connected-system scenarios',
    scenariosIntro: 'These examples describe possible problem shapes, not completed client deployments.',
    scenarios: [
      { title: 'Custom sensor monitoring', body: 'Explore sensing, sampling, local behavior and how readings should reach an approved user view.' },
      { title: 'Controller-based automation', body: 'Define inputs, outputs, state transitions and safe operational boundaries for the use case.' },
      { title: 'Telemetry dashboard', body: 'Connect reviewed device messages to a controlled data model, alerts and operator interface.' },
      { title: 'Hardware companion app', body: 'Coordinate device identity, communications, permissions and the mobile experience.' },
      { title: 'Connected-product proof of concept', body: 'Build the smallest architecture needed to test the riskiest technical assumption.' },
    ],
    ...sharedEn,
    deliverablesTitle: 'Possible embedded deliverables',
    deliverablesIntro: 'Exact artifacts depend on the agreed stage, safety context and ownership responsibilities.',
    deliverables: [
      { title: 'Requirements & interfaces', body: 'Operating context, responsibilities, constraints and verification criteria.' },
      { title: 'Schematics or layout', body: 'Reviewed electronics artifacts where board work forms part of the scope.' },
      { title: 'Firmware & source', body: 'Agreed embedded behavior, interfaces and diagnostics with source handover terms.' },
      { title: 'Prototype & test record', body: 'A focused build and evidence showing what was tested, passed or remains uncertain.' },
      { title: 'Integration documentation', body: 'Messages, APIs, ownership and operational assumptions for connected software layers.' },
    ],
    faqs: [
      { question: 'Can you start from an existing schematic, PCB or firmware?', answer: 'Potentially. Ownership, files, dependencies, test history, component status and operating constraints must be reviewed first.' },
      { question: 'Can you complete a failing prototype?', answer: 'OTONOM can assess it, but cannot promise that every prototype should or can be rescued. The review determines whether repair, partial reuse or rebuild is responsible.' },
      { question: 'Do all IoT projects need cloud software?', answer: 'No. Some systems are local, some use a gateway, and others need a backend or app. Architecture follows the required behavior and constraints.' },
      { question: 'Do you guarantee certification or manufacturing readiness?', answer: 'No. Certification, laboratory testing, production volume and manufacturing scope require explicit evidence and separate agreement.' },
      { question: 'Can an individual bring a device idea?', answer: 'Yes. Individuals and businesses can begin with an idea, prototype or existing device system.' },
    ],
    related: [
      { title: 'Software Engineering', body: 'Build the backend, dashboard, mobile or integration layers around a connected device.', href: '/services/software-engineering', label: 'Explore software engineering' },
      { title: 'Custom Engineering & R&D', body: 'Frame feasibility or rescue an unfinished hardware-software prototype.', href: '/services/custom-engineering', label: 'Explore prototyping and R&D' },
      { title: 'Smart Home & Automation', body: 'Apply reviewed control and automation engineering to eligible spaces.', href: '/services/smart-home-automation', label: 'Explore automation services' },
    ],
    ctaTitle: 'Start with the device, environment and decision you need.',
    ctaBody: 'Bring the current files, known behavior, constraints and evidence available at your project stage.',
    ctaLabel: 'Prepare an embedded review',
  },
  'services/custom-engineering': {
    path: 'services/custom-engineering',
    eyebrow: 'Custom Engineering, Prototyping & R&D',
    title: "Your project does not have to start from zero.",
    summary: 'OTONOM helps individuals and businesses investigate new ideas, assess unfinished prototypes and improve existing hardware-software systems through bounded, evidence-led engineering.',
    note: 'Feasibility work reduces uncertainty; it does not guarantee that every concept is viable or every prototype should be completed.',
    capabilitiesTitle: 'Three project journeys',
    capabilitiesIntro: 'Choose the journey closest to the state of the work today. The first review may redirect the project when evidence supports a safer or simpler path.',
    capabilities: [
      { id: 'idea-to-prototype', title: 'Idea → Prototype', body: 'Explore the need, constraints and riskiest assumptions before choosing components or a software architecture.' },
      { id: 'prototype-rescue', title: 'Prototype Completion / Rescue', body: 'Assess hardware, firmware, code, defects, dependencies and evidence before deciding what to fix, finish or rebuild.' },
      { id: 'existing-system', title: 'Improve / Modernize an Existing System', body: 'Plan integrations, feature additions, reliability work or upgrades without ignoring current operations.' },
    ],
    problemsTitle: 'Cross-discipline questions need visible boundaries',
    problemsIntro: 'A custom system may combine electronics, firmware, connectivity, backend and user interfaces. The review makes interfaces, ownership and test responsibilities explicit.',
    problems: [
      { title: 'Feasibility before commitment', body: 'Identify the assumption that could invalidate the direction and define a focused way to test it.' },
      { title: 'Unknown prototype condition', body: 'Separate observed defects from missing evidence, undocumented behavior and third-party dependencies.' },
      { title: 'Change without breaking operations', body: 'Map the existing system and plan staged verification before introducing an upgrade or integration.' },
      { title: 'Hardware and software must meet', body: 'Define data, control, timing, error and security boundaries across engineering layers.' },
    ],
    scenariosTitle: 'Illustrative custom-engineering situations',
    scenariosIntro: 'Examples are hypothetical and explain the assessment approach, not a delivery guarantee.',
    scenarios: [
      { title: 'A new connected-product concept', body: 'Turn broad intent into requirements, candidate architecture and the smallest responsible proof.' },
      { title: 'A prototype that fails intermittently', body: 'Review design files, firmware, test setup and observed behavior before choosing an investigation path.' },
      { title: 'An inherited code and device stack', body: 'Establish ownership, versions, interfaces and operational risk before changing either side.' },
      { title: 'A legacy controller needing a modern interface', body: 'Evaluate compatibility and staged integration rather than assuming the old system can be replaced safely.' },
    ],
    ...sharedEn,
    journeys: [
      { title: 'Idea → Prototype', body: 'Start with the problem, users, environment and constraints. Compare candidate directions and define what a proof must demonstrate.', review: 'We may review requirements, feasibility assumptions, component or platform choices, interfaces, safety context and software architecture.', deliverables: 'Potential outputs include a feasibility note, requirements, concept architecture, experiment plan or focused proof of concept.', href: '/build-with-us#idea', label: 'Prepare an idea review' },
      { title: 'Prototype Completion / Rescue', body: 'Begin with the current state rather than hiding unfinished work. The goal is an honest continue, change or rebuild decision.', review: 'We may review hardware, firmware, source, schematics, tests, defects, licensing, ownership, safety and integration constraints.', deliverables: 'Potential outputs include an audit, prioritized defect map, recovery plan, repaired component or a justified rebuild recommendation.', href: '/build-with-us#prototype', label: 'Continue a half-built project' },
      { title: 'Improve / Modernize Existing Systems', body: 'Protect working operations while investigating a new feature, integration, reliability issue or upgrade.', review: 'We may review architecture, interfaces, data, dependencies, failure modes, performance, security and release controls.', deliverables: 'Potential outputs include an upgrade plan, integration specification, staged implementation, verification record or handover package.', href: '/build-with-us#existing-system', label: 'Prepare a system review' },
    ],
    deliverablesTitle: 'Evidence before expansion',
    deliverablesIntro: 'R&D deliverables are chosen to support a decision, not to create activity without a clear question.',
    deliverables: [
      { title: 'Feasibility record', body: 'Known facts, assumptions, risks, candidate paths and unresolved questions.' },
      { title: 'Architecture decision', body: 'A bounded technical direction with interfaces and reasons made visible.' },
      { title: 'Focused proof or prototype', body: 'Only enough implementation to test the agreed uncertainty.' },
      { title: 'Assessment or recovery plan', body: 'A prioritized view of what can be retained, repaired, replaced or deferred.' },
      { title: 'Iteration & handover context', body: 'Evidence, limitations, sources and recommended next decisions as scoped.' },
    ],
    faqs: [
      { question: 'Can every idea become a product?', answer: 'No. Feasibility work exists to reveal technical, safety, cost, ownership or operational limits before larger commitment.' },
      { question: 'Will you rescue any unfinished prototype?', answer: 'No blanket promise is responsible. OTONOM can assess the available hardware, code and evidence, then recommend repair, partial reuse or rebuild.' },
      { question: 'What should I bring for an existing project?', answer: 'Available source, design files, versions, ownership information, test results, observed defects and known constraints are useful.' },
      { question: 'Can you add one capability to a mature system?', answer: 'Potentially. Compatibility, regression risk, interfaces and safe release options must be reviewed first.' },
      { question: 'Do you work with individuals and companies?', answer: 'Yes. The starting point is the project question and evidence, not the size of the requester.' },
    ],
    related: [
      { title: 'Software Engineering', body: 'Continue into web, mobile, backend or systems-integration delivery.', href: '/services/software-engineering', label: 'Explore software engineering' },
      { title: 'IoT & Embedded Engineering', body: 'Continue into electronics, firmware, sensors or connected-device work.', href: '/services/iot-embedded', label: 'Explore embedded engineering' },
      { title: 'Engineering process', body: 'See how discovery, framing, verification and handover connect.', href: '/engineering-process', label: 'View the process' },
    ],
    ctaTitle: 'Have a half-built project? Start with what exists.',
    ctaBody: 'Bring the current artifacts, observed behavior and the decision you need—not a polished story.',
    ctaLabel: 'Continue my project',
  },
  'services/smart-home-automation': {
    path: 'services/smart-home-automation', productProof: true,
    eyebrow: 'Smart Home & Automation',
    title: 'Automation planned around the space and how people use it.',
    summary: 'OTONOM frames controls, scenes and integrations as an engineering service for individuals and eligible business or property projects, with product and installation choices reviewed for the actual site.',
    note: 'Compatibility, electrical design, installation scope, remote or voice features and delivery capacity are confirmed only from approved product evidence and project review.',
    capabilitiesTitle: 'A service-led automation scope',
    capabilitiesIntro: 'The objective is a clear operating experience—not a catalogue-first decision.',
    capabilities: [
      { id: 'discovery', title: 'Space & needs discovery', body: 'Understand rooms, users, circuits, routines, exceptions and project constraints.' },
      { id: 'scenes', title: 'Controls & scene planning', body: 'Translate supported lighting, curtain or appliance scenarios into clear behavior and control priorities.' },
      { id: 'retrofit', title: 'Retrofit or new-build review', body: 'Assess available infrastructure, access and coordination needs before choosing a direction.' },
      { id: 'integration', title: 'System integration', body: 'Define verified boundaries between controllers, electrical work and any supported software or interfaces.' },
      { id: 'commissioning', title: 'Commissioning context', body: 'Agree checks, documentation and handover expectations appropriate to the approved scope.' },
      { id: 'custom', title: 'Unusual integration assessment', body: 'Route non-standard hardware or software needs through custom engineering before promising compatibility.' },
    ],
    problemsTitle: 'Plan the experience before selecting components',
    problemsIntro: 'Automation choices should follow the space, supported use cases and maintainable operating boundaries.',
    problems: [
      { title: 'Daily control', body: 'Define who controls what, from where and what should happen when connectivity is unavailable.' },
      { title: 'Scenes & schedules', body: 'Describe desired behavior and exceptions before assigning controller logic.' },
      { title: 'Retrofit constraints', body: 'Review the existing electrical and physical context instead of assuming new-build conditions.' },
      { title: 'Project coordination', body: 'Make responsibilities between client, electrical works, automation and software explicit.' },
    ],
    scenariosTitle: 'Illustrative automation use cases',
    scenariosIntro: 'Use cases are subject to controller evidence, site assessment and the agreed delivery policy.',
    scenarios: [
      { title: 'Lighting and scenes', body: 'Plan supported circuits and scene behavior around real room use and manual fallback.' },
      { title: 'Curtain or appliance control', body: 'Evaluate load, interface and safety requirements before including a supported control scenario.' },
      { title: 'Apartment, home or villa planning', body: 'Coordinate rooms, control points and phased decisions for the actual residential scope.' },
      { title: 'Eligible building or property project', body: 'Review repeatability, responsibilities and commissioning expectations before proposing deployment.' },
      { title: 'Custom dashboard or integration', body: 'Assess through Software or Custom Engineering when the requirement goes beyond approved standard behavior.' },
    ],
    ...sharedEn,
    deliverablesTitle: 'Possible automation deliverables',
    deliverablesIntro: 'The confirmed package depends on site evidence, product support and the agreed roles.',
    deliverables: [
      { title: 'Needs & circuit context', body: 'Rooms, users, relevant circuits, scenarios, exceptions and constraints.' },
      { title: 'Control concept', body: 'Reviewed responsibilities, interfaces and supported operating behavior.' },
      { title: 'Product mapping', body: 'Use of verified OTONOM controller information without inventing compatibility or electrical claims.' },
      { title: 'Verification & handover plan', body: 'Agreed checks, documentation and ownership for the approved scope.' },
    ],
    faqs: [
      { question: 'Is this an online shop?', answer: 'No. Public commerce, checkout and payment are disabled. Product pages provide information and the service path begins with review.' },
      { question: 'Can you automate an existing home?', answer: 'Potentially. Retrofit feasibility depends on the existing electrical, physical and operational context and must be assessed.' },
      { question: 'Do you work with individuals and building projects?', answer: 'Yes, subject to project fit and capacity. The scope can begin with a home, apartment or eligible business/property requirement.' },
      { question: 'Are voice, remote and third-party integrations guaranteed?', answer: 'No. Only verified, project-specific compatibility may be confirmed after technical review.' },
      { question: 'Can a custom app or controller integration be added?', answer: 'Potentially, through Software or Custom Engineering after interfaces, safety and support boundaries are assessed.' },
    ],
    related: [
      { title: 'OTONOM controller family', body: 'View the current 4R, 6R and 16R product information and genuine product images.', href: '/products', label: 'Explore products' },
      { title: 'Custom Engineering & R&D', body: 'Assess unusual electronics, firmware or system-integration requirements.', href: '/services/custom-engineering', label: 'Explore custom engineering' },
      { title: 'Software Engineering', body: 'Assess a custom dashboard, backend or mobile requirement.', href: '/services/software-engineering', label: 'Explore software engineering' },
    ],
    ctaTitle: 'Start with the space and the behavior you want.',
    ctaBody: 'Prepare the rooms, current infrastructure, desired scenarios and constraints for a project-specific review.',
    ctaLabel: 'Prepare an automation review',
  },
};

const ar: Record<ServicePath, ServicePageContent> = {
  services: {
    ...en.services,
    eyebrow: 'الخدمات', title: 'تكنولوجيا تُبنى حول تحديك.',
    summary: 'تساعد OTONOM الأفراد والشركات على الانتقال من فكرة أو نموذج أولي أو نظام قائم إلى نتيجة هندسية مُراجعة تشمل البرمجيات والإلكترونيات والأجهزة المتصلة والأتمتة.',
    note: 'يبدأ كل تعاون بالاكتشاف. لا تُؤكد الجدوى أو التوافق أو الجدول أو الشروط التجارية إلا بعد المراجعة الهندسية المناسبة.',
    capabilitiesTitle: 'أربع قدرات برؤية مترابطة', capabilitiesIntro: 'اختر تخصصًا محددًا أو اربط عدة تخصصات عندما تتجاوز النتيجة حدود العتاد والبرمجيات.',
    capabilities: [
      { title: 'هندسة البرمجيات', body: 'أنظمة ويب وموبايل وخلفيات وعمليات تُصمم حول سير عمل أو مشكلة منتج محددة.', href: '/services/software-engineering', label: 'استكشف هندسة البرمجيات' },
      { title: 'إنترنت الأشياء والأنظمة المدمجة', body: 'إلكترونيات وبرمجيات ثابتة واستشعار واتصال ومعمارية تربط الجهاز بالبرمجيات وفق قيود تشغيل مُراجعة.', href: '/services/iot-embedded', label: 'استكشف الأنظمة المدمجة' },
      { title: 'الهندسة المخصصة والنماذج والبحث والتطوير', body: 'دراسة جدوى وإثبات مفهوم واستكمال نموذج وتحسين نظام قائم دون افتراض الإجابة مقدمًا.', href: '/services/custom-engineering', label: 'استكشف الهندسة المخصصة' },
      { title: 'المنازل الذكية والأتمتة', body: 'تخطيط خدمي للتحكم والمشاهد واستخدام وحدات OTONOM وفق مراجعة خاصة بكل مشروع.', href: '/services/smart-home-automation', label: 'استكشف خدمات الأتمتة' },
    ],
    problemsTitle: 'اختر حسب النتيجة التي تحتاجها', problemsIntro: 'لا تحتاج لمعرفة اسم التقنية. ابدأ بأقرب هدف واقعي.',
    problems: [
      { title: 'إنشاء منتج رقمي', body: 'تطبيق أو منصة أو سير عمل أو واجهة لجهاز متصل.', href: '/services/software-engineering#capabilities', label: 'شاهد مسارات البرمجيات' },
      { title: 'إنشاء جهاز متصل', body: 'وحدة تحكم أو منظومة حساسات أو إثبات مفهوم إلكتروني بحدود برمجية واضحة.', href: '/services/iot-embedded#capabilities', label: 'شاهد مسارات الأنظمة المدمجة' },
      { title: 'استكمال أو تقييم نموذج أولي', body: 'راجع العتاد أو البرامج الثابتة أو الكود غير المكتمل قبل قرار الإبقاء أو إعادة البناء.', href: '/services/custom-engineering#prototype-rescue', label: 'شاهد إنقاذ النموذج' },
      { title: 'تحسين نظام قائم', body: 'افحص توسعة أو تكاملًا أو مشكلة اعتمادية أو مسار تحديث.', href: '/services/custom-engineering#existing-system', label: 'شاهد تحسين الأنظمة' },
      { title: 'تخطيط مساحة مؤتمتة', body: 'حوّل طريقة عمل المنزل أو المبنى المناسب إلى نطاق تحكم مُراجع.', href: '/services/smart-home-automation#use-cases', label: 'شاهد خدمات الأتمتة' },
    ],
    scenariosTitle: 'أمثلة لنقاط بداية', scenariosIntro: 'هذه مواقف توضيحية وليست ادعاءات عن مشاريع عملاء منفذة.',
    scenarios: [
      { title: 'فرد لديه فكرة تطبيق', body: 'تحديد المستخدمين وسير العمل الأساسي وأصغر تحقق مفيد قبل اختيار التنفيذ.' },
      { title: 'شركة تستخدم أدوات منفصلة', body: 'رسم العملية الحالية وتقييم التكامل أو برمجيات سير العمل أو التحديث.' },
      { title: 'صاحب مشروع لديه جهاز غير مكتمل', body: 'مراجعة الإلكترونيات والبرمجيات والمصادر والاعتماديات وأدلة الاختبار قبل التوصية.' },
      { title: 'مالك منزل يخطط للأتمتة', body: 'توضيح الغرف والدوائر والمشاهد والقيود قبل قرارات المنتج أو التركيب.' },
    ],
    ...sharedAr,
    deliverablesTitle: 'ما قد ينتجه التعاون', deliverablesIntro: 'تُختار المخرجات وتُتفق للمشروع الفعلي؛ ولا يشمل أي تعاون كل الطبقات تلقائيًا.',
    deliverables: [
      { title: 'متطلبات وسجل قرارات', body: 'تعريف مشترك للمستخدمين والقيود والافتراضات والواجهات ومعايير القبول.' },
      { title: 'معمارية أو نموذج', body: 'اتجاه تقني محدد أو إثبات مركز للإجابة عن سؤال متفق عليه.' },
      { title: 'عناصر نظام منفذة', body: 'البرمجيات أو البرامج الثابتة أو الإلكترونيات أو التكامل المتفق عليه مع تحقق مناسب.' },
      { title: 'سياق التحقق والتسليم', body: 'الأدلة والقيود والمصادر ووثائق التشغيل حسب النطاق.' },
    ],
    faqs: [
      { question: 'هل تعملون مع الأفراد والشركات؟', answer: 'نعم. تبدأ المراجعة من المشكلة والمرحلة الحالية سواء كان صاحبها فردًا أو مؤسسًا أو فريقًا أو مؤسسة.' },
      { question: 'هل أحتاج إلى موجز تقني؟', answer: 'لا. يكفي وصف النتيجة والمستخدمين والوضع الحالي والقيود المعروفة بلغة بسيطة كبداية.' },
      { question: 'هل يمكن أن تنضم OTONOM إلى مشروع قائم؟', answer: 'قد يكون ذلك ممكنًا بعد تقييم المصادر والعتاد والوثائق والحقوق والاعتماديات والمخاطر.' },
      { question: 'هل يمكن دمج العتاد والبرمجيات؟', answer: 'نعم عندما يحتاج الحل المُراجع إليهما، لكن ليس كل مشروع بحاجة لكل الطبقات.' },
      { question: 'كيف تتحدد الجدوى والنطاق والتسعير؟', answer: 'بعد الاكتشاف والمراجعة التقنية؛ ولا يقدم هذا الموقع عرض سعر آليًا أو ضمانًا للجدوى.' },
    ],
    related: [
      { title: 'العملية الهندسية', body: 'اعرف كيف تنتقل القرارات من الاكتشاف إلى التحقق والتسليم.', href: '/engineering-process', label: 'شاهد العملية' },
      { title: 'ابدأ مشروعك', body: 'اختر أقرب مرحلة وجهّز سياقًا مفيدًا دون إرسال بيانات شخصية هنا.', href: '/build-with-us', label: 'اختر نقطة البداية' },
      { title: 'منتجات OTONOM القائمة', body: 'شاهد عائلة وحدات 4R و6R و16R بمعلومات تراعي الأدلة.', href: '/products', label: 'استكشف المنتجات' },
    ],
    ctaTitle: 'أحضر التحدي، لا مواصفات مثالية.', ctaBody: 'اختر المرحلة الأقرب لمشروعك وجهّز سياق أول مراجعة مسؤولة.', ctaLabel: 'ابدأ بمشروعك',
  },
  'services/software-engineering': {
    ...en['services/software-engineering'], ...sharedAr,
    eyebrow: 'هندسة البرمجيات', title: 'برمجيات مخصصة تُبنى حول العمل الذي يجب أن تدعمه.',
    summary: 'تعمل OTONOM مع الأفراد والمؤسسين والمؤسسات على منتجات رقمية جديدة وعلى برمجيات قائمة تحتاج تقييمًا أو توسعة أو تكاملًا أو تحديثًا.',
    note: 'يتحدد نوع النظام والمعمارية والتكاملات والجدول ونطاق التسليم بعد مراجعة المستخدمين والبيانات والأصول الحالية والقيود.',
    capabilitiesTitle: 'ما يمكننا هندسته', capabilitiesIntro: 'تُحدد كل قدرة لمشكلة معينة. القائمة تصف أعمالًا ممكنة ولا تدّعي تنفيذ كل نوع من الأنظمة سابقًا.',
    capabilities: [
      { id: 'web-apps', title: 'مواقع وتطبيقات ويب', body: 'تجارب عامة وأدوات محمية وتطبيقات سير عمل بنموذج مناسب للمحتوى والبيانات والأمان.' },
      { id: 'mobile', title: 'تطبيقات موبايل', body: 'تجارب منتجات وتطبيقات مرافقة للأجهزة مع اختيار المنصة حسب المستخدم ودورة الحياة.' },
      { id: 'erp-crm', title: 'عمليات شبيهة بـ ERP ومسارات CRM', body: 'سير عمل مخصص للسجلات والصلاحيات والتسليمات والتقارير بعد فهم العملية الفعلية.' },
      { id: 'saas', title: 'منصات وخدمات SaaS', body: 'أساس متعدد المستخدمين وحدود حسابات وتسليم منضبط عندما يتطلب نموذج العمل ذلك.' },
      { id: 'apis', title: 'واجهات API وتكامل أنظمة', body: 'واجهات مُراجعة بين الأدوات أو الخدمات أو الأجهزة مع وضوح الملكية وحدود الفشل.' },
      { id: 'analytics', title: 'لوحات بيانات وتحليلات', body: 'واجهات تركّز على القرار وتراعي جودة البيانات والصلاحيات وحدود التفسير.' },
      { id: 'modernization', title: 'تحديث البرمجيات', body: 'إصلاح أو توسعة أو استبدال يقوده تقييم للكود القائم واعتمادياته.' },
      { id: 'automation', title: 'أتمتة سير العمل', body: 'تقليل الأعمال المتكررة بقواعد منضبطة دون إخفاء المسؤولية أو الاستثناءات.' },
    ],
    problemsTitle: 'مشكلات يمكن أن تعالجها البرمجيات', problemsIntro: 'يأتي الاختيار الهندسي بعد فهم سير العمل والدليل، لا بعد اسم تقنية رائج.',
    problems: [
      { title: 'عمل يدوي ومجزأ', body: 'نفهم أين تتكرر المعلومات أو تضيع أو تتأخر قبل قرار ما يجب أتمتته.' },
      { title: 'أنظمة غير مترابطة', body: 'نراجع الواجهات والملكية ومعنى البيانات والتعامل مع الفشل قبل التكامل.' },
      { title: 'برنامج قديم يحتاج تغييرًا', body: 'نقيّم الكود والتشغيل والبيانات والاختبارات والمخاطر قبل الإصلاح أو التحديث.' },
      { title: 'برنامج يعمل مع جهاز', body: 'نحدد الحدود بين البرنامج الثابت والاتصال والخلفية واللوحة وتجربة الموبايل.' },
    ],
    scenariosTitle: 'سيناريوهات مشروعات توضيحية', scenariosIntro: 'الأمثلة توضح الملاءمة وليست دراسات حالة منفذة.',
    scenarios: [
      { title: 'فرد لديه فكرة تطبيق', body: 'توضيح رحلة المستخدم والقيمة الأساسية والبيانات وأصغر تحقق قبل البناء الكامل.' },
      { title: 'شركة صغيرة تطور المخزون والمبيعات', body: 'رسم الأدوار والسجلات والاستثناءات والتقارير قبل تصميم سير عمل تشغيلي.' },
      { title: 'مؤسس لديه تطبيق موبايل نصف مكتمل', body: 'مراجعة الكود والملكية والاعتماديات والخلفية وحالة الإصدار قبل قرار الاستكمال.' },
      { title: 'شركة توسع نظامًا قائمًا', body: 'تحديد واجهات التكامل ومخاطر الانحدار وضوابط الإصدار المرحلي.' },
      { title: 'صاحب جهاز متصل يحتاج لوحة', body: 'مواءمة القياسات وهوية الجهاز والاحتفاظ بالبيانات وأفعال المستخدم.' },
    ],
    deliverablesTitle: 'مخرجات برمجية معتادة', deliverablesIntro: 'قد يشمل النطاق المتفق بعض هذه العناصر حسب مرحلة المشروع والمسؤوليات.',
    deliverables: [
      { title: 'اكتشاف ومواصفات', body: 'رحلات المستخدم والحدود الوظيفية والمخاطر والبيانات ومعايير القبول.' },
      { title: 'تجربة وواجهة', body: 'معمارية معلومات وسلوك واجهة قابل للوصول عندما يكون ضمن النطاق.' },
      { title: 'بيانات وخلفية وواجهات', body: 'نماذج وخدمات وصلاحيات وتكاملات مناسبة للنظام.' },
      { title: 'تنفيذ ويب أو موبايل', body: 'المنتج المتفق عليه مع الاختبارات وإصدار منضبط.' },
      { title: 'تحقق وتسليم', body: 'أدلة اختبار وقيود معروفة ومصادر ووثائق تشغيل حسب الاتفاق.' },
    ],
    faqs: [
      { question: 'هل يمكنكم استلام مشروع برمجي قائم؟', answer: 'قد يكون ذلك ممكنًا بعد مراجعة الوصول والملكية والمعمارية والاعتماديات والبيانات والأمان وأدلة الاختبار.' },
      { question: 'هل تعملون مع الأفراد؟', answer: 'نعم. يمكن للأفراد والمؤسسين والمؤسسات البدء بمشكلة أو فكرة أو منتج قائم.' },
      { question: 'هل أحتاج موجزًا تقنيًا؟', answer: 'لا. ابدأ بالمستخدمين والنتيجة وسير العمل الحالي والقيود، ثم تأتي الصياغة التقنية.' },
      { question: 'هل يمكن دمج البرمجيات مع العتاد؟', answer: 'نعم عندما تحتاج المعمارية إلى برنامج ثابت أو اتصال أو خلفية أو تطبيق، وتُحدد كل واجهة بوضوح.' },
      { question: 'كيف يتحدد النطاق والسعر؟', answer: 'بعد اكتشاف المتطلبات والأصول والمخاطر الفعلية. لا ينتج الموقع عرضًا آليًا أو تقديرًا مضمونًا.' },
    ],
    related: [
      { title: 'إنترنت الأشياء والأنظمة المدمجة', body: 'اربط البرمجيات بالإلكترونيات والبرامج الثابتة والاستشعار والاتصال.', href: '/services/iot-embedded', label: 'استكشف هندسة الأجهزة المتصلة' },
      { title: 'الهندسة المخصصة والبحث والتطوير', body: 'قيّم فكرة مبكرة أو نموذجًا غير مكتمل أو سؤال تحديث.', href: '/services/custom-engineering', label: 'استكشف النماذج والبحث' },
      { title: 'العملية الهندسية', body: 'شاهد كيف تُراجع مراحل النطاق والتنفيذ ودليل الإصدار.', href: '/engineering-process', label: 'شاهد العملية' },
    ],
    ctaTitle: 'ابدأ بمشكلة سير العمل أو المنتج.', ctaBody: 'اشرح من يحتاج النظام وما الذي يجب أن يصبح ممكنًا وما البرمجيات أو القيود الموجودة.', ctaLabel: 'حضّر مراجعة برمجية',
  },
  'services/iot-embedded': {
    ...en['services/iot-embedded'], ...sharedAr,
    eyebrow: 'إنترنت الأشياء والأنظمة المدمجة', title: 'إلكترونيات متصلة تُهندس من المتطلبات أو من نموذج قائم.',
    summary: 'يمكن لـ OTONOM تحديد نطاق الإلكترونيات والبرامج الثابتة والاستشعار واتصال الأجهزة والبرمجيات المحيطة بالنظام مع إبقاء المسؤوليات المادية والرقمية واضحة.',
    note: 'اختيار المكونات والحدود الكهربائية والاتصال والاعتماد والتصنيع والملاءمة الميدانية تحتاج دليلًا خاصًا بالمشروع ولا يفترضها هذا الموقع.',
    capabilitiesTitle: 'طبقات المنتج المتصل', capabilitiesIntro: 'قد يحتاج المشروع طبقة واحدة أو عدة طبقات. تُراجع الواجهات وقيود التشغيل قبل التنفيذ.',
    capabilities: [
      { id: 'electronics-pcb', title: 'الإلكترونيات وتصميم PCB', body: 'دوائر وقرارات مكونات ومخططات ولوحات تقودها المتطلبات عندما تكون ضمن النموذج المتفق.' },
      { id: 'firmware', title: 'البرامج الثابتة', body: 'منطق التحكم والحالات والواجهات والتشخيص حول سلوك الجهاز الفعلي.' },
      { id: 'sensors', title: 'الحساسات وجمع البيانات', body: 'قرارات الإشارة وأخذ العينات وجودة البيانات حسب البيئة والتفسير المطلوب.' },
      { id: 'controllers', title: 'وحدات التحكم والبوابات', body: 'مسؤوليات واضحة بين التحكم المحلي والأجهزة المتصلة والأنظمة الأوسع.' },
      { id: 'connectivity', title: 'الاتصال المحلي واللاسلكي', body: 'اختيار بروتوكول وبنية بعد فهم المدى والطاقة والأمان والتوافق ودورة الحياة.' },
      { id: 'telemetry', title: 'القياسات والمراقبة', body: 'مسارات بيانات وتنبيهات وقابلية ملاحظة مع وضوح الملكية وحالات الفشل.' },
      { id: 'platforms', title: 'منصات ولوحات وتطبيقات', body: 'خلفيات وتجارب مستخدم للنظام المتصل عندما تكون طبقات البرمجيات ضمن النطاق.' },
      { id: 'validation', title: 'التشخيص والتحقق من النموذج', body: 'اختبارات مركزة تحدد ما يثبته النموذج وما لا يزال غير مؤكد.' },
    ],
    problemsTitle: 'معمارية من الإشارة المادية إلى المستخدم', problemsIntro: 'قد يمر التصور من حساس أو دخل إلى لوحة ووحدة تحكم وبرنامج ثابت ثم اتصال اختياري أو بوابة وخلفية ولوحة أو موبايل ثم تحقق. المسار ليس إلزاميًا ولا خطيًا دائمًا.',
    problems: [
      { title: 'الدخل المادي', body: 'تحديد ما يُقاس أو يُتحكم فيه والافتراضات البيئية المحيطة.' },
      { title: 'الإلكترونيات والتحكم', body: 'توزيع مسؤوليات الطاقة والمعالجة والواجهات والحماية بناء على الدليل.' },
      { title: 'البرنامج الثابت والاتصال', body: 'تنسيق السلوك المحلي والحالات والاتصالات والتعافي من الفشل.' },
      { title: 'الخلفية والتجربة', body: 'إظهار البيانات والتحكم المطلوبين فقط في اللوحة أو تطبيق الموبايل المعتمد.' },
      { title: 'التحقق', body: 'اختبار السلوك المتفق وتوثيق الحدود قبل قرارات التوسع.' },
    ],
    scenariosTitle: 'سيناريوهات توضيحية لأنظمة متصلة', scenariosIntro: 'هذه أمثلة لأشكال مشكلات ممكنة وليست مشروعات عملاء منفذة.',
    scenarios: [
      { title: 'مراقبة حساسات مخصصة', body: 'استكشاف الاستشعار وأخذ العينات والسلوك المحلي وطريقة وصول القراءات للمستخدم.' },
      { title: 'أتمتة بوحدة تحكم', body: 'تحديد المداخل والمخارج وانتقالات الحالة وحدود التشغيل الآمن.' },
      { title: 'لوحة قياسات', body: 'ربط رسائل الجهاز المُراجعة بنموذج بيانات وتنبيهات وواجهة مشغل.' },
      { title: 'تطبيق مرافق لعتاد', body: 'تنسيق هوية الجهاز والاتصال والصلاحيات وتجربة الموبايل.' },
      { title: 'إثبات مفهوم لمنتج متصل', body: 'بناء أصغر معمارية لاختبار أخطر افتراض تقني.' },
    ],
    deliverablesTitle: 'مخرجات مدمجة محتملة', deliverablesIntro: 'تتوقف العناصر الدقيقة على المرحلة وسياق السلامة ومسؤوليات الملكية.',
    deliverables: [
      { title: 'متطلبات وواجهات', body: 'سياق التشغيل والمسؤوليات والقيود ومعايير التحقق.' },
      { title: 'مخططات أو تصميم لوحة', body: 'عناصر إلكترونية مُراجعة عندما تكون أعمال اللوحات ضمن النطاق.' },
      { title: 'برنامج ثابت ومصدر', body: 'السلوك والواجهات والتشخيص المتفق مع شروط تسليم المصدر.' },
      { title: 'نموذج وسجل اختبار', body: 'بناء مركز ودليل يوضح ما اختُبر ونجح أو بقي غير مؤكد.' },
      { title: 'توثيق التكامل', body: 'رسائل وواجهات وملكية وافتراضات تشغيل لطبقات البرمجيات المتصلة.' },
    ],
    faqs: [
      { question: 'هل يمكن البدء من مخطط أو PCB أو برنامج ثابت قائم؟', answer: 'قد يكون ذلك ممكنًا بعد مراجعة الملكية والملفات والاعتماديات وتاريخ الاختبار والمكونات والقيود.' },
      { question: 'هل يمكنكم استكمال نموذج يفشل؟', answer: 'يمكن تقييمه، لكن لا يمكن وعد إنقاذ كل نموذج. تحدد المراجعة ما إذا كان الإصلاح أو إعادة الاستخدام الجزئي أو إعادة البناء مسؤولًا.' },
      { question: 'هل يحتاج كل مشروع IoT إلى السحابة؟', answer: 'لا. بعض الأنظمة محلية وبعضها يستخدم بوابة وبعضها يحتاج خلفية أو تطبيقًا.' },
      { question: 'هل تضمنون الاعتماد أو الجاهزية للتصنيع؟', answer: 'لا. الاعتماد والاختبار المعملي وحجم الإنتاج والتصنيع تحتاج أدلة واتفاقًا منفصلًا.' },
      { question: 'هل يمكن لفرد إحضار فكرة جهاز؟', answer: 'نعم. يمكن للأفراد والشركات البدء بفكرة أو نموذج أو منظومة أجهزة قائمة.' },
    ],
    related: [
      { title: 'هندسة البرمجيات', body: 'ابنِ الخلفية أو اللوحة أو الموبايل أو التكامل حول الجهاز.', href: '/services/software-engineering', label: 'استكشف هندسة البرمجيات' },
      { title: 'الهندسة المخصصة والبحث والتطوير', body: 'اختبر الجدوى أو راجع نموذج عتاد وبرمجيات غير مكتمل.', href: '/services/custom-engineering', label: 'استكشف النماذج والبحث' },
      { title: 'المنازل الذكية والأتمتة', body: 'طبّق هندسة تحكم وأتمتة مُراجعة على المساحات المناسبة.', href: '/services/smart-home-automation', label: 'استكشف خدمات الأتمتة' },
    ],
    ctaTitle: 'ابدأ بالجهاز والبيئة والقرار الذي تحتاجه.', ctaBody: 'أحضر الملفات الحالية والسلوك المعروف والقيود والدليل المتاح في مرحلتك.', ctaLabel: 'حضّر مراجعة للأنظمة المدمجة',
  },
  'services/custom-engineering': {
    ...en['services/custom-engineering'], ...sharedAr,
    eyebrow: 'الهندسة المخصصة والنماذج والبحث والتطوير', title: 'لا يجب أن يبدأ مشروعك من الصفر.',
    summary: 'تساعد OTONOM الأفراد والشركات على فحص أفكار جديدة وتقييم نماذج غير مكتملة وتحسين أنظمة عتاد وبرمجيات قائمة بهندسة محددة تقودها الأدلة.',
    note: 'يقلل عمل الجدوى عدم اليقين؛ ولا يضمن صلاحية كل فكرة أو أن استكمال كل نموذج هو القرار الصحيح.',
    capabilitiesTitle: 'ثلاث رحلات للمشروع', capabilitiesIntro: 'اختر الرحلة الأقرب لحالة العمل اليوم. قد تعيد المراجعة الأولى توجيه المشروع عندما يدعم الدليل مسارًا أبسط أو أكثر أمانًا.',
    capabilities: [
      { id: 'idea-to-prototype', title: 'فكرة ← نموذج أولي', body: 'استكشاف الحاجة والقيود وأخطر الافتراضات قبل اختيار المكونات أو معمارية البرمجيات.' },
      { id: 'prototype-rescue', title: 'استكمال أو إنقاذ نموذج', body: 'تقييم العتاد والبرنامج الثابت والكود والعيوب والاعتماديات قبل قرار الإصلاح أو الاستكمال أو إعادة البناء.' },
      { id: 'existing-system', title: 'تحسين أو تحديث نظام قائم', body: 'تخطيط تكاملات أو ميزات أو تحسين اعتمادية أو ترقيات دون تجاهل التشغيل الحالي.' },
    ],
    problemsTitle: 'الأسئلة متعددة التخصصات تحتاج حدودًا واضحة', problemsIntro: 'قد يجمع النظام الإلكترونيات والبرنامج الثابت والاتصال والخلفية والواجهات. تُظهر المراجعة مسؤوليات كل حد واختباره.',
    problems: [
      { title: 'جدوى قبل الالتزام', body: 'حدد الافتراض الذي قد يبطل الاتجاه وطريقة مركزة لاختباره.' },
      { title: 'حالة نموذج غير معروفة', body: 'افصل العيوب المرصودة عن نقص الدليل والسلوك غير الموثق والاعتماديات الخارجية.' },
      { title: 'تغيير دون كسر التشغيل', body: 'ارسم النظام القائم وخطط تحققًا مرحليًا قبل ترقية أو تكامل.' },
      { title: 'التقاء العتاد والبرمجيات', body: 'حدد حدود البيانات والتحكم والتوقيت والأخطاء والأمان عبر الطبقات.' },
    ],
    scenariosTitle: 'مواقف هندسة مخصصة توضيحية', scenariosIntro: 'الأمثلة افتراضية وتشرح أسلوب التقييم ولا تضمن التسليم.',
    scenarios: [
      { title: 'تصور منتج متصل جديد', body: 'تحويل القصد الواسع إلى متطلبات ومعمارية وأصغر إثبات مسؤول.' },
      { title: 'نموذج يفشل بشكل متقطع', body: 'مراجعة التصميم والبرنامج الثابت وإعداد الاختبار والسلوك قبل مسار التحقيق.' },
      { title: 'منظومة كود وجهاز موروثة', body: 'تثبيت الملكية والإصدارات والواجهات ومخاطر التشغيل قبل التغيير.' },
      { title: 'وحدة تحكم قديمة تحتاج واجهة حديثة', body: 'تقييم التوافق والتكامل المرحلي بدل افتراض الاستبدال الآمن.' },
    ],
    journeys: [
      { title: 'فكرة ← نموذج أولي', body: 'ابدأ بالمشكلة والمستخدمين والبيئة والقيود، ثم قارن الاتجاهات وحدد ما يجب أن يثبته النموذج.', review: 'قد نراجع المتطلبات وافتراضات الجدوى واختيارات المكونات أو المنصة والواجهات وسياق السلامة والمعمارية.', deliverables: 'قد تشمل المخرجات مذكرة جدوى أو متطلبات أو تصور معمارية أو خطة تجربة أو إثبات مفهوم مركز.', href: '/build-with-us#idea', label: 'حضّر مراجعة الفكرة' },
      { title: 'استكمال أو إنقاذ نموذج', body: 'ابدأ بالحالة الحالية دون إخفاء العمل غير المكتمل؛ والهدف قرار صادق بالاستمرار أو التغيير أو إعادة البناء.', review: 'قد نراجع العتاد والبرنامج الثابت والكود والمخططات والاختبارات والعيوب والتراخيص والملكية والسلامة.', deliverables: 'قد تشمل المخرجات تدقيقًا وخريطة عيوب وخطة استعادة أو مكونًا مُصلحًا أو توصية مبررة بإعادة البناء.', href: '/build-with-us#prototype', label: 'استكمل مشروعًا نصف مبني' },
      { title: 'تحسين أو تحديث نظام قائم', body: 'احمِ التشغيل الحالي أثناء فحص ميزة أو تكامل أو مشكلة اعتمادية أو ترقية.', review: 'قد نراجع المعمارية والواجهات والبيانات والاعتماديات والفشل والأداء والأمان وضوابط الإصدار.', deliverables: 'قد تشمل المخرجات خطة ترقية أو مواصفة تكامل أو تنفيذًا مرحليًا أو سجل تحقق أو حزمة تسليم.', href: '/build-with-us#existing-system', label: 'حضّر مراجعة النظام' },
    ],
    deliverablesTitle: 'الدليل قبل التوسع', deliverablesIntro: 'تُختار مخرجات البحث والتطوير لدعم قرار، لا لصناعة نشاط بلا سؤال واضح.',
    deliverables: [
      { title: 'سجل جدوى', body: 'حقائق وافتراضات ومخاطر ومسارات محتملة وأسئلة غير محسومة.' },
      { title: 'قرار معماري', body: 'اتجاه تقني محدد بواجهات وأسباب مرئية.' },
      { title: 'إثبات أو نموذج مركز', body: 'تنفيذ يكفي فقط لاختبار نقطة عدم اليقين المتفق عليها.' },
      { title: 'تقييم أو خطة استعادة', body: 'أولوية لما يمكن الإبقاء عليه أو إصلاحه أو استبداله أو تأجيله.' },
      { title: 'سياق تكرار وتسليم', body: 'أدلة وقيود ومصادر وقرارات تالية موصى بها حسب النطاق.' },
    ],
    faqs: [
      { question: 'هل يمكن أن تصبح كل فكرة منتجًا؟', answer: 'لا. يكشف عمل الجدوى الحدود التقنية أو الأمنية أو التشغيلية أو المتعلقة بالملكية قبل التزام أكبر.' },
      { question: 'هل تنقذون أي نموذج غير مكتمل؟', answer: 'لا يوجد وعد مسؤول بذلك. يمكن تقييم العتاد والكود والدليل ثم التوصية بإصلاح أو إعادة استخدام جزئي أو بناء جديد.' },
      { question: 'ماذا أحضر لمشروع قائم؟', answer: 'المصادر والتصميمات والإصدارات والملكية ونتائج الاختبار والعيوب والقيود المعروفة مفيدة.' },
      { question: 'هل يمكن إضافة قدرة واحدة لنظام ناضج؟', answer: 'قد يكون ذلك ممكنًا بعد مراجعة التوافق ومخاطر الانحدار والواجهات وخيارات الإصدار الآمن.' },
      { question: 'هل تعملون مع الأفراد والشركات؟', answer: 'نعم. نقطة البداية هي سؤال المشروع ودليله، لا حجم صاحبه.' },
    ],
    related: [
      { title: 'هندسة البرمجيات', body: 'انتقل إلى تنفيذ ويب أو موبايل أو خلفية أو تكامل أنظمة.', href: '/services/software-engineering', label: 'استكشف هندسة البرمجيات' },
      { title: 'إنترنت الأشياء والأنظمة المدمجة', body: 'انتقل إلى الإلكترونيات والبرنامج الثابت والحساسات والأجهزة المتصلة.', href: '/services/iot-embedded', label: 'استكشف هندسة الأنظمة المدمجة' },
      { title: 'العملية الهندسية', body: 'شاهد ترابط الاكتشاف وتحديد الإطار والتحقق والتسليم.', href: '/engineering-process', label: 'شاهد العملية' },
    ],
    ctaTitle: 'لديك مشروع نصف مبني؟ ابدأ بما هو موجود.', ctaBody: 'أحضر العناصر الحالية والسلوك المرصود والقرار الذي تحتاجه، لا قصة مصقولة.', ctaLabel: 'استكمل مشروعي',
  },
  'services/smart-home-automation': {
    ...en['services/smart-home-automation'], ...sharedAr, productProof: true,
    eyebrow: 'المنازل الذكية والأتمتة', title: 'أتمتة تُخطط حول المكان وطريقة استخدام الناس له.',
    summary: 'تصيغ OTONOM التحكم والمشاهد والتكاملات كخدمة هندسية للأفراد ولمشروعات الأعمال أو العقارات المناسبة، مع مراجعة اختيارات المنتج والتركيب للموقع الفعلي.',
    note: 'لا تُؤكد التوافقات والتصميم الكهربائي ونطاق التركيب والميزات البعيدة أو الصوتية والقدرة على التسليم إلا من دليل منتج معتمد ومراجعة المشروع.',
    capabilitiesTitle: 'نطاق أتمتة تقوده الخدمة', capabilitiesIntro: 'الهدف تجربة تشغيل واضحة، لا قرار يبدأ من الكتالوج.',
    capabilities: [
      { id: 'discovery', title: 'اكتشاف المكان والاحتياجات', body: 'فهم الغرف والمستخدمين والدوائر والروتين والاستثناءات وقيود المشروع.' },
      { id: 'scenes', title: 'تخطيط التحكم والمشاهد', body: 'تحويل سيناريوهات الإضاءة أو الستائر أو الأجهزة المدعومة إلى سلوك وأولويات واضحة.' },
      { id: 'retrofit', title: 'مراجعة التعديل أو البناء الجديد', body: 'تقييم البنية المتاحة والوصول والتنسيق قبل اختيار الاتجاه.' },
      { id: 'integration', title: 'تكامل النظام', body: 'تحديد الحدود المؤكدة بين وحدات التحكم والأعمال الكهربائية والبرمجيات المدعومة.' },
      { id: 'commissioning', title: 'سياق التشغيل والتسليم', body: 'الاتفاق على الفحوصات والوثائق والتوقعات المناسبة للنطاق المعتمد.' },
      { id: 'custom', title: 'تقييم تكامل غير معتاد', body: 'تمرير العتاد أو البرمجيات غير القياسية إلى الهندسة المخصصة قبل وعد التوافق.' },
    ],
    problemsTitle: 'خطط للتجربة قبل اختيار المكونات', problemsIntro: 'يجب أن تتبع قرارات الأتمتة المكان وحالات الاستخدام المدعومة وحدود التشغيل القابلة للصيانة.',
    problems: [
      { title: 'التحكم اليومي', body: 'حدد من يتحكم في ماذا ومن أين وما الذي يحدث عند غياب الاتصال.' },
      { title: 'المشاهد والجداول', body: 'صف السلوك والاستثناءات قبل تعيين منطق وحدة التحكم.' },
      { title: 'قيود التعديل', body: 'راجع السياق الكهربائي والمادي القائم بدل افتراض ظروف بناء جديد.' },
      { title: 'تنسيق المشروع', body: 'أظهر مسؤوليات العميل والأعمال الكهربائية والأتمتة والبرمجيات.' },
    ],
    scenariosTitle: 'حالات استخدام توضيحية للأتمتة', scenariosIntro: 'تخضع الاستخدامات لدليل وحدة التحكم وتقييم الموقع وسياسة التسليم المتفق عليها.',
    scenarios: [
      { title: 'الإضاءة والمشاهد', body: 'تخطيط الدوائر والسلوك المدعوم حول الاستخدام الفعلي وإمكانية التحكم اليدوي.' },
      { title: 'الستائر أو الأجهزة', body: 'تقييم الحمل والواجهة والسلامة قبل إضافة سيناريو تحكم مدعوم.' },
      { title: 'تخطيط شقة أو منزل أو فيلا', body: 'تنسيق الغرف ونقاط التحكم والقرارات المرحلية للنطاق السكني الفعلي.' },
      { title: 'مشروع مبنى أو عقار مناسب', body: 'مراجعة التكرار والمسؤوليات وتوقعات التشغيل قبل اقتراح النشر.' },
      { title: 'لوحة أو تكامل مخصص', body: 'تقييمه عبر البرمجيات أو الهندسة المخصصة عندما يتجاوز السلوك القياسي المعتمد.' },
    ],
    deliverablesTitle: 'مخرجات أتمتة محتملة', deliverablesIntro: 'تتوقف الحزمة على دليل الموقع ودعم المنتج والأدوار المتفق عليها.',
    deliverables: [
      { title: 'سياق الاحتياجات والدوائر', body: 'الغرف والمستخدمون والدوائر والمشاهد والاستثناءات والقيود.' },
      { title: 'تصور تحكم', body: 'مسؤوليات وواجهات وسلوك تشغيل مدعوم تمت مراجعته.' },
      { title: 'مواءمة المنتجات', body: 'استخدام معلومات وحدات OTONOM المؤكدة دون اختلاق ادعاءات كهربائية أو توافق.' },
      { title: 'خطة تحقق وتسليم', body: 'فحوصات ووثائق وملكية متفق عليها للنطاق المعتمد.' },
    ],
    faqs: [
      { question: 'هل هذا متجر إلكتروني؟', answer: 'لا. التجارة والدفع وإتمام الشراء العام معطلة. تعرض صفحات المنتجات معلومات ويبدأ مسار الخدمة بالمراجعة.' },
      { question: 'هل يمكن أتمتة منزل قائم؟', answer: 'قد يكون ذلك ممكنًا حسب البنية الكهربائية والمادية والتشغيلية الحالية وبعد تقييمها.' },
      { question: 'هل تعملون مع الأفراد ومشروعات المباني؟', answer: 'نعم حسب ملاءمة المشروع والقدرة المتاحة. يمكن أن يبدأ النطاق بمنزل أو شقة أو مشروع أعمال أو عقار مناسب.' },
      { question: 'هل تكاملات الصوت والتحكم البعيد مضمونة؟', answer: 'لا. لا يؤكد إلا التوافق المثبت والخاص بالمشروع بعد مراجعة تقنية.' },
      { question: 'هل يمكن إضافة تطبيق أو تكامل مخصص؟', answer: 'قد يكون ذلك ممكنًا عبر هندسة البرمجيات أو الهندسة المخصصة بعد تقييم الواجهات والسلامة والدعم.' },
    ],
    related: [
      { title: 'عائلة وحدات OTONOM', body: 'شاهد معلومات 4R و6R و16R وصور المنتجات الحقيقية.', href: '/products', label: 'استكشف المنتجات' },
      { title: 'الهندسة المخصصة والبحث والتطوير', body: 'قيّم متطلبات غير معتادة للإلكترونيات أو البرنامج الثابت أو التكامل.', href: '/services/custom-engineering', label: 'استكشف الهندسة المخصصة' },
      { title: 'هندسة البرمجيات', body: 'قيّم لوحة أو خلفية أو متطلب موبايل مخصص.', href: '/services/software-engineering', label: 'استكشف هندسة البرمجيات' },
    ],
    ctaTitle: 'ابدأ بالمكان والسلوك الذي تريده.', ctaBody: 'حضّر الغرف والبنية الحالية والمشاهد المطلوبة والقيود لمراجعة خاصة بالمشروع.', ctaLabel: 'حضّر مراجعة أتمتة',
  },
};

export function servicePage(locale: Locale, path: string): ServicePageContent | undefined {
  return (locale === 'ar' ? ar : en)[path as ServicePath];
}

export function allServicePages(locale: Locale): ServicePageContent[] {
  return servicePaths.map((path) => servicePage(locale, path)!);
}

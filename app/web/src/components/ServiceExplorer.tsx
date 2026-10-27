'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n.ts';

type Guidance = { label: string; body: string; href: string; cta: string };

const startingPoints: Record<Locale, Guidance[]> = {
  en: [
    { label: 'Create an app or software system', body: 'Start with Software Engineering to frame users, workflows, data and the smallest useful release.', href: '/services/software-engineering', cta: 'Explore Software Engineering' },
    { label: 'Create an electronic or connected device', body: 'Start with IoT & Embedded Engineering to review the physical environment, electronics, firmware and connectivity boundaries.', href: '/services/iot-embedded', cta: 'Explore IoT & Embedded' },
    { label: 'Finish or troubleshoot a prototype', body: 'Start with the Prototype Completion journey. The first step is an assessment, not a promise that every prototype should be rescued.', href: '/services/custom-engineering#prototype-rescue', cta: 'See Prototype Completion' },
    { label: 'Improve or integrate an existing system', body: 'Start with Custom Engineering to map the current system, dependencies and safe change boundaries.', href: '/services/custom-engineering#existing-system', cta: 'See Existing-System Work' },
    { label: 'Automate a home or eligible building', body: 'Start with Smart Home & Automation to describe rooms, circuits, users and supported scenarios before choosing products.', href: '/services/smart-home-automation', cta: 'Explore Automation Services' },
    { label: 'I am not sure what I need', body: 'Use the guided project-start page. Describe the outcome or obstacle in plain language; no technical label is required.', href: '/build-with-us#not-sure', cta: 'Use the Guided Start' },
  ],
  ar: [
    { label: 'إنشاء تطبيق أو نظام برمجي', body: 'ابدأ بهندسة البرمجيات لتحديد المستخدمين وسير العمل والبيانات وأصغر إصدار مفيد.', href: '/services/software-engineering', cta: 'استكشف هندسة البرمجيات' },
    { label: 'إنشاء جهاز إلكتروني أو متصل', body: 'ابدأ بإنترنت الأشياء والأنظمة المدمجة لمراجعة البيئة والإلكترونيات والبرنامج الثابت وحدود الاتصال.', href: '/services/iot-embedded', cta: 'استكشف الأنظمة المدمجة' },
    { label: 'استكمال أو تشخيص نموذج أولي', body: 'ابدأ بمسار استكمال النموذج. الخطوة الأولى تقييم وليست وعدًا بأن إنقاذ كل نموذج هو القرار الصحيح.', href: '/services/custom-engineering#prototype-rescue', cta: 'شاهد استكمال النماذج' },
    { label: 'تحسين أو تكامل نظام قائم', body: 'ابدأ بالهندسة المخصصة لرسم النظام الحالي واعتمادياته وحدود التغيير الآمن.', href: '/services/custom-engineering#existing-system', cta: 'شاهد أعمال الأنظمة القائمة' },
    { label: 'أتمتة منزل أو مبنى مناسب', body: 'ابدأ بالمنازل الذكية والأتمتة لوصف الغرف والدوائر والمستخدمين والسيناريوهات المدعومة قبل اختيار المنتجات.', href: '/services/smart-home-automation', cta: 'استكشف خدمات الأتمتة' },
    { label: 'لست متأكدًا مما أحتاجه', body: 'استخدم صفحة البداية الموجّهة وصف النتيجة أو العائق بلغة بسيطة؛ لا تحتاج إلى اسم تقني.', href: '/build-with-us#not-sure', cta: 'استخدم البداية الموجّهة' },
  ],
};

const layers: Record<Locale, Guidance[]> = {
  en: [
    { label: 'Electronics', body: 'Physical inputs, outputs, power and circuit responsibilities. Included only when the project needs custom hardware.', href: '/services/iot-embedded#electronics-pcb', cta: 'Explore electronics' },
    { label: 'Firmware', body: 'Local device behavior, state handling, interfaces and diagnostics close to the hardware.', href: '/services/iot-embedded#firmware', cta: 'Explore firmware' },
    { label: 'Connectivity', body: 'Optional local, wireless or gateway links selected against range, power, security and lifecycle constraints.', href: '/services/iot-embedded#connectivity', cta: 'Explore connectivity' },
    { label: 'Backend / Cloud', body: 'Services, identity, data and APIs when the system needs shared or remote software capabilities.', href: '/services/software-engineering#apis', cta: 'Explore backend work' },
    { label: 'Web / Mobile', body: 'Accessible user experiences for approved workflows, dashboards or device interactions.', href: '/services/software-engineering#web-apps', cta: 'Explore user applications' },
    { label: 'Verification', body: 'Tests and evidence across interfaces. It is a project layer in its own right, not a final afterthought.', href: '/engineering-process', cta: 'See the verification process' },
  ],
  ar: [
    { label: 'الإلكترونيات', body: 'المداخل والمخارج المادية والطاقة ومسؤوليات الدوائر. لا تُضمّن إلا عندما يحتاج المشروع عتادًا مخصصًا.', href: '/services/iot-embedded#electronics-pcb', cta: 'استكشف الإلكترونيات' },
    { label: 'البرنامج الثابت', body: 'سلوك الجهاز المحلي وإدارة الحالات والواجهات والتشخيص بالقرب من العتاد.', href: '/services/iot-embedded#firmware', cta: 'استكشف البرنامج الثابت' },
    { label: 'الاتصال', body: 'روابط محلية أو لاسلكية أو بوابة اختيارية وفق المدى والطاقة والأمان ودورة الحياة.', href: '/services/iot-embedded#connectivity', cta: 'استكشف الاتصال' },
    { label: 'الخلفية / السحابة', body: 'خدمات وهوية وبيانات وواجهات عندما يحتاج النظام قدرات برمجية مشتركة أو بعيدة.', href: '/services/software-engineering#apis', cta: 'استكشف أعمال الخلفية' },
    { label: 'الويب / الموبايل', body: 'تجارب مستخدم قابلة للوصول لسير العمل أو اللوحات أو تفاعلات الأجهزة المعتمدة.', href: '/services/software-engineering#web-apps', cta: 'استكشف تطبيقات المستخدم' },
    { label: 'التحقق', body: 'اختبارات وأدلة عبر الواجهات. هو طبقة مشروع مستقلة وليس خطوة أخيرة هامشية.', href: '/engineering-process', cta: 'شاهد عملية التحقق' },
  ],
};

function Selector({ locale, items, label }: { locale: Locale; items: Guidance[]; label: string }) {
  const [selected, setSelected] = useState(0);
  const active = items[selected] ?? items[0]!;
  return (
    <div className="service-selector">
      <div className="service-selector-tabs" role="group" aria-label={label}>
        {items.map((item, index) => (
          <button key={item.label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="service-selector-result" aria-live="polite">
        <p>{active.body}</p>
        <Link className="text-arrow" href={`/${locale}${active.href}`}>{active.cta} <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  );
}

export function StartingPointFinder({ locale }: { locale: Locale }) {
  return <Selector locale={locale} items={startingPoints[locale]} label={locale === 'ar' ? 'اختر ما تريد تحقيقه' : 'Choose what you want to achieve'} />;
}

export function EngineeringLayerExplorer({ locale }: { locale: Locale }) {
  return <Selector locale={locale} items={layers[locale]} label={locale === 'ar' ? 'استكشف طبقات الهندسة' : 'Explore engineering layers'} />;
}

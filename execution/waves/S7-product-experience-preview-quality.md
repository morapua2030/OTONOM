# S7 — تجربة المنتج وجودة المعاينة

التاريخ: 2026-10-18 · محلي فقط · بيانات اصطناعية · لا نشر.

## سجل التنفيذ: before / gaps / work / test

| الموجة | قبل / الفجوة | العمل المنفذ | الاختبار والحكم |
|---|---|---|---|
| S7.0 | S6 تاريخي 1180؛ تقارير متفاوتة العمر | صولحت المصادر، DB، البوابات، المشغل واللقطات | baseline موثق؛ S6 HISTORICAL فقط حتى إعادة التشغيل |
| S7.1 | الصفحة سليمة لكنها مسطحة بصريًا | hero هندسي، hierarchy وإيقاع وتباين وبطاقات وهوية placeholder هادئة | visual AR/EN على 360/768/1366؛ آلي PASS، بشري pending |
| S7.2 | مسارات مخططة غير متاحة وwayfinding محدود | أضيفت villas/apartments/scenarios/controllers/documentation/service، breadcrumbs و404 محلي | acceptance 114/114؛ مصفوفة readiness منفصلة |
| S7.3 | RFQ طويل في شاشة واحدة | خطوتان واضحتان، تحقق في الخطوة الأولى، حالات busy/error/retry، بلا uploads | Edge يثبت الانتقال والتسليم/الإعادة/الازدواجية؛ 42/42 E2E |
| S7.4 | وظائف الموظفين موجودة؛ labels المحمولة في Store/Service كانت مزاحة | صُححت labels، اتسعت الأهداف والمسافات، أضيف `aria-busy/live` وتأكيد العمليات الحساسة | Edge roles/store/service/mobile PASS؛ الأمن الخادمي باقٍ المرجع |
| S7.5 | حزمة w2 قديمة | 111 لقطة S7 وحالات مختلطة؛ كشف الفحص عزل `B2B` وأُصلح | bidi 258/258؛ B-27/B-29 PENDING HUMAN REVIEW |
| S7.6 | probes آلية جيدة دون قارئ شاشة | وُسعت الصفحات والأهداف والخطأ المعلن؛ أُعد سكربت Narrator/NVDA وzoom | A11Y 276/276؛ MANUAL وEXTERNAL AUDIT PENDING |
| S7.7 | المتجر العام placeholder فقط | عرض معلوماتي 4/6/16 مع `PRICE NOT CONFIGURED` وطلب توريد؛ لا cart mutation | بوابات G-1 وportal PASS؛ B-33 يبقى REDUCED |
| S7.8 | الضمان العام placeholder | أوضحت الشاشة غياب السياسة واشتراط الملكية وإغلاق الطلبات؛ staff service بقي usable | portal 17/17 وservice E2E؛ B-03/B-37/B-41 مفتوحة |
| S7.9 | طلب تدقيق B-38 بعد فشل تاريخي | أضيف Edge capture للرؤوس/السكربتات/Console/nonce مرتين؛ لم يُضعف CSP | 11/11، 11 script tags لكل load، لا blocked/console، nonce دار، hydration true |
| S7.10 | 1180 S6 | أضيفت مسارات ورحلة progressive وفحص CSP وvisual أوسع | المحاولة الأولى 1418/1430 FAIL؛ النهائية 1430/1430 PASS |
| S7.11 | 37 عائقًا مفتوحًا بعد S6 | صولحت B-01…B-44 بلا حذف أو خفض مصطنع | 7 RESOLVED-LOCAL؛ 7 REDUCED؛ 30 OPEN؛ المفتوح 37؛ جديد 0 |
| S7.12 | تسليم S6 دون عرض S7 | runbook عربي، review checklist، screenshot index، ADR، S8 backlog، handoff | جاهز لعرض داخلي فقط، لا إذن نشر |

## عيوب اكتُشفت وأُصلحت

1. تجربة Edge الأولى في S7 كشفت 12 إخفاقًا بصريًا: 3 لعزل `B2B` بالعربية و9 لأهداف breadcrumbs تحت 24px. أُصلحت وأعيدت الحزمة إلى 961/961. لم تُنسخ ملفات التشغيل الخام قبل أن يستبدلها المشغل القديم عند الإعادة؛ سُجلت القيم والأسماء بصدق في `execution/evidence/s7-failed-run-20261018/README.md` ثم عُدّل المشغل ليؤرشف كل تشغيل تلقائيًا مستقبلًا.
2. المراجعة البصرية اليدوية للقطات كشفت أن CSS أظهر خطوتي RFQ معًا لأن `display:grid` غلب سلوك `hidden`. أضيفت قاعدة صريحة، ثم مر E2E وvisual.
3. CTA لاصق على الهاتف ظهر فوق لوحة hero في لقطة كاملة؛ أُزيل من الصفحة الرئيسية.
4. labels المحمولة في جدولي Store وService كانت منزاحة عن الأعمدة؛ صُححت.

## دليل الاختبار النهائي

`execution/evidence/s7-final-20261018/summary.json`: **1430/1430**، بلا fail/skip/todo، build ناجح، وكل 12 خطوة خرجت 0. هذه أتمتة محلية وليست مراجعة بشرية أو مستقلة أو منصة مستهدفة.

## القيود

لم يُستخدم Git/GitHub، ولم يحدث نشر أو Railway أو اتصال بخدمة خارجية، ولم تُدخل بيانات عميل أو دفع حقيقية، ولم تُخترع أسعار/ضمان/سياسات/ادعاءات، وبقي Commerce/Warranty مغلقين خادميًا في PREVIEW.

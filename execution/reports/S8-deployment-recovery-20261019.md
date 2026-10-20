# تقرير استعادة نشر S8 — 2026-10-19

## النتيجة

- الفريق: `team-1626` (`team_CryMmRFNe1h8H8cn5LL35Flh`).
- المشروع: `otonom-smart-home-web` (`prj_7HjqLSLiBNtZ1Y6hyPUMrRX6jm38`).
- نشر التطبيق: `dpl_qG4m9gmSdG1R6USxaX6munN4NPJu`، الهدف Preview، والحالة `READY`.
- الرابط الدقيق: `https://otonom-smart-home-g850l16l9-team-1626.vercel.app`.
- Vercel Authentication مفعلة لكل النشرات؛ الوصول المجهول إلى `/` و`/api/ready` يعيد 302.

## التحقق الوظيفي والأمني

- الوصول الآلي المصرح أعاد 200 من `/api/ready` مع `{"ready":true}`، قبل حذف bootstrap وبعده.
- كل 25 قيمة بيئية بعيدة مقصورة على Preview. قاعدة التشغيل هي Neon Preview الاصطناعية؛ لم يُرفع رابط الإدارة أو dump محلي.
- صفحات العربية والإنجليزية والمتجر والضمان وصفحة دخول الموظفين أعادت النتائج المتوقعة.
- Commerce وWarranty وService وDevices مغلقة خادميًا في Preview برمز `NOT_AVAILABLE_IN_PREVIEW`.
- `/staff/login` أعاد CSP واحدة، بلا `unsafe-inline` في `script-src`، و11/11 nonce متطابقًا.
- Edge فتح المعاينة عبر جلسة Vercel مصادق عليها، وعرض صفحتي الإنجليزية والعربية. `/staff/login` hydrated وظهر النموذج التفاعلي بلا رسائل warn/error في Console؛ حساب EDITOR الاصطناعي اجتاز كلمة المرور ووصل إلى MFA، لكن التحقق لم يكتمل ولم تظهر لوحة الموظفين. التشخيص اللاحق أثبت تطابق سر TOTP المحلي مع Neon، وأن العداد لم يُستهلك والساعة متوافقة؛ العيب في المصدر المنشور هو اعتماد محدِّد المعدل على ملف `.local-secrets` مستبعد ومحاولة كتابة وقت التشغيل. أُصلح محليًا باشتقاق مقيّد من سر بيئي مع فشل مغلق، ولم يُنشر الإصلاح بعد. صفحات المتجر والضمان بقيت معلوماتية بلا نماذج، و`/api/account/devices` أعاد 404 مع `NOT_AVAILABLE_IN_PREVIEW` داخل Edge.
- رمز Automation Bypass الذي ظهر في خرج أداة داخلي أُلغي: عدد الرموز في المشروع صفر، والرمز السابق يعيد 302 بعد انتشار الإلغاء.

## تنظيف bootstrap

- bootstrap الساكن المؤقت: `dpl_EuKS796FrjHszmXdfWcahWwQQYTQ`.
- حُذف بالهوية الدقيقة بعد ثبوت جاهزية المعاينة.
- بقي نشر واحد فقط، وهو Preview. عنوان Production يعيد 404، والمعاينة ظلت `READY`.

## GitHub

- الحساب المتصل: `morapua2030`، المعرّف `207021116`.
- حدّد المالك لاحقًا البريد المطلوب `team@otonomiot.com`. لا يوجد بريد عام، ورمز OAuth الحالي لا يملك صلاحية `user:email`؛ لذلك لم يُثبت ارتباط البريد بالحساب.
- لم يُنشأ مستودع أو commit أو remote أو push أو تكامل Vercel/GitHub.
- الإجراء المطلوب من المالك داخل التدفق الرسمي: `gh auth refresh -h github.com -s user:email`. لا تُرسل كلمة مرور أو token أو OTP إلى Codex.
- إعادة التحقق في 2026-10-20 ما زالت بلا `user:email`، كما أن جلسة Vercel CLI الحالية انتهت/أصبحت غير صالحة؛ لا مستودع أو ربط أو نشر جديد أُنشئ.

## فحص محتوى Git وإعداد التكامل

- فُحصت 307 ملفات مرشحة. لم تظهر مفاتيح خاصة أو GitHub/Vercel/AWS/Stripe tokens أو JWTs أو روابط قاعدة حية.
- مطابقتا قاعدة البيانات كانتا false positives: روابط placeholder في `.env.example` ورابط محلي مركب في `db.ts`. ملفات `.local-secrets` وبيئة Preview ونسخة القاعدة وأدلة الاختبار مستبعدة من Git.
- أضيف `git.deploymentEnabled=false` إلى `app/vercel.json` لمنع كل نشر تلقائي من تكامل Git. لم يُربط GitHub بعد، ولم يتغير نشر Preview الحالي أو حماية All Deployments.

## قائمة التحقق اليدوية القصيرة لـ Edge

افتح `https://otonom-smart-home-g850l16l9-team-1626.vercel.app` ثم:

1. أكمل Vercel Authentication وتأكد أن `/en` و`/ar` يظهران دون redirect غير متوقع.
2. بعد نشر الإصلاح إلى Preview محمية جديدة، افتح `/staff/login` وأكمل EDITOR + MFA؛ تأكد أن صفحة المحرر تظهر دون Console/CSP errors.
3. افتح `/ar/shop` و`/ar/support/warranty` وتأكد أنهما Preview معلوماتية بلا شراء أو مطالبة عامة.
4. لا تحفظ كلمة المرور في Edge، ولا تُفعّل Commerce أو Warranty.

## التصنيف والقيود

- B-45: `RESOLVED-TARGET-PREVIEW`.
- B-46: `REDUCED / RESOLVED-LOCAL` — أصل عطل MFA المستضاف هو مسار ملح محدِّد المعدل غير المتوافق مع Vercel؛ الإصلاح المحلي ناجح، ويظل نشر Preview محمية وإعادة الاختبار مطلوبين.
- الاختبار المحلي الأحدث: `1439/1439`، وكل الخطوات الاثنتي عشرة exit 0؛ الدليل `execution/evidence/automated-20261020_070458_1018/`.
- التحقق المستضاف آلي ومصرح، وليس مراجعة بشرية أو اختبار اختراق مستقلًا.
- لا إطلاق عام، ولا تطبيق Production، ولا تفعيل تجارة أو ضمان، ولا بيانات عملاء حقيقية.

الدليل المنظم: `execution/evidence/s8-hosted-20261019/summary.json`.

## استكمال S8 النهائي — 2026-10-20

- جُددت جلسة Vercel رسميًا، وأُعيد التحقق من المستخدم `team-1626` والفريق والمشروع وحماية كل النشرات.
- نُشر إصلاح MFA في Preview فقط: `dpl_Gfn24PRnswhPSZt2T6d2ra8G9BZ3`، والرابط `https://otonom-smart-home-573rphmhc-team-1626.vercel.app`. الحالة `READY`، والمعاينة السابقة محفوظة، وعدد Production صفر.
- بقيت قيم البيئة الخمس والعشرون Preview-only، وبقيت قاعدة Neon نفسها دون إعادة إنشاء أو ترحيل أو بيانات حقيقية. عنوان Production يعيد 404، وطلبات الزائر المجهول إلى المعاينة الجديدة تتحول إلى Vercel Authentication.
- في Microsoft Edge نجحت صفحتا الإنجليزية والعربية، ونجح hydration. اجتاز حساب EDITOR الاصطناعي كلمة المرور؛ رُفض رمز خاطئ ورمز منتهي؛ نجح الرمز الصحيح ووصل إلى `/admin`. استمرت الجلسة بعد reload، ورُفضت قائمة المستخدمين عن EDITOR، ونجح logout. عدد warn/error في Console صفر.
- لم يُنفذ enrollment مستضافًا لعدم وجود حساب اصطناعي غير مسجل مع الحفاظ على قاعدة Preview. كما لم تُمكن أداة Edge الحالية من استخراج رأس CSP أو nonces الطلبات؛ لذلك لا يُدعى PASS جديد لرأس CSP أو دوران nonce، رغم نجاح hydration وConsole والانحدار المحلي.
- المتجر والضمان بقيا معلوماتيين بلا نماذج، وأعادت بوابة الأجهزة `NOT_AVAILABLE_IN_PREVIEW`. لم تُكرر POST gates الأخرى ضد النشر الجديد.
- منح GitHub أقل صلاحية `user:email`، وأكد API أن `202302030@PUA.EDU.EG` بريد موثق للحساب `morapua2030`. أُنشئ المستودع الخاص `https://github.com/morapua2030/OTONOM` بعد فحص 308 ملفات مرشحة بلا أسرار غير مصنفة.
- توقف ربط Vercel بالمستودع قبل أي أثر لأن الحساب يحتاج `Login Connection` إلى GitHub. يظل `git.deploymentEnabled=false`، ولا يوجد نشر Git تلقائي أو Production.
- الدليل المنظم الأحدث: `execution/evidence/s8-hosted-20261020/summary.json`.

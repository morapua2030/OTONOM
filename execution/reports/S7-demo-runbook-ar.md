# عرض OTONOM الداخلي — 20 دقيقة

## التشغيل الآمن

المتطلبات الحالية: PostgreSQL المحلي `127.0.0.1:5433` وقاعدة `otonom_dev` الاصطناعية. من `D:\otonom\app`: شغّل `pnpm --filter @otonom/web start` بعد build. العنوان العام `http://127.0.0.1:3301/ar`، ودخول الموظفين `/staff/login`. استخدم الحسابات الاصطناعية من ملف الأسرار المحلي كمرجع توليد فقط؛ لا تعرض أو تنسخ كلمات السر/TOTP.

## السيناريو

1. **0–3 دقائق:** Home بالعربية ثم English؛ وضّح شارة PREVIEW، proposition، 4/6/16 دون مواصفات مختلقة.
2. **3–5:** Developers وSolutions/Controllers؛ اعرض breadcrumbs وحالة الوثائق غير المنشورة.
3. **5–8:** RFQ اصطناعي: بيانات التواصل → ملخص المشروع → تحقق/إرسال. لا uploads ولا بريد حقيقي.
4. **8–11:** ENGINEER: MFA ثم Projects، triage، assignment وqualification. أوضح رفض finance action خادميًا.
5. **11–13:** EDITOR/OWNER: Content review، four-eyes، اكتمال اللغتين، evidence/consent gates.
6. **13–15:** OWNER: Overview وKPI؛ أرقام اصطناعية فقط وNorth Star غير معتمد.
7. **15–17:** STORE: `/admin/store-ops`، PRICE NOT CONFIGURED، shipping quote pending، stock/serial؛ لا دفع حقيقي.
8. **17–19:** ENGINEER/SERVICE: `/admin/service-desk`، policy missing fail-closed، safety callback وRMA اصطناعي.
9. **19–20:** افتح `/ar/shop` و`/ar/support/warranty`: واجهة معلوماتية فقط، والـAPI العام 404 في PREVIEW.

## ما هو جاهز للعرض وما ليس جاهزًا

| جاهز داخليًا | غير متاح/placeholder |
|---|---|
| Home/IA/RFQ، CRM/KPI/CMS، Store/Service staff، AR/EN | أسعار وسياسات وضمان وبريد ورفع ملفات وبيانات حقيقية |
| Edge E2E ولقطات 3 مقاسات | نشر عام، Railway، منصة مستهدفة، penetration/a11y مستقل |

أوقف الخادم بعد العرض وتأكد من عدم وجود listener على 3301. لا تغيّر stage ولا تفعّل بوابات عامة.


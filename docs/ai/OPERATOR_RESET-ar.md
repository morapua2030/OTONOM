# إعادة ضبط حساب OWNER/ADMIN على البرودكشن (بإيد الـ operator)

النسخة الإنجليزي: [OPERATOR_RESET.md](OPERATOR_RESET.md).

استعمله لما الـ OWNER (أو ADMIN) ما يقدرش يدخل:
- نسي الباسورد، و«نسيت الباسورد» بالإيميل لسه مش شغّال (شوف `PASSWORD_RESET_EMAIL-ar.md`)؛
- أو الموبايل اللي عليه تطبيق المصادقة ضاع، **ومفيش** ولا recovery code باقي.

لو لسه معاه recovery code، مش محتاج السكريبت ده. يدخل بالباسورد والـ recovery code، وصفحة `/staff/login` هتعرض
عليه **ربط تطبيق مصادقة جديد**. ولأي حد تاني في الفريق، الـ OWNER يستعمل من الأدمن
**Account security ← Reset a team member's authenticator**.

## السكريبت بيعمل إيه

السكريبت `app/web/scripts/reset-production-staff.ts` بيعمل خمس حاجات:

1. **بيرفض يشتغل** إلا لو كل تأكيدات البرودكشن موجودة:
   - `OTONOM_RESET_PRODUCTION_STAFF=ISOLATED_PRODUCTION_STAFF_RESET_ONLY`؛
   - `OTONOM_FORCE_PRODUCTION=1`، و`OTONOM_FORCE_PREVIEW` مش `1`؛
   - `OTONOM_EXPECTED_NEON_PROJECT_ID` هو نفسه `NEON_PROJECT_ID`.
2. **بيشتغل على حساب واحد موجود** بالإيميل. الإيميل بيتكتب مرتين، والحساب لازم يكون OWNER أو ADMIN.
3. **بياخد الباسورد الجديد مرتين** من الكيبورد ومن غير ما يظهر.
   - عمره ما بيتاخد كـ argument ولا كـ environment variable، ولا بيتكتب في ملف، ولا بيتسجّل في لوج.
   - وسياسة الباسورد العادية بتتطبّق عليه.
4. **بيغيّر الباسورد**، وده بيقفل **كل** جلسات الحساب.
   - مع `--reset-mfa`، بيشيل كمان تطبيق المصادقة وكل الـ recovery codes.
   - في الدخول الجاي، الحساب هيطلب ربط تطبيق مصادقة جديد، وهيطلّع recovery codes جديدة.
5. **بيسجّل في الـ audit:** ‏`user.password_reset_by_operator`، ومع `--reset-mfa` كمان `user.mfa_reset_by_operator`.

**المخرج:** سطر JSON واحد، يا `{"ok":true,...}` يا `{"ok":false,"code":"..."}`، ومفيهوش أي سر.

## الخطوات (Windows PowerShell، صاحب الحساب هو اللي يشغّلها)

1. افتح PowerShell جديد وروح للنسخة:
   `cd D:\otonom\.codex-worktrees\hybrid03-redesign-20261028\app\web`
2. عرّف الدالة اللي بتاخد القيمة من غير ما تظهرها:
   ```powershell
   function Set-SecretEnv([string]$Name) { $s = Read-Host -Prompt $Name -AsSecureString; $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { Set-Item -Path "env:$Name" -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
   ```
3. **عنوان الداتابيز:** انسخ `DATABASE_URL_UNPOOLED` (‏Production) من Vercel، وبعدين:
   ```powershell
   Set-SecretEnv OTONOM_ADMIN_DATABASE_URL
   $u = [uri]$env:OTONOM_ADMIN_DATABASE_URL; $u.Host
   ```
   الـ host لازم يخلص بـ `.neon.tech`، ومفيهوش `-pooler`.
4. **اتصالات دورين التطبيق:** من ملفات الباسورد المحلية.
   ```powershell
   $cms = (Get-Content D:\otonom\app\.local-secrets\pg_production_cms_pw.txt -Raw).Trim()
   $dom = (Get-Content D:\otonom\app\.local-secrets\pg_production_domain_pw.txt -Raw).Trim()
   $env:OTONOM_CMS_DATABASE_URL = 'postgresql://otonom_cms:' + [uri]::EscapeDataString($cms) + '@' + $u.Host + '/neondb?sslmode=require'
   $env:OTONOM_DOMAIN_DATABASE_URL = 'postgresql://otonom_domain:' + [uri]::EscapeDataString($dom) + '@' + $u.Host + '/neondb?sslmode=require'
   Remove-Variable cms, dom; Remove-Item env:OTONOM_ADMIN_DATABASE_URL
   ```
5. **قفل الأمان:** الـ Project ID من Neon console ← Settings، و`NEON_PROJECT_ID` من Vercel. الاتنين لازم يبقوا نفس القيمة.
   ```powershell
   $env:OTONOM_DB = 'neondb'
   $env:OTONOM_PG_HOST = 'invalid.invalid'
   $env:PAYLOAD_SECRET = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
   $env:OTONOM_RESET_PRODUCTION_STAFF = 'ISOLATED_PRODUCTION_STAFF_RESET_ONLY'
   $env:OTONOM_FORCE_PRODUCTION = '1'
   $env:NEON_PROJECT_ID = 'PASTE-VALUE-FROM-VERCEL'
   $env:OTONOM_EXPECTED_NEON_PROJECT_ID = 'PASTE-PROJECT-ID-FROM-NEON-CONSOLE'
   ```
   - `OTONOM_PG_HOST` بيخلّي أي اتصال تاني يفشل، بدل ما يروح لداتابيز محلية.
   - و`PAYLOAD_SECRET` المؤقت مش بيمضي أي حاجة بتتحفظ، لإن السكريبت مش بيطلّع أي tokens.
6. **شغّله.** ضيف `--reset-mfa` بس لو تطبيق المصادقة ضاع:
   ```powershell
   npx --no-install tsx scripts/reset-production-staff.ts --email owner@example.com --confirm-email owner@example.com --reset-mfa
   ```
   اكتب الباسورد الجديد عند `New password:`، واكتبه تاني عند `Repeat the new password:`. مش هيظهر حاجة وإنت بتكتب.
7. **المتوقع:** `{"ok":true,"userId":...,"role":"OWNER","sessionsRevoked":true,"mfaReset":true,...}`.
8. **اقفل نافذة PowerShell.** كل القيم اللي فوق بتتمسح معاها.
9. **ادخل من `/staff/login`** بالباسورد الجديد. ولو استعملت `--reset-mfa`، اربط تطبيق المصادقة الجديد واحفظ الـ recovery codes الجديدة.

## أكواد الرفض

| الكود | معناه |
| --- | --- |
| `RESET_GATE_CLOSED`، `NOT_PRODUCTION_TARGET`، `WRONG_NEON_PROJECT` | تأكيدات البرودكشن في خطوة 5 ناقصة أو مش متطابقة |
| `EMAIL_REQUIRED`، `EMAIL_CONFIRMATION_MISMATCH`، `UNKNOWN_ARGUMENT` | راجع الإيميلين. ومفيش argument للباسورد أصلًا |
| `PASSWORD_CONFIRMATION_MISMATCH`، `PASSWORD_*` | الباسوردين مختلفين، أو السياسة رفضت الباسورد |
| `USER_NOT_FOUND`، `ROLE_NOT_RESETTABLE` | مفيش حساب بالإيميل ده، أو الحساب مش OWNER/ADMIN |
| `SESSIONS_NOT_REVOKED`، `MFA_NOT_RESET` | الفحص اللي بعد التغيير فشل. ما تدخلش، وبلّغ |

لو السكريبت رفض قبل ما يغيّر الباسورد (خطوة 4 في الجزء اللي فوق)، **مفيش أي حاجة اتغيّرت**.

## ممنوع

- تشغيله على أي داتابيز غير داتابيز البرودكشن اللي إنت قاصد تغيّرها.
- لصق باسورد أو connection string في شات، أو تذكرة، أو ملف.
- استعماله علشان تدخل على حساب حد تاني. كل تشغيل بيتسجّل في الـ audit.

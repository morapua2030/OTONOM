# Operator reset of a Production OWNER/ADMIN account

Arabic version: [OPERATOR_RESET-ar.md](OPERATOR_RESET-ar.md).

Use this when the OWNER (or an ADMIN) can no longer sign in:
- the password is forgotten and password-reset e-mail is not switched on yet (see `PASSWORD_RESET_EMAIL-ar.md`);
- or the phone with the authenticator is lost **and** no recovery code is left.

If the person still has a recovery code, they do not need this: they sign in with the password plus the recovery
code, and `/staff/login` offers **Set up a new authenticator**. For any other staff member, the OWNER uses
**Account security → Reset a team member's authenticator** in the admin.

## What the script does

`app/web/scripts/reset-production-staff.ts` does five things:

1. It refuses to run unless every explicit Production confirmation is set:
   - `OTONOM_RESET_PRODUCTION_STAFF=ISOLATED_PRODUCTION_STAFF_RESET_ONLY`;
   - `OTONOM_FORCE_PRODUCTION=1`, and `OTONOM_FORCE_PREVIEW` is not `1`;
   - `OTONOM_EXPECTED_NEON_PROJECT_ID` equals `NEON_PROJECT_ID`.
2. It targets one **existing** account by e-mail. You must give the address twice, and the account must be OWNER or ADMIN.
3. It reads the new password twice from the keyboard without showing it. The password is never accepted as an argument
   or an environment variable, never written to a file and never logged. The normal password policy applies.
4. It sets the password, which ends **every** session of that user.
   - With `--reset-mfa` it also removes the authenticator and all recovery codes. The next sign-in then asks for a
     new authenticator and issues new recovery codes.
5. It writes the audit events `user.password_reset_by_operator` and, with `--reset-mfa`, `user.mfa_reset_by_operator`.

It prints one line of JSON: `{"ok":true,...}` or `{"ok":false,"code":"..."}`. Neither line contains a secret.

## Steps (Windows PowerShell, by the account holder)

1. Open a new PowerShell window and go to the release checkout:
   `cd D:\otonom\.codex-worktrees\hybrid03-redesign-20261028\app\web`
2. Define the hidden-input helper:
   ```powershell
   function Set-SecretEnv([string]$Name) { $s = Read-Host -Prompt $Name -AsSecureString; $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { Set-Item -Path "env:$Name" -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
   ```
3. Get the database host. Copy `DATABASE_URL_UNPOOLED` (Production) from Vercel, then:
   ```powershell
   Set-SecretEnv OTONOM_ADMIN_DATABASE_URL
   $u = [uri]$env:OTONOM_ADMIN_DATABASE_URL; $u.Host
   ```
   The host must end with `.neon.tech` and must not contain `-pooler`.
4. Build the connections for the two application roles from the local role password files:
   ```powershell
   $cms = (Get-Content D:\otonom\app\.local-secrets\pg_production_cms_pw.txt -Raw).Trim()
   $dom = (Get-Content D:\otonom\app\.local-secrets\pg_production_domain_pw.txt -Raw).Trim()
   $env:OTONOM_CMS_DATABASE_URL = 'postgresql://otonom_cms:' + [uri]::EscapeDataString($cms) + '@' + $u.Host + '/neondb?sslmode=require'
   $env:OTONOM_DOMAIN_DATABASE_URL = 'postgresql://otonom_domain:' + [uri]::EscapeDataString($dom) + '@' + $u.Host + '/neondb?sslmode=require'
   Remove-Variable cms, dom; Remove-Item env:OTONOM_ADMIN_DATABASE_URL
   ```
5. Set the gate. Take the Neon project id from the Neon console (Settings) and `NEON_PROJECT_ID` from Vercel; they must be equal.
   ```powershell
   $env:OTONOM_DB = 'neondb'
   $env:OTONOM_PG_HOST = 'invalid.invalid'
   $env:PAYLOAD_SECRET = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
   $env:OTONOM_RESET_PRODUCTION_STAFF = 'ISOLATED_PRODUCTION_STAFF_RESET_ONLY'
   $env:OTONOM_FORCE_PRODUCTION = '1'
   $env:NEON_PROJECT_ID = 'PASTE-VALUE-FROM-VERCEL'
   $env:OTONOM_EXPECTED_NEON_PROJECT_ID = 'PASTE-PROJECT-ID-FROM-NEON-CONSOLE'
   ```
   - `OTONOM_PG_HOST` makes any other connection fail instead of reaching a local database.
   - The temporary `PAYLOAD_SECRET` signs nothing that is kept; the script issues no tokens.
6. Run it. Add `--reset-mfa` only if the authenticator is lost:
   ```powershell
   npx --no-install tsx scripts/reset-production-staff.ts --email owner@example.com --confirm-email owner@example.com --reset-mfa
   ```
   Type the new password at `New password:` and again at `Repeat the new password:`. Nothing is shown while you type.
7. Expected output: `{"ok":true,"userId":...,"role":"OWNER","sessionsRevoked":true,"mfaReset":true,...}`.
8. Close the PowerShell window. All the values above disappear with it.
9. Sign in at `/staff/login` with the new password. After `--reset-mfa`, enroll the new authenticator and save the new recovery codes.

## Refusal codes

| Code | Meaning |
| --- | --- |
| `RESET_GATE_CLOSED`, `NOT_PRODUCTION_TARGET`, `WRONG_NEON_PROJECT` | The Production confirmations in step 5 are missing or do not match |
| `EMAIL_REQUIRED`, `EMAIL_CONFIRMATION_MISMATCH`, `UNKNOWN_ARGUMENT` | Check the two e-mail arguments. There is no password argument |
| `PASSWORD_CONFIRMATION_MISMATCH`, `PASSWORD_*` | The two passwords differ, or the policy refused the password |
| `USER_NOT_FOUND`, `ROLE_NOT_RESETTABLE` | There is no such account, or it is not an OWNER/ADMIN |
| `SESSIONS_NOT_REVOKED`, `MFA_NOT_RESET` | The post-check failed. Do not sign in. Report it |

No change is made when the script refuses before step 4.

## Never

- Never run it against anything other than the Production database you mean to change.
- Never paste a password or a connection string into a chat, a ticket or a file.
- Never use it to sign in as someone else. Every run is audited.

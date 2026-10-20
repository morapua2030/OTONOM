# 10 — Security, Privacy and Threat Model (DRAFT)

## 1. Assets (ranked by impact)
1. **Customer engineering files** (blueprints, CAD, site photos). Confidential, and high reputational/legal impact.
2. **Admin accounts** (full control of content, orders, contracts, attribution).
3. Customer PII (names, phones, addresses, emails), payment proofs, consent records.
4. Contract values and attribution records (financial reporting integrity).
5. Inventory and serial records (stock integrity, warranty fraud).
6. Published claims (safety/compatibility wording creates legal exposure).
7. Secrets (DB URL, storage keys, email API keys, the GitHub token on the dev laptop).

## 2. Threats (STRIDE-lite) and mitigations
| # | Threat | Asset | Mitigation |
|---|---|---|---|
| T1 | Public access to RFQ files via a guessable/leaked URL | 1 | Private bucket, random keys, short-lived signed URLs, authz before issuing, download audit |
| T2 | Malware uploaded and opened by staff | 1, 2 | Allow-list + magic bytes, ClamAV quarantine, no ZIP, open files outside the browser on a hardened machine |
| T3 | Admin account takeover (phishing, credential stuffing) | 2 | MFA, rate limiting + lockout, strong password policy, session timeout, optional IP/identity-aware proxy for `/admin` |
| T4 | Broken access control (IDOR on orders, tickets, files) | 3, 1 | Server-side ownership checks on every query, tests for cross-customer access, no sequential IDs exposed for authz |
| T5 | Price/quantity tampering at checkout | 4, 5 | Server re-prices from PriceVersion. Client prices ignored |
| T6 | Double submit / replay | 5 | Idempotency keys, status guards |
| T7 | Oversell via race | 5 | Conditional update / row locks (doc 08 §4) |
| T8 | Manipulating attribution to inflate KPIs | 4 | Lock at signature, audited overrides with a reason, separate approver where possible, periodic review report of overrides |
| T9 | Fake warranty claims via guessed serials | 5 | Registration requires an order match or admin verification. Serial format is not sequential (OPEN, depends on manufacturing) |
| T10 | Spam/bot RFQs and form abuse | ops | Turnstile/captcha, rate limit per IP/email, honeypot |
| T11 | XSS via CMS rich text or RFQ text | 2, 3 | Sanitised rich text, CSP, output encoding, admin views escape customer text |
| T12 | Secrets leaked in Git/logs | 7 | `.gitignore` before the first commit, `.env.example` only, secret scanning (GitHub push protection when the repo exists), log redaction |
| T13 | Supply-chain compromise (npm) | all | Lockfile, `pnpm audit`, Dependabot/Renovate (after approval), minimal dependencies, `pnpm` `onlyBuiltDependencies` allow-list |
| T14 | Data loss | all | Daily backups + tested restore, object storage versioning |
| T15 | Unverified safety/certification claims published | 6 | Claims governance: EvidenceRecord required (doc 11), legal review of safety wording |
| T16 | Dev laptop compromise exposes the GitHub token (`repo`, `workflow` scopes observed) | 7 | Use the least-privileged token for this repo (fine-grained PAT or gh with minimal scopes), keep OS updated, disk encryption (BitLocker status unverified) |

## 3. Smart-home safety wording (content policy)
- Gas, alarm, door/garage and other safety- or security-relevant integrations must be described **with physical fail-safes as the primary protection**. Voice assistants and cloud services are never presented as the sole safety mechanism.
- No "certified" / "works with" badges unless an official certification exists (Apple MFi/Matter, "Works with Alexa", etc.). For tested integrations use "tested in OTONOM projects with [ecosystem] via [method/version], [date]".
- Secure-entry integrations need a threat note: authorisation, logging, local manual override.

## 4. Authentication and session baseline
Admin MFA (TOTP) · Argon2id/bcrypt via the framework · HTTP-only, Secure, SameSite=Lax cookies · CSRF tokens on state-changing forms · idle timeout 30 min for admin (proposal) · re-authentication for sensitive actions (contract value change, attribution override, stock adjustment) · audit of login events.

## 5. Security headers and platform
HTTPS only, HSTS, CSP (nonce-based), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, frame-ancestors none (admin). Health endpoint without sensitive info.

## 6. Single-admin control problem (D-022)
With one admin, segregation of duties is impossible. **Proposed compensating controls:**
- Every sensitive change requires a **reason** and is audited.
- A weekly "sensitive changes" digest is emailed to a second named person (owner/partner) for after-the-fact review.
- When a second person gets an account, enable a two-person rule for contract-value and attribution changes after lock.

## 7. Privacy (Egypt first)
- Egypt **Personal Data Protection Law No. 151 of 2020**: legal counsel must confirm the status of the executive regulations and any licensing/registration obligations with the Personal Data Protection Center before launch. This document does not assert those obligations.
- Data minimisation: no national ID collection. Collect only the fields needed per form.
- Privacy notice in AR/EN: purposes, retention, recipients (hosting, email provider), rights, contact.
- Consent: separate processing consent (required for RFQ) and marketing consent (optional). Analytics consent banner if non-essential cookies/trackers are used. Prefer privacy-friendly, first-party analytics.
- Cross-border transfer: hosting outside Egypt (Railway regions are US/EU/Asia) is a cross-border transfer and needs a legal check.
- Gulf expansion later: Saudi PDPL / UAE PDPL review at that time.

## 8. Secrets handling (process)
- Local: `.env.local` (git-ignored). Values are never pasted into chat or docs.
- Hosting: Railway variables (later). Separate values per environment.
- Rotation on staff change or suspected leak. Document an owner per secret.

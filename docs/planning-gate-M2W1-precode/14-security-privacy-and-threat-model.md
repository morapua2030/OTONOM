# 14 — Security, Privacy and Threat Model

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. **Not legal advice**. Compliance requires specialist review |
|---|---|---|---|---|---|---|---|

Scale: Severity (S) and Likelihood assumption (L) are each High/Medium/Low. Stage = PV / CR.

## 1. Threat register
| ID | Threat | Precondition | Affected | S | L | Mitigation | Verification (planned) | Owner | Stage |
|---|---|---|---|---|---|---|---|---|---|
| T-01 | Malicious PDF/image/CAD (parser exploit, polyglot, executable disguise) | Upload enabled | Staff machines, server | H | M | Allow-list + magic bytes, quarantine, AV scan, no server-side parsing/preview of CAD, staff open files in a hardened viewer | SEC-T01 | Eng | PV(P-B)/CR |
| T-02 | Archive/zip bombs | Archives accepted | Server | M | L | Archives rejected | SEC-T02 | Eng | PV/CR |
| T-03 | Leaked blueprint URLs | Public/long-lived links | Clients | H | M | Private bucket, ≤ 5 min signed URLs, per-download authz + audit, no email links | SEC-T03 | Eng | PV/CR |
| T-04 | RFQ enumeration | Sequential IDs | Clients | M | M | Non-sequential refs. No public RFQ view | SEC-T04 | Eng | PV |
| T-05 | Spam / spoofed leads / form abuse | Public form | Engineers' time | M | H | Bot challenge, rate limits, honeypot, triage "spam" | SEC-T05 | Eng | PV |
| T-06 | B2B impersonation / insecure org merge | Self-claimed org identity | Data integrity | M | M | No self-service org accounts in PV. Staff verify. Reversible audited merges | SEC-T06 | Eng/Owner | PV |
| T-07 | IDOR across corporate documents/orders/tickets | Weak object checks | Clients | H | M | Ownership checks on every query. Tests per role | SEC-T07 | Eng | PV/CR |
| T-08 | Admin privilege escalation / wrong authorisation | Role bugs | All data | H | M | Server-side RBAC. Least privilege. Role changes audited and notified | SEC-T08 | Eng | PV |
| T-09 | MFA failure / session hijack | Weak session config | Admin | H | M | TOTP MFA, secure cookies, rotation, idle/absolute timeout, re-auth for sensitive ops | SEC-T09 | Eng | PV |
| T-10 | Tampered prices / stale quotes | Client-supplied totals | Revenue | H | M | Server pricing. Quote validity. Revision checks | SEC-T10 | Eng | CR |
| T-11 | Duplicate/forged wallet or transfer proofs | Manual verification | Revenue | M | M | Statement matching. Unique external reference. Two-step verify for large amounts (threshold OPEN) | SEC-T11 | Store/Finance | CR |
| T-12 | Fake payment callbacks | Future gateway | Revenue | H | — | N/A now (no gateway). Signed + idempotent callbacks later | — | Eng | FUT |
| T-13 | Overselling / negative inventory | Race | Customers | H | M | Doc 09 invariants | INV-T01 | Eng | CR |
| T-14 | Serial duplication/reassignment / warranty fraud | Weak claim rules | Revenue, trust | M | M | Ownership proof. Serial ≠ credential. Duplicate quarantine | WAR-T01 | Eng/Service | CR |
| T-15 | Fake testimonials / consent misuse | Weak governance | Legal | H | L | ConsentRecord gate. No fabricated reviews | CMS-T03 | Owner | PV |
| T-16 | Leakage of door/garage/alarm details in media | Unscreened media | Clients' physical security | H | M | Media screening checklist. Sanitised diagrams | CLM-T04 | Content | PV |
| T-17 | Arbitrary attribution edits / financial manipulation | Single admin | Reporting | M | M | Lock at signature. Audited overrides. Weekly digest to a second person | KPI-T14/15 | Owner | PV |
| T-18 | Secrets in content, logs, telemetry, AI context | Careless ops | Infra | H | M | Secret store per env. Log redaction. Never paste secrets into AI tools. `.env` never in docs | OPS-T05 | Eng | PV |
| T-19 | Cross-language XSS/injection, CMS publish bypass | Rich text, API | Visitors, admin | H | M | Sanitised rich text, CSP, server-side publish gates | CMS-T05, SEC-T12 | Eng | PV |
| T-20 | Cyber-physical: the site used to influence home devices | Any device-control feature | Homes | Critical | L | **No device control from the website.** No device credentials stored | Architecture review | Owner | all |
| T-21 | CSRF on admin mutations | Cookie auth | Admin | H | M | SameSite + CSRF tokens/origin checks | SEC-T13 | Eng | PV |
| T-22 | Enumeration of the order-status page | Weak lookup | Customers | M | M | Ref + OTP. Rate limit. Uniform responses | SEC-T14 | Eng | CR |

## 2. Roles and permissions (M3P role names)
| Capability | Owner | Admin | Engineer | Store | Editor | Customer |
|---|---|---|---|---|---|---|
| Manage roles/users | ✅ | ✅ (not Owner) | ❌ | ❌ | ❌ | ❌ |
| RFQ/opportunity work | ✅ | ✅ | ✅ | ❌ | ❌ | own submission only |
| Download RFQ files | ✅ | ✅ | assigned | ❌ | ❌ | own (if enabled) |
| Approve proposal / record contract | ✅ | configurable | ❌ | ❌ | ❌ | ❌ |
| Attribution override | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Confirm orders / verify payments | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Stock adjustments | ✅ | ✅ (approved) | ❌ | request only | ❌ | ❌ |
| Commissioning / diagnosis | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish content | ✅ | ✅ | technical review | ❌ | draft/submit | ❌ |
| View own devices/tickets | — | — | — | — | — | ✅ own |
| Export PII reports | ✅ (audited) | ❌ | ❌ | ❌ | ❌ | ❌ |

At launch one person holds Owner. The model is enforced anyway.

## 3. Privacy (checklist for counsel; not legal advice)
Egypt Personal Data Protection Law No. 151/2020 and its executive regulations (current obligations to be confirmed by counsel) · privacy notice AR/EN before **any** PII collection (PV included) · lawful basis/consent per purpose · retention schedule (RFQ files, payment proofs, contracts, warranty, logs) · cross-border hosting implications (future Railway region) · data subject requests while preserving statutory records · cookie/analytics consent · processor list (hosting, email, storage).

## 4. Data classification
| Class | Examples | Handling |
|---|---|---|
| Restricted | CAD/plans, site addresses, payment proofs, contract documents | Private storage, signed URLs, need-to-know, audit |
| Confidential | Contact PII, contract values, attribution | RBAC, PII-minimised exports |
| Internal | Internal notes, KPIs | RBAC |
| Public | Published content | CMS gates |

## 5. Secrets and AI tooling
- Secrets live only in environment-specific secret stores (future).
- No secrets in docs, prompts, logs or screenshots.
- AI agents receive planning docs, never customer files or credentials, unless the owner approves case by case.

## 6. Preview secure-collection gate (decides variant P-A vs P-B)
P-B (real RFQ with uploads in PV) is allowed only if **all** of these are true:
1. Privacy notice approved (legal).
2. Private storage with no public ACL, verified by a negative test.
3. Upload allow-list, magic-byte checks, size limits, quarantine.
4. Malware scanning operational, or uploads disabled until it is.
5. Signed short-lived URLs + download audit.
6. Retention schedule approved.
7. Admin MFA active.
8. Rate limit + bot protection on the form.

Otherwise → **P-A**: informational preview + basic contact/RFQ text form without files (still needs items 1, 7 and 8).

## Sign-off (Wave 9a)
≥ 20 threats with verification and owner ✅ · Preview gate defined ✅ · Legal not asserted ✅

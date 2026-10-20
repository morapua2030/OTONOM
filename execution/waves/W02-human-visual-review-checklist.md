# Human Visual Review Checklist — Arabic / English (status: PENDING)

Reviewer: ____________________ (native Arabic reader, ideally also a site editor). Date: __________.
Screenshots: `D:\otonom\execution\evidence\screenshots\w2\` (`<locale>_<page>-<width>.png`).
Live (local only): start the app (see `app/README.md`) and open `http://127.0.0.1:3301/ar`. **Mark nothing PASS that was not actually looked at.**

Legend: ✅ pass · ❌ defect (describe) · ➖ not applicable

## A. Every page × {360, 768, 1366} × {ar, en}
| # | Check | ar | en | Notes |
|---|---|---|---|---|
| A1 | Reading direction feels natural (menus, buttons and alignment mirrored in Arabic) | | | |
| A2 | No text is cut off, overlapping or running off-screen | | | |
| A3 | Arabic font is legible; line height comfortable; no broken ligatures | | | |
| A4 | Latin brand/product names inside Arabic sentences sit in the right place (OTONOM, Home Assistant, Google Home) | | | |
| A5 | Parentheses and punctuation are on the correct side, e.g. "(RC04)", "(V-6)", full stops | | | |
| A6 | Numbers, percentages and ranges read correctly ("3–6 أشهر", "80%", "1,250") | | | |
| A7 | Phone numbers, e-mails, SKUs, references and file names appear left-to-right and are not split across lines | | | |
| A8 | Money reads naturally ("3,200,000 ج.م." in Arabic, "EGP 3,200,000" in English) | | | |
| A9 | Western digits in Arabic pages are acceptable (**PROPOSED** convention), or Arabic-Indic digits are required | | | |
| A10 | Navigation labels are correct, natural Egyptian/Modern Standard Arabic | | | |
| A11 | Language switch opens the same page in the other language | | | |
| A12 | Placeholder notices are clearly marked as temporary (no placeholder could be mistaken for approved content) | | | |

## B. Forms (RFQ / consultation, screenshots `*_rfq-errors-360.png`)
| # | Check | ar | en | Notes |
|---|---|---|---|---|
| B1 | Labels are clear; required fields are obvious | | | |
| B2 | Error summary is understandable and links jump to the right field | | | |
| B3 | Error messages are polite and specific | | | |
| B4 | Phone/email typing direction feels right while typing Arabic in other fields | | | |
| B5 | Date field format acceptable (browser-controlled; currently shows the device's locale format) | | | |
| B6 | Consent wording acceptable (**privacy text itself is BLOCKED pending legal**) | | | |

## C. Tables / numbers (`*_preview_bidi-samples-*.png`)
| # | Check | ar | en | Notes |
|---|---|---|---|---|
| C1 | Column order mirrored correctly in Arabic; numeric columns aligned | | | |
| C2 | Table fits on a phone without clipped columns | | | |

## D. Admin (`admin_pages-create-*.png`; live: `/staff/login`)
| # | Check | Result | Notes |
|---|---|---|---|
| D1 | Arabic content fields type right-to-left; English fields left-to-right | | |
| D2 | English admin interface is acceptable for editors (A4), or an Arabic admin UI is required | | |
| D3 | Editors understand which locale they are editing (locale switcher, "— العربية" suffix) | | |

## Sign-off
- Overall: ☐ PASS ☐ PASS with minor issues ☐ FAIL
- Reviewer signature / date: ______________________
- Issues to log: ______________________

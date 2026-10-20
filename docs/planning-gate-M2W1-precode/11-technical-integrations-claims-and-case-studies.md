# 11 — Technical Integrations, Claims Registry and Case Studies

| Version | 3.0-draft | Date | 2026-10-13 | Status | DRAFT. **No claim below is publishable today except where stated** |
|---|---|---|---|---|---|---|---|

## 1. Claim statuses
| Status | Meaning | Publishable? |
|---|---|---|
| `OWNER_REPORTED` | The owner says so. No document reviewed | ❌ |
| `REVIEW_PENDING` | Evidence received, under review | ❌ |
| `INDEPENDENTLY_DEMONSTRATED` | Reviewed test/datasheet/project evidence with scope and date | ✅ with the exact scoped wording |
| `CERTIFIED` | A third-party certificate verified (ID, scope, authorised use) | ✅ certificate wording |
| `LEGALLY_BARRED` | Can't be said (consent/IP/regulatory) | ❌ |
| `PROHIBITED` | Must never be said (unsafe/misleading) | ❌ |

## 2. Claim-to-evidence registry (initial state)
| ID | Customer-facing claim (draft) | Status | Evidence required | Safety impact | Approver | Safe alternative copy today |
|---|---|---|---|---|---|---|
| CL-01 | "OTONOM controllers are available in 4, 6 and 16 channel models" | OWNER_REPORTED (high confidence) | Product list/datasheets | Low | Owner | ✅ Acceptable as a company statement once the owner confirms the current lineup in writing |
| CL-02 | Electrical ratings per channel/model | OWNER_REPORTED | Approved datasheet revision | **High** | Engineering | "Electrical specifications available on request" |
| CL-03 | "Bluetooth-assisted setup and Wi-Fi connectivity" | OWNER_REPORTED | Datasheet/firmware release notes | Low | Engineering | "Wireless setup via our mobile app" (generic) after confirmation |
| CL-04 | Works with Alexa (scope: listed functions) | OWNER_REPORTED | Test report: method, versions, date, functions | Medium | Engineering | "We integrate voice assistants in projects where suitable. Details on request" |
| CL-05 | Works with Google Home | OWNER_REPORTED | as above | Medium | Engineering | as above |
| CL-06 | Works with Apple Home | OWNER_REPORTED | as above + method (bridge vs native). **No Apple certification claim** | Medium | Engineering | as above |
| CL-07 | Works with Home Assistant | OWNER_REPORTED | as above | Medium | Engineering | as above |
| CL-08 | Local control continues during internet outages | OWNER_REPORTED (scope unknown) | Offline behaviour matrix test | **High** | Engineering | "Core switching does not depend on our cloud. Exact behaviour depends on configuration. Ask us" (only after engineering confirms this much) |
| CL-09 | Voice control works offline | **PROHIBITED** (cloud voice assistants need internet) | — | High | — | State the dependency explicitly |
| CL-10 | Mobile apps available on App Store/Google Play | **PROHIBITED until published** | Live store URLs | Low | Owner | "Mobile app: coming soon" (only if the owner approves that wording) |
| CL-11 | Internal safety/quality testing performed | OWNER_REPORTED | Test records | High | Engineering | Omit until reviewed |
| CL-12 | Certified (CE/other) | No evidence | Certificates | High | Engineering/legal | Omit |
| CL-13 | Gas/alarm integration | OWNER_REPORTED (project-specific) | Project evidence + safety review | **Critical** | Engineering + legal | "Integration with existing alarm systems is engineered per project. Certified safety devices remain the primary protection" |
| CL-14 | Door/garage automation | OWNER_REPORTED (project-specific) | Project evidence + security review | **High** | Engineering | Mention only with authorisation/manual-override wording |
| CL-15 | Installation capacity / nationwide coverage | OWNER_REPORTED (capacity unknown) | Ops statement | Medium | Ops | "Installation by OTONOM's own team. Coverage confirmed per project" |
| CL-16 | Warranty period | **BLOCKED** (duration unapproved) | Approved policy | High | Owner + legal | "Warranty terms will be published with our commercial launch" (PV) |
| CL-17 | "Manufacturer" status (own design/production) | OWNER_REPORTED | Company facts | Low | Owner | "Designed by OTONOM" once confirmed |
| CL-18 | RF frequencies / radio specifics | Not reported | Datasheet | Medium | Engineering | Omit |

Each claim row also stores AR/EN wording variants, test version/date, `review_by` date, and the approver once evidenced.

## 3. Local vs cloud explanation (structure for the integrations page)
| Layer | Typical dependency (to be confirmed per product/firmware) |
|---|---|
| Physical circuit switching at the controller / wall switch | Local (target claim, needs evidence) |
| On-device schedules/automations | Local, if stored on the device (needs evidence, including the clock source after a power loss) |
| Mobile app on the same LAN | Local network (needs evidence) |
| Mobile app remote access | Internet + OTONOM/cloud service |
| Voice assistants (Alexa/Google) | Internet + vendor cloud (always) |
| Apple Home / Home Assistant | Depends on bridge/local integration method (needs evidence) |

## 4. Case studies
- **Apartment project:** consent is **verbal only** → `LEGALLY_BARRED` for identified publication.
- Required: written consent listing the assets (photos, videos, name, location granularity, quotes) and duration.
- Media screening (doc 10) must cover: entry keypads/locks, addresses/signage, faces/children, SSIDs/router screens, alarm panels, serials/QR, reflections.
- **Safe PV alternative:** "How a multi-system apartment integration is engineered" with non-identifying diagrams and an explicit "illustrative" label (owner approval).

## 5. Planned tests (NOT EXECUTED)
CLM-T01 a page containing a claim snippet with a non-publishable status can't be published · CLM-T02 evidence expiry flags the content · CLM-T03 PROHIBITED claims rejected by the editor lint list (e.g. "certified", "works offline" with voice) · CLM-T04 identified case study blocked without written consent.

## Sign-off (Wave 7b)
Every high-impact claim has a gate + safe copy ✅ · Voice/offline distinction ✅

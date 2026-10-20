# Technical Integration Showcase

| Doc ID | OTONOM-DOC-15 | Version | 2.0-draft | Date | 2026-10-13 | Status | DRAFT. Matrix is a **template**. No row is verified |
|---|---|---|---|---|---|---|---|

## 1. Purpose and scope
How the integration/compatibility pages present OTONOM's engineering depth truthfully: the ecosystem matrix template, local vs cloud behaviour, public architecture constraints, and safety notes. The website **never** controls devices (master §8.9).

## 2. Integration capability matrix (template; fill only from evidence)
| Field | Alexa | Google Home | Apple Home | Home Assistant | Other (AV/HVAC/IR…) |
|---|---|---|---|---|---|
| Integration path (native API, bridge, custom skill, orchestration, IR, relay…) | ? | ? | ? | ? | ? |
| Tested software/firmware versions | ? | ? | ? | ? | ? |
| Device classes (lighting, climate, audio, TV, garage, sensor…) | ? | ? | ? | ? | ? |
| Local vs cloud dependency (exact) | ? | ? | ? | ? | ? |
| Authentication boundary (public description only) | ? | ? | ? | ? | ? |
| Tested use cases + setting | ? | ? | ? | ? | ? |
| Failure/recovery (network outage, restart, token expiry, power loss, stale state) | ? | ? | ? | ? | ? |
| Certification | **not claimed** unless verified | same | same | same | same |
| Public documentation link | ? | ? | ? | ? | ? |
| Publication approval | ? | ? | ? | ? | ? |
| Last verified date | ? | ? | ? | ? | ? |
| Evidence state (doc 14 §4) | USER_STATED | USER_STATED | USER_STATED | USER_STATED | USER_STATED |

Current state: every row is `USER_STATED` (DR-030). **Nothing is publishable** until test reports are reviewed.

## 3. Wording rules
| Allowed (once evidence exists) | Forbidden |
|---|---|
| "Integrated with Home Assistant in OTONOM projects via [method], tested with [version] on [date]" | "Works with all Home Assistant / Google Home devices" |
| "Voice control through Alexa requires an internet connection" | Implying Alexa works offline |
| "Local wall-switch / app-on-LAN control continues during internet outages for: [exact list from tests]" | "Works fully offline" (unless proven for every function) |
| "Apple Home integration via [bridge], not Apple-certified" | Apple, MFi, Matter or "Works with Alexa" badges without certification |

## 4. Offline-behaviour matrix (required evidence, ENG to fill)
| Function | Internet down | Cloud service down | Wi-Fi down | Power restored | Evidence |
|---|---|---|---|---|---|
| Physical switch control | ? | ? | ? | ? (state restore) | ? |
| Mobile app on LAN | ? | ? | n/a | ? | ? |
| Mobile app remote | ✗ (expected) | ? | ✗ | ? | ? |
| Schedules/automations on device | ? | ? | ? | ? (clock source?) | ? |
| Voice assistants | ✗ (expected) | ✗ | ✗ | ? | ? |
| Home Assistant local | ? | ? | ✗ | ? | ? |

## 5. Public architecture diagram constraints
A diagram may show component categories and data flows at a conceptual level (device ↔ local network ↔ app ↔ optional cloud ↔ ecosystem). It must **not** show IP ranges, hostnames, API endpoints, keys, firmware internals, customer topology, or security bypasses.

## 6. Safety notes (mandatory on safety-relevant integration content)
- Gas, fire, alarm, door, lock and garage functions: physical and certified safety devices remain the primary protection. Automation is a convenience layer.
- Voice and cloud services must never be presented as a safety mechanism.
- Entry/garage automation requires authorisation, logging and manual override. It is described only at that level.
- No DIY wiring instructions. A qualified electrician is required.

## 7. Demonstrated apartment project (F-14) presentation
Present it as **one project's engineering**: list subsystems integrated, the method category, and limitations. Every element needs consent (DR-032) and screening (doc 14 §5). Do not generalise it to the product's native capabilities.

## Change log
2.0-draft, 2026-10-13: created.

## Next review decision
ENG supplies test reports (E-13/E-14). The matrix is filled and reviewed before any integration page is published.

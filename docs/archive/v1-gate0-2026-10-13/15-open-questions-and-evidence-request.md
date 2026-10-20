# 15 — Open Questions and Evidence Request

Priority: **P0** = blocks the next gate · **P1** = blocks MVP-A build/content · **P2** = blocks MVP-B/C.

## A. Workspace and GitHub (P0)
| ID | Question | Why it matters |
|---|---|---|
| Q-G1 | The authenticated GitHub account on this machine is **`morapua2030`**, not `ahmedatia`. Which applies? (a) add/log in `ahmedatia` on this machine via `gh auth login` (browser/device flow, done by you); (b) create the repo under `ahmedatia` from another machine and add `morapua2030` as a collaborator; (c) use `morapua2030` or a GitHub organisation (e.g. an OTONOM org) as the owner instead | Ownership of company code |
| Q-G2 | Approve the proposed repo: name `otonom-smart-home-web`, **private**, default branch `main`, owner per Q-G1? | Repo creation |
| Q-G3 | Which Git author identity (name + email) should commits use in this repo? | Global `user.name`/`user.email` are unset |
| Q-G4 | Will implementation run on this Windows laptop (Claude Code) or in Google Antigravity? | Persistence, tooling, re-audit |
| Q-G5 | May I install PostgreSQL natively on `D:` for integration tests (later gate)? | Docker not present. `C:` has only 14 GB free |

## B. Business and finance (P0/P1)
| ID | Question |
|---|---|
| Q-B1 | North Star: Website-Sourced only (recommended, with Total Influenced as companion) or Total Influenced? |
| Q-B2 | Which contract types count as "eligible" (project, supply-only, service, maintenance)? |
| Q-B3 | Contract value: pre- or post-tax? Treatment of amendments, cancellations, multi-year and recurring contracts? FX rule? |
| Q-B4 | Customer entity matching: is the tax registration number reliably available for B2B customers? Do developer groups with several companies count as one customer? |
| Q-B5 | Will you provide a list of past customers + first contract dates so New/Existing is correct from day one? |
| Q-B6 | Who approves contract-value corrections and attribution overrides while there is one admin? Can a second person receive a weekly review digest? |

## C. Operations (P1)
| ID | Question |
|---|---|
| Q-O1 | Installation coverage: which governorates/cities, and what monthly project capacity? |
| Q-O2 | Paid site survey: price, whether it is credited against the contract, how it is invoiced |
| Q-O3 | Target response SLAs for RFQs |
| Q-O4 | Which e-wallets / instant-transfer methods will you accept, and which bank account details will be shown? |

## D. Product and commerce (P2, but early answers help)
| ID | Question |
|---|---|
| Q-P1 | SKU naming scheme and the list of standard variants/options per model, with prices |
| Q-P2 | VAT treatment of displayed prices (inclusive/exclusive) |
| Q-P3 | Shipping fee table by zone |
| Q-P4 | Order confirmation rules per order type. Do you accept my proposal in doc 08 §2? Reservation expiry? Backorders? |
| Q-P5 | Serial number format and where serials are currently stored (spreadsheet, DB, firmware?) |
| Q-P6 | Warranty duration, exclusions, start rule for non-installed retail units |
| Q-P7 | App store publication timeline for the Android/iOS apps |

## E. Evidence request (P1) — please provide files; nothing is published without them
| # | Evidence | Used for |
|---|---|---|
| E1 | Vector logo (SVG/AI/EPS), colour codes, font files + **web licence** (Latin + Arabic) | Brand (D-015) |
| E2 | Datasheets for 4/6/16-channel controllers (ratings, max load per channel, power, dimensions, firmware version) | Product pages |
| E3 | Safety/quality test reports and any certifications (CE, EOS/Egyptian standards, etc.) | Claims |
| E4 | Integration test notes for Alexa, Apple Home, Google Home, Home Assistant: method (native, Matter, HomeKit bridge, Home Assistant integration…), versions, date, limitations | Integrations page |
| E5 | Description of local operation: what works without internet, what needs cloud | Technology page |
| E6 | **Signed written consent** from the apartment project owner (scope: name, photos, video, location) | Case study (D-013) |
| E7 | Project photos/videos (originals) for the case study | Case study |
| E8 | Existing RMA procedure documents | Doc 08 §9 alignment |
| E9 | Any existing policy drafts (shipping, returns, terms, privacy, warranty) | Legal pages |
| E10 | Legal entity details to show on the site (registered name, address if public, commercial registry no.) | Footer, JSON-LD |

## F. Infrastructure (P1, see doc 13 §5)
Q-I1 … Q-I5.

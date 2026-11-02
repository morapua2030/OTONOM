# OTONOM Claude Code operating context

- Read `AGENTS.md` first (binding rules), then `docs/ai/README.md`, `docs/ai/CURRENT_STATUS.md`, `docs/ai/NEXT_ACTIONS.md` and `docs/04-decision-register.md`.
- Owner communication is in Egyptian Arabic; code and docs are in English. Progress updates are exactly three Arabic lines: `تم:`, `جاري:`, `النتيجة:`.
- Plan with the owner and propose ideas; implement new scope only after approval. After approval: implementation first, clean code, targeted tests.
- Production is frozen: no merge of PR #16 and no promotion without an explicit owner release command and fresh G01–G16 evidence on the exact candidate.
- Public personal-data intake, commerce, payments, warranty activation and device control stay disabled.
- Check branch and dirty state before writing; never force-push, reset, delete or overwrite others' work. Active work lives in the Codex worktree, not the `D:\otonom` root checkout.
- Never invent product specs, prices, inclusions, clients, tests or deployments.
- Update `docs/ai/CURRENT_STATUS.md` and the decision register after each verified milestone.

<!-- OTONOM BRAND GUARDIAN: BEGIN -->
## OTONOM — Visual Identity Protection

For any OTONOM public-facing design, UI, website, app, packaging, brand image, marketing deliverable, or refactor, **load and follow** `.claude/skills/otonom-brand-guardian/SKILL.md` and its asset selection/QA references **before making changes**. Use the exact supplied Hybrid 03 SVG logo and brand tokens. The logo is `OTONOM` with a fixed knob-left horizontal toggle replacing the third O; do not redraw, animate, recolor, mirror or substitute it. Run `python .claude/skills/otonom-brand-guardian/scripts/validate_brand.py` as a visual-brand asset gate. If the user requests changing the master mark, stop for explicit scope/approval; do not silently replace. Respect this repository's other safety and approval rules. If the Brand Guardian skill folder is not present in your checkout, use the locked assets in `app/web/public/brand/otonom/` and `docs/WEB_DESIGN_SYSTEM.md`, and do not create or alter logo artwork.
<!-- OTONOM BRAND GUARDIAN: END -->

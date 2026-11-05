# Verification tools (local, synthetic data)

Release verification helpers used next to `run-all.sh`. Local Windows + Git Bash + headless Edge only; nothing here
deploys or touches a hosted service. Every server runs a production build (`next build` first) on `127.0.0.1:3301`
against a **disposable clone** of the development database (`otonom_test_tools_*`): `otonom_dev` is only read with
`pg_dump`, and each script drops its clone again. Cluster defaults are the same as `run-all.sh`
(`OTONOM_PG_BIN`, `OTONOM_PG_SUPERUSER_PW_FILE`); the scripts never print a credential.

Write outputs **outside the repository** (or into a git-ignored folder): they are local results, not source.

| Script | Purpose |
| --- | --- |
| `verify-chain.sh <out> [ref-shots] [lcp-baseline.json]` | The full release chain on the current commit; per-step exit codes in `<out>/chain-steps.tsv`, clone timing in `<out>/clone-times.tsv`; exits 1 if any step failed. The optional inputs are resolved against the caller's directory before the chain changes directory; a given input that is missing fails its step. |
| `serve-clone.sh <out> [audit\|public\|perf\|flags]` / `teardown-clone.sh <out>` | Clone + server that stays up / stop it and drop the clone. |
| `browser-suites.sh <public\|flags> <out>` | Edge suites: public = hybrid03, d4, sim; flags = d3, wave1 (run-all harness flags). |
| `hosts-sim.sh <out>` | Both Production hosts at the proxy layer (`src/hosts.ts`), Production marketing-only mode with an example admin origin and synthetic secrets. |
| `perf.sh <out>` | `src/perf.ts` plus `perf-pages.mjs` (mobile 360×800 @2x, 5 cold + 1 warm per page). |
| `perf-lcp-rule.mjs <baseline> <perf-pages.json>` | Median cold LCP per page ≤ baseline + 50 ms (exit 1); exit 2 when there is nothing to compare (missing file, empty baseline, no cold runs). |
| `audit/` (`inventory`, `browser-audit`, `link-crawl`, `analyze`, `routes`) | D8-A audit: route inventory/SEO, axe + keyboard + layout per route × locale × width, internal links, merged findings (must be zero). |
| `meta-scan.mjs <base>` / `char-scan.mjs <base>` | No bidi marks or double spaces in title/meta text; no glyphs outside the Arabic font subset. |
| `js-weight.mts`, `sim-shots.mts`, `pixdiff.py` | JS bytes per page; screenshots of `/try` states and entry pages; pixel diff of two screenshot folders (Pillow; exit 2 when a folder is missing, 1 when nothing was compared). |
| `lcp-probe.mts`, `lcp-timing.mts`, `perf-summary.py`, `woff2-cmap.mjs` | Font/LCP investigation helpers (LCP element + platform font, cold timing, before/after table, WOFF2 coverage). |

Server modes: `audit` = no flags (what visitors get outside Vercel); `public` = `OTONOM_TRUST_PROXY=1`;
`perf` = `OTONOM_TRUST_PROXY=1 OTONOM_TEST_PAGES=1` (profile of the performance baselines); `flags` = run-all harness flags.

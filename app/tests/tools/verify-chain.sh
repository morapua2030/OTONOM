#!/usr/bin/env bash
# verify-chain.sh <evidence-out> [reference-shots-dir] [lcp-baseline.json]
# Full local release verification on the CURRENT commit (one SHA): typecheck, brand gate, dependency audit, run-all,
# both Production hosts (proxy layer), public + flag browser suites, the D8-A audit (inventory, axe/keyboard browser
# audit, link crawl, findings must be zero), meta/char scans, JS weight, screenshots (+ pixel diff against the
# reference shots when given) and performance (+ the LCP rule when a baseline is given).
# Every step's exit code goes to <evidence-out>/chain-steps.tsv; the chain exits 1 if any step failed (same rule as
# run-all). Disposable database clones only; otonom_dev is only read. Write <evidence-out> outside the repository
# (or in a git-ignored folder): it holds local results. Pixel diff needs Python with Pillow (OTONOM_PY, default python).
set -u
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"
E="$1"; REF_SHOTS="${2:-}"; BASELINE="${3:-}"
PY="${OTONOM_PY:-python}"
mkdir -p "$E"; E="$(cd "$E" && pwd -P)"
m() { command -v cygpath >/dev/null 2>&1 && cygpath -m "$1" || echo "$1"; }
w() { command -v cygpath >/dev/null 2>&1 && cygpath -w "$1" || echo "$1"; }
: > "$E/chain-steps.tsv"; : > "$E/chain-skipped.txt"; : > "$E/clone-times.tsv"
rec() { echo -e "$1\t$2" >> "$E/chain-steps.tsv"; echo "[$1] exit=$2"; }
clone_time() { [ -f "$2/clone-seconds.txt" ] && echo -e "$1\t$(cat "$2/clone-copy-seconds.txt" 2>/dev/null)\t$(cat "$2/clone-seconds.txt")" >> "$E/clone-times.tsv"; }
cd "$WT"
SHA=$(git rev-parse HEAD); echo "$SHA" > "$E/sha.txt"; git status --short > "$E/tree-status.txt"
echo "sha=$SHA dirty=$(wc -l < "$E/tree-status.txt")"
echo -e "step\tcopy_s\ttotal_s" > "$E/clone-times.tsv"

# 0) static gates
(cd "$APP/web" && npx --no-install tsc --noEmit -p . > "$E/tsc-web.log" 2>&1); rec tsc-web $?
(python .claude/skills/otonom-brand-guardian/scripts/validate_brand.py --project app/web > "$E/brand.log" 2>&1); rec brand $?
(cd "$APP" && pnpm audit --prod > "$E/audit.log" 2>&1); rec pnpm-audit $?

# 1) run-all: must exit 0 with every steps.tsv row 0
(cd "$APP/tests" && bash run-all.sh > "$E/run-all.out" 2>&1); rec run-all $?
R0="$APP/tests/results/run-all"
cp -f "$R0/steps.tsv" "$E/run-all-steps.tsv"; cp -f "$R0/summary.json" "$E/run-all-summary.json"; cp -f "$R0/run-all-selftest.log" "$E/" 2>/dev/null
cp -f "$APP/tests/results/visual-latest.json" "$APP/tests/results/final-release-latest.json" "$APP/tests/results/final-shots-latest.json" "$E/" 2>/dev/null
[ -f "$R0/database-clone-seconds.tsv" ] && echo -e "run-all\t$(awk -F'\t' '$1=="copy"{print $2}' "$R0/database-clone-seconds.tsv")\t$(awk -F'\t' '$1=="total"{print $2}' "$R0/database-clone-seconds.tsv")" >> "$E/clone-times.tsv"
awk -F'\t' '$2 != 0 { bad=1 } END { exit bad }' "$E/run-all-steps.tsv"; rec run-all-steps-tsv-all-zero $?
echo "[sha-after-run-all] $(git rev-parse HEAD)"; cat "$E/run-all-steps.tsv"

# 2) both Production hosts (proxy layer), 3) browser suites on the production build
bash "$TOOLS_DIR/hosts-sim.sh" "$E/hosts" > "$E/hosts.out" 2>&1; rec hosts-both $?; cat "$E/hosts.out"; clone_time hosts "$E/hosts"
bash "$TOOLS_DIR/browser-suites.sh" public "$E" > "$E/suites-public.out" 2>&1; rec suites-public $?; cat "$E/suites-public.out"; clone_time suites-public "$E/browser-suites-public"
bash "$TOOLS_DIR/browser-suites.sh" flags "$E" > "$E/suites-flags.out" 2>&1; rec suites-flags $?; cat "$E/suites-flags.out"; clone_time suites-flags "$E/browser-suites-flags"

# 4) D8-A audit + scans + JS weight + screenshots on a no-flags server (what visitors get)
A="$E/d8a-recheck"; mkdir -p "$A"
bash "$TOOLS_DIR/serve-clone.sh" "$E/audit-server" audit > "$E/audit-server.out" 2>&1; cat "$E/audit-server.out"; clone_time audit "$E/audit-server"
cd "$APP/tests"
node "$TOOLS_DIR/audit/inventory.mjs" "$BASE" "$(m "$A")" > "$A/inventory.log" 2>&1; rec inventory $?
npx --no-install tsx "$TOOLS_DIR/audit/browser-audit.mts" "$BASE" "$(m "$A")" > "$A/browser-audit.log" 2>&1; rec browser-audit $?
node "$TOOLS_DIR/audit/link-crawl.mjs" "$BASE" "$(m "$A")" > "$A/link-crawl.log" 2>&1; rec link-crawl $?
node "$TOOLS_DIR/audit/analyze.mjs" "$(m "$A")" "$SHA" after > "$A/analyze.log" 2>&1; rec analyze $?
node -e "const f=require(process.argv[1]);const n=(f.findings||[]).length;console.log(JSON.stringify({findings:n,byCheck:f.byCheck}));process.exit(n?1:0)" "$(m "$A/findings-after.json")" > "$A/findings-check.json"; rec d8a-findings-zero $?
cat "$A/findings-check.json"
node "$TOOLS_DIR/meta-scan.mjs" "$BASE" > "$E/meta-scan.json"; node -e "const j=require(process.argv[1]);console.log('routes',j.routes,'bad',j.bad);process.exit(j.bad?1:0)" "$(m "$E/meta-scan.json")"; rec meta-scan-plain $?
node "$TOOLS_DIR/char-scan.mjs" "$BASE" > "$E/char-scan.json"; node -e "const j=require(process.argv[1]);console.log('pages',j.pages,'dropped',JSON.stringify(j.dropped));process.exit(Object.keys(j.dropped).length?1:0)" "$(m "$E/char-scan.json")"; rec char-scan-subset $?
npx --no-install tsx "$TOOLS_DIR/js-weight.mts" "$BASE" "$(m "$E/js-after.json")" "$(m "$E/.edge-js-weight")" 9396 > "$E/js-after.log" 2>&1; rec js-weight $?
rm -rf "$E/shots-after"; npx --no-install tsx "$TOOLS_DIR/sim-shots.mts" "$BASE" "$(m "$E/shots-after")" "$(m "$E/.edge-shots")" 9397 390,1440 > "$E/shots-after.log" 2>&1; rec shots-after $?
if [ -n "$REF_SHOTS" ]; then "$PY" "$TOOLS_DIR/pixdiff.py" "$(w "$REF_SHOTS")" "$(w "$E/shots-after")" > "$E/pixdiff.json" 2> "$E/pixdiff.err"; rec pixdiff $?; else echo "pixdiff (no reference shots given)" >> "$E/chain-skipped.txt"; fi
bash "$TOOLS_DIR/teardown-clone.sh" "$E/audit-server"

# 5) performance (perf.ts + per-page weight, fonts and LCP), then the LCP rule against the baseline
bash "$TOOLS_DIR/perf.sh" "$E" > "$E/perf.out" 2>&1; rec perf $?; cat "$E/perf.out"; clone_time perf "$E/perf"
if [ -n "$BASELINE" ]; then node "$TOOLS_DIR/perf-lcp-rule.mjs" "$(m "$BASELINE")" "$(m "$E/perf/perf-pages.json")" > "$E/perf-lcp-rule.json"; rec perf-lcp-rule $?; cat "$E/perf-lcp-rule.json"; else echo "perf-lcp-rule (no baseline given)" >> "$E/chain-skipped.txt"; fi

cd "$WT"; echo "[sha-end] $(git rev-parse HEAD) dirty=$(git status --short | wc -l)"
echo "--- clone times (s)"; cat "$E/clone-times.tsv"
echo "--- skipped"; cat "$E/chain-skipped.txt"
echo "--- chain steps"; cat "$E/chain-steps.tsv"
awk -F'\t' '$2 != 0 { print "FAILED CHAIN STEP: " $1 " (exit " $2 ")"; bad=1 } END { exit bad }' "$E/chain-steps.tsv"; FINAL=$?
[ "$FINAL" = 0 ] && echo "CHAIN PASSED" || echo "CHAIN FAILED"
exit $FINAL

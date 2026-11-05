# Shared by run-all.sh and its self-test (src/run-all-exit.test.ts). Sourced, not executed. Requires $OUT.
# step: runs one step, logs it to $OUT/<name>.log and appends "<name>\t<exit>\t<seconds>" to $OUT/steps.tsv.
# run_all_verdict: the release-gate decision. It returns 1 (and names every failure) when any steps.tsv row has a
# non-zero exit, when summary.json is missing or unreadable, when total.fail > 0, or when any suite has no fresh result.
# It returns 0 only when every recorded step passed and the summary agrees.

step() { # name, command...
  local name=$1; shift
  local t0=$(date +%s)
  ( "$@" ) > "$OUT/$name.log" 2>&1
  local rc=$?
  echo -e "$name\t$rc\t$(( $(date +%s) - t0 ))" >> "$OUT/steps.tsv"
  echo "[$name] exit=$rc ($(( $(date +%s) - t0 ))s)"
}

# TEST-ONLY hook: OTONOM_RUN_ALL_SELFTEST_INJECT_FAILURE=1 appends one extra fake step that always fails. It runs in
# addition to the real steps (it never replaces or skips one), so the run must end non-zero.
inject_selftest_failure() {
  if [ "${OTONOM_RUN_ALL_SELFTEST_INJECT_FAILURE:-}" = 1 ]; then
    step selftest-injected-failure sh -c 'echo "test-only injected failing step (OTONOM_RUN_ALL_SELFTEST_INJECT_FAILURE=1)"; exit 1'
  fi
}

run_all_verdict() {
  local failed=0 name rc secs
  if [ ! -s "$OUT/steps.tsv" ]; then
    echo "RUN-ALL FAILED: no step was recorded in steps.tsv"
    return 1
  fi
  while IFS=$'\t' read -r name rc secs; do
    [ -z "$name" ] && continue
    if [ "$rc" != 0 ]; then echo "FAILED STEP: $name (exit $rc)"; failed=1; fi
  done < "$OUT/steps.tsv"
  local dir="$OUT"
  if command -v cygpath >/dev/null 2>&1; then dir="$(cygpath -m "$OUT")"; fi
  node -e "
const fs = require('fs'), path = require('path');
let s;
try { s = JSON.parse(fs.readFileSync(path.join(process.argv[1], 'summary.json'), 'utf8')); }
catch { console.log('FAILED: summary.json is missing or unreadable'); process.exit(1); }
let bad = 0;
const fail = s && s.total ? s.total.fail : undefined;
if (typeof fail !== 'number') { console.log('FAILED: summary.json has no total.fail'); bad = 1; }
else if (fail > 0) { console.log('FAILED: summary total.fail = ' + fail); bad = 1; }
for (const [name, suite] of Object.entries((s && s.suites) || {})) {
  if (suite && typeof suite.error === 'string' && suite.error.includes('NO FRESH RESULT')) { console.log('FAILED SUITE: ' + name + ' (' + suite.error + ')'); bad = 1; }
  else if (suite && typeof suite.fail === 'number' && suite.fail > 0) console.log('FAILED SUITE: ' + name + ' (' + suite.fail + ' failed)');
}
process.exit(bad);
" "$dir" || failed=1
  if [ "$failed" = 0 ]; then echo "RUN-ALL PASSED: every step exited 0 and the summary has no failure"; else echo "RUN-ALL FAILED (exit 1)"; fi
  return "$failed"
}

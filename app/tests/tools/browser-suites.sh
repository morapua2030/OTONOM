#!/usr/bin/env bash
# browser-suites.sh <public|flags> <out-dir>: Edge browser suites against the production build on a disposable clone.
#   public — hybrid03, d4 and sim (what visitors get); flags — d3 and wave1 (run-all harness flags).
# Exit 1 when any suite fails (each suite's own exit code is printed); 2/3 on clone or server failure.
set -u
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"
MODE="$1"; OUT="$2/browser-suites-$MODE"
mkdir -p "$OUT"
trap 'stop_port; [ -n "${CLONE_DB:-}" ] && clone_drop "$CLONE_DB"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
clone_create "$OUT" || exit 2
c=$(start_server "$MODE" "$OUT"); echo "clone=$CLONE_DB ($(cat "$OUT/clone-seconds.txt") s) server ready=$c"
[ "$c" = 200 ] || exit 3
cd "$APP/tests"
export OTONOM_BASE="$BASE"
FAIL=0
run() { local name=$1; shift; "$@" > "$OUT/$name.log" 2>&1; local rc=$?; echo "[$name] exit=$rc"; [ "$rc" = 0 ] || FAIL=1; }
w() { command -v cygpath >/dev/null 2>&1 && cygpath -w "$1" || echo "$1"; }
if [ "$MODE" = public ]; then
  run hybrid03 env OTONOM_HYBRID03_EVIDENCE_DIR="$(w "$OUT/hybrid03")" npx --no-install tsx src/hybrid03-browser.ts
  run d4 env OTONOM_D4_EVIDENCE_DIR="$(w "$OUT/d4")" npx --no-install tsx src/d4-browser.ts
  run sim env OTONOM_SIM_EVIDENCE_DIR="$(w "$OUT/sim")" npx --no-install tsx src/sim-browser.ts
else
  run d3 env OTONOM_D3_EVIDENCE_DIR="$(w "$OUT/d3")" npx --no-install tsx src/d3-browser.ts
  run wave1 env OTONOM_WAVE1_EVIDENCE_DIR="$(w "$OUT/wave1")" npx --no-install tsx src/wave1-browser.ts
fi
[ "$FAIL" = 0 ] && echo "SUITES PASSED" || echo "SUITES FAILED"
exit $FAIL

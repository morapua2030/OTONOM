#!/usr/bin/env bash
# perf.sh <out-dir>: informational performance on the production build and a disposable clone: src/perf.ts plus
# perf-pages.mjs (mobile 360×800 @2x, cold + warm, LCP, bytes by type, fonts). No thresholds here; the release rule is
# applied by verify-chain.sh against a baseline file.
set -u
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"
OUT="$1/perf"; mkdir -p "$OUT"
trap 'stop_port; [ -n "${CLONE_DB:-}" ] && clone_drop "$CLONE_DB"' EXIT
clone_create "$OUT" || exit 2
c=$(start_server perf "$OUT"); echo "server ready=$c"
[ "$c" = 200 ] || exit 3
w() { command -v cygpath >/dev/null 2>&1 && cygpath -w "$1" || echo "$1"; }
FAIL=0
cd "$APP/tests"
npx --no-install tsx src/perf.ts > "$OUT/perf.log" 2>&1; rc=$?; echo "[perf.ts] exit=$rc"; [ "$rc" = 0 ] || FAIL=1
cp -f "$APP/tests/results/perf-latest.json" "$OUT/perf-latest.json" 2>/dev/null
node "$TOOLS_DIR/perf-pages.mjs" "$(w "$OUT/.edge-profile-perf-pages")" "$(w "$OUT/perf-pages.json")" "$BASE" > "$OUT/perf-pages.log" 2>&1; rc=$?; echo "[perf-pages] exit=$rc"; [ "$rc" = 0 ] || FAIL=1
exit $FAIL

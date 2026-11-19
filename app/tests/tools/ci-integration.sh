#!/usr/bin/env bash
# CI integration run (audit C5-01 / C2-01): the domain DB tests and the HTTP suites, against a FRESH synthetic database
# built from the migrations and seeds in a disposable PostgreSQL (CI: a container started by the workflow).
#
# Needs: OTONOM_PG_PORT, OTONOM_PG_SUPERUSER, OTONOM_PG_SUPERUSER_PW_FILE (a file outside the repository).
# Refuses to run when any hosted database URL is set: every connection goes to 127.0.0.1 with generated local secrets.
# Browser suites (csp-edge, e2e, visual, final-shots) need Edge and stay in the local run-all.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
APP="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
OUT="$APP/tests/results/ci-integration"
PORT=3301
BASE="http://127.0.0.1:$PORT"
: "${OTONOM_PG_PORT:?OTONOM_PG_PORT is required}" "${OTONOM_PG_SUPERUSER:?OTONOM_PG_SUPERUSER is required}" "${OTONOM_PG_SUPERUSER_PW_FILE:?OTONOM_PG_SUPERUSER_PW_FILE is required}"
for v in OTONOM_ADMIN_DATABASE_URL OTONOM_DOMAIN_DATABASE_URL OTONOM_CMS_DATABASE_URL DATABASE_URL POSTGRES_URL; do
  if [ -n "${!v:-}" ]; then echo "refusing: $v is set (this script only uses the local disposable cluster)"; exit 2; fi
done
# A disposable database name: the migration target guard and the suites accept only otonom_test_* / otonom_e2e_*.
export OTONOM_PG_HOST=127.0.0.1 OTONOM_DB=otonom_e2e_ci
mkdir -p "$OUT"
rm -f "$OUT"/*.log "$OUT/steps.tsv"
for s in acceptance surface journey cms portal security final-release fixes-20261115 pool-production; do rm -f "$APP/tests/results/$s-latest.json"; done

# Same synthetic test switches as run-all.sh (local/CI only; never set on Vercel).
SERVER_ENV=(OTONOM_TRUST_PROXY=1 OTONOM_TEST_PAGES=1 OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS=1 OTONOM_ENABLE_SYNTHETIC_RFQ_TESTS=1
  OTONOM_OWNER_EMAIL_OTP_REQUIRED=1 OTONOM_OWNER_EMAIL_OTP_ACCOUNT=otp-owner@otonom.local OTONOM_EMAIL_OTP_ALLOWED_RECIPIENT=otp-owner@otonom.local
  OTONOM_EMAIL_OTP_PEPPER=synthetic-email-otp-pepper-for-tests-2026 OTONOM_EMAIL_PROVIDER=test OTONOM_EMAIL_TEST_MODE=1 OTONOM_EMAIL_OTP_TEST_CODE=483921
  CRON_SECRET=synthetic-cron-secret-for-local-tests-only-2026 OTONOM_LEADS_NOTIFY_TO=team@otonom.local)

failed=0
step() { # step <name> <command...>: runs, logs, records the exit code; a failing step does not stop the run
  local name="$1"; shift
  local t0=$(date +%s)
  "$@" > "$OUT/$name.log" 2>&1
  local rc=$?
  printf '%s\t%s\t%s\n' "$name" "$rc" "$(( $(date +%s) - t0 ))" >> "$OUT/steps.tsv"
  if [ "$rc" -ne 0 ]; then failed=1; echo "FAIL $name (exit $rc)"; tail -n 40 "$OUT/$name.log"; else echo "ok   $name"; fi
  return 0
}
must() { # must <name> <command...>: a setup step; the run stops when it fails
  step "$@"
  if [ "$(tail -n 1 "$OUT/steps.tsv" | cut -f2)" != 0 ]; then echo "setup step $1 failed: stopping"; exit 1; fi
}

SERVER_PID=""
start_server() { # start_server <log name> [extra env...]
  local log="$1"; shift
  (cd "$APP/web" && exec env "${SERVER_ENV[@]}" "$@" npx --no-install next start -H 127.0.0.1 -p "$PORT") > "$OUT/$log.log" 2>&1 &
  SERVER_PID=$!
  local c=000
  for _ in $(seq 1 120); do c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/ready" || true); [ "$c" = 200 ] && break; sleep 1; done
  echo "server ($log) ready=$c"
  [ "$c" = 200 ] || { tail -n 60 "$OUT/$log.log"; exit 1; }
}
stop_server() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  if command -v fuser >/dev/null 2>&1; then fuser -k "$PORT/tcp" >/dev/null 2>&1 || true; fi
  # local dry runs on Windows (Git Bash): stop whatever listens on the port, as run-all.sh does
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "\$c = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue; if (\$c) { Stop-Process -Id \$c.OwningProcess -Force }" > /dev/null 2>&1 || true
  fi
  for _ in $(seq 1 30); do curl -s -o /dev/null "$BASE/api/ready" || break; sleep 1; done
  SERVER_PID=""
}
trap stop_server EXIT

# 1. Domain DB tests (each test file creates its own otonom_test_* database and the local roles).
cd "$APP/packages/domain" && step domain pnpm test
# 2. A fresh database: roles + domain migrations, Payload migrations, synthetic seed, site content.
cd "$APP/web" && must db-setup npx --no-install tsx scripts/setup.ts
cd "$APP/web" && must payload-migrate sh -c 'npx --no-install payload migrate < /dev/null'
cd "$APP/web" && must seed npx --no-install tsx scripts/seed.ts
cd "$APP/web" && must seed-content npx --no-install tsx scripts/seed-site-content.ts
# 3. Production build, then every HTTP suite against `next start`.
cd "$APP/web" && must build npx --no-install next build
start_server server
cd "$APP/tests"
for s in acceptance surface journey cms portal security final-release fixes-20261115; do
  step "$s" env OTONOM_BASE="$BASE" OTONOM_TEST_CRON_SECRET=synthetic-cron-secret-for-local-tests-only-2026 npx --no-install tsx "src/$s.ts"
done
stop_server
# 4. The Production pool setting (2026-11-15 incident): every admin save must finish, concurrent saves must not deadlock.
start_server server-pool-production OTONOM_PG_POOL_MAX=2
cd "$APP/tests" && step pool-production env OTONOM_BASE="$BASE" OTONOM_PG_POOL_MAX=2 npx --no-install tsx src/pool-production.ts
stop_server

echo "--- steps (name, exit, seconds) ---"
cat "$OUT/steps.tsv"
# A suite that exits 0 but wrote no fresh result also fails the run.
for s in acceptance surface journey cms portal security final-release fixes-20261115 pool-production; do
  f="$APP/tests/results/$s-latest.json"
  if [ ! -f "$f" ]; then echo "FAIL $s: no fresh result file"; failed=1; continue; fi
  node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(process.argv[2],"total="+j.total,"failed="+j.failed);process.exit(j.failed?1:0)' "$f" "$s" || failed=1
done
exit "$failed"

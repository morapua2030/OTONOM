# Shared helpers for the verification tools in app/tests/tools (sourced, not executed). Local Windows + Git Bash,
# synthetic data only. The development database otonom_dev is only ever READ (pg_dump); every server runs on a
# disposable clone named otonom_test_tools_<time>_<pid>, which the same tools drop again. Nothing here deploys.
TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
APP="$(cd "$TOOLS_DIR/../.." && pwd -P)"
WT="$(cd "$APP/.." && pwd -P)"
# Same local cluster defaults as run-all.sh; override with OTONOM_PG_BIN and OTONOM_PG_SUPERUSER_PW_FILE (POSIX path).
PG="${OTONOM_PG_BIN:-/d/otonom/spike/architecture-feasibility-20261014/tools/pgsql/bin}"
PG_PW_FILE="${OTONOM_PG_SUPERUSER_PW_FILE:-/d/otonom/spike/architecture-feasibility-20261014/.local-secrets/pg_superuser_pw.txt}"
if command -v cygpath >/dev/null 2>&1; then export OTONOM_PG_SUPERUSER_PW_FILE="$(cygpath -w "$PG_PW_FILE")"; else export OTONOM_PG_SUPERUSER_PW_FILE="$PG_PW_FILE"; fi
PORT=3301
BASE="http://127.0.0.1:$PORT"

# Synthetic flags of the local test harness (identical to run-all.sh).
HARNESS_FLAGS=(OTONOM_TRUST_PROXY=1 OTONOM_TEST_PAGES=1 OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS=1 OTONOM_ENABLE_SYNTHETIC_RFQ_TESTS=1
  OTONOM_OWNER_EMAIL_OTP_REQUIRED=1 OTONOM_OWNER_EMAIL_OTP_ACCOUNT=otp-owner@otonom.local OTONOM_EMAIL_OTP_ALLOWED_RECIPIENT=otp-owner@otonom.local
  OTONOM_EMAIL_OTP_PEPPER=synthetic-email-otp-pepper-for-tests-2026 OTONOM_EMAIL_PROVIDER=test OTONOM_EMAIL_TEST_MODE=1 OTONOM_EMAIL_OTP_TEST_CODE=483921
  CRON_SECRET=synthetic-cron-secret-for-local-tests-only-2026 OTONOM_LEADS_NOTIFY_TO=team@otonom.local)

stop_port() { powershell.exe -NoProfile -Command "\$c = Get-NetTCPConnection -LocalPort ${1:-$PORT} -State Listen -ErrorAction SilentlyContinue; if (\$c) { Stop-Process -Id \$c.OwningProcess -Force }" > /dev/null 2>&1 || true; }

wait_ready() { # url [host-header]
  local c=000
  for _ in $(seq 1 90); do
    if [ -n "${2:-}" ]; then c=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $2" "$1"); else c=$(curl -s -o /dev/null -w "%{http_code}" "$1"); fi
    [ "$c" = 200 ] && break
    sleep 1
  done
  echo "$c"
}

# clone_create <out-dir>: dump otonom_dev → new disposable clone → domain migrations → Payload migrations → content
# seed (all on the CLONE only). Sets CLONE_DB, writes <out>/clone-name.txt, <out>/clone-copy-seconds.txt (dump +
# restore) and <out>/clone-seconds.txt (copy + migrations + seed). Never prints secrets.
clone_create() {
  local out="$1" t0
  t0=$(date +%s)
  mkdir -p "$out"
  CLONE_DB="otonom_test_tools_$(date +%Y%m%d_%H%M%S)_$$"
  local dump="$out/$CLONE_DB.dump"
  PGHOST=127.0.0.1 PGPORT=5433 PGUSER=spike_admin PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/pg_dump.exe" -Fc -d otonom_dev -f "$dump" > "$out/database-clone.log" 2>&1
  PGHOST=127.0.0.1 PGPORT=5433 PGUSER=spike_admin PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/psql.exe" -q -d postgres -c "CREATE DATABASE $CLONE_DB" >> "$out/database-clone.log" 2>&1
  echo "$CLONE_DB" > "$out/clone-name.txt"
  PGHOST=127.0.0.1 PGPORT=5433 PGUSER=spike_admin PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/pg_restore.exe" -d "$CLONE_DB" "$dump" >> "$out/database-clone.log" 2>&1
  rm -f "$dump"
  echo $(( $(date +%s) - t0 )) > "$out/clone-copy-seconds.txt"
  (cd "$APP/packages/domain" && OTONOM_DB="$CLONE_DB" npx --no-install tsx -e "import('./src/migrate.ts').then(async (m) => console.log(JSON.stringify(await m.migrate())))" > "$out/database-migrate.log" 2>&1) || { echo "clone domain migration failed"; return 2; }
  (cd "$APP/web" && OTONOM_DB="$CLONE_DB" npx --no-install payload migrate < /dev/null > "$out/payload-migrate.log" 2>&1) || { echo "clone Payload migration failed"; return 2; }
  (cd "$APP/web" && OTONOM_DB="$CLONE_DB" npx --no-install tsx scripts/seed-site-content.ts < /dev/null > "$out/content-seed.log" 2>&1) || { echo "clone content seed failed"; return 2; }
  PGHOST=127.0.0.1 PGPORT=5433 PGUSER=spike_admin PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/psql.exe" -q -d "$CLONE_DB" -c 'DELETE FROM domain.rate_limits' > /dev/null 2>&1
  echo $(( $(date +%s) - t0 )) > "$out/clone-seconds.txt"
}

# clone_drop <name>: drops one disposable clone made by these tools or by the test harness (never anything else).
clone_drop() {
  local db="$1" left
  case "$db" in otonom_test_tools_*|otonom_test_browser_*) ;; *) echo "refusing to drop '$db'"; return 2;; esac
  PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/psql.exe" -h 127.0.0.1 -p 5433 -U spike_admin -q -d postgres -c "DROP DATABASE IF EXISTS $db WITH (FORCE)" > /dev/null 2>&1
  left=$(PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/psql.exe" -h 127.0.0.1 -p 5433 -U spike_admin -At -d postgres -c "SELECT count(*) FROM pg_database WHERE datname='$db'")
  echo "clone $db dropped: $([ "$left" = 0 ] && echo yes || echo NO)"
}

# start_server <mode> <out>: production build on 127.0.0.1:3301 against $CLONE_DB.
#   audit   — no flags at all (exactly what visitors get outside Vercel; D8-A audit, scans, screenshots)
#   public  — OTONOM_TRUST_PROXY=1 only (public browser suites; per-client rate limits behind a local proxy)
#   perf    — OTONOM_TRUST_PROXY=1 OTONOM_TEST_PAGES=1 (the profile the performance baselines were measured with)
#   flags   — the run-all harness flags (legacy harness pages, synthetic commerce/RFQ, test e-mail)
start_server() {
  local mode="$1" out="$2" flags=()
  case "$mode" in
    audit) ;;
    public) flags=(OTONOM_TRUST_PROXY=1) ;;
    perf) flags=(OTONOM_TRUST_PROXY=1 OTONOM_TEST_PAGES=1) ;;
    flags) flags=("${HARNESS_FLAGS[@]}") ;;
    *) echo "unknown server mode '$mode'"; return 2 ;;
  esac
  stop_port
  # The whole background group writes to server.log (never to the caller's stdout), so `$(start_server ...)` returns
  # as soon as the server is ready instead of waiting for the server to exit.
  (cd "$APP/web" && env OTONOM_DB="$CLONE_DB" "${flags[@]}" npx --no-install next start -H 127.0.0.1 -p $PORT &) > "$out/server.log" 2>&1 < /dev/null
  wait_ready "$BASE/api/ready"
}

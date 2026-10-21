#!/usr/bin/env bash
# Local-only performance harness. It clones the synthetic development DB,
# migrates the disposable clone, measures the built app, then removes the clone.
set -euo pipefail

APP=/d/otonom/app
OUT="$APP/tests/results/perf-run"
PG=/d/otonom/spike/architecture-feasibility-20261014/tools/pgsql/bin
PG_PW_FILE=/d/otonom/spike/architecture-feasibility-20261014/.local-secrets/pg_superuser_pw.txt
RUN_ID="$(date +%Y%m%d_%H%M%S)_$$"
PERF_DB="otonom_test_perf_$RUN_ID"
CLONE_DUMP="$OUT/$PERF_DB.dump"
CLONE_READY=0

mkdir -p "$OUT"

stop_server() {
  powershell.exe -NoProfile -Command "\$c = Get-NetTCPConnection -LocalPort 3301 -State Listen -ErrorAction SilentlyContinue; if (\$c) { Stop-Process -Id \$c.OwningProcess -Force }" >/dev/null 2>&1 || true
}

cleanup() {
  stop_server
  if [ "$CLONE_READY" = 1 ]; then
    PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/psql.exe" -q -d postgres -c "DROP DATABASE IF EXISTS $PERF_DB WITH (FORCE)" >/dev/null 2>&1 || true
  fi
  rm -f "$CLONE_DUMP"
}

trap cleanup EXIT INT TERM

stop_server
export PGHOST=127.0.0.1 PGPORT=5433 PGUSER=spike_admin PGPASSWORD="$(cat "$PG_PW_FILE")"
"$PG/pg_dump.exe" -Fc -d otonom_dev -f "$CLONE_DUMP"
"$PG/psql.exe" -q -d postgres -c "CREATE DATABASE $PERF_DB"
CLONE_READY=1
"$PG/pg_restore.exe" -d "$PERF_DB" "$CLONE_DUMP"
rm -f "$CLONE_DUMP"
export OTONOM_DB="$PERF_DB"

cd "$APP/packages/domain"
npx --no-install tsx -e "import('./src/migrate.ts').then(async (m) => console.log(JSON.stringify(await m.migrate())))" > "$OUT/database-migrate.log" 2>&1

cd "$APP/web"
OTONOM_TRUST_PROXY=1 OTONOM_TEST_PAGES=1 npx --no-install next start -H 127.0.0.1 -p 3301 > "$OUT/server.log" 2>&1 &
status=000
for _ in $(seq 1 90); do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3301/api/ready || true)
  [ "$status" = 200 ] && break
  sleep 1
done
[ "$status" = 200 ]

cd "$APP/tests"
npx --no-install tsx src/perf.ts | tee "$OUT/perf.log"
cp -f "$APP/tests/results/perf-latest.json" "$OUT/perf-$RUN_ID.json"

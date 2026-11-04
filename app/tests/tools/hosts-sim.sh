#!/usr/bin/env bash
# hosts-sim.sh <out-dir>: both Production hosts at the proxy layer. A production build is started in Production
# marketing-only mode (VERCEL=1, VERCEL_ENV=production, OTONOM_PUBLIC_MARKETING_ONLY=1, an example admin origin) and
# src/hosts.ts sends requests with the public and the admin Host header. The secrets below are synthetic test values;
# database URLs are deliberately not provided (see hosts.ts), so only the proxy layer is asserted.
set -u
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"
OUT="$1"; mkdir -p "$OUT"
ADMIN_HOST="${OTONOM_TEST_ADMIN_HOST:-otonom-admin.vercel.app}"
trap 'stop_port; [ -n "${CLONE_DB:-}" ] && clone_drop "$CLONE_DB"' EXIT
clone_create "$OUT" || exit 2
stop_port
(cd "$APP/web" && env OTONOM_DB="$CLONE_DB" VERCEL=1 VERCEL_ENV=production OTONOM_PUBLIC_MARKETING_ONLY=1 OTONOM_ADMIN_URL="https://$ADMIN_HOST" \
  OTONOM_CSRF_ORIGINS="https://$ADMIN_HOST" OTONOM_SITE_URL="$BASE" OTONOM_RATE_LIMIT_SALT=synthetic-rate-limit-salt-for-local-host-simulation \
  PAYLOAD_SECRET=synthetic-payload-secret-for-local-host-simulation-only OTONOM_DISABLE_UPLOADS=1 \
  npx --no-install next start -H 127.0.0.1 -p $PORT &) > "$OUT/server-sim.log" 2>&1 < /dev/null
echo "simulation server ready=$(wait_ready "$BASE/staff/login" "$ADMIN_HOST")"
cd "$APP/tests"
OTONOM_BASE="$BASE" OTONOM_TEST_ADMIN_HOST="$ADMIN_HOST" npx --no-install tsx src/hosts.ts > "$OUT/hosts.log" 2>&1; rc=$?
echo "[hosts] exit=$rc"
cp -f "$APP/tests/results/hosts-latest.json" "$OUT/hosts-latest.json" 2>/dev/null
exit $rc

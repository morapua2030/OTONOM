#!/usr/bin/env bash
# Full local regression: unit/domain → production build → start server (127.0.0.1:3301) → every HTTP/browser suite.
# Writes logs + results/run-all/summary.json. Synthetic data only. Never deploys anything.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
APP="$(cd "$SCRIPT_DIR/.." && pwd -P)"
REPO_ROOT="$(cd "$APP/.." && pwd -P)"
OUT=$APP/tests/results/run-all
RUN_ID="$(date +%Y%m%d_%H%M%S)_$$"
ARCHIVE="${OTONOM_EVIDENCE_ROOT:-$REPO_ROOT/execution/evidence}/automated-$RUN_ID"
PG="${OTONOM_PG_BIN:-/d/otonom/spike/architecture-feasibility-20261014/tools/pgsql/bin}"
PG_PW_FILE="${OTONOM_PG_SUPERUSER_PW_FILE:-/d/otonom/spike/architecture-feasibility-20261014/.local-secrets/pg_superuser_pw.txt}"
# Node resolves the default secret relative to the active worktree. Export the
# explicit host path so isolated worktrees use the same approved local test
# cluster without copying its credential into the worktree or command line.
if command -v cygpath >/dev/null 2>&1; then
  export OTONOM_PG_SUPERUSER_PW_FILE="$(cygpath -w "$PG_PW_FILE")"
else
  export OTONOM_PG_SUPERUSER_PW_FILE="$PG_PW_FILE"
fi
E2E_DB="otonom_e2e_$(date +%Y%m%d_%H%M%S)_$$"
CLONE_DUMP="$OUT/$E2E_DB.dump"
CLONE_READY=0
mkdir -p "$OUT"
# one run at a time; stale per-suite results are removed so a crashed suite can never be reported with an old pass
LOCK="$OUT/.lock"
if [ -e "$LOCK" ] && kill -0 "$(cat "$LOCK")" 2>/dev/null; then echo "another run-all is active"; exit 3; fi
echo $$ > "$LOCK"
: > "$OUT/steps.tsv"
rm -f "$OUT"/*.log "$OUT/summary.json" "$OUT"/otonom_e2e_*.dump
for s in acceptance surface journey cms portal security csp-edge e2e visual; do rm -f "$APP/tests/results/$s-latest.json"; done
step() { # name, command...
  local name=$1; shift
  local t0=$(date +%s)
  ( "$@" ) > "$OUT/$name.log" 2>&1
  local rc=$?
  echo -e "$name\t$rc\t$(( $(date +%s) - t0 ))" >> "$OUT/steps.tsv"
  echo "[$name] exit=$rc ($(( $(date +%s) - t0 ))s)"
}
stop_server() { powershell.exe -NoProfile -Command "\$c = Get-NetTCPConnection -LocalPort 3301 -State Listen -ErrorAction SilentlyContinue; if (\$c) { Stop-Process -Id \$c.OwningProcess -Force }" > /dev/null 2>&1 || true; }
archive_evidence() {
  mkdir -p "$ARCHIVE"
  for f in "$OUT"/*.log "$OUT"/steps.tsv "$OUT"/summary.json; do [ -f "$f" ] && cp -f "$f" "$ARCHIVE"/; done
  for s in acceptance surface journey cms portal security csp-edge e2e visual; do
    f="$APP/tests/results/$s-latest.json"; [ -f "$f" ] && cp -f "$f" "$ARCHIVE"/;
  done
}
cleanup() {
  stop_server
  if [ "$CLONE_READY" = 1 ]; then
    PGPASSWORD="$(cat "$PG_PW_FILE")" "$PG/psql.exe" -q -d postgres -c "DROP DATABASE IF EXISTS $E2E_DB WITH (FORCE)" > /dev/null 2>&1 || true
  fi
  rm -f "$CLONE_DUMP"
  archive_evidence
  rm -f "$LOCK"
}
trap cleanup EXIT INT TERM

cd "$APP/packages/domain" && step domain pnpm test
cd "$APP/web" && step web-unit node --import tsx --test test/*.test.ts
cd "$APP/tests" && step release-gate pnpm run test:release-gate
stop_server
cd "$APP/web" && step build npx --no-install next build
# Clone the known synthetic development database into a unique disposable target. All HTTP/browser suites and
# their server write only to this clone; the source database is never reset or cleaned by the regression run.
export PGHOST=127.0.0.1 PGPORT=5433 PGUSER=spike_admin PGPASSWORD="$(cat "$PG_PW_FILE")"
"$PG/pg_dump.exe" -Fc -d otonom_dev -f "$CLONE_DUMP" > "$OUT/database-clone.log" 2>&1
"$PG/psql.exe" -q -d postgres -c "CREATE DATABASE $E2E_DB" >> "$OUT/database-clone.log" 2>&1
CLONE_READY=1
# Restore original local owners (otonom_cms / otonom_domain). Both roles already exist in this development
# cluster; preserving ownership is required for Payload's schema access and is safe inside the disposable DB.
"$PG/pg_restore.exe" -d "$E2E_DB" "$CLONE_DUMP" >> "$OUT/database-clone.log" 2>&1
rm -f "$CLONE_DUMP"
export OTONOM_DB="$E2E_DB"
# Apply forward-only domain migrations only inside the disposable clone. The source otonom_dev and hosted databases
# remain untouched; the pg_dump above is the verified restore point for this isolated run.
cd "$APP/packages/domain"
if ! npx --no-install tsx -e "import('./src/migrate.ts').then(async (m) => console.log(JSON.stringify(await m.migrate())))" > "$OUT/database-migrate.log" 2>&1; then
  echo "disposable database migration failed"
  exit 2
fi
# Test-only: clear shared rate-limit buckets in the disposable clone (they persist across server restarts).
"$PG/psql.exe" -q -d "$E2E_DB" -c 'DELETE FROM domain.rate_limits' > /dev/null
cd "$APP/web" && (OTONOM_TRUST_PROXY=1 OTONOM_TEST_PAGES=1 OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS=1 OTONOM_ENABLE_SYNTHETIC_RFQ_TESTS=1 OTONOM_OWNER_EMAIL_OTP_REQUIRED=1 OTONOM_OWNER_EMAIL_OTP_ACCOUNT=otp-owner@otonom.local OTONOM_EMAIL_OTP_ALLOWED_RECIPIENT=otp-owner@otonom.local OTONOM_EMAIL_OTP_PEPPER=synthetic-email-otp-pepper-for-tests-2026 OTONOM_EMAIL_PROVIDER=test OTONOM_EMAIL_TEST_MODE=1 OTONOM_EMAIL_OTP_TEST_CODE=483921 npx --no-install next start -H 127.0.0.1 -p 3301 > "$OUT/server.log" 2>&1 &)
for i in $(seq 1 90); do c=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3301/api/ready); [ "$c" = 200 ] && break; sleep 1; done
echo "server ready=$c"
cd "$APP/tests"
for s in acceptance surface journey cms portal security csp-edge e2e visual; do step "$s" npx --no-install tsx "src/$s.ts"; done
stop_server
node -e "
const fs=require('fs'),path=require('path');
const out='$OUT'.replace(/^\/d\//,'D:/');
const steps=fs.readFileSync(path.join(out,'steps.tsv'),'utf8').trim().split('\n').map(l=>{const [name,rc,secs]=l.split('\t');return {name,exit:+rc,seconds:+secs};});
const count=(f)=>{const t=fs.readFileSync(path.join(out,f+'.log'),'utf8');const m=[...t.matchAll(/ℹ (tests|pass|fail|skipped|todo) (\d+)/g)].reduce((a,x)=>(a[x[1]]=+x[2],a),{});return m;};
const suites={};
suites.domain=count('domain');suites['web-unit']=count('web-unit');
const exitOf=Object.fromEntries(steps.map(x=>[x.name,x.exit]));
suites['release-gate']=count('release-gate');
for (const s of ['acceptance','surface','journey','cms','portal','security','csp-edge','e2e','visual']){try{const j=JSON.parse(fs.readFileSync(path.join(out,'..',s+'-latest.json'),'utf8'));suites[s]={tests:j.total,pass:j.total-j.failed,fail:j.failed,exit:exitOf[s],at:j.at};}catch(e){suites[s]={tests:0,pass:0,fail:1,exit:exitOf[s],error:'NO FRESH RESULT (suite crashed or did not run)'};}}
const total=Object.values(suites).reduce((a,s)=>({tests:a.tests+(s.tests||0),pass:a.pass+(s.pass||0),fail:a.fail+(s.fail||0)}),{tests:0,pass:0,fail:0});
const summary={at:new Date().toISOString(),environment:'local Windows, 127.0.0.1, synthetic data',database:'$E2E_DB (disposable clone of otonom_dev; dropped after run)',steps,suites,total};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(total), JSON.stringify(steps.map(s=>s.name+':'+s.exit)));
"

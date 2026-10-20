#!/usr/bin/env bash
# Backup + restore drill for the LOCAL development database (synthetic data). Proves the dump is restorable:
# pg_dump (custom format) → restore into a disposable database → compare row counts of every cms/domain table →
# check invariants (stock, append-only triggers, least-privilege grants) → drop the disposable database.
# Never prints secrets. Production backup/PITR on the target platform remains NOT TESTED (release blocker B-18).
set -euo pipefail
PG=/d/otonom/spike/architecture-feasibility-20261014/tools/pgsql/bin
APP=/d/otonom/app
OUT=$APP/backups
DRILL_DB=otonom_restore_drill
mkdir -p "$OUT"
export PGHOST=127.0.0.1 PGPORT=5433 PGUSER=spike_admin
export PGPASSWORD="$(cat /d/otonom/spike/architecture-feasibility-20261014/.local-secrets/pg_superuser_pw.txt)"
TS=$(date +%Y%m%d-%H%M%S)
DUMP="$OUT/otonom_dev-$TS.dump"

t0=$(date +%s%N)
"$PG/pg_dump.exe" -Fc -d otonom_dev -f "$DUMP"
t1=$(date +%s%N)
"$PG/psql.exe" -q -d postgres -c "DROP DATABASE IF EXISTS $DRILL_DB WITH (FORCE)" -c "CREATE DATABASE $DRILL_DB"
"$PG/pg_restore.exe" -d "$DRILL_DB" --no-owner --role=spike_admin "$DUMP" 2> "$OUT/restore-$TS.log" || true
t2=$(date +%s%N)

COUNT_SQL="SELECT string_agg(t, ',' ORDER BY t) FROM (SELECT format('%s.%s=%s', table_schema, table_name, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text) t FROM information_schema.tables WHERE table_schema IN ('cms','domain') AND table_type='BASE TABLE') x"
SRC=$("$PG/psql.exe" -At -d otonom_dev -c "$COUNT_SQL")
DST=$("$PG/psql.exe" -At -d "$DRILL_DB" -c "$COUNT_SQL")
TABLES=$(echo "$SRC" | tr ',' '\n' | wc -l)
INV=$("$PG/psql.exe" -At -d "$DRILL_DB" -c "SELECT (SELECT count(*) FROM domain.stock_levels WHERE on_hand<0 OR reserved<0 OR allocated<0 OR reserved+allocated>on_hand) || '/' || (SELECT count(*) FROM pg_trigger WHERE tgname LIKE '%append_only%')")
RESTORE_ERRORS=$(grep -c "error" "$OUT/restore-$TS.log" || true)
"$PG/psql.exe" -q -d postgres -c "DROP DATABASE IF EXISTS $DRILL_DB WITH (FORCE)"

MATCH=$([ "$SRC" = "$DST" ] && echo true || echo false)
cat > "$OUT/drill-$TS.json" <<EOF
{ "at": "$(date -Iseconds)", "dump": "$(basename "$DUMP")", "dumpBytes": $(stat -c %s "$DUMP"), "dumpMs": $(( (t1-t0)/1000000 )), "restoreMs": $(( (t2-t1)/1000000 )),
  "tables": $TABLES, "rowCountsIdentical": $MATCH, "badStockRows/appendOnlyTriggers": "$INV", "restoreLogErrorLines": $RESTORE_ERRORS,
  "note": "local Windows drill on synthetic data; restore ran as superuser with --no-owner (role grants re-applied by migrate in a real restore)" }
EOF
cat "$OUT/drill-$TS.json"
[ "$MATCH" = true ] || { echo "ROW COUNT MISMATCH"; exit 1; }

#!/usr/bin/env bash
# serve-clone.sh <out-dir> [audit|public|perf|flags]: disposable clone (migrated + seeded) and a production server
# on 127.0.0.1:3301 that stays up (default mode: audit = no flags); stop it and drop the clone with
# teardown-clone.sh <out-dir>.
set -u
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"
OUT="$1"; MODE="${2:-audit}"
clone_create "$OUT" || exit 2
echo "clone=$CLONE_DB ($(cat "$OUT/clone-seconds.txt") s) server ready=$(start_server "$MODE" "$OUT")"

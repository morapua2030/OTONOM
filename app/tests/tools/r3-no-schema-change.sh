#!/usr/bin/env bash
# R3 "no data-model change" check (owner 2026-11-22). Run in a SCRATCH checkout of the commit under test (never the
# work tree) with a LOCAL database at the latest migration (OTONOM_PG_* / OTONOM_DB as for the other suites):
#   1. Payload's migration generator finds no schema change: `payload migrate:create --skip-empty` writes no file;
#   2. payload-types.ts, regenerated, differs from the base commit only in comments.
# Nothing is committed: a generated migration file is reported and removed. Usage: bash r3-no-schema-change.sh [base]
set -uo pipefail
BASE="${1:-c0433d37}"
APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$APP/web"
for v in OTONOM_ADMIN_DATABASE_URL OTONOM_DOMAIN_DATABASE_URL OTONOM_CMS_DATABASE_URL DATABASE_URL POSTGRES_URL; do
  if [ -n "${!v:-}" ]; then echo "refusing: $v is set (local databases only)"; exit 2; fi
done
fail=0

before="$(ls src/migrations | sort)"
npx --no-install payload migrate:create r3_schema_check --skip-empty < /dev/null > /dev/null 2>&1
after="$(ls src/migrations | sort)"
if [ "$before" = "$after" ]; then
  echo "PASS migration generator: no schema change (no migration file)"
else
  echo "FAIL migration generator created:"; comm -13 <(echo "$before") <(echo "$after")
  comm -13 <(echo "$before") <(echo "$after") | while read -r f; do rm -f "src/migrations/$f"; done
  fail=1
fi

npx --no-install payload generate:types > /dev/null 2>&1
mkdir -p "$APP/tests/results"
BASE_TYPES="$APP/tests/results/r3-types-base.ts"
git show "$BASE:app/web/src/payload-types.ts" > "$BASE_TYPES"
node -e '
const fs = require("fs");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").split("\n").map((l) => l.trimEnd()).filter((l) => l.trim()).join("\n");
const a = strip(fs.readFileSync(process.argv[1], "utf8"));
const b = strip(fs.readFileSync(process.argv[2], "utf8"));
if (a === b) { console.log("PASS payload-types.ts: comments only"); process.exit(0); }
const al = a.split("\n"), bl = b.split("\n");
const i = al.findIndex((l, k) => l !== bl[k]);
console.log("FAIL payload-types.ts differs beyond comments at line", i + 1, JSON.stringify(al[i]), "->", JSON.stringify(bl[i]));
process.exit(1);
' "$BASE_TYPES" src/payload-types.ts || fail=1
exit "$fail"

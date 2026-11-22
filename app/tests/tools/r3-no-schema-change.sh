#!/usr/bin/env bash
# R3 "no data-model change" check (owner 2026-11-22). Run in a SCRATCH checkout of the commit under test (never the
# work tree) with a LOCAL database at the latest migration (OTONOM_PG_* / OTONOM_DB as for the other suites):
#   1. Payload's migration generator finds no schema change made by R3. One pre-existing difference is known and
#      accepted: since `lockDocuments: false` (2026-11-15) Payload no longer uses its two document-lock tables, so the
#      generator proposes to drop them. It writes exactly the same migration on the R3 base c0433d37 (checked in the
#      R3 Phase 4 evidence). Any other statement fails the check.
#   2. payload-types.ts, regenerated, differs from the base commit only in comments.
# Nothing is committed: a generated migration (and its entry in src/migrations/index.ts) is reported and removed.
# Usage: bash r3-no-schema-change.sh [base]
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
created="$(comm -13 <(echo "$before") <(echo "$after"))"
if [ -z "$created" ]; then
  echo "PASS migration generator: no schema change (no migration file)"
else
  ts="$(echo "$created" | grep '\.ts$' | head -1)"
  node -e '
const fs = require("fs");
const src = fs.readFileSync(process.argv[1], "utf8");
const up = (src.match(/export async function up[\s\S]*?sql`([\s\S]*?)`/) || [])[1] ?? "";
const statements = up.split(";").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
const known = [
  "DROP TABLE \"cms\".\"payload_locked_documents\" CASCADE",
  "DROP TABLE \"cms\".\"payload_locked_documents_rels\" CASCADE",
];
const other = statements.filter((s) => !known.includes(s));
if (statements.length && other.length === 0) {
  console.log("PASS migration generator: only the known pre-existing difference (drop the two document-lock tables Payload no longer uses since lockDocuments: false; the same migration is generated on c0433d37). No schema change from R3.");
  process.exit(0);
}
console.log("FAIL migration generator found a schema change:", JSON.stringify(other.length ? other : statements));
process.exit(1);
' "src/migrations/$ts" || fail=1
  echo "$created" | while read -r f; do rm -f "src/migrations/$f"; done
  git checkout -- src/migrations/index.ts 2>/dev/null
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

// Local development database setup: roles, database, domain migrations (versioned), Payload secret.
// Payload's own migrations are run separately with `pnpm payload migrate` (see README).
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ensureRoles, migrate } from '../../packages/domain/src/migrate.ts';
import { SECRETS_DIR, DB_NAME } from '@otonom/domain';

async function main() {
  mkdirSync(SECRETS_DIR, { recursive: true });
  const ps = path.join(SECRETS_DIR, 'payload_secret.txt');
  if (!existsSync(ps)) writeFileSync(ps, randomBytes(32).toString('base64url'));
  await ensureRoles();
  const r = await migrate();
  console.log(`database ${DB_NAME}: domain migrations applied=${JSON.stringify(r.applied)} already=${JSON.stringify(r.alreadyApplied)}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

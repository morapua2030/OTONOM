// `pnpm --filter @otonom/domain db:roles`: create or re-apply the local login roles (otonom_domain, otonom_cms) and the
// development database. LOCAL ONLY (audit C4-06): it refuses a configured database URL, a non-loopback host and any
// database name other than the development / disposable test names, before connecting. Passwords are never printed.
import { DB_NAME } from './db.ts';
import { ensureRoles } from './migrate.ts';

ensureRoles()
  .then(() => {
    console.log(`local roles ready (database ${DB_NAME})`);
    process.exit(0);
  })
  .catch((e) => {
    console.error((e as Error).message);
    process.exit(1);
  });

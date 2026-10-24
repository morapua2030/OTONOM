// One-time, owner-controlled Production bootstrap. Password arrives only on stdin.
// Never pass it in argv, an environment variable, a file, a log, or a report.
import { randomUUID } from 'node:crypto';
import { getPayload } from 'payload';
import { passwordPolicyError } from '@otonom/domain';
import config from '../src/payload.config.ts';
import { domainDb } from '../src/lib/server.ts';
import { PRODUCTION_OWNER_EMAIL } from '../src/lib/production-owner-auth.ts';

function assertBootstrapTarget() {
  if (process.env.OTONOM_PROVISION_PRODUCTION_OWNER !== 'ISOLATED_PRODUCTION_OWNER_ONLY') throw new Error('BOOTSTRAP_GATE_CLOSED');
  if (process.env.OTONOM_FORCE_PRODUCTION !== '1' || process.env.OTONOM_FORCE_PREVIEW === '1') throw new Error('NOT_PRODUCTION_TARGET');
  const expectedNeonProjectId = process.env.OTONOM_EXPECTED_NEON_PROJECT_ID?.trim();
  if (!expectedNeonProjectId || process.env.NEON_PROJECT_ID !== expectedNeonProjectId) {
    throw new Error('WRONG_NEON_PROJECT');
  }
  if (process.env.OTONOM_PRODUCTION_OWNER_EMAIL !== PRODUCTION_OWNER_EMAIL) throw new Error('WRONG_OWNER_IDENTITY');
}

async function readPasswordPair(): Promise<[string, string]> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const lines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
  return [lines[0] ?? '', lines[1] ?? ''];
}

async function main() {
  assertBootstrapTarget();
  const [password, confirmation] = await readPasswordPair();
  if (!password || password !== confirmation) throw new Error('PASSWORD_CONFIRMATION_MISMATCH');
  const policyError = passwordPolicyError(password, PRODUCTION_OWNER_EMAIL);
  if (policyError) throw new Error(policyError);

  const payload = await getPayload({ config });
  const totalBefore = await payload.count({ collection: 'users', overrideAccess: true });
  if (totalBefore.totalDocs !== 0) throw new Error('PRODUCTION_USER_STORE_NOT_EMPTY');
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: PRODUCTION_OWNER_EMAIL } },
    overrideAccess: true,
    showHiddenFields: false,
    depth: 0,
    limit: 2,
  });
  if (existing.totalDocs !== 0) throw new Error('OWNER_ALREADY_EXISTS');

  const owner = await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: PRODUCTION_OWNER_EMAIL,
      password,
      role: 'OWNER',
      mfaEnabled: false,
      mfaVerifiedSids: [],
      lastTotpStep: 0,
      recoveryCodes: [],
    } as any,
  });

  const verified = await payload.find({
    collection: 'users',
    where: { and: [{ id: { equals: owner.id } }, { email: { equals: PRODUCTION_OWNER_EMAIL } }, { role: { equals: 'OWNER' } }] },
    overrideAccess: true,
    showHiddenFields: false,
    depth: 0,
    limit: 2,
  });
  const totalAfter = await payload.count({ collection: 'users', overrideAccess: true });
  if (verified.totalDocs !== 1 || totalAfter.totalDocs !== 1) throw new Error('OWNER_POSTCONDITION_FAILED');

  await domainDb().query(
    `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, after, correlation_id)
     VALUES ('system','owner-bootstrap','user.production_owner_provisioned','user',$1,$2,$3)`,
    [String(owner.id), JSON.stringify({ email: PRODUCTION_OWNER_EMAIL, role: 'OWNER', authenticationPolicy: 'PRODUCTION_OWNER_PASSWORD_ONLY' }), randomUUID()],
  );

  // The immutable subject ID is intentionally the only value emitted; the password is never returned.
  process.stdout.write(JSON.stringify({ provisioned: true, id: String(owner.id), email: PRODUCTION_OWNER_EMAIL, role: 'OWNER' }) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    const allowedCodes = new Set([
      'BOOTSTRAP_GATE_CLOSED', 'NOT_PRODUCTION_TARGET', 'WRONG_NEON_PROJECT', 'WRONG_OWNER_IDENTITY',
      'PASSWORD_CONFIRMATION_MISMATCH', 'PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG', 'PASSWORD_MISSING_UPPERCASE',
      'PASSWORD_MISSING_LOWERCASE', 'PASSWORD_MISSING_NUMBER', 'PASSWORD_MISSING_SYMBOL', 'PASSWORD_TOO_PREDICTABLE',
      'PRODUCTION_USER_STORE_NOT_EMPTY', 'OWNER_ALREADY_EXISTS', 'OWNER_POSTCONDITION_FAILED',
    ]);
    process.stderr.write(`OWNER_PROVISION_FAILED:${allowedCodes.has(error.message) ? error.message : 'UNEXPECTED_ERROR'}\n`);
    process.exit(1);
  });

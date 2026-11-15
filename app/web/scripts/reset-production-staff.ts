// Operator-run, owner-controlled recovery of a Production OWNER/ADMIN account (owner decision 2026-11-15).
// The account holder types the new password (twice) on stdin; it is never echoed, passed in argv or the environment,
// written to a file, a log or a report. Optional --reset-mfa removes the authenticator so the next sign-in enrolls a
// fresh one. Every session of the user is revoked (a password change always does that) and audit events are written.
// Usage (Production env loaded, see docs/ai/OPERATOR_RESET.md):
//   OTONOM_RESET_PRODUCTION_STAFF=ISOLATED_PRODUCTION_STAFF_RESET_ONLY OTONOM_FORCE_PRODUCTION=1 \
//   OTONOM_EXPECTED_NEON_PROJECT_ID=<id> npx --no-install tsx scripts/reset-production-staff.ts \
//     --email owner@example.com --confirm-email owner@example.com [--reset-mfa]
import { randomUUID } from 'node:crypto';
import { getPayload } from 'payload';
import { passwordPolicyError } from '@otonom/domain';
import config from '../src/payload.config.ts';
import { domainDb } from '../src/lib/server.ts';
import { assertOperatorResetGate, mfaResetFields, parseResetArgs, RESETTABLE_ROLES } from '../src/lib/operator-reset.ts';

/** Reads one line from stdin without echo when it is a terminal; from the pipe otherwise. */
async function readSecretLine(prompt: string, lines: string[]): Promise<string> {
  if (!process.stdin.isTTY) return lines.shift() ?? '';
  process.stderr.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return await new Promise<string>((resolve) => {
    let value = '';
    const onData = (buf: Buffer) => {
      for (const ch of buf.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.off('data', onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stderr.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') process.exit(130);
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function pipedLines(): Promise<string[]> {
  if (process.stdin.isTTY) return [];
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
}

async function main() {
  assertOperatorResetGate();
  const { email, resetMfa } = parseResetArgs(process.argv.slice(2));
  const lines = await pipedLines();
  const password = await readSecretLine('New password: ', lines);
  const confirmation = await readSecretLine('Repeat the new password: ', lines);
  if (!password || password !== confirmation) throw new Error('PASSWORD_CONFIRMATION_MISMATCH');
  const policyError = passwordPolicyError(password, email);
  if (policyError) throw new Error(policyError);

  const payload = await getPayload({ config });
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true, depth: 0, limit: 2, showHiddenFields: true });
  if (found.totalDocs !== 1) throw new Error('USER_NOT_FOUND');
  const user = found.docs[0] as any;
  if (!(RESETTABLE_ROLES as readonly string[]).includes(String(user.role))) throw new Error('ROLE_NOT_RESETTABLE');

  // A password change clears every session and MFA-verified session id (Users beforeChange) and expires stored factors.
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { password, loginAttempts: 0, lockUntil: null, sessions: [], ...(resetMfa ? mfaResetFields() : {}) } as any,
    overrideAccess: true,
    context: { operatorReset: true },
  });
  const after = (await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true, depth: 0, showHiddenFields: true })) as any;
  const sessionsLeft = Array.isArray(after.sessions) ? after.sessions.length : 0;
  if (sessionsLeft !== 0) throw new Error('SESSIONS_NOT_REVOKED');
  if (resetMfa && (after.mfaEnabled || after.totpSecret)) throw new Error('MFA_NOT_RESET');

  const actions = ['user.password_reset_by_operator', ...(resetMfa ? ['user.mfa_reset_by_operator'] : [])];
  const correlationId = randomUUID();
  for (const action of actions) {
    await domainDb().query(
      `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, after, correlation_id) VALUES ('system','operator',$1,'user',$2,$3,$4)`,
      [action, String(user.id), JSON.stringify({ role: user.role, sessionsRevoked: true, mfaReset: resetMfa }), correlationId],
    );
  }
  console.log(JSON.stringify({ ok: true, userId: user.id, role: user.role, sessionsRevoked: true, mfaReset: resetMfa, audit: actions }));
  process.exit(0);
}

main().catch((error) => {
  const code = error instanceof Error ? error.message : 'RESET_FAILED';
  const known = ['RESET_GATE_CLOSED', 'NOT_PRODUCTION_TARGET', 'WRONG_NEON_PROJECT', 'UNKNOWN_ARGUMENT', 'EMAIL_REQUIRED', 'EMAIL_CONFIRMATION_MISMATCH',
    'PASSWORD_CONFIRMATION_MISMATCH', 'USER_NOT_FOUND', 'ROLE_NOT_RESETTABLE', 'SESSIONS_NOT_REVOKED', 'MFA_NOT_RESET'];
  console.error(JSON.stringify({ ok: false, code: known.includes(code) || /^PASSWORD_/.test(code) ? code : 'RESET_FAILED' }));
  process.exit(1);
});

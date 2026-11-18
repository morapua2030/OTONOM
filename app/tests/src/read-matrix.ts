// Explicit per-role read matrix for the collections that hold personal or private data. It is written out by hand on
// purpose: it mirrors packages/domain/src/policy.ts and the collection access rules, so a change in either one has to
// change this table too (a generated expectation would follow a wrong change and still pass).
import type { Client, Recorder } from './http-client.ts';

/** Roles that read every row of the collection (MFA-verified sessions). */
export const READ_ALL: Record<string, readonly string[]> = {
  users: ['OWNER', 'ADMIN'],
  'private-files': ['OWNER', 'ADMIN', 'ENGINEER'], // file.read_any or file.scan_result
  organisations: ['OWNER', 'ADMIN', 'ENGINEER'], // crm.read
  contacts: ['OWNER', 'ADMIN', 'ENGINEER'], // crm.read
  rfqs: ['OWNER', 'ADMIN', 'ENGINEER'], // crm.read
  opportunities: ['OWNER', 'ADMIN', 'ENGINEER'], // crm.read
  leads: ['OWNER', 'ADMIN', 'SALES'], // leads.read
  consents: ['OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR', 'SALES'], // staffOnly
};
/** Collections where every other staff role reads only its own rows (a where-constraint, still HTTP 200). */
export const READ_OWN: Record<string, (doc: any) => unknown> = {
  users: (d) => d.id,
  'private-files': (d) => (typeof d.owner === 'object' && d.owner !== null ? d.owner.id : d.owner),
};

const denied = (st: number) => st === 401 || st === 403;

/**
 * Records one check per collection in READ_ALL for a signed-in, MFA-verified staff client: the exact expected outcome
 * (all rows, own rows only, or 401/403). A 5xx never passes.
 */
export async function checkReadMatrix(rec: Recorder, who: string, c: Client, selfId: number | string) {
  for (const [slug, roles] of Object.entries(READ_ALL)) {
    const r = await c.get(`/api/${slug}?limit=100&depth=0`);
    const docs: any[] = Array.isArray(r.json?.docs) ? r.json.docs : [];
    let pass: boolean;
    let expected: string;
    if (roles.includes(who)) {
      expected = 'all rows (200)';
      pass = r.status === 200 && Array.isArray(r.json?.docs);
    } else if (READ_OWN[slug]) {
      expected = 'own rows only (200)';
      pass = r.status === 200 && docs.every((d) => String(READ_OWN[slug](d)) === String(selfId));
    } else {
      expected = 'denied (401/403)';
      pass = denied(r.status) && docs.length === 0;
    }
    rec.add(`MATRIX-${who}-READ-${slug}`, 'RBAC-MATRIX', `${who}: read ${slug} → ${expected}`, pass, { status: r.status, rows: docs.length });
  }
}

/**
 * Compares the real read outcome with the server's own access map (GET /api/access) for collections outside READ_ALL:
 * permitted → 200 with a docs array; not permitted → 401/403. A 5xx never passes.
 */
export async function readMatchesAccessMap(c: Client, slug: string, accessMap: any) {
  const p = accessMap?.collections?.[slug]?.read;
  const permitted = p === true || (typeof p === 'object' && p !== null && (p.permission === true || 'where' in p));
  const r = await c.get(`/api/${slug}?limit=1&depth=0`);
  const pass = permitted ? r.status === 200 && Array.isArray(r.json?.docs) : denied(r.status);
  return { pass, status: r.status, permitted, text: r.text };
}

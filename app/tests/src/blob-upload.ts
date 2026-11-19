// Audit 2026-11-18, X-05: media uploads to Vercel Blob must not hold a database connection. The server for this suite
// runs with the Production pool setting (OTONOM_PG_POOL_MAX=2) and Blob storage switched on locally, pointed at a fake
// Blob API served here (VERCEL_BLOB_API_URL). The fake answers each upload slowly and, WHILE the upload is in flight,
// counts the CMS role's connections that sit "idle in transaction": with the fix there are none, because the upload
// runs after the save commits. A failed upload leaves no record and no object behind. Synthetic data only.
import { createServer, type IncomingMessage } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const FAKE_PORT = Number(process.env.OTONOM_FAKE_BLOB_PORT ?? 3399);
const UPLOAD_DELAY_MS = 2500;
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type SeedUser = { id: string | number; email: string; password: string; role: string; totp: string };
const users: SeedUser[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const by = (r: string) => users.find((u) => u.role === r)!;
const last = new Map<string, number>();
const START = Math.floor(Date.now() / 30000);
async function code(k: string, s: string) { for (;;) { const t = Math.floor(Date.now() / 30000); if (t > (last.get(k) ?? START)) { last.set(k, t); return generate({ secret: s }); } await sleep(1000); } }
async function login(role: string) {
  const u = by(role);
  const c = new Client(BASE, role, true);
  await c.post('/api/users/login', { email: u.email, password: u.password });
  const v = await c.post('/api/mfa/verify', { code: await code(u.email, u.totp) });
  if (v.status !== 200) throw new Error(`login ${role} ${v.status}`);
  return c;
}
function png(w: number, h: number, shade: number): Buffer {
  const ch = (t: string, d: Buffer) => { const tb = Buffer.from(t); const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([tb, d])) >>> 0); return Buffer.concat([l, tb, d, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, shade)]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), ch('IEND', Buffer.alloc(0))]);
}
const upload = (c: Client, method: 'POST' | 'PATCH', url: string, name: string, bytes: Buffer) => {
  const f = new FormData();
  f.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), name);
  return c.req(method, url, { body: f });
};

/** CMS connections that are inside an open transaction but not running a query right now. */
const openCmsTransactions = async () => Number((await su.query(`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND usename = 'otonom_cms' AND state LIKE 'idle in transaction%'`)).rows[0].count);

// ---------------- fake Vercel Blob API ----------------
type Put = { pathname: string; bytes: number; openTransactionsDuringUpload: number };
const puts: Put[] = [];
const deletes: string[] = [];
let mode: 'slow' | 'fail' = 'slow';
const readBody = (req: IncomingMessage) => new Promise<Buffer>((resolve) => { const parts: Buffer[] = []; req.on('data', (d) => parts.push(d)); req.on('end', () => resolve(Buffer.concat(parts))); });
const fake = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${FAKE_PORT}`);
  const body = await readBody(req);
  if (req.method === 'PUT') {
    const pathname = url.searchParams.get('pathname') ?? '';
    if (mode === 'fail') {
      puts.push({ pathname, bytes: body.length, openTransactionsDuringUpload: await openCmsTransactions() });
      res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { code: 'internal_server_error', message: 'synthetic upload failure' } }));
      return;
    }
    // the upload is "in flight": sample the database the whole time
    let open = 0;
    const until = Date.now() + UPLOAD_DELAY_MS;
    while (Date.now() < until) { open = Math.max(open, await openCmsTransactions()); await sleep(150); }
    puts.push({ pathname, bytes: body.length, openTransactionsDuringUpload: open });
    const blobUrl = `https://r2fakestore.public.blob.vercel-storage.com/${pathname}`;
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ url: blobUrl, downloadUrl: `${blobUrl}?download=1`, pathname, contentType: 'image/png', contentDisposition: 'inline', etag: '"r2"' }));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/delete') {
    for (const u of (JSON.parse(body.toString('utf8') || '{}').urls ?? []) as string[]) deletes.push(new URL(u).pathname.replace(/^\//, ''));
    res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
    return;
  }
  res.writeHead(404).end();
});

async function main() {
  await new Promise<void>((r) => fake.listen(FAKE_PORT, '127.0.0.1', r));
  const editor = await login('EDITOR');
  const mediaRows = async (prefix: string) => Number((await su.query(`SELECT count(*) FROM cms.media WHERE filename LIKE $1`, [`${prefix}%`])).rows[0].count);

  // 1) create: the upload runs with no transaction open, under the record's final (suffixed) name
  const t0 = Date.now();
  const created = await upload(editor, 'POST', '/api/media', 'r2-blob-create.png', png(40, 30, 120));
  const createMs = Date.now() - t0;
  const doc = created.json?.doc;
  const put1 = puts[0];
  rec.add('B-UPLOAD-CREATED', 'UPLOAD', 'an image upload to Blob succeeds and the record holds the final object name (random suffix chosen inside the save)', created.status === 201 && /^r2-blob-create-[0-9a-f]{12}\.png$/.test(doc?.filename ?? '') && put1?.pathname === doc?.filename && put1.bytes > 0, { status: created.status, filename: doc?.filename, put: put1 });
  rec.add('B-UPLOAD-NO-OPEN-TRANSACTION', 'UPLOAD', 'while the (slow) upload is in flight, no CMS connection sits idle in an open transaction', !!put1 && put1.openTransactionsDuringUpload === 0 && createMs >= UPLOAD_DELAY_MS, { during: put1?.openTransactionsDuringUpload, createMs });

  // 2) replace the file: same rule, and the old object is deleted only after the new one is stored
  const putsBefore = puts.length;
  const replaced = await upload(editor, 'PATCH', `/api/media/${doc?.id}`, 'r2-blob-replace.png', png(48, 36, 60));
  const put2 = puts[putsBefore];
  const newName = replaced.json?.doc?.filename;
  rec.add('B-REPLACE-NO-OPEN-TRANSACTION', 'UPLOAD', 'replacing the file uploads with no open transaction, stores the new name and deletes the old object', replaced.status === 200 && /^r2-blob-replace-[0-9a-f]{12}\.png$/.test(newName ?? '') && put2?.pathname === newName && put2.openTransactionsDuringUpload === 0 && deletes.includes(doc?.filename), { status: replaced.status, newName, put: put2, deletes });

  // 3) a failed upload leaves no record and no object behind, and the caller sees the error
  mode = 'fail';
  const deletesBefore = deletes.length;
  const failed = await upload(editor, 'POST', '/api/media', 'r2-blob-fail.png', png(20, 20, 200));
  const failedPut = puts[puts.length - 1];
  await sleep(500);
  rec.add('B-FAILED-UPLOAD-UNDONE', 'UPLOAD', 'a failed upload is reported, its record is removed and its object name is deleted', failed.status >= 400 && failedPut?.pathname?.startsWith('r2-blob-fail-') && (await mediaRows('r2-blob-fail')) === 0 && deletes.slice(deletesBefore).includes(failedPut.pathname), { status: failed.status, rows: await mediaRows('r2-blob-fail'), put: failedPut, deletes: deletes.slice(deletesBefore) });
  mode = 'slow';

  // 4) nothing is left open afterwards
  rec.add('B-NO-STUCK-TRANSACTION', 'UPLOAD', 'no CMS connection is left idle in a transaction after the uploads', (await openCmsTransactions()) === 0, null);

  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'blob-upload-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  fake.close();
  await su.end();
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

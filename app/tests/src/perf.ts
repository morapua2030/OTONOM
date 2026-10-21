// WAVE 11 — local performance measurement (MEASURE-ONLY; Windows laptop numbers, NOT Railway/Linux production numbers).
// Page weight + timings in headless Edge (DevTools Protocol), API latency percentiles, database query plans, build size.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import pg from 'pg';
import { APP_ROOT, connConfig } from '@otonom/domain';
import { Client, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9335;
const PAGES = ['/ar', '/en', '/ar/business/developers', '/ar/business/request-a-proposal', '/ar/projects', '/ar/shop', '/admin/login'];

function dirSize(p: string): number {
  if (!existsSync(p)) return 0;
  let n = 0;
  for (const e of readdirSync(p, { withFileTypes: true })) n += e.isDirectory() ? dirSize(path.join(p, e.name)) : statSync(path.join(p, e.name)).size;
  return n;
}
const pct = (a: number[], q: number) => {
  const s = [...a].sort((x, y) => x - y);
  return Math.round(s[Math.min(s.length - 1, Math.floor(q * s.length))] * 10) / 10;
};

class Cdp {
  private id = 0;
  private pending = new Map<number, (v: any) => void>();
  listeners: Array<(m: any) => void> = [];
  constructor(private ws: WebSocket) {
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && this.pending.has(m.id)) {
        this.pending.get(m.id)!(m);
        this.pending.delete(m.id);
      } else for (const l of this.listeners) l(m);
    });
  }
  static async connect(url: string) {
    const ws = new WebSocket(url);
    await new Promise((r, j) => {
      ws.addEventListener('open', r, { once: true });
      ws.addEventListener('error', j, { once: true });
    });
    return new Cdp(ws);
  }
  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((r) => this.pending.set(id, r));
  }
  close() {
    this.ws.close();
  }
}

async function pageMetrics() {
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', `--user-data-dir=${path.join(APP_ROOT, 'tests', '.edge-profile-perf')}`, `--remote-debugging-port=${PORT}`, '--remote-debugging-address=127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  let wsUrl = '';
  for (let i = 0; i < 40 && !wsUrl; i++) {
    await sleep(500);
    wsUrl = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j: any) => j.webSocketDebuggerUrl).catch(() => '');
  }
  const cdp = await Cdp.connect(wsUrl);
  const out: any[] = [];
  try {
    for (const page of PAGES) {
      for (const run of ['cold', 'warm']) {
        const { result: tgt } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { result: att } = await cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
        const sid = att.sessionId;
        const resp = new Map<string, { type: string; bytes: number }>();
        const listener = (m: any) => {
          if (m.sessionId !== sid) return;
          if (m.method === 'Network.responseReceived') resp.set(m.params.requestId, { type: m.params.type, bytes: 0 });
          if (m.method === 'Network.loadingFinished' && resp.has(m.params.requestId)) resp.get(m.params.requestId)!.bytes = m.params.encodedDataLength;
        };
        cdp.listeners.push(listener);
        await cdp.send('Network.enable', {}, sid);
        if (run === 'cold') await cdp.send('Network.clearBrowserCache', {}, sid);
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: run === 'cold' }, sid);
        await cdp.send('Page.enable', {}, sid);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true }, sid);
        await cdp.send('Runtime.evaluate', { expression: '1' }, sid);
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__lcp=0;new PerformanceObserver((l)=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});` }, sid);
        await cdp.send('Page.navigate', { url: BASE + page }, sid);
        await sleep(3000);
        const ev = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify((()=>{const n=performance.getEntriesByType('navigation')[0];return {ttfb:n.responseStart,dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,lcp:window.__lcp}})())`, returnByValue: true }, sid);
        const t = JSON.parse(ev.result.result.value);
        cdp.listeners = cdp.listeners.filter((l) => l !== listener);
        await cdp.send('Target.closeTarget', { targetId: tgt.targetId });
        const all = [...resp.values()];
        const kb = (f: (x: { type: string }) => boolean) => Math.round(all.filter(f).reduce((s, x) => s + x.bytes, 0) / 102.4) / 10;
        out.push({ page, run, requests: all.length, transferKB: kb(() => true), scriptKB: kb((x) => x.type === 'Script'), documentKB: kb((x) => x.type === 'Document'), cssKB: kb((x) => x.type === 'Stylesheet'), ttfbMs: Math.round(t.ttfb), dclMs: Math.round(t.dcl), loadMs: Math.round(t.load), lcpMs: Math.round(t.lcp) });
      }
    }
  } finally {
    cdp.close();
    edge.kill();
  }
  return out;
}

async function apiLatency() {
  const c = new Client(BASE, 'perf', true);
  const targets = ['/api/ready', '/ar', '/ar/business/developers', '/api/claims?limit=10', '/sitemap.xml'];
  const res: any[] = [];
  for (const t of targets) {
    const ms: number[] = [];
    for (let i = 0; i < 60; i++) {
      const t0 = performance.now();
      await c.get(t);
      ms.push(performance.now() - t0);
    }
    res.push({ path: t, n: ms.length, p50: pct(ms, 0.5), p95: pct(ms, 0.95), max: Math.round(Math.max(...ms)) });
  }
  return res;
}

async function queryPlans() {
  const su = new pg.Client(connConfig('superuser'));
  await su.connect();
  const plans: any[] = [];
  const q = async (name: string, sql: string, params: unknown[] = []) => {
    const r = await su.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, params);
    const p = r.rows[0]['QUERY PLAN'][0];
    plans.push({ name, executionMs: Math.round(p['Execution Time'] * 100) / 100, planningMs: Math.round(p['Planning Time'] * 100) / 100, topNode: p.Plan['Node Type'] });
  };
  await q('kpi.signed', `SELECT a.class, k.cohort, sum(k.signed_value_minor) FROM domain.contracts k JOIN domain.attribution a ON a.contract_id=k.id WHERE k.signed_at >= $1 AND k.signed_at < $2 GROUP BY 1,2`, ['2026-01-01', '2027-01-01']);
  await q('audit.by_entity', `SELECT * FROM domain.audit_events WHERE entity_type='order' AND entity_id=$1`, ['x']);
  await q('rfq.by_idempotency', `SELECT id FROM cms.rfqs WHERE idempotency_key=$1`, ['x']);
  await q('rfq.duplicates_90d', `SELECT id FROM cms.rfqs WHERE (submitted_email=$1 OR submitted_phone=$2) AND created_at > now() - interval '90 days'`, ['a@example.com', '+201000000000']);
  await q('tickets.by_customer', `SELECT ref,serial,category,priority,status,resolution,revision,created_at,updated_at FROM domain.service_tickets WHERE customer_ref=$1 ORDER BY created_at DESC LIMIT 50`, ['user:1']);
  await q('service.queue', `SELECT id,ref,serial,priority,status,revision,created_at FROM domain.service_tickets ORDER BY (priority='URGENT') DESC,(status IN ('RESOLVED','CLOSED')),created_at DESC LIMIT 80`);
  await q('rma.queue', `SELECT r.id,r.ref,r.status,r.revision,i.condition FROM domain.rmas r LEFT JOIN domain.rma_inspections i ON i.rma_id=r.id WHERE r.status <> 'CLOSED' ORDER BY r.created_at DESC LIMIT 50`);
  await q('service.timeline', `SELECT event_type,from_status,to_status,note,revision,created_at FROM domain.service_ticket_events WHERE ticket_id=$1 ORDER BY id LIMIT 100`, ['00000000-0000-0000-0000-000000000000']);
  const counts = (await su.query(`SELECT (SELECT count(*) FROM cms.rfqs) rfqs, (SELECT count(*) FROM domain.audit_events) audit, (SELECT count(*) FROM domain.contracts) contracts, (SELECT count(*) FROM domain.device_ownerships) ownerships, (SELECT count(*) FROM domain.service_tickets) tickets, (SELECT count(*) FROM domain.rmas) rmas`)).rows[0];
  await su.end();
  return { plans, rowCounts: counts, note: 'tiny synthetic data volumes — plans show index use, not production-scale timing' };
}

function serverMemory() {
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', `$c = Get-NetTCPConnection -LocalPort 3301 -State Listen; $p = Get-Process -Id $c.OwningProcess; [math]::Round($p.WorkingSet64/1MB)`]).toString().trim();
    return Number(out);
  } catch {
    return null;
  }
}

async function main() {
  const memBefore = serverMemory();
  const pages = await pageMetrics();
  const api = await apiLatency();
  const memAfter = serverMemory();
  const db = await queryPlans();
  const next = path.join(APP_ROOT, 'web', '.next');
  const build = { nextDirMB: Math.round(dirSize(next) / 1048576), staticChunksKB: Math.round(dirSize(path.join(next, 'static', 'chunks')) / 1024), staticCssKB: Math.round(dirSize(path.join(next, 'static', 'css')) / 1024) };
  const report = {
    at: new Date().toISOString(),
    verdict: 'MEASURED, NO THRESHOLD (owner has not approved budgets); Windows laptop ≠ Railway Linux',
    host: { os: `${os.type()} ${os.release()}`, cpus: os.cpus().length, cpu: os.cpus()[0]?.model, memGB: Math.round(os.totalmem() / 2 ** 30), node: process.version },
    serverWorkingSetMB: { beforeLoad: memBefore, afterLoad: memAfter },
    build,
    pages,
    api,
    db,
  };
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'perf-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ build, mem: report.serverWorkingSetMB, pages: pages.filter((p) => p.run === 'cold').map((p) => `${p.page} ${p.transferKB}KB js=${p.scriptKB}KB lcp=${p.lcpMs}ms`), api: api.map((a) => `${a.path} p95=${a.p95}`) }, null, 1));
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});

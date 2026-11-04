// S3 B.5 informational page metrics for the requested routes, using the same method as app/tests/src/perf.ts
// (headless Edge over CDP, mobile 360x800 @2x, cold + warm, navigation timing + LCP + transfer bytes).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const BASE = process.argv[4] ?? 'http://127.0.0.1:3301';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9336;
const PAGES = ['/ar', '/en', '/ar/try', '/en/try', '/ar/smart-home/packages', '/en/smart-home/packages', '/ar/products', '/en/products'];
const RUNS = ['cold', 'cold', 'cold', 'cold', 'cold', 'warm'];
const [, , profileDir, outFile] = process.argv; // [base] is argv[4]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', `--user-data-dir=${profileDir}`, `--remote-debugging-port=${PORT}`, '--remote-debugging-address=127.0.0.1', 'about:blank'], { stdio: 'ignore' });
let wsUrl = '';
for (let i = 0; i < 40 && !wsUrl; i++) {
  await sleep(500);
  wsUrl = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl).catch(() => '');
}
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
let id = 0;
const pending = new Map();
let listeners = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(String(ev.data));
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else for (const l of listeners) l(m);
});
const send = (method, params = {}, sessionId) => { const n = ++id; ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) })); return new Promise((r) => pending.set(n, r)); };

const out = [];
try {
  for (const page of PAGES) {
    for (const run of RUNS) {
      const { result: tgt } = await send('Target.createTarget', { url: 'about:blank' });
      const { result: att } = await send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
      const sid = att.sessionId;
      const resp = new Map();
      const listener = (m) => {
        if (m.sessionId !== sid) return;
        if (m.method === 'Network.responseReceived') resp.set(m.params.requestId, { type: m.params.type, url: m.params.response.url, bytes: 0 });
        if (m.method === 'Network.loadingFinished' && resp.has(m.params.requestId)) resp.get(m.params.requestId).bytes = m.params.encodedDataLength;
      };
      listeners.push(listener);
      await send('Network.enable', {}, sid);
      if (run === 'cold') await send('Network.clearBrowserCache', {}, sid);
      await send('Network.setCacheDisabled', { cacheDisabled: run === 'cold' }, sid);
      await send('Page.enable', {}, sid);
      await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true }, sid);
      await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__lcp=0;new PerformanceObserver((l)=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});` }, sid);
      await send('Page.navigate', { url: BASE + page }, sid);
      await sleep(3000);
      const ev = await send('Runtime.evaluate', { expression: `JSON.stringify((()=>{const n=performance.getEntriesByType('navigation')[0];return {ttfb:Math.round(n.responseStart),dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),lcp:Math.round(window.__lcp),faces:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight).sort()}})())` }, sid);
      const t = JSON.parse(ev.result.result.value);
      listeners = listeners.filter((l) => l !== listener);
      await send('Target.closeTarget', { targetId: tgt.targetId });
      const all = [...resp.values()];
      const kb = (f) => Math.round(all.filter(f).reduce((s, x) => s + x.bytes, 0) / 102.4) / 10;
      out.push({ page, run, requests: all.length, transferKB: kb(() => true), scriptKB: kb((x) => x.type === 'Script'), fontKB: kb((x) => x.type === 'Font'), cssKB: kb((x) => x.type === 'Stylesheet'), imageKB: kb((x) => x.type === 'Image'), documentKB: kb((x) => x.type === 'Document'), fonts: all.filter((x) => x.type === 'Font').map((x) => x.url.split('/').pop() + ':' + x.bytes), faces: t.faces, ttfbMs: t.ttfb, dclMs: t.dcl, loadMs: t.load, lcpMs: t.lcp });
    }
  }
} finally {
  ws.close();
  edge.kill();
}
writeFileSync(outFile, JSON.stringify({ at: new Date().toISOString(), verdict: 'MEASURED, NO THRESHOLD; local Windows laptop, production build, disposable clone', viewport: '360x800@2x mobile', pages: out }, null, 2));
for (const p of out) console.log(`${p.page} ${p.run}: ${p.transferKB}KB js=${p.scriptKB}KB font=${p.fontKB}KB css=${p.cssKB}KB img=${p.imageKB}KB req=${p.requests} ttfb=${p.ttfbMs}ms dcl=${p.dclMs}ms load=${p.loadMs}ms lcp=${p.lcpMs}ms`);

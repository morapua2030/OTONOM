// Minimal real-browser driver: the locally installed Microsoft Edge (headless) over the DevTools Protocol.
// No browser download, no npm dependency (Node 24 built-in WebSocket). Used by the staff E2E suite.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sleep } from './http-client.ts';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

class Cdp {
  private id = 0;
  private pending = new Map<number, (v: any) => void>();
  private waiters: Array<{ method: string; sid?: string; resolve: (v: any) => void }> = [];
  private listeners: Array<{ sid: string; fn: (method: string, params: any) => void }> = [];
  /** Persistent per-session event listener (console messages, exceptions, network failures). */
  on(sid: string, fn: (method: string, params: any) => void) {
    this.listeners.push({ sid, fn });
  }
  constructor(private ws: WebSocket) {
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && this.pending.has(m.id)) {
        this.pending.get(m.id)!(m);
        this.pending.delete(m.id);
      } else if (m.method) {
        const i = this.waiters.findIndex((w) => w.method === m.method && (!w.sid || w.sid === m.sessionId));
        if (i >= 0) this.waiters.splice(i, 1)[0].resolve(m.params);
        for (const l of this.listeners) if (l.sid === m.sessionId) l.fn(m.method, m.params);
      }
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
  once(method: string, sid?: string, timeoutMs = 20000): Promise<any> {
    return Promise.race([new Promise((resolve) => this.waiters.push({ method, sid, resolve })), sleep(timeoutMs).then(() => null)]);
  }
  close() {
    this.ws.close();
  }
}

export type PageIssue = { kind: 'console-error' | 'exception' | 'request-failed' | 'http-5xx' | 'third-party'; text: string; url?: string };
export type PageResponse = { type: string; status: number; url: string; headers: Record<string, string> };

export class Page {
  /** Console errors, uncaught exceptions, failed requests and 5xx responses seen by this page (URLs without query strings). */
  issues: PageIssue[] = [];
  /** Document/script responses retained for security diagnostics (headers never include request bodies or credentials). */
  responses: PageResponse[] = [];
  lastUrls = new Map<string, string>();
  constructor(
    private cdp: Cdp,
    private sid: string,
    private targetId: string,
    public base: string,
    private shotsDir: string,
  ) {}
  async goto(p: string) {
    const loaded = this.cdp.once('Page.loadEventFired', this.sid);
    await this.cdp.send('Page.navigate', { url: p.startsWith('http') ? p : this.base + p }, this.sid);
    await loaded;
    await sleep(500);
  }
  async eval<T = any>(expr: string): Promise<T> {
    const r = await this.cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, this.sid);
    if (r.result?.exceptionDetails) throw new Error(`eval failed: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`);
    return r.result?.result?.value as T;
  }
  /** Wait until a JS expression is truthy (polling). */
  async waitFor(expr: string, timeoutMs = 15000, what = expr): Promise<any> {
    const t0 = Date.now();
    for (;;) {
      // DOM nodes cannot be returned by value over CDP: coerce them to true
      const v = await this.eval(`(() => { try { const v = ${expr}; return v instanceof Node ? true : v; } catch { return null; } })()`).catch(() => null);
      if (v) return v;
      if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for: ${what}`);
      await sleep(250);
    }
  }
  /** Wait until React has hydrated the element (event handlers attached) — clicking earlier triggers a native submit. */
  waitHydrated(selector: string, timeoutMs = 20000) {
    return this.waitFor(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps")); })()`, timeoutMs, `hydrated ${selector}`);
  }
  /** Set the value of an (uncontrolled) input/select/textarea or check a checkbox, firing input/change events. */
  async fill(selector: string, value: string | boolean) {
    const ok = await this.eval<boolean>(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      if (el.type === 'checkbox') el.checked = ${JSON.stringify(!!value)};
      else {
        const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(String(value))});
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`fill: no element ${selector}`);
  }
  async click(selector: string) {
    const ok = await this.eval<boolean>(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error(`click: no element ${selector}`);
  }
  exists(selector: string) {
    return this.eval<boolean>(`!!document.querySelector(${JSON.stringify(selector)})`);
  }
  text(selector: string) {
    return this.eval<string>(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`);
  }
  async screenshot(name: string) {
    const h = await this.eval<number>('Math.min(document.documentElement.scrollHeight, 6000)');
    const w = await this.eval<number>('window.innerWidth');
    const r = await this.cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } }, this.sid);
    mkdirSync(this.shotsDir, { recursive: true });
    if (r.result?.data) writeFileSync(path.join(this.shotsDir, name), Buffer.from(r.result.data, 'base64'));
  }
  /** Extra request headers for this page (e.g. a synthetic X-Forwarded-For behind the trusted local proxy setting). */
  async setHeaders(headers: Record<string, string>) {
    await this.cdp.send('Network.setExtraHTTPHeaders', { headers }, this.sid);
  }
  /** Simulate losing / regaining the network for this page. */
  async offline(on: boolean) {
    await this.cdp.send('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, this.sid);
  }
  async close() {
    await this.cdp.send('Target.closeTarget', { targetId: this.targetId });
  }
}

export class Browser {
  private constructor(
    private edge: ChildProcess,
    private cdp: Cdp,
    private base: string,
    private shotsDir: string,
  ) {}
  static async launch(base: string, profileDir: string, shotsDir: string, port = 9336) {
    const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', `--user-data-dir=${profileDir}`, `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', 'about:blank'], { stdio: 'ignore' });
    let wsUrl = '';
    for (let i = 0; i < 40 && !wsUrl; i++) {
      await sleep(500);
      wsUrl = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).then((j: any) => j.webSocketDebuggerUrl).catch(() => '');
    }
    if (!wsUrl) throw new Error('CDP not available');
    return new Browser(edge, await Cdp.connect(wsUrl), base, shotsDir);
  }
  /** A fresh, isolated browser context (own cookies) — one per signed-in person. */
  async newPage(width = 1366, height = 900): Promise<Page> {
    const { result: ctx } = await this.cdp.send('Target.createBrowserContext', {});
    const { result: tgt } = await this.cdp.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx.browserContextId });
    const { result: att } = await this.cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
    const sid = att.sessionId;
    await this.cdp.send('Page.enable', {}, sid);
    await this.cdp.send('Runtime.enable', {}, sid);
    await this.cdp.send('Network.enable', {}, sid);
    await this.cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 }, sid);
    // confirm() dialogs are accepted automatically (the test asserts the server outcome instead)
    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm = () => true;' }, sid);
    const page = new Page(this.cdp, sid, tgt.targetId, this.base, this.shotsDir);
    const clean = (u?: string) => (u ? u.split('?')[0].replace(this.base, '') : undefined);
    this.cdp.on(sid, (method, p) => {
      if (method === 'Runtime.consoleAPICalled' && p.type === 'error') page.issues.push({ kind: 'console-error', text: (p.args ?? []).map((a: any) => a.value ?? a.description ?? '').join(' ').slice(0, 200) });
      if (method === 'Runtime.exceptionThrown') page.issues.push({ kind: 'exception', text: String(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? '').slice(0, 200) });
      if (method === 'Network.loadingFailed' && !p.canceled)
        page.issues.push({ kind: 'request-failed', text: [p.errorText, p.blockedReason, p.corsErrorStatus?.corsError].filter(Boolean).join(' | '), url: clean(page.lastUrls.get(p.requestId)) });
      if (method === 'Network.requestWillBeSent') {
        page.lastUrls.set(p.requestId, p.request?.url);
        const u = String(p.request?.url ?? '');
        if (/^https?:\/\//.test(u) && !u.startsWith(this.base)) page.issues.push({ kind: 'third-party', text: 'request to another host', url: u.split('?')[0] });
      }
      if (method === 'Network.responseReceived') {
        if (p.response?.status >= 500) page.issues.push({ kind: 'http-5xx', text: String(p.response.status), url: clean(p.response.url) });
        if (p.type === 'Document' || p.type === 'Script') {
          const headers = Object.fromEntries(Object.entries(p.response?.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
          page.responses.push({ type: p.type, status: Number(p.response?.status ?? 0), url: String(p.response?.url ?? '').split('?')[0], headers });
        }
      }
    });
    return page;
  }
  close() {
    this.cdp.close();
    this.edge.kill();
  }
}

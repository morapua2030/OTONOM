// Minimal cookie-aware HTTP client for black-box API tests (no external deps).
export type Res = { status: number; headers: Headers; text: string; json: any };

export class Client {
  cookies = new Map<string, string>();
  /** Headers a real same-origin browser would send (used to emulate browsers against Payload's CSRF check). */
  defaultHeaders: Record<string, string> = {};
  constructor(public base: string, public name = 'anon', browserLike = false) {
    if (browserLike) this.defaultHeaders = { 'sec-fetch-site': 'same-origin', origin: base };
  }

  private cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async req(method: string, path: string, opts: { json?: unknown; body?: BodyInit; headers?: Record<string, string> } = {}): Promise<Res> {
    const headers: Record<string, string> = { ...this.defaultHeaders, ...(opts.headers ?? {}) };
    if (this.cookies.size) headers.cookie = this.cookieHeader();
    let body = opts.body;
    if (opts.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(opts.json);
    }
    const r = await fetch(this.base + path, { method, headers, body, redirect: 'manual' });
    for (const sc of r.headers.getSetCookie?.() ?? []) {
      const [kv] = sc.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      if (/max-age=0/i.test(sc) || v === '') this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
    const text = await r.text();
    let json: any = undefined;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { status: r.status, headers: r.headers, text, json };
  }
  get(p: string, h?: Record<string, string>) {
    return this.req('GET', p, { headers: h });
  }
  post(p: string, json?: unknown, h?: Record<string, string>) {
    return this.req('POST', p, { json: json ?? {}, headers: h });
  }
  patch(p: string, json?: unknown) {
    return this.req('PATCH', p, { json: json ?? {} });
  }
  del(p: string) {
    return this.req('DELETE', p);
  }
}

export type Check = { id: string; criterion: string; description: string; pass: boolean; detail?: unknown };

export class Recorder {
  checks: Check[] = [];
  add(id: string, criterion: string, description: string, pass: boolean, detail?: unknown) {
    const d = detail === undefined ? undefined : JSON.stringify(detail)?.slice(0, 600);
    this.checks.push({ id, criterion, description, pass, detail: d });
    if (!pass) console.log(`  FAIL ${id}: ${description} ${JSON.stringify(detail)?.slice(0, 300)}`);
  }
  summary() {
    const by: Record<string, { pass: number; fail: number }> = {};
    for (const c of this.checks) {
      by[c.criterion] ??= { pass: 0, fail: 0 };
      by[c.criterion][c.pass ? 'pass' : 'fail']++;
    }
    return by;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

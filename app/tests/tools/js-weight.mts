// JS weight per page (cold, cache disabled): every script resource's transfer and encoded (gzip on the wire) bytes.
// Usage (from app/tests): npx tsx <this> <base> <out.json> <profileDir> <port>
import { writeFileSync } from 'node:fs';
import { Browser } from '../src/browser.ts';
const [base, out, profile, port = '9395'] = process.argv.slice(2);
const PAGES = ['/ar', '/en', '/ar/services/smart-home-automation', '/ar/smart-home/packages', '/ar/products', '/ar/products/16r', '/ar/products/4r', '/ar/start-project', '/ar/contact', '/ar/services', '/ar/about', '/ar/try', '/en/try'];
const browser = await Browser.launch(base, profile, profile, Number(port));
const res: Record<string, unknown> = {};
try {
  for (const p of PAGES) {
    const page = await browser.newPage(1440, 900);
    await page.goto(p);
    await new Promise((r) => setTimeout(r, 1500));
    const r = await page.eval<any>(`(() => { const e = performance.getEntriesByType('resource').filter((x) => x.initiatorType === 'script' || x.name.split('?')[0].endsWith('.js')); return { status: performance.getEntriesByType('navigation')[0]?.responseStatus, scripts: e.map((x) => ({ name: new URL(x.name).pathname, encoded: x.encodedBodySize, decoded: x.decodedBodySize, transfer: x.transferSize })), encoded: e.reduce((a, x) => a + x.encodedBodySize, 0), decoded: e.reduce((a, x) => a + x.decodedBodySize, 0), doc: performance.getEntriesByType('navigation')[0]?.encodedBodySize, all: performance.getEntriesByType('resource').reduce((a, x) => a + x.transferSize, 0) + (performance.getEntriesByType('navigation')[0]?.transferSize || 0) }; })()`);
    res[p] = r;
    await page.close();
  }
} finally { browser.close(); }
writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), base, res }, null, 1));
console.log(Object.entries(res).map(([p, r]: any) => `${p} status=${r.status} jsEncoded=${r.encoded} jsDecoded=${r.decoded} scripts=${r.scripts.length}`).join('\n'));

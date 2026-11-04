// Logs the LCP element of each page and the platform font(s) actually used for its text (CDP CSS.getPlatformFontsForNode).
import { writeFileSync } from 'node:fs';
import { Browser } from '../src/browser.ts';
const [base, prof, out, widthsArg = '360,1440'] = process.argv.slice(2);
const PAGES = ['/ar', '/en', '/ar/try', '/en/try', '/ar/smart-home/packages', '/en/smart-home/packages', '/ar/products', '/en/products'];
const b = await Browser.launch(base, prof, prof, 9421);
const rows: any[] = [];
try {
  for (const width of widthsArg.split(',').map(Number)) for (const path of PAGES) {
    const p: any = await b.newPage(width, width < 1000 ? 800 : 900);
    if (width < 1000) await p.cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 2, mobile: true }, p.sid);
    await p.goto(path);
    await new Promise((r) => setTimeout(r, 2500));
    const info = await p.eval(`new Promise((resolve) => { new PerformanceObserver((list) => { const es = list.getEntries(); const e = es[es.length - 1]; if (!e) return resolve(null); const el = e.element; if (el) el.setAttribute('data-lcp-probe', '1'); const cs = el ? getComputedStyle(el) : null; resolve({ time: Math.round(e.startTime), size: e.size, url: e.url || '', tag: el?.tagName, cls: el ? String(el.className).slice(0, 60) : '', text: el ? (el.textContent || '').trim().slice(0, 60) : '', fontFamily: cs?.fontFamily, fontWeight: cs?.fontWeight, candidates: es.length }); }).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => resolve(null), 1500); })`);
    let fonts: any = null;
    if (info && !info.url) {
      const { result: doc } = await p.cdp.send('DOM.getDocument', { depth: 0 }, p.sid);
      const { result: q } = await p.cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '[data-lcp-probe]' }, p.sid);
      await p.cdp.send('CSS.enable', {}, p.sid);
      const { result: f } = await p.cdp.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId }, p.sid);
      fonts = f?.fonts;
    }
    const loaded = await p.eval(`[...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight)`);
    const preload = await p.eval(`[...document.querySelectorAll('link[rel=preload][as=font]')].map((l) => l.getAttribute('href').split('/').pop())`);
    rows.push({ width, path, lcp: info, platformFonts: fonts, loadedFaces: loaded, preload });
    console.log(width, path, JSON.stringify(info), JSON.stringify(fonts), 'preload=' + preload.join(','));
    await p.close();
  }
} finally { b.close(); }
writeFileSync(out, JSON.stringify(rows, null, 1));

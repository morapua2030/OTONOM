// Cold-load timing of selected pages (mobile 360x800@2x, cache disabled): LCP entries, FCP and font resource timing.
import { writeFileSync } from 'node:fs';
import { Browser } from '../src/browser.ts';
const [base, prof, out, runsArg = '10', pagesArg = '/ar/try,/ar'] = process.argv.slice(2);
const b = await Browser.launch(base, prof, prof, 9431);
const rows: any[] = [];
try {
  for (const path of pagesArg.split(',')) for (let i = 0; i < Number(runsArg); i++) {
    const p: any = await b.newPage(360, 800);
    await p.cdp.send('Network.enable', {}, p.sid);
    await p.cdp.send('Network.clearBrowserCache', {}, p.sid);
    await p.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, p.sid);
    await p.cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true }, p.sid);
    await p.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__lcp=[];new PerformanceObserver((l)=>{for(const e of l.getEntries())window.__lcp.push({t:Math.round(e.startTime),tag:e.element&&e.element.tagName,size:e.size,url:e.url?'img':''})}).observe({type:'largest-contentful-paint',buffered:true});` }, p.sid);
    await p.goto(path);
    await new Promise((r) => setTimeout(r, 3000));
    const r = await p.eval(`({ lcp: window.__lcp, fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime||0), fonts: performance.getEntriesByType('resource').filter(e=>/woff2/.test(e.name)).map(e=>({f:e.name.split('/').pop().slice(0,34),start:Math.round(e.startTime),end:Math.round(e.responseEnd)})), css: performance.getEntriesByType('resource').filter(e=>/\.css/.test(e.name)).map(e=>Math.round(e.responseEnd)) })`);
    rows.push({ path, i, ...r });
    console.log(path, i, 'fcp', r.fcp, 'lcp', JSON.stringify(r.lcp), 'fonts', JSON.stringify(r.fonts), 'css', JSON.stringify(r.css));
    await p.close();
  }
} finally { b.close(); }
writeFileSync(out, JSON.stringify(rows, null, 1));

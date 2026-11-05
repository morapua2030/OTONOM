// D8-C v4 screenshots: /try in every simDemo state + the entry-point pages, AR/EN × widths. Read-only browsing.
// Usage (from app/tests): npx tsx <this> <base> <outDir> <profileDir> <cdpPort> [widths] [only]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Browser } from '../src/browser.ts';
const [base, out, profile, port = '9381', widthsArg = '390,1440', only = ''] = process.argv.slice(2);
const REF = base.includes(":8765");
const DEMOS = ['fresh', 'apartment', 'night', 'routine', 'gas', 'day', 'over', 'plan'];
const ENTRY: Array<[string, string]> = [['home', ''], ['smart-home', '/services/smart-home-automation'], ['packages', '/smart-home/packages'], ['products', '/products'], ['product-16r', '/products/16r']];
const screens: Array<[string, string]> = [...DEMOS.map((d) => [`sim-${d}`, d === 'fresh' ? '/try' : `/try?demo=${d}`] as [string, string]), ...ENTRY];
mkdirSync(out, { recursive: true });
const browser = await Browser.launch(base, profile, out, Number(port));
const log: any[] = [];
try {
  for (const locale of ['ar', 'en']) for (const width of widthsArg.split(',').map(Number)) for (const [name, route] of screens) {
    if (only && !name.includes(only)) continue;
    const page = await browser.newPage(width, 900);
    if (width < 1000) await page.touch();
    await page.reducedMotion();
    await page.goto(REF ? `/${locale}-${name}.html` : `/${locale}${route}`);
    await page.eval(`(async () => { await new Promise((r) => setTimeout(r, ${REF ? 2500 : 700})); await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); }))); })()`);
    const doc = [...page.responses].reverse().find((r) => r.type === 'Document');
    log.push({ locale, width, screen: name, status: doc?.status, scrollY: await page.eval<number>('scrollY'), issues: page.issues.length });
    await page.screenshot(`${locale}-${width}-${name}.png`);
    await page.close();
  }
} finally { browser.close(); }
writeFileSync(path.join(out, 'shots.json'), JSON.stringify({ at: new Date().toISOString(), base, log }, null, 1));
console.log(JSON.stringify({ shots: log.length, non200: log.filter((l) => l.status !== 200).length, issues: log.filter((l) => l.issues).map((l) => l.screen + l.locale + l.width) }));

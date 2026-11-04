// Scans <title>, meta description, og:* and twitter:* text of every sitemap route (AR + EN) plus the 404 pages for
// bidi control characters (U+2066–U+2069, U+200E–U+200F, U+202A–U+202E) and double spaces. Usage: node meta-scan.mjs <base>
const base = process.argv[2] ?? 'http://127.0.0.1:3301';
const sm = await fetch(base + '/sitemap.xml').then((r) => r.text());
const paths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const extra = ['/ar/this-page-does-not-exist', '/en/this-page-does-not-exist', '/ar/products/99r', '/en/products/99r', '/xx', '/xx/about', '/ar/try?demo=night', '/en/try?demo=plan'];
const BAD = /[⁦-⁩‎‏‪-‮]/;
const dec = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
let bad = 0;
const rows = [];
for (const p of [...new Set([...paths, ...extra])]) {
  const r = await fetch(base + p, { redirect: 'manual' });
  const html = await r.text();
  const head = html.replace(/<svg[\s\S]*?<\/svg>/g, '');
  const texts = [];
  for (const m of head.matchAll(/<title>([^<]*)<\/title>/g)) texts.push(['title', dec(m[1])]);
  for (const m of head.matchAll(/<meta ([^>]*)>/g)) {
    const a = m[1];
    const key = (a.match(/(?:name|property)="([^"]+)"/) || [])[1];
    const content = (a.match(/content="([^"]*)"/) || [])[1];
    if (key && content != null && /^(description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)$/.test(key)) texts.push([key, dec(content)]);
  }
  const issues = texts.filter(([, t]) => BAD.test(t) || /\s{2}/.test(t) || t !== t.trim()).map(([k, t]) => `${k}: ${JSON.stringify(t)}`);
  bad += issues.length;
  rows.push({ path: p, status: r.status, title: (texts.find((x) => x[0] === 'title') || [])[1], titles: texts.filter((x) => x[0] === 'title').length, issues });
}
console.log(JSON.stringify({ base, routes: rows.length, bad, rows }, null, 1));

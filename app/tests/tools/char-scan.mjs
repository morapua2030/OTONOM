// Lists every code point used in the HTML text of all sitemap routes (AR + EN) and flags the ones outside the
// Arabic font subset (U+0600-06FF) that the original Arabic files covered (Arabic Supplement/Extended, presentation forms).
const base = process.argv[2] ?? 'http://127.0.0.1:3301';
const sm = await fetch(base + '/sitemap.xml').then((r) => r.text());
const ar = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const paths = [...new Set([...ar, ...ar.map((p) => p.replace(/^\/ar/, '/en')), '/ar/try?demo=plan', '/ar/try?demo=night', '/ar/projects', '/ar/this-page-does-not-exist'])];
const DROP = /[ݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ]/gu;
const found = {};
const all = new Set();
for (const p of paths) {
  const html = await fetch(base + p).then((r) => r.text());
  for (const ch of html) all.add(ch.codePointAt(0));
  for (const m of html.matchAll(DROP)) (found[p] ??= new Set()).add('U+' + m[0].codePointAt(0).toString(16).toUpperCase());
}
const nonAscii = [...all].filter((c) => c > 0x7e).sort((a, b) => a - b).map((c) => c.toString(16).toUpperCase());
console.log(JSON.stringify({ pages: paths.length, dropped: Object.fromEntries(Object.entries(found).map(([k, v]) => [k, [...v]])), nonAsciiCodePoints: nonAscii.join(' ') }, null, 1));

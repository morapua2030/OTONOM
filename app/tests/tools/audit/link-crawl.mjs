// D8-A §3.4: internal link crawl. Seeds = sitemap URLs + every inventoried public page (both locales, SSR HTML incl.
// header/footer nav) + rendered hrefs from pages.json when present. Follows every internal href (status, one redirect hop)
// and checks every #anchor against the target's SSR ids, then the rendered ids from pages.json.
// Usage: node link-crawl.mjs <base> <outDir>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROUTES, LOCALES } from './routes.mjs';

const [base, out] = process.argv.slice(2);
const inv = JSON.parse(readFileSync(path.join(out, 'route-inventory.json'), 'utf8'));
const rendered = existsSync(path.join(out, 'pages.json')) ? JSON.parse(readFileSync(path.join(out, 'pages.json'), 'utf8')).results : [];
const seeds = new Set([...inv.sitemap.paths.flatMap((p) => LOCALES.map((l) => `/${l}${p}`)), ...ROUTES.filter((r) => ['PUBLIC-INDEXED', 'PUBLIC-NOINDEX'].includes(r.cls)).flatMap((r) => LOCALES.map((l) => `/${l}${r.path}`))]);
const html = new Map();
async function fetchPage(p) {
  if (html.has(p)) return html.get(p);
  const r = await fetch(base + p, { redirect: 'manual' });
  const body = r.headers.get('content-type')?.includes('html') ? await r.text() : (await r.arrayBuffer(), '');
  const v = { status: r.status, location: r.headers.get('location') ?? undefined, body, ids: new Set([...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) };
  html.set(p, v);
  return v;
}
const edges = []; // { from, href }
for (const s of seeds) {
  const page = await fetchPage(s);
  for (const m of page.body.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) edges.push({ from: s, href: m[1].replace(/&amp;/g, '&'), via: 'ssr' });
}
for (const r of rendered) for (const href of r.links ?? []) edges.push({ from: r.url, href, via: `dom@${r.width}` });
const internal = edges.filter((e) => e.href.startsWith('/') || e.href.startsWith('#') || e.href.startsWith(base));
const external = [...new Set(edges.filter((e) => /^(https?:|mailto:|tel:)/.test(e.href) && !e.href.startsWith(base)).map((e) => e.href))];
const targets = new Map();
for (const e of internal) {
  const abs = e.href.startsWith('#') ? e.from + e.href : e.href.replace(base, '');
  const [pathAndQuery, frag] = abs.split('#');
  const key = pathAndQuery || e.from;
  if (!targets.has(key)) targets.set(key, { url: key, from: new Set(), frags: new Map() });
  const t = targets.get(key); t.from.add(e.from);
  if (frag) t.frags.set(frag, [...(t.frags.get(frag) ?? []), e.from]);
}
const results = [];
const findings = [];
for (const t of targets.values()) {
  const r = await fetchPage(t.url);
  let final = r;
  if (r.status >= 300 && r.status < 400 && r.location) final = await fetchPage(r.location.replace(base, ''));
  const res = { url: t.url, status: r.status, location: r.location, finalStatus: final.status, from: [...t.from].slice(0, 6), fromCount: t.from.size, anchors: [] };
  // v3: an internal link must not go through a redirect (nav/footer/body links point at the final page).
  if (r.status >= 300 && r.status < 400 && t.url !== '/') findings.push({ check: 'links.internal-redirect', route: t.url, locale: t.url.split('/')[1], viewport: 'http', evidence: `HTTP ${r.status} → ${r.location}; linked from ${[...t.from].slice(0, 4).join(', ')}${t.from.size > 4 ? ` +${t.from.size - 4}` : ''}`, severity: 'moderate' });
  if (final.status !== 200) findings.push({ check: 'links.non-200', route: t.url, locale: t.url.split('/')[1], viewport: 'http', evidence: `HTTP ${r.status}${r.location ? ` → ${r.location} (${final.status})` : ''}; linked from ${[...t.from].slice(0, 4).join(', ')}${t.from.size > 4 ? ` +${t.from.size - 4}` : ''}`, severity: 'serious' });
  for (const [frag, froms] of t.frags) {
    const id = decodeURIComponent(frag);
    let ok = final.ids.has(id);
    let how = ok ? 'ssr' : '';
    if (!ok) { const dom = rendered.find((x) => x.url === t.url.split('?')[0] && (x.ids ?? []).includes(id)); if (dom) { ok = true; how = `dom@${dom.width}`; } }
    res.anchors.push({ frag: id, ok, how, from: [...new Set(froms)].slice(0, 4) });
    if (!ok) findings.push({ check: 'links.anchor-missing', route: `${t.url}#${id}`, locale: t.url.split('/')[1], viewport: 'http+dom', evidence: `no element id="${id}"; linked from ${[...new Set(froms)].slice(0, 4).join(', ')}`, severity: 'moderate' });
  }
  results.push(res);
}
writeFileSync(path.join(out, 'link-crawl.json'), JSON.stringify({ at: new Date().toISOString(), base, seeds: seeds.size, edges: edges.length, internalTargets: results.length, external, results, findings }, null, 1));
console.log(JSON.stringify({ seeds: seeds.size, edges: edges.length, targets: results.length, anchors: results.reduce((a, r) => a + r.anchors.length, 0), external: external.length, findings: findings.length }));
for (const f of findings) console.log(`[${f.severity}] ${f.check} ${f.route} :: ${f.evidence}`);

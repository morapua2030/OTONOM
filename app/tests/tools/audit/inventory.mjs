// D8-A §2 + §3.3: HTTP inventory of every route (status, lang/dir, title, description, robots, canonical, hreflang, OG, Twitter),
// plus sitemap/robots and SEO consistency checks. Usage: node inventory.mjs <base> <outDir>
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROUTES, STAFF, ERRORS, LOCALES, SITEMAP_STATIC, REDIRECTS, GATED_TEMP } from './routes.mjs';

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const dec = (s) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => dec(new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]);
function head(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]);
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
  const meta = (k, v) => metas.filter((t) => attr(t, k) === v).map((t) => attr(t, 'content'));
  const htmlTag = /<html\b[^>]*>/.exec(html)?.[0] ?? '';
  return {
    lang: attr(htmlTag, 'lang'), dir: attr(htmlTag, 'dir'),
    title: dec(/<title>([^<]*)<\/title>/.exec(html)?.[1]),
    description: meta('name', 'description')[0],
    robots: meta('name', 'robots')[0],
    canonical: links.filter((t) => attr(t, 'rel') === 'canonical').map((t) => attr(t, 'href'))[0],
    hreflang: Object.fromEntries(links.filter((t) => attr(t, 'rel') === 'alternate' && attr(t, 'hrefLang') ).map((t) => [attr(t, 'hrefLang'), attr(t, 'href')])),
    hreflangLower: Object.fromEntries(links.filter((t) => attr(t, 'rel') === 'alternate' && attr(t, 'hreflang')).map((t) => [attr(t, 'hreflang'), attr(t, 'href')])),
    ogTitle: meta('property', 'og:title')[0], ogImage: meta('property', 'og:image')[0], ogLocale: meta('property', 'og:locale')[0],
    twitterCard: meta('name', 'twitter:card')[0], twitterImage: meta('name', 'twitter:image')[0],
    icons: links.filter((t) => /icon/.test(attr(t, 'rel') ?? '')).map((t) => `${attr(t, 'rel')}=${attr(t, 'href')}`),
  };
}
async function get(p) {
  const r = await fetch(base + p, { redirect: 'manual', headers: { 'accept-language': 'ar' } });
  const body = await r.text();
  return { status: r.status, location: r.headers.get('location') ?? undefined, type: r.headers.get('content-type') ?? '', body };
}

const rows = [];
for (const route of ROUTES) for (const locale of LOCALES) {
  const url = `/${locale}${route.path}`;
  const r = await get(url);
  rows.push({ url, path: route.path, locale, cls: route.cls, source: route.source, note: route.note, status: r.status, ...(r.type.includes('html') ? head(r.body) : {}) });
}
for (const [from, to] of REDIRECTS) for (const locale of LOCALES) {
  // v3: every retired route must answer 308 to its replacement with the locale kept and the query dropped.
  const url = `/${locale}${from}?utm=x&q=1`;
  const r = await get(url);
  rows.push({ url, path: from, locale, cls: 'REDIRECT-308', status: r.status, location: r.location, expected: `/${locale}${to}` });
}
// final release (DR-114): a gated page answers a TEMPORARY 307 to its fallback until the owner enables it
for (const [from, to] of GATED_TEMP) for (const locale of LOCALES) {
  const r = await get(`/${locale}${from}`);
  rows.push({ url: `/${locale}${from}`, path: from, locale, cls: 'GATED-307', status: r.status, location: r.location, expected: `/${locale}${to}` });
}
for (const url of STAFF) { const r = await get(url); rows.push({ url, path: url, locale: '-', cls: 'STAFF', status: r.status, location: r.location, ...(r.type.includes('html') ? head(r.body) : {}) }); }
for (const url of ERRORS) { const r = await get(url); rows.push({ url, path: url, locale: url.split('/')[1], cls: 'ERROR-PROBE', status: r.status, ...(r.type.includes('html') ? head(r.body) : {}) }); }
const root = await get('/');
rows.push({ url: '/', path: '/', locale: '-', cls: 'LOCALE-NEGOTIATION', status: root.status, location: root.location });
const robots = await get('/robots.txt');
const sitemap = await get('/sitemap.xml');
const locs = [...sitemap.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
const siteUrl = locs[0]?.replace(/\/ar(\/.*)?$/, '') ?? '';
const sitemapPaths = locs.map((l) => l.slice(siteUrl.length).replace(/^\/ar/, ''));
const sitemapAlt = [...sitemap.body.matchAll(/<url>(.*?)<\/url>/g)].map((m) => ({ loc: /<loc>([^<]*)/.exec(m[1])[1], alts: [...m[1].matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((a) => `${a[1]}=${a[2]}`) }));

// ---- SEO / i18n findings
const findings = [];
const add = (f) => findings.push(f);
const pages = rows.filter((r) => ['PUBLIC-INDEXED', 'PUBLIC-NOINDEX'].includes(r.cls));
for (const r of pages) {
  const ev = `inventory ${r.url}`;
  if (r.status !== 200) add({ check: 'seo.status', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: HTTP ${r.status}`, severity: 'serious' });
  if (r.lang !== r.locale || r.dir !== (r.locale === 'ar' ? 'rtl' : 'ltr')) add({ check: 'i18n.lang-dir', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: lang=${r.lang} dir=${r.dir}`, severity: 'serious' });
  if (!r.title) add({ check: 'seo.title-missing', route: r.path, locale: r.locale, viewport: 'http', evidence: ev, severity: 'serious' });
  if (!r.description) add({ check: 'seo.description-missing', route: r.path, locale: r.locale, viewport: 'http', evidence: ev, severity: 'moderate' });
  const want = `${r.locale ? `/${r.locale}` : ''}${r.path}`;
  const canon = r.canonical?.replace(siteUrl, '');
  if (canon !== want) add({ check: 'seo.canonical', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: canonical=${r.canonical} want ${siteUrl}${want}`, severity: 'serious' });
  const h = { ...r.hreflang, ...r.hreflangLower };
  const strip = (u) => u?.replace(siteUrl, '');
  if (strip(h.ar) !== `/ar${r.path}` || strip(h.en) !== `/en${r.path}` || strip(h['x-default']) !== `/ar${r.path}`) add({ check: 'seo.hreflang', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: ${JSON.stringify(h)}`, severity: 'serious' });
  if (!r.ogImage?.endsWith('/brand/otonom/assets/og/og-card-1200x630.png') || !r.ogTitle) add({ check: 'seo.og', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: og:title=${r.ogTitle} og:image=${r.ogImage}`, severity: 'moderate' });
  if (r.twitterCard !== 'summary_large_image' || !r.twitterImage?.endsWith('og-card-1200x630.png')) add({ check: 'seo.twitter', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: card=${r.twitterCard} image=${r.twitterImage}`, severity: 'moderate' });
  if (!r.icons?.some((i) => i.includes('/brand/otonom/assets/icons/favicon.ico'))) add({ check: 'brand.favicon', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: ${r.icons}`, severity: 'moderate' });
  if (!/noindex/.test(r.robots ?? '')) add({ check: 'seo.robots-local', route: r.path, locale: r.locale, viewport: 'http', evidence: `${ev}: robots=${r.robots} (local must be noindex)`, severity: 'serious' });
}
// Titles unique per route+locale
const byTitle = new Map();
for (const r of pages) { const k = `${r.locale}|${r.title}`; byTitle.set(k, [...(byTitle.get(k) ?? []), r.path]); }
for (const [k, paths] of byTitle) if (paths.length > 1) add({ check: 'seo.title-duplicate', route: paths.join(', '), locale: k.split('|')[0], viewport: 'http', evidence: `title "${k.split('|')[1]}" shared by ${paths.length} routes`, severity: 'minor' });
// Sitemap coverage
const indexed = rows.filter((r) => r.cls === 'PUBLIC-INDEXED' && r.locale === 'ar').map((r) => r.path);
for (const p of indexed) if (!sitemapPaths.includes(p)) add({ check: 'seo.sitemap-omission', route: p, locale: 'ar+en', viewport: 'http', evidence: `sitemap.xml has no <loc> for ${siteUrl}/ar${p}`, severity: 'moderate' });
const noindexPaths = rows.filter((r) => ['PUBLIC-NOINDEX', 'TEST-ONLY'].includes(r.cls)).map((r) => r.path);
for (const p of sitemapPaths) if (noindexPaths.includes(p)) add({ check: 'seo.sitemap-noindex', route: p, locale: 'ar+en', viewport: 'http', evidence: `sitemap lists noindex ${p}`, severity: 'serious' });
for (const u of sitemapAlt) if (u.alts.length !== 3) add({ check: 'seo.sitemap-alternates', route: u.loc, locale: '-', viewport: 'http', evidence: u.alts.join(' '), severity: 'moderate' });
for (const p of sitemapPaths) { const row = rows.find((r) => r.path === p && r.locale === 'ar'); if (!row && !p.startsWith('/projects/')) add({ check: 'seo.sitemap-unknown', route: p, locale: '-', viewport: 'http', evidence: 'sitemap path not in route inventory', severity: 'minor' }); else if (row && row.status !== 200) add({ check: 'seo.sitemap-non200', route: p, locale: 'ar', viewport: 'http', evidence: `HTTP ${row.status}`, severity: 'serious' }); }
// TEST-ONLY must 404; staff login must render
for (const r of rows.filter((x) => x.cls === 'REDIRECT-308')) {
  const loc = r.location?.replace(/^https?:\/\/[^/]+/, '');
  if (r.status !== 308 || loc !== r.expected) add({ check: 'routing.redirect', route: r.path, locale: r.locale, viewport: 'http', evidence: `HTTP ${r.status} → ${r.location ?? '—'} (expected 308 → ${r.expected})`, severity: 'serious' });
}
for (const r of rows.filter((x) => x.cls === 'GATED-307')) { const loc = r.location ? new URL(r.location, 'http://x').pathname : null; if (r.status !== 307 || loc !== r.expected) add({ check: 'routing.gated', route: r.path, locale: r.locale, viewport: 'http', evidence: `HTTP ${r.status} → ${r.location ?? '—'} (expected 307 → ${r.expected} while the owner has not enabled it)`, severity: 'serious' }); }
for (const p of sitemapPaths) if (GATED_TEMP.some(([from]) => from === p) && rows.some((x) => x.cls === 'GATED-307' && x.path === p && x.status !== 200)) add({ check: 'seo.sitemap-redirected', route: p, locale: '-', viewport: 'http', evidence: 'a gated page that redirects is listed in the sitemap', severity: 'serious' });
for (const p of sitemapPaths) if (REDIRECTS.some(([from]) => from === p)) add({ check: 'seo.sitemap-redirected', route: p, locale: '-', viewport: 'http', evidence: 'redirected route listed in the sitemap', severity: 'serious' });
for (const r of rows.filter((x) => x.cls === 'TEST-ONLY')) if (r.status !== 404) add({ check: 'routing.test-only-exposed', route: r.path, locale: r.locale, viewport: 'http', evidence: `HTTP ${r.status}`, severity: 'critical' });

const result = { at: new Date().toISOString(), base, siteUrl, robots: { status: robots.status, body: robots.body }, sitemap: { status: sitemap.status, count: locs.length, paths: sitemapPaths }, rows, findings };
writeFileSync(path.join(out, 'route-inventory.json'), JSON.stringify(result, null, 2));
const esc = (s) => String(s ?? '').replaceAll('|', '\\|');
const md = ['# D8-A route inventory', '', `Base ${base} · ${result.at} · sitemap ${locs.length} URLs · robots ${JSON.stringify(robots.body)}`, '', '| URL | Class | Status | lang/dir | Title | Description | Robots | Canonical | hreflang ar/en/x-default | og:image | twitter |', '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => { const h = { ...r.hreflang, ...r.hreflangLower }; return `| ${esc(r.url)} | ${r.cls} | ${r.status}${r.location ? ` → ${r.location}` : ''} | ${r.lang ?? ''}/${r.dir ?? ''} | ${esc(r.title)} | ${r.description ? 'yes' : '—'} | ${esc(r.robots)} | ${esc(r.canonical?.replace(siteUrl, ''))} | ${[h.ar, h.en, h['x-default']].map((u) => u?.replace(siteUrl, '') ?? '—').join(' · ')} | ${r.ogImage ? 'card' : '—'} | ${r.twitterCard ?? '—'} |`; }),
  '', '## SEO/i18n findings', '', ...findings.map((f) => `- [${f.severity}] ${f.check} · ${f.route} · ${f.locale} · ${f.evidence}`)];
writeFileSync(path.join(out, 'route-inventory.md'), md.join('\n'));
console.log(JSON.stringify({ rows: rows.length, sitemap: locs.length, findings: findings.length, byCheck: findings.reduce((a, f) => ((a[f.check] = (a[f.check] ?? 0) + 1), a), {}) }));

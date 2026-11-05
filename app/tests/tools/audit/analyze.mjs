// D8-A: merge inventory / pages / keyboard / link-crawl / errors into one findings list (route, locale, viewport, evidence,
// severity, check) and build the screenshot contact sheet (screens/index.html). Usage: node analyze.mjs <outDir> <sha> [tag]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const [out, sha, tag = 'before'] = process.argv.slice(2);
const read = (f) => (existsSync(path.join(out, f)) ? JSON.parse(readFileSync(path.join(out, f), 'utf8')) : null);
const inv = read('route-inventory.json');
const pages = read('pages.json')?.results ?? [];
const kb = read('keyboard-log.json')?.log ?? [];
const links = read('link-crawl.json');
const errs = read('errors.json')?.res ?? [];
const findings = [];
const groups = new Map();
// group identical (check, route, detail) across locales/viewports
function add(f) {
  const k = `${f.check}|${f.route}|${f.key ?? f.evidence}`;
  if (!groups.has(k)) { groups.set(k, { ...f, locales: new Set(), viewports: new Set(), shots: [] }); findings.push(groups.get(k)); }
  const g = groups.get(k); g.locales.add(f.locale); g.viewports.add(f.viewport); if (f.shot && g.shots.length < 2) g.shots.push(f.shot);
}
for (const f of inv?.findings ?? []) add(f);
for (const f of links?.findings ?? []) add(f);
for (const p of pages) {
  const base = { route: p.path || '/', locale: p.locale, viewport: String(p.width), shot: p.shot };
  const F = p.facts;
  for (const v of p.violations) add({ ...base, check: `axe.${v.id}`, key: v.id + '|' + v.targets.map((t) => t.target).slice(0, 3).join(','), severity: v.impact === 'n/a' ? 'serious' : v.impact, evidence: `${v.help} — ${v.nodes} node(s): ${v.targets.slice(0, 3).map((t) => `${t.target} ${t.summary.replace(/\s+/g, ' ').slice(0, 140)}`).join(' | ')}` });
  if (F.h1 !== 1) add({ ...base, check: 'a11y.h1-count', key: String(F.h1), severity: 'moderate', evidence: `h1 count ${F.h1}: ${JSON.stringify(F.h1Text)}` });
  for (const s of F.headingSkips) add({ ...base, check: 'a11y.heading-skip', key: `${s.from.level}>${s.to.level}:${s.to.at}`, severity: 'moderate', evidence: `h${s.from.level} "${s.from.text}" → h${s.to.level} "${s.to.text}" at ${s.to.at}` });
  for (const i of F.imgsNoAlt) add({ ...base, check: 'a11y.img-alt-missing', key: i.src, severity: 'serious', evidence: `${i.src} at ${i.at}` });
  for (const i of F.imgsNoDims) add({ ...base, check: 'cls.img-no-dimensions', key: i.src, severity: 'minor', evidence: `${i.src} (width=${i.w} height=${i.h}) at ${i.at}` });
  for (const i of F.imgsBroken) add({ ...base, check: 'assets.img-not-loaded', key: i.src, severity: 'serious', evidence: `${i.src} at ${i.at}` });
  if (!F.headerLogo?.endsWith('/brand/otonom/assets/svg/wordmark_only_light.svg')) add({ ...base, check: 'brand.header-logo', key: String(F.headerLogo), severity: 'serious', evidence: `header logo src=${F.headerLogo}` });
  if (!F.footerLogo?.endsWith('/brand/otonom/assets/svg/primary_dark.svg')) add({ ...base, check: 'brand.footer-logo', key: String(F.footerLogo), severity: 'serious', evidence: `footer logo src=${F.footerLogo}` });
  for (const l of F.logoish) add({ ...base, check: 'brand.non-kit-logo', key: l.src, severity: 'serious', evidence: `${l.src} at ${l.at}` });
  if (!F.favicon.some((h) => h?.includes('/brand/otonom/assets/icons/favicon.ico'))) add({ ...base, check: 'brand.favicon', key: 'fav', severity: 'moderate', evidence: JSON.stringify(F.favicon) });
  if (!F.og?.endsWith('/brand/otonom/assets/og/og-card-1200x630.png')) add({ ...base, check: 'brand.og-image', key: 'og', severity: 'moderate', evidence: String(F.og) });
  if (F.overflow) add({ ...base, check: 'layout.horizontal-scroll', key: 'w', severity: 'serious', evidence: `scrollWidth ${F.scrollWidth} > ${F.innerWidth}` });
  if (p.zoom640?.overflow) add({ ...base, viewport: '640 (200% zoom)', check: 'a11y.reflow-640', key: 'z', severity: 'serious', evidence: `scrollWidth ${p.zoom640.scrollWidth} > 640; wide: ${p.zoom640.wide.join(', ')}` });
  for (const m of F.motion) add({ ...base, check: 'a11y.reduced-motion', key: m.at + m.what, severity: 'moderate', evidence: `${m.what} at ${m.at}` });
  for (const t of F.latinInAr) add({ ...base, check: 'i18n.latin-in-ar', key: t.text, severity: 'minor', evidence: `"${t.text}" at ${t.at}` });
  for (const t of F.arabicInEn) add({ ...base, check: 'i18n.arabic-in-en', key: t.text, severity: 'minor', evidence: `"${t.text}" at ${t.at}` });
  for (const t of F.touch ?? []) add({ ...base, check: 'i18n.arabic-touches-ltr', key: t.text, severity: 'moderate', evidence: `${t.text} at ${t.at}` });
  for (const t of F.indic ?? []) add({ ...base, check: 'i18n.arabic-indic-digits', key: t.text, severity: 'minor', evidence: `"${t.text}" at ${t.at}` });
  for (const t of F.unisolated) add({ ...base, check: 'i18n.unisolated-ltr-run', key: t.text, severity: 'minor', evidence: `"${t.text}" at ${t.at}` });
  for (const i of p.issues) if (i.kind !== 'third-party') add({ ...base, check: `console.${i.kind}`, key: i.text + i.url, severity: 'serious', evidence: `${i.text} ${i.url ?? ''}` });
  for (const i of p.issues) if (i.kind === 'third-party') add({ ...base, check: 'network.third-party', key: i.url, severity: 'moderate', evidence: i.url });
  for (const h of p.http4xx) add({ ...base, check: 'network.asset-4xx', key: h, severity: 'serious', evidence: h });
  if (['/start-project', '/business/request-a-proposal', '/consultation'].includes(p.path) && F.pii.length) add({ ...base, check: 'truth.intake-pii-fields', key: JSON.stringify(F.pii), severity: 'critical', evidence: JSON.stringify(F.pii) });
  if (p.cls === 'PUBLIC-NOINDEX' && (!F.preview || !/noindex/.test(F.robots ?? ''))) add({ ...base, check: 'truth.gated-preview-noindex', key: 'g', severity: 'serious', evidence: `preview banner ${F.preview}, robots ${F.robots}` });
}
for (const e of kb) {
  const base = { route: e.url.replace(/^\/(ar|en)/, '') || '/', locale: e.url.split('/')[1], viewport: String(e.width) };
  if (e.menu) {
    if (!e.summaryReachable) add({ ...base, check: 'kbd.mobile-menu-unreachable', key: 'm', severity: 'serious', evidence: JSON.stringify(e) });
    if (e.summaryReachable && !e.openedByEnter) add({ ...base, check: 'kbd.mobile-menu-open', key: 'm', severity: 'serious', evidence: JSON.stringify(e) });
    if (e.summaryReachable && e.openedByEnter && !e.closedByEscape) add({ ...base, route: 'shell (header .menu-mobile)', check: 'kbd.mobile-menu-escape', key: 'm', severity: 'moderate', evidence: `Escape leaves <details class="menu-mobile"> open; Enter on summary closes: ${e.closedByEnterOnSummary}` });
    if (e.servicesSummaryReachable && e.servicesOpened && !e.servicesClosedByEscape) add({ ...base, viewport: '1440', route: 'shell (header .service-nav-menu)', check: 'kbd.services-menu-escape', key: 's', severity: 'moderate', evidence: 'Escape leaves <details class="service-nav-menu"> open' });
    continue;
  }
  if (!e.skipOk) add({ ...base, check: 'kbd.first-tab-skip', key: 'k', severity: 'serious', evidence: JSON.stringify(e.firstTab) });
  if (e.skipOk && !e.firstTab.inView) add({ ...base, check: 'kbd.skip-not-visible', key: 'k', severity: 'serious', evidence: JSON.stringify(e.firstTab) });
  if (e.afterSkip.active !== 'main#main') add({ ...base, route: 'shell (main#main)', check: 'kbd.skip-focus-main', key: 'k', severity: 'minor', evidence: `after Enter on skip link: hash=${e.afterSkip.hash}, activeElement=${e.afterSkip.active}; next Tab inside main: ${e.tabAfterSkipInMain}` });
  if (e.trapSuspect) add({ ...base, check: 'kbd.trap-or-unreachable', key: 'k', severity: 'serious', evidence: `reached ${e.reached}/${e.focusables} focusables without cycling` });
  else if (e.reached < e.focusables) add({ ...base, check: 'kbd.unreached', key: 'k', severity: 'moderate', evidence: `reached ${e.reached}/${e.focusables}` });
  for (const f of e.focusNotVisible) add({ ...base, check: f.ring ? 'kbd.focus-offscreen' : 'kbd.focus-not-visible', key: f.el + '|' + f.text, severity: f.ring ? 'minor' : 'serious', evidence: `${f.el} "${f.text}" href=${f.href} ring=${f.ring} inView=${f.inView}` });
}
for (const e of errs) {
  const base = { route: e.url, locale: e.url.split('/')[1], viewport: String(e.width), shot: e.shot };
  if (!(e.header && e.footer && e.notFound && e.home.length && e.lang)) add({ ...base, check: 'errors.404-shell', key: e.url.startsWith('/xx') ? 'xx' : e.url, severity: e.url.startsWith('/xx') ? 'minor' : 'moderate', evidence: `lang=${e.lang} header=${e.header} footer=${e.footer} notFound=${e.notFound} home=${e.home.length} title=${e.title} text="${e.text.replace(/\s+/g, ' ').slice(0, 80)}"` });
  if (e.title === 'OTONOM' && e.notFound) add({ ...base, check: 'seo.404-title', key: 't', severity: 'minor', evidence: 'localized 404 has the generic document title "OTONOM"' });
  for (const i of e.issues) if (i.kind !== 'third-party') add({ ...base, check: `console.${i.kind}`, key: i.text, severity: 'serious', evidence: `${i.text} ${i.url ?? ''}` });
}
const list = findings.map((f) => ({ check: f.check, route: f.route, locale: [...f.locales].join('+'), viewport: [...f.viewports].join('+'), severity: f.severity, evidence: f.evidence, shots: f.shots }));
const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
list.sort((a, b) => order[a.severity] - order[b.severity] || a.check.localeCompare(b.check) || a.route.localeCompare(b.route));
const totals = list.reduce((a, f) => ((a[f.severity] = (a[f.severity] ?? 0) + 1), a), {});
const byCheck = list.reduce((a, f) => ((a[f.check] = (a[f.check] ?? 0) + 1), a), {});
writeFileSync(path.join(out, `findings-${tag}.json`), JSON.stringify({ at: new Date().toISOString(), sha, totals, byCheck, findings: list }, null, 1));
console.log(JSON.stringify({ totals, byCheck }, null, 0));

// Contact sheet
if (pages.length) {
  const rows = [...new Set(pages.map((p) => p.path))];
  const cell = (p) => (p ? `<figure><a href="../${p.shot.replaceAll('\\', '/')}"><img loading="lazy" src="../${p.shot.replaceAll('\\', '/')}" alt="${p.locale} ${p.width} ${p.path || '/'}"></a><figcaption>${p.locale} · ${p.width}px · ${p.at.slice(11, 19)}Z</figcaption></figure>` : '<figure>—</figure>');
  const htmlOut = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>D8-A contact sheet</title><style>
:root{--ink:#0F2238;--rule:#B8DDF3;--soft:#E8F6FD;--bg:#fff}body{margin:0;padding:16px;font:14px/1.4 system-ui,sans-serif;color:var(--ink);background:var(--bg)}h1{font-size:20px}section{border-top:1px solid var(--rule);padding:12px 0}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:start}figure{margin:0;background:var(--soft);padding:6px;border-radius:6px}img{width:100%;height:320px;object-fit:cover;object-position:top;display:block;border:1px solid var(--rule)}figcaption{font-size:12px;margin-top:4px}
@media (max-width:700px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}</style></head><body><h1>D8-A contact sheet — ${sha} — ${new Date().toISOString().slice(0, 16)}Z</h1><p>Local production build (next start, public profile, disposable synthetic clone). Columns: AR 390 · AR 1440 · EN 390 · EN 1440. Local evidence only.</p>
${rows.map((r) => `<section><h2>${r || '/'}</h2><div class="grid">${['ar', 'en'].flatMap((l) => [390, 1440].map((w) => cell(pages.find((p) => p.path === r && p.locale === l && p.width === w)))).join('')}</div></section>`).join('\n')}
<section><h2>Error pages</h2><div class="grid">${errs.map((e) => `<figure><a href="../${e.shot.replaceAll('\\', '/')}"><img loading="lazy" src="../${e.shot.replaceAll('\\', '/')}" alt="${e.url}"></a><figcaption>${e.url} · ${e.width}px</figcaption></figure>`).join('')}</div></section></body></html>`;
  writeFileSync(path.join(out, 'screens', 'index.html'), htmlOut);
}

// Real-browser E2E for the B2B preview journey and the staff workspaces (Edge headless via CDP, production build,
// synthetic data). Every UI step is cross-checked against the database — the browser is never trusted alone.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Recorder, sleep } from './http-client.ts';
import { Browser, type Page } from './browser.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const SHOTS = path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'screenshots', 's7');
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const tag = randomBytes(3).toString('hex').toUpperCase();
const lastStep = new Map<string, number>();
const START = Math.floor(Date.now() / 30000);
const one = async (sql: string, p: unknown[] = []) => (await su.query(sql, p)).rows[0];

async function totp(u: U) {
  for (;;) {
    const s = Math.floor(Date.now() / 30000);
    if (s > (lastStep.get(u.role) ?? START)) {
      lastStep.set(u.role, s);
      return generate({ secret: u.totp });
    }
    await sleep(1000);
  }
}
/** Signs in through the real /staff/login page (password step, then TOTP step) and lands on /admin. */
async function staffLogin(page: Page, role: string) {
  const u = users.find((x) => x.role === role)!;
  await page.goto('/staff/login');
  await page.waitHydrated('form');
  await page.fill('input[name=email]', u.email);
  await page.fill('input[name=password]', u.password);
  await page.click('form button');
  await page.waitFor(`document.querySelector('input[name=code]')`, 15000, `${role} TOTP step`).catch(async (err) => {
    await page.screenshot(`debug-login-${role}.png`).catch(() => {});
    throw new Error(`${err.message} | page: ${String(await page.eval('location.href + " :: " + document.body.innerText.slice(0, 300)')).replace(/s+/g, ' ')}`);
  });
  await page.waitHydrated('form');
  await page.fill('input[name=code]', await totp(u));
  await page.click('form button');
  await page.waitFor(`location.pathname.startsWith('/admin') && !!document.querySelector('nav')`, 30000, `${role} admin`);
}
async function act(page: Page, testId: string, fields: Record<string, string | boolean> = {}) {
  await page.waitHydrated(`[data-testid="${testId}"]`);
  for (const [k, v] of Object.entries(fields)) await page.fill(`[data-testid="${testId}"] [name="${k}"]`, v);
  await page.click(`[data-testid="${testId}"] button[type=submit]`);
  return page.waitFor(`document.querySelector('[data-testid="${testId}-result"]')?.textContent`, 20000, `${testId} result`);
}
const reload = async (page: Page, p: string, selector: string) => {
  await page.goto(p);
  await page.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, 20000, selector);
};

async function main() {
  const browser = await Browser.launch(BASE, path.join(APP_ROOT, 'tests', '.edge-profile-e2e'), SHOTS);
  try {
    // ---------- 1. public journey: home → solutions → developers → RFQ form (Arabic, mobile) ----------
    const visitor = await browser.newPage(390, 844);
    for (const p of ['/ar', '/ar/solutions', '/ar/business/developers']) {
      await visitor.goto(p);
      rec.add(`E2E-PUBLIC${p}`, 'PUBLIC', `${p} renders in the browser`, (await visitor.eval<string>('document.documentElement.dir')) === 'rtl' && (await visitor.exists('h1')), null);
    }
    await visitor.click('a[href="/ar/business/request-a-proposal"]');
    await visitor.waitFor(`location.pathname === '/ar/business/request-a-proposal' && !!document.querySelector('form.rfq')`, 15000, 'rfq page');
    await visitor.waitHydrated('form.rfq');
    const org = `شركة اختبار ${tag}`;
    const email = `e2e-${tag.toLowerCase()}@example.com`;
    await visitor.fill('form.rfq [name=fullName]', 'عميل متصفح تجريبي');
    await visitor.fill('form.rfq [name=email]', email);
    await visitor.fill('form.rfq [name=phone]', `0101${String(parseInt(tag, 16) % 10_000_000).padStart(7, '0')}`);
    await visitor.fill('form.rfq [name=organisationName]', org);
    await visitor.fill('form.rfq [name=customerType]', 'DEVELOPER');
    await visitor.fill('form.rfq [name=projectType]', 'COMPOUND');
    await visitor.fill('form.rfq [name=governorate]', 'CAIRO');
    await visitor.click('form.rfq button[type=button]');
    const secondStep = await visitor.waitFor(`!document.querySelector('form.rfq [name=units]').closest('[hidden]')`, 5000, 'RFQ project step');
    rec.add('E2E-RFQ-PROGRESSIVE', 'PUBLIC', 'Arabic RFQ advances from contact to project brief without a page reload', secondStep === true, secondStep);
    await visitor.fill('form.rfq [name=units]', '60');
    await visitor.fill('form.rfq [name=description]', 'مشروع تجريبي عبر المتصفح لاختبار الرحلة الكاملة — بيانات اصطناعية.');
    await visitor.fill('form.rfq [name=consentProcessing]', true);
    await visitor.click('form.rfq button[type=submit]');
    const okText = await visitor.waitFor(`document.querySelector('.ok')?.textContent`, 20000, 'RFQ confirmation');
    const rfqRef = String(okText).match(/RFQ-\d{4}-[A-Z2-9]{6}/)?.[0] ?? '';
    await visitor.screenshot('public-rfq-confirmation-ar-390.png');
    const rfqRow = await one(`SELECT id, status, submitted_email FROM cms.rfqs WHERE ref=$1`, [rfqRef]);
    rec.add('E2E-RFQ-SUBMIT', 'PUBLIC', 'Arabic RFQ submitted through the real form; stored as SUBMITTED', !!rfqRef && rfqRow?.status === 'SUBMITTED' && rfqRow?.submitted_email === email, { rfqRef, rfqRow });
    await visitor.close();

    // ---------- 1b. RFQ failure paths in the browser: double submit, network loss + retry ----------
    // a distinct synthetic client address (server trusts X-Forwarded-For only with OTONOM_TRUST_PROXY=1, as in all suites)
    const fail = await browser.newPage(390, 844);
    await fail.setHeaders({ 'x-forwarded-for': `198.51.100.${(parseInt(tag, 16) % 200) + 20}` });
    const fillRfq = async (p: Page, mail: string, phoneTail: string) => {
      await p.goto('/ar/business/request-a-proposal');
      await p.waitHydrated('form.rfq');
      await p.fill('form.rfq [name=fullName]', 'عميل مسار فشل تجريبي');
      await p.fill('form.rfq [name=email]', mail);
      await p.fill('form.rfq [name=phone]', `0102${phoneTail}`);
      await p.fill('form.rfq [name=customerType]', 'CONTRACTOR');
      await p.fill('form.rfq [name=projectType]', 'VILLA');
      await p.fill('form.rfq [name=governorate]', 'GIZA');
      await p.click('form.rfq button[type=button]');
      await p.waitFor(`!document.querySelector('form.rfq [name=circuits]').closest('[hidden]')`, 5000, 'RFQ project step');
      await p.fill('form.rfq [name=circuits]', '40');
      await p.fill('form.rfq [name=description]', 'اختبار مسار الفشل في المتصفح — بيانات اصطناعية فقط وليست طلبًا حقيقيًا.');
      await p.fill('form.rfq [name=consentProcessing]', true);
    };
    const dblMail = `e2e-dbl-${tag.toLowerCase()}@example.com`;
    await fillRfq(fail, dblMail, String(parseInt(tag, 16) % 10_000_000).padStart(7, '1'));
    await fail.eval(`(() => { const b = document.querySelector('form.rfq button[type=submit]'); b.click(); b.click(); return true; })()`);
    await fail.waitFor(`document.querySelector('.ok')?.textContent`, 20000, 'double-submit confirmation');
    await sleep(1500);
    const dbl = await one(`SELECT count(*)::int n FROM cms.rfqs WHERE submitted_email=$1`, [dblMail]);
    rec.add('E2E-RFQ-DOUBLE-SUBMIT', 'PUBLIC', 'double-clicking submit creates exactly one RFQ', dbl?.n === 1, dbl);
    const offMail = `e2e-off-${tag.toLowerCase()}@example.com`;
    await fillRfq(fail, offMail, String(parseInt(tag, 16) % 10_000_000).padStart(7, '2'));
    await fail.offline(true);
    await fail.click('form.rfq button[type=submit]');
    const offErr = await fail.waitFor(`document.querySelector('form.rfq p.err')?.textContent`, 15000, 'offline error');
    const kept = await fail.eval<string>(`document.querySelector('form.rfq [name=email]').value`);
    const offCount = (await one(`SELECT count(*)::int n FROM cms.rfqs WHERE submitted_email=$1`, [offMail]))?.n;
    await fail.offline(false);
    await fail.click('form.rfq button[type=submit]');
    const offOk = await fail.waitFor(`document.querySelector('.ok')?.textContent`, 20000, 'retry confirmation');
    const failRef = String(offOk).match(/RFQ-\d{4}-[A-Z2-9]{6}/)?.[0] ?? '';
    const offAfter = (await one(`SELECT count(*)::int n FROM cms.rfqs WHERE submitted_email=$1`, [offMail]))?.n;
    rec.add('E2E-RFQ-OFFLINE-RETRY', 'PUBLIC', 'network loss: Arabic error shown, entered data kept, nothing stored; retry succeeds once', /تعذر الإرسال/.test(String(offErr)) && kept === offMail && offCount === 0 && offAfter === 1 && !!failRef, { offErr, kept, offCount, offAfter, failRef });
    await fail.close();

    // ---------- 2. engineer: sign-in through the UI, triage, conversion, pipeline ----------
    const eng = await browser.newPage();
    await staffLogin(eng, 'ENGINEER');
    const navText = await eng.text('[data-testid="staff-nav"]');
    rec.add('E2E-ENG-NAV', 'ROLES', 'engineer sees Projects + Service links but not KPI or Store', /Projects workspace/.test(navText) && /Service desk/.test(navText) && !/KPI dashboard/.test(navText) && !/Store operations/.test(navText), navText);
    await reload(eng, '/admin/workspace', `[data-testid="rfq-${rfqRef}-to-INITIAL_QUALIFICATION"]`);
    await eng.screenshot('staff-workspace-engineer-1366.png');
    await act(eng, `rfq-${rfqRef}-to-INITIAL_QUALIFICATION`);
    await reload(eng, '/admin/workspace', `[data-testid="rfq-${rfqRef}-to-QUALIFIED"]`);
    await act(eng, `rfq-${rfqRef}-to-QUALIFIED`);
    await reload(eng, '/admin/workspace', `[data-testid="rfq-${rfqRef}-convert"]`);
    const m = await act(eng, `rfq-${rfqRef}-matches`);
    rec.add('E2E-MATCHES', 'JOURNEY', 'engineer views match suggestions in the UI', /^200/.test(String(m)), String(m).slice(0, 120));
    const conv = await act(eng, `rfq-${rfqRef}-convert`);
    const opp = await one(`SELECT o.id, o.ref, o.stage, o.attribution_proposal FROM cms.opportunities o JOIN cms.rfqs r ON r.opportunity_id=o.id WHERE r.ref=$1`, [rfqRef]);
    rec.add('E2E-CONVERT', 'JOURNEY', 'conversion through the UI creates an opportunity linked to the RFQ (website-sourced proposal)', /^201/.test(String(conv)) && opp?.stage === 'ENGINEERING_REVIEW' && opp?.attribution_proposal === 'WEBSITE_SOURCED', { conv, opp });
    const oppRef = opp?.ref;
    const noSign = !(await eng.exists(`[data-testid="opp-${oppRef}-sign"]`));
    for (const to of ['FREE_CONSULTATION', 'PROPOSAL_DRAFT']) {
      await reload(eng, '/admin/workspace', `[data-testid="opp-${oppRef}-to-${to}"]`);
      await act(eng, `opp-${oppRef}-to-${to}`);
    }
    await reload(eng, '/admin/workspace', `[data-ref="${oppRef}"]`);
    const engCanApprove = await eng.exists(`[data-testid="opp-${oppRef}-to-PROPOSAL_APPROVED"]`);
    rec.add('E2E-ENG-LIMITS', 'ROLES', 'engineer has no proposal-approval or contract-signature controls', !engCanApprove && noSign, { engCanApprove });
    const st1 = (await one(`SELECT stage FROM cms.opportunities WHERE ref=$1`, [oppRef]))?.stage;
    rec.add('E2E-PIPELINE-ENG', 'JOURNEY', 'engineer moves the opportunity to PROPOSAL_DRAFT through the UI', st1 === 'PROPOSAL_DRAFT', st1);

    // ---------- 3. owner: approval, sending, signature, KPI ----------
    const owner = await browser.newPage();
    await staffLogin(owner, 'OWNER');
    await reload(owner, '/admin/workspace', `[data-testid="opp-${oppRef}-to-PROPOSAL_APPROVED"]`);
    // an incomplete approval cannot even be submitted (required fields); the server-side guard is covered by acceptance tests
    const bad = await owner.eval<boolean>(`document.querySelector('[data-testid="opp-${oppRef}-to-PROPOSAL_APPROVED"]').checkValidity()`);
    const valid = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
    await reload(owner, '/admin/workspace', `[data-testid="opp-${oppRef}-to-PROPOSAL_APPROVED"]`);
    await act(owner, `opp-${oppRef}-to-PROPOSAL_APPROVED`, { proposalDocumentRef: `doc:e2e-${tag}`, proposalValidUntil: valid, capacityCheckNote: 'Synthetic capacity check' });
    await reload(owner, '/admin/workspace', `[data-testid="opp-${oppRef}-to-PROPOSAL_SENT"]`);
    await act(owner, `opp-${oppRef}-to-PROPOSAL_SENT`);
    await reload(owner, '/admin/workspace', `[data-testid="opp-${oppRef}-sign"]`);
    await owner.screenshot('staff-workspace-owner-sign-1366.png');
    const k0 = (await one(`SELECT coalesce(sum(signed_value_minor),0)::bigint v FROM domain.contracts k JOIN domain.attribution a ON a.contract_id=k.id WHERE a.class='WEBSITE_SOURCED'`)).v;
    const signed = await act(owner, `opp-${oppRef}-sign`, { signedValueMinor: '765432.10', evidenceRef: `file:e2e-signed-${tag}`, contractType: 'PROJECT' });
    const after = await one(`SELECT o.stage, o.contract_ref FROM cms.opportunities o WHERE o.ref=$1`, [oppRef]);
    const k = await one(`SELECT k.signed_value_minor, k.cohort, a.class FROM domain.contracts k JOIN domain.attribution a ON a.contract_id=k.id WHERE k.opportunity_ref=$1`, [oppRef]);
    rec.add('E2E-APPROVAL-REQUIRED-FIELDS', 'JOURNEY', 'the approval form cannot be submitted without document, validity and capacity note', bad === false, bad);
    rec.add('E2E-SIGN', 'JOURNEY', 'owner signs through the UI: EGP amount stored in minor units, website-sourced, NEW cohort, opportunity WON_SIGNED', /^200/.test(String(signed)) && after?.stage === 'WON_SIGNED' && Number(k?.signed_value_minor) === 76543210 && k?.class === 'WEBSITE_SOURCED' && k?.cohort === 'NEW', { signed, after, k, bad });
    await reload(owner, '/admin/kpi', '[data-testid="ns-sourced"]');
    const nsText = await owner.text('[data-testid="north-star"]');
    rec.add('E2E-KPI-NORTHSTAR', 'KPI', 'KPI dashboard shows both North Star candidates and a PENDING owner decision', /PENDING/.test(nsText) && /Website-Sourced only/.test(nsText) && /Total website-influenced/.test(nsText), nsText.slice(0, 200));
    const k1 = (await one(`SELECT coalesce(sum(signed_value_minor),0)::bigint v FROM domain.contracts k JOIN domain.attribution a ON a.contract_id=k.id WHERE a.class='WEBSITE_SOURCED'`)).v;
    rec.add('E2E-KPI-DELTA', 'KPI', 'website-sourced signed value rose by exactly the signed amount', Number(k1) - Number(k0) === 76543210, { k0, k1 });
    await owner.screenshot('staff-kpi-owner-1366.png');
    await owner.click('[data-testid="reconcile-check"]');
    const recText = await owner.waitFor(`document.querySelector('[data-testid="reconcile-result"]')?.textContent`, 20000, 'reconcile');
    rec.add('E2E-RECONCILE', 'KPI', 'owner runs the consistency check from the dashboard', /"status": 200/.test(String(recText)), String(recText).slice(0, 160));
    await reload(owner, '/admin/workspace', `[data-testid="opp-${oppRef}-handoff"]`);
    const ho = await act(owner, `opp-${oppRef}-handoff`);
    rec.add('E2E-HANDOFF', 'JOURNEY', 'handoff summary opens from the workspace and contains the contract ref without file links', String(ho).includes(after?.contract_ref ?? '##') && !/https?:\/\//.test(String(ho)), String(ho).slice(0, 160));

    // ---------- 3b. owner overview, KPI drill-down and sanitized CSV export ----------
    await reload(owner, '/admin/overview', '[data-testid="overview-kpi"]');
    const ov = { crm: await owner.exists('[data-testid="overview-crm"]'), kpi: await owner.exists('[data-testid="overview-kpi"]'), content: await owner.exists('[data-testid="overview-content"]'), store: await owner.exists('[data-testid="overview-store"]'), stage: await owner.text('[data-testid="overview-stage"]') };
    await owner.screenshot('staff-overview-owner-1366.png');
    rec.add('E2E-OVERVIEW-OWNER', 'KPI', 'owner overview shows projects, contracts, content and store blocks with the PREVIEW stage banner', ov.crm && ov.kpi && ov.content && ov.store && /PREVIEW/.test(ov.stage), ov);
    await reload(owner, '/admin/kpi', '[data-testid="drill-totals"]');
    await owner.fill('[data-testid="drill-attribution"]', 'WEBSITE_SOURCED');
    await owner.click('[data-testid="drill-apply"]');
    await sleep(1500);
    const drillText = await owner.text('[data-testid="drill-totals"]');
    const year = new Date().getUTCFullYear();
    const dbSrc = await one(`SELECT count(*)::int n FROM domain.contracts k JOIN domain.attribution a ON a.contract_id=k.id WHERE a.class='WEBSITE_SOURCED' AND k.signed_at >= $1 AND k.signed_at < $2`, [`${year}-01-01T00:00:00Z`, `${year + 1}-01-01T00:00:00Z`]);
    rec.add('E2E-KPI-DRILLDOWN', 'KPI', 'drill-down filtered to website-sourced lists the same number of contracts as the database', new RegExp(`^${dbSrc.n} contracts`).test(drillText.trim()), { drillText, db: dbSrc.n });
    const csv = await owner.eval<string>(`fetch('/api/reports/contracts?from=${year}-01-01T00:00:00Z&to=${year + 1}-01-01T00:00:00Z&format=csv').then(async r => r.status + '|' + r.headers.get('content-type') + '|' + (await r.text()))`);
    const [csvStatus, csvType, csvBody] = csv.split('|');
    const csvRest = csv.split('|').slice(2).join('|');
    rec.add('E2E-CSV-EXPORT', 'KPI', 'CSV export downloads the signed contract, without e-mails, phone numbers or evidence references', csvStatus === '200' && /text\/csv/.test(csvType) && csvRest.includes(after?.contract_ref ?? '##') && !/@|\+20|01\d{9}|file:e2e/.test(csvRest) && /^﻿?"?ref/.test(csvBody), { csvStatus, csvType, head: csvRest.slice(0, 160) });

    // ---------- 3c. engineer: search, assign to me, "assigned to me" filter ----------
    await reload(eng, `/admin/workspace?q=${failRef}`, '[data-testid="rfq-queue"]');
    const found = await eng.eval<number>(`document.querySelectorAll('[data-testid="rfq-queue"] tbody tr').length`);
    const foundRef = await eng.exists(`[data-testid="rfq-queue"] tr[data-ref="${failRef}"]`);
    rec.add('E2E-RFQ-SEARCH', 'JOURNEY', 'workspace search by reference returns exactly that RFQ', found === 1 && foundRef, { found, foundRef });
    const asg = await act(eng, `rfq-${failRef}-assign-me`);
    const engId = String(users.find((x) => x.role === 'ENGINEER')!.id);
    const asgRow = await one(`SELECT assigned_engineer_id FROM cms.rfqs WHERE ref=$1`, [failRef]);
    await reload(eng, '/admin/workspace?mine=1', '[data-testid="rfq-queue"]');
    const inMine = await eng.exists(`[data-testid="rfq-queue"] tr[data-ref="${failRef}"]`);
    rec.add('E2E-RFQ-ASSIGN-ME', 'JOURNEY', 'engineer assigns the RFQ to self and finds it under "Assigned to me"', /^200/.test(String(asg)) && String(asgRow?.assigned_engineer_id) === engId && inMine, { asg, asgRow, inMine });
    const edId = users.find((x) => x.role === 'EDITOR')!.id;
    const failRfqId = (await one(`SELECT id FROM cms.rfqs WHERE ref=$1`, [failRef])).id;
    const badAsg = await eng.eval<string>(`fetch('/api/rfqs/${failRfqId}', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assignedEngineer: ${edId} }) }).then(async r => r.status + ' ' + (await r.text()).slice(0, 120))`);
    const asgRow2 = await one(`SELECT assigned_engineer_id FROM cms.rfqs WHERE ref=$1`, [failRef]);
    rec.add('E2E-ASSIGNEE-ELIGIBLE', 'SECURITY', 'an RFQ cannot be assigned to a user without CRM rights (server refuses, assignment unchanged)', /^422/.test(badAsg) && /ASSIGNEE_NOT_ELIGIBLE/.test(badAsg) && String(asgRow2?.assigned_engineer_id) === engId, { badAsg, asgRow2 });

    // ---------- 4. role boundaries in the UI ----------
    const editor = await browser.newPage();
    await staffLogin(editor, 'EDITOR');
    const edNavText = (await editor.exists('[data-testid="staff-nav"]')) ? await editor.text('[data-testid="staff-nav"]') : '';
    const edNav = /Projects workspace|KPI dashboard|Store operations|Service desk/.test(edNavText);
    await editor.goto('/admin/workspace');
    const edNo = await editor.waitFor(`!!document.querySelector('[data-testid="no-access"]') || !!document.querySelector('[data-testid="rfq-queue"]')`, 20000);
    const edSees = await editor.exists('[data-testid="rfq-queue"]');
    rec.add('E2E-EDITOR-NO-CRM', 'ROLES', 'editor: only Overview + Content review links; the Projects workspace shows no data', !edNav && /Content review/.test(edNavText) && !!edNo && !edSees, { edNavText, edSees });
    await reload(editor, '/admin/overview', '[data-testid="overview-stage"]');
    const edOverview = { content: await editor.exists('[data-testid="overview-content"]'), crm: await editor.exists('[data-testid="overview-crm"]'), kpi: await editor.exists('[data-testid="overview-kpi"]'), store: await editor.exists('[data-testid="overview-store"]') };
    rec.add('E2E-OVERVIEW-EDITOR', 'ROLES', 'editor overview shows the content block only (no CRM, KPI or store figures)', edOverview.content && !edOverview.crm && !edOverview.kpi && !edOverview.store, edOverview);
    const store = await browser.newPage();
    await staffLogin(store, 'STORE');
    await reload(store, '/admin/store-ops', '[data-testid="store-stage"]');
    const stageText = await store.text('[data-testid="store-stage"]');
    const storeCanApprove = await store.exists('[data-testid^="price-"][data-testid$="-approve"]');
    await store.screenshot('staff-store-ops-store-1366.png');
    rec.add('E2E-STORE-VIEW', 'ROLES', 'store sees operations with the CLOSED customer-store banner and no price-approval controls', /PREVIEW/.test(stageText) && /CLOSED/.test(stageText) && !storeCanApprove, stageText);
    await store.goto('/admin/workspace');
    await store.waitFor(`!!document.querySelector('[data-testid="no-access"]') || !!document.querySelector('[data-testid="rfq-queue"]')`, 20000);
    rec.add('E2E-STORE-NO-CRM', 'ROLES', 'store cannot see the Projects workspace data', !(await store.exists('[data-testid="rfq-queue"]')), null);

    // ---------- 4b. content review queue: return with a note → revise → different reviewer approves → publish → withdraw ----------
    {
      const { Client } = await import('./http-client.ts');
      const eu = users.find((x) => x.role === 'EDITOR')!;
      const edApi = new Client(BASE, 'editor-api', true);
      await edApi.post('/api/users/login', { email: eu.email, password: eu.password });
      await edApi.post('/api/mfa/verify', { code: await totp(eu) });
      const slug = `e2e-review-${tag.toLowerCase()}`;
      const created = await edApi.post('/api/pages?locale=ar&draft=true', { slug, title: 'صفحة مراجعة تجريبية', body: 'نص عربي تجريبي للمراجعة — ليس محتوى معتمدًا.' });
      const pid = created.json?.doc?.id;
      await edApi.patch(`/api/pages/${pid}?locale=en&draft=true`, { title: 'Synthetic review page', body: 'Synthetic English body for the review test — not approved content.' });
      await edApi.patch(`/api/pages/${pid}`, { workflowStatus: 'IN_REVIEW' });
      const anonCount = async () => (await fetch(`${BASE}/api/pages?where[slug][equals]=${slug}`).then((r) => r.json())).totalDocs;
      await reload(owner, '/admin/content-review?status=IN_REVIEW', `[data-testid="content-${slug}-to-DRAFT"]`);
      await owner.screenshot('staff-content-review-owner-1366.png');
      const note = 'Synthetic review: please shorten the English summary';
      const ret = await act(owner, `content-${slug}-to-DRAFT`, { reviewNote: note });
      const r1 = await one(`SELECT workflow_status, review_note FROM cms.pages WHERE id=$1`, [pid]);
      rec.add('E2E-CONTENT-RETURN-NOTE', 'CMS', 'reviewer returns content to the author with a note through the review queue', /^200/.test(String(ret)) && r1?.workflow_status === 'DRAFT' && r1?.review_note === note, { ret, r1 });
      await reload(editor, '/admin/content-review?status=DRAFT', `[data-slug="${slug}"] [data-testid="review-note"]`);
      const seen = await editor.text(`[data-slug="${slug}"] [data-testid="review-note"]`);
      await act(editor, `content-${slug}-to-IN_REVIEW`);
      await reload(editor, '/admin/content-review?status=IN_REVIEW', `[data-slug="${slug}"]`);
      const edApprove = await editor.exists(`[data-testid="content-${slug}-to-APPROVED"]`);
      rec.add('E2E-CONTENT-AUTHOR-SEES-NOTE', 'CMS', 'author sees the reviewer note, resubmits, and has no approve control', seen.includes(note) && !edApprove, { seen: seen.slice(0, 120), edApprove });
      await reload(eng, '/admin/content-review?status=IN_REVIEW', `[data-testid="content-${slug}-to-APPROVED"]`);
      const ap = await act(eng, `content-${slug}-to-APPROVED`);
      await reload(owner, '/admin/content-review?status=APPROVED', `[data-testid="content-${slug}-to-PUBLISHED"]`);
      const pub = await act(owner, `content-${slug}-to-PUBLISHED`);
      const live = await anonCount();
      rec.add('E2E-CONTENT-PUBLISH', 'CMS', 'a different reviewer approves, the publisher publishes, and the page becomes publicly readable', /^200/.test(String(ap)) && /^200/.test(String(pub)) && live === 1, { ap, pub, live });
      await reload(owner, '/admin/content-review?status=PUBLISHED', `[data-testid="content-${slug}-to-WITHDRAWN"]`);
      const wd = await act(owner, `content-${slug}-to-WITHDRAWN`);
      const gone = await anonCount();
      rec.add('E2E-CONTENT-WITHDRAW', 'CMS', 'withdrawing from the queue removes the page from public reads immediately', /^200/.test(String(wd)) && gone === 0, { wd, gone });
    }

    // ---------- 5. service desk: commissioning via the UI shows the one-time code ----------
    const serial = `SYN-E2E-${tag}`;
    await reload(store, '/admin/store-ops', '[data-testid="serial-register"]');
    await act(store, 'serial-register', { serial, skuId: 'sku-rc04', status: 'INSTALLED' });
    await reload(eng, '/admin/service-desk', '[data-testid="commissioning"]');
    const today = new Date().toISOString().slice(0, 10);
    const com = await act(eng, 'commissioning', { serial, projectRef: `PRJ-E2E-${tag}`, installedAt: `${today}T09:00`, commissionedAt: `${today}T15:00`, technician: 'Synthetic Technician' });
    const cr = await one(`SELECT claim_code_hash IS NOT NULL AS has_code FROM domain.commissioning_records WHERE serial=$1`, [serial]);
    rec.add('E2E-COMMISSION', 'SERVICE', 'engineer records commissioning in the service desk; claim code shown once, only its hash stored', /Claim code/.test(String(com)) && cr?.has_code === true, String(com).replace(/[A-Z2-9]{5}-[A-Z2-9]{5}/, '<code>'));
    const pol = await eng.text('[data-testid="warranty-policy"]');
    rec.add('E2E-NO-POLICY', 'SERVICE', 'service desk states there is no approved warranty policy', /No approved warranty policy/.test(pol), pol);
    await eng.screenshot('staff-service-desk-engineer-1366.png');

    // ---------- 5b. back-office flows through the UI (customer side prepared over HTTP; COMMERCIAL only inside try/finally) ----------
    {
      const { Client } = await import('./http-client.ts');
      const ownerApi = new Client(BASE, 'owner-api', true);
      const ou = users.find((x) => x.role === 'OWNER')!;
      await ownerApi.post('/api/users/login', { email: ou.email, password: ou.password });
      await ownerApi.post('/api/mfa/verify', { code: await totp(ou) });
      const anon = new Client(BASE, 'anon', true);
      const custEmail = `e2e-cust-${tag.toLowerCase()}@example.com`;
      const custPw = `Syn-${randomBytes(9).toString('base64url')}aA1!`;
      let quoteRef = '';
      let ticketRef = '';
      const claimCode = String(com).match(/[A-Z2-9]{5}-[A-Z2-9]{5}/)?.[0] ?? '';
      try {
        await ownerApi.post('/api/globals/settings', { stage: 'COMMERCIAL' });
        const q = await anon.req('POST', '/api/shop/quotes', { json: { idempotencyKey: `e2e${tag}${Date.now()}`, lines: [{ skuId: 'sku-rc16', qty: 1 }], requirements: 'Synthetic E2E request: custom scene firmware (not a real request).', customer: { name: 'Synthetic', email: 's@example.com' }, governorate: 'CAIRO' } });
        quoteRef = q.json?.ref ?? '';
        await anon.req('POST', '/api/account/register', { json: { email: custEmail, password: custPw } });
        const cust = new Client(BASE, 'cust', true);
        await cust.post('/api/users/login', { email: custEmail, password: custPw });
        await cust.post('/api/account/devices/claim', { serial, commissioningCode: claimCode });
        const t = await cust.post('/api/service-tickets', { serial, category: 'SAFETY', description: 'Synthetic E2E: burning smell near the controller panel.' });
        ticketRef = t.json?.ref ?? '';
      } finally {
        await ownerApi.post('/api/globals/settings', { stage: 'PREVIEW' });
      }
      rec.add('E2E-BACKOFFICE-SETUP', 'STORE', 'synthetic quote request and safety ticket prepared; stage restored to PREVIEW', !!quoteRef && !!ticketRef && (await one(`SELECT stage FROM cms.settings LIMIT 1`)).stage === 'PREVIEW', { quoteRef, ticketRef });
      // store: cancel the synthetic quote request from the Store operations screen
      await reload(store, '/admin/store-ops', `[data-testid="order-${quoteRef}-cancel"]`);
      const canQuote = await store.exists(`[data-testid="order-${quoteRef}-quote"]`);
      const cancelled = await act(store, `order-${quoteRef}-cancel`, { reason: 'synthetic E2E clean-up' });
      const qs = (await one(`SELECT status, cancelled_reason FROM domain.orders WHERE ref=$1`, [quoteRef])) ?? {};
      rec.add('E2E-STORE-CANCEL', 'STORE', 'store cancels a quote request in the UI (reason recorded); store has no quote-issuing control', /^200/.test(String(cancelled)) && qs.status === 'CANCELLED' && !canQuote, { cancelled, qs, canQuote });
      // service: urgent ticket first, cannot resolve before callback, then callback + resolve through the UI
      await reload(eng, '/admin/service-desk', `[data-ref="${ticketRef}"]`);
      const firstRow = await eng.eval<string>(`document.querySelector('[data-testid="tickets"] tbody tr')?.getAttribute('data-ref')`);
      const urgentFirst = (await one(`SELECT priority FROM domain.service_tickets WHERE ref=$1`, [firstRow]))?.priority === 'URGENT';
      const early = await act(eng, `ticket-${ticketRef}-to-RESOLVED`, { resolution: 'synthetic attempt before callback' });
      await reload(eng, '/admin/service-desk', `[data-testid="ticket-${ticketRef}-callback"]`);
      await act(eng, `ticket-${ticketRef}-callback`, { note: 'synthetic: resident called, power isolated' });
      await reload(eng, '/admin/service-desk', `[data-testid="ticket-${ticketRef}-to-RESOLVED"]`);
      const done = await act(eng, `ticket-${ticketRef}-to-RESOLVED`, { resolution: 'synthetic: loose terminal tightened' });
      const ts = await one(`SELECT status, callback_done_at IS NOT NULL AS cb FROM domain.service_tickets WHERE ref=$1`, [ticketRef]);
      rec.add('E2E-SERVICE-SAFETY', 'SERVICE', 'safety ticket listed first; UI refuses resolution before the callback; callback then resolution succeed', urgentFirst && /SAFETY_CALLBACK_REQUIRED/.test(String(early)) && /^200/.test(String(done)) && ts?.status === 'RESOLVED' && ts?.cb === true, { urgentFirst, early, done, ts });
      await eng.screenshot('staff-service-desk-after-1366.png');
      // remove the synthetic customer account
      const cid = (await one(`SELECT id FROM cms.users WHERE email=$1`, [custEmail]))?.id;
      if (cid) await ownerApi.del(`/api/users/${cid}`);
    }

    // ---------- 6. MFA-pending session cannot open a workspace ----------
    const pending = await browser.newPage();
    const pu = users.find((x) => x.role === 'ADMIN')!;
    await pending.goto('/staff/login');
    await pending.waitHydrated('form');
    await pending.fill('input[name=email]', pu.email);
    await pending.fill('input[name=password]', pu.password);
    await pending.click('form button');
    await pending.waitFor(`document.querySelector('input[name=code]')`, 15000);
    await pending.goto('/admin/kpi');
    await sleep(1000);
    const pPath = await pending.eval<string>('location.pathname');
    rec.add('E2E-MFA-PENDING', 'SECURITY', 'password-only session is redirected away from staff workspaces', pPath !== '/admin/kpi' && !(await pending.exists('[data-testid="kpi-dashboard"]')), pPath);

    // ---------- 7. staff workspaces on a phone ----------
    const mob = await browser.newPage(390, 844);
    await staffLogin(mob, 'ENGINEER');
    for (const p of ['/admin/workspace', '/admin/service-desk']) {
      await mob.goto(p);
      await mob.waitFor(`!!document.querySelector('h1')`, 20000);
      const over = await mob.eval<number>('document.documentElement.scrollWidth');
      await mob.screenshot(`staff${p.replace(/\//g, '_')}-engineer-390.png`);
      const cards = await mob.eval<boolean>(`getComputedStyle(document.querySelector('table thead') ?? document.body).display === 'none'`);
      rec.add(`E2E-MOBILE${p}`, 'MOBILE', `${p} usable at 390 px: no horizontal overflow, tables shown as labelled cards`, over <= 391 && cards, { over, cards });
    }
    // ---------- 8. console errors / failed requests / 5xx seen by every staff and public page ----------
    // (the deliberately offline RFQ page is excluded: its failed request is the expected outcome of that test)
    const issues = [eng, owner, editor, store, pending, mob].flatMap((p) => p.issues);
    rec.add('E2E-NO-PAGE-ERRORS', 'QUALITY', 'no console errors, uncaught exceptions, failed requests or 5xx responses during the staff journeys', issues.length === 0, issues.slice(0, 10));
    const thirdParty = issues.filter((i) => i.kind === 'third-party' || (!!i.url && /^https?:\/\//.test(i.url)));
    rec.add('E2E-NO-THIRD-PARTY-REQUESTS', 'SECURITY', 'staff pages make no requests to third-party hosts (e.g. gravatar.com would receive e-mail hashes)', thirdParty.length === 0, thirdParty.slice(0, 5));
    for (const p of [eng, owner, editor, store, pending, mob]) await p.close().catch(() => {});
  } finally {
    browser.close();
  }
  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), method: 'Microsoft Edge headless via DevTools Protocol against the local production build; DB cross-checks', summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'e2e-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});

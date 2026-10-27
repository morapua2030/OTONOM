import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disciplines, filterProjects, normalizeSearch, portfolioQuery, portfolioSearch, relatedProjects, type PublicProject } from '../src/lib/portfolio.ts';
import { projectDTO, publicCaseRecord } from '../src/lib/portfolio-record.ts';
import { portfolioReleases, type PortfolioRelease } from '../src/lib/portfolio-release.ts';

const doc = { slug: 'test-only-controller', title: { en: 'Test controller', ar: 'وحدة تَحكُّم تجريبية' }, body: { en: 'Test-only solution.', ar: 'حل للاختبار فقط.' }, objectives: { en: 'Connected sensor', ar: 'مستشعر متصل' }, consent: 'private-consent', reviewedBy: 'private-reviewer', reviewNote: 'private-note', locationGranularity: 'private-location', audit: { secret: true } };
const release: PortfolioRelease = { slug: doc.slug, categories: ['iot', 'embedded'], featured: true };
const project = projectDTO(doc, 'ar', [release])!;

test('DTO is an explicit public allowlist, including nested and localized content', () => {
  const value = JSON.stringify(project);
  assert.ok(project && project.title === doc.title.ar);
  for (const privateValue of ['private-consent', 'private-reviewer', 'private-note', 'private-location', 'secret']) assert.ok(!value.includes(privateValue));
  assert.deepEqual(Object.keys(publicCaseRecord(doc)).sort(), ['slug', 'title', 'body', 'objectives'].sort());
});
test('missing translation and unsafe slugs cannot create public or SEO routes', () => {
  for (const slug of ['../staff', 'x<script>', 'foo?draft=true', '', 'x'.repeat(101)]) assert.equal(projectDTO({ ...doc, slug }, 'en', []), null);
  assert.equal(projectDTO({ ...doc, body: { en: 'only one language' } }, 'ar', []), null);
});
test('private, remote and uncaptioned-language image references are excluded', () => {
  for (const src of ['https://external.example/secret.jpg', '/api/media/file/secret.png', 'D:/secret.png', '/portfolio/../secret.png']) {
    assert.equal(projectDTO(doc, 'en', [{ ...release, hero: { src, alt: { ar: 'وصف', en: 'description' }, width: 100, height: 100 } }])!.hero, undefined);
  }
  const approved = projectDTO(doc, 'en', [{ ...release, hero: { src: '/portfolio/test-only.png', alt: { ar: 'وصف', en: 'description' }, width: 100, height: 100 } }])!;
  assert.equal(approved.hero?.alt, 'description');
});
test('Arabic normalization handles harakat, tatweel, alef and alef maqsura without changing ta marbuta', () => {
  assert.equal(normalizeSearch(' إِنـترنت  الأشياء '), 'انترنت الاشياء');
  assert.equal(normalizeSearch('على'), 'علي');
  assert.notEqual(normalizeSearch('وحدة'), normalizeSearch('وحده'));
  assert.equal(filterProjects([project], { category: 'all', q: 'تحكم' }).length, 1);
  assert.equal(filterProjects([project], { category: 'all', q: 'CONNECTED' }).length, 1);
});
test('all categories and combined AND semantics retain multi-tag membership without duplicates', () => {
  assert.equal(filterProjects([project], { category: 'iot', q: 'sensor' }).length, 1);
  assert.equal(filterProjects([project], { category: 'embedded', q: 'sensor' }).length, 1);
  assert.equal(filterProjects([project], { category: 'software', q: 'sensor' }).length, 0);
  assert.equal(filterProjects([project], { category: 'iot', q: 'absent' }).length, 0);
  for (const category of Object.keys(disciplines) as PublicProject['categories']) {
    assert.equal(filterProjects([{ ...project, categories: [category] }], { category, q: '' }).length, 1);
  }
  assert.equal(filterProjects([project], { category: 'all', q: '' }).length, 1);
});
test('safe query state round-trips Arabic, rejects arrays and prototypes, and bounds search', () => {
  for (const category of ['constructor', '__proto__', ['iot'], '<script>']) assert.equal(portfolioQuery({ category }).category, 'all');
  assert.equal(portfolioQuery({ q: ['private'] }).q, '');
  assert.equal(portfolioQuery({ q: 'x'.repeat(999) }).q.length, 120);
  assert.equal(portfolioQuery({ q: '\u202ehello\u0000' }).q, 'hello');
  const query = portfolioQuery({ category: 'iot', q: '  مستشعر  ' });
  const url = new URLSearchParams(portfolioSearch(query));
  assert.deepEqual(portfolioQuery(Object.fromEntries(url)), query);
  assert.equal(portfolioSearch({ category: 'all', q: '' }), '');
});
test('zero, one and large datasets preserve order; related excludes itself and unrelated records', () => {
  assert.deepEqual(filterProjects([], { category: 'all', q: '' }), []);
  const many = Array.from({ length: 200 }, (_, i) => ({ ...project, slug: `test-${i}` }));
  assert.deepEqual(filterProjects(many, { category: 'all', q: '' }).map((p) => p.slug), many.map((p) => p.slug));
  assert.deepEqual(relatedProjects(project, [project, { ...project, slug: 'unrelated', categories: ['software'] }]), []);
  assert.equal(relatedProjects(project, many).length, 2);
});
test('production release contains no fabricated or unapproved project fixture', () => {
  assert.equal(portfolioReleases.length, 0, 'A new real project requires a reviewed content/rights ledger and updated acceptance evidence.');
});

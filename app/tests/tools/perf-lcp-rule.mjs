// Release LCP rule (owner font decision, D8-C v5): for every page in the baseline file, the median cold LCP of this
// run (perf-pages.json cold runs; 5 per page in the chain) may be at most +50 ms worse than the baseline median.
// Usage: node perf-lcp-rule.mjs <baseline.json {pooledBaselineMedianLcpMs:{page:ms}}> <perf-pages.json>. Exit 1 on a breach;
// exit 2 when there is nothing to compare (a missing or unreadable file, a baseline without pages, no cold runs).
import { readFileSync } from 'node:fs';

const unusable = (msg) => { console.error(`perf-lcp-rule: ${msg}`); process.exit(2); };
const read = (file, what) => {
  if (!file) unusable(`no ${what} file given`);
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return unusable(`cannot read the ${what} file ${file}: ${e.message}`); }
};
const [baselineFile, pagesFile] = process.argv.slice(2);
const ref = read(baselineFile, 'baseline').pooledBaselineMedianLcpMs ?? {};
const rows = (read(pagesFile, 'perf-pages').pages ?? []).filter((r) => r.run === 'cold');
if (!Object.keys(ref).length) unusable('the baseline has no pages to compare');
if (!rows.length) unusable('the perf-pages file has no cold runs to compare');
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const out = {};
let bad = 0;
for (const page of Object.keys(ref)) {
  const runs = rows.filter((r) => r.page === page).map((r) => r.lcpMs);
  const head = runs.length ? median(runs) : NaN;
  const delta = head - ref[page];
  const pass = Number.isFinite(delta) && delta <= 50;
  out[page] = { baseline: ref[page], head, delta, runs, pass };
  if (!pass) bad = 1;
}
console.log(JSON.stringify(out));
process.exit(bad);

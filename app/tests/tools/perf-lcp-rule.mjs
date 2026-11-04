// Release LCP rule (owner font decision, D8-C v5): for every page in the baseline file, the median cold LCP of this
// run (perf-pages.json, 5 cold runs per page) may be at most +50 ms worse than the pooled baseline median.
// Usage: node perf-lcp-rule.mjs <baseline.json {pooledBaselineMedianLcpMs:{page:ms}}> <perf-pages.json>. Exit 1 on a breach.
import { readFileSync } from 'node:fs';

const [baselineFile, pagesFile] = process.argv.slice(2);
const ref = JSON.parse(readFileSync(baselineFile, 'utf8')).pooledBaselineMedianLcpMs;
const rows = JSON.parse(readFileSync(pagesFile, 'utf8')).pages.filter((r) => r.run === 'cold');
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

#!/usr/bin/env node
// R3 presentation-only guard (owner 2026-11-22): every file changed since the R3 base must be on the allow-list
// (admin look, words, order and their tests). Anything else fails, as do changes to the payload.config.ts settings
// R3 must keep exactly as they are. Usage (repo root): node app/tests/tools/r3-path-guard.mjs [base] [head]
import { execFileSync } from 'node:child_process';

const base = process.argv[2] ?? 'c0433d37';
const head = process.argv[3] ?? 'HEAD';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const changed = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean);

const ALLOWED = [
  /^app\/web\/src\/admin-ui\//, // the admin look, menu, Home, copy file
  /^app\/web\/src\/app\/\(payload\)\/layout\.tsx$/, // loads the admin stylesheet
  /^app\/web\/src\/app\/\(payload\)\/admin\/importMap\.js$/, // generated
  /^app\/web\/src\/app\/\(site\)\/staff\//, // staff screens: language + stylesheet
  /^app\/web\/src\/components\/(StaffLogin|StaffInviteAccept|StaffLoginNotice)\.tsx$/, // words and markup only
  /^app\/web\/src\/components\/admin\//, // custom admin pages: words, markup, CSS
  /^app\/web\/src\/collections\/[A-Za-z]+\.ts$/, // labels / admin options / layout fields (schema checked separately)
  /^app\/web\/src\/globals\/Settings\.ts$/, // labels / admin options (schema checked separately)
  /^app\/web\/src\/payload\.config\.ts$/, // admin + i18n only (protected settings checked below)
  /^app\/web\/src\/payload-types\.ts$/, // generated; comments only (checked separately)
  /^app\/web\/test\/admin-[a-z-]+\.test\.ts$/,
  /^app\/web\/test\/csrf-origin\.test\.ts$/, // test only: one more case, for R2's access-control mutation score on R3
  /^app\/tests\/src\/(admin-r3|browser|e2e|visual|final-shots|acceptance)\.ts$/,
  /^app\/tests\/(package\.json|run-all\.sh)$/,
  /^app\/tests\/tools\/r3-[a-z-]+\.(mjs|sh)$/,
  /^docs\//,
];
const offending = changed.filter((f) => !ALLOWED.some((re) => re.test(f)));

// payload.config.ts: the settings R3 must not touch (hard rule 4) are byte-identical to the base
const PROTECTED = [
  /serverURL: [^\n]+/, /csrf: [^\n]+/, /lockDocuments: false as const[^\n]*/g, /localization: \{[\s\S]*?\n {2}\},/, /db: postgresAdapter\(\{[\s\S]*?\n {2}\}\),/,
  /plugins: \[[\s\S]*?\n {2}\],/, /upload: \{ limits: [^\n]+/, /endpoints: \[[^\n]+/, /\.\.\.\(resetFrom[\s\S]*?: \{\}\),/,
];
const cfg = (ref) => git('show', `${ref}:app/web/src/payload.config.ts`);
const before = cfg(base);
const after = cfg(head);
const configDiffs = PROTECTED.flatMap((re) => {
  const a = before.match(re);
  const b = after.match(re);
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [String(re)];
});

console.log(JSON.stringify({ base, head, changed: changed.length, offending, configDiffs }, null, 2));
process.exit(offending.length || configDiffs.length ? 1 : 0);

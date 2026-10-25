import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateRelease, verdictMarkdown, type ReleaseEvidence } from './release-gate-core.ts';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const input = arg('--input');
  const outDir = arg('--out-dir');
  if (!input || !outDir) throw new Error('Usage: pnpm release:verify -- --input <private-evidence.json> --out-dir <private-output-dir>');
  const evidence = JSON.parse(await readFile(path.resolve(input), 'utf8')) as ReleaseEvidence;
  const verdict = evaluateRelease(evidence);
  const destination = path.resolve(outDir);
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, 'release-verdict.json'), `${JSON.stringify(verdict, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await writeFile(path.join(destination, 'release-verdict.md'), verdictMarkdown(verdict), { encoding: 'utf8', mode: 0o600 });
  console.log(`Release ${verdict.releaseId}: PROMOTION_ALLOWED=${verdict.PROMOTION_ALLOWED}`);
  for (const gate of verdict.gates) console.log(`${gate.id} ${gate.status}`);
  if (!verdict.PROMOTION_ALLOWED && evidence.phase === 'pre-promotion') process.exitCode = 1;
  if (!verdict.RELEASE_HEALTHY && evidence.phase === 'post-promotion') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Release verification failed.');
  process.exitCode = 1;
});

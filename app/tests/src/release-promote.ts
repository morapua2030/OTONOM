import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { evaluateRelease, validatePromotionVerdict, type ReleaseEvidence, type ReleaseVerdict } from './release-gate-core.ts';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command: string, args: string[]): string {
  if (process.platform !== 'win32') return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const words = [command, ...args];
  if (words.some((word) => !/^[A-Za-z0-9._/:@=~-]+$/.test(word))) throw new Error('Unsafe CLI argument refused.');
  const shell = process.env.ComSpec ?? 'cmd.exe';
  return execFileSync(shell, ['/d', '/s', '/c', words.join(' ')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function main() {
  const verdictPath = arg('--verdict');
  const evidencePath = arg('--evidence');
  const deploymentId = arg('--deployment-id');
  const immutableUrl = arg('--immutable-url');
  const gitSha = arg('--git-sha');
  const projectId = arg('--project-id');
  const repo = arg('--repo') ?? 'morapua2030/OTONOM';
  const scope = arg('--scope') ?? 'team-1626';
  const execute = process.argv.includes('--execute');
  if (!verdictPath || !evidencePath || !deploymentId || !immutableUrl || !gitSha || !projectId) {
    throw new Error('Missing required evidence, verdict, deployment, URL, SHA or project identity.');
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) || !/^[A-Za-z0-9_-]+$/.test(scope)) throw new Error('Invalid repository or Vercel scope.');
  const savedVerdict = JSON.parse(readFileSync(path.resolve(verdictPath), 'utf8')) as ReleaseVerdict;
  const evidence = JSON.parse(readFileSync(path.resolve(evidencePath), 'utf8')) as ReleaseEvidence;
  const verdict = evaluateRelease(evidence);
  const errors = validatePromotionVerdict(verdict, { deploymentId, immutableUrl, gitSha, projectId });
  if (savedVerdict.evidenceDigest !== verdict.evidenceDigest || savedVerdict.releaseId !== verdict.releaseId || savedVerdict.PROMOTION_ALLOWED !== verdict.PROMOTION_ALLOWED) {
    errors.push('Saved verdict does not match freshly evaluated evidence.');
  }
  if (errors.length) throw new Error(`Promotion refused:\n- ${errors.join('\n- ')}`);
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const gh = process.platform === 'win32' ? 'gh.exe' : 'gh';
  const mainSha = run(gh, ['api', `repos/${repo}/commits/main`, '--jq', '.sha']);
  if (mainSha !== gitSha) errors.push('Remote main advanced after verdict.');
  const inspected = JSON.parse(run(npx, ['vercel', 'inspect', immutableUrl, '--json', '--scope', scope])) as { id?: string; url?: string; readyState?: string; target?: string };
  if (inspected.id !== deploymentId || inspected.readyState !== 'READY' || inspected.target !== 'production') errors.push('Fresh Vercel deployment identity/readiness check failed.');
  if (`https://${inspected.url}` !== immutableUrl.replace(/\/$/, '')) errors.push('Fresh immutable URL mapping check failed.');
  if (errors.length) throw new Error(`Promotion refused:\n- ${errors.join('\n- ')}`);
  if (!execute) {
    console.log('Promotion preflight PASS. No external change made; add --execute with the release confirmation environment value.');
    return;
  }
  if (process.env.OTONOM_RELEASE_PROMOTION_CONFIRM !== verdict.releaseId) throw new Error('Promotion refused: OTONOM_RELEASE_PROMOTION_CONFIRM must equal the exact releaseId.');
  run(npx, ['vercel', 'promote', immutableUrl, '--scope', scope]);
  console.log(`Promotion command completed for ${deploymentId}. Run post-promotion release verification immediately.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Promotion refused.');
  process.exitCode = 1;
}

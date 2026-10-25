import { createHash } from 'node:crypto';

export type GateStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_APPLICABLE';
export type ReleasePhase = 'pre-promotion' | 'post-promotion';

export interface GateResult {
  id: `G${string}`;
  title: string;
  status: GateStatus;
  summary: string;
  evidence: string[];
}

export interface ReleaseEvidence {
  schemaVersion: '1';
  releaseId: string;
  phase: ReleasePhase;
  generatedAt: string;
  expiresAt: string;
  artifactPaths: string[];
  candidate: {
    deploymentId: string;
    immutableUrl: string;
    expectedGitSha: string;
    actualGitSha?: string;
    approvedMainSha?: string;
    projectId: string;
    expectedProjectId: string;
    target: 'production-staged' | 'production-live';
    readyState?: string;
    tlsValid?: boolean;
    immutableUrlVerified?: boolean;
    aliasStable?: boolean;
    mappedToPublic?: boolean;
  };
  provider?: {
    reachable: boolean;
    protectionEnabled: boolean;
  };
  database?: {
    projectId: string;
    expectedProjectId: string;
    isolated: boolean;
    migrated: boolean;
    migrationCount: number;
    syntheticDataAbsent: boolean;
  };
  browser?: {
    deploymentId: string;
    observedAt: string;
    realEdge: boolean;
    loginSucceeded: boolean;
    ownerEmailMatched: boolean;
    ownerRoleMatched: boolean;
    ownerRoutesAllowed: boolean;
    anonymousAdminDenied: boolean;
    anonymousPrivilegedApiDenied: boolean;
    sessionSurvivedRefresh: boolean;
    noSessionConfusion: boolean;
    logoutHttpStatus: number;
    sessionCountBefore: number;
    sessionCountAfter: number;
    logoutAuditBefore: number;
    logoutAuditAfter: number;
    afterLogoutAdminDenied: boolean;
    afterLogoutMeFormerOwner: boolean;
    afterLogoutPrivilegedApiDenied: boolean;
    csrfTrustedStaged: boolean;
    csrfTrustedCanonical: boolean;
    csrfUntrustedDenied: boolean;
    csrfExactOriginsOnly: boolean;
    cspNonceObserved: boolean;
    cspStrictDynamic: boolean;
    cspScriptUnsafeInlineAbsent: boolean;
    secureCookieObserved: boolean;
    privateNoStoreObserved: boolean;
    marketingRoutes: Record<string, number>;
    marketingNoSecretLeak: boolean;
    disabledEndpointStatuses: Record<string, number>;
    serverFeatureGatesLocked: boolean;
  };
  tooling?: {
    localTestsPassed: boolean;
    localTestCount: number;
    buildPassed: boolean;
    secretScanPassed: boolean;
    requiredCiChecksPassed: boolean;
    noCriticalVulnerabilities: boolean;
  };
  rollback?: {
    previousDeploymentId: string;
    previousDeploymentReady: boolean;
    backupRecorded: boolean;
    backupHashRecorded: boolean;
    restoreDrillPassed: boolean;
    migrationHistoryRecorded: boolean;
  };
  postPromotion?: {
    canonicalDeploymentId: string;
    expectedDeploymentId: string;
    marketingPassed: boolean;
    adminPassed: boolean;
    logoutRechecked: boolean;
    csrfRechecked: boolean;
    disabledFeaturesRechecked: boolean;
  };
}

export interface ReleaseVerdict {
  schemaVersion: '1';
  releaseId: string;
  phase: ReleasePhase;
  generatedAt: string;
  evaluatedAt: string;
  expiresAt: string;
  evidenceDigest: string;
  candidate: Pick<ReleaseEvidence['candidate'], 'deploymentId' | 'immutableUrl' | 'expectedGitSha' | 'actualGitSha' | 'projectId' | 'target'>;
  gates: GateResult[];
  blocking: string[];
  PROMOTION_ALLOWED: boolean;
  RELEASE_HEALTHY: boolean;
  artifactPaths: string[];
}

const sha = /^[0-9a-f]{40}$/i;
const deploymentId = /^dpl_[A-Za-z0-9]+$/;
const immutableVercelUrl = /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9-]+\.vercel\.app\/?$/i;
const secretKey = /^(password|passphrase|token|cookie|authorization|otp|totp|jwt|recoverycode|recoverycodes|databaseurl|rawsessionid)$/i;
const secretValue = /(postgres(?:ql)?:\/\/|\bBearer\s+[A-Za-z0-9._~-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function assertSanitizedEvidence(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSanitizedEvidence(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (secretKey.test(key)) throw new Error(`Secret-bearing key is forbidden at ${path}.${key}`);
      assertSanitizedEvidence(item, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === 'string' && secretValue.test(value)) throw new Error(`Secret-bearing value is forbidden at ${path}`);
}

function result(id: GateResult['id'], title: string, checks: Array<boolean | undefined>, summary: string, evidence: string[]): GateResult {
  const status: GateStatus = checks.some((check) => check === undefined) ? 'BLOCKED' : checks.every(Boolean) ? 'PASS' : 'FAIL';
  return { id, title, status, summary, evidence };
}

function allStatuses(values: Record<string, number> | undefined, accepted: readonly number[]): boolean | undefined {
  if (!values || Object.keys(values).length === 0) return undefined;
  return Object.values(values).every((status) => accepted.includes(status));
}

function marketingOk(values: Record<string, number> | undefined): boolean | undefined {
  const required = ['/ar', '/en', '/ar/products/4r', '/en/products/6r', '/ar/products/16r', '/en/products/compare', '/ar/solutions', '/en/about'];
  if (!values) return undefined;
  return required.every((route) => values[route] === 200);
}

export function evaluateRelease(evidence: ReleaseEvidence, now = new Date()): ReleaseVerdict {
  assertSanitizedEvidence(evidence);
  if (evidence.schemaVersion !== '1') throw new Error('Unsupported release evidence schemaVersion');
  if (!evidence.releaseId || !deploymentId.test(evidence.candidate?.deploymentId ?? '')) throw new Error('Invalid release or deployment identity');
  if (!immutableVercelUrl.test(evidence.candidate.immutableUrl)) throw new Error('Candidate URL must be an immutable Vercel deployment URL');
  if (!sha.test(evidence.candidate.expectedGitSha)) throw new Error('expectedGitSha must be a full Git SHA');

  const expired = !Number.isFinite(Date.parse(evidence.expiresAt)) || Date.parse(evidence.expiresAt) <= now.getTime();
  const c = evidence.candidate;
  const p = evidence.provider;
  const d = evidence.database;
  const b = evidence.browser;
  const t = evidence.tooling;
  const r = evidence.rollback;

  const gates: GateResult[] = [
    result('G01', 'Source identity', [p?.reachable, c.actualGitSha !== undefined ? c.actualGitSha === c.expectedGitSha : undefined, c.approvedMainSha !== undefined ? c.approvedMainSha === c.expectedGitSha : undefined], 'Approved main and deployed provenance must match.', [`deployment=${c.deploymentId}`, `sha=${c.expectedGitSha}`]),
    result(
      'G02',
      'Project/environment',
      [
        p?.reachable,
        c.projectId === c.expectedProjectId,
        c.target === (evidence.phase === 'pre-promotion' ? 'production-staged' : 'production-live'),
        c.mappedToPublic === (evidence.phase === 'post-promotion'),
      ],
      evidence.phase === 'pre-promotion'
        ? 'Correct staged Production project must remain off the public hostname.'
        : 'The exact approved release must be mapped to the public hostname.',
      [`project=${c.projectId}`, `target=${c.target}`],
    ),
    result('G03', 'Deployment readiness', [p?.reachable, c.readyState !== undefined ? c.readyState === 'READY' : undefined, c.tlsValid, c.immutableUrlVerified, c.aliasStable, expired ? false : true], 'Candidate must be READY, immutable, reachable, stable and unexpired.', [`deployment=${c.deploymentId}`, `expires=${evidence.expiresAt}`]),
    result('G04', 'Production DB identity', [d?.projectId !== undefined ? d.projectId === d.expectedProjectId : undefined, d?.isolated, d?.migrated, d ? d.migrationCount > 0 : undefined, d?.syntheticDataAbsent], 'Production DB identity and migrations must be proven without synthetic data.', d ? [`project=${d.projectId}`, `migrations=${d.migrationCount}`] : []),
    result('G05', 'Auth/OWNER', [b?.realEdge, b?.deploymentId !== undefined ? b.deploymentId === c.deploymentId : undefined, b?.loginSucceeded, b?.ownerEmailMatched, b?.ownerRoleMatched], 'Real Edge OWNER password login must succeed on this deployment.', b ? [`observed=${b.observedAt}`] : []),
    result('G06', 'RBAC/anonymous', [p?.protectionEnabled, b?.anonymousAdminDenied, b?.anonymousPrivilegedApiDenied, b?.ownerRoutesAllowed], 'Staging protection, anonymous denial and OWNER authorization must all hold.', []),
    result('G07', 'Session persistence', [b?.sessionSurvivedRefresh, b?.noSessionConfusion], 'The authenticated session must survive refresh without identity confusion.', []),
    result('G08', 'Server-side logout', [b ? b.logoutHttpStatus >= 200 && b.logoutHttpStatus < 300 : undefined, b ? b.sessionCountBefore >= 1 : undefined, b ? b.sessionCountAfter === 0 : undefined, b ? b.logoutAuditAfter === b.logoutAuditBefore + 1 : undefined], 'Logout must return success, remove the DB session and append one audit event.', b ? [`http=${b.logoutHttpStatus}`, `sessions=${b.sessionCountBefore}->${b.sessionCountAfter}`, `audits=${b.logoutAuditBefore}->${b.logoutAuditAfter}`] : []),
    result('G09', 'After-logout denial', [b?.afterLogoutAdminDenied, b ? b.afterLogoutMeFormerOwner === false : undefined, b?.afterLogoutPrivilegedApiDenied], 'The former session must not authorize any protected surface.', []),
    result('G10', 'CSRF', [b?.csrfTrustedStaged, b?.csrfTrustedCanonical, b?.csrfUntrustedDenied, b?.csrfExactOriginsOnly], 'Exact staged and canonical origins must work; untrusted/wildcard origins must not.', []),
    result('G11', 'CSP/cookies', [b?.cspNonceObserved, b?.cspStrictDynamic, b?.cspScriptUnsafeInlineAbsent, b?.secureCookieObserved, b?.privateNoStoreObserved], 'Strict CSP, nonce, secure cookies and private no-store behavior are required.', []),
    result('G12', 'Marketing routes', [marketingOk(b?.marketingRoutes), b?.marketingNoSecretLeak], 'Critical Arabic/English marketing routes must render without secret leakage.', b ? Object.entries(b.marketingRoutes).map(([route, status]) => `${route}=${status}`) : []),
    result('G13', 'Disabled features', [allStatuses(b?.disabledEndpointStatuses, [403, 404]), b?.serverFeatureGatesLocked], 'Commerce, payments, warranty, device and customer processing must remain blocked server-side.', b ? Object.entries(b.disabledEndpointStatuses).map(([route, status]) => `${route}=${status}`) : []),
    result('G14', 'Security/tooling', [t?.localTestsPassed, t ? t.localTestCount > 0 : undefined, t?.buildPassed, t?.secretScanPassed, t?.requiredCiChecksPassed, t?.noCriticalVulnerabilities], 'Tests, build, scans and required CI must pass.', t ? [`tests=${t.localTestCount}`] : []),
    result('G15', 'Backups/rollback', [r?.previousDeploymentReady, r?.backupRecorded, r?.backupHashRecorded, r?.restoreDrillPassed, r?.migrationHistoryRecorded], 'Known-good deployment, backup, restore drill and migration history are required.', r ? [`previous=${r.previousDeploymentId}`] : []),
  ];

  if (evidence.phase === 'pre-promotion') {
    gates.push({ id: 'G16', title: 'Post-promotion smoke', status: 'NOT_APPLICABLE', summary: 'Runs only after promotion.', evidence: [] });
  } else {
    const post = evidence.postPromotion;
    gates.push(result('G16', 'Post-promotion smoke', [post?.canonicalDeploymentId !== undefined ? post.canonicalDeploymentId === post.expectedDeploymentId : undefined, post?.marketingPassed, post?.adminPassed, post?.logoutRechecked, post?.csrfRechecked, post?.disabledFeaturesRechecked], 'Canonical host must serve the exact release and pass security smoke.', post ? [`canonical=${post.canonicalDeploymentId}`] : []));
  }

  const applicable = gates.filter((gate) => gate.status !== 'NOT_APPLICABLE');
  const blocking = applicable.filter((gate) => gate.status !== 'PASS').map((gate) => `${gate.id} ${gate.status}: ${gate.summary}`);
  const allApplicablePass = blocking.length === 0;
  return {
    schemaVersion: '1',
    releaseId: evidence.releaseId,
    phase: evidence.phase,
    generatedAt: evidence.generatedAt,
    evaluatedAt: now.toISOString(),
    expiresAt: evidence.expiresAt,
    evidenceDigest: `sha256:${createHash('sha256').update(canonicalJson(evidence)).digest('hex')}`,
    candidate: {
      deploymentId: c.deploymentId,
      immutableUrl: c.immutableUrl,
      expectedGitSha: c.expectedGitSha,
      actualGitSha: c.actualGitSha,
      projectId: c.projectId,
      target: c.target,
    },
    gates,
    blocking,
    PROMOTION_ALLOWED: evidence.phase === 'pre-promotion' && allApplicablePass,
    RELEASE_HEALTHY: evidence.phase === 'post-promotion' && allApplicablePass,
    artifactPaths: evidence.artifactPaths,
  };
}

export function verdictMarkdown(verdict: ReleaseVerdict): string {
  const ordered = [...verdict.gates].sort((a, b) => Number(a.status === 'PASS' || a.status === 'NOT_APPLICABLE') - Number(b.status === 'PASS' || b.status === 'NOT_APPLICABLE'));
  return [
    '# OTONOM Release Readiness Verdict',
    '',
    `- Release: \`${verdict.releaseId}\``,
    `- Phase: \`${verdict.phase}\``,
    `- Deployment: \`${verdict.candidate.deploymentId}\``,
    `- Expected SHA: \`${verdict.candidate.expectedGitSha}\``,
    `- Evaluated: \`${verdict.evaluatedAt}\``,
    `- Evidence digest: \`${verdict.evidenceDigest}\``,
    `- **PROMOTION_ALLOWED=${verdict.PROMOTION_ALLOWED}**`,
    `- **RELEASE_HEALTHY=${verdict.RELEASE_HEALTHY}**`,
    '',
    '| Gate | Status | Summary |',
    '|---|---|---|',
    ...ordered.map((gate) => `| ${gate.id} ${gate.title} | **${gate.status}** | ${gate.summary} |`),
    '',
    '## Blocking items',
    '',
    ...(verdict.blocking.length ? verdict.blocking.map((item) => `- ${item}`) : ['- None.']),
    '',
    'Evidence files are private, Git-ignored artifacts. This verdict contains no credentials or raw sessions.',
    '',
  ].join('\n');
}

export function validatePromotionVerdict(verdict: ReleaseVerdict, expected: { deploymentId: string; immutableUrl: string; gitSha: string; projectId: string }, now = new Date(), maxAgeMinutes = 60): string[] {
  const errors: string[] = [];
  if (verdict.phase !== 'pre-promotion') errors.push('Verdict is not pre-promotion.');
  if (!verdict.PROMOTION_ALLOWED) errors.push('PROMOTION_ALLOWED is false.');
  if (verdict.blocking.length) errors.push('Verdict contains blocking gates.');
  if (verdict.candidate.deploymentId !== expected.deploymentId) errors.push('Deployment ID mismatch.');
  if (verdict.candidate.immutableUrl !== expected.immutableUrl) errors.push('Immutable URL mismatch.');
  if (verdict.candidate.expectedGitSha !== expected.gitSha) errors.push('Git SHA mismatch.');
  if (verdict.candidate.actualGitSha !== expected.gitSha) errors.push('Deployed source provenance mismatch.');
  if (verdict.candidate.projectId !== expected.projectId) errors.push('Project ID mismatch.');
  const evaluated = Date.parse(verdict.evaluatedAt);
  const expires = Date.parse(verdict.expiresAt);
  if (!Number.isFinite(evaluated) || now.getTime() - evaluated > maxAgeMinutes * 60_000) errors.push('Verdict is stale.');
  if (!Number.isFinite(expires) || expires <= now.getTime()) errors.push('Verdict is expired.');
  return errors;
}

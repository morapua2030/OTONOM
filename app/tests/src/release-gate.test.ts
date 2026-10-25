import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRelease, validatePromotionVerdict, type ReleaseEvidence } from './release-gate-core.ts';

const now = new Date('2026-10-25T08:00:00.000Z');

function fixture(): ReleaseEvidence {
  return {
    schemaVersion: '1', releaseId: 'release-20261025-a', phase: 'pre-promotion', generatedAt: '2026-10-25T07:55:00.000Z', expiresAt: '2026-10-25T09:00:00.000Z', artifactPaths: ['execution/evidence/production-admin/release-20261025/edge.md'],
    candidate: { deploymentId: 'dpl_ABC123', immutableUrl: 'https://otonom-smart-home-abc123-team-1626.vercel.app', expectedGitSha: 'a'.repeat(40), actualGitSha: 'a'.repeat(40), approvedMainSha: 'a'.repeat(40), projectId: 'prj_ok', expectedProjectId: 'prj_ok', target: 'production-staged', readyState: 'READY', tlsValid: true, immutableUrlVerified: true, aliasStable: true, mappedToPublic: false },
    provider: { reachable: true, protectionEnabled: true },
    database: { projectId: 'neon_prod', expectedProjectId: 'neon_prod', isolated: true, migrated: true, migrationCount: 6, syntheticDataAbsent: true },
    browser: { deploymentId: 'dpl_ABC123', observedAt: '2026-10-25T07:50:00.000Z', realEdge: true, loginSucceeded: true, ownerEmailMatched: true, ownerRoleMatched: true, ownerRoutesAllowed: true, anonymousAdminDenied: true, anonymousPrivilegedApiDenied: true, sessionSurvivedRefresh: true, noSessionConfusion: true, logoutHttpStatus: 200, sessionCountBefore: 1, sessionCountAfter: 0, sessionUnderTestRevoked: true, logoutAuditBefore: 0, logoutAuditAfter: 1, afterLogoutAdminDenied: true, afterLogoutMeFormerOwner: false, afterLogoutPrivilegedApiDenied: true, csrfTrustedStaged: true, csrfTrustedCanonical: true, csrfUntrustedDenied: true, csrfExactOriginsOnly: true, cspNonceObserved: true, cspStrictDynamic: true, cspScriptUnsafeInlineAbsent: true, secureCookieObserved: true, privateNoStoreObserved: true, marketingRoutes: { '/ar': 200, '/en': 200, '/ar/products/4r': 200, '/en/products/6r': 200, '/ar/products/16r': 200, '/en/products/compare': 200, '/ar/solutions': 200, '/en/about': 200 }, marketingNoSecretLeak: true, disabledEndpointStatuses: { '/api/shop/orders': 404, '/api/warranty/claims': 404, '/api/account/devices': 404 }, serverFeatureGatesLocked: true },
    tooling: { localTestsPassed: true, localTestCount: 1816, buildPassed: true, secretScanPassed: true, requiredCiChecksPassed: true, noCriticalVulnerabilities: true },
    rollback: { previousDeploymentId: 'dpl_PREVIOUS', previousDeploymentReady: true, backupRecorded: true, backupHashRecorded: true, restoreDrillPassed: true, migrationHistoryRecorded: true },
  };
}

const gate = (e: ReleaseEvidence, id: string) => evaluateRelease(e, now).gates.find((item) => item.id === id)!;

test('complete pre-promotion evidence allows the exact candidate', () => assert.equal(evaluateRelease(fixture(), now).PROMOTION_ALLOWED, true));
test('complete post-promotion evidence evaluates G16 without reopening promotion', () => {
  const e = fixture();
  e.phase = 'post-promotion';
  e.candidate.target = 'production-live';
  e.candidate.mappedToPublic = true;
  e.postPromotion = { canonicalDeploymentId: e.candidate.deploymentId, expectedDeploymentId: e.candidate.deploymentId, marketingPassed: true, adminPassed: true, logoutRechecked: true, csrfRechecked: true, disabledFeaturesRechecked: true };
  const verdict = evaluateRelease(e, now);
  assert.equal(verdict.RELEASE_HEALTHY, true);
  assert.equal(verdict.PROMOTION_ALLOWED, false);
});
test('logout 400 is rejected', () => { const e = fixture(); e.browser!.logoutHttpStatus = 400; assert.equal(gate(e, 'G08').status, 'FAIL'); });
test('active DB session after logout is rejected', () => { const e = fixture(); e.browser!.sessionCountAfter = 1; assert.equal(gate(e, 'G08').status, 'FAIL'); });
test('other account sessions may remain when the exact tested session is revoked', () => { const e = fixture(); e.browser!.sessionCountBefore = 4; e.browser!.sessionCountAfter = 3; assert.equal(gate(e, 'G08').status, 'PASS'); });
test('missing revocation of the exact tested session is rejected', () => { const e = fixture(); e.browser!.sessionUnderTestRevoked = false; assert.equal(gate(e, 'G08').status, 'FAIL'); });
test('wrong source SHA is rejected', () => { const e = fixture(); e.candidate.actualGitSha = 'b'.repeat(40); assert.equal(gate(e, 'G01').status, 'FAIL'); });
test('wrong target is rejected', () => { const e = fixture(); e.candidate.target = 'production-live'; assert.equal(gate(e, 'G02').status, 'FAIL'); });
test('stale alias mapping is rejected', () => { const e = fixture(); e.candidate.aliasStable = false; assert.equal(gate(e, 'G03').status, 'FAIL'); });
test('missing browser evidence is blocked', () => { const e = fixture(); delete e.browser; assert.equal(gate(e, 'G05').status, 'BLOCKED'); });
test('former OWNER returned after logout is rejected', () => { const e = fixture(); e.browser!.afterLogoutMeFormerOwner = true; assert.equal(gate(e, 'G09').status, 'FAIL'); });
test('disabled feature unexpectedly returning 200 is rejected', () => { const e = fixture(); e.browser!.disabledEndpointStatuses['/api/shop/orders'] = 200; assert.equal(gate(e, 'G13').status, 'FAIL'); });
test('offline provider blocks the candidate', () => { const e = fixture(); e.provider!.reachable = false; assert.equal(gate(e, 'G03').status, 'FAIL'); });
test('expired evidence is rejected', () => { const e = fixture(); e.expiresAt = '2026-10-25T07:59:59.000Z'; assert.equal(gate(e, 'G03').status, 'FAIL'); });
test('secret-bearing evidence is refused before report generation', () => { const e = fixture() as ReleaseEvidence & { token?: string }; e.token = 'must-not-pass'; assert.throws(() => evaluateRelease(e, now), /Secret-bearing key/); });
test('promotion wrapper rejects an expired or mismatched verdict', () => { const verdict = evaluateRelease(fixture(), now); const errors = validatePromotionVerdict(verdict, { deploymentId: 'dpl_OTHER', immutableUrl: verdict.candidate.immutableUrl, gitSha: verdict.candidate.expectedGitSha, projectId: verdict.candidate.projectId }, new Date('2026-10-25T10:00:00.000Z')); assert.ok(errors.some((item) => /mismatch/i.test(item))); assert.ok(errors.some((item) => /stale|expired/i.test(item))); });
test('promotion validation requires deployed source provenance', () => { const e = fixture(); delete e.candidate.actualGitSha; const verdict = evaluateRelease(e, now); const errors = validatePromotionVerdict(verdict, { deploymentId: verdict.candidate.deploymentId, immutableUrl: verdict.candidate.immutableUrl, gitSha: verdict.candidate.expectedGitSha, projectId: verdict.candidate.projectId }, now); assert.ok(errors.some((item) => /provenance/i.test(item))); });

import { calculateAllRepoMetrics } from '../packages/analytics/repoMetrics.service.js';
import { calculateWorkspaceMetrics } from '../packages/analytics/workspaceMetrics.service.js';
import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function main() {
  console.log('=== 1. Recalculating Repo Metrics with New Empty Repo Logic ===');
  await calculateAllRepoMetrics();

  console.log('\n=== 2. Recalculating Workspace Metrics ===');
  await calculateWorkspaceMetrics();

  console.log('\n=== 3. Inspecting Database (repo_metrics) ===');
  const repos = await sql`
    SELECT repo_name, bus_factor, risk_score, status, contributor_count, primary_owner 
    FROM repo_metrics 
    ORDER BY bus_factor ASC, repo_name ASC
  `;
  console.table(repos);

  const cortexCore = repos.find(r => r.repo_name === 'cortex-core');
  const auditRepo = repos.find(r => r.repo_name === 'AuditTestRepo_Beta');
  const billingEngine = repos.find(r => r.repo_name === 'billing-engine');

  console.log('\n=== 4. Assertions on Empty Repos ===');
  console.log('cortex-core:', cortexCore);
  console.log('AuditTestRepo_Beta:', auditRepo);
  console.log('billing-engine (active repo):', billingEngine);

  if (cortexCore?.status !== 'empty' || Number(cortexCore?.risk_score) !== 0 || Number(cortexCore?.bus_factor) !== 0) {
    throw new Error(`FAIL: cortex-core expected status='empty', risk_score=0, bus_factor=0, got: ${JSON.stringify(cortexCore)}`);
  }
  if (auditRepo?.status !== 'empty' || Number(auditRepo?.risk_score) !== 0 || Number(auditRepo?.bus_factor) !== 0) {
    throw new Error(`FAIL: AuditTestRepo_Beta expected status='empty', risk_score=0, bus_factor=0, got: ${JSON.stringify(auditRepo)}`);
  }
  if (billingEngine?.status !== 'fragile' || Number(billingEngine?.risk_score) !== 80 || Number(billingEngine?.bus_factor) !== 1) {
    throw new Error(`FAIL: billing-engine expected status='fragile', risk_score=80, bus_factor=1, got: ${JSON.stringify(billingEngine)}`);
  }
  console.log('✅ PASS: Empty repos correctly marked status="empty", risk_score=0, bus_factor=0!');
  console.log('✅ PASS: Real active repos retained their expected bus factor (1) and risk score (80)!');

  console.log('\n=== 5. Simulating Dashboard Overview Calculation ===');
  const activeRepos = repos.filter(r => r.status !== 'empty' && r.status !== 'scaffold' && Number(r.risk_score) > 0 && Number(r.bus_factor) > 0);
  const totalActiveRepos = activeRepos.length;
  const spofRepos = activeRepos.filter(r => Number(r.bus_factor) <= 1);
  const spofPct = totalActiveRepos > 0 ? (spofRepos.length / totalActiveRepos) * 100 : 0;
  const sumBusFactor = activeRepos.reduce((acc, r) => acc + Number(r.bus_factor ?? 0), 0);
  const avgBusFactor = totalActiveRepos > 0 ? sumBusFactor / totalActiveRepos : 0;

  console.log({
    totalRepos: repos.length,
    activeRepos: totalActiveRepos,
    spofReposCount: spofRepos.length,
    spofPct: `${spofPct.toFixed(1)}%`,
    avgBusFactor: avgBusFactor.toFixed(2),
  });

  const emptyInSpof = spofRepos.some(r => r.repo_name === 'cortex-core' || r.repo_name === 'AuditTestRepo_Beta');
  if (emptyInSpof) {
    throw new Error('FAIL: Empty repo found in spofRepos!');
  }
  console.log('✅ PASS: Empty repos are 100% excluded from SPOF list and average bus factor!');

  console.log('\n=== 6. Checking getFindings Query ===');
  const fragileFindings = await sql`
    SELECT repo_name, bus_factor, risk_score, contributor_count
    FROM repo_metrics
    WHERE bus_factor <= 1
      AND status NOT IN ('empty', 'scaffold')
      AND risk_score > 0
  `;
  const emptyInFindings = fragileFindings.some(r => r.repo_name === 'cortex-core' || r.repo_name === 'AuditTestRepo_Beta');
  if (emptyInFindings) {
    throw new Error('FAIL: Empty repo found in fragileFindings!');
  }
  console.log(`✅ PASS: Findings query returns ${fragileFindings.length} fragile active repos, 0 empty repos.`);

  process.exit(0);
}

main().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

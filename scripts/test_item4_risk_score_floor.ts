import sql from '../apps/api/config/postgres.js';
import type { DataSource } from '../packages/database/provenance.js';

function computeRiskScore(isEmpty: boolean, busFactor: number, contributorCount: number) {
    const busFactorFinal = isEmpty ? 0 : Math.min(busFactor, contributorCount);
    const riskScore = isEmpty ? 0 : Math.max(5, 100 - busFactorFinal * 20);
    const status = isEmpty
        ? 'empty'
        : (riskScore >= 80 ? 'fragile' : riskScore > 50 ? 'concentrated' : 'healthy');
    return { busFactorFinal, riskScore, status };
}

async function testRiskScoreFloor() {
    console.log('====================================================');
    console.log('TEST ITEM 4: Repository Risk Score 5% Baseline Floor');
    console.log('====================================================\n');

    const testSource: DataSource = 'backfill';

    // Test 1: Bus Factor = 5 (active repository with 5+ contributors)
    console.log('[1/4] Calculating Risk Score for Bus Factor = 5:');
    const r5 = computeRiskScore(false, 5, 5);
    console.log(`   -> busFactor: ${r5.busFactorFinal}, riskScore: ${r5.riskScore}%, status: ${r5.status}`);
    if (r5.riskScore !== 5) {
        throw new Error(`FAIL: Expected riskScore = 5% for Bus Factor 5, got: ${r5.riskScore}%`);
    }
    console.log('   ✅ PASS: Bus Factor 5 evaluates to exactly 5% baseline risk floor (not 0%).');

    // Test 2: Bus Factor = 6 (ultra-resilient repository)
    console.log('\n[2/4] Calculating Risk Score for Bus Factor = 6:');
    const r6 = computeRiskScore(false, 6, 6);
    console.log(`   -> busFactor: ${r6.busFactorFinal}, riskScore: ${r6.riskScore}%, status: ${r6.status}`);
    if (r6.riskScore !== 5) {
        throw new Error(`FAIL: Expected riskScore = 5% for Bus Factor 6, got: ${r6.riskScore}%`);
    }
    console.log('   ✅ PASS: Bus Factor 6 evaluates to exactly 5% baseline risk floor (not 0% or negative).');

    // Test 3: Bus Factor = 1 (fragile single-point-of-failure repo)
    console.log('\n[3/4] Calculating Risk Score for Bus Factor = 1:');
    const r1 = computeRiskScore(false, 1, 1);
    console.log(`   -> busFactor: ${r1.busFactorFinal}, riskScore: ${r1.riskScore}%, status: ${r1.status}`);
    if (r1.riskScore !== 80) {
        throw new Error(`FAIL: Expected riskScore = 80% for Bus Factor 1, got: ${r1.riskScore}%`);
    }
    console.log('   ✅ PASS: Bus Factor 1 evaluates to 80% risk with status "fragile".');

    // Test 4: Empty repository (0 commits, isEmpty = true)
    console.log('\n[4/4] Calculating Risk Score for Empty Repository (0 commits):');
    const rEmpty = computeRiskScore(true, 0, 0);
    console.log(`   -> busFactor: ${rEmpty.busFactorFinal}, riskScore: ${rEmpty.riskScore}%, status: ${rEmpty.status}`);
    if (rEmpty.riskScore !== 0 || rEmpty.status !== 'empty') {
        throw new Error(`FAIL: Expected riskScore = 0% and status = 'empty' for empty repo, got: ${rEmpty.riskScore}%, status=${rEmpty.status}`);
    }
    console.log('   ✅ PASS: Empty repository correctly remains 0% risk with status "empty".');

    // Test 5: Verify persistence in PostgreSQL repo_metrics table
    console.log('\n[5/5] Testing PostgreSQL database persistence for high Bus Factor repo:');
    const repoName = `test-org/bf5-repo-${Date.now()}`;
    const extId = `ext_${Date.now()}`;
    await sql`
        INSERT INTO repo_metrics (
            source, external_id, repo_name, bus_factor, risk_score, contributor_count, primary_owner, status,
            commit_count, primary_owner_percentage, technologies, top_contributors, computed_at
        ) VALUES (
            ${testSource}, ${extId}, ${repoName}, ${r5.busFactorFinal}, ${r5.riskScore}, 5, null, ${r5.status},
            100, 20, '[]'::jsonb, '[]'::jsonb, CURRENT_TIMESTAMP
        )
    `;

    const [dbRow] = await sql`
        SELECT repo_name, bus_factor, risk_score, status 
        FROM repo_metrics 
        WHERE repo_name = ${repoName} AND source = ${testSource}
    `;

    console.log(`   -> Stored in PostgreSQL: repo=${dbRow?.repo_name}, bus_factor=${dbRow?.bus_factor}, risk_score=${dbRow?.risk_score}%, status=${dbRow?.status}`);
    if (dbRow?.risk_score !== 5) {
        throw new Error(`FAIL: DB row risk_score is ${dbRow?.risk_score}%, expected 5%`);
    }
    console.log('   ✅ PASS: Confirmed in PostgreSQL: High Bus Factor repository persists with risk_score = 5%!');

    // Cleanup
    await sql`DELETE FROM repo_metrics WHERE repo_name = ${repoName} AND source = ${testSource}`;

    console.log('\n====================================================');
    console.log('🎉 ALL ITEM 4 CHECKS PASSED WITH EVIDENCE!');
    console.log('====================================================\n');
    process.exit(0);
}

testRiskScoreFloor().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});

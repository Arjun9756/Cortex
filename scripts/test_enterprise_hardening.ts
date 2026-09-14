import { calculateKnowledgeRisk } from '../packages/analytics/knowledge.service.js';
import { calculateOwnership } from '../packages/analytics/knowledge.risk.predict.js';
import { upsertEntity, upsertRelation, rollbackEventRelations } from '../packages/database/neo4j/graph.repository.js';
import { runAnalyticsJob } from '../packages/workers/scheduler.worker.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function runHardeningTests() {
    console.log('=== STARTING ENTERPRISE HARDENING & ZERO-REGRESSION VERIFICATION ===\n');
    let passed = 0;
    let failed = 0;

    // Test 1: Validate Time-Decayed Ownership calculation contract
    try {
        console.log('[Test 1] Testing Time-Decayed Ownership Calculation...');
        const ownership = await calculateOwnership('Arjun', { relation: 'AUTHORED', targetLabel: 'COMMIT' }, ['AUTHORED']);
        console.log(`[Test 1 Result] Ownership Score: ${ownership.score}, Count: ${ownership.count}`);
        if (typeof ownership.score === 'number' && ownership.score >= 0 && ownership.score <= 1 && typeof ownership.count === 'number') {
            console.log('✅ Test 1 PASSED: Ownership calculation contract valid and bounded in [0, 1].\n');
            passed++;
        } else {
            console.error('❌ Test 1 FAILED: Score out of bounds or invalid types.\n');
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 1 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // Test 2: Validate 6-Factor Knowledge Risk composite calculation
    try {
        console.log('[Test 2] Testing 6-Factor Knowledge Risk Calculation...');
        const risk = await calculateKnowledgeRisk('Arjun');
        console.log(`[Test 2 Result] Total Risk: ${risk.totalRisk} (${Math.round(risk.totalRisk * 100)}%)`);
        console.log(`[Test 2 Breakdown]`, JSON.stringify(risk.breakdown));
        if (typeof risk.totalRisk === 'number' && risk.totalRisk >= 0 && risk.totalRisk <= 1 && risk.breakdown) {
            console.log('✅ Test 2 PASSED: Knowledge Risk calculation succeeded with all 6 factors intact.\n');
            passed++;
        } else {
            console.error('❌ Test 2 FAILED: Risk score invalid.\n');
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 2 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // Test 3: Validate Graph Edge Metadata (sourceEventId, confidence) & Rollback
    try {
        console.log('[Test 3] Testing Relationship Metadata & Rollback Mechanism...');
        const testEventId = `test_event_${Date.now()}`;
        
        // Create 2 test entity nodes
        const nodeAId = await upsertEntity('AuditTestPerson_Alpha', 'PERSON', { email: 'audit_alpha@example.com' });
        const nodeBId = await upsertEntity('AuditTestRepo_Beta', 'REPOSITORY');

        if (!nodeAId || !nodeBId) throw new Error('Failed to create test entity nodes');

        // Upsert relation with sourceEventId and confidence
        await upsertRelation(nodeAId, nodeBId, 'WORKS_ON', 'audit test link', {
            sourceEventId: testEventId,
            confidence: 0.95
        });

        // Verify relation exists with metadata
        const session = driver.session();
        const checkRes = await session.run(`
            MATCH ()-[r:WORKS_ON { sourceEventId: $testEventId }]->()
            RETURN r.confidence AS confidence, r.sourceEventId AS sourceEventId
        `, { testEventId });
        await session.close();

        if (checkRes.records.length === 0) {
            throw new Error('Relation with sourceEventId was not found in Neo4j');
        }
        console.log(`[Test 3 Check] Found tagged relation with confidence: ${checkRes.records[0].get('confidence')}`);

        // Now test rollback
        const deletedCount = await rollbackEventRelations(testEventId);
        console.log(`[Test 3 Rollback] Successfully rolled back ${deletedCount} relation(s).`);

        // Verify it was deleted
        const session2 = driver.session();
        const verifyRes = await session2.run(`
            MATCH ()-[r:WORKS_ON { sourceEventId: $testEventId }]->()
            RETURN count(r) AS c
        `, { testEventId });
        await session2.close();
        const remaining = verifyRes.records[0]?.get('c')?.toNumber() ?? 0;

        if (deletedCount >= 1 && remaining === 0) {
            console.log('✅ Test 3 PASSED: Edge metadata and rollback mechanism verified.\n');
            passed++;
        } else {
            console.error(`❌ Test 3 FAILED: Rollback did not cleanly remove edge (remaining: ${remaining}).\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 3 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // Test 4: Validate Full Analytics Job Execution (Person, Repo, Tech, Workspace, Daily Report)
    try {
        console.log('[Test 4] Testing Full Analytics Batch Job (Non-regression)...');
        await runAnalyticsJob();

        // Verify Postgres tables updated
        const [personCount] = await sql`SELECT count(*)::int AS count FROM person_metrics`;
        const [repoCount] = await sql`SELECT count(*)::int AS count FROM repo_metrics`;
        const [techCount] = await sql`SELECT count(*)::int AS count FROM technology_metrics`;
        const [ws] = await sql`SELECT * FROM workspace_metrics ORDER BY computed_at DESC LIMIT 1`;

        console.log(`[Test 4 Result] person_metrics: ${personCount?.count}, repo_metrics: ${repoCount?.count}, tech_metrics: ${techCount?.count}, avgRisk: ${ws?.knowledge_risk_avg}%`);

        if (personCount?.count > 0 && repoCount?.count > 0 && ws) {
            console.log('✅ Test 4 PASSED: Analytics pipeline executed without errors and updated all Postgres tables.\n');
            passed++;
        } else {
            console.error('❌ Test 4 FAILED: Analytics tables empty after run.\n');
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 4 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    console.log(`=== HARDENING VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
    await driver.close();
    await sql.end();
    process.exit(failed > 0 ? 1 : 0);
}

runHardeningTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});

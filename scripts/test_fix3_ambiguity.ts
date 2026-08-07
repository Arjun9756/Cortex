import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { driver } from '../apps/api/config/neo4j.js';

async function createDuplicateNode() {
    const session = driver.session();
    try {
        console.log('\n--- STEP 1: Creating duplicate PERSON node in Neo4j ---');
        const res = await session.run(`
            MATCH (existing:PERSON {name: "Arjun Kumar"})
            CREATE (dup:PERSON {
                name: "Arjun Kumar",
                email: "arjun.kumar.test@company.com",
                externalId: "person_test_duplicate_001",
                role: "Software Engineer",
                createdAt: timestamp()
            })
            RETURN elementId(dup) AS dupId
        `);
        console.log(`Created duplicate PERSON node with id: ${res.records[0]?.get('dupId')}`);

        // Verify count
        const verifyRes = await session.run(`
            MATCH (n:PERSON)
            WHERE toLower(n.name) CONTAINS 'arjun'
            RETURN n.name AS name, n.email AS email, n.externalId AS externalId
        `);
        console.log(`Verified ${verifyRes.records.length} matching nodes in Neo4j:`);
        for (const record of verifyRes.records) {
            console.log(` - name: "${record.get('name')}", email: "${record.get('email')}", externalId: "${record.get('externalId')}"`);
        }
    } finally {
        await session.close();
    }
}

async function cleanupDuplicateNode() {
    const session = driver.session();
    try {
        console.log('\n--- CLEANUP: Deleting duplicate PERSON node ---');
        await session.run(`
            MATCH (n:PERSON {externalId: "person_test_duplicate_001"})
            DETACH DELETE n
        `);
        console.log('Cleanup complete: Duplicate node removed.');
    } catch (e: any) {
        console.error('Cleanup failed:', e?.message);
    } finally {
        await session.close();
    }
}

async function main() {
    try {
        await createDuplicateNode();

        console.log(`\n${'='.repeat(80)}`);
        console.log(`TEST 3 (WITH AMBIGUITY): "Why did we switch to Valkey and what is Arjun's email?"`);
        console.log('=' .repeat(80));

        const tStart = Date.now();
        const result = await cortexAgent.invoke({
            query: "Why did we switch to Valkey and what is Arjun's email?"
        }, { recursionLimit: 20 });
        const elapsed = Date.now() - tStart;

        console.log(`\nEND-TO-END LATENCY: ${elapsed}ms`);
        console.log(`\n--- FINAL USER-FACING ANSWER ---`);
        console.log(result.answer);
        console.log(`--- END ANSWER ---`);

        console.log(`\nEXECUTION METADATA:`);
        console.log(JSON.stringify({
            tools: result.executedTools,
            graphAction: result.graphAction,
            entities: result.entities,
            needsClarification: Boolean(result.clarificationQuestion),
            clarificationQuestion: result.clarificationQuestion || undefined,
            graphResultCount: result.graphResult?.length ?? 0,
            vectorResultCount: result.vectorResult?.length ?? 0,
            hasKnowledgeRisk: Boolean(result.knowledgeRiskResult),
        }, null, 2));

    } catch (err: any) {
        console.error("Test error:", err.message);
        console.error(err.stack);
    } finally {
        await cleanupDuplicateNode();
        process.exit(0);
    }
}

main();

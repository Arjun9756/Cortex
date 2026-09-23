import { cortexAgent } from '../packages/agent/graph/workflow.js';
import sql from '../apps/api/config/postgres.js';
import { neo4jSession } from '../apps/api/config/neo4j.js';
import { calculateSuccessorsByRepo, calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';
import fs from 'fs';

async function testQuery(query: string) {
    console.log(`\n======================================================`);
    console.log(`RUNNING QUERY: "${query}"`);
    console.log(`======================================================\n`);

    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });
        console.log(`\nResult for "${query}":`);
        console.log(`- Answer: ${result.answer}`);
        console.log(`- Clarification: ${result.clarificationQuestion}`);
        console.log(`- Executed Tools: ${JSON.stringify(result.executedTools)}`);
        console.log(`- Structured Evidence count: ${result.structuredEvidence?.length || 0}`);
        console.log(`- Sources: ${JSON.stringify(result.vectorResult?.length || 0)}`);
        console.log(`- KnowledgeRiskResult: ${Boolean(result.knowledgeRiskResult)}`);
        return result;
    } catch (err: any) {
        console.error(`Error invoking query "${query}":`, err);
        return { error: err.message };
    }
}

async function main() {
    console.log("=== CHECKING POSTGRES & NEO4J DATA FOR REPRODUCER ===");

    const repos = await sql`SELECT repo_name, bus_factor, risk_score, primary_owner FROM repo_metrics WHERE status = 'fragile' LIMIT 5`;
    console.log("Sample fragile repos in DB:", repos);

    const persons = await sql`SELECT person_name, commit_count, repos FROM person_metrics LIMIT 5`;
    console.log("Sample persons in DB:", persons);

    // Also check dashboard successor calculation directly for one repo (e.g., billing-engine with owner priyasharma)
    console.log("\n=== TESTING DASHBOARD SUCCESSOR SERVICE FOR billing-engine ===");
    try {
        const repoSuccessors = await calculateSuccessorsByRepo("priyasharma");
        console.log("calculateSuccessorsByRepo('priyasharma'):", JSON.stringify(repoSuccessors, null, 2));
    } catch (e: any) {
        console.warn("calculateSuccessorsByRepo error:", e.message);
    }

    // Now test the exact queries requested in Part 0
    const queries = [
        "how many commits in this repo",
        "how many commits in billing-engine",
        "how many commits did priyasharma make",
        "who is the best successor for this repo",
        "who is the best successor for billing-engine"
    ];

    const results: Record<string, any> = {};

    for (const q of queries) {
        results[q] = await testQuery(q);
    }

    fs.writeFileSync('scratch/part0_results.json', JSON.stringify(results, null, 2));
    console.log("\nWrote scratch/part0_results.json successfully.");
    process.exit(0);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});

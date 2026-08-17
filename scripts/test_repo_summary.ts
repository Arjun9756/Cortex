import { repositorySummary } from '../packages/graph/cypher/analysis.cypher.js';

async function testRepoSummary() {
    const summary = await repositorySummary('');
    console.log("All Repositories Summary:");
    console.dir(summary, { depth: null });
}

testRepoSummary().catch(console.error);

import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function testRepoTechChat() {
    const query = "every repo their corresponding technology";

    console.log('================================================================================');
    console.log('🧪 TESTING REPO-TO-TECHNOLOGY CHAT QUERY');
    console.log(`Query: "${query}"`);
    console.log('================================================================================\n');

    try {
        const t0 = Date.now();
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });
        const elapsed = Date.now() - t0;

        console.log(`⏱️ Execution Time: ${elapsed}ms`);
        console.log(`🛠️ Executed Tools: ${result.executedTools.join(', ')}`);
        console.log(`\n📄 Agent Final Answer:\n--------------------------------------------------`);
        console.log(result.answer);
        console.log(`--------------------------------------------------\n`);

        const hasCortex = /Cortex/i.test(result.answer);
        const hasBilling = /billing-(engine|service)/i.test(result.answer);
        const hasTechs = /(Redis|Valkey|Kafka|Stripe|Rust|Temporal|Qdrant|Cypher)/i.test(result.answer);
        const hasNoData = /no repository.technology mapping data available/i.test(result.answer);

        if (hasCortex && hasBilling && hasTechs && !hasNoData) {
            console.log('🎉 PASS: All repositories and their corresponding technologies were successfully retrieved and formatted!');
        } else {
            console.error('❌ FAIL: Tech mapping failed or returned empty.');
        }

    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

testRepoTechChat();

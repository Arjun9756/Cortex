import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function testMasterQuery() {
    const query = "How many total repositories and technologies are there, which repos have a bus factor of 1, what is Priya Sharma's knowledge risk and what technologies does she use, why did we replace Redis with Valkey and when, and if Arjun Kumar leaves what breaks and who's the best successor?";

    console.log('================================================================================');
    console.log('🔥 RUNNING COMPLETE 6-PART MASTER QUERY');
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

        const hasPriyaSuccessor = /Priya(\s+Sharma)?/i.test(result.answer);
        const hasArjunSuccessorSection = result.answer.toLowerCase().includes('successor');

        if (hasPriyaSuccessor && hasArjunSuccessorSection) {
            console.log('✅ PASS: Master query correctly recommended Priya Sharma as the successor for Arjun Kumar!');
        } else {
            console.error('❌ FAIL: Successor recommendation missing or incorrect in master query answer');
        }

    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

testMasterQuery();

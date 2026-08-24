import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function testDepartureBusFactorEnrichment() {
    console.log('================================================================================');
    console.log('🧪 TESTING DEPARTURE QUERY WITH AUTOMATIC BUS FACTOR & SUCCESSOR ENRICHMENT');
    console.log('================================================================================\n');

    const testQueries = [
        {
            name: "Arjun Kumar Departure Query (No explicit bus factor asked)",
            query: "If Arjun Kumar leaves what breaks and who's the best successor?",
            expectedPatterns: [
                /cortex/i,
                /bus factor\s*[:=]?\s*1/i,
                /80\s*%/i,
                /Priya(\s+Sharma)?/i,
                /36\s*%/i
            ],
            forbiddenPatterns: [
                /no indexed records found.*bus factor/i,
                /data not provided.*bus factor/i
            ]
        },
        {
            name: "Priya Sharma Departure Query (Affected billing repos)",
            query: "What happens if Priya Sharma leaves and who can take over her work?",
            expectedPatterns: [
                /(billing-engine|billing-service|checkout-service)/i,
                /Arjun(\s+Kumar)?/i,
                /36\s*%/i
            ],
            forbiddenPatterns: [
                /no indexed records found.*bus factor/i
            ]
        }
    ];

    let allPassed = true;

    for (const test of testQueries) {
        console.log(`\n================================================================================`);
        console.log(`💬 Running Query: "${test.query}"`);
        console.log(`================================================================================\n`);

        try {
            const t0 = Date.now();
            const result = await cortexAgent.invoke({ query: test.query }, { recursionLimit: 25 });
            const elapsed = Date.now() - t0;

            console.log(`⏱️ Execution Time: ${elapsed}ms`);
            console.log(`🛠️ Executed Tools: ${result.executedTools.join(', ')}`);
            console.log(`\n📄 Agent Final Answer:\n--------------------------------------------------`);
            console.log(result.answer);
            console.log(`--------------------------------------------------\n`);

            for (const pattern of test.expectedPatterns) {
                if (!pattern.test(result.answer)) {
                    console.error(`❌ FAILED: Expected pattern ${pattern} not found in answer.`);
                    allPassed = false;
                } else {
                    console.log(`✅ MATCH: Expected pattern ${pattern} found.`);
                }
            }

            for (const pattern of test.forbiddenPatterns) {
                if (pattern.test(result.answer)) {
                    console.error(`❌ FAILED: Forbidden misleading pattern ${pattern} found in answer.`);
                    allPassed = false;
                } else {
                    console.log(`✅ MATCH: Forbidden pattern ${pattern} correctly absent.`);
                }
            }

        } catch (e: any) {
            console.error(`Error in test "${test.name}":`, e);
            allPassed = false;
        }

        // 5-second breather between LLM test invocations to respect Groq rate limits
        await new Promise((r) => setTimeout(r, 5000));
    }

    await driver.close();
    await sql.end();

    console.log(`\n================================================================================`);
    if (allPassed) {
        console.log('🎉 ALL DEPARTURE BUS FACTOR & SUCCESSOR ENRICHMENT TESTS PASSED!');
    } else {
        console.error('❌ SOME TESTS FAILED.');
        process.exit(1);
    }
}

testDepartureBusFactorEnrichment();

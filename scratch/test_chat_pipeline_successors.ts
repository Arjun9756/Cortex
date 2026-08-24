import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

interface TestCase {
    name: string;
    query: string;
    expectedSuccessorPattern: RegExp;
}

async function runChatPipelineTests() {
    const testCases: TestCase[] = [
        {
            name: 'Arjun Kumar Departure & Successor Query',
            query: "If Arjun Kumar leaves what breaks and who's the best successor?",
            expectedSuccessorPattern: /Priya(\s+Sharma)?/i
        },
        {
            name: 'Priya Sharma Departure & Successor Query',
            query: "What happens if Priya Sharma leaves and who is the recommended successor?",
            expectedSuccessorPattern: /Arjun(\s+Kumar)?/i
        },
        {
            name: 'Elena Rostova Synthetic Entity Departure Query',
            query: "Who is the best successor for Elena Rostova if she leaves?",
            expectedSuccessorPattern: /no (candidate|successor|indexed records|matching)/i
        },
        {
            name: 'Marcus Vance Synthetic Entity Departure Query',
            query: "What happens if Marcus Vance departs and who can take over his repositories?",
            expectedSuccessorPattern: /no (candidate|successor|indexed records|matching)/i
        },
        {
            name: 'Amina Zahra Synthetic Entity Departure Query',
            query: "Who should take over if Amina Zahra resigns?",
            expectedSuccessorPattern: /no (candidate|successor|indexed records|matching)/i
        }
    ];

    console.log('================================================================================');
    console.log('🚀 TESTING SUCCESSOR RECOMMENDATIONS THROUGH FULL AGENTIC CHAT PIPELINE');
    console.log('================================================================================\n');

    let allPassed = true;

    try {
        for (const tc of testCases) {
            console.log(`\n================================================================================`);
            console.log(`🧪 TEST: ${tc.name}`);
            console.log(`💬 Query: "${tc.query}"`);
            console.log(`================================================================================\n`);

            const t0 = Date.now();
            const result = await cortexAgent.invoke({ query: tc.query }, { recursionLimit: 25 });
            const elapsed = Date.now() - t0;

            console.log(`⏱️ Execution Time: ${elapsed}ms`);
            console.log(`🛠️ Executed Tools: ${result.executedTools.join(', ')}`);
            console.log(`\n📄 Agent Final Answer:\n--------------------------------------------------`);
            console.log(result.answer);
            console.log(`--------------------------------------------------\n`);

            const isMatch = tc.expectedSuccessorPattern.test(result.answer);
            if (isMatch) {
                console.log(`✅ PASS: Answer matches expected successor behavior pattern (${tc.expectedSuccessorPattern})`);
            } else {
                console.error(`❌ FAIL: Answer does not match expected pattern (${tc.expectedSuccessorPattern})`);
                allPassed = false;
            }
        }

        console.log(`\n================================================================================`);
        if (allPassed) {
            console.log(`🎉 ALL ${testCases.length} AGENTIC CHAT PIPELINE TESTS PASSED PERFECTLY!`);
        } else {
            console.log(`⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.`);
        }
        console.log(`================================================================================\n`);

    } catch (e: any) {
        console.error('Fatal Pipeline Error:', e);
    } finally {
        await driver.close();
        await sql.end();
        process.exit(allPassed ? 0 : 1);
    }
}

runChatPipelineTests();

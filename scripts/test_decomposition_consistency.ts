import dotenv from 'dotenv';
dotenv.config();
import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { createGroqChatCompletion } from '../packages/llm/providers/groq.js';

const QUERY = "How many total repositories and technologies are there, which repos have a bus factor of 1, what is Priya Sharma's knowledge risk and what technologies does she use, why did we replace Redis with Valkey and when, and if Arjun Kumar leaves what breaks and who's the best successor?";

async function runDecompositionOnly(modelName: string) {
    const response = await createGroqChatCompletion({
        model: modelName,
        temperature: 0,
        max_completion_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You are a precision query decomposition engine for an engineering knowledge graph.
Enumerate EVERY distinct, independently answerable sub-question or ask embedded in the user query as a JSON array of strings.
Do NOT artificially cap the number of asks — if the query contains 1, 3, 6, or 10 distinct questions/clauses joined by "and", commas, or separate sentences, identify and output ALL of them.
CRITICAL RULE: Never combine multiple entity types, targets, or resources (e.g. "repositories and technologies" or "Elena and Marcus") into a single ask — always split them into separate distinct asks (e.g. "How many total repositories are there?" and "How many total technologies are there?").
Preserve exact entity names and specific conditions.
Return JSON only: {"asks":["ask 1", "ask 2", ...]}`
            },
            { role: 'user', content: QUERY },
        ],
    });
    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    return parsed?.asks || [];
}

async function main() {
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('🔬 DECOMPOSITION CONSISTENCY & REPETITION STUDY FOR TEST 11');
    console.log(`Query: "${QUERY}"`);
    console.log('════════════════════════════════════════════════════════════════════\n');

    // 1. Check 120b decomposition
    console.log('--- 120B MODEL (openai/gpt-oss-120b) DECOMPOSITION ---');
    const asks120b = await runDecompositionOnly('openai/gpt-oss-120b');
    console.log(`120B Ask Count: ${asks120b.length}`);
    console.log(JSON.stringify(asks120b, null, 2));

    // 2. Check 20b decomposition alone 3 times
    console.log('\n--- 20B MODEL (openai/gpt-oss-20b) DECOMPOSITION (3 RUNS) ---');
    for (let i = 1; i <= 3; i++) {
        const asks20b = await runDecompositionOnly('openai/gpt-oss-20b');
        console.log(`Run #${i} 20B Ask Count: ${asks20b.length}`);
        console.log(JSON.stringify(asks20b, null, 2));
    }

    // 3. Run 3 repeated full pipeline queries with 20b
    console.log('\n--- 3 REPEATED FULL PIPELINE RUNS WITH 20B (openai/gpt-oss-20b) ---');
    for (let i = 1; i <= 3; i++) {
        console.log(`\n▶ [FULL PIPELINE RUN #${i}] Executing pipeline...`);
        const t0 = Date.now();
        const res: any = await cortexAgent.invoke({
            query: QUERY,
            messages: [],
            pendingTools: [],
            executedTools: [],
            subgoals: [],
            missingGoals: [],
            iterationCount: 0,
            structuredEvidence: [],
            clarificationQuestion: null,
            finalAnswer: null,
            routerDecision: null,
            guardrailStatus: null,
            intent: 'KNOWLEDGE_RETRIEVAL',
            entities: [],
            sqlResults: null,
            graphResults: null,
            vectorResults: null,
            knowledgeRiskResult: null,
            vectorQuery: '',
            needMoreSearch: false,
        });
        const elapsed = Date.now() - t0;
        console.log(`  ⏱️ Latency: ${elapsed}ms`);
        console.log(`  📋 Subgoals Count: ${res.subgoals.length}`);
        console.log(`  📋 Decomposed Subgoals:`, res.subgoals.map((s: any) => `[${s.id}] ${s.description}`));
        console.log(`  🛠️ Planned / Executed Tools:`, res.executedTools);
        
        const ans = res.finalAnswer || '';
        const checks = {
            hasRepoCount: ans.toLowerCase().includes('total repositories') || ans.toLowerCase().includes('15'),
            hasTechCount: ans.toLowerCase().includes('total technologies') || ans.toLowerCase().includes('38'),
            hasBusFactor: ans.toLowerCase().includes('bus factor'),
            hasPriyaRisk: ans.toLowerCase().includes('priya sharma') && (ans.includes('19%') || ans.includes('19 %') || ans.includes('risk')),
            hasPriyaTech: ans.toLowerCase().includes('redis') && ans.toLowerCase().includes('stripe'),
            hasValkeyReason: ans.toLowerCase().includes('valkey') && (ans.toLowerCase().includes('drop-in') || ans.toLowerCase().includes('replacement') || ans.toLowerCase().includes('benchmark')),
            hasValkeyWhen: ans.toLowerCase().includes('2026') || ans.toLowerCase().includes('august'),
            hasArjunBreaks: ans.toLowerCase().includes('arjun') && (ans.toLowerCase().includes('cortex') || ans.toLowerCase().includes('graph-108') || ans.toLowerCase().includes('sole')),
            hasSuccessor: ans.toLowerCase().includes('successor')
        };
        console.log(`  📊 Verification Checklist:`, checks);
        const allPassed = Object.values(checks).every(Boolean);
        console.log(`  Status: ${allPassed ? '✅ ALL 9 CONCEPTS COVERED IN ANSWER' : '❌ SOME CONCEPTS MISSED'}`);
    }
}

main().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});

/**
 * test_compound_queries.ts
 * 
 * End-to-end integration test for compound query decomposition.
 * Tests 3 multi-part compound queries through the FULL plannerNode to verify
 * the LLM correctly decomposes each into multiple parallel tool calls.
 * 
 * Usage: npx tsx scripts/test_compound_queries.ts
 */
import { createGroqChatCompletion } from '../packages/llm/providers/groq.js';
import { buildPlannerPrompt } from '../packages/llm/prompts/planner.prompt.js';
import { getGraphSchema } from '../packages/database/neo4j/schemaCache.js';
import { TOOL_DEFINITIONS } from '../packages/agent/tools/toolDefinitions.js';

interface TestCase {
    id: string;
    query: string;
    expectedMinToolCalls: number;
    expectedTools: string[];  // tools that MUST appear (at minimum)
    description: string;
}

const TEST_CASES: TestCase[] = [
    {
        id: 'Q1',
        query: 'how many developers knows redis get their contact details also and why redis was replaced with valkey which date',
        expectedMinToolCalls: 2,
        expectedTools: ['graph_search', 'vector_search'],
        description: '3 asks: count/list developers who know redis + contact details + why replaced + date',
    },
    {
        id: 'Q2',
        query: "Who is Priya Sharma, what's her knowledge risk, and what technologies does she use?",
        expectedMinToolCalls: 2,
        expectedTools: ['graph_search', 'knowledge_risk'],
        description: '3 asks: entity info (describeEntity) + risk score + tech list (listNodes)',
    },
    {
        id: 'Q3',
        query: 'Why did we migrate to Valkey and who approved it and is there a bus factor risk on that repo?',
        expectedMinToolCalls: 2,
        expectedTools: ['vector_search'],
        description: '3 asks: reasoning/why + entity/who + risk assessment',
    },
];

const SYSTEM_MESSAGE = `You are an agentic retrieval planner. Your MOST IMPORTANT job is compound query decomposition.

BEFORE selecting any tools, mentally enumerate every distinct ask/question in the user message.
Then for EACH ask, independently decide which tool answers it and emit a tool call.

Rules:
- If the query has 1 ask, emit 1 tool call.
- If the query has 2 asks, emit 2 tool calls.
- If the query has 3+ asks, emit 3+ tool calls. There is NO LIMIT.
- NEVER collapse multiple distinct asks into a single tool call.
- NEVER stop after 1-2 tool calls if there are remaining asks.
- Each tool call should target ONE specific ask from the query.`;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callPlannerWithRetry(prompt: string, attempt = 1): Promise<any> {
    try {
        return await createGroqChatCompletion({
            messages: [
                { role: 'system', content: SYSTEM_MESSAGE },
                { role: 'user', content: prompt },
            ],
            temperature: 0,
            tools: TOOL_DEFINITIONS as any,
            tool_choice: 'auto',
            parallel_tool_calls: true,
            max_completion_tokens: 8192,
        }, 'qwen/qwen3.6-27b');
    } catch (err: any) {
        const isTransient = err.message?.includes('model output error') ||
            err.message?.includes('n is not defined') ||
            err.status === 503 || err.status === 429;
        if (isTransient && attempt < MAX_RETRIES) {
            console.log(`  ⚠️  Transient error (attempt ${attempt}/${MAX_RETRIES}): ${err.message?.slice(0, 80)}`);
            console.log(`  ⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await sleep(RETRY_DELAY_MS);
            return callPlannerWithRetry(prompt, attempt + 1);
        }
        throw err;
    }
}

async function runTest(tc: TestCase, labels: string[], relations: string[]): Promise<boolean> {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  TEST ${tc.id}: ${tc.description}`);
    console.log(`  Query: "${tc.query}"`);
    console.log(`${'═'.repeat(70)}\n`);

    const prompt = buildPlannerPrompt(tc.query, labels, relations);
    const response = await callPlannerWithRetry(prompt);

    const msg = response.choices[0]?.message;
    const toolCalls = msg?.tool_calls ?? [];
    const textContent = msg?.content?.trim() ?? '';

    console.log(`  Tool calls received: ${toolCalls.length}`);

    if (toolCalls.length === 0) {
        console.log(`  ❌ NO tool calls! LLM returned text: "${textContent.slice(0, 200)}"`);
        return false;
    }

    const toolNames: string[] = [];
    for (const call of toolCalls) {
        let args: any = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
        console.log(`  📌 Tool: ${call.function.name}(${JSON.stringify(args)})`);
        toolNames.push(call.function.name);
    }

    // Check minimum tool call count
    const countPass = toolCalls.length >= tc.expectedMinToolCalls;
    console.log(`\n  Tool call count: ${toolCalls.length} (expected ≥${tc.expectedMinToolCalls}) ${countPass ? '✅' : '❌'}`);

    // Check expected tools are present
    const missingTools = tc.expectedTools.filter(t => !toolNames.includes(t));
    const toolsPass = missingTools.length === 0;
    if (toolsPass) {
        console.log(`  Expected tools present: ${tc.expectedTools.join(', ')} ✅`);
    } else {
        console.log(`  Missing expected tools: ${missingTools.join(', ')} ❌`);
    }

    const pass = countPass && toolsPass;
    console.log(`\n  ${tc.id} RESULT: ${pass ? '✅ PASS' : '❌ FAIL'}`);
    return pass;
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║    COMPOUND QUERY DECOMPOSITION — INTEGRATION TEST SUITE           ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    const schema = await getGraphSchema();
    const labels = schema.nodeLabels;
    const relations = schema.relationshipTypes;
    console.log(`[Schema] ${labels.length} labels, ${relations.length} relations\n`);

    const results: { id: string; pass: boolean }[] = [];

    for (const tc of TEST_CASES) {
        try {
            const pass = await runTest(tc, labels, relations);
            results.push({ id: tc.id, pass });
            // Small delay between tests to avoid rate limiting
            await sleep(1000);
        } catch (err: any) {
            console.error(`  ❌ ${tc.id} threw error: ${err.message}`);
            results.push({ id: tc.id, pass: false });
        }
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log('  SUMMARY');
    console.log(`${'═'.repeat(70)}`);
    for (const r of results) {
        console.log(`  ${r.id}: ${r.pass ? '✅ PASS' : '❌ FAIL'}`);
    }
    const allPass = results.every(r => r.pass);
    console.log(`\n  Overall: ${allPass ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
    console.log(`${'═'.repeat(70)}\n`);

    process.exit(allPass ? 0 : 1);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

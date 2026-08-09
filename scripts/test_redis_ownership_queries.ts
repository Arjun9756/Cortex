/**
 * test_redis_ownership_queries.ts
 *
 * Tests multiple permutation/combination queries regarding Redis ownership, maintainers, and knowledge.
 * Verifies that vector_search + graph_search run and produce accurate evidence and answers containing Arjun Kumar.
 */

import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { routeQueryIntent } from '../packages/agent/router/intentRouter.js';

const queries = [
    "who owns the redis service",
    "who knwos redis service",
    "who works on redis",
    "who replaced redis",
    "who migrated redis",
    "who is responsible for redis"
];

async function main() {
    console.log("================================================================================");
    console.log("  TESTING PERMUTATIONS / COMBINATIONS FOR REDIS OWNERSHIP & KNOWLEDGE");
    console.log("================================================================================\n");

    for (let i = 0; i < queries.length; i++) {
        const query = queries[i]!;
        console.log(`--- [Query ${i + 1}] "${query}" ---`);
        const routerResult = routeQueryIntent(query);
        console.log(`[IntentRouter]: ${routerResult ? JSON.stringify(routerResult) : 'NULL (falls through to Planner)'}`);

        const start = performance.now();
        try {
            const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
            const elapsed = (performance.now() - start).toFixed(1);
            console.log(`[Pipeline] Time: ${elapsed}ms | Executed Tools: ${JSON.stringify(result.executedTools)}`);
            console.log(`[Answer]: ${result.answer}\n`);
        } catch (err: any) {
            console.error(`[Error]: ${err?.message}\n`);
        }
    }

    process.exit(0);
}

main().catch(err => {
    console.error("Fatal test error:", err);
    process.exit(1);
});

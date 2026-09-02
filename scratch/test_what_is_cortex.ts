import { cortexAgent } from '../packages/agent/graph/workflow.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    const query = "what is cortex";
    console.log(`Executing Query: "${query}"\n`);
    
    const result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });

    console.log(`Executed Tools: ${JSON.stringify(result.executedTools)}`);
    console.log('\n=== CORTEX ANSWER ===\n');
    console.log(result.answer);
    console.log('\n======================\n');

    await sql.end();
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

import { createGroqChatCompletion } from '../packages/llm/providers/groq.js';
import { buildPlannerPrompt } from '../packages/llm/prompts/planner.prompt.js';
import { getGraphSchema } from '../packages/database/neo4j/schemaCache.js';
import { TOOL_DEFINITIONS } from '../packages/agent/tools/toolDefinitions.js';

async function main() {
    const qA = "how many developers knows redis get their contact details also and why redis was replaced with valkey which date";
    
    const schema = await getGraphSchema();
    const prompt = buildPlannerPrompt(qA, schema.nodeLabels, schema.relationshipTypes);

    console.log("=== CALLING GROQ LLM PLANNER DIRECTLY FOR QUERY A ===");
    const response = await createGroqChatCompletion({
        messages: [
            {
                role: 'system',
                content: 'You are an agentic retrieval planner. Analyze the user question carefully. If the question contains compound intents or multiple sub-questions (e.g. asking for entity/count/email/role facts AND an explanation/why question, or asking for knowledge risk AND commit counts), you MUST issue multiple parallel tool calls in a single response. Never collapse two distinct information needs into a single tool call.'
            },
            { role: 'user', content: prompt }
        ],
        temperature: 0,
        tools: TOOL_DEFINITIONS as any,
        tool_choice: 'auto',
        parallel_tool_calls: true,
        max_completion_tokens: 4096,
    }, 'qwen/qwen3.6-27b');

    const msg = response.choices[0]?.message;
    console.log("LLM Raw Message:", JSON.stringify(msg, null, 2));

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

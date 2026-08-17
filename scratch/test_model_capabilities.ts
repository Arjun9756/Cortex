import { groq } from '../packages/llm/providers/groq.js';
import { TOOL_DEFINITIONS } from '../packages/agent/tools/toolDefinitions.js';

async function testModelCapabilities() {
  const models = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];

  for (const model of models) {
    console.log(`\n================ Testing ${model} ================`);
    
    // Test 1: JSON mode
    try {
      const t0 = Date.now();
      const resJson = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are an assistant. Return JSON object only: {"asks": ["..."]}.' },
          { role: 'user', content: 'Who is Priya Sharma and why was Redis replaced with Valkey?' }
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1024,
        temperature: 0,
      });
      console.log(`[${model}] JSON Mode OK (${Date.now() - t0}ms):`, resJson.choices[0]?.message?.content);
    } catch (err: any) {
      console.error(`[${model}] JSON Mode FAILED:`, err.message);
    }

    // Test 2: Native Tool Calling
    try {
      const t0 = Date.now();
      const resTools = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'Select all appropriate tools to answer the user query.' },
          { role: 'user', content: 'Who is Priya Sharma and why was Redis replaced with Valkey?' }
        ],
        tools: TOOL_DEFINITIONS as any,
        tool_choice: 'auto',
        max_completion_tokens: 2048,
        temperature: 0,
      });
      console.log(`[${model}] Tool Calling OK (${Date.now() - t0}ms): calls =`, resTools.choices[0]?.message?.tool_calls?.map(c => `${c.function.name}(${c.function.arguments})`));
    } catch (err: any) {
      console.error(`[${model}] Tool Calling FAILED:`, err.message);
    }
  }
}

testModelCapabilities().catch(console.error);

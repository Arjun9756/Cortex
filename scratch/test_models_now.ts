import { groq } from '../packages/llm/providers/groq.js';

async function testAvailable() {
    const models = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'groq/compound-mini'];
    for (const m of models) {
        try {
            console.log(`Testing model: ${m}...`);
            const res = await groq.chat.completions.create({
                model: m,
                messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
                max_completion_tokens: 20
            });
            console.log(`✅ Success for ${m}:`, res.choices[0]?.message?.content);
        } catch (e: any) {
            console.error(`❌ Failed for ${m}:`, e?.message);
        }
    }
}

testAvailable();

import { groq } from '../packages/llm/providers/groq.js';

async function testModels() {
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
    for (const m of models) {
        try {
            console.log(`Testing model: ${m}...`);
            const res = await groq.chat.completions.create({
                model: m,
                messages: [{ role: 'user', content: 'Say hello in 5 words.' }],
                max_completion_tokens: 20
            });
            console.log(`✅ Success for ${m}:`, res.choices[0]?.message?.content);
        } catch (e: any) {
            console.error(`❌ Failed for ${m}:`, e?.message);
        }
    }
}

testModels();

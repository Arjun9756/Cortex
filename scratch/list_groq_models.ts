import { groq } from '../packages/llm/providers/groq.js';

async function listModels() {
    try {
        const list = await groq.models.list();
        console.log('Available models in Groq account:');
        for (const m of list.data) {
            if (m.active) {
                console.log(`- ${m.id} (owned_by: ${m.owned_by})`);
            }
        }
    } catch (e: any) {
        console.error('Error listing models:', e?.message);
    }
}

listModels();

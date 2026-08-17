import { groq } from '../packages/llm/providers/groq.js';

async function test() {
  try {
    const models = await groq.models.list();
    console.log('Available models:', models.data.map(m => m.id));
  } catch (err: any) {
    console.error('Error listing models:', err);
  }
}
test().catch(console.error);

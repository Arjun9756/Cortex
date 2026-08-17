import { createGroqChatCompletion, PRIMARY_MODEL } from '../packages/llm/providers/groq.js';
import { getGraphSchema } from '../packages/database/neo4j/schemaCache.js';

const MASTER_QUERY = "How many total repositories and technologies are there, which repos have a bus factor of 1, what is Priya Sharma's knowledge risk and what technologies does she use, why did we replace Redis with Valkey and when, and if Arjun Kumar leaves what breaks and who's the best successor?";

async function testDecomposeAndPlan() {
  console.log('Testing Decompose and Plan for Master Query...');
  
  // 1. Decompose Query
  const decompPrompt = `You are a precision query decomposition engine.
Break down the user's input into ALL distinct, independently answerable sub-questions/asks.
Do NOT limit the number of asks. If there are 6 distinct asks, output all 6.

User Query: "${MASTER_QUERY}"

Return JSON format:
{
  "asks": [
    { "id": "ask_1", "ask": "How many total repositories and technologies are there?" },
    ...
  ]
}`;

  const t0 = Date.now();
  const decompRes = await createGroqChatCompletion({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: 'You are a query decomposer. Output JSON only: {"asks": [{"id": "ask_1", "ask": "..."}]}' },
      { role: 'user', content: decompPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_completion_tokens: 2048,
  });

  console.log(`Decomposition (${Date.now() - t0}ms):`, decompRes.choices[0]?.message?.content);
  const decomposed = JSON.parse(decompRes.choices[0]?.message?.content || '{}');
  const asks = decomposed.asks || [];
  console.log(`Identified ${asks.length} asks.`);

  // 2. Plan Tools for each ask
  const schema = await getGraphSchema();
  const planPrompt = `You are the Cortex retrieval planner. Given a list of decomposed asks from a user query, generate the exact tool calls needed to retrieve evidence for EVERY ask.

LIVE GRAPH SCHEMA:
Node Labels: [${schema.nodeLabels.join(', ')}]
Relationship Types: [${schema.relationshipTypes.join(', ')}]

AVAILABLE TOOLS:
1. graph_count_by_label: { label: "REPOSITORY" | "TECHNOLOGY" | "PERSON" } -> For counting total entities of a type
2. sql_search: { queryType: "repos_by_bus_factor", params: { threshold: 1 } } -> For repos with bus factor 1 / risk scores
3. knowledge_risk: { personName: string } -> For engineer departure/quitting risk, single points of failure, what breaks if person leaves, successor/backup
4. graph_list_nodes: { entity: string, relation?: "USES"|"WORKS_ON", targetLabel?: "TECHNOLOGY"|"REPOSITORY" } -> For technologies used by a person or repos worked on
5. graph_describe_entity: { entity: string } -> For entity details, role, email
6. vector_search: { query: string } -> For "why" architectural decisions, migration reasons (e.g. why replace Redis with Valkey and when), incidents, discussions
7. graph_dependency_analysis / graph_impact_analysis: For dependency trees / blast radius

DECOMPOSED ASKS:
${asks.map((a: any, i: number) => `${i+1}. [${a.id}]: "${a.ask}"`).join('\n')}

Plan tool calls for EVERY ask. Return JSON format:
{
  "calls": [
    { "askId": "ask_1", "tool": "graph_count_by_label", "args": { "label": "REPOSITORY" } },
    { "askId": "ask_1", "tool": "graph_count_by_label", "args": { "label": "TECHNOLOGY" } },
    ...
  ]
}`;

  const t1 = Date.now();
  const planRes = await createGroqChatCompletion({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: 'You are a retrieval planner. Return valid JSON only with a "calls" array matching every ask.' },
      { role: 'user', content: planPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_completion_tokens: 3000,
  });

  console.log(`\nPlanning (${Date.now() - t1}ms):`, planRes.choices[0]?.message?.content);
}

testDecomposeAndPlan().catch(console.error);

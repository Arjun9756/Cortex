/**
 * Builds the reflection prompt for adaptive spec revision.
 * 
 * When evidence is insufficient, this prompt gives the LLM:
 * 1. The original query
 * 2. What tool calls were executed (with their full args/specs)
 * 3. What evidence was returned
 * 4. Which tools have already been used
 * 
 * The LLM then reasons about what's MISSING and emits REVISED tool calls
 * with adjusted parameters (deeper depth, wider relations, different entity,
 * different tool entirely) — not a blind retry.
 */
export function buildReflectionPrompt(
    query: string,
    evidence: string,
    executedTools: string[],
    previousToolCalls?: Array<{ name: string; args?: any }>,
): string {
    const previousCallsBlock = previousToolCalls && previousToolCalls.length > 0
        ? `\nPrevious tool calls that produced this evidence:\n${previousToolCalls.map(c => `  - ${c.name}(${JSON.stringify(c.args || {})})`).join('\n')}\n`
        : '';

    return `
Question: "${query}"

Evidence collected so far:
${evidence}
${previousCallsBlock}
Tools already used: ${executedTools.length ? executedTools.join(', ') : 'none'}

Decide whether the evidence is sufficient to answer the user's question. Return ONLY one JSON object:

Option 1 — Evidence is sufficient:
{"action":"answer","tools":[]}

Option 2 — Need more data (emit REVISED tool calls with specific args):
{"action":"retrieve","tools":[{"name":"tool_name","args":{...}}]}

Option 3 — Query itself is ambiguous and no evidence was collected:
{"action":"clarify","question":"one concise question for the user"}

AVAILABLE TOOLS for Option 2:
- graph_describe_entity: { entity: "name" }
- graph_count_by_label: { searchTerm: "...", label: "PERSON|REPOSITORY|..." }
- graph_list_nodes: { entity: "name", targetLabel: "...", relation: "..." }
- graph_repository_summary: { repositoryName: "..." }
- graph_shortest_path: { from: "...", to: "..." }
- graph_dependency_analysis: { entity: "name" }
- graph_impact_analysis: { entity: "name" }
- graph_expertise_analysis: { entity: "name" }
- graph_count_nodes: { entity: "name", targetLabel: "...", relation: "..." }
- graph_search_candidates: { searchTerm: "...", limit: 5 }
- graph_traverse: { startEntities: [...], relations: [...], depth: { min: N, max: M }, direction: "outgoing|incoming|both", limit: 20 }
- vector_search: { query: "..." }
- sql_search: { queryType: "repo_risk|repos_by_bus_factor|...", params: {...} }
- knowledge_risk: { personName: "..." }

Rules:
- If evidence contains #KNOWLEDGE RISK DATA or #RELEVANT RELATION with entity properties, the evidence IS SUFFICIENT. Return {"action":"answer","tools":[]}.
- NEVER select "clarify" if evidence has already been retrieved from executed tools. Clarification is ONLY for when the user prompt itself is ambiguous AND no evidence was collected.
- When requesting additional tools, specify CONCRETE ARGS based on what's MISSING from the evidence. For graph_traverse, consider widening depth, adding more relation types, or changing direction if the first pass returned too few results.
- Never request a tool that was already used with the same args. Adjust parameters to get different/deeper results.
`.trim();
}

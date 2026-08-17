import { driver } from '../../../apps/api/config/neo4j.js';
import { createGroqChatCompletion } from '../../llm/providers/groq.js';
import { getGraphSchema } from '../../database/neo4j/schemaCache.js';
import { validateCypherQuery } from './cypherValidator.js';

export interface TextToCypherResult {
    cypher: string;
    isValid: boolean;
    data: any[];
    error?: string;
    clarificationNeeded?: boolean;
}

/**
 * PHASE 5: Text-to-Cypher Engine (Experimental)
 * Generates Cypher from natural language, validates AST & live schema, and executes safely.
 */
export async function executeTextToCypher(userQuery: string): Promise<TextToCypherResult> {
    const schema = await getGraphSchema();
    const prompt = `
You are a Neo4j Cypher generation engine.

LIVE GRAPH SCHEMA:
- Node Labels: ${schema.nodeLabels.join(', ') || 'PERSON, REPOSITORY, TECHNOLOGY, COMMIT, ISSUE, PULL_REQUEST'}
- Relationship Types: ${schema.relationshipTypes.join(', ') || 'AUTHORED, USES, DEPENDS_ON, PART_OF, WORKS_ON'}

RULES:
1. Generate READ-ONLY Cypher queries ONLY (MATCH / RETURN).
2. DO NOT use CREATE, DELETE, SET, REMOVE, MERGE, or APOC procedures.
3. Use toLower() for string comparisons.
4. Output JSON ONLY: { "cypher": "MATCH ... RETURN ..." }

User Question: "${userQuery}"
`;

    try {
        const response = await createGroqChatCompletion({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        const cypher = parsed?.cypher || '';

        // 1. Validate AST & Schema
        const validation = await validateCypherQuery(cypher);
        if (!validation.isValid) {
            return {
                cypher,
                isValid: false,
                data: [],
                ...(validation.reason ? { error: validation.reason } : {}),
                clarificationNeeded: (validation.unknownLabels?.length ?? 0) > 0 || (validation.unknownRelations?.length ?? 0) > 0
            };
        }

        // 2. Execute Read-Only Cypher Safely in Neo4j
        const session = driver.session();
        try {
            const result = await session.run(cypher);
            const data = result.records.map(record => record.toObject());
            return {
                cypher,
                isValid: true,
                data
            };
        } finally {
            await session.close();
        }

    } catch (err: any) {
        return {
            cypher: '',
            isValid: false,
            data: [],
            error: `Cypher execution error: ${err?.message}`
        };
    }
}

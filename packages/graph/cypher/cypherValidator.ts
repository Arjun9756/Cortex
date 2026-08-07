import { getGraphSchema } from '../../database/neo4j/schemaCache.js';

export interface CypherValidationResult {
    isValid: boolean;
    reason?: string;
    unknownLabels?: string[];
    unknownRelations?: string[];
}

/**
 * PHASE 5: AST Guardrail & Schema Validator for Text-to-Cypher.
 * Enforces Read-Only Queries ONLY and validates labels/relations against live Neo4j schema.
 */
export async function validateCypherQuery(cypher: string): Promise<CypherValidationResult> {
    if (!cypher || typeof cypher !== 'string') {
        return { isValid: false, reason: 'Cypher query must be a non-empty string.' };
    }

    const cleanCypher = cypher.trim();

    // 1. Strict Read-Only AST Guardrail Check
    const writeKeywords = /\b(CREATE|DELETE|SET|REMOVE|MERGE|DROP|DETACH|ALTER|TRUNCATE)\b/i;
    const procedureWrites = /\b(apoc\.create|apoc\.refactor|apoc\.periodic|dbms\.)\b/i;

    if (writeKeywords.test(cleanCypher) || procedureWrites.test(cleanCypher)) {
        return {
            isValid: false,
            reason: 'Security Violation: Write, mutation, or APOC procedures are prohibited. Read-only queries only.'
        };
    }

    // Must start with MATCH or OPTIONAL MATCH or RETURN or WITH
    if (!/^\s*(MATCH|OPTIONAL\s+MATCH|WITH|RETURN)\b/i.test(cleanCypher)) {
        return {
            isValid: false,
            reason: 'Invalid Cypher: Read-only query must start with MATCH, OPTIONAL MATCH, WITH, or RETURN.'
        };
    }

    // 2. Validate Labels & Relationships against Live Neo4j Schema
    try {
        const schema = await getGraphSchema();
        const validLabelsLower = new Set(schema.nodeLabels.map(l => l.toLowerCase()));
        const validRelationsLower = new Set(schema.relationshipTypes.map(r => r.toLowerCase()));

        // Extract labels (:LABEL)
        const labelMatches = cleanCypher.match(/:\s*([A-Za-z0-9_]+)/g) || [];
        const extractedTokens = labelMatches.map(m => m.replace(/^:\s*/, ''));

        const unknownLabels: string[] = [];
        const unknownRelations: string[] = [];

        for (const token of extractedTokens) {
            const tokenLower = token.toLowerCase();
            const isLabel = schema.nodeLabels.some(l => l.toLowerCase() === tokenLower);
            const isRelation = schema.relationshipTypes.some(r => r.toLowerCase() === tokenLower);

            if (!isLabel && !isRelation) {
                // If it's capitalized like A_B, check relation vs label
                if (token === token.toUpperCase()) {
                    unknownRelations.push(token);
                } else {
                    unknownLabels.push(token);
                }
            }
        }

        if (unknownLabels.length > 0 || unknownRelations.length > 0) {
            return {
                isValid: false,
                reason: `Query contains unknown schema elements: labels [${unknownLabels.join(', ')}], relations [${unknownRelations.join(', ')}].`,
                unknownLabels,
                unknownRelations
            };
        }
    } catch (schemaErr: any) {
        console.warn(`[CypherValidator] Schema fetch warning: ${schemaErr?.message}`);
    }

    return { isValid: true };
}

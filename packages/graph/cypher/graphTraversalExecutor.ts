import { driver } from '../../../apps/api/config/neo4j.js'
import { getGraphSchema } from '../../database/neo4j/schemaCache.js'
import type { GraphTraversalSpecType } from '../../agent/tools/schemas.js'

/**
 * Injection-safety regex for node labels and relationship types.
 * Cypher does not support parameterized labels/relations, so we validate
 * against alphanumeric/underscore identifiers to prevent injection.
 */
const SAFE_IDENTIFIER_REGEX = /^[A-Za-z0-9_]+$/;

export interface TraversalResult {
    nodes: Array<{ name: string; type: string; properties?: Record<string, any> }>;
    edges: Array<{ from: string; to: string; relation: string }>;
    truncated: boolean;
}

/**
 * Validates that all labels and relations in the spec exist in the live schema
 * and pass the injection-safety regex. Returns a list of errors (empty = valid).
 */
async function validateSpecAgainstSchema(
    spec: GraphTraversalSpecType
): Promise<{ validRelations: string[]; validLabels: string[]; errors: string[] }> {
    const errors: string[] = [];
    let validRelations: string[] = [];
    let validLabels: string[] = [];

    try {
        const schema = await getGraphSchema();
        const schemaRelationsLower = new Set(schema.relationshipTypes.map(r => r.toLowerCase()));
        const schemaLabelsLower = new Set(schema.nodeLabels.map(l => l.toLowerCase()));

        // Validate and filter relations
        for (const rel of spec.relations) {
            if (!SAFE_IDENTIFIER_REGEX.test(rel)) {
                errors.push(`Unsafe relation identifier rejected: "${rel}"`);
                continue;
            }
            if (schemaRelationsLower.has(rel.toLowerCase())) {
                // Use the casing from the schema for consistency
                const canonical = schema.relationshipTypes.find(r => r.toLowerCase() === rel.toLowerCase());
                validRelations.push(canonical || rel);
            } else {
                errors.push(`Unknown relation type "${rel}" not in schema. Available: [${schema.relationshipTypes.join(', ')}]`);
            }
        }

        // Validate and filter target labels
        for (const label of spec.targetLabels) {
            if (!SAFE_IDENTIFIER_REGEX.test(label)) {
                errors.push(`Unsafe label identifier rejected: "${label}"`);
                continue;
            }
            if (schemaLabelsLower.has(label.toLowerCase())) {
                const canonical = schema.nodeLabels.find(l => l.toLowerCase() === label.toLowerCase());
                validLabels.push(canonical || label);
            } else {
                errors.push(`Unknown label "${label}" not in schema. Available: [${schema.nodeLabels.join(', ')}]`);
            }
        }
    } catch (schemaErr: any) {
        console.warn(`[GraphTraversal] Schema validation skipped: ${schemaErr?.message}`);
        // If schema unavailable, still enforce identifier safety
        validRelations = spec.relations.filter(r => SAFE_IDENTIFIER_REGEX.test(r));
        validLabels = spec.targetLabels.filter(l => SAFE_IDENTIFIER_REGEX.test(l));
    }

    return { validRelations, validLabels, errors };
}

/**
 * Builds a parameterized Cypher query from a GraphTraversalSpec.
 * This is a PURE MECHANICAL TRANSLATOR — it does zero interpretation.
 * All semantic decisions (which relations, what depth, which direction)
 * were already made by the LLM planner.
 */
function buildTraversalCypher(
    spec: GraphTraversalSpecType,
    validRelations: string[],
    validLabels: string[],
): { cypher: string; params: Record<string, any> } {
    const depthMin = spec.depth.min;
    const depthMax = spec.depth.max;
    const limit = spec.limit;

    // Build relationship pattern
    let relPattern = '';
    if (validRelations.length > 0) {
        relPattern = `:${validRelations.join('|')}`;
    }

    // Build direction arrows
    let leftArrow = '-';
    let rightArrow = '-';
    if (spec.direction === 'outgoing') {
        rightArrow = '->';
    } else if (spec.direction === 'incoming') {
        leftArrow = '<-';
    }

    // Build target label filter
    let labelFilter = '';
    if (validLabels.length > 0) {
        // Check ALL target labels with OR logic
        const labelConditions = validLabels.map(l => `"${l}" IN labels(target)`).join(' OR ');
        labelFilter = `AND (${labelConditions})`;
    }

    const cypher = `
        MATCH (start)
        WHERE toLower(start.name) = toLower($entityName)
        MATCH path = (start)${leftArrow}[r${relPattern}*${depthMin}..${depthMax}]${rightArrow}(target)
        WHERE target <> start
        ${labelFilter}
        WITH DISTINCT target, 
             [node IN nodes(path) | { name: node.name, type: labels(node)[0] }] AS pathNodes,
             [edge IN relationships(path) | { from: startNode(edge).name, to: endNode(edge).name, relation: type(edge) }] AS pathEdges
        RETURN target.name AS name, labels(target)[0] AS type, properties(target) AS properties,
               pathNodes, pathEdges
        LIMIT $limit
    `.trim();

    return { cypher, params: { entityName: '', limit } };
}

/**
 * Executes a GraphTraversalSpec against Neo4j.
 * Resolves each start entity and runs the traversal, aggregating results.
 */
export async function executeGraphTraversal(spec: GraphTraversalSpecType): Promise<TraversalResult> {
    const { validRelations, validLabels, errors } = await validateSpecAgainstSchema(spec);

    if (errors.length > 0) {
        console.warn(`[GraphTraversal] Schema validation warnings: ${errors.join('; ')}`);
    }

    const allNodes: TraversalResult['nodes'] = [];
    const allEdges: TraversalResult['edges'] = [];
    const seenNodeNames = new Set<string>();
    let truncated = false;

    const { cypher, params } = buildTraversalCypher(spec, validRelations, validLabels);

    for (const entityName of spec.startEntities) {
        const session = driver.session();
        try {
            console.log(`[GraphTraversal] Executing traversal from "${entityName}" | relations=[${validRelations.join(',')}] | depth=${spec.depth.min}..${spec.depth.max} | direction=${spec.direction} | limit=${spec.limit}`);
            const result = await session.run(cypher, { ...params, entityName });

            for (const record of result.records) {
                const name = record.get('name');
                if (name && !seenNodeNames.has(name)) {
                    seenNodeNames.add(name);
                    allNodes.push({
                        name,
                        type: record.get('type') || 'UNKNOWN',
                        properties: record.get('properties') || {},
                    });
                }

                const pathEdges = record.get('pathEdges') || [];
                for (const edge of pathEdges) {
                    if (edge.from && edge.to && edge.relation) {
                        allEdges.push({
                            from: edge.from,
                            to: edge.to,
                            relation: edge.relation,
                        });
                    }
                }
            }

            if (result.records.length >= spec.limit) {
                truncated = true;
            }
        } catch (err: any) {
            console.error(`[GraphTraversal] Cypher execution error for entity "${entityName}": ${err?.message}`);
        } finally {
            await session.close();
        }
    }

    // Deduplicate edges
    const edgeSet = new Set<string>();
    const uniqueEdges = allEdges.filter(e => {
        const key = `${e.from}|${e.relation}|${e.to}`;
        if (edgeSet.has(key)) return false;
        edgeSet.add(key);
        return true;
    });

    console.log(`[GraphTraversal] Result: ${allNodes.length} nodes, ${uniqueEdges.length} edges, truncated=${truncated}`);
    return { nodes: allNodes, edges: uniqueEdges, truncated };
}

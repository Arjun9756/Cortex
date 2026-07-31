import { driver } from '../../apps/api/config/neo4j.js'
import neo4j from 'neo4j-driver'
import { getGraphSchema } from '../database/neo4j/schemaCache.js'
import { groq, createGroqChatCompletion } from '../llm/providers/groq.js'
import { buildKnowledgeRiskPrompt } from '../llm/prompts/knowledgeRisk.prompt.js'
import { calculateActivity, calculateDependency, calculateExpertise, calculateDocumentation, calculateOwnership, calculatePendingWork } from './knowledge.risk.predict.js'

export interface KnowledgeRiskScore {
    person: string
    totalRisk: number
    breakdown: {
        ownership: number
        dependency: number
        activity: number
        documentation: number
        expertise: number
        pendingWork: number
    }
    details: {
        ownedItems: number
        criticalDependencies: number
        recentActivity: number
        documentationGaps: number
        uniqueSkills: number
        assignedWork: number
    }
    evidence: {
        ownership: Array<{ name: string; type: string; createdAt?: string | undefined }>
        dependency: Array<{ name: string; type: string; dependsOn: string }>
        activity: Array<{ name: string; type: string; timestamp: string | null }>
        documentation: Array<{ name: string; type: string; issue: string }>
        expertise: Array<{ name: string; type: string; reason: string }>
        pendingWork: Array<{ name: string; type: string; status?: string | undefined }>
    }
}

interface RelationMapping {
    ownership: { relation: string | null; targetLabel: string | null }
    dependency: { relation: string | null; targetLabel: string | null }
    activity: { relation: string | null; targetLabel: string | null }
    documentation: { relation: string | null; targetLabel: string | null }
    expertise: { relation: string | null; targetLabel: string | null }
    pendingWork: { relation: string | null; targetLabel: string | null }
}

let relationMappingCache: RelationMapping | null = null
let relationMappingCacheAt = 0
const RELATION_MAPPING_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Calculate knowledge risk for a person using weighted formula:
 * Knowledge Risk = 0.30 × Ownership + 0.20 × Dependency + 0.15 × Activity +
 *                  0.15 × Documentation + 0.10 × Expertise + 0.10 × Pending Work
 *
 * Returns totalRisk on a 0–1 scale. Callers that store as a percentage
 * must multiply by 100 before writing to Postgres risk_score column.
 */
export async function calculateKnowledgeRisk(personName: string): Promise<KnowledgeRiskScore> {
    // Get schema and relation mappings once
    const t0 = Date.now();
    console.log(`[KnowledgeRisk:Timing] Starting calculateKnowledgeRisk for: ${personName}`);

    const tSchema0 = Date.now();
    const schema = await getGraphSchema()
    const mappings = await getRelationMappings(schema.nodeLabels, schema.relationshipTypes)
    console.log(`[KnowledgeRisk:Timing] Schema + RelationMapping: ${Date.now() - tSchema0}ms`);

    // Fix 1: Run all 6 risk factor calculations in parallel (each has its own Neo4j session)
    const tCalc0 = Date.now();
    const [ownership, dependency, activity, documentation, expertise, pendingWork] = await Promise.all([
        calculateOwnership(personName, mappings.ownership, schema.relationshipTypes),
        calculateDependency(personName, mappings.dependency, schema.relationshipTypes),
        calculateActivity(personName, mappings.activity, schema.relationshipTypes),
        calculateDocumentation(personName, mappings.documentation, schema.relationshipTypes),
        calculateExpertise(personName, mappings.expertise, schema.relationshipTypes),
        calculatePendingWork(personName, mappings.pendingWork, schema.relationshipTypes),
    ])
    console.log(`[KnowledgeRisk:Timing] Parallel component calculations: ${Date.now() - tCalc0}ms`);

    // Apply weighted formula — component scores are 0–1, totalRisk is 0–1
    const totalRisk =
        0.30 * ownership.score +
        0.20 * dependency.score +
        0.15 * activity.score +
        0.15 * documentation.score +
        0.10 * expertise.score +
        0.10 * pendingWork.score

    const result = {
        person: personName,
        totalRisk: Math.round(totalRisk * 100) / 100,   // 0–1, 2 decimal places
        breakdown: {
            ownership: Math.round(ownership.score * 10 * 100) / 100,
            dependency: Math.round(dependency.score * 10 * 100) / 100,
            activity: Math.round(activity.score * 10 * 100) / 100,
            documentation: Math.round(documentation.score * 10 * 100) / 100,
            expertise: Math.round(expertise.score * 10 * 100) / 100,
            pendingWork: Math.round(pendingWork.score * 10 * 100) / 100
        },
        details: {
            ownedItems: ownership.count,
            criticalDependencies: dependency.count,
            recentActivity: activity.count,
            documentationGaps: documentation.count,
            uniqueSkills: expertise.count,
            assignedWork: pendingWork.count
        },
        evidence: {
            ownership: ownership.evidence,
            dependency: dependency.evidence,
            activity: activity.evidence,
            documentation: documentation.evidence,
            expertise: expertise.evidence,
            pendingWork: pendingWork.evidence
        }
    };
    console.log(`[KnowledgeRisk:Timing] Total calculateKnowledgeRisk: ${Date.now() - t0}ms`);
    return result;
}

/**
 * Get relation mappings from LLM.
 * Safe fallback guarantees ownership, activity, expertise, and documentation mappings
 * are never left null if relations exist in the graph.
 */
async function getRelationMappings(nodeLabels: string[], relationships: string[]): Promise<RelationMapping> {
    const defaultMappings: RelationMapping = {
        ownership: { relation: relationships.includes('AUTHORED') ? 'AUTHORED' : null, targetLabel: nodeLabels.includes('COMMIT') ? 'COMMIT' : null },
        dependency: { relation: relationships.includes('USES') ? 'USES' : null, targetLabel: nodeLabels.includes('REPOSITORY') ? 'REPOSITORY' : null },
        activity: { relation: relationships.includes('AUTHORED') ? 'AUTHORED' : null, targetLabel: nodeLabels.includes('COMMIT') ? 'COMMIT' : null },
        documentation: { relation: relationships.includes('AUTHORED') ? 'AUTHORED' : null, targetLabel: nodeLabels.includes('FILE') ? 'FILE' : null },
        expertise: { relation: relationships.includes('AUTHORED') ? 'AUTHORED' : null, targetLabel: nodeLabels.includes('COMMIT') ? 'COMMIT' : null },
        pendingWork: { relation: relationships.includes('AUTHORED') ? 'AUTHORED' : null, targetLabel: nodeLabels.includes('ISSUE') ? 'ISSUE' : null },
    };

    const now = Date.now()
    if (relationMappingCache && (now - relationMappingCacheAt) < RELATION_MAPPING_TTL) {
        console.log('[Knowledge Risk] Using cached relation mappings')
        return relationMappingCache
    }

    const prompt = buildKnowledgeRiskPrompt(nodeLabels, relationships)

    try {
        const response = await createGroqChatCompletion({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            response_format: { type: "json_object" }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new Error('Empty response from LLM')
        }

        const parsed = JSON.parse(content) as RelationMapping;

        relationMappingCache = {
            ownership: (parsed.ownership?.relation) ? parsed.ownership : defaultMappings.ownership,
            dependency: (parsed.dependency?.relation) ? parsed.dependency : defaultMappings.dependency,
            activity: (parsed.activity?.relation) ? parsed.activity : defaultMappings.activity,
            documentation: (parsed.documentation?.relation) ? parsed.documentation : defaultMappings.documentation,
            expertise: (parsed.expertise?.relation) ? parsed.expertise : defaultMappings.expertise,
            pendingWork: (parsed.pendingWork?.relation) ? parsed.pendingWork : defaultMappings.pendingWork,
        };

        relationMappingCacheAt = now
        console.log('[Knowledge Risk] Relation mappings refreshed:', relationMappingCache)

        return relationMappingCache

    } catch (error: any) {
        console.error('[Knowledge Risk] Failed to get relation mappings:', error.message)
        if (relationMappingCache) {
            console.warn('[Knowledge Risk] Using stale relation mapping cache as fallback')
            return relationMappingCache
        }
        return defaultMappings;
    }
}
import { driver } from '../../apps/api/config/neo4j.js'
import neo4j from 'neo4j-driver'
import { getGraphSchema } from '../database/neo4j/schemaCache.js'
import { groq } from '../llm/providers/groq.js'
import { buildKnowledgeRiskPrompt } from '../llm/prompts/knowledgeRisk.prompt.js'
import { calculateActivity , calculateDependency , calculateExpertise , calculateDocumentation , calculateOwnership , calculatePendingWork } from './knowledge.risk.predict.js'

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
        ownership: Array<{name: string, type: string, createdAt?: number | undefined}>
        dependency: Array<{name: string, type: string, dependsOn: string}>
        activity: Array<{name: string, type: string, timestamp: number}>
        documentation: Array<{name: string, type: string, issue: string}>
        expertise: Array<{name: string, type: string, reason: string}>
        pendingWork: Array<{name: string, type: string, status?: string | undefined}>
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

/**
 * Calculate knowledge risk for a person using weighted formula:
 * Knowledge Risk = 0.30 × Ownership + 0.20 × Dependency + 0.15 × Activity +
 *                  0.15 × Documentation + 0.10 × Expertise + 0.10 × Pending Work
 */
export async function calculateKnowledgeRisk(personName: string): Promise<KnowledgeRiskScore> {
    // Get schema and relation mappings once
    const schema = await getGraphSchema()
    const mappings = await getRelationMappings(schema.nodeLabels, schema.relationshipTypes)

    // Calculate all 6 risk factors
    const ownership = await calculateOwnership(personName, mappings.ownership, schema.relationshipTypes)
    const dependency = await calculateDependency(personName, mappings.dependency, schema.relationshipTypes)
    const activity = await calculateActivity(personName, mappings.activity, schema.relationshipTypes)
    const documentation = await calculateDocumentation(personName, mappings.documentation, schema.relationshipTypes)
    const expertise = await calculateExpertise(personName, mappings.expertise, schema.relationshipTypes)
    const pendingWork = await calculatePendingWork(personName, mappings.pendingWork, schema.relationshipTypes)

    // Apply weighted formula (normalized to 0-10 scale)
    const totalRisk =
        0.30 * ownership.score +
        0.20 * dependency.score +
        0.15 * activity.score +
        0.15 * documentation.score +
        0.10 * expertise.score +
        0.10 * pendingWork.score

    return {
        person: personName,
        totalRisk: Math.round(totalRisk * 100) / 100,
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
    }
}

/**
 * Get relation mappings from LLM (cached)
 */
async function getRelationMappings(nodeLabels: string[], relationships: string[]): Promise<RelationMapping> {
    if (relationMappingCache) {
        console.log('[Knowledge Risk] Using cached relation mappings')
        return relationMappingCache
    }

    const prompt = buildKnowledgeRiskPrompt(nodeLabels, relationships)

    try {
        const response = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            messages:[{role:'user' , content:prompt}],
            temperature: 0,
            response_format: { type: "json_object" }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new Error('Empty response from LLM')
        }

        relationMappingCache = JSON.parse(content)
        console.log('[Knowledge Risk] Relation mappings:', relationMappingCache)

        return relationMappingCache!

    } catch (error: any) {
        console.error('[Knowledge Risk] Failed to get relation mappings:', error.message)
        throw error
    }
}
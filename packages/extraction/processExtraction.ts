import { resolveEntity, isCommitEntity } from "./entityResolver.js";
import { upsertEntity, upsertRelation, batchUpsertRelations } from "../database/neo4j/graph.repository.js";
import { driver } from "../../apps/api/config/neo4j.js";

export interface PersonMetadata {
    name: string
    email?: string | null
    role?: string | null
    externalId?: string | null
    canonicalPersonId?: string | null
    isBot?: boolean
}

export interface EntityMetadata {
    name: string
    properties: Record<string, any>
}

/**
 * Saves LLM-extracted entities + relationships to the Neo4j graph.
 * P0-2: Opens a SINGLE Neo4j session per event and batches entity and relationship upserts.
 *
 * @param entities        Entities with known types
 * @param newEntities     Entities with suggested types
 * @param relation        Relationships with confirmed types
 * @param newRelations    Relationships with suggested types
 * @param personMetadata  Optional list of { name, email, role, externalId, canonicalPersonId } for PERSON nodes.
 *                        Built from normalized webhook payload's author fields and identity resolution.
 *                        Only non-null values are written — never overwrites good data with null.
 * @param entityMetadata  Optional list of { name, properties } for non-PERSON entities (e.g. ISSUE/PR status).
 */
export async function saveExtractionToGraph(
    entities:{name:string , type:string}[],
    newEntities:{name:string , suggestedType:string}[],
    relation:{from:string , to:string , type:string , evidence:string}[],
    newRelations:{from:string , to:string , suggestedType:string , evidence?:string}[],
    personMetadata?: PersonMetadata[],
    entityMetadata?: EntityMetadata[],
    options?: { sourceEventId?: string; confidence?: number }
) {
    // Build extraPropertiesMap from personMetadata — only include non-null values
    const extraPropertiesMap: Record<string, Record<string, any>> = {}
    if (personMetadata) {
        for (const person of personMetadata) {
            const extras: Record<string, any> = {}
            if (person.email != null) extras.email = person.email
            if (person.role != null) extras.role = person.role
            if (person.externalId != null) extras.externalId = person.externalId
            if (person.canonicalPersonId != null) extras.canonicalPersonId = person.canonicalPersonId
            if (person.isBot != null) extras.isBot = person.isBot
            if (Object.keys(extras).length > 0) {
                extraPropertiesMap[person.name] = extras
            }
        }
    }

    if (entityMetadata) {
        for (const em of entityMetadata) {
            if (em.name && em.properties) {
                extraPropertiesMap[em.name] = {
                    ...(extraPropertiesMap[em.name] || {}),
                    ...em.properties
                }
            }
        }
    }

    // P0-2: Open exactly ONE Neo4j session for the entire event extraction
    const session = driver.session()
    try {
        // 1. Entities Resolve + Insert in this session
        const idMap = await resolveEntity(entities, newEntities, extraPropertiesMap, session)

        // 2. Relation Combine
        const allRelations = [
            ...relation,
            ...newRelations.map((r) => {
                return { from: r.from, to: r.to, type: r.suggestedType, evidence: r.evidence, properties: (r as any).properties }
            })
        ]

        const preparedRelations: Array<{
            fromID: string;
            toID: string;
            type: string;
            evidence?: string | undefined;
            metadata?: any;
        }> = []

        for (const rel of allRelations) {
            // Defense-in-depth: drop any relations referencing commit names, aliases, or hashes
            if (isCommitEntity(rel.from) || isCommitEntity(rel.to)) {
                continue
            }

            const fromID = idMap[rel.from]
            const toID = idMap[rel.to]

            if (!fromID || !toID) {
                continue
            }

            preparedRelations.push({
                fromID,
                toID,
                type: rel.type,
                evidence: rel.evidence,
                metadata: {
                    sourceEventId: options?.sourceEventId ?? null,
                    confidence: options?.confidence ?? 1.0,
                    commitCount: (rel as any).commitCount ?? (rel as any).properties?.commitCount,
                    lastCommitAt: (rel as any).lastCommitAt ?? (rel as any).properties?.lastCommitAt,
                    properties: (rel as any).properties
                }
            })
        }

        // 3. Batch upsert relations with UNWIND in the single session
        if (preparedRelations.length > 0) {
            await batchUpsertRelations(preparedRelations, session)
        }
    } finally {
        await session.close()
    }
}

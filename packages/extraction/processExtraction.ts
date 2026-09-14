import { resolveEntity } from "./entityResolver.js";
import { upsertEntity , upsertRelation } from "../database/neo4j/graph.repository.js";

export interface PersonMetadata {
    name: string
    email?: string | null
    role?: string | null
    externalId?: string | null
    canonicalPersonId?: string | null
}

export interface EntityMetadata {
    name: string
    properties: Record<string, any>
}

/**
 * Saves LLM-extracted entities + relationships to the Neo4j graph.
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

    // 1. Entities Resolve + Insert
    const idMap = await resolveEntity(entities, newEntities, extraPropertiesMap)

    // 2.Relation Combine
    const allRelations = [
        ...relation,
        ...newRelations.map((r)=>{
            return {from:r.from , to:r.to , type:r.suggestedType , evidence:r.evidence}
        })
    ]

    for(const rel of allRelations){
        const fromID = idMap[rel.from]
        const toID = idMap[rel.to]

        if(!fromID || !toID){
            console.warn('Skipping Relation - Entity Not Found in Graph Database')
            continue
        }

        await upsertRelation(fromID , toID , rel.type , rel.evidence, {
            sourceEventId: options?.sourceEventId,
            confidence: options?.confidence ?? 1.0
        })
    }
}
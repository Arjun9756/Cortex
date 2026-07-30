import { resolveEntity } from "./entityResolver.js";
import { upsertEntity , upsertRelation } from "../database/neo4j/graph.repository.js";

export interface PersonMetadata {
    name: string
    email?: string | null
    role?: string | null
}

/**
 * Saves LLM-extracted entities + relationships to the Neo4j graph.
 *
 * @param entities        Entities with known types
 * @param newEntities     Entities with suggested types
 * @param relation        Relationships with confirmed types
 * @param newRelations    Relationships with suggested types
 * @param personMetadata  Optional list of { name, email, role } for PERSON nodes.
 *                        Built from normalized webhook payload's author fields.
 *                        Only non-null values are written — never overwrites good data with null.
 */
export async function saveExtractionToGraph(
    entities:{name:string , type:string}[],
    newEntities:{name:string , suggestedType:string}[],
    relation:{from:string , to:string , type:string , evidence:string}[],
    newRelations:{from:string , to:string , suggestedType:string , evidence?:string}[],
    personMetadata?: PersonMetadata[]
) {
    // Build extraPropertiesMap from personMetadata — only include non-null values
    const extraPropertiesMap: Record<string, Record<string, any>> = {}
    if (personMetadata) {
        for (const person of personMetadata) {
            const extras: Record<string, any> = {}
            if (person.email != null) extras.email = person.email
            if (person.role != null) extras.role = person.role
            if (Object.keys(extras).length > 0) {
                extraPropertiesMap[person.name] = extras
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

        await upsertRelation(fromID , toID , rel.type , rel.evidence)
    }
}
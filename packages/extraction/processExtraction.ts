import { resolveEntity } from "./entityResolver.js";
import { upsertEntity , upsertRelation } from "../database/neo4j/graph.repository.js";

export async function saveExtractionToGraph(entities:{name:string , type:string}[] , newEntities:{name:string , suggestedType:string}[] , 
    relation:{from:string , to:string , type:string , evidence:string}[] , 
    newRelations:{from:string , to:string , suggestedType:string , evidence?:string}[]
){
    // 1. Entities Resolve + Insert
    const idMap = await resolveEntity(entities , newEntities)

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
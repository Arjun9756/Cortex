import {driver } from '../../../apps/api/config/neo4j.js'

/**
 * 
 * @param name string
 * @param type string
 * @returns {Promise<string>} uniqueID
 */
export async function upsertEntity(name:string , type:string){
    const session = driver.session()
    try{
        const result = await session.run(`
            MERGE (e:${type} {name:$name)
            ON CREATE SET e.createdAt = timestamp()
            ON MATCH SET u.updateAT = timestamp()
            RETURN elementId(e) as id
        ` , {name})

        return result.records[0]?.get("id")
    }
    catch(error:any){
        console.log(`Error While Upsert of Entity in Graph ${error?.message}`)
    }
    finally{
        await session.close()
    }
}

export async function upsertRelation(fromID:string , toID:string , type:string , evidence?:string){
    const session = driver.session()
    try{
        const result = await session.run(`
            MATCH (a) where elementId(a) = $fromID
            MATCH(b) where elementId(b) = $toID
            MERGE (a)-[r:${type}]->(b)
            ON CREATE SET r.createdAt = timestamp(), r.evidence = $evidence
            ON MATCH SET r.createdAt = timestamp()
        ` , {fromID , toID , evidence:evidence ?? null})
    }
    catch(error:any){
        console.log(`Error While Upsert of Relation in Graph ${error?.message}`)
    }
    finally{
        await session.close()
    }
}

export async function getUsedRelationship(){
    const session = driver.session()
    try{
        const result = await session.run(`CALL db.relationshipTypes()`)
        return result.records.map((r)=>{
            return r.get('relationshipType')
        })
    }
    catch(error:any){
        console.log(`Error While Fetching Relationships From Neo4j ${error.message}`)
    }
    finally{
        await session.close()
    }
}

/**
 * Current Graph RAG Contains an Problem let say the graph contains 1000+ entity and relation so all must not be throw to the LLM model blindly
 * Because it has its own context and limited memory for a larger industry it becomes an problem solution comes up with Vector Based RAG model
 * just extract entity and relation from llm and search for top K results in vector db and put it onto your reuslt
 */

export async function getExistingEntityName(limit:number=50){
    const session = driver.session()
    try{
        const result = await session.run(`
            MATCH (e) RETURN e.name as name , labels(e)[0] as type LIMIT $limit
        ` , {limit})

        return result.records.map((e)=>{
            return {name:e.get('name') , type:e.get('type')}
        })
    }
    catch(error:any){
        console.log(`Error While Fetching Relationships From Neo4j ${error.message}`)
    }
    finally{
        await session.close()
    }
}
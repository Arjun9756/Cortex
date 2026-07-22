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
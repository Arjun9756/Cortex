import { AgentStateType } from "../state.js";
import { driver } from "../../../../apps/api/config/neo4j.js";

export async function graphNode(state:AgentStateType):Promise<Partial<AgentStateType>>{
    const pendingTools = state.pendingTools.filter((tool) => tool !== 'graph_search')
    const executedTools = [...new Set([...state.executedTools, 'graph_search'])]
    const session = driver.session()
    try{
        const entityName = new Set<string>
        state.vectorResult.forEach((r:any)=>{
            (r.entities ?? []).forEach((e:any)=>{
                entityName.add(e.name)
            })
        })

        if(entityName.size === 0)
            return { graphResult: [], pendingTools, executedTools }
        
        const result = await session.run(`
            MATCH (e) WHERE e.name IN $names
            OPTIONAL MATCH (e)-[r]-(connected)
            RETURN e.name as name , type(r) as relation , connected.name as connectedTo
        ` , {names:Array.from(entityName)})
    
        const graphResult = result.records.map((item)=>({
            name:item.get('name'),
            relation:item.get('relation'),
            connectedTo:item.get('connectedTo')
        }))

        return { graphResult, pendingTools, executedTools }
    }   
    finally{
        await session.close()
    }
}

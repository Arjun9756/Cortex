type ExtractedEntity = {
    name:string,
    type:string
}

type NewEntities = {
    name:string,
    suggestedType:string
}

export async function resolveEntity(entities:ExtractedEntity[] , newEntity:NewEntities[]){
    const allEntities = [...entities , ...newEntity.map((e)=>{
        return {name:e.name , type:e.suggestedType}
    })]

    const idMap:Record<string,string> = {}
    for(const entity of allEntities){
        try{
            const realID=2
        }
        catch(error:any){
            console.log(`Error While Inserting Node in Graph DB ${error?.message}`)
        }
    }
}
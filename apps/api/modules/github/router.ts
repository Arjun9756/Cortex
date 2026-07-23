import {Router} from 'express'
import { validateGithubSignature } from './validator.js'
import {parseGithubEvent , IParsedGithubEvent} from './normalize.js'
import { pushGithubEventToDatabase } from './controller.js'
export const githubRouter = Router()

githubRouter.post('/webhook' , async (req , res)=>{
    
    // 1.Extract Github Signature For Validation
    const signature = req.headers['x-hub-signature-256'] as string
    const deliveryID = req.headers['x-github-delivery'] as string
    const eventType = req.headers['x-github-event'] as string

    // 2. Verify Github Signature With Crypto Moduel
    if(!validateGithubSignature(signature , req.rawBody)){
        console.error(`[Security] Invalid Signature For Delivery ID ${deliveryID}`)
        return res.status(403).json({error:"Forbidden: Invalid Signature"})
    }

    const parsedEvent:IParsedGithubEvent | null = parseGithubEvent(eventType , deliveryID , req.body)
    try{
        if(parsedEvent == null){
            return res.status(501).json({
                error:"Not Able To Parse Github Payload"
            })
        }

        // 3. Currently Directly Push To PostgreSQL Server Furture Include BullMQ Workers To Proceed Same
        await pushGithubEventToDatabase(parsedEvent)
        console.log(`${deliveryID} Github Webhook Saved To Database`)

        // 4. Push Current Event To Kafka For Proceeding To LLM Neo4j VectorDB and Knowledge Graph Currently Handle By BullMQ

        return res.status(200).json({
            status:true
        })
    }
    catch(error:any){
        console.error(error?.message || "Error While Pushing Github Event To PostgreSQL Server")
        return res.status(501).json({
            error:"Internal Server Error of Cortex"
        })
    }
})
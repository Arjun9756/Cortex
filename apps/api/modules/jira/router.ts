import {Router} from 'express'
import { validateJiraSignature } from './validator.js'
import { IJiraParsedEvent, parsedJiraEvent } from './normalize.js'
import { pushJiraEventToDatabase } from './controller.js'
export const jiraRouter = Router()

jiraRouter.post('/webhook' , async (req,res)=>{
    if(!validateJiraSignature(req)){
        console.error("[Security] Invalid Jira Webhook Secret")
        return res.status(403).json({error:"Forbidden: Invalid Signature"})
    }

    const payload = req.body
    const eventType = payload.webhookEvent
    const externalId = payload?.issue?.id || null

    const parsedEvent:IJiraParsedEvent | null = parsedJiraEvent(eventType , externalId , payload)
    if(parsedEvent === null){
        return res.status(501).json({
            error:"Not Able to Parse Jira Event"
        })
    }

    const {status , message} = await pushJiraEventToDatabase(parsedEvent)
    console.log(`Saved Jira Event to Database`)

    return res.status(status == true ? 201 : 501).json({
        status,
        message
    })
})
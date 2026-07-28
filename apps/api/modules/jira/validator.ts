import { Request } from "express"
import env from "../../config/env.js"

export function validateJiraSignature(req:Request){
    const secret = env.JIRA_SECRET!
    const providerSecret = req.query.secret

    if(!secret)
        return false

    return secret === providerSecret
}
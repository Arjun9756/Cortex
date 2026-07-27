import { Request, Response } from 'express'
import { cortexAgent } from '../../../../packages/agent/graph/workflow.js'

export async function handleChatQuery(req: Request, res: Response) {
    try {
        const { query } = req.body
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({
                status: false,
                error: 'Query Parameter is Required'
            })
        }

        // A route can legitimately be SQL -> vector -> graph, with evidence and
        // reflection after each lookup. Ten steps is not enough for that path.
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 })
        return res.status(200).json({
            answer: result.answer,
            needsClarification: Boolean(result.clarificationQuestion),
            clarificationQuestion: result.clarificationQuestion || undefined,
            sources: result.vectorResult,
            graphContext: result.graphResult,
            sqlContext: result.sqlResult,
        })
    }
    catch (error: any) {
        console.warn(`Error in Handle Chat Query ${error.message}`)
        return res.status(500).json({ error: "Internal Server Error of Cortex" });
    }
}

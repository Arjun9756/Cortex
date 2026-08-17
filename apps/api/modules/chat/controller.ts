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

        const result = await cortexAgent.invoke({ query }, { recursionLimit: 25 })
        return res.status(200).json({
            query: result.query || query,
            answer: result.answer,
            needsClarification: Boolean(result.clarificationQuestion),
            clarificationQuestion: result.clarificationQuestion || undefined,
            execution: {
                query: result.query || query,
                tools: result.executedTools,
                graphAction: result.executedTools.includes('graph_search') ? result.graphAction : undefined,
                graphEntities: result.executedTools.includes('graph_search') ? result.entities : undefined,
                graphTarget: result.graphTarget || undefined,
                graphRelation: result.graphRelation || undefined,
                vectorQuery: result.vectorQuery || undefined,
            },
            sources: result.vectorResult,
            graphContext: result.graphResult,
            sqlContext: result.sqlResult,
            knowledgeRiskResult: result.knowledgeRiskResult,
        })
    }
    catch (error: any) {
        console.warn(`Error in Handle Chat Query: ${error.message}`)
        return res.status(500).json({ error: "Internal Server Error of Cortex" });
    }
}

export async function handleChatQueryStream(req: Request, res: Response) {
    try {
        const { query } = req.body
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({
                status: false,
                error: 'Query Parameter is Required'
            })
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        // Send status event
        res.write(`event: status\ndata: ${JSON.stringify({ step: 'Evaluating dynamic tool selection plan...' })}\n\n`)

        const result = await cortexAgent.invoke({ query }, { recursionLimit: 25 })

        // Stream the answer in realistic chunks for smooth UI rendering
        const fullAnswer = result.answer || 'No answer generated.'
        const words = fullAnswer.split(' ')
        const chunkSize = 4

        for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '')
            res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`)
            // small micro-tick for stream fluidity
            await new Promise(r => setTimeout(r, 15))
        }

        const finalPayload = {
            query: result.query || query,
            answer: result.answer,
            needsClarification: Boolean(result.clarificationQuestion),
            clarificationQuestion: result.clarificationQuestion || undefined,
            execution: {
                query: result.query || query,
                tools: result.executedTools,
                graphAction: result.executedTools.includes('graph_search') ? result.graphAction : undefined,
                graphEntities: result.executedTools.includes('graph_search') ? result.entities : undefined,
                graphTarget: result.graphTarget || undefined,
                graphRelation: result.graphRelation || undefined,
                vectorQuery: result.vectorQuery || undefined,
            },
            sources: result.vectorResult,
            graphContext: result.graphResult,
            sqlContext: result.sqlResult,
            knowledgeRiskResult: result.knowledgeRiskResult,
        }

        res.write(`event: done\ndata: ${JSON.stringify(finalPayload)}\n\n`)
        res.end()
    }
    catch (error: any) {
        console.warn(`Error in Handle Chat Stream: ${error.message}`)
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Internal Server Error' })}\n\n`)
        res.end()
    }
}

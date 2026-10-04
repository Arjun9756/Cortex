import { Request, Response } from 'express'
import { cortexAgent } from '../../../../packages/agent/graph/workflow.js'


function formatChatPayload(result: any, query: string, fullAnswer?: string) {
    const executedTools = result.executedTools || [];
    const structuredEvidence = Array.isArray(result.structuredEvidence) ? result.structuredEvidence : [];
    const vectorResult = Array.isArray(result.vectorResult) ? result.vectorResult : [];

    // Synthesize grounded sources from both structured evidence (SQL, Graph, Analytics) and vector search docs
    const enrichedSources: any[] = [];

    // 1. Structured evidence sources (SQL, Analytics, Graph)
    for (const ev of structuredEvidence) {
        enrichedSources.push({
            id: ev.id,
            provider: ev.sourceType === 'sql' ? 'postgres' : ev.sourceType === 'analytics' ? 'analytics' : ev.sourceType === 'graph' ? 'neo4j' : 'cortex',
            summary: ev.summary,
            queryExplanation: ev.queryExplanation,
            confidence: ev.confidence,
            entities: ev.entitiesFound || [],
            rawPayload: ev.rawPayload,
            sourceType: ev.sourceType,
            isStructured: true,
        });
    }

    // 2. Vector semantic documents
    for (const v of vectorResult) {
        enrichedSources.push({
            ...v,
            provider: v.provider || (v.repository ? 'github' : v.channel ? 'slack' : v.issueKey ? 'jira' : 'qdrant'),
            summary: v.summary || v.text || (v.repository ? `Event in ${v.repository}` : 'Vector knowledge doc'),
            author: v.author || 'Engineering Contributor',
            sourceType: 'vector',
        });
    }

    return {
        query: result.query || query,
        answer: fullAnswer !== undefined ? fullAnswer : (result.answer || (result.clarificationQuestion ? result.clarificationQuestion : 'No answer generated.')),
        needsClarification: Boolean(result.clarificationQuestion),
        clarificationQuestion: result.clarificationQuestion || undefined,
        execution: {
            query: result.query || query,
            tools: executedTools,
            graphEntities: executedTools.includes('graph_search') ? result.entities : undefined,
            vectorQuery: result.vectorQuery || undefined,
            subgoals: result.subgoals || [],
            toolLatencies: result.metrics?.toolLatencies || {},
            toolOrder: result.metrics?.toolOrder || [],
        },
        sources: enrichedSources,
        graphContext: result.graphResult || [],
        sqlContext: result.sqlResult || [],
        knowledgeRiskResult: result.knowledgeRiskResult || null,
        structuredEvidence: structuredEvidence,
    };
}

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
        return res.status(200).json(formatChatPayload(result, query))
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

        let isClientClosed = false;
        res.on('close', () => {
            if (!res.writableEnded) {
                isClientClosed = true;
            }
        });

        // Initial status event
        res.write(`event: status\ndata: ${JSON.stringify({ step: 'Evaluating query intent and dynamic tool plan...' })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();

        // Send progressive status milestones to keep client UI actively animated
        const statusTimer1 = setTimeout(() => {
            if (!isClientClosed && !res.writableEnded) {
                res.write(`event: status\ndata: ${JSON.stringify({ step: 'Traversing engineering knowledge graph & data warehouse...' })}\n\n`);
                if (typeof (res as any).flush === 'function') (res as any).flush();
            }
        }, 350);

        const statusTimer2 = setTimeout(() => {
            if (!isClientClosed && !res.writableEnded) {
                res.write(`event: status\ndata: ${JSON.stringify({ step: 'Synthesizing verified engineering response...' })}\n\n`);
                if (typeof (res as any).flush === 'function') (res as any).flush();
            }
        }, 900);

        let result: any = null;
        try {
            result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });
        } finally {
            clearTimeout(statusTimer1);
            clearTimeout(statusTimer2);
        }

        if (isClientClosed || res.writableEnded) return;

        // Stream the answer in fast, responsive chunks directly to client
        const fullAnswer = result.answer || (result.clarificationQuestion ? result.clarificationQuestion : 'No answer generated.');
        const words = fullAnswer.split(' ');
        const chunkSize = 4;

        for (let i = 0; i < words.length; i += chunkSize) {
            if (isClientClosed || res.writableEnded) break;
            const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
            res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
            if (typeof (res as any).flush === 'function') (res as any).flush();
        }

        const finalPayload = formatChatPayload(result, query, fullAnswer);

        if (!isClientClosed && !res.writableEnded) {
            res.write(`event: done\ndata: ${JSON.stringify(finalPayload)}\n\n`);
            if (typeof (res as any).flush === 'function') (res as any).flush();
            res.end();
        }
    }
    catch (error: any) {
        console.warn(`Error in Handle Chat Stream: ${error.message}`);
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Internal Server Error' })}\n\n`);
        res.end();
    }
}

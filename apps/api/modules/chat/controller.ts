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

        // Initial status event
        res.write(`event: status\ndata: ${JSON.stringify({ step: 'Evaluating query intent and dynamic tool plan...' })}\n\n`)

        let result: any = null;

        // Try streaming node progression from LangGraph
        try {
            const stream = await (cortexAgent as any).stream?.({ query }, { recursionLimit: 25, streamMode: 'updates' });
            if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
                const accumulatedState: any = { query };
                const stepLabels: Record<string, string> = {
                    plannerNode: 'Decomposing query subgoals & entity recognition...',
                    retrievalPlannerNode: 'Selecting optimal tools & data retrieval pathways...',
                    graphNode: 'Traversing Neo4j knowledge graph topology...',
                    vectorNode: 'Semantic vector search across commit & PR discussion embeddings...',
                    sqlNode: 'Querying analytical codebase data warehouse...',
                    knowledgeRiskNode: 'Evaluating key-person dependency & bus factor risk...',
                    cypherFallbackNode: 'Executing dynamic Cypher fallback queries...',
                    evidenceNode: 'Consolidating & cross-verifying gathered evidence...',
                    reflectionNode: 'Reflecting on answer completeness & grounding...',
                    clarifyNode: 'Formulating clarification question...',
                    answerNode: 'Synthesizing verified engineering response...'
                };

                for await (const chunk of stream) {
                    const nodeName = Object.keys(chunk)[0];
                    if (nodeName && chunk[nodeName]) {
                        Object.assign(accumulatedState, chunk[nodeName]);
                        const stepText = stepLabels[nodeName] || `Executing ${nodeName}...`;
                        res.write(`event: status\ndata: ${JSON.stringify({ step: stepText, node: nodeName })}\n\n`);
                    }
                }
                result = accumulatedState;
            } else {
                result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });
            }
        } catch (streamErr) {
            console.warn(`Streaming execution fallback to invoke: ${(streamErr as any)?.message}`);
            res.write(`event: status\ndata: ${JSON.stringify({ step: 'Synthesizing verified natural language response...' })}\n\n`);
            result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });
        }

        // Stream the answer in realistic chunks for smooth token-by-token rendering
        const fullAnswer = result.answer || (result.clarificationQuestion ? result.clarificationQuestion : 'No answer generated.');
        const words = fullAnswer.split(' ');
        const chunkSize = 3;

        for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
            res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
            // micro-tick for natural reading fluidity
            await new Promise(r => setTimeout(r, 18));
        }

        const finalPayload = formatChatPayload(result, query, fullAnswer);

        res.write(`event: done\ndata: ${JSON.stringify(finalPayload)}\n\n`);
        res.end();
    }
    catch (error: any) {
        console.warn(`Error in Handle Chat Stream: ${error.message}`);
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Internal Server Error' })}\n\n`);
        res.end();
    }
}

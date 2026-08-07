import { AgentStateType } from "../state.js";
import { createGroqChatCompletion } from "../../../llm/providers/groq.js";
import sql from '../../../../apps/api/config/postgres.js';
import { buildSqlPlannerPrompt } from "../../../llm/prompts/sqlplanner.prompt.js";

export async function runSafeQuery(queryType: string, params: any) {
    switch (queryType) {
        case "recent_events": {
            const limit = Math.min(params.limit ?? 10, 50);
            if (params.provider) {
                return await sql`
                    SELECT id, external_id, provider, event_type, payload, created_at 
                    FROM events 
                    WHERE provider = ${params.provider}
                    ORDER BY created_at DESC 
                    LIMIT ${limit}
                `;
            }
            return await sql`
                SELECT id, external_id, provider, event_type, payload, created_at 
                FROM events 
                ORDER BY created_at DESC 
                LIMIT ${limit}
            `;
        }

        case "count_by_provider": {
            const days = Math.min(params.days ?? 7, 90);
            return await sql`
                SELECT provider, COUNT(*) as count 
                FROM events 
                WHERE created_at >= NOW() - (${days} || ' days')::interval
                GROUP BY provider
            `;
        }

        case "events_by_author": {
            const limit = Math.min(params.limit ?? 10, 50);
            return await sql`
                SELECT id, external_id, provider, event_type, payload, created_at 
                FROM events 
                WHERE payload->>'author' = ${params.author} 
                   OR payload->>'user' = ${params.author}
                ORDER BY created_at DESC 
                LIMIT ${limit}
            `;
        }

        case 'event_by_id': {
            if (!params.eventId)
                return [];
            return await sql`
                SELECT id, external_id, provider, event_type, payload, created_at
                FROM events WHERE id = ${params.eventId} LIMIT 1
            `;
        }

        default:
            return [];
    }
}

export async function sqlNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [sqlNode] Started at ${startIso}`)

    const pendingTools = state.pendingTools.filter((tool) => tool !== 'sql_search');
    const executedTools = [...new Set([...state.executedTools, 'sql_search'])];
    try {
        const prompt = buildSqlPlannerPrompt(state.query, state.evidence);
        const response = await createGroqChatCompletion({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            response_format: { type: "json_object" }
        });

        let decision: any = {};
        try {
            decision = JSON.parse(response.choices[0]?.message?.content ?? '{"queryType":"none"}');
        }
        catch (error: any) {
            console.log(`Error While SQL Node: ${error?.message}`);
            decision = { queryType: "none" };
        }

        let queryType = decision?.queryType;
        let queryParams = decision?.params ?? {};

        // Fallback: If LLM missed eventId parameter but vectorResult contains an eventId, auto-populate eventId
        const vectorEventId = state.vectorResult.find((item: any) => item?.eventId)?.eventId;
        if (vectorEventId && (queryType === 'event_by_id' || !queryParams.eventId)) {
            const wantsPayloadOrId = /\b(payload|raw|full event|event id|message id|event details)\b/i.test(state.query);
            if (wantsPayloadOrId || queryType === 'event_by_id') {
                queryType = 'event_by_id';
                queryParams.eventId = queryParams.eventId || vectorEventId;
                console.log(`[SQL Node] Querying event_by_id with eventId: ${queryParams.eventId}`);
            }
        }

        const results = await runSafeQuery(queryType, queryParams);
        return { sqlResult: results, pendingTools, executedTools };
    }
    catch (error: any) {
        return { sqlResult: [], pendingTools, executedTools };
    } finally {
        const elapsed = Date.now() - tStart
        console.log(`[Timing] [sqlNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`)
    }
}

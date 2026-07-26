import { AgentStateType } from "../state.js";
import { groq } from "../../../llm/providers/groq.js";
import sql from '../../../../apps/api/config/postgres.js'
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

        default:
            return [];
    }
}

export async function sqlNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
        const prompt = buildSqlPlannerPrompt(state.query)
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            response_format: { type: "json_object" }
        })

        let decision;
        try {
            decision = JSON.parse(response.choices[0]?.message?.content ?? "{queryType:'none'}")
        }
        catch (error: any) {
            console.log(`Error While SQL Node ${error?.message}`)
            decision = `{queryType:"none"}`
        }

        const results = await runSafeQuery(decision.queryType, decision.params)
        return {sqlResult:results}
    }
    catch (error: any) {
        return { sqlResult: [] }
    }
}
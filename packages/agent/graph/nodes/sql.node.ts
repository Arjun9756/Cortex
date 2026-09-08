import { AgentStateType, StructuredEvidence } from "../state.js";
import { createGroqChatCompletion } from "../../../llm/providers/groq.js";
import sql from '../../../../apps/api/config/postgres.js';
import { buildSqlPlannerPrompt } from "../../../llm/prompts/sqlplanner.prompt.js";

function formatTimestamp12h(date: Date): string {
    if (isNaN(date.getTime())) return 'Unknown Date';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${day} ${month} ${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
}

export async function runSafeQuery(queryType: string, params: any) {
    switch (queryType) {
        case "recent_activity": {
            const limit = Math.min(Number(params.limit ?? 5), 50);
            const author = (params.author || params.person || params.personName || params.user || '').trim();
            const repository = (params.repository || params.repo || '').trim();
            const provider = params.provider && params.provider !== 'all' ? String(params.provider).trim() : null;
            const eventType = (params.eventType || params.event_type) && params.eventType !== 'all' ? String(params.eventType).trim() : null;

            let rows: any[] = [];
            if (author) {
                // Split author words to support partial matching and typos (e.g. "rohan vermna" -> "rohan", "verma")
                const tokens = author.split(/\s+/).filter((t: string) => t.length > 2);
                const terms = Array.from(new Set([author, ...tokens]));
                const patterns = terms.map((t: string) => `%${t}%`);

                rows = await sql`
                    SELECT id, external_id, provider, event_type, payload, created_at 
                    FROM events 
                    WHERE (
                        payload->>'author' ILIKE ANY(${patterns})
                        OR payload->>'user' ILIKE ANY(${patterns})
                        OR payload->'sender'->>'login' ILIKE ANY(${patterns})
                        OR payload->'sender'->>'name' ILIKE ANY(${patterns})
                        OR payload->'sender'->>'email' ILIKE ANY(${patterns})
                        OR payload->'pusher'->>'name' ILIKE ANY(${patterns})
                        OR payload->'pusher'->>'email' ILIKE ANY(${patterns})
                        OR payload->'head_commit'->'author'->>'name' ILIKE ANY(${patterns})
                        OR payload->'head_commit'->'author'->>'email' ILIKE ANY(${patterns})
                        OR payload->'pull_request'->'user'->>'login' ILIKE ANY(${patterns})
                        OR payload->'user'->>'displayName' ILIKE ANY(${patterns})
                        OR payload->'user'->>'name' ILIKE ANY(${patterns})
                        OR payload->'issue'->'fields'->'reporter'->>'displayName' ILIKE ANY(${patterns})
                        OR payload->'issue'->'fields'->'creator'->>'displayName' ILIKE ANY(${patterns})
                        OR payload->'issue'->'user'->>'login' ILIKE ANY(${patterns})
                    )
                    ${repository ? sql`AND (payload->'repository'->>'name' ILIKE ${'%' + repository + '%'} OR payload->>'repository' ILIKE ${'%' + repository + '%'})` : sql``}
                    ${provider ? sql`AND provider = ${provider}` : sql``}
                    ${eventType ? sql`AND event_type = ${eventType}` : sql``}
                    ORDER BY created_at DESC 
                    LIMIT ${limit}
                `;
            } else if (repository) {
                const repoPattern = `%${repository}%`;
                rows = await sql`
                    SELECT id, external_id, provider, event_type, payload, created_at 
                    FROM events 
                    WHERE (payload->'repository'->>'name' ILIKE ${repoPattern} OR payload->>'repository' ILIKE ${repoPattern})
                    ${provider ? sql`AND provider = ${provider}` : sql``}
                    ${eventType ? sql`AND event_type = ${eventType}` : sql``}
                    ORDER BY created_at DESC 
                    LIMIT ${limit}
                `;
            } else {
                rows = await sql`
                    SELECT id, external_id, provider, event_type, payload, created_at 
                    FROM events 
                    WHERE 1=1
                    ${provider ? sql`AND provider = ${provider}` : sql``}
                    ${eventType ? sql`AND event_type = ${eventType}` : sql``}
                    ORDER BY created_at DESC 
                    LIMIT ${limit}
                `;
            }

            return rows.map((r: any) => {
                const payload = r.payload || {};
                const authorName =
                    payload.author ||
                    payload.sender?.login ||
                    payload.pusher?.name ||
                    payload.head_commit?.author?.name ||
                    payload.pull_request?.user?.login ||
                    payload.user?.displayName ||
                    payload.user?.name ||
                    payload.issue?.fields?.reporter?.displayName ||
                    payload.issue?.user?.login ||
                    payload.user ||
                    'Unknown';

                const repoName =
                    payload.repository?.name ||
                    payload.repository ||
                    payload.repo ||
                    'general';

                const summary =
                    payload.head_commit?.message ||
                    payload.comment?.body ||
                    payload.pull_request?.title ||
                    payload.issue?.fields?.summary ||
                    payload.issue?.title ||
                    payload.text ||
                    payload.message ||
                    (r.event_type ? `${r.event_type} action` : 'activity');

                const d = new Date(r.created_at);
                const formattedDate = formatTimestamp12h(d);

                return {
                    id: r.id,
                    external_id: r.external_id,
                    provider: r.provider,
                    event_type: r.event_type || 'activity',
                    author: authorName,
                    repository: repoName,
                    summary: typeof summary === 'string' ? summary.replace(/\r?\n/g, ' ').trim() : String(summary),
                    created_at: r.created_at,
                    formatted_date: formattedDate,
                };
            });
        }
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
            const authorTerm = `%${params.author}%`;
            return await sql`
                SELECT id, external_id, provider, event_type, payload, created_at 
                FROM events 
                WHERE payload->>'author' ILIKE ${authorTerm}
                   OR payload->>'user' ILIKE ${authorTerm}
                   OR payload->'sender'->>'login' ILIKE ${authorTerm}
                   OR payload->'sender'->>'email' ILIKE ${authorTerm}
                   OR payload->'pusher'->>'name' ILIKE ${authorTerm}
                   OR payload->'user'->>'displayName' ILIKE ${authorTerm}
                   OR payload->'issue'->'fields'->'reporter'->>'displayName' ILIKE ${authorTerm}
                ORDER BY created_at DESC 
                LIMIT ${limit}
            `;
        }

        case "active_engineers": {
            const limit = Math.min(params.limit ?? 20, 50);
            return await sql`
                SELECT 
                    COALESCE(
                        payload->'sender'->>'login', 
                        payload->'pusher'->>'name', 
                        payload->'user'->>'displayName',
                        payload->'issue'->'fields'->'reporter'->>'displayName',
                        payload->>'user',
                        'Unknown'
                    ) AS engineer,
                    provider,
                    COUNT(*) AS event_count
                FROM events
                GROUP BY engineer, provider
                ORDER BY event_count DESC
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

        case 'repo_risk': {
            return await sql`
                SELECT repo_name, bus_factor, risk_score, contributor_count, status 
                FROM repo_metrics 
                ORDER BY risk_score DESC
            `;
        }

        case 'repos_by_bus_factor': {
            const threshold = Number(params?.threshold ?? params?.busFactor ?? 1);
            return await sql`
                SELECT repo_name, bus_factor, risk_score, contributor_count, status 
                FROM repo_metrics 
                WHERE bus_factor <= ${threshold}
                ORDER BY bus_factor ASC, risk_score DESC
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

    const remainingPendingTools = state.pendingTools.filter((tool) => {
        const name = typeof tool === 'string' ? tool : tool.name;
        return name !== 'sql_search' && name !== 'recent_activity';
    });
    const executedTools = [...new Set([...state.executedTools, 'sql_search', 'recent_activity'])];
    
    try {
        const sqlCalls = state.pendingTools
            .filter((tool): tool is Exclude<typeof tool, string> => typeof tool !== 'string' && (tool.name === 'sql_search' || tool.name === 'recent_activity'));
        if (sqlCalls.length === 0) return { sqlResult: state.sqlResult, pendingTools: remainingPendingTools, executedTools };

        // Each queued SQL call is independent.
        const executeCall = async (sqlCall: typeof sqlCalls[number], index: number) => {
        const isRecentActivity = sqlCall.name === 'recent_activity';
        let queryType = isRecentActivity ? 'recent_activity' : sqlCall.args?.queryType;
        let queryParams = sqlCall.args?.params || (isRecentActivity ? sqlCall.args : {}) || {};

        if (isRecentActivity && !queryParams.author && (sqlCall.args?.person || sqlCall.args?.personName || sqlCall.args?.user)) {
            queryParams.author = sqlCall.args.person || sqlCall.args.personName || sqlCall.args.user;
        }

        if (!queryType || queryType === 'none') {
            const prompt = buildSqlPlannerPrompt(state.query, state.evidence);
            const response = await createGroqChatCompletion({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                response_format: { type: "json_object" }
            });

            let decision: any = {};
            try {
                decision = JSON.parse(response.choices[0]?.message?.content ?? '{"queryType":"repo_risk"}');
            }
            catch (error: any) {
                console.log(`Error While SQL Node: ${error?.message}`);
                decision = { queryType: "repo_risk" };
            }

            queryType = decision?.queryType;
            queryParams = decision?.params ?? queryParams;
        }

        // Handle unsupported or still-missing queryType gracefully
        if (!queryType || queryType === 'none' || queryType === 'unsupported') {
            console.log(`[SQL Node] No matching queryType determined (got "${queryType || 'none'}"). The planner should specify queryType explicitly.`);
            console.warn(`[SQL Node] DROPPED_UNSUPPORTED_SQL_CALL id=${sqlCall.id || index} queryType=${queryType || 'none'}`);
            return { results: [], evidence: null };
        }

        console.log(`[SQL Node] Executing safe query "${queryType}" with params:`, queryParams);

        // Enrich event_by_id with eventId from vector results (if available and not already set)
        if (queryType === 'event_by_id' && !queryParams.eventId) {
            const vectorEventId = state.vectorResult.find((item: any) => item?.eventId)?.eventId;
            if (vectorEventId) {
                queryParams.eventId = vectorEventId;
                console.log(`[SQL Node] Enriched event_by_id with eventId from vector results: ${queryParams.eventId}`);
            }
        }

        const results = await runSafeQuery(queryType, queryParams);

        let evidence: StructuredEvidence | null = null;
        if (results && results.length > 0) {
            evidence = {
                id: `sql_${sqlCall.id || index}_${queryType}`,
                sourceType: 'sql',
                confidence: 0.95,
                summary: `SQL query "${queryType}" returned ${results.length} record(s).`,
                rawPayload: results,
                entitiesFound: results.map((r: any) => r.repo_name || r.engineer || r.author || r.repository).filter(Boolean),
                queryExplanation: `Executed safe relational query "${queryType}" with params ${JSON.stringify(queryParams)}`,
                ...(sqlCall.subgoalId ? { toolCallId: sqlCall.subgoalId, subgoalId: sqlCall.subgoalId } : {}),
            };
        }
        return { results, evidence };
        };

        const callResults = await Promise.all(sqlCalls.map(executeCall));
        const results = callResults.flatMap(result => result.results);
        const newStructuredEvidence = callResults.flatMap(result => result.evidence ? [result.evidence] : []);

        const elapsed = Date.now() - tStart;
        return {
            sqlResult: [...state.sqlResult, ...results],
            structuredEvidence: [...state.structuredEvidence, ...newStructuredEvidence],
            pendingTools: remainingPendingTools,
            executedTools,
            metrics: {
                ...state.metrics,
                toolLatencies: { ...state.metrics?.toolLatencies, sqlNode: elapsed },
                toolOrder: [...(state.metrics?.toolOrder || []), 'sqlNode'],
            }
        };
    }
    catch (error: any) {
        console.error(`[SQL Node] Error in sqlNode: ${error?.message}`);
        return { sqlResult: state.sqlResult, pendingTools: remainingPendingTools, executedTools };
    } finally {
        const elapsed = Date.now() - tStart
        console.log(`[Timing] [sqlNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`)
    }
}

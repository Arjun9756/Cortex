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

export function normalizeRepoName(input: string): string {
    if (!input) return '';
    return input.trim().toLowerCase().replace(/\s+/g, '-');
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
                SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
                FROM repo_metrics
                WHERE status IS DISTINCT FROM 'empty'
                ORDER BY risk_score DESC
            `;
        }

        case 'repos_by_bus_factor': {
            const threshold = Number(params?.threshold ?? params?.busFactor ?? 1);
            return await sql`
                SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
                FROM repo_metrics
                WHERE bus_factor <= ${threshold} AND status IS DISTINCT FROM 'empty'
                ORDER BY bus_factor ASC, risk_score DESC
            `;
        }

        case 'repo_details': {
            const rawRepo = (params.repo || params.repository || params.repo_name || params.name || '').trim();
            if (!rawRepo) return [];
            const normalized = normalizeRepoName(rawRepo);
            const spaced = rawRepo.toLowerCase().replace(/[-_]/g, ' ');

            // 1. Exact normalized match (e.g. payment-gateway-v2)
            let rows = await sql`
                SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
                FROM repo_metrics
                WHERE lower(repo_name) = ${normalized}
                   OR lower(repo_name) = ${rawRepo.toLowerCase()}
                LIMIT 1
            `;

            // 2. Fallback fuzzy ILIKE match
            if (rows.length === 0) {
                rows = await sql`
                    SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
                    FROM repo_metrics
                    WHERE repo_name ILIKE ${'%' + normalized + '%'}
                       OR replace(lower(repo_name), '-', ' ') ILIKE ${'%' + spaced + '%'}
                    ORDER BY 
                        CASE WHEN lower(repo_name) = ${normalized} THEN 0 ELSE 1 END,
                        risk_score DESC
                    LIMIT 1
                `;
            }

            return rows.map((r: any) => ({
                repo_name: r.repo_name,
                bus_factor: Number(r.bus_factor ?? 1),
                risk_score: Number(r.risk_score ?? 0),
                contributor_count: Number(r.contributor_count ?? 1),
                primary_owner: r.primary_owner || 'Unknown',
                status: r.status || 'active',
                isSPOF: Number(r.bus_factor ?? 1) <= 1 && r.status !== 'empty'
            }));
        }

        case 'healthy_vs_fragile': {
            const rows = await sql`
                SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
                FROM repo_metrics
                ORDER BY 
                    CASE 
                        WHEN status = 'empty' THEN 3
                        WHEN bus_factor <= 1 THEN 1
                        ELSE 2
                    END,
                    risk_score DESC
            `;

            const fragile = rows.filter((r: any) => Number(r.bus_factor) <= 1 && r.status !== 'empty').map((r: any) => ({
                repo_name: r.repo_name,
                bus_factor: Number(r.bus_factor),
                risk_score: Number(r.risk_score),
                primary_owner: r.primary_owner || 'Unknown',
                contributor_count: Number(r.contributor_count),
                category: 'fragile'
            }));

            const healthy = rows.filter((r: any) => Number(r.bus_factor) > 1 && r.status !== 'empty').map((r: any) => ({
                repo_name: r.repo_name,
                bus_factor: Number(r.bus_factor),
                risk_score: Number(r.risk_score),
                primary_owner: r.primary_owner || 'Unknown',
                contributor_count: Number(r.contributor_count),
                category: 'healthy'
            }));

            const scaffold = rows.filter((r: any) => r.status === 'empty').map((r: any) => ({
                repo_name: r.repo_name,
                bus_factor: 0,
                risk_score: 0,
                primary_owner: r.primary_owner || 'None',
                contributor_count: 0,
                category: 'scaffold'
            }));

            return [{
                summary: `Found ${healthy.length} healthy repositories, ${fragile.length} fragile repositories, and ${scaffold.length} scaffold/empty repositories.`,
                fragile_repositories: fragile,
                healthy_repositories: healthy,
                scaffold_repositories: scaffold,
                total_active: healthy.length + fragile.length,
                spof_count: fragile.length,
            }];
        }

        case 'jira_tickets': {
            const limit = Math.min(Number(params.limit ?? 25), 50);
            const priorityFilter = (params.priority || 'all').toLowerCase();
            const searchTerms = ['%high%', '%highest%', '%p0%', '%p1%', '%critical%', '%urgent%'];

            let rows: any[] = [];
            if (priorityFilter === 'high') {
                rows = await sql`
                    SELECT id, external_id, provider, event_type, payload, created_at 
                    FROM events 
                    WHERE provider = 'jira'
                      AND (
                          payload->'issue'->'fields'->'priority'->>'name' ILIKE ANY(${searchTerms})
                          OR payload->'issue'->'fields'->>'summary' ILIKE ANY(${searchTerms})
                          OR payload->'issue'->'fields'->>'description' ILIKE ANY(${searchTerms})
                          OR payload->>'text' ILIKE ANY(${searchTerms})
                          OR payload->>'summary' ILIKE ANY(${searchTerms})
                      )
                    ORDER BY created_at DESC 
                    LIMIT ${limit}
                `;
            }

            if (rows.length === 0) {
                rows = await sql`
                    SELECT id, external_id, provider, event_type, payload, created_at 
                    FROM events 
                    WHERE provider = 'jira'
                    ORDER BY created_at DESC 
                    LIMIT ${limit}
                `;
            }

            return rows.map((r: any) => {
                const payload = r.payload || {};
                const issue = payload.issue || {};
                const fields = issue.fields || {};

                const issueKey = issue.key || payload.issueKey || fields.key || r.external_id || 'JIRA-TICKET';
                const summary = fields.summary || payload.summary || payload.text || 'No summary provided';
                const priorityName = fields.priority?.name || payload.priority || 'High (inferred from title/labels)';
                const assigneeName = fields.assignee?.displayName || fields.assignee?.name || payload.assignee || fields.reporter?.displayName || 'Unassigned';
                const statusName = fields.status?.name || payload.status || 'Open';
                const projectKey = fields.project?.key || fields.project?.name || issueKey.split('-')[0] || 'GENERAL';

                return {
                    id: r.id,
                    issue_key: issueKey,
                    summary: typeof summary === 'string' ? summary.replace(/\r?\n/g, ' ').trim() : String(summary),
                    priority: priorityName,
                    assignee: assigneeName,
                    status: statusName,
                    project: projectKey,
                    created_at: r.created_at,
                    formatted_date: formatTimestamp12h(new Date(r.created_at)),
                    priority_field_sparse_note: !fields.priority?.name
                };
            });
        }

        case 'slack_search': {
            const limit = Math.min(Number(params.limit ?? 20), 50);
            const term = (params.searchTerm || params.query || params.term || 'KMS').trim();
            const tokens = term.split(/\s+/).filter((t: string) => t.length > 2);
            const patterns = Array.from(new Set([term, ...tokens])).map(t => `%${t}%`);

            const rows = await sql`
                SELECT id, external_id, provider, event_type, payload, created_at 
                FROM events 
                WHERE provider = 'slack'
                  AND (
                      payload->>'text' ILIKE ANY(${patterns})
                      OR payload->>'message' ILIKE ANY(${patterns})
                      OR payload->'event'->>'text' ILIKE ANY(${patterns})
                      OR payload->'item'->'message'->>'text' ILIKE ANY(${patterns})
                  )
                ORDER BY created_at DESC 
                LIMIT ${limit}
            `;

            return rows.map((r: any) => {
                const payload = r.payload || {};
                const channel = payload.channel || payload.event?.channel || 'general';
                const user = payload.userDisplayName || payload.user || payload.event?.user || payload.author || 'Slack User';
                const text = payload.text || payload.message || payload.event?.text || '';

                return {
                    id: r.id,
                    provider: 'slack',
                    channel: channel.startsWith('C') ? `#${channel}` : channel,
                    author: user,
                    text: typeof text === 'string' ? text.replace(/\r?\n/g, ' ').trim() : String(text),
                    timestamp: r.created_at,
                    formatted_date: formatTimestamp12h(new Date(r.created_at)),
                };
            });
        }

        case 'person_repos': {
            const personName = (params.person || params.personName || params.name || '').trim();
            if (!personName) return [];

            const rows = await sql`
                SELECT person_name, external_id, risk_score, repos, top_technologies, commit_count
                FROM person_metrics
                WHERE person_name ILIKE ${'%' + personName + '%'}
                   OR external_id ILIKE ${'%' + personName + '%'}
                LIMIT 5
            `;

            return rows.map((r: any) => ({
                person_name: r.person_name,
                external_id: r.external_id,
                risk_score: Number(r.risk_score ?? 0),
                repos: Array.isArray(r.repos) ? r.repos : [],
                top_technologies: Array.isArray(r.top_technologies) ? r.top_technologies : [],
                commit_count: Number(r.commit_count ?? 0)
            }));
        }

        case 'person_profile': {
            const personName = (params.person || params.personName || params.name || '').trim();
            if (!personName) return [];

            const identities = await sql`
                SELECT id, provider, external_id, username, email, display_name, canonical_person_id
                FROM person_identity
                WHERE display_name ILIKE ${'%' + personName + '%'}
                   OR username ILIKE ${'%' + personName + '%'}
                   OR email ILIKE ${'%' + personName + '%'}
            `;

            const metrics = await sql`
                SELECT person_name, external_id, risk_score, repos, top_technologies, commit_count
                FROM person_metrics
                WHERE person_name ILIKE ${'%' + personName + '%'}
                LIMIT 1
            `;

            return [{
                person: personName,
                metrics: metrics[0] || null,
                identities: identities.map((i: any) => ({
                    provider: i.provider,
                    external_id: i.external_id,
                    username: i.username,
                    email: i.email,
                    display_name: i.display_name,
                    canonical_person_id: i.canonical_person_id
                }))
            }];
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
                entitiesFound: results.map((r: any) => r.repo_name || r.engineer || r.author || r.repository || r.issue_key || r.person).filter(Boolean),
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

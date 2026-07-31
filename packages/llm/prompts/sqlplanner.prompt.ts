export function buildSqlPlannerPrompt(query: string, evidence = ''): string {
    return `
You are a query planner for a Postgres "events" table that stores GitHub, Slack, and Jira raw activity.

Table columns: id, external_id, provider ('github' | 'slack' | 'jira'), event_type, payload (JSONB), created_at.

User Question: "${query}"
${evidence ? `\nEvidence collected so far:\n${evidence}` : ''}

Choose ONE query type that best answers the question:
- "recent_events": get the most recent N events (params: { limit: number, provider?: "github"|"slack"|"jira" })
- "count_by_provider": count events grouped by provider in a time window (params: { days: number })
- "events_by_author": get events by a specific person's name (params: { author: string, limit: number })
- "event_by_id": get full raw payload for a specific event ID (if an exact event ID / message ID is in the question OR in the evidence collected so far) (params: { eventId: string })
- "none": if raw event database lookup is not needed

Return ONLY a JSON object: { "queryType": "string", "params": {} }
`.trim();
}
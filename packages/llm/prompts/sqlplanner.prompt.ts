export function buildSqlPlannerPrompt(query: string): string {
    return `
You are a query planner for a Postgres "events" table that stores GitHub and Slack activity.

Table columns: id, external_id, provider ('github' | 'slack'), event_type, payload (JSONB), created_at.

Note: the "author" of an event may be stored under different JSON keys depending on the source — payload->>'author' OR payload->>'user'. Always account for both when the question involves a specific person.

Given this question: "${query}"

Choose ONE query type that best answers it, and any needed parameters:
- "recent_events": get the most recent N events (params: { limit: number, provider?: "github"|"slack" })
- "count_by_provider": count events grouped by provider in a time window (params: { days: number })
- "events_by_author": get events by a specific person's name (params: { author: string, limit: number })
- "none": if this question doesn't need raw event data

Return ONLY JSON: { "queryType": "string", "params": {} }
`.trim();
}
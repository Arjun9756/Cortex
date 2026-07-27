export function buildSqlPlannerPrompt(query: string): string {
    return `
You are a query planner for a Postgres "events" table that stores GitHub and Slack activity.

Table columns: id, external_id, provider ('github' | 'slack'), event_type, payload (JSONB), created_at.

Given this question: "${query}"

Choose ONE query type that best answers it, and any needed parameters:
- "recent_events": get the most recent N events (params: { limit: number, provider?: "github"|"slack" })
- "count_by_provider": count events grouped by provider in a time window (params: { days: number })
- "events_by_author": get events by a specific person's name (params: { author: string, limit: number })
- "event_by_id": get full raw payload for a specific event when the question mentions an exact event ID (a long numeric string) (params: { eventId: string })
- "none": if this question doesn't need raw event data

If the user's question includes a specific event ID, and matching evidence is found for that ID, confirm the match and describe the event's content. Do not invent IDs. Do not add citation-style IDs to your answer unless the user explicitly asked about a specific ID.
Return ONLY JSON: { "queryType": "string", "params": {} }
`.trim();
}
export function buildSqlPlannerPrompt(query: string, evidence = ''): string {
    return `
You are a query planner for a Postgres "events" and "repo_metrics" tables.

Events Table columns: id, external_id, provider ('github' | 'slack' | 'jira'), event_type, payload (JSONB), created_at.
Repo Metrics Table columns: repo_name, bus_factor, risk_score, contributor_count, status.

User Question: "${query}"
${evidence ? `\nEvidence collected so far:\n${evidence}` : ''}

Choose ONE query type that best answers the question:
- "repos_by_bus_factor": get repositories with bus factor <= threshold or equal to threshold (e.g. "which repo has bus factor 1", "bus factor = 1", fragile repos, SPOF repos) (params: { threshold: number })
- "repo_risk": get all repository risk metrics, rankings, and bus factors from repo_metrics (params: {})
- "recent_events": get the most recent N events (params: { limit: number, provider?: "github"|"slack"|"jira" })
- "count_by_provider": count events grouped by provider in a time window (params: { days: number })
- "events_by_author": get events by a specific person's name (params: { author: string, limit: number })
- "active_engineers": get a summary list of all active engineers/contributors and their activity counts across providers (params: { limit: number })
- "event_by_id": get full raw payload for a specific event ID (if an exact event ID / message ID is in the question OR in the evidence collected so far) (params: { eventId: string })
- "none": if raw event database lookup is not needed

Return ONLY a JSON object: { "queryType": "string", "params": {} }
`.trim();
}
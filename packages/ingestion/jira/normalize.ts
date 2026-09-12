

export interface ICleanEvent {
    provider: 'jira',
    eventType: string,
    issueKey: string,
    issueType: string,
    summary: string,
    status: string,
    author: string,
    /** Reporter's or assignee's email from the Jira issue payload. */
    authorEmail: string | null,
    /** Role is not available from Jira issue webhook payloads — always null. */
    authorRole: null,
    timestamp: string,
    description?: string
}

function normalizeIssueEvent(payload: any, eventType: string): ICleanEvent {
    const issue = payload.issue ?? {};
    const fields = issue.fields ?? {};

    // Prefer reporter email; fall back to assignee email
    const authorEmail: string | null =
        fields.reporter?.emailAddress ??
        fields.assignee?.emailAddress ??
        null

    return {
        provider: "jira",
        eventType: eventType === "jira:issue_created" ? "issue_created" : "issue_updated",
        issueKey: issue.key ?? 'UNKNOWN',
        issueType: fields.issuetype?.name ?? 'Unknown',
        summary: fields.summary ?? '',
        status: fields.status?.name ?? 'open',
        author: fields.reporter?.displayName ?? fields.assignee?.displayName ?? "Unknown",
        authorEmail,
        authorRole: null,
        timestamp: payload.timestamp ?? new Date().toISOString(),
        description: fields.description,
    }
}

export function normalizeJiraEvent(payload: any, eventType: string): ICleanEvent | null {
    switch (eventType) {
        case "jira:issue_created":
        case "jira:issue_updated":
            return normalizeIssueEvent(payload, eventType)
        default:
            console.warn(`Unhandled Jira event type: ${eventType}`)
            return null
    }
}
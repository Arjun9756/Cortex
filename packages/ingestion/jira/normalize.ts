

export interface ICleanEvent {
    provider: 'jira',
    eventType: string,
    issueKey: string,
    issueType: string,
    summary: string,
    status: boolean,
    author: string,
    /** Reporter's or assignee's email from the Jira issue payload. */
    authorEmail: string | null,
    /** Role is not available from Jira issue webhook payloads — always null. */
    authorRole: null,
    timestamp: string,
    description?: string
}

function normalizeIssueEvent(payload: any, eventType: string): ICleanEvent {
    const issue = payload.issue

    // Prefer reporter email; fall back to assignee email
    const authorEmail: string | null =
        issue.fields?.reporter?.emailAddress ??
        issue.fields?.assignee?.emailAddress ??
        null

    return {
        provider: "jira",
        eventType: eventType === "jira:issue_created" ? "issue_created" : "issue_updated",
        issueKey: issue.key,
        issueType: issue.fields?.issuetype?.name,
        summary: issue?.fields?.summary,
        status: issue?.fields?.status?.name,
        author: issue.fields?.reporter?.displayName ?? issue.fields?.assignee?.displayName ?? "Unknown",
        authorEmail,
        authorRole: null,
        timestamp: payload.timestamp ?? new Date().toISOString(),
        description: issue.fields?.description,
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


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
    description?: string | undefined;
}

function formatJiraDescription(desc: any): string | undefined {
    if (!desc) return undefined;
    if (typeof desc === 'string') return desc;
    if (typeof desc === 'object') {
        try {
            // If it's Atlassian Document Format (ADF), extract text nodes
            if (Array.isArray(desc.content)) {
                const extractText = (node: any): string => {
                    if (node.text) return node.text;
                    if (Array.isArray(node.content)) {
                        return node.content.map(extractText).join(' ');
                    }
                    return '';
                };
                const text = desc.content.map(extractText).join('\n').trim();
                if (text) return text;
            }
            return JSON.stringify(desc);
        } catch {
            return String(desc);
        }
    }
    return String(desc);
}

function normalizeIssueEvent(payload: any, eventType: string): ICleanEvent {
    const issue = payload.issue ?? {};
    const fields = issue.fields ?? {};

    // Prefer reporter email; fall back to assignee email
    const authorEmail: string | null =
        fields.reporter?.emailAddress ??
        fields.assignee?.emailAddress ??
        null;

    let timestamp: string;
    if (typeof payload.timestamp === 'number') {
        timestamp = new Date(payload.timestamp).toISOString();
    } else if (typeof payload.timestamp === 'string') {
        const d = new Date(payload.timestamp);
        timestamp = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else if (fields.updated || fields.created) {
        const d = new Date(fields.updated || fields.created);
        timestamp = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else {
        timestamp = new Date().toISOString();
    }

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
        timestamp,
        description: formatJiraDescription(fields.description),
    };
}

export function normalizeJiraEvent(payload: any, eventType: string): ICleanEvent | null {
    switch (eventType) {
        case "jira:issue_created":
        case "jira:issue_updated":
        case "issue_created":
        case "issue_updated":
        case "jira:issue_generic":
            return normalizeIssueEvent(payload, eventType)
        default:
            console.warn(`[Jira] Unhandled Jira event type: ${eventType}`)
            return null
    }
}
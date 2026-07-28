import { IJiraParsedEvent } from "../../../apps/api/modules/jira/normalize.js";

export interface ICleanEvent {
    provider: 'jira',
    eventType: string,
    issueKey: string,
    issueType: string,
    summary: string,
    status: boolean,
    author: string,
    timestamp: string,
    description?: string
}

function normalizeIssueEvent(payload: any, eventType: string): ICleanEvent {
    const issue = payload.issue
    return {
        provider: "jira",
        eventType: eventType === "jira:issue_created" ? "issue_created" : "issue_updated",
        issueKey: issue.key,
        issueType: issue.fields?.issuetype?.name,
        summary: issue?.fields?.summary,
        status: issue?.fields?.status?.name,
        author: issue.fields?.reporter?.displayName ?? issue.fields?.assignee?.displayName ?? "Unknown",
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
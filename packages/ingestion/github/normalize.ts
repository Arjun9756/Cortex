import { eventTypes } from './eventTypes.js'

type CleanGithubEvent = {
    provider: "github",
    eventType: string,
    repository: string,
    author: string,
    timestamp: string,
    [key: string]: any
}

function normalizePush(payload: any): CleanGithubEvent {
  return {
    provider: "github",
    eventType: "push",
    repository: payload.repository.name,
    branch: payload.ref.replace("refs/heads/", ""),
    author: payload.pusher.name,
    timestamp: payload.head_commit?.timestamp ?? new Date().toISOString(),
    commits: payload.commits.map((c: any) => ({
      id: c.id,
      message: c.message,
      filesChanged: c.modified,
    })),
  };
}

function normalizePullRequest(payload: any): CleanGithubEvent {
  return {
    provider: "github",
    eventType: "pull_request",
    action: payload.action, // opened, closed, merged, etc.
    repository: payload.repository.name,
    author: payload.pull_request.user.login,
    timestamp: payload.pull_request.created_at,
    title: payload.pull_request.title,
    body: payload.pull_request.body,
    merged: payload.pull_request.merged,
  };
}

function normalizeIssue(payload: any): CleanGithubEvent {
  return {
    provider: "github",
    eventType: "issues",
    action: payload.action, // opened, closed, labeled, etc.
    repository: payload.repository.name,
    author: payload.issue.user.login,
    timestamp: payload.issue.created_at,
    title: payload.issue.title,
    body: payload.issue.body,
  };
}

function normalizeIssueComment(payload: any): CleanGithubEvent {
  return {
    provider: "github",
    eventType: "issue_comment",
    repository: payload.repository.name,
    author: payload.comment.user.login,
    timestamp: payload.comment.created_at,
    body: payload.comment.body,
    relatedIssue: payload.issue.title,
  };
}

// ... baaki bhi isi pattern pe

export function normalizeGithubEvent(rawPayload: object, eventType: string): CleanGithubEvent | null {
    switch (eventType) {
        case eventTypes.PUSH:
            return normalizePush(rawPayload)
        case eventTypes.PULL_REQUEST:
            return normalizePullRequest(rawPayload)
        case eventTypes.ISSUES:
            return normalizeIssue(rawPayload)
        case eventTypes.ISSUE_COMMENT:
            return normalizeIssueComment(rawPayload);
        // case eventTypes.PULL_REQUEST_REVIEW:
        //     return normalizePRReview(rawPayload)
        // case eventTypes.PULL_REQUEST_REVIEW_COMMENT:
        //     return normalizePRReviewComment(rawPayload)
        // case eventTypes.RELEASE:
        //     return normalizeRelease(rawPayload)
        // case eventTypes.CREATE:
        //     return normalizeCreate(rawPayload);
        // case eventTypes.DELETE:
        //     return normalizeDelete(rawPayload);
        default:
            console.warn(`Unhandled GitHub event type: ${eventType}`);
            return null;
    }
}
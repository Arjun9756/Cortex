import { eventTypes } from './eventTypes.js'

const IGNORED_PATTERNS = [
  /node_modules/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.lock$/,
  /dist\//,
  /build\//,
  /\.min\.js$/,
  /\.map$/,
  /coverage\//,
];

function filterRelevantFiles(files: string[]): string[] {
  return files.filter(f => !IGNORED_PATTERNS.some(pattern => pattern.test(f)));
}

export type CleanGithubEvent = {
  provider: "github",
  eventType: string,
  repository: string,
  author: string,
  /** Sender email if available; falls back to commit author email for push events. */
  authorEmail: string | null,
  /** Role is not available from GitHub webhook payloads — always null. */
  authorRole: null,
  timestamp: string,
  [key: string]: any
}

function normalizePush(payload: any): CleanGithubEvent {
  const allModifiedFiles = payload.commits.flatMap((c: any) => c.modified ?? [])
  const relevantFiles = filterRelevantFiles(allModifiedFiles)

  // GitHub push: pusher.email may exist; fall back to head_commit.author.email
  const authorEmail: string | null =
    payload.pusher?.email ?? payload.head_commit?.author?.email ?? null

  return {
    provider: "github",
    eventType: "push",
    repository: payload.repository.name,
    branch: payload.ref.replace("refs/heads/", ""),
    author: payload.pusher.name,
    authorEmail,
    authorRole: null,
    timestamp: payload.head_commit?.timestamp ?? new Date().toISOString(),
    commits: payload.commits.map((c: any) => ({
      id: c.id,
      message: c.message,
      filesChanged: c.modified,
    })),
    filesChanged: relevantFiles.slice(0, 5), // max 5 files, noise filtered
    totalFilesChanged: allModifiedFiles.length, // total count, context ke liye
  };
}

function normalizePullRequest(payload: any): CleanGithubEvent {
  return {
    provider: "github",
    eventType: "pull_request",
    action: payload.action, // opened, closed, merged, etc.
    repository: payload.repository.name,
    author: payload.pull_request.user.login,
    authorEmail: payload.pull_request.user?.email ?? payload.sender?.email ?? null,
    authorRole: null,
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
    authorEmail: payload.issue.user?.email ?? payload.sender?.email ?? null,
    authorRole: null,
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
    authorEmail: payload.comment.user?.email ?? payload.sender?.email ?? null,
    authorRole: null,
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
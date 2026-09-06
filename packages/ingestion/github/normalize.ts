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
  const commits = Array.isArray(payload.commits) ? payload.commits : [];
  const allModifiedFiles = commits.flatMap((c: any) => c.modified ?? [])
  const relevantFiles = filterRelevantFiles(allModifiedFiles)

  // GitHub push: pusher.email may exist; fall back to head_commit.author.email
  const authorEmail: string | null =
    payload.pusher?.email ?? payload.head_commit?.author?.email ?? null

  return {
    provider: "github",
    eventType: "push",
    repository: payload.repository?.name ?? 'unknown',
    branch: (payload.ref ?? '').replace("refs/heads/", ""),
    author: payload.pusher?.name ?? payload.sender?.login ?? 'unknown',
    authorEmail,
    authorRole: null,
    timestamp: payload.head_commit?.timestamp ?? new Date().toISOString(),
    commits: commits.map((c: any) => ({
      id: c.id,
      message: c.message,
      filesChanged: c.modified,
    })),
    filesChanged: relevantFiles.slice(0, 5), // max 5 files, noise filtered
    totalFilesChanged: allModifiedFiles.length, // total count, context ke liye
  };
}

function normalizePullRequest(payload: any): CleanGithubEvent {
  const pr = payload.pull_request ?? {};
  return {
    provider: "github",
    eventType: "pull_request",
    action: payload.action, // opened, closed, merged, etc.
    repository: payload.repository?.name ?? 'unknown',
    author: pr.user?.login ?? payload.sender?.login ?? 'unknown',
    authorEmail: pr.user?.email ?? payload.sender?.email ?? null,
    authorRole: null,
    timestamp: pr.created_at ?? new Date().toISOString(),
    title: pr.title ?? '',
    body: pr.body ?? '',
    merged: pr.merged ?? false,
  };
}

function normalizeIssue(payload: any): CleanGithubEvent {
  const issue = payload.issue ?? {};
  return {
    provider: "github",
    eventType: "issues",
    action: payload.action, // opened, closed, labeled, etc.
    repository: payload.repository?.name ?? 'unknown',
    author: issue.user?.login ?? payload.sender?.login ?? 'unknown',
    authorEmail: issue.user?.email ?? payload.sender?.email ?? null,
    authorRole: null,
    timestamp: issue.created_at ?? new Date().toISOString(),
    title: issue.title ?? '',
    body: issue.body ?? '',
  };
}

function normalizeIssueComment(payload: any): CleanGithubEvent {
  const comment = payload.comment ?? {};
  return {
    provider: "github",
    eventType: "issue_comment",
    repository: payload.repository?.name ?? 'unknown',
    author: comment.user?.login ?? payload.sender?.login ?? 'unknown',
    authorEmail: comment.user?.email ?? payload.sender?.email ?? null,
    authorRole: null,
    timestamp: comment.created_at ?? new Date().toISOString(),
    body: comment.body ?? '',
    relatedIssue: payload.issue?.title ?? '',
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
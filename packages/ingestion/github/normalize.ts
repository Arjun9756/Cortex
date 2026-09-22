import { eventTypes } from './eventTypes.js'
import { isBotAccount } from '../../shared/botDetection.js'

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
  isBot?: boolean,
  [key: string]: any
}

export function parseCoAuthors(message?: string): Array<{ name: string; email: string }> {
  if (!message) return [];
  const coAuthors: Array<{ name: string; email: string }> = [];
  const regex = /^Co-authored-by:\s*([^<]+)<([^>]+)>/gmi;
  let match;
  while ((match = regex.exec(message)) !== null) {
    const name = match[1]?.trim() || '';
    const email = match[2]?.trim().toLowerCase() || '';
    if (name && email && !coAuthors.some(c => c.email === email)) {
      coAuthors.push({ name, email });
    }
  }
  return coAuthors;
}

function normalizePush(payload: any): CleanGithubEvent {
  const commits = Array.isArray(payload.commits) ? payload.commits : [];
  const allModifiedFiles = commits.flatMap((c: any) => c.modified ?? [])
  const relevantFiles = filterRelevantFiles(allModifiedFiles)

  // GitHub push: pusher.email may exist; fall back to head_commit.author.email
  const authorEmail: string | null =
    payload.pusher?.email ?? payload.head_commit?.author?.email ?? null

  const author = payload.pusher?.name ?? payload.sender?.login ?? 'unknown';
  const isBot = isBotAccount(author, authorEmail, payload.sender?.login);

  return {
    provider: "github",
    eventType: "push",
    repository: payload.repository?.full_name ?? payload.repository?.name ?? 'unknown',
    branch: (payload.ref ?? '').replace("refs/heads/", ""),
    author,
    authorEmail,
    authorRole: null,
    isBot,
    timestamp: payload.head_commit?.timestamp ?? new Date().toISOString(),
    commits: commits.map((c: any) => ({
      id: c.id,
      message: c.message,
      filesChanged: c.modified,
      author: c.author ? {
        name: c.author.name,
        email: c.author.email,
        username: c.author.username,
      } : null,
      coAuthors: parseCoAuthors(c.message),
      timestamp: c.timestamp,
      isBot: isBotAccount(c.author?.name, c.author?.email, c.author?.username),
    })),
    filesChanged: relevantFiles.slice(0, 5), // max 5 files, noise filtered
    totalFilesChanged: allModifiedFiles.length, // total count, context ke liye
  };
}

function normalizePullRequest(payload: any): CleanGithubEvent {
  const pr = payload.pull_request ?? {};
  const author = pr.user?.login ?? payload.sender?.login ?? 'unknown';
  const authorEmail = pr.user?.email ?? payload.sender?.email ?? null;
  return {
    provider: "github",
    eventType: "pull_request",
    action: payload.action, // opened, closed, merged, etc.
    repository: payload.repository?.full_name ?? payload.repository?.name ?? 'unknown',
    author,
    authorEmail,
    authorRole: null,
    isBot: isBotAccount(author, authorEmail, pr.user?.login),
    timestamp: pr.created_at ?? new Date().toISOString(),
    title: pr.title ?? '',
    body: pr.body ?? '',
    merged: pr.merged ?? false,
  };
}

function normalizeIssue(payload: any): CleanGithubEvent {
  const issue = payload.issue ?? {};
  const author = issue.user?.login ?? payload.sender?.login ?? 'unknown';
  const authorEmail = issue.user?.email ?? payload.sender?.email ?? null;
  return {
    provider: "github",
    eventType: "issues",
    action: payload.action, // opened, closed, labeled, etc.
    repository: payload.repository?.full_name ?? payload.repository?.name ?? 'unknown',
    author,
    authorEmail,
    authorRole: null,
    isBot: isBotAccount(author, authorEmail, issue.user?.login),
    timestamp: issue.created_at ?? new Date().toISOString(),
    title: issue.title ?? '',
    body: issue.body ?? '',
  };
}

function normalizeIssueComment(payload: any): CleanGithubEvent {
  const comment = payload.comment ?? {};
  const author = comment.user?.login ?? payload.sender?.login ?? 'unknown';
  const authorEmail = comment.user?.email ?? payload.sender?.email ?? null;
  return {
    provider: "github",
    eventType: "issue_comment",
    repository: payload.repository?.full_name ?? payload.repository?.name ?? 'unknown',
    author,
    authorEmail,
    authorRole: null,
    isBot: isBotAccount(author, authorEmail, comment.user?.login),
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
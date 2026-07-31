export interface ParsedEvent {
  title: string;
  author: string;
  dateStr: string;
  repoName?: string;
  provider: string;
}

export function parseTimelineEvent(event: any): ParsedEvent {
  const provider = (event?.provider || 'system').toLowerCase();

  // If backend SQL already extracted title and author cleanly:
  if (event?.title) {
    let dateStr = '';
    if (event.date) {
      dateStr = new Date(event.date).toLocaleDateString();
    } else if (event.created_at) {
      dateStr = new Date(event.created_at).toLocaleDateString();
    }

    return {
      title: event.title,
      author: event.author || 'System',
      dateStr,
      repoName: event.repo || '',
      provider: event.provider || 'system'
    };
  }

  // Fallback if raw payload is passed:
  const payload = event?.payload || {};
  let title = '';
  let author = '';
  let dateStr = event?.created_at ? new Date(event.created_at).toLocaleDateString() : '';
  let repoName = payload.repository?.name || payload.repository?.full_name || '';

  if (provider === 'github') {
    if (payload.comment?.body) {
      const commentBody = payload.comment.body;
      const issueTitle = payload.issue?.title || payload.pull_request?.title;
      title = issueTitle ? `[${issueTitle}] ${commentBody}` : commentBody;
    } else if (payload.issue?.title) {
      title = payload.issue.title;
    } else if (payload.pull_request?.title) {
      title = payload.pull_request.title;
    } else if (payload.commit?.message) {
      title = payload.commit.message;
    } else if (typeof payload.comment === 'string') {
      title = payload.comment;
    } else if (payload.summary) {
      title = payload.summary;
    } else {
      title = payload.text || payload.message || JSON.stringify(payload);
    }

    const commentUser = payload.comment?.user;
    const sender = payload.sender;
    const authorUser = commentUser || sender || payload.author;

    if (typeof authorUser === 'object' && authorUser !== null) {
      author = authorUser.login || authorUser.name || authorUser.displayName || authorUser.email || 'GitHub User';
    } else if (typeof authorUser === 'string') {
      author = authorUser;
    } else {
      author = 'GitHub User';
    }

    if (payload.comment?.created_at) {
      dateStr = new Date(payload.comment.created_at).toLocaleDateString();
    }
  } else if (provider === 'slack') {
    title = payload.text || payload.message || payload.summary || JSON.stringify(payload);
    const slackUser = payload.user || payload.username;
    if (typeof slackUser === 'object' && slackUser !== null) {
      author = slackUser.displayName || slackUser.name || slackUser.username || 'Slack User';
    } else if (typeof slackUser === 'string') {
      author = slackUser;
    } else {
      author = 'Slack User';
    }
  } else if (provider === 'jira') {
    title = payload.issue?.fields?.summary || payload.summary || payload.issue?.key || JSON.stringify(payload);
    const jiraUser = payload.user || payload.issue?.fields?.reporter || payload.author;
    if (typeof jiraUser === 'object' && jiraUser !== null) {
      author = jiraUser.displayName || jiraUser.name || jiraUser.emailAddress || 'Jira User';
    } else if (typeof jiraUser === 'string') {
      author = jiraUser;
    } else {
      author = 'Jira User';
    }
  } else {
    title = payload.summary || payload.text || payload.message || JSON.stringify(payload);
    const rawAuthor = payload.author || payload.user;
    if (typeof rawAuthor === 'object' && rawAuthor !== null) {
      author = rawAuthor.displayName || rawAuthor.name || 'System';
    } else if (typeof rawAuthor === 'string') {
      author = rawAuthor;
    } else {
      author = 'System';
    }
  }

  if (typeof title === 'object') title = JSON.stringify(title);
  if (typeof author === 'object') author = JSON.stringify(author);

  return {
    title: title || 'Activity Event',
    author: author || 'System',
    dateStr,
    repoName,
    provider: event?.provider || 'system'
  };
}

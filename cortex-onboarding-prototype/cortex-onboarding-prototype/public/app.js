/* ═══════════════════════════════════════════════════════════════════════════
   Cortex Onboarding — Frontend Application Logic
   Handles first-run setup, connector OAuth, scoping, dashboard rendering,
   test event simulation, and toast notifications.
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = '';

// ─── Initialization ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  try {
    const data = await api('/api/connectors/status');
    hideLoading();

    if (data.isFirstRun) {
      showSetupScreen(data.connectors);
    } else {
      showDashboard(data.connectors);
    }
  } catch (err) {
    hideLoading();
    showSetupScreen({});
    showToast('Failed to connect to server: ' + err.message, 'error');
  }
}

// ─── Screen Management ─────────────────────────────────────────────────────
function hideLoading() {
  document.getElementById('loading-screen').classList.add('hidden');
}

function showSetupScreen(connectors) {
  document.getElementById('setup-screen').classList.remove('hidden');
  document.getElementById('dashboard-screen').classList.add('hidden');
  if (connectors) updateSetupCards(connectors);
}

function showDashboard(connectors) {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  refreshDashboard();
}

function goToDashboard() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  refreshDashboard();
}

// ─── Setup Screen Logic ────────────────────────────────────────────────────
function updateSetupCards(connectors) {
  const providers = ['github', 'slack', 'jira'];
  let connectedCount = 0;

  for (const p of providers) {
    const conn = connectors[p];
    if (!conn) continue;

    const card = document.getElementById(`card-${p}`);
    const badge = document.getElementById(`badge-${p}`);
    const btn = document.getElementById(`btn-connect-${p}`);
    const scope = document.getElementById(`scope-${p}`);

    if (conn.status === 'connected') {
      connectedCount++;
      card.className = 'connector-card connected';
      badge.textContent = '✓ Connected';
      badge.className = 'card-status-badge badge-connected';
      btn.textContent = '✓ Connected';
      btn.className = 'btn btn-connect btn-connected';
      btn.disabled = true;
      scope.classList.remove('hidden');

      // Restore scope state
      const toggle = document.getElementById(`toggle-${p}-all`);
      const inputGroup = document.getElementById(`scope-input-${p}`);
      if (conn.scopeRules) {
        toggle.checked = conn.scopeRules.allMonitored;
        if (!conn.scopeRules.allMonitored) {
          inputGroup.classList.remove('hidden');
        }
      }
    } else if (conn.status === 'needs_reauth') {
      connectedCount++;
      card.className = 'connector-card needs-reauth';
      badge.textContent = '⚠ Needs re-auth';
      badge.className = 'card-status-badge badge-needs-reauth';
      btn.innerHTML = '<span class="btn-icon">🔄</span> Re-authorize';
      btn.className = 'btn btn-connect';
      btn.disabled = false;
      scope.classList.remove('hidden');
    }
  }

  // Show "Continue" button if at least one connector is connected
  const continueBtn = document.getElementById('btn-continue');
  if (connectedCount > 0) {
    continueBtn.classList.remove('hidden');
  }
}

async function connectProvider(provider) {
  const btn = document.getElementById(`btn-connect-${provider}`);
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="btn-icon">⏳</span> Connecting...';
  btn.disabled = true;

  try {
    const data = await api('/api/connectors/oauth/authorize', {
      method: 'POST',
      body: JSON.stringify({ provider, simulate: true }),
    });

    showToast(`${provider.toUpperCase()} connected successfully! Webhook auto-registered.`, 'success');

    // Refresh the setup cards
    const status = await api('/api/connectors/status');
    updateSetupCards(status.connectors);
  } catch (err) {
    btn.innerHTML = originalText;
    btn.disabled = false;
    showToast(`Failed to connect ${provider}: ${err.message}`, 'error');
  }
}

// ─── Scoping Controls ──────────────────────────────────────────────────────
function toggleScopeAll(provider) {
  const toggle = document.getElementById(`toggle-${provider}-all`);
  const inputGroup = document.getElementById(`scope-input-${provider}`);

  if (toggle.checked) {
    inputGroup.classList.add('hidden');
    // Auto-save "all" scope
    saveScopeRulesInternal(provider, true, ['*']);
  } else {
    inputGroup.classList.remove('hidden');
  }
}

async function saveScopeRules(provider) {
  const inputMap = {
    github: 'input-github-repos',
    slack: 'input-slack-channels',
    jira: 'input-jira-projects',
  };

  const inputEl = document.getElementById(inputMap[provider]);
  const items = inputEl.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length === 0) {
    showToast('Please enter at least one item to monitor.', 'warn');
    return;
  }

  await saveScopeRulesInternal(provider, false, items);
}

async function saveScopeRulesInternal(provider, allMonitored, monitoredItems) {
  try {
    await api(`/api/connectors/${provider}/scope`, {
      method: 'POST',
      body: JSON.stringify({ allMonitored, monitoredItems }),
    });
    showToast(`${provider.toUpperCase()} scope updated!`, 'success');
  } catch (err) {
    showToast(`Failed to update scope: ${err.message}`, 'error');
  }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
async function refreshDashboard() {
  try {
    const [statusData, eventsData, personsData, auditData] = await Promise.all([
      api('/api/connectors/status'),
      api('/api/connectors/events').catch(() => ({ events: [] })),
      api('/api/connectors/persons').catch(() => ({ persons: [] })),
      api('/api/connectors/audit').catch(() => ({ auditLogs: [] })),
    ]);

    renderStatusRow(statusData.connectors);

    if (Array.isArray(eventsData?.events)) clientEvents = eventsData.events;
    if (Array.isArray(personsData?.persons)) {
      clientPersons = {};
      for (const p of personsData.persons) clientPersons[p.id] = p;
    }
    if (Array.isArray(auditData?.auditLogs)) clientAuditLogs = auditData.auditLogs;

    await loadEvents();
    await loadPersons();
    await loadAuditLogs();
  } catch (err) {
    showToast('Failed to refresh dashboard: ' + err.message, 'error');
  }
}

function renderStatusRow(connectors) {
  const row = document.getElementById('status-row');
  const providers = [
    { key: 'github', icon: '🐙', name: 'GitHub' },
    { key: 'slack', icon: '💬', name: 'Slack' },
    { key: 'jira', icon: '🎫', name: 'Jira' },
  ];

  row.innerHTML = providers
    .map((p) => {
      const conn = connectors[p.key] || { status: 'not_connected', eventCount: 0 };
      const stateClass = `state-${conn.status.replace('_', '-')}`;
      const cardClass = `status-${conn.status.replace('_', '-')}`;
      const stateLabel =
        conn.status === 'connected'
          ? '● Connected'
          : conn.status === 'needs_reauth'
          ? '⚠ Needs re-auth'
          : '○ Not connected';

      const actionBtn =
        conn.status === 'needs_reauth'
          ? `<div class="status-action"><button class="btn btn-sm btn-warn" onclick="connectProvider('${p.key}')">Re-auth</button></div>`
          : conn.status === 'not_connected'
          ? `<div class="status-action"><button class="btn btn-sm btn-primary" onclick="connectProviderFromDash('${p.key}')">Connect</button></div>`
          : '';

      return `
        <div class="status-card ${cardClass}">
          <div class="status-icon">${p.icon}</div>
          <div class="status-info">
            <div class="status-provider-name">${p.name}</div>
            <div class="status-state ${stateClass}">${stateLabel}</div>
            <div class="status-events">${conn.eventCount || 0} events ingested</div>
          </div>
          ${actionBtn}
        </div>
      `;
    })
    .join('');
}

async function connectProviderFromDash(provider) {
  try {
    await api('/api/connectors/oauth/authorize', {
      method: 'POST',
      body: JSON.stringify({ provider, simulate: true }),
    });
    showToast(`${provider.toUpperCase()} connected!`, 'success');
    refreshDashboard();
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

// ─── Events Panel ───────────────────────────────────────────────────────────
async function loadEvents() {
  // We need an events endpoint; use the store which is server-side.
  // We'll add a lightweight endpoint. For now, call /api/connectors/status and parse events from there.
  // Actually, let's just call the status and show event count. Events are rendered on webhook response.
  // We'll store events client-side from test panel responses.
  const el = document.getElementById('events-list');

  if (clientEvents.length === 0) {
    el.innerHTML = '<p class="empty-state">No events ingested yet. Use the Test Panel to simulate webhook events.</p>';
    return;
  }

  el.innerHTML = clientEvents
    .map((evt) => {
      const providerIcons = { github: '🐙', slack: '💬', jira: '🎫' };
      const icon = providerIcons[evt.provider] || '📥';
      const isSkipped = !evt.inScope;
      const itemClass = isSkipped ? 'event-skipped' : 'event-ingested';

      let fetchBadge = '';
      if (evt.emailFetchMethod === 'payload_direct') {
        fetchBadge = '<span class="event-badge badge-email">email in payload</span>';
      } else if (evt.emailFetchMethod === 'api_lookup') {
        fetchBadge = '<span class="event-badge badge-api">api lookup</span>';
      } else if (evt.emailFetchMethod === 'fallback_failed') {
        fetchBadge = '<span class="event-badge badge-fallback">fallback</span>';
      }

      if (isSkipped) {
        fetchBadge = '<span class="event-badge badge-skipped">out of scope</span>';
      }

      const time = new Date(evt.createdAt).toLocaleTimeString();

      return `
        <div class="event-item ${itemClass}">
          <div class="event-provider-icon">${icon}</div>
          <div class="event-content">
            <div class="event-header">
              <span class="event-type">${evt.eventType}</span>
              ${fetchBadge}
            </div>
            <div class="event-actor">
              Actor: <strong>${evt.actorDisplayName || evt.actorUsername || evt.actorExternalId}</strong>
              ${evt.actorEmail ? ` — ${evt.actorEmail}` : ''}
            </div>
            ${evt.resolvedPersonId ? `<div class="event-detail">Resolved → ${evt.resolvedPersonId} (${evt.resolutionMatchedBy}, ${((evt.confidence || 0) * 100).toFixed(0)}%)</div>` : ''}
            ${evt.scopeReason ? `<div class="event-detail">${evt.scopeReason}</div>` : ''}
          </div>
          <div class="event-time">${time}</div>
        </div>
      `;
    })
    .join('');
}

// Client-side event + person + audit stores for rendering
let clientEvents = [];
let clientPersons = {};
let clientAuditLogs = [];

function addClientEvent(evt) {
  clientEvents.unshift(evt);
  if (clientEvents.length > 100) clientEvents.pop();
  loadEvents();
}

// ─── Persons Panel ──────────────────────────────────────────────────────────
async function loadPersons() {
  const el = document.getElementById('persons-list');
  const persons = Object.values(clientPersons);

  if (persons.length === 0) {
    el.innerHTML = '<p class="empty-state">No people resolved yet. Ingest events to see identity resolution.</p>';
    return;
  }

  el.innerHTML = persons
    .map((p) => {
      const initials = (p.displayName || '?')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const confClass =
        p.confidence >= 0.95 ? 'confidence-high' : p.confidence >= 0.7 ? 'confidence-medium' : 'confidence-low';

      const identityList = p.identities
        .map((id) => `${id.provider}:${id.username || id.externalId}`)
        .join(', ');

      return `
        <div class="person-item">
          <div class="person-avatar">${initials}</div>
          <div class="person-info">
            <div class="person-name">${p.displayName}</div>
            <div class="person-email">${p.verifiedEmail || 'No verified email'}</div>
            <div class="person-identities">${identityList}</div>
          </div>
          <div class="person-confidence ${confClass}">${(p.confidence * 100).toFixed(0)}%</div>
        </div>
      `;
    })
    .join('');
}

// ─── Audit Log Panel ────────────────────────────────────────────────────────
async function loadAuditLogs() {
  const el = document.getElementById('audit-list');

  if (clientAuditLogs.length === 0) {
    el.innerHTML = '<p class="empty-state">No audit entries yet.</p>';
    return;
  }

  el.innerHTML = clientAuditLogs
    .map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      return `
        <div class="audit-item">
          <div class="audit-time">${time}</div>
          <div class="audit-type">${entry.eventType}</div>
          <div class="audit-message">${entry.message}</div>
        </div>
      `;
    })
    .join('');
}

function addAuditEntry(entry) {
  clientAuditLogs.unshift(entry);
  if (clientAuditLogs.length > 100) clientAuditLogs.pop();
  loadAuditLogs();
}

// ─── Tab Switching ──────────────────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`panel-${tabName}`).classList.add('active');
}

// ─── Test Panel Actions ─────────────────────────────────────────────────────
async function sendTestGitHubPush() {
  const secret = 'cortex_github_webhook_secret_key_12345';
  const payload = {
    ref: 'refs/heads/main',
    repository: {
      full_name: 'acme/auth-service',
      name: 'auth-service',
    },
    sender: {
      id: 42,
      login: 'alice-eng',
    },
    pusher: {
      name: 'alice-eng',
      email: 'alice.engineer@cortex-client.com',
    },
    head_commit: {
      id: 'abc123def456',
      message: 'feat: add OAuth2 PKCE flow support',
      author: {
        name: 'Alice Engineering',
        email: 'alice.engineer@cortex-client.com',
        username: 'alice-eng',
      },
      timestamp: new Date().toISOString(),
    },
    commits: [
      {
        id: 'abc123def456',
        message: 'feat: add OAuth2 PKCE flow support',
        author: {
          name: 'Alice Engineering',
          email: 'alice.engineer@cortex-client.com',
          username: 'alice-eng',
        },
      },
    ],
  };

  const body = JSON.stringify(payload);
  const signature = await hmacSha256(secret, body);

  try {
    const data = await api('/api/github/webhook', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': `sha256=${signature}`,
        'x-github-delivery': `ghd_${Date.now()}`,
        'x-github-event': 'push',
      },
      body,
    });

    if (data.event) addClientEvent(data.event);
    if (data.person) clientPersons[data.person.id] = data.person;
    loadPersons();
    refreshStatusRow();

    showToast('GitHub push event ingested! Actor resolved via commit email.', 'success');
  } catch (err) {
    showToast('GitHub test failed: ' + err.message, 'error');
  }
}

async function sendTestSlackMessage() {
  const secret = 'cortex_slack_signing_secret_key_12345';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = {
    type: 'event_callback',
    event_id: `slack_evt_${Date.now()}`,
    event: {
      type: 'message',
      user: 'U01TESTALICE',
      text: 'Just deployed the new auth module to staging 🚀',
      channel: 'C_ENGINEERING',
      ts: `${Date.now() / 1000}`,
    },
    team_id: 'T_CORTEX_DEMO',
  };

  const body = JSON.stringify(payload);
  const sigBase = `v0:${timestamp}:${body}`;
  const signature = `v0=${await hmacSha256(secret, sigBase)}`;

  try {
    const data = await api('/api/slack/webhook', {
      method: 'POST',
      headers: {
        'x-slack-signature': signature,
        'x-slack-request-timestamp': timestamp,
      },
      body,
    });

    if (data.event) addClientEvent(data.event);
    if (data.person) clientPersons[data.person.id] = data.person;
    loadPersons();
    refreshStatusRow();

    const method = data.resolution?.emailFetchMethod || 'unknown';
    showToast(`Slack event ingested! Email fetched via ${method}.`, 'success');
  } catch (err) {
    showToast('Slack test failed: ' + err.message, 'error');
  }
}

async function sendTestJiraIssue() {
  const secret = 'cortex_jira_webhook_secret_key_12345';
  const payload = {
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-1042',
      fields: {
        summary: 'Implement rate limiting for public API endpoints',
        project: { key: 'ENG' },
        reporter: {
          accountId: 'jira_acc_101',
          displayName: 'Alice Engineering',
          name: 'alice_jira',
        },
        status: { name: 'In Progress' },
      },
    },
    user: {
      accountId: 'jira_acc_101',
      displayName: 'Alice Engineering',
      name: 'alice_jira',
    },
  };

  const body = JSON.stringify(payload);

  try {
    const data = await api('/api/jira/webhook', {
      method: 'POST',
      headers: {
        'x-jira-webhook-secret': secret,
        'x-atlassian-webhook-identifier': `jira_del_${Date.now()}`,
      },
      body,
    });

    if (data.event) addClientEvent(data.event);
    if (data.person) clientPersons[data.person.id] = data.person;
    loadPersons();
    refreshStatusRow();

    const method = data.resolution?.emailFetchMethod || 'unknown';
    showToast(`Jira event ingested! Email resolved via ${method}.`, 'success');
  } catch (err) {
    showToast('Jira test failed: ' + err.message, 'error');
  }
}

async function invalidateToken(provider) {
  try {
    await api(`/api/connectors/${provider}/invalidate`, { method: 'POST' });
    showToast(`${provider.toUpperCase()} token invalidated! Next API call will trigger "Needs re-auth" flow.`, 'warn');
    addAuditEntry({
      timestamp: Date.now(),
      eventType: 'TOKEN_DELIBERATELY_EXPIRED',
      message: `Simulated token invalidation for ${provider.toUpperCase()} verification testing.`,
    });
    refreshStatusRow();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function checkAllTokens() {
  try {
    const data = await api('/api/connectors/check-all', { method: 'POST' });
    if (data.results) {
      for (const r of data.results) {
        addAuditEntry({
          timestamp: Date.now(),
          eventType: 'TOKEN_HEALTH_CHECK',
          message: `${r.provider.toUpperCase()}: ${r.message}`,
        });
      }
    }
    refreshStatusRow();
    showToast('Token health check complete!', 'info');
  } catch (err) {
    showToast('Check failed: ' + err.message, 'error');
  }
}

async function resetAll() {
  if (!confirm('Reset all connectors, events, and identity data? This will restore first-run setup.')) return;

  try {
    await api('/api/connectors/reset', { method: 'POST' });
    clientEvents = [];
    clientPersons = {};
    clientAuditLogs = [];
    showToast('All data reset. Returning to first-run setup.', 'info');
    location.reload();
  } catch (err) {
    showToast('Reset failed: ' + err.message, 'error');
  }
}

async function refreshStatusRow() {
  try {
    const data = await api('/api/connectors/status');
    renderStatusRow(data.connectors);
  } catch (err) {
    // Silently fail
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────────
async function api(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function hmacSha256(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 4000);
}

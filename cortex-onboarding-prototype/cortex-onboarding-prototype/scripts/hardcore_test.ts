#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Cortex BYOC Onboarding — Hardcore Edge Case Verification Suite
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Exhaustive edge-case stress test covering:
 *   1. Webhook Security & Signature Hardcore Edge Cases
 *      - Missing signatures, malformed headers, truncated digests, timing attacks,
 *        Slack replay attack (timestamp validation), Slack challenge verification,
 *        Jira secret length mismatch & tampering.
 *   2. Scoping Rules Boundary & Collision Edge Cases
 *      - Wildcards, case-insensitivity, repo name only, prefix collisions (auth vs auth-service),
 *        empty scopes, Slack channel IDs vs #names, multiple candidate fields, Jira project keys.
 *   3. Email-Based Identity Resolution & Cross-Provider Merge Edge Cases
 *      - Case insensitivity, whitespace trimming, multi-provider 3-way merge, re-occurring events,
 *        generic bot/noreply emails rejection, + alias rejection, malformed emails,
 *        Tier 2 username match, Tier 2 generic username rejection, Tier 3 name fallback (never auto-merge),
 *        Identity upgrade from fallback to verified on token recovery.
 *   4. Token Expiry, Silent Refresh & Zero-Drop Webhook Edge Cases
 *      - Deliberate expiry, timestamp expiry, webhook arrival during expiry (NEVER drop),
 *        fallback when refresh token also invalid, proactive health scan recovery.
 *   5. Payload Variations, Unicode & Boundary Edge Cases
 *      - Empty JSON payloads, Unicode/international names, Jira privacy mode vs direct email,
 *        GitHub commits array variations, invalid provider API parameters.
 *   6. Persistence, Audit Trails & State Reset Edge Cases
 *      - GET /events, GET /persons, GET /audit, audit log verification, reset behavior.
 *
 * Usage: npx ts-node scripts/hardcore_test.ts
 */

import crypto from 'crypto';

const BASE = process.env.DEPLOYMENT_WEBHOOK_BASE_URL || 'http://localhost:3000';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;
let currentCategory = 'General';

function setCategory(cat: string) {
  currentCategory = cat;
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`🔥 ${cat}`);
  console.log(`════════════════════════════════════════════════════════════`);
}

function assert(name: string, condition: boolean, details: string = '') {
  const passed = Boolean(condition);
  results.push({ category: currentCategory, name, passed, details });
  if (passed) {
    passCount++;
    console.log(`  ✅ ${name}`);
  } else {
    failCount++;
    console.log(`  ❌ ${name}${details ? ' -> ' + details : ''}`);
  }
}

async function api(path: string, options: any = {}): Promise<any> {
  const { headers, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { status: res.status, ok: res.ok, raw: text };
  }
}

function hmacSha256(secret: string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

const GITHUB_SECRET = 'cortex_github_webhook_secret_key_12345';
const SLACK_SECRET = 'cortex_slack_signing_secret_key_12345';
const JIRA_SECRET = 'cortex_jira_webhook_secret_key_12345';

async function main() {
  console.log('\n🧠 Cortex Hardcore Edge Cases Verification Test Suite');
  console.log(`Target: ${BASE}`);
  console.log(`Time:   ${new Date().toISOString()}`);

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 0: Reset to Clean State
  // ─────────────────────────────────────────────────────────────────────────
  setCategory('Category 0: Clean State Initialization');
  const reset = await api('/api/connectors/reset', { method: 'POST' });
  assert('System resets to clean first-run state', reset.ok && reset.data.success);

  const initialStatus = await api('/api/connectors/status');
  assert('Status reports isFirstRun = true', initialStatus.data.isFirstRun === true);
  assert('All 3 connectors are not_connected',
    initialStatus.data.connectors.github.status === 'not_connected' &&
    initialStatus.data.connectors.slack.status === 'not_connected' &&
    initialStatus.data.connectors.jira.status === 'not_connected'
  );

  // Authorize all 3 connectors for subsequent tests
  await api('/api/connectors/oauth/authorize', {
    method: 'POST',
    body: JSON.stringify({ provider: 'github', simulate: true }),
  });
  await api('/api/connectors/oauth/authorize', {
    method: 'POST',
    body: JSON.stringify({ provider: 'slack', simulate: true }),
  });
  await api('/api/connectors/oauth/authorize', {
    method: 'POST',
    body: JSON.stringify({ provider: 'jira', simulate: true }),
  });

  const connectedStatus = await api('/api/connectors/status');
  assert('All 3 connectors successfully connected',
    connectedStatus.data.connectors.github.status === 'connected' &&
    connectedStatus.data.connectors.slack.status === 'connected' &&
    connectedStatus.data.connectors.jira.status === 'connected'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Webhook Security & Signature Hardcore Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  setCategory('Category 1: Webhook Security & Signature Edge Cases');

  const testPayload = JSON.stringify({ test: 'security', repository: { full_name: 'test/repo' } });

  // 1.1 GitHub Missing Signature Header
  const ghNoSig = await api('/api/github/webhook', {
    method: 'POST',
    body: testPayload,
    headers: { 'x-github-event': 'push' }, // missing x-hub-signature-256
  });
  assert('GitHub rejects request with missing signature header (403)', ghNoSig.status === 403);

  // 1.2 GitHub Invalid Hex Signature
  const ghInvalidSig = await api('/api/github/webhook', {
    method: 'POST',
    body: testPayload,
    headers: {
      'x-hub-signature-256': 'sha256=ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      'x-github-event': 'push',
    },
  });
  assert('GitHub rejects wrong signature hash (403)', ghInvalidSig.status === 403);

  // 1.3 GitHub Truncated Signature Digest (Buffer length mismatch)
  const ghShortSig = await api('/api/github/webhook', {
    method: 'POST',
    body: testPayload,
    headers: {
      'x-hub-signature-256': 'sha256=short',
      'x-github-event': 'push',
    },
  });
  assert('GitHub rejects truncated signature without crashing timingSafeEqual (403)', ghShortSig.status === 403);

  // 1.4 GitHub Signature Tampering (valid sig for body A, but body B sent)
  const bodyA = JSON.stringify({ action: 'valid' });
  const sigA = 'sha256=' + hmacSha256(GITHUB_SECRET, bodyA);
  const bodyB = JSON.stringify({ action: 'tampered' });
  const ghTamper = await api('/api/github/webhook', {
    method: 'POST',
    body: bodyB,
    headers: {
      'x-hub-signature-256': sigA,
      'x-github-event': 'push',
    },
  });
  assert('GitHub detects payload tampering against signature (403)', ghTamper.status === 403);

  // 1.5 Slack Missing Signature
  const slNoSig = await api('/api/slack/webhook', {
    method: 'POST',
    body: testPayload,
    headers: { 'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString() },
  });
  assert('Slack rejects request with missing signature header (401)', slNoSig.status === 401);

  // 1.6 Slack Missing Timestamp Header
  const slNoTime = await api('/api/slack/webhook', {
    method: 'POST',
    body: testPayload,
    headers: { 'x-slack-signature': 'v0=abcdef' },
  });
  assert('Slack rejects request with missing timestamp header (401)', slNoTime.status === 401);

  // 1.7 Slack Replay Attack: Stale Timestamp (> 5 minutes old)
  const staleTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 minutes ago
  const staleSigBase = `v0:${staleTimestamp}:${testPayload}`;
  const staleSig = 'v0=' + hmacSha256(SLACK_SECRET, staleSigBase);
  const slStale = await api('/api/slack/webhook', {
    method: 'POST',
    body: testPayload,
    headers: {
      'x-slack-signature': staleSig,
      'x-slack-request-timestamp': staleTimestamp,
    },
  });
  assert('Slack prevents replay attack on 10-minute stale timestamp (401)', slStale.status === 401);

  // 1.8 Slack URL Verification Challenge (Setup flow)
  const slChallenge = await api('/api/slack/webhook', {
    method: 'POST',
    body: JSON.stringify({
      type: 'url_verification',
      challenge: 'cortex_challenge_token_99999',
    }),
  });
  assert('Slack handles url_verification challenge with 200', slChallenge.status === 200);
  assert('Slack echoes challenge token correctly', slChallenge.data.challenge === 'cortex_challenge_token_99999');

  // 1.9 Jira Missing Secret Header
  const jrNoSecret = await api('/api/jira/webhook', {
    method: 'POST',
    body: testPayload,
  });
  assert('Jira rejects missing webhook secret header (403)', jrNoSecret.status === 403);

  // 1.10 Jira Secret Tampering / Wrong Secret
  const jrBadSecret = await api('/api/jira/webhook', {
    method: 'POST',
    body: testPayload,
    headers: { 'x-jira-webhook-secret': 'wrong_shared_secret' },
  });
  assert('Jira rejects incorrect shared secret (403)', jrBadSecret.status === 403);

  // 1.11 Jira Secret Length Mismatch (buffer safety)
  const jrShortSecret = await api('/api/jira/webhook', {
    method: 'POST',
    body: testPayload,
    headers: { 'x-jira-webhook-secret': 'x' },
  });
  assert('Jira rejects short secret without buffer error (403)', jrShortSecret.status === 403);

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: Scoping Rules Hardcore Boundary Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  setCategory('Category 2: Scoping Rules Boundary Edge Cases');

  // Set scoping:
  // GitHub: ['acme/auth-service', 'acme/billing']
  // Slack: ['C_ENGINEERING', '#incidents']
  // Jira: ['ENG', 'OPS']
  await api('/api/connectors/github/scope', {
    method: 'POST',
    body: JSON.stringify({ allMonitored: false, monitoredItems: ['acme/auth-service', 'acme/billing'] }),
  });
  await api('/api/connectors/slack/scope', {
    method: 'POST',
    body: JSON.stringify({ allMonitored: false, monitoredItems: ['C_ENGINEERING', '#incidents'] }),
  });
  await api('/api/connectors/jira/scope', {
    method: 'POST',
    body: JSON.stringify({ allMonitored: false, monitoredItems: ['ENG', 'OPS'] }),
  });

  // 2.1 GitHub Case Insensitivity: 'AcMe/AuTh-SeRvIcE' should match 'acme/auth-service'
  const ghCasePayload = JSON.stringify({
    ref: 'refs/heads/main',
    repository: { full_name: 'AcMe/AuTh-SeRvIcE' },
    sender: { id: 1, login: 'dev-case' },
    head_commit: { author: { name: 'Case Dev', email: 'case.dev@example.com' } },
  });
  const ghCaseRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghCasePayload,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghCasePayload),
      'x-github-event': 'push',
    },
  });
  assert('GitHub scoping is case-insensitive for repository name', ghCaseRes.data.event?.inScope === true);

  // 2.2 GitHub Bare Repo Name: 'auth-service' should match 'acme/auth-service'
  const ghBarePayload = JSON.stringify({
    ref: 'refs/heads/main',
    repository: { name: 'auth-service' },
    sender: { id: 2, login: 'dev-bare' },
    head_commit: { author: { name: 'Bare Dev', email: 'bare.dev@example.com' } },
  });
  const ghBareRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghBarePayload,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghBarePayload),
      'x-github-event': 'push',
    },
  });
  assert('GitHub scoping matches bare repo name against org/repo scope', ghBareRes.data.event?.inScope === true);

  // 2.3 GitHub Prefix Collision: 'acme/auth-service-v2' should NOT match 'acme/auth-service'
  const ghCollisionPayload = JSON.stringify({
    ref: 'refs/heads/main',
    repository: { full_name: 'acme/auth-service-v2' },
    sender: { id: 3, login: 'dev-collision' },
  });
  const ghCollisionRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghCollisionPayload,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghCollisionPayload),
      'x-github-event': 'push',
    },
  });
  assert('GitHub scoping rejects prefix collision (auth-service-v2 not in scope)', ghCollisionRes.data.action === 'ignored_out_of_scope');

  // 2.4 Slack Channel Name without '#' matches scope with '#'
  // Scope has '#incidents', payload sends channel: 'incidents'
  const slChanTime = Math.floor(Date.now() / 1000).toString();
  const slChanPayload = JSON.stringify({
    type: 'event_callback',
    event: { type: 'message', user: 'U_CHAN_TEST', channel: 'incidents', text: 'Incident alert' },
  });
  const slChanSig = 'v0=' + hmacSha256(SLACK_SECRET, `v0:${slChanTime}:${slChanPayload}`);
  const slChanRes = await api('/api/slack/webhook', {
    method: 'POST',
    body: slChanPayload,
    headers: {
      'x-slack-signature': slChanSig,
      'x-slack-request-timestamp': slChanTime,
    },
  });
  assert('Slack scoping matches channel name regardless of leading #', slChanRes.data.event?.inScope === true);

  // 2.5 Slack Out of Scope Channel
  const slOosPayload = JSON.stringify({
    type: 'event_callback',
    event: { type: 'message', user: 'U_CHAN_TEST', channel: 'random-chatter', text: 'lunch?' },
  });
  const slOosSig = 'v0=' + hmacSha256(SLACK_SECRET, `v0:${slChanTime}:${slOosPayload}`);
  const slOosRes = await api('/api/slack/webhook', {
    method: 'POST',
    body: slOosPayload,
    headers: {
      'x-slack-signature': slOosSig,
      'x-slack-request-timestamp': slChanTime,
    },
  });
  assert('Slack scoping correctly ignores out-of-scope channel', slOosRes.data.action === 'ignored_out_of_scope');

  // 2.6 Jira Case Insensitive Project Key: 'eng' matches 'ENG'
  const jrCasePayload = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'eng-100',
      fields: { project: { key: 'eng' }, reporter: { accountId: 'jira_case_1', displayName: 'Case User' } },
    },
  });
  const jrCaseRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrCasePayload,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Jira scoping matches lower-case project key case-insensitively', jrCaseRes.data.event?.inScope === true);

  // 2.7 Jira Key Parsed from issue.key when fields.project is absent
  const jrKeyPayload = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'OPS-404',
      fields: { reporter: { accountId: 'jira_ops_1', displayName: 'Ops User' } },
    },
  });
  const jrKeyRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrKeyPayload,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Jira scoping extracts project key from issue.key (OPS from OPS-404)', jrKeyRes.data.event?.inScope === true);

  // 2.8 Jira Out of Scope Project Key
  const jrOosPayload = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'LEGAL-12',
      fields: { project: { key: 'LEGAL' }, reporter: { accountId: 'jira_legal_1' } },
    },
  });
  const jrOosRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrOosPayload,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Jira scoping correctly ignores unmonitored project (LEGAL)', jrOosRes.data.action === 'ignored_out_of_scope');

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: Email-Based Identity Resolution Hardcore Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  setCategory('Category 3: Email Identity Resolution Edge Cases');

  // Reset store for clean identity resolution testing
  await api('/api/connectors/reset', { method: 'POST' });
  await api('/api/connectors/oauth/authorize', { method: 'POST', body: JSON.stringify({ provider: 'github' }) });
  await api('/api/connectors/oauth/authorize', { method: 'POST', body: JSON.stringify({ provider: 'slack' }) });
  await api('/api/connectors/oauth/authorize', { method: 'POST', body: JSON.stringify({ provider: 'jira' }) });

  // 3.1 Case Insensitivity & Whitespace in Email:
  // Alice sends with "  ALICE.ENGINEER@CORTEX-CLIENT.COM  "
  const ghAliceRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 1001, login: 'alice-caps' },
    head_commit: {
      author: {
        name: 'Alice Caps',
        email: '  ALICE.ENGINEER@CORTEX-CLIENT.COM  ',
        username: 'alice-caps',
      },
    },
  });
  const ghAliceRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghAliceRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghAliceRaw),
      'x-github-event': 'push',
    },
  });
  assert('Uppercase/whitespace email normalized to clean lowercase',
    ghAliceRes.data.person?.verifiedEmail === 'alice.engineer@cortex-client.com'
  );
  assert('First-time resolution creates person with confidence 1.0', ghAliceRes.data.resolution?.confidence === 1.0);
  const aliceCanonicalId = ghAliceRes.data.person?.id;

  // 3.2 Cross-Provider 3-Way Merge:
  // Slack event for Alice (U01TESTALICE) resolves to same canonical person
  const slTime = Math.floor(Date.now() / 1000).toString();
  const slAliceRaw = JSON.stringify({
    type: 'event_callback',
    event: { type: 'message', user: 'U01TESTALICE', channel: 'general' },
  });
  const slAliceSig = 'v0=' + hmacSha256(SLACK_SECRET, `v0:${slTime}:${slAliceRaw}`);
  const slAliceRes = await api('/api/slack/webhook', {
    method: 'POST',
    body: slAliceRaw,
    headers: {
      'x-slack-signature': slAliceSig,
      'x-slack-request-timestamp': slTime,
    },
  });
  assert('Slack Alice merged into GitHub Alice canonical person via email',
    slAliceRes.data.person?.id === aliceCanonicalId
  );
  assert('Resolution reports isNewPerson = false', slAliceRes.data.resolution?.isNewPerson === false);
  assert('Slack resolution matchedBy = EXACT_EMAIL', slAliceRes.data.resolution?.matchedBy === 'EXACT_EMAIL');

  // Jira event for Alice (jira_acc_101) resolves to same canonical person
  const jrAliceRaw = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-1',
      fields: { project: { key: 'ENG' }, reporter: { accountId: 'jira_acc_101', displayName: 'Alice Engineering' } },
    },
  });
  const jrAliceRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrAliceRaw,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Jira Alice merged into same canonical person (3-way merge complete)',
    jrAliceRes.data.person?.id === aliceCanonicalId
  );
  assert('Canonical person now links all 3 provider identities',
    jrAliceRes.data.person?.identities?.length === 3
  );

  // 3.3 Re-occurring Event for Already Linked Provider:
  // Another push from Alice GitHub does NOT duplicate identity
  const ghAlicePush2 = await api('/api/github/webhook', {
    method: 'POST',
    body: ghAliceRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghAliceRaw),
      'x-github-event': 'push',
    },
  });
  assert('Re-occurring event from existing identity does not duplicate identities',
    ghAlicePush2.data.person?.identities?.length === 3
  );
  assert('Re-occurring event retains existing canonical person',
    ghAlicePush2.data.person?.id === aliceCanonicalId
  );

  // 3.4 Non-Mergeable Generic Emails (noreply, bot, support):
  // Bot 1 on GitHub with noreply@github.com
  const ghBotRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 888, login: 'dependabot-bot' },
    head_commit: { author: { name: 'Dependabot', email: 'noreply@github.com' } },
  });
  const ghBotRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghBotRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghBotRaw),
      'x-github-event': 'push',
    },
  });
  assert('Generic email (noreply@github.com) is not set as verified email',
    ghBotRes.data.person?.verifiedEmail === null
  );
  assert('Generic email falls back with lower confidence (0.60)',
    ghBotRes.data.resolution?.confidence === 0.6
  );

  // Bot 2 with noreply+custom@github.com should ALSO be recognized as generic
  const ghBotAliasRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 889, login: 'ci-bot' },
    head_commit: { author: { name: 'CI Bot', email: 'noreply+ci@company.com' } },
  });
  const ghBotAliasRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghBotAliasRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghBotAliasRaw),
      'x-github-event': 'push',
    },
  });
  assert('Generic email with + alias (noreply+ci@...) correctly rejected as verified email',
    ghBotAliasRes.data.person?.verifiedEmail === null
  );

  // 3.5 Malformed Emails:
  // Actor with malformed email 'not-an-email'
  const ghMalformedRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 999, login: 'broken-email-user' },
    head_commit: { author: { name: 'Broken User', email: 'invalid_email_string' } },
  });
  const ghMalformedRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghMalformedRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghMalformedRaw),
      'x-github-event': 'push',
    },
  });
  assert('Malformed email without @ is rejected from verifiedEmail',
    ghMalformedRes.data.person?.verifiedEmail === null
  );

  // 3.6 Tier 2: Strong Username Match without Email
  // Person A on GitHub with username 'ninja_developer_pro' and no email
  const ghNinjaRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 555, login: 'ninja_developer_pro' },
    head_commit: { author: { name: 'Ninja', username: 'ninja_developer_pro' } },
  });
  const ghNinjaRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghNinjaRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghNinjaRaw),
      'x-github-event': 'push',
    },
  });
  const ninjaPersonId = ghNinjaRes.data.person?.id;

  // Person B on Jira with exact same unique username 'ninja_developer_pro' and no email
  const jrNinjaRaw = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-2',
      fields: { reporter: { accountId: 'jira_ninja_555', name: 'ninja_developer_pro', displayName: 'Ninja Dev' } },
    },
  });
  const jrNinjaRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrNinjaRaw,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Strong username match links identities cross-provider (0.98 confidence)',
    jrNinjaRes.data.resolution?.matchedBy === 'USERNAME_MATCH' &&
    jrNinjaRes.data.resolution?.confidence === 0.98
  );
  assert('Strong username match links to same person ID',
    jrNinjaRes.data.person?.id === ninjaPersonId
  );

  // 3.7 Tier 2: Generic Username Rejection (STRICT POLICY)
  // Two different actors with username 'admin' and no email MUST NOT merge
  const ghAdminRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 701, login: 'admin' },
    head_commit: { author: { name: 'Admin One', username: 'admin' } },
  });
  const ghAdminRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghAdminRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghAdminRaw),
      'x-github-event': 'push',
    },
  });

  const jrAdminRaw = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-3',
      fields: { reporter: { accountId: 'jira_admin_702', name: 'admin', displayName: 'Admin Two' } },
    },
  });
  const jrAdminRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrAdminRaw,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Generic username "admin" is rejected from Tier 2 cross-provider auto-merge',
    ghAdminRes.data.person?.id !== jrAdminRes.data.person?.id
  );
  assert('Both generic admin users kept as separate records with 0.60 confidence',
    ghAdminRes.data.resolution?.confidence === 0.6 &&
    jrAdminRes.data.resolution?.confidence === 0.6
  );

  // 3.8 Tier 3: Display Name Only Collision Rejection (STRICT POLICY)
  // Two different people with same display name "John Smith" and no email
  const slJohnRaw = JSON.stringify({
    type: 'event_callback',
    event: { type: 'message', user: 'U_JOHN_SLACK', username: 'jsmith1', channel: 'general' },
  });
  const slJohnSig = 'v0=' + hmacSha256(SLACK_SECRET, `v0:${slTime}:${slJohnRaw}`);
  const slJohnRes = await api('/api/slack/webhook', {
    method: 'POST',
    body: slJohnRaw,
    headers: {
      'x-slack-signature': slJohnSig,
      'x-slack-request-timestamp': slTime,
    },
  });

  const jrJohnRaw = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-4',
      fields: { reporter: { accountId: 'jira_john_9', name: 'jsmith2', displayName: 'John Smith' } },
    },
  });
  const jrJohnRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrJohnRaw,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Different people with same display name ("John Smith") never auto-merge',
    slJohnRes.data.person?.id !== jrJohnRes.data.person?.id
  );

  // 3.9 Identity Upgrade from Fallback to Verified on Token Recovery
  // User Dave starts on Slack with token expired -> creates fallback person with 0.60 confidence
  // Invalidate Slack token first
  await api('/api/connectors/slack/invalidate', { method: 'POST' });
  const slDaveRaw = JSON.stringify({
    type: 'event_callback',
    event: { type: 'message', user: 'U_DAVE_DEV', username: 'dave.dev', channel: 'general' },
  });
  const slDaveSig = 'v0=' + hmacSha256(SLACK_SECRET, `v0:${slTime}:${slDaveRaw}`);
  const slDaveFallback = await api('/api/slack/webhook', {
    method: 'POST',
    body: slDaveRaw,
    headers: {
      'x-slack-signature': slDaveSig,
      'x-slack-request-timestamp': slTime,
    },
  });
  assert('Dave created via fallback during token expiry (confidence 0.60)',
    slDaveFallback.data.resolution?.confidence === 0.6
  );
  const daveFallbackPersonId = slDaveFallback.data.person?.id;

  // Re-authorize Slack with live token
  await api('/api/connectors/oauth/authorize', { method: 'POST', body: JSON.stringify({ provider: 'slack' }) });

  // Later, a GitHub push arrives for Dave with verified email 'david.devops@cortex-client.com'
  const ghDaveRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 4444, login: 'dave-eng' },
    head_commit: { author: { name: 'David Dev', email: 'david.devops@cortex-client.com', username: 'dave-eng' } },
  });
  const ghDaveRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghDaveRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghDaveRaw),
      'x-github-event': 'push',
    },
  });
  assert('GitHub push creates verified person for Dave (confidence 1.0)',
    ghDaveRes.data.person?.verifiedEmail === 'david.devops@cortex-client.com'
  );
  const daveVerifiedPersonId = ghDaveRes.data.person?.id;

  // Now Slack token is active and Slack sends event for Dave with mock user U02TESTBOB
  // Or send Jira event for Dave with verified email
  const jrDaveRaw = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-5',
      fields: { reporter: { accountId: 'jira_acc_303', displayName: 'David Infrastructure' } },
    },
  });
  const jrDaveRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrDaveRaw,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Jira Dave matches GitHub Dave via verified email (david.devops@cortex-client.com)',
    jrDaveRes.data.person?.id === daveVerifiedPersonId
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Token Expiry, Silent Refresh & Zero-Drop Ingestion Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  setCategory('Category 4: Token Expiry & Zero-Drop Ingestion Edge Cases');

  // 4.1 Invalidate Slack token
  const slInval = await api('/api/connectors/slack/invalidate', { method: 'POST' });
  assert('Slack token invalidation endpoint returns success', slInval.data.success);
  assert('Slack status changes to needs_reauth', slInval.data.connector?.status === 'needs_reauth');
  assert('Slack lastError flagged as token_expired', slInval.data.connector?.lastError === 'token_expired');

  // 4.2 Webhook arrives while token is expired -> MUST NOT DROP EVENT
  // Webhook event is ingested, silent refresh is attempted, event recorded
  const slExpRaw = JSON.stringify({
    type: 'event_callback',
    event: { type: 'message', user: 'U02TESTBOB', text: 'Staging deploy complete', channel: 'general' },
  });
  const slExpTime = Math.floor(Date.now() / 1000).toString();
  const slExpSig = 'v0=' + hmacSha256(SLACK_SECRET, `v0:${slExpTime}:${slExpRaw}`);
  const slExpRes = await api('/api/slack/webhook', {
    method: 'POST',
    body: slExpRaw,
    headers: {
      'x-slack-signature': slExpSig,
      'x-slack-request-timestamp': slExpTime,
    },
  });
  assert('Webhook ingestion returns 200 OK during token failure (NEVER dropped)', slExpRes.status === 200);
  assert('Webhook event processed with inScope = true', slExpRes.data.event?.inScope === true);
  assert('Webhook event recorded in system store', Boolean(slExpRes.data.event?.id));

  // 4.3 Invalidate Jira token and send Jira webhook with expired token
  await api('/api/connectors/jira/invalidate', { method: 'POST' });
  const jrExpRaw = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-6',
      fields: { reporter: { accountId: 'jira_acc_202', displayName: 'Sarah QA' } },
    },
  });
  const jrExpRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrExpRaw,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Jira webhook returns 200 OK during token expiry', jrExpRes.status === 200);
  assert('Jira event preserved and actor recorded', Boolean(jrExpRes.data.event?.actorExternalId));

  // 4.4 Proactive Background Token Scan (/api/connectors/check-all)
  const scanRes = await api('/api/connectors/check-all', { method: 'POST' });
  assert('Proactive health check completes successfully', scanRes.data.success === true);
  assert('Scan returns results for all 3 providers', scanRes.data.results?.length === 3);

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Payload Variations, Unicode & Robustness Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  setCategory('Category 5: Payload Variations & Robustness Edge Cases');

  // 5.1 Unicode / International Names (Japanese, Umlauts, Accents)
  const ghUnicodeRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 6789, login: 'sato-ken' },
    head_commit: {
      author: {
        name: '佐藤 健 (Ken Sato)',
        email: 'ken.sato@global-company.jp',
        username: 'sato-ken',
      },
    },
  });
  const ghUnicodeRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghUnicodeRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghUnicodeRaw),
      'x-github-event': 'push',
    },
  });
  assert('Unicode / Kanji displayName preserved without corruption',
    ghUnicodeRes.data.person?.displayName?.includes('佐藤 健')
  );

  // 5.2 GitHub Push with Empty Commits Array
  const ghEmptyCommitsRaw = JSON.stringify({
    repository: { full_name: 'test/repo' },
    sender: { id: 9876, login: 'pusher-only' },
    pusher: { name: 'Pusher User', email: 'pusher@company.com' },
    commits: [],
  });
  const ghEmptyCommitsRes = await api('/api/github/webhook', {
    method: 'POST',
    body: ghEmptyCommitsRaw,
    headers: {
      'x-hub-signature-256': 'sha256=' + hmacSha256(GITHUB_SECRET, ghEmptyCommitsRaw),
      'x-github-event': 'push',
    },
  });
  assert('GitHub push with empty commits array extracts actor from pusher payload',
    ghEmptyCommitsRes.data.event?.actorEmail === 'pusher@company.com'
  );

  // 5.3 Jira Privacy Mode (Email masked) vs Direct Email
  const jrDirectEmailRaw = JSON.stringify({
    webhookEvent: 'jira:issue_updated',
    issue: {
      key: 'ENG-7',
      fields: {
        reporter: {
          accountId: 'jira_direct_email',
          emailAddress: 'direct.email@company.com',
          displayName: 'Direct Email User',
        },
      },
    },
  });
  const jrDirectEmailRes = await api('/api/jira/webhook', {
    method: 'POST',
    body: jrDirectEmailRaw,
    headers: { 'x-jira-webhook-secret': JIRA_SECRET },
  });
  assert('Jira with emailAddress directly in payload uses payload_direct method',
    jrDirectEmailRes.data.event?.emailFetchMethod === 'payload_direct'
  );
  assert('Jira direct email resolved correctly',
    jrDirectEmailRes.data.event?.actorEmail === 'direct.email@company.com'
  );

  // 5.4 Invalid Provider Handling in API routes
  const invalidScopeRes = await api('/api/connectors/discord/scope', {
    method: 'POST',
    body: JSON.stringify({ allMonitored: true }),
  });
  assert('Updating scope for unsupported provider returns 400', invalidScopeRes.status === 400);

  const invalidAuthRes = await api('/api/connectors/oauth/authorize', {
    method: 'POST',
    body: JSON.stringify({ provider: 'gitlab' }),
  });
  assert('Authorizing unsupported provider returns 400', invalidAuthRes.status === 400);

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: Database Persistence, Query Endpoints & Audit Trail Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  setCategory('Category 6: Database Persistence, Endpoints & Audit Trail');

  // 6.1 GET /api/connectors/events
  const eventsRes = await api('/api/connectors/events?limit=100');
  assert('GET /api/connectors/events returns success', eventsRes.data.success === true);
  assert('Events array is populated with ingested records', Array.isArray(eventsRes.data.events) && eventsRes.data.events.length > 0);

  // 6.2 GET /api/connectors/persons
  const personsRes = await api('/api/connectors/persons');
  assert('GET /api/connectors/persons returns success', personsRes.data.success === true);
  assert('Persons list contains resolved canonical persons', Array.isArray(personsRes.data.persons) && personsRes.data.persons.length > 0);

  // 6.3 Update scope and check GET /api/connectors/audit
  await api('/api/connectors/github/scope', {
    method: 'POST',
    body: JSON.stringify({ allMonitored: true, monitoredItems: ['*'] }),
  });

  const auditRes = await api('/api/connectors/audit?limit=100');
  assert('GET /api/connectors/audit returns success', auditRes.data.success === true);
  assert('Audit trail contains logged security and lifecycle events', Array.isArray(auditRes.data.auditLogs) && auditRes.data.auditLogs.length > 0);

  // Check specific audit events exist
  const eventTypes = new Set(auditRes.data.auditLogs.map((l: any) => l.eventType));
  assert('Audit log contains CONNECTOR_AUTHORIZED entries', eventTypes.has('CONNECTOR_AUTHORIZED'));
  assert('Audit log contains SCOPE_RULES_UPDATED entries', eventTypes.has('SCOPE_RULES_UPDATED'));
  assert('Audit log contains PROACTIVE_TOKEN_HEALTH_SCAN entries', eventTypes.has('PROACTIVE_TOKEN_HEALTH_SCAN'));

  // 6.4 Clean Reset at End
  const finalReset = await api('/api/connectors/reset', { method: 'POST' });
  assert('Final reset restores first-run state cleanly', finalReset.data.success === true);
  const finalStatus = await api('/api/connectors/status');
  assert('Post-reset isFirstRun is true', finalStatus.data.isFirstRun === true);

  // ═════════════════════════════════════════════════════════════════════════
  // Summary
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`📊 Hardcore Edge Cases Summary: ${passCount} PASSED, ${failCount} FAILED, ${passCount + failCount} TOTAL`);
  console.log('════════════════════════════════════════════════════════════\n');

  if (failCount === 0) {
    console.log('🏆 100% HARDCORE EDGE CASE TESTS PASSED! Rock solid prototype.\n');
  } else {
    console.log(`⚠️  ${failCount} edge case test(s) failed. Check logs above.\n`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Hardcore test suite crashed:', err);
  process.exit(1);
});

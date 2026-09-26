import { Router } from 'express';
import crypto from 'crypto';
import { store } from '../db/store.js';
import { connectorService } from '../services/connector.service.js';
import { identityService } from '../services/identity.service.js';
import { providerApis } from '../services/providerApis.service.js';
export const webhooksRouter = Router();
function parseWebhookRequest(req) {
    let rawBody;
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        rawBody = req.rawBody;
    }
    else if (Buffer.isBuffer(req.body)) {
        rawBody = req.body;
    }
    else if (typeof req.body === 'string') {
        rawBody = Buffer.from(req.body, 'utf-8');
    }
    else if (req.body && typeof req.body === 'object') {
        rawBody = Buffer.from(JSON.stringify(req.body), 'utf-8');
    }
    else {
        rawBody = Buffer.from('', 'utf-8');
    }
    let payload = {};
    if (Buffer.isBuffer(req.body)) {
        try {
            payload = JSON.parse(req.body.toString('utf-8'));
        }
        catch {
            payload = {};
        }
    }
    else if (typeof req.body === 'string') {
        try {
            payload = JSON.parse(req.body);
        }
        catch {
            payload = {};
        }
    }
    else if (req.body && typeof req.body === 'object') {
        payload = req.body;
    }
    return { rawBody, payload };
}
// ─── GitHub Webhook ────────────────────────────────────────────────────────
// Authenticated via X-Hub-Signature-256 header (HMAC SHA-256)
webhooksRouter.post('/github/webhook', async (req, res) => {
    try {
        const { rawBody, payload } = parseWebhookRequest(req);
        const signature = req.headers['x-hub-signature-256'];
        const deliveryId = req.headers['x-github-delivery'] || `gh_del_${Date.now()}`;
        const eventType = req.headers['x-github-event'] || 'push';
        // 1. Signature Verification (Uses GITHUB_WEBHOOK_SECRET, NOT OAuth access token)
        const secret = process.env.GITHUB_WEBHOOK_SECRET || 'cortex_github_webhook_secret_key_12345';
        if (secret) {
            if (!signature) {
                console.warn('[Security] GitHub Missing HMAC Signature');
                return res.status(403).json({ error: 'Forbidden: Missing GitHub signature (x-hub-signature-256)' });
            }
            const hmac = crypto.createHmac('sha256', secret);
            const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
            try {
                const isValid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
                if (!isValid) {
                    console.warn('[Security] GitHub Invalid HMAC Signature');
                    return res.status(403).json({ error: 'Forbidden: Invalid GitHub signature' });
                }
            }
            catch (e) {
                return res.status(403).json({ error: 'Forbidden: Signature format mismatch' });
            }
        }
        // 2. Scoping Filter Check (respects user-configured repo scope)
        const scopeCheck = connectorService.checkEventScope('github', payload);
        if (!scopeCheck.inScope) {
            console.log(`[GitHub Ingest] ⏩ Event skipped: ${scopeCheck.reason}`);
            const skippedRecord = {
                id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                provider: 'github',
                eventType,
                deliveryId,
                actorExternalId: payload.sender?.login || 'unknown',
                actorUsername: payload.sender?.login,
                actorDisplayName: payload.pusher?.name || payload.sender?.login,
                actorEmail: null,
                emailFetchMethod: 'payload_direct',
                inScope: false,
                scopeReason: scopeCheck.reason,
                resolvedPersonId: null,
                rawPayload: payload,
                createdAt: Date.now(),
            };
            store.addEvent(skippedRecord);
            return res.status(200).json({
                success: true,
                action: 'ignored_out_of_scope',
                reason: scopeCheck.reason,
            });
        }
        // 3. Actor Identifier & Email Extraction (GitHub: commit author email IS in payload)
        const headCommit = payload.head_commit || (payload.commits && payload.commits[0]);
        const actorEmail = headCommit?.author?.email || payload.pusher?.email || payload.sender?.email || null;
        const actorUsername = payload.sender?.login || headCommit?.author?.username;
        const actorDisplayName = headCommit?.author?.name || payload.pusher?.name || actorUsername || 'GitHub User';
        const actorExternalId = payload.sender?.id ? String(payload.sender.id) : (actorUsername || actorEmail || 'github_actor');
        // 4. Identity Resolution via CanonicalPerson Service
        const resolution = identityService.resolveIdentity({
            provider: 'github',
            externalId: actorExternalId,
            email: actorEmail,
            username: actorUsername,
            displayName: actorDisplayName,
        });
        // 5. Record Event in Relational Store
        const eventRecord = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            provider: 'github',
            eventType,
            deliveryId,
            actorExternalId,
            actorUsername,
            actorDisplayName,
            actorEmail,
            emailFetchMethod: 'payload_direct',
            inScope: true,
            scopeReason: scopeCheck.reason,
            resolvedPersonId: resolution.canonicalPersonId,
            resolutionMatchedBy: resolution.matchedBy,
            confidence: resolution.confidence,
            rawPayload: payload,
            createdAt: Date.now(),
        };
        store.addEvent(eventRecord);
        store.incrementEventCount('github');
        res.status(200).json({
            success: true,
            event: eventRecord,
            person: resolution.person,
            resolution: {
                matchedBy: resolution.matchedBy,
                confidence: resolution.confidence,
                isNewPerson: resolution.isNewPerson,
                reason: resolution.reason,
            },
        });
    }
    catch (err) {
        console.error('[Webhooks:GitHub] Error:', err);
        res.status(500).json({ error: err?.message });
    }
});
// ─── Slack Webhook ─────────────────────────────────────────────────────────
// Authenticated via X-Slack-Signature & X-Slack-Request-Timestamp
webhooksRouter.post('/slack/webhook', async (req, res) => {
    try {
        const { rawBody, payload } = parseWebhookRequest(req);
        const timestamp = req.headers['x-slack-request-timestamp'];
        const signature = req.headers['x-slack-signature'];
        // Slack URL Verification Challenge
        if (payload.type === 'url_verification') {
            return res.status(200).json({ challenge: payload.challenge });
        }
        // 1. Signature Verification (Uses SLACK_SIGNING_SECRET, NOT OAuth access token)
        const secret = process.env.SLACK_SIGNING_SECRET || 'cortex_slack_signing_secret_key_12345';
        if (secret) {
            if (!signature || !timestamp) {
                console.warn('[Security] Slack Missing Signature or Timestamp Header');
                return res.status(401).json({ error: 'Unauthorized: Missing Slack signature or timestamp header' });
            }
            // Replay attack prevention: check timestamp is within 5 minutes (300 seconds)
            const nowSec = Math.floor(Date.now() / 1000);
            const reqSec = parseInt(timestamp, 10);
            if (isNaN(reqSec) || Math.abs(nowSec - reqSec) > 300) {
                console.warn('[Security] Slack Request Timestamp Expired / Stale (potential replay attack)');
                return res.status(401).json({ error: 'Unauthorized: Slack request timestamp expired or invalid' });
            }
            const sigBase = `v0:${timestamp}:${rawBody.toString()}`;
            const hmac = crypto.createHmac('sha256', secret);
            const digest = 'v0=' + hmac.update(sigBase).digest('hex');
            try {
                const isValid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
                if (!isValid) {
                    console.warn('[Security] Slack Invalid HMAC Signature');
                    return res.status(401).json({ error: 'Unauthorized: Invalid Slack signature' });
                }
            }
            catch (e) {
                return res.status(401).json({ error: 'Unauthorized: Slack signature format mismatch' });
            }
        }
        // 2. Scoping Filter Check (respects user-configured channel scope)
        const scopeCheck = connectorService.checkEventScope('slack', payload);
        const slackEvent = payload.event || payload;
        const userId = slackEvent.user || payload.user_id || 'unknown_slack_user';
        if (!scopeCheck.inScope) {
            console.log(`[Slack Ingest] ⏩ Event skipped: ${scopeCheck.reason}`);
            const skippedRecord = {
                id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                provider: 'slack',
                eventType: slackEvent.type || 'message',
                deliveryId: payload.event_id || `slack_del_${Date.now()}`,
                actorExternalId: userId,
                actorUsername: slackEvent.username || userId,
                actorDisplayName: userId,
                actorEmail: null,
                emailFetchMethod: 'api_lookup',
                inScope: false,
                scopeReason: scopeCheck.reason,
                resolvedPersonId: null,
                rawPayload: payload,
                createdAt: Date.now(),
            };
            store.addEvent(skippedRecord);
            return res.status(200).json({
                success: true,
                action: 'ignored_out_of_scope',
                reason: scopeCheck.reason,
            });
        }
        // 3. Email-Fetch API Call for Slack (users.info with stored access token)
        const conn = store.getConnector('slack');
        let userEmail = null;
        let userDisplayName = slackEvent.username || userId;
        let username = slackEvent.username || userId;
        let emailFetchMethod = 'api_lookup';
        try {
            if (!conn.accessToken) {
                throw new Error('No Slack access token available in deployment');
            }
            // Call Slack users.info API using stored token
            const profile = await providerApis.fetchSlackUser(userId, conn.accessToken);
            userEmail = profile.email;
            userDisplayName = profile.displayName || userDisplayName;
            username = (slackEvent.username && slackEvent.username !== userId) ? slackEvent.username : profile.username;
        }
        catch (apiErr) {
            console.warn(`[Slack Ingest] API email-fetch failed for user ${userId}:`, apiErr?.message);
            // PART 3: Token Expiry Handling
            // 1. Attempt silent refresh or flag token_expired and set status to "needs_reauth"
            const refreshResult = await connectorService.handleTokenFailure('slack', apiErr);
            if (refreshResult.refreshed && refreshResult.newAccessToken) {
                // Retry with refreshed token!
                try {
                    const retriedProfile = await providerApis.fetchSlackUser(userId, refreshResult.newAccessToken);
                    userEmail = retriedProfile.email;
                    userDisplayName = retriedProfile.displayName;
                    username = retriedProfile.username;
                }
                catch (retryErr) {
                    console.warn('[Slack Ingest] Retry after silent refresh failed, falling back to name matching:', retryErr?.message);
                    emailFetchMethod = 'fallback_failed';
                }
            }
            else {
                // Silent refresh failed/unavailable: proceed to name-based fallback (DO NOT DROP EVENT)
                emailFetchMethod = 'fallback_failed';
            }
        }
        // 4. Identity Resolution via CanonicalPerson Service
        const resolution = identityService.resolveIdentity({
            provider: 'slack',
            externalId: userId,
            email: userEmail,
            username,
            displayName: userDisplayName,
        });
        // 5. Store Event Record
        const eventRecord = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            provider: 'slack',
            eventType: slackEvent.type || 'message',
            deliveryId: payload.event_id || `slack_del_${Date.now()}`,
            actorExternalId: userId,
            actorUsername: username,
            actorDisplayName: userDisplayName,
            actorEmail: userEmail,
            emailFetchMethod,
            inScope: true,
            scopeReason: scopeCheck.reason,
            resolvedPersonId: resolution.canonicalPersonId,
            resolutionMatchedBy: resolution.matchedBy,
            confidence: resolution.confidence,
            rawPayload: payload,
            createdAt: Date.now(),
        };
        store.addEvent(eventRecord);
        store.incrementEventCount('slack');
        res.status(200).json({
            success: true,
            event: eventRecord,
            person: resolution.person,
            resolution: {
                matchedBy: resolution.matchedBy,
                confidence: resolution.confidence,
                isNewPerson: resolution.isNewPerson,
                reason: resolution.reason,
                emailFetchMethod,
            },
        });
    }
    catch (err) {
        console.error('[Webhooks:Slack] Error:', err);
        res.status(500).json({ error: err?.message });
    }
});
// ─── Jira Webhook ──────────────────────────────────────────────────────────
// Authenticated via x-jira-webhook-secret header
webhooksRouter.post('/jira/webhook', async (req, res) => {
    try {
        const { rawBody, payload } = parseWebhookRequest(req);
        const rawSecretHeader = req.headers['x-jira-webhook-secret'] || '';
        const secret = process.env.JIRA_WEBHOOK_SECRET || 'cortex_jira_webhook_secret_key_12345';
        // 1. Signature / Shared Secret Verification (Delivery not token-gated)
        if (secret) {
            if (!rawSecretHeader) {
                console.warn('[Security] Jira Missing Webhook Secret Header');
                return res.status(403).json({ error: 'Forbidden: Missing Jira webhook secret header (x-jira-webhook-secret)' });
            }
            const expected = Buffer.from(secret);
            const received = Buffer.from(rawSecretHeader);
            const isValid = expected.length === received.length && crypto.timingSafeEqual(expected, received);
            if (!isValid) {
                console.warn('[Security] Jira Invalid Webhook Secret Header');
                return res.status(403).json({ error: 'Forbidden: Invalid Jira webhook secret' });
            }
        }
        // 2. Scoping Filter Check (respects user-configured project scope)
        const scopeCheck = connectorService.checkEventScope('jira', payload);
        const issue = payload.issue || {};
        const reporter = issue.fields?.reporter || issue.fields?.assignee || issue.fields?.creator || payload.user || {};
        const accountId = reporter.accountId || reporter.key || reporter.name || 'unknown_jira_user';
        if (!scopeCheck.inScope) {
            console.log(`[Jira Ingest] ⏩ Event skipped: ${scopeCheck.reason}`);
            const skippedRecord = {
                id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                provider: 'jira',
                eventType: payload.webhookEvent || 'jira:issue_updated',
                deliveryId: req.headers['x-atlassian-webhook-identifier'] || `jira_del_${Date.now()}`,
                actorExternalId: accountId,
                actorUsername: reporter.name || accountId,
                actorDisplayName: reporter.displayName || accountId,
                actorEmail: null,
                emailFetchMethod: 'api_lookup',
                inScope: false,
                scopeReason: scopeCheck.reason,
                resolvedPersonId: null,
                rawPayload: payload,
                createdAt: Date.now(),
            };
            store.addEvent(skippedRecord);
            return res.status(200).json({
                success: true,
                action: 'ignored_out_of_scope',
                reason: scopeCheck.reason,
            });
        }
        // 3. Email-Fetch API Call for Jira (Jira user API with stored token)
        const conn = store.getConnector('jira');
        let userEmail = reporter.emailAddress || null;
        let userDisplayName = reporter.displayName || reporter.name || accountId;
        let username = reporter.name || accountId;
        let emailFetchMethod = userEmail
            ? 'payload_direct'
            : 'api_lookup';
        // If email is not in payload (standard Jira Cloud privacy mode), fetch via user API
        if (!userEmail) {
            try {
                if (!conn.accessToken) {
                    throw new Error('No Jira access token available in deployment');
                }
                const profile = await providerApis.fetchJiraUser(accountId, conn.accessToken);
                userEmail = profile.email;
                userDisplayName = profile.displayName || userDisplayName;
                username = (reporter.name && reporter.name !== accountId) ? reporter.name : profile.username;
            }
            catch (apiErr) {
                console.warn(`[Jira Ingest] API email-fetch failed for accountId ${accountId}:`, apiErr?.message);
                // PART 3: Token Expiry Handling
                const refreshResult = await connectorService.handleTokenFailure('jira', apiErr);
                if (refreshResult.refreshed && refreshResult.newAccessToken) {
                    try {
                        const retriedProfile = await providerApis.fetchJiraUser(accountId, refreshResult.newAccessToken);
                        userEmail = retriedProfile.email;
                        userDisplayName = retriedProfile.displayName;
                        username = retriedProfile.username;
                    }
                    catch (retryErr) {
                        console.warn('[Jira Ingest] Retry after silent refresh failed, falling back to name:', retryErr?.message);
                        emailFetchMethod = 'fallback_failed';
                    }
                }
                else {
                    emailFetchMethod = 'fallback_failed';
                }
            }
        }
        // 4. Identity Resolution via CanonicalPerson Service
        const resolution = identityService.resolveIdentity({
            provider: 'jira',
            externalId: accountId,
            email: userEmail,
            username,
            displayName: userDisplayName,
        });
        // 5. Store Event Record
        const eventRecord = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            provider: 'jira',
            eventType: payload.webhookEvent || 'jira:issue_updated',
            deliveryId: req.headers['x-atlassian-webhook-identifier'] || `jira_del_${Date.now()}`,
            actorExternalId: accountId,
            actorUsername: username,
            actorDisplayName: userDisplayName,
            actorEmail: userEmail,
            emailFetchMethod,
            inScope: true,
            scopeReason: scopeCheck.reason,
            resolvedPersonId: resolution.canonicalPersonId,
            resolutionMatchedBy: resolution.matchedBy,
            confidence: resolution.confidence,
            rawPayload: payload,
            createdAt: Date.now(),
        };
        store.addEvent(eventRecord);
        store.incrementEventCount('jira');
        res.status(200).json({
            success: true,
            event: eventRecord,
            person: resolution.person,
            resolution: {
                matchedBy: resolution.matchedBy,
                confidence: resolution.confidence,
                isNewPerson: resolution.isNewPerson,
                reason: resolution.reason,
                emailFetchMethod,
            },
        });
    }
    catch (err) {
        console.error('[Webhooks:Jira] Error:', err);
        res.status(500).json({ error: err?.message });
    }
});

import crypto from 'crypto'
import env from '../../config/env.js'
import sql from '../../config/postgres.js'

export async function validateSlackSignature(timestamp: string | undefined, signature: string | undefined, rawBody: Buffer | undefined): Promise<boolean> {
    let secret = env.SLACK_SECRET;

    // Check database integrations table if .env has dummy placeholder or is empty
    if (!secret || secret === 'cortex_test_secret_2026') {
        try {
            const [conn] = await sql`SELECT webhook_secret FROM integrations WHERE provider = 'slack'`;
            if (conn?.webhook_secret) {
                secret = conn.webhook_secret;
            }
        } catch (dbErr: any) {
            console.warn('[Slack Validator] DB lookup failed:', dbErr?.message);
        }
    }

    if (!secret) {
        console.warn(`Slack Signing Secret is Not Provided`);
        return false;
    }

    if (!signature || !timestamp) {
        console.warn(`No Slack Signature or Timestamp Provided`);
        return false;
    }

    if (!rawBody) {
        console.warn(`No Raw Body Available For Signature Verification`);
        return false;
    }

    // Request older than 5 Minutes auto reject prevent replay attack
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - Number(timestamp)) > 60 * 5) {
        console.warn(`Slack Request Timestamp Too Old`);
        return false;
    }

    const sigBaseString = `v0:${timestamp}:${rawBody.toString()}`;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'v0=' + hmac.update(sigBaseString).digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch (error: any) {
        return false;
    }
}
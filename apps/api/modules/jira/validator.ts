import { Request } from "express"
import crypto from "crypto"
import env from "../../config/env.js"
import sql from "../../config/postgres.js"

const JIRA_WEBHOOK_SECRET_HEADER = "x-jira-webhook-secret"

/**
 * Validates the shared secret supplied in the Jira webhook request header.
 * Checks ENV first, then falls back to PostgreSQL integrations.webhook_secret.
 */
export async function validateJiraSignature(req: Request): Promise<boolean> {
    let secret = env.JIRA_SECRET

    if (!secret || secret === 'cortex_test_secret_2026') {
        try {
            const [conn] = await sql`SELECT webhook_secret FROM integrations WHERE provider = 'jira'`;
            if (conn?.webhook_secret) {
                secret = conn.webhook_secret;
            }
        } catch (dbErr) {
            console.warn('[Jira Webhook] Could not query database for webhook_secret:', dbErr);
        }
    }

    const providerSecret = req.get(JIRA_WEBHOOK_SECRET_HEADER)

    if (!secret || !providerSecret) {
        return false
    }

    const expected = Buffer.from(secret)
    const received = Buffer.from(providerSecret)

    return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

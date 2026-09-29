import crypto from 'crypto'
import env from '../../config/env.js'
import sql from '../../config/postgres.js'

/**
 * Verify Signature From GitHub Webhook
 * Checks For Timing is Safe or Not
 */
export async function validateGithubSignature(signature: string | undefined, rawBody: Buffer | undefined): Promise<boolean> {
    let secret = env.GITHUB_SECRET;

    // Check database integrations table if .env has dummy placeholder or is empty
    if (!secret || secret === 'cortex_test_secret_2026') {
        try {
            const [conn] = await sql`SELECT webhook_secret FROM integrations WHERE provider = 'github'`;
            if (conn?.webhook_secret) {
                secret = conn.webhook_secret;
            }
        } catch (dbErr: any) {
            console.warn('[GitHub Validator] DB lookup failed:', dbErr?.message);
        }
    }

    if (!secret) {
        console.warn(`Github Secret Key is Not Provided`);
        return false;
    }

    if (!signature) {
        console.warn(`No Github Signature Provide`);
        return false;
    }

    if (!rawBody) {
        console.warn(`No Raw Body Available For Signature Verification`);
        return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch (error: any) {
        return false;
    }
}
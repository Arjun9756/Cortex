import crypto from 'crypto'
import env from '../../config/env.js'
import sql from '../../config/postgres.js'
import { decryptSecret } from '../../../../packages/shared/encryption.js'

/**
 * Verify Signature From GitHub Webhook
 * Checks For Timing is Safe or Not
 */
export async function validateGithubSignature(signature: string | undefined, rawBody: Buffer | undefined): Promise<boolean> {
    let secret: string | undefined = '';
    try {
        const [conn] = await sql`SELECT webhook_secret FROM integrations WHERE provider = 'github'`;
        if (conn?.webhook_secret) {
            secret = decryptSecret(conn.webhook_secret) || conn.webhook_secret;
        }
    } catch (dbErr: any) {
        console.warn('[GitHub Validator] DB lookup failed:', dbErr?.message);
    }

    if (!secret) {
        secret = env.GITHUB_SECRET;
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
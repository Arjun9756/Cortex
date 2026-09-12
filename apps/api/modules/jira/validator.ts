import { Request } from "express"
import crypto from "crypto"
import env from "../../config/env.js"

const JIRA_WEBHOOK_SECRET_HEADER = "x-jira-webhook-secret"

/**
 * Validates the shared secret supplied in the Jira webhook request header.
 * The secret must never be accepted from query parameters, which are commonly
 * retained in URL, proxy, and referrer logs.
 */
export function validateJiraSignature(req: Request): boolean {
    const secret = env.JIRA_SECRET
    const providerSecret = req.get(JIRA_WEBHOOK_SECRET_HEADER)

    if (!secret || !providerSecret) {
        return false
    }

    const expected = Buffer.from(secret)
    const received = Buffer.from(providerSecret)

    return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

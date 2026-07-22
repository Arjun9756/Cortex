import crypto from 'crypto'
import env from '../../config/env.js'

export function validateSlackSignature(timestamp:string | undefined , signature:string | undefined , rawBody:Buffer | undefined):boolean{
    const secret = env.SLACK_SECRET
    if (!secret) {
        console.warn(`Slack Signing Secret is Not Provided`)
        return false
    }

    if (!signature || !timestamp) {
        console.warn(`No Slack Signature or Timestamp Provided`)
        return false
    }

    if (!rawBody) {
        console.warn(`No Raw Body Available For Signature Verification`)
        return false
    }

    // Request older than 5 Minutes auto reject prevent replay attack
    const currentTime = Math.floor(Date.now() / 1000)
    if (Math.abs(currentTime - Number(timestamp)) > 60 * 5) {
        console.warn(`Slack Request Timestamp Too Old`)
        return false
    }

    const sigBaseString = `v0:${timestamp}:${rawBody.toString()}`
    const hmac = crypto.createHmac('sha256', secret)
    const digest = 'v0=' + hmac.update(sigBaseString).digest('hex')

    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
    } catch (error: any) {
        return false
    }
}
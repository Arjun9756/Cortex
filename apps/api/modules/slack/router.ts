import express from 'express'
import { validateSlackSignature } from './validator.js'
import { ISlackParsedEvent, parseSlackEvent } from './normalize.js'
import { pushSlackEventToDatabase } from './controller.js'
import { sourceForWebhookRequest } from '../../../../packages/database/provenance.js'

const router = express.Router()
router.post('/webhook', async (req, res) => {
    const payload = req.body
    console.log('[Slack Webhook] Incoming request received:', payload?.type || 'unknown', payload?.event?.type || '');

    if (payload.type == 'url_verification') {
        console.log('[Slack Webhook] URL verification challenge received, verifying...');
        return res.status(200).json({
            challenge: payload.challenge
        })
    }

    // 1. Extract Slack Headers
    const timestamp = req.headers['x-slack-request-timestamp'] as string
    const signature = req.headers['x-slack-signature'] as string

    // 2. Verify Slack Signature
    if (!(await validateSlackSignature(timestamp, signature, req.rawBody))) {
        console.warn(`[Slack Webhook] Invalid Slack Signature for timestamp ${timestamp}`)
        return res.status(401).json({ message: "Unauthorized" })
    }

    const parsedEvent: ISlackParsedEvent | null = parseSlackEvent(payload.event?.type, payload.event, payload.event_id)
    if (parsedEvent === null) {
        console.warn('[Slack Webhook] Ignored unhandled Slack event subtype:', payload.event?.type)
        return res.status(200).json({ status: true, message: 'Ignored unsupported event' })
    }

    // Acknowledge to Slack immediately (<50ms) to beat the 3,000ms timeout
    res.status(200).json({ status: true })

    // Process ingestion asynchronously in background
    const source = sourceForWebhookRequest(req.get('x-cortex-seed-source'))
    pushSlackEventToDatabase(parsedEvent, source)
        .then(() => console.log(`[Slack Webhook] Event ${payload.event?.type} successfully queued to database!`))
        .catch(err => console.error('[Slack Webhook] Background ingestion error:', err?.message));
})

export default router

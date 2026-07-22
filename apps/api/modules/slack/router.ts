import express from 'express'
import { validateSlackSignature } from './validator.js'
import { ISlackParsedEvent, parseSlackEvent } from './normalize.js'
import { pushSlackEventToDatabase } from './controller.js'

const router = express.Router()
router.post('/webhook', async (req, res) => {
    const payload = req.body
    if (payload.type == 'url_verification') {
        return res.status(200).json({
            challenge: payload.challenge
        })
    }

    // 1. Extract Slack Headers
    const timestamp = req.headers['x-slack-request-timestamp'] as string
    const signature = req.headers['x-slack-signature'] as string

    // 2. Verify Slack Signature
    if (!validateSlackSignature(timestamp, signature, req.rawBody)) {
        console.warn(`Invalid Slack Signature`)
        return res.status(401).json({ message: "Unauthorized" })
    }

    const parsedEvent: ISlackParsedEvent | null = parseSlackEvent(payload.event.type, payload.event , payload.event_id)
    if (parsedEvent === null) {
        return res.status(501).json({
            message: "Not Able To Parse Slack Event"
        })
    }

    await pushSlackEventToDatabase(parsedEvent)
    console.log('Slack Event Saved To Database')

    return res.status(200).json({
        status: true
    })
})
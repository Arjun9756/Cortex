import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import env from '../config/env.js'

export function authGuard(req: Request, res: Response, next: NextFunction): void {
    const expectedKey = env.CORTEX_API_KEY
    const authorization = req.get('authorization')
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''

    if (!expectedKey || !token) {
        res.status(401).json({ error: 'Unauthorized' })
        return
    }

    const expected = Buffer.from(expectedKey)
    const received = Buffer.from(token)
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        res.status(401).json({ error: 'Unauthorized' })
        return
    }

    next()
}

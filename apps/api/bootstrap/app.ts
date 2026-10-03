import express from 'express'
import os from 'os'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'
import env from '../config/env.js'
import githubRouter from '../modules/github/router.js'
import slackRouter from '../modules/slack/router.js'
import { chatRouter } from '../modules/chat/router.js'
import { jiraRouter } from '../modules/jira/router.js'
import { graphRouter } from '../modules/graph/router.js'
import { dashboardRouter } from '../modules/dashboard/router.js'
import { analyticsRouter } from '../modules/analytics/router.js'
import { integrationsRouter } from '../modules/integrations/router.js'
import { updateIntegrationSecret } from '../modules/dashboard/controller.js'
import { licenseGuard, getLicenseState } from '../../../packages/license/index.js'

const app = express()

// Strict Environment-Aware CORS Config
const allowedOrigins = (process.env.ALLOWED_ORIGINS || env.FRONTEND_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like server-to-server, curl, webhooks)
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        return callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-cortex-seed-source']
}))

// Helmet Config - Allow cross-origin resources
app.use(helmet({
    crossOriginResourcePolicy: false,
}))

// JSON Config
app.use(express.urlencoded({extended:true}))

app.use(express.json({
    verify:(req:any,res,buf)=>{
        req.rawBody = buf
    }
}))

app.get('/' , (req,res)=>{
    res.setHeader('Cache-Control' , 'public, max-age=60, must-revalidate')
    return res.status(200).json({
        status:true,
        message:"Cortex Server is Running on Port " + env.PORT
    })
})

// License status endpoint
app.get('/api/license/status', (req, res) => {
    const status = getLicenseState();
    return res.status(status.isValid ? 200 : 403).json(status);
})

// Webhook routes authenticate their providers with their own signatures/secrets.
app.use('/api/github' , githubRouter)
app.use('/api/slack' , slackRouter)
app.use('/api/jira' , jiraRouter)

// Guard all subsequent /api routes
app.use('/api', licenseGuard)

app.use('/api/chat' , chatRouter)
app.use('/api/graph' , graphRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/integrations', integrationsRouter)
app.post('/api/:provider/secret', updateIntegrationSecret)

export default app

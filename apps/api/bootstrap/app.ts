import express from 'express'
import os from 'os'
import bodyParser from 'body-parser'
import cors from 'cors'
import dns from 'dns'
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

// Cors Config - Allow all origins dynamically with credentials
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}))

// Dns Config of Google & Cloudflare
dns.setServers(['8.8.8.8' , '1.1.1.1'])

// Helmet Config - Allow cross-origin requests from frontend
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

// Guard all subsequent /api routes
app.use('/api', licenseGuard)

// Webhook routes authenticate their providers with their own signatures/secrets.
app.use('/api/github' , githubRouter)
app.use('/api/slack' , slackRouter)
app.use('/api/jira' , jiraRouter)

app.use('/api/chat' , chatRouter)
app.use('/api/graph' , graphRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/integrations', integrationsRouter)
app.post('/api/:provider/secret', updateIntegrationSecret)

export default app

import express from 'express'
import os from 'os'
import bodyParser from 'body-parser'
import cors from 'cors'
import dns from 'dns'
import helmet from 'helmet'
import env from '../config/env.js'
import githubRouter from '../modules/github/router.js'
import slackRouter from '../modules/slack/router.js'

const app = express()

// Cors Config
app.use(cors({
    origin:"*",
    allowedHeaders:['Authorization' , 'IsSyncNeed' , 'Content-Type'],
    preflightContinue:true,
    optionsSuccessStatus:200,
    methods:["GET" , "POST" , "PUT" , "PATCH" , "HEAD" , "DELETE"]
}))

// Dns Config of Google & Cloudflare
dns.setServers(['8.8.8.8' , '1.1.1.1'])

// Helmet Config
app.use(helmet())

// JSON Config
app.use(express.urlencoded({extended:true}))
app.use(bodyParser)

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

app.use('/api/github' , githubRouter)
app.use('/api/slack' , slackRouter)

export default app
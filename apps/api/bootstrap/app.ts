import express from 'express'
const app = express()

app.use(express.json({
    verify:(req:any,res,buf)=>{
        req.rawBody = buf
    }
}))
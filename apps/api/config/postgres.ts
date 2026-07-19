import postgres from 'postgres'
import env from './env.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sql = postgres({
    host:env.POSTGRES_HOST!,
    port:Number(env.POSTGRES_PORT!),
    password:env.POSTGRES_PASSWORD!,
    database:env.POSTGRES_DATABASE!,
    max:20,
    connect_timeout:30,
    ssl:{
        rejectUnauthorized:true,
        ca:fs.readFileSync(path.join(__dirname , '..' , '..' , '..' , 'postgresql.pem') , 'utf-8')
    }
})

export default Object.freeze(sql)
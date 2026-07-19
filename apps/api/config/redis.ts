import {Redis} from 'ioredis'
import env from './env.js'

const redis = new Redis({
    host:env.REDIS_HOST,
    password:env.REDIS_PASSWORD,
    username:env.REDIS_USERNAME,
    port:Number(env.REDIS_PORT!),
    connectTimeout:15000,
    commandTimeout:15000,
    maxRetriesPerRequest:null,
    enableReadyCheck:false,
    retryStrategy:function(times){
        return Math.min(10000 , times * 1000)
    }
})

export default redis
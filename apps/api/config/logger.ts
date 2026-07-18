import logger from 'pino'
import PinoPretty from 'pino-pretty';
import env from './env.js';

const isDevelopment = env.NODE_ENV === "development"
let log;

let loggerOption:logger.LoggerOptions = {
    name:"cortex-api",
    level:isDevelopment ? "debug" : "info",
    base:{
        service:"cortex-api",
        environment:env.NODE_ENV
    }
}

if(isDevelopment){
    const preetySchema = PinoPretty({
        colorize:true,
        translateTime:"HH:MM:SS",
        ignore:"pid,hostname"
    })
    log = logger(loggerOption , preetySchema)
}else{
    log = logger(loggerOption)
}

export default log
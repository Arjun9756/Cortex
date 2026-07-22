import env from "../../apps/api/config/env.js";
import redis from "../../apps/api/config/redis.js";
import { JOBS } from "../queue/jobs.js";
import {Worker} from 'bullmq'
import {processGithubEvent} from '../ingestion/github/processGithubEvent.js'

export const cortexWorker = new Worker('processing-queue' , async (job)=>{
    switch(job.name){
        case JOBS.GITHUB_EVENT:
            processGithubEvent(job.data.id)
            break
        case JOBS.JIRA_EVENT:
            break
        case JOBS.SLACK_EVENT:
            break
        case JOBS.NOTION_EVENT:
            break
        case JOBS.CONFLUENCE_EVENT:
            break
        default:
            console.warn(`Miscellaneous Event ${job.data.eventID}`)
            break
    }
},{
    connection:redis,
    concurrency:env.QUEUE_WORKERS_CONCURRENCY,
    autorun:true,
})
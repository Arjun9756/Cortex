import env from "../../apps/api/config/env.js";
import redis from "../../apps/api/config/redis.js";
import { JOBS } from "../queue/jobs.js";
import {Worker} from 'bullmq'
import {processGithubEvent} from '../ingestion/github/processGithubEvent.js'
import { processSlackEvent } from "../ingestion/slack/processSlackEvent.js";
import { processJiraEvent } from "../ingestion/jira/processJiraEvent.js";
import { markMetricsDirty } from "../analytics/metricsInvalidator.service.js";

export const cortexWorker = new Worker('processing-queue' , async (job)=>{
    switch(job.name){
        case JOBS.GITHUB_EVENT:
            await processGithubEvent(job.data.id)
            break
        case JOBS.JIRA_EVENT:
            await processJiraEvent(job.data.id)
            break
        case JOBS.SLACK_EVENT:
            await processSlackEvent(job.data.id)
            break
        case JOBS.NOTION_EVENT:
            break
        case JOBS.CONFLUENCE_EVENT:
            break
        default:
            console.warn(`Miscellaneous Event ${job.data.eventID}`)
            break
    }

    // Trigger debounced metrics invalidation upon successful event ingestion
    if ([JOBS.GITHUB_EVENT, JOBS.JIRA_EVENT, JOBS.SLACK_EVENT].includes(job.name as any)) {
        await markMetricsDirty(job.name);
    }
},{
    connection:redis,
    concurrency:env.QUEUE_WORKERS_CONCURRENCY,
    limiter: {
        max: parseInt(process.env.INGEST_RATE_LIMIT_MAX || '25', 10),
        duration: parseInt(process.env.INGEST_RATE_LIMIT_DURATION_MS || '60000', 10),
    },
    autorun:true,
})
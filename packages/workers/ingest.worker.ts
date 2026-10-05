import env from "../../apps/api/config/env.js";
import redis from "../../apps/api/config/redis.js";
import sql from "../../apps/api/config/postgres.js";
import { snowflake } from "../../apps/Utils/Snowflake.js";
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
}, {
    connection: redis,
    concurrency: Math.max(1, parseInt(process.env.QUEUE_WORKERS_CONCURRENCY || String(env.QUEUE_WORKERS_CONCURRENCY || 5), 10)),
    ...(process.env.INGEST_RATE_LIMIT_MAX && process.env.INGEST_RATE_LIMIT_MAX !== '0' ? {
        limiter: {
            max: parseInt(process.env.INGEST_RATE_LIMIT_MAX, 10),
            duration: parseInt(process.env.INGEST_RATE_LIMIT_DURATION_MS || '60000', 10),
        }
    } : {}),
    autorun: true,
})

// Dead-letter handler for jobs that exhausted all retry attempts
cortexWorker.on('failed', async (job, err) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts || 1;
    if (job.attemptsMade >= maxAttempts) {
        console.error(`[Worker] Job ${job.id} (${job.name}) permanently failed after ${job.attemptsMade} attempts: ${err?.message}`);
        try {
            const failId = `failed_${snowflake.nextID()}`;
            const eventId = job.data?.id || null;
            let source = 'webhook';
            let provider = 'unknown';

            if (eventId) {
                const [eventRow] = await sql`SELECT source, provider FROM events WHERE id = ${eventId}`;
                if (eventRow) {
                    source = eventRow.source;
                    provider = eventRow.provider;
                }
            }

            await sql`
                INSERT INTO failed_events (
                    id, source, provider, job_id, event_id, error_message, stack_trace, attempts_made, status
                ) VALUES (
                    ${failId},
                    ${source},
                    ${provider},
                    ${String(job.id)},
                    ${eventId},
                    ${err?.message || 'Unknown job failure'},
                    ${err?.stack || null},
                    ${job.attemptsMade},
                    'exhausted'
                )
            `;
            console.log(`[Worker] Recorded exhausted job ${job.id} into failed_events table (id: ${failId})`);
        } catch (dbErr: any) {
            console.error(`[Worker] Failed to record failed event to DB: ${dbErr?.message}`);
        }
    } else {
        console.warn(`[Worker] Job ${job.id} (${job.name}) attempt ${job.attemptsMade}/${maxAttempts} failed: ${err?.message}. Scheduled for retry.`);
    }
});
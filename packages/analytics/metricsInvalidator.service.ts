import { invalidateGraphCache } from '../../apps/api/modules/graph/graphCache.js';
import redis from '../../apps/api/config/redis.js';
import crypto from 'crypto';

export type RecalculateRunner = () => Promise<void>;
let activeRunner: RecalculateRunner | null = null;

export function setMetricsRunner(runner: RecalculateRunner): void {
    activeRunner = runner;
}

export interface InvalidationConfig {
    debounceWindowMs: number;
    maxDelayMs: number;
    pollIntervalMs: number;
    lockTtlSeconds: number;
}

export const REDIS_KEYS = {
    DIRTY: 'cortex:metrics:dirty',
    LAST_EVENT_TS: 'cortex:metrics:last_event_ts',
    FIRST_DIRTY_TS: 'cortex:metrics:first_dirty_ts',
    LOCK: 'cortex:metrics:lock',
} as const;

export function getInvalidationConfig(): InvalidationConfig {
    return {
        debounceWindowMs: parseInt(process.env.METRICS_DEBOUNCE_MS || '45000', 10),
        maxDelayMs: parseInt(process.env.METRICS_MAX_DELAY_MS || '180000', 10),
        pollIntervalMs: parseInt(process.env.METRICS_POLL_INTERVAL_MS || '15000', 10),
        lockTtlSeconds: parseInt(process.env.METRICS_LOCK_TTL_SECONDS || '180', 10),
    };
}

/**
 * Marks the metrics dirty in Redis whenever a new event is ingested.
 * Lightweight O(1) operation called by ingestion workers upon successful event processing.
 *
 * @param source Event provider or job name (e.g. 'github-event', 'slack-event', 'jira-event')
 */
export async function markMetricsDirty(source: string = 'unknown'): Promise<void> {
    try {
        const now = Date.now().toString();
        
        // 1. Mark dirty
        await redis.set(REDIS_KEYS.DIRTY, '1');

        // 2. Update last event timestamp (extends debounce window)
        await redis.set(REDIS_KEYS.LAST_EVENT_TS, now);

        // 3. Set first_dirty_ts ONLY if not already set (SET NX to track burst start for starvation cap)
        await redis.set(REDIS_KEYS.FIRST_DIRTY_TS, now, 'NX');

        console.log(`[MetricsInvalidator] Event received from ${source} — marked metrics dirty (timestamp: ${now})`);
    } catch (err: any) {
        console.error(`[MetricsInvalidator] Error marking metrics dirty: ${err?.message}`);
    }
}

/**
 * Checks if the debounce window or max starvation delay has elapsed,
 * acquires a distributed Redis lock, and executes the metrics recalculation.
 */
export async function checkAndRunMetricsDebounced(): Promise<{
    ran: boolean;
    reason: 'clean' | 'debouncing' | 'locked' | 'completed' | 'error';
    timeSinceLastEvent?: number;
    timeSinceFirstDirty?: number;
}> {
    try {
        const config = getInvalidationConfig();

        // Step 1: Check if system is dirty
        const dirty = await redis.get(REDIS_KEYS.DIRTY);
        if (dirty !== '1') {
            return { ran: false, reason: 'clean' };
        }

        const now = Date.now();
        const lastEventTsStr = await redis.get(REDIS_KEYS.LAST_EVENT_TS);
        const firstDirtyTsStr = await redis.get(REDIS_KEYS.FIRST_DIRTY_TS);

        const lastEventTs = lastEventTsStr ? Number(lastEventTsStr) : now;
        const firstDirtyTs = firstDirtyTsStr ? Number(firstDirtyTsStr) : lastEventTs;

        const timeSinceLastEvent = now - lastEventTs;
        const timeSinceFirstDirty = now - firstDirtyTs;

        const isQuiet = timeSinceLastEvent >= config.debounceWindowMs;
        const isStarved = timeSinceFirstDirty >= config.maxDelayMs;

        // Step 2: Debounce check (must either be quiet for debounce window OR reached max delay)
        if (!isQuiet && !isStarved) {
            console.log(
                `[MetricsInvalidator] Debounce active: Last event was ${(timeSinceLastEvent / 1000).toFixed(1)}s ago ` +
                `(waiting for ${config.debounceWindowMs / 1000}s quiet period or ${config.maxDelayMs / 1000}s max delay). Recalculation deferred.`
            );
            return { ran: false, reason: 'debouncing', timeSinceLastEvent, timeSinceFirstDirty };
        }

        // Step 3: Acquire Distributed Redis Mutex Lock to prevent overlapping runs
        const lockToken = crypto.randomUUID();
        const lockAcquired = await redis.set(
            REDIS_KEYS.LOCK,
            lockToken,
            'EX',
            config.lockTtlSeconds,
            'NX'
        );

        if (!lockAcquired) {
            console.log(
                `[MetricsInvalidator] Overlapping recalculation prevented: Redis lock '${REDIS_KEYS.LOCK}' is currently held by another worker.`
            );
            return { ran: false, reason: 'locked' };
        }

        // Step 4: Execute recalculation under distributed lock
        const recalcStartTime = Date.now();
        const triggerReason = isStarved ? 'Max delay cap reached' : 'Quiet debounce window reached';
        console.log(`[MetricsInvalidator] ⚡ Triggering debounced metrics recalculation (${triggerReason})...`);

        try {
            const execute = activeRunner;
            if (execute) {
                await execute();
            } else {
                const { runAnalyticsJob } = await import('../workers/scheduler.worker.js');
                await runAnalyticsJob();
            }

            // Step 5: Check if new events arrived while recalculation was in flight (Zero Lost Updates)
            const latestEventTsStr = await redis.get(REDIS_KEYS.LAST_EVENT_TS);
            const latestEventTs = latestEventTsStr ? Number(latestEventTsStr) : 0;

            if (latestEventTs > recalcStartTime) {
                console.log(
                    `[MetricsInvalidator] New events arrived during recalculation (latest: ${latestEventTs} > start: ${recalcStartTime}) — keeping dirty flag for next cycle.`
                );
            } else {
                await redis.del(REDIS_KEYS.DIRTY, REDIS_KEYS.FIRST_DIRTY_TS);
                await invalidateGraphCache('Debounced metrics recalculation complete');
                console.log(`[MetricsInvalidator] ✅ Metrics recalculation complete. Dirty flag cleared.`);
            }

            return { ran: true, reason: 'completed' };
        } finally {
            // Step 6: Safely release Redis lock using Lua script (only delete if token matches)
            const releaseLua = `
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
            `;
            await redis.eval(releaseLua, 1, REDIS_KEYS.LOCK, lockToken);
        }
    } catch (err: any) {
        console.error(`[MetricsInvalidator] Error in checkAndRunMetricsDebounced: ${err?.message}`);
        return { ran: false, reason: 'error' };
    }
}

let pollerTimer: NodeJS.Timeout | null = null;

/**
 * Starts the background poller that checks the dirty flag and triggers debounced recalculation.
 */
export function startDebouncedMetricsPoller(runner?: RecalculateRunner): NodeJS.Timeout {
    if (runner) {
        activeRunner = runner;
    }

    if (pollerTimer) {
        return pollerTimer;
    }

    const config = getInvalidationConfig();
    console.log(
        `[MetricsInvalidator] Background poller started (poll interval: ${config.pollIntervalMs / 1000}s, ` +
        `debounce window: ${config.debounceWindowMs / 1000}s, max delay: ${config.maxDelayMs / 1000}s)`
    );

    pollerTimer = setInterval(() => {
        checkAndRunMetricsDebounced().catch(err => {
            console.error(`[MetricsInvalidator] Poller cycle error: ${err?.message}`);
        });
    }, config.pollIntervalMs);

    // Allow process to exit cleanly if poller is the only active timer
    pollerTimer.unref();

    return pollerTimer;
}

export function stopDebouncedMetricsPoller(): void {
    if (pollerTimer) {
        clearInterval(pollerTimer);
        pollerTimer = null;
        console.log('[MetricsInvalidator] Background poller stopped');
    }
}

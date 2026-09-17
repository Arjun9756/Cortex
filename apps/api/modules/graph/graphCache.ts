import redis from '../../config/redis.js';

export const GRAPH_CACHE_CONFIG = {
    SUMMARY_TTL_SECONDS: parseInt(process.env.GRAPH_SUMMARY_TTL_SECONDS || '90', 10),
    NODE_TTL_SECONDS: parseInt(process.env.GRAPH_NODE_TTL_SECONDS || '60', 10),
};

export function buildSummaryCacheKey(workspaceId: string = 'global', filterKey: any = 'all'): string {
    const fk = typeof filterKey === 'object' ? Object.entries(filterKey).filter(([_,v])=>v!==undefined&&v!=='').map(([k,v])=>k+'='+v).sort().join('&') || 'all' : (filterKey || 'all'); return 'graph:summary:' + workspaceId + ':' + fk;
}

export function buildNodeCacheKey(type: string, id: string): string {
    const cleanType = (type || 'unknown').trim().toLowerCase();
    const cleanId = (id || '').trim();
    return 'graph:node:' + cleanType + ':' + cleanId;
}

/**
 * Retrieves cached Knowledge Graph summary.
 */
export async function getGraphSummaryCache(workspaceId: string = 'global', filterKey: any = 'all'): Promise<any | null> {
    const key = buildSummaryCacheKey(workspaceId, filterKey);
    try {
        const raw = await redis.get(key);
        if (raw) {
            console.log('[GraphCache] HIT: ' + key);
            return JSON.parse(raw);
        }
        console.log('[GraphCache] MISS: ' + key);
        return null;
    } catch (err: any) {
        console.warn('[GraphCache] Redis read error for ' + key + ': ' + err?.message);
        return null;
    }
}

/**
 * Stores Knowledge Graph summary in Redis cache.
 */
export async function setGraphSummaryCache(
    workspaceId: string = 'global',
    filterKey: any = 'all',
    data: any,
    ttlSeconds: number = GRAPH_CACHE_CONFIG.SUMMARY_TTL_SECONDS
): Promise<void> {
    const key = buildSummaryCacheKey(workspaceId, filterKey);
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (err: any) {
        console.warn('[GraphCache] Redis write error for ' + key + ': ' + err?.message);
    }
}

/**
 * Retrieves cached node detail.
 */
export async function getGraphNodeCache(type: string, id: string): Promise<any | null> {
    const key = buildNodeCacheKey(type, id);
    try {
        const raw = await redis.get(key);
        if (raw) {
            console.log('[GraphCache] HIT: ' + key);
            return JSON.parse(raw);
        }
        console.log('[GraphCache] MISS: ' + key);
        return null;
    } catch (err: any) {
        console.warn('[GraphCache] Redis read error for ' + key + ': ' + err?.message);
        return null;
    }
}

/**
 * Stores node detail in Redis cache.
 */
export async function setGraphNodeCache(
    type: string,
    id: string,
    data: any,
    ttlSeconds: number = GRAPH_CACHE_CONFIG.NODE_TTL_SECONDS
): Promise<void> {
    const key = buildNodeCacheKey(type, id);
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (err: any) {
        console.warn('[GraphCache] Redis write error for ' + key + ': ' + err?.message);
    }
}

/**
 * Invalidates graph caches (summary + node detail) upon ingestion or metrics recalculation.
 */
export async function invalidateGraphCache(reason: string = 'manual'): Promise<number> {
    try {
        let deletedCount = 0;
        const stream = redis.scanStream({
            match: 'graph:*',
            count: 100,
        });

        const keysToDelete: string[] = [];

        await new Promise<void>((resolve, reject) => {
            stream.on('data', (resultKeys: string[]) => {
                for (const k of resultKeys) {
                    if (k.startsWith('graph:summary:') || k.startsWith('graph:node:')) {
                        keysToDelete.push(k);
                    }
                }
            });
            stream.on('end', () => resolve());
            stream.on('error', (err) => reject(err));
        });

        await redis.del("analytics:trends").catch(() => {});
        if (keysToDelete.length > 0) {
            for (let i = 0; i < keysToDelete.length; i += 50) {
                const batch = keysToDelete.slice(i, i + 50);
                deletedCount += await redis.del(...batch);
            }
        }

        console.log('[GraphCache] Invalidation complete: evicted ' + deletedCount + ' cached keys (Reason: ' + reason + ')');
        return deletedCount;
    } catch (err: any) {
        console.error('[GraphCache] Invalidation failed: ' + err?.message);
        return 0;
    }
}

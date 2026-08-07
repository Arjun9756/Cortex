import redis from '../../apps/api/config/redis.js';

export interface AliasMapping {
    canonicalName: string;
    aliases: string[];
}

const DEFAULT_ALIASES: AliasMapping[] = [
    { canonicalName: 'Redis', aliases: ['redis', 'Redis Cache', 'Valkey', 'valkey', 'redis-server'] },
    { canonicalName: 'BullMQ', aliases: ['bullmq', 'Queue', 'processing-queue', 'cortexQueue'] },
    { canonicalName: 'Postgres', aliases: ['postgresql', 'PostgreSQL', 'postgres', 'psql'] },
    { canonicalName: 'Neo4j', aliases: ['neo4j', 'Neo4j Graph', 'graphdb'] },
    { canonicalName: 'Cortex', aliases: ['cortex', 'Cortex Assistant', 'cortex-repo'] },
    { canonicalName: 'Billing Service', aliases: ['billing', 'billing-service', 'billing_service'] },
];

/**
 * PHASE 4: Entity Alias Engine
 * Resolves alias variations (e.g. Redis <-> Valkey, BullMQ <-> Queue) before clarification.
 */
export async function resolveEntityAlias(searchTerm: string): Promise<string[]> {
    if (!searchTerm) return [];
    const cleanTerm = searchTerm.trim().toLowerCase();

    // 1. Check in-memory dictionary
    for (const mapping of DEFAULT_ALIASES) {
        const matchesCanonical = mapping.canonicalName.toLowerCase() === cleanTerm;
        const matchesAlias = mapping.aliases.some(a => a.toLowerCase() === cleanTerm);

        if (matchesCanonical || matchesAlias) {
            return [...new Set([mapping.canonicalName, ...mapping.aliases])];
        }
    }

    // 2. Check Redis cache
    try {
        const redisAlias = await redis.get(`alias:${cleanTerm}`);
        if (redisAlias) {
            return JSON.parse(redisAlias);
        }
    } catch (err: any) {
        console.warn(`[AliasEngine] Redis alias lookup warning: ${err?.message}`);
    }

    return [searchTerm];
}

/**
 * Register a dynamic alias mapping into Redis and Memory cache.
 */
export async function registerEntityAlias(canonicalName: string, aliases: string[]): Promise<void> {
    const cleanCanonical = canonicalName.trim();
    const cleanAliases = aliases.map(a => a.trim());

    for (const alias of [cleanCanonical, ...cleanAliases]) {
        try {
            await redis.set(`alias:${alias.toLowerCase()}`, JSON.stringify([cleanCanonical, ...cleanAliases]), 'EX', 604800); // 7 days
        } catch (err: any) {
            console.warn(`[AliasEngine] Redis register warning: ${err?.message}`);
        }
    }
}

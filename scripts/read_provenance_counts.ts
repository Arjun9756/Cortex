import sql from '../apps/api/config/postgres.js';
import env from '../apps/api/config/env.js';
import qdrant from '../apps/api/config/qdrant.js';
import { driver, neo4jDatabase } from '../apps/api/config/neo4j.js';

const tables = [
    'events', 'person_metrics', 'workspace_metrics', 'person_identity',
    'technology_metrics', 'identity_merge_log', 'potential_duplicates',
    'daily_reports', 'repo_metrics'
] as const;

async function main() {
    try {
        const database = await sql`SELECT current_database() AS database`;
        const postgresSessionPolicy = await sql`
            SELECT current_setting('cortex.allow_seed_data', true) AS seed_access_setting,
                   role.rolsuper AS is_superuser,
                   role.rolbypassrls AS bypasses_rls
            FROM pg_roles AS role
            WHERE role.rolname = current_user
        `;
        const postgres: Record<string, number> = {};
        for (const table of tables) {
            const rows = await sql.unsafe(`SELECT count(*)::int AS count FROM ${table}`);
            postgres[table] = rows[0]?.count ?? -1;
        }
        const sourceColumns = await sql`
            SELECT table_name, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name IN ${sql([...tables])} AND column_name = 'source'
            ORDER BY table_name
        `;
        const rowSecurity = await sql`
            SELECT relname AS table_name, relrowsecurity AS enabled, relforcerowsecurity AS forced
            FROM pg_class
            WHERE relname IN ${sql([...tables])}
            ORDER BY relname
        `;
        const uniqueIndexes = await sql`
            SELECT tablename, indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public' AND tablename IN ${sql([...tables])} AND indexdef ILIKE '%UNIQUE%'
            ORDER BY tablename, indexname
        `;

        const session = driver.session({ database: neo4jDatabase });
        let graph: { trustedNodes: number; trustedRelationships: number };
        try {
            const nodes = await session.run('MATCH (n) RETURN count(n) AS count');
            const relationships = await session.run('MATCH ()-[r]->() RETURN count(r) AS count');
            graph = {
                trustedNodes: nodes.records[0]?.get('count')?.toNumber?.() ?? 0,
                trustedRelationships: relationships.records[0]?.get('count')?.toNumber?.() ?? 0
            };
        } finally {
            await session.close();
        }

        const collectionName = env.QDRANT_COLLECTION_NAME || 'cortex_events';
        const exists = await qdrant.collectionExists(collectionName);
        let qdrantPoints: number | null = null;
        let qdrantPayloadSchema: Record<string, unknown> | null = null;
        if (exists.exists) {
            const info = await qdrant.getCollection(collectionName);
            qdrantPoints = info.points_count ?? null;
            qdrantPayloadSchema = (info.payload_schema as Record<string, unknown> | undefined) ?? null;
        }
        console.log(JSON.stringify({
            database: database[0]?.database,
            postgresSessionPolicy: postgresSessionPolicy[0],
            postgres,
            postgresSourceColumns: sourceColumns,
            postgresRls: rowSecurity,
            postgresUniqueIndexes: uniqueIndexes,
            neo4jDatabase,
            graph,
            qdrantCollection: collectionName,
            qdrantPoints,
            qdrantPayloadSchema
        }));
    } finally {
        await sql.end();
        await driver.close();
    }
}

main().catch(error => {
    console.error(`[READ-ONLY PROVENANCE COUNTS FAILED] ${error?.message ?? String(error)}`);
    process.exitCode = 1;
});

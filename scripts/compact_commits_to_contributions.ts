import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import { driver } from '../apps/api/config/neo4j.js';

/**
 * Migration & Compaction Utility:
 * Compacts existing legacy Neo4j COMMIT nodes into CONTRIBUTED_TO rollup edges.
 *
 * Usage:
 *   npx tsx scripts/compact_commits_to_contributions.ts
 *   npx tsx scripts/compact_commits_to_contributions.ts --delete-commits
 */
async function main() {
    const deleteCommits = process.argv.includes('--delete-commits');
    const session = driver.session();
    console.log(`[Compaction] Starting legacy COMMIT compaction (deleteCommits=${deleteCommits})...`);

    try {
        // 1. Find all (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
        const summaryRes = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
            WITH p, r, count(c) AS legacyCommits, max(c.createdAt) AS latestCreatedAt
            MERGE (p)-[rel:CONTRIBUTED_TO]->(r)
            ON CREATE SET 
                rel.commitCount = legacyCommits,
                rel.lastCommitAt = COALESCE(latestCreatedAt, timestamp()),
                rel.createdAt = timestamp(),
                rel.evidence = 'compacted from legacy COMMIT nodes'
            ON MATCH SET 
                rel.commitCount = CASE WHEN rel.commitCount IS NULL THEN legacyCommits ELSE rel.commitCount END,
                rel.lastCommitAt = CASE WHEN rel.lastCommitAt IS NULL THEN latestCreatedAt ELSE rel.lastCommitAt END,
                rel.updatedAt = timestamp()
            RETURN p.name AS person, r.name AS repo, legacyCommits, rel.commitCount AS totalCommits
        `);

        console.log(`[Compaction] Processed ${summaryRes.records.length} (person, repo) contribution pairs:`);
        for (const rec of summaryRes.records) {
            console.log(`  - ${rec.get('person')} -> ${rec.get('repo')}: ${rec.get('legacyCommits')} legacy commits -> total: ${rec.get('totalCommits')}`);
        }

        // 2. Count remaining COMMIT nodes
        const countRes = await session.run(`MATCH (c:COMMIT) RETURN count(c) AS commitCount`);
        const totalCommits = countRes.records[0]?.get('commitCount')?.toNumber ? countRes.records[0]?.get('commitCount')?.toNumber() : Number(countRes.records[0]?.get('commitCount') || 0);
        console.log(`[Compaction] Current COMMIT node count in Neo4j: ${totalCommits}`);

        if (deleteCommits && totalCommits > 0) {
            console.log(`[Compaction] Deleting ${totalCommits} legacy COMMIT nodes...`);
            const delRes = await session.run(`
                MATCH (c:COMMIT)
                DETACH DELETE c
                RETURN count(c) AS deleted
            `);
            const deleted = delRes.records[0]?.get('deleted')?.toNumber ? delRes.records[0]?.get('deleted')?.toNumber() : Number(delRes.records[0]?.get('deleted') || 0);
            console.log(`[Compaction] Successfully deleted ${deleted} legacy COMMIT nodes.`);
        } else if (!deleteCommits && totalCommits > 0) {
            console.log(`[Compaction] Note: To delete compacted COMMIT nodes, re-run with --delete-commits`);
        }

        console.log('[Compaction] Compaction completed successfully.');
    } catch (err: any) {
        console.error('[Compaction] Error during compaction:', err?.message);
    } finally {
        await session.close();
        process.exit(0);
    }
}

main();

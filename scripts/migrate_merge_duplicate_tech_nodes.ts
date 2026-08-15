import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import { calculateAllTechnologyMetrics } from '../packages/analytics/technologyMetrics.js';
import { calculateAllRepoMetrics } from '../packages/analytics/repoMetrics.service.js';
import { calculateAllPersonMetrics } from '../packages/analytics/personMetrics.service.js';
import { calculateWorkspaceMetrics } from '../packages/analytics/workspaceMetrics.service.js';

async function migrateDuplicateNodes() {
  console.log('=====================================================================');
  console.log('🧹 MERGING CASE-VARIANT DUPLICATE GRAPH NODES (TECHNOLOGY, REPO, PERSON)');
  console.log('=====================================================================');

  const session = driver.session();
  let duplicatesFound = 0;
  let duplicatesMerged = 0;
  const mergedDetails: string[] = [];
  const deletedDupNames: string[] = [];

  try {
    const labels = ['TECHNOLOGY', 'REPOSITORY', 'PERSON'];

    for (const label of labels) {
      console.log(`\n--- Auditing label: :${label} ---`);
      const res = await session.run(`
        MATCH (n:${label})
        RETURN elementId(n) AS id, n.name AS name
      `);

      const nodes = res.records.map((rec) => ({
        id: rec.get('id') as string,
        name: (rec.get('name') as string) || '',
      })).filter(n => n.name.trim().length > 0);

      // Group nodes by lowercase trimmed name
      const groups = new Map<string, Array<{ id: string; name: string }>>();
      for (const node of nodes) {
        const key = node.name.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(node);
      }

      for (const [key, group] of groups.entries()) {
        if (group.length > 1) {
          duplicatesFound += (group.length - 1);
          console.log(`⚠️ Found ${group.length} duplicate :${label} nodes for "${key}":`, group.map((g) => `"${g.name}"`));

          // Select canonical node: prefer properly cased name (e.g. "Redis" over "redis")
          group.sort((a, b) => {
            const aHasCap = a.name !== a.name.toLowerCase();
            const bHasCap = b.name !== b.name.toLowerCase();
            if (aHasCap && !bHasCap) return -1;
            if (!aHasCap && bHasCap) return 1;
            return a.name.length - b.name.length;
          });

          const canonical = group[0];
          const duplicates = group.slice(1);

          console.log(`  -> Canonical node selected: "${canonical.name}" (${canonical.id})`);

          for (const dup of duplicates) {
            console.log(`  -> Merging relationships from duplicate "${dup.name}" (${dup.id}) into canonical "${canonical.name}"...`);

            // Re-point incoming relationships
            try {
              await session.run(`
                MATCH (src)-[r]->(dup)
                WHERE elementId(dup) = $dupId AND elementId(src) <> $canonicalId
                MATCH (canonical) WHERE elementId(canonical) = $canonicalId
                CREATE (src)-[r2:MENTIONED_IN]->(canonical)
                SET r2 += properties(r)
                DELETE r
              `, { dupId: dup.id, canonicalId: canonical.id });
            } catch (rErr: any) {
              console.warn(`    Incoming rel merge warning:`, rErr?.message);
            }

            // Re-point outgoing relationships
            try {
              await session.run(`
                MATCH (dup)-[r]->(target)
                WHERE elementId(dup) = $dupId AND elementId(target) <> $canonicalId
                MATCH (canonical) WHERE elementId(canonical) = $canonicalId
                CREATE (canonical)-[r2:USES]->(target)
                SET r2 += properties(r)
                DELETE r
              `, { dupId: dup.id, canonicalId: canonical.id });
            } catch (rErr: any) {
              console.warn(`    Outgoing rel merge warning:`, rErr?.message);
            }

            // Detach and delete duplicate node
            await session.run(`
              MATCH (dup) WHERE elementId(dup) = $dupId
              DETACH DELETE dup
            `, { dupId: dup.id });

            // Remove deleted duplicate from Postgres metrics tables
            if (label === 'TECHNOLOGY') {
              deletedDupNames.push(dup.name);
            }

            duplicatesMerged++;
            mergedDetails.push(`Merged duplicate "${dup.name}" -> canonical "${canonical.name}" (${label})`);
            console.log(`  ✅ Successfully merged & deleted duplicate node "${dup.name}" (${dup.id})`);
          }
        }
      }
    }

    // Clean up stale deleted duplicate rows in PostgreSQL
    for (const dupName of deletedDupNames) {
      await sql`DELETE FROM technology_metrics WHERE tech_name = ${dupName}`;
      console.log(`  🗑️ Cleared stale Postgres row for deleted duplicate tech: "${dupName}"`);
    }

    console.log('\n=====================================================================');
    console.log(`SUMMARY: Found ${duplicatesFound} duplicate node pairs. Merged ${duplicatesMerged} duplicate nodes.`);
    mergedDetails.forEach(d => console.log(` - ${d}`));

    console.log('\n🔄 Re-running analytics calculations across all metrics...');
    await calculateAllPersonMetrics();
    await calculateAllRepoMetrics();
    await calculateAllTechnologyMetrics();
    await calculateWorkspaceMetrics();
    console.log('✅ Graph node deduplication and metrics recalculation completed successfully!');
  } catch (err: any) {
    console.error('Migration failed:', err?.message);
  } finally {
    await session.close();
    process.exit(0);
  }
}

migrateDuplicateNodes();

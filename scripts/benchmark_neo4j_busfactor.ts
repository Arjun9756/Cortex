process.env.CORTEX_ENV = 'local-dev';
process.env.NODE_ENV = 'test';
process.env.CORTEX_ACTIVE_SEED_SOURCE = 'seed:benchmark';

import { driver, neo4jSession } from '../apps/api/config/neo4j.js';
import { ensureIndexes } from '../packages/database/neo4j/graph.repository.js';

async function runBenchmark() {
    console.log('====================================================');
    console.log('TEST ITEM 2: Neo4j Bus-Factor Query Performance Benchmark');
    console.log('Target Dataset: 1,000 Repositories, 500 People, 10,000+ Edges');
    console.log('====================================================\n');

    const session = neo4jSession();
    const benchmarkSource = 'seed:benchmark';

    try {
        // Step 1: Clean up any previous benchmark artifacts
        console.log('[1/5] Cleaning up any prior benchmark data...');
        await session.run(`
            MATCH (n) WHERE n.source = $source
            DETACH DELETE n
        `, { source: benchmarkSource });

        // Step 2: Seed synthetic dataset
        console.log('[2/5] Seeding 1,000 repositories and 500 people in batch...');
        const seedStart = Date.now();

        // Batch 1: Create 1,000 Repositories
        await session.run(`
            UNWIND range(1, 1000) AS i
            CREATE (r:REPOSITORY {
                externalId: 'repo_bench_' + toString(i),
                name: 'benchmark-org/repo-' + toString(i),
                source: $source,
                createdAt: timestamp()
            })
        `, { source: benchmarkSource });

        // Batch 2: Create 500 People (mix of bots and active engineers)
        await session.run(`
            UNWIND range(1, 500) AS i
            CREATE (p:PERSON {
                externalId: 'person_bench_' + toString(i),
                canonicalPersonId: 'canonical_bench_' + toString(i),
                name: 'Benchmark Engineer ' + toString(i),
                email: 'engineer' + toString(i) + '@benchmark.test',
                isBot: CASE WHEN i % 20 = 0 THEN true ELSE false END,
                isActive: CASE WHEN i % 25 = 0 THEN false ELSE true END,
                source: $source
            })
        `, { source: benchmarkSource });

        // Batch 3: Create 10,000 CONTRIBUTED_TO relationships
        console.log('[3/5] Seeding 10,000 CONTRIBUTED_TO relationships with commit counts...');
        await session.run(`
            UNWIND range(1, 10000) AS i
            WITH i, 
                 'benchmark-org/repo-' + toString((i % 1000) + 1) AS repoName,
                 'canonical_bench_' + toString(((i * 7) % 500) + 1) AS personId,
                 ((i % 50) + 1) AS commits
            MATCH (r:REPOSITORY {name: repoName, source: $source})
            MATCH (p:PERSON {canonicalPersonId: personId, source: $source})
            CREATE (p)-[:CONTRIBUTED_TO {
                source: $source,
                commitCount: commits,
                weightedScore: toFloat(commits),
                lastCommitAt: timestamp() - (i * 3600000)
            }]->(r)
        `, { source: benchmarkSource });

        console.log(`   Seeded 1,000 repos, 500 people, 10,000 edges in ${Date.now() - seedStart}ms.\n`);

        // Step 3: Run the Bus-Factor & Knowledge-Risk Cypher Query
        const targetRepos = [
            'benchmark-org/repo-1',
            'benchmark-org/repo-42',
            'benchmark-org/repo-100',
            'benchmark-org/repo-250',
            'benchmark-org/repo-500',
            'benchmark-org/repo-750',
            'benchmark-org/repo-999',
        ];

        const targetPersonIds = [
            'canonical_bench_1',
            'canonical_bench_42',
            'canonical_bench_100',
            'canonical_bench_250',
            'canonical_bench_450',
        ];

        // Measure query latency
        async function measureQueryLatency(label: string, iterations = 20): Promise<{ min: number; max: number; median: number; p95: number; mean: number; samples: number[] }> {
            const times: number[] = [];
            // Warm up
            for (let i = 0; i < 3; i++) {
                const testRepo = targetRepos[i % targetRepos.length]!;
                await session.run(`
                    MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
                    WHERE r.name = $repoName AND r.source = $source
                      AND (p.isBot IS NULL OR p.isBot = false)
                      AND (p.isActive IS NULL OR p.isActive = true)
                    WITH r, p, sum(COALESCE(rel.commitCount, 1)) AS commits
                    RETURN p.canonicalPersonId AS personId, p.name AS name, commits
                    ORDER BY commits DESC
                `, { repoName: testRepo, source: benchmarkSource });
            }

            for (let i = 0; i < iterations; i++) {
                const testRepo = targetRepos[i % targetRepos.length]!;
                const testPerson = targetPersonIds[i % targetPersonIds.length]!;
                const t0 = performance.now();
                await session.run(`
                    MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
                    WHERE r.name = $repoName AND r.source = $source
                      AND (p.isBot IS NULL OR p.isBot = false)
                      AND (p.isActive IS NULL OR p.isActive = true)
                    WITH r, sum(COALESCE(rel.commitCount, 1)) AS totalCommits
                    MATCH (p2:PERSON)-[rel2:CONTRIBUTED_TO]->(r)
                    WHERE p2.canonicalPersonId = $personId AND p2.source = $source
                    RETURN r.name AS repo, totalCommits, sum(COALESCE(rel2.commitCount, 1)) AS personCommits
                `, { repoName: testRepo, personId: testPerson, source: benchmarkSource });
                const dur = performance.now() - t0;
                times.push(dur);
            }

            times.sort((a, b) => a - b);
            const min = Number(times[0]!.toFixed(2));
            const max = Number(times[times.length - 1]!.toFixed(2));
            const median = Number(times[Math.floor(times.length / 2)]!.toFixed(2));
            const p95 = Number(times[Math.floor(times.length * 0.95)]!.toFixed(2));
            const mean = Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2));
            return { min, max, median, p95, mean, samples: times };
        }

        console.log('[4/5] Executing Bus-Factor / Knowledge-Risk Cypher Queries against synthetic dataset...');
        // First ensure all indexes are created
        await ensureIndexes();

        const latencyStats = await measureQueryLatency('Bus-Factor / Ownership Query with Indexed Nodes', 25);
        console.log('\n--- BENCHMARK RESULTS (1,000 Repositories, 500 People, 10,000 Relationships) ---');
        console.log(`• Iterations Run: 25`);
        console.log(`• Min Latency:    ${latencyStats.min} ms`);
        console.log(`• Median (p50):   ${latencyStats.median} ms`);
        console.log(`• Mean Latency:   ${latencyStats.mean} ms`);
        console.log(`• 95th Percentile: ${latencyStats.p95} ms`);
        console.log(`• Max Latency:    ${latencyStats.max} ms`);

        // Check index presence
        const indexRes = await session.run('SHOW INDEXES');
        const onlineIndexes = indexRes.records.map((r: any) => ({
            name: r.get('name'),
            labels: r.get('labelsOrTypes'),
            properties: r.get('properties'),
            state: r.get('state'),
        }));

        console.log('\nVerified Online Neo4j Indices:');
        for (const idx of onlineIndexes) {
            if (idx.labels) {
                console.log(`  - [${idx.labels.join(', ')}] on (${idx.properties?.join(', ') || ''}) -> ${idx.state} (${idx.name})`);
            }
        }

        // Step 4: Cleanup
        console.log('\n[5/5] Cleaning up synthetic benchmark nodes...');
        await session.run(`
            MATCH (n) WHERE n.source = $source
            DETACH DELETE n
        `, { source: benchmarkSource });
        console.log('   Synthetic data cleaned up successfully.');

        console.log('\n====================================================');
        console.log('🎉 ITEM 2 BENCHMARK COMPLETE WITH REAL NUMBERS!');
        console.log('====================================================\n');
    } finally {
        await session.close();
        await driver.close();
    }
}

runBenchmark().catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});

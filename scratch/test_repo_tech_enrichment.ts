import { driver } from '../apps/api/config/neo4j.js';

async function testRepoTechEnrichment() {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (repository:REPOSITORY)
            OPTIONAL MATCH (p1:PERSON)-[:WORKS_ON|CONTRIBUTED_TO]->(repository)
            OPTIONAL MATCH (work)-[:PART_OF]-(repository)
            OPTIONAL MATCH (p2:PERSON)-[:AUTHORED|CREATED]->(work)
            OPTIONAL MATCH (repository)<-[:PART_OF|FIXED_BY*1..2]-(work2)-[:USES|MENTIONED_IN|HAS_PROBLEM]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (repository)<-[:WORKS_ON|CONTRIBUTED_TO]-(p3:PERSON)-[:USES]->(t2:TECHNOLOGY)
            WITH repository, count(DISTINCT work) AS workItems,
                 collect(DISTINCT {name: p1.name, email: p1.email, role: p1.role, type: 'PERSON'}) +
                 collect(DISTINCT {name: p2.name, email: p2.email, role: p2.role, type: 'PERSON'}) AS rawContributors,
                 collect(DISTINCT {name: work.name, type: labels(work)[0]})[0..30] AS recentEntities,
                 collect(DISTINCT t1.name) + collect(DISTINCT t2.name) AS rawTechs
            WITH repository, workItems, [c in rawContributors WHERE c.name IS NOT NULL] AS contributors, recentEntities,
                 [t in rawTechs WHERE t IS NOT NULL] AS technologies
            RETURN repository.name AS repository,
                   workItems,
                   contributors[0..20] AS contributors,
                   recentEntities,
                   technologies
            ORDER BY repository.name
        `);

        console.log('--- REPO TO TECH RESULT ---');
        for (const rec of result.records) {
            console.log(`Repo: ${rec.get('repository')} -> Technologies: [${rec.get('technologies').join(', ')}]`);
        }

    } finally {
        await session.close();
        await driver.close();
    }
}

testRepoTechEnrichment();

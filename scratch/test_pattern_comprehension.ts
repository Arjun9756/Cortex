import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        console.log('--- TESTING PATTERN COMPREHENSION QUERY ---');
        // Warmup
        await s.run('RETURN 1');

        const t0 = Date.now();
        const res = await s.run(`
            MATCH (p:PERSON)
            WHERE p.name IN $candidateNames
            RETURN p.name AS name,
                   p.email AS email,
                   p.externalId AS externalId,
                   [(p)-[:USES|AUTHORED]->(t:TECHNOLOGY) | toLower(trim(t.name))] +
                   [(p)-[:AUTHORED|CREATED]->()-[:USES]->(t:TECHNOLOGY) | toLower(trim(t.name))] +
                   [(p)-[:CREATED|AUTHORED]->(:ISSUE)<-[:MENTIONED_IN]-(t:TECHNOLOGY) | toLower(trim(t.name))] +
                   [(p)-[:WORKS_ON]->(:REPOSITORY)-[:USES]->(t:TECHNOLOGY) | toLower(trim(t.name))] AS rawTechs,
                   [(p)-[:WORKS_ON]->(r:REPOSITORY) | toLower(trim(r.name))] +
                   [(p)-[:AUTHORED|CREATED]->()-[:PART_OF]->(r:REPOSITORY) | toLower(trim(r.name))] AS rawRepos
        `, { candidateNames: ['Priya Sharma', 'Devendra Singh', 'Rohan Verma', 'Vikram Patel', 'Neha Gupta', 'Michael', 'Amina Zahra'] });
        const elapsed = Date.now() - t0;
        console.log(`Pattern comprehension query took: ${elapsed}ms for ${res.records.length} records!`);
        for (const r of res.records) {
            console.log(`- ${r.get('name')}: techs=${r.get('rawTechs').length}, repos=${r.get('rawRepos').length}`);
        }
    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));

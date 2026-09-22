import { neo4jSession } from '../apps/api/config/neo4j.js';
import { CYPHER_BOT_FILTER } from '../packages/shared/botDetection.js';

const session = neo4jSession();
async function main() {
    const q = `MATCH (r:REPOSITORY)
     WHERE toLower(r.name) = toLower($repoName)
     OPTIONAL MATCH (p1:PERSON)-[:CONTRIBUTED_TO|WORKS_ON]->(r)
     OPTIONAL MATCH (p2:PERSON)-[]-(e)-[:PART_OF]->(r)
     WITH collect(DISTINCT p1) + collect(DISTINCT p2) AS allP
     UNWIND allP AS p
     WITH p WHERE p IS NOT NULL
       AND ${CYPHER_BOT_FILTER}
     RETURN count(DISTINCT COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name)) AS count`;

    console.log("Query:\n", q);
    try {
        await session.run(q, { repoName: 'Cortex' });
        console.log("Query succeeded!");
    } catch(e: any) {
        console.error("Caught error:", e.message);
    } finally {
        await session.close();
        process.exit(0);
    }
}
main();

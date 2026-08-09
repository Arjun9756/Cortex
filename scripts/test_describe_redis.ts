import { describeEntity, countByLabel, listNodes } from '../packages/graph/cypher/analysis.cypher.js';

async function main() {
    console.log("=== DESCRIBE ENTITY REDIS ===");
    const desc = await describeEntity("Redis");
    console.log(JSON.stringify(desc, null, 2));

    console.log("\n=== LIST NODES REDIS ===");
    const list = await listNodes("Redis");
    console.log(JSON.stringify(list, null, 2));

    console.log("\n=== COUNT BY LABEL REDIS -> PERSON ===");
    const count = await countByLabel("Redis", "PERSON");
    console.log(JSON.stringify(count, null, 2));

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

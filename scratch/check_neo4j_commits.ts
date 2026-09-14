import { driver } from '../apps/api/config/neo4j.js';

async function test() {
  const session = driver.session();
  try {
    const res = await session.run(`
      MATCH (c:COMMIT)-[rel:PART_OF]->(r {name: 'cortex-core'})
      RETURN c, properties(c) AS props, type(rel) AS rel
    `);
    console.log('cortex-core commit node details:');
    console.log(JSON.stringify(res.records.map(r => r.get('props')), null, 2));
  } finally {
    await session.close();
    process.exit(0);
  }
}
test().catch(e => { console.error(e); process.exit(1); });

import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function inspectDb() {
  console.log('=====================================================================');
  console.log('RAW POSTGRESQL REPO_METRICS:');
  const repos = await sql`SELECT * FROM repo_metrics`;
  console.log(JSON.stringify(repos, null, 2));

  console.log('\nRAW POSTGRESQL PERSON_METRICS:');
  const people = await sql`SELECT * FROM person_metrics`;
  console.log(JSON.stringify(people, null, 2));

  console.log('\nRAW POSTGRESQL TECHNOLOGY_METRICS:');
  const tech = await sql`SELECT * FROM technology_metrics`;
  console.log(JSON.stringify(tech, null, 2));

  console.log('\nRAW POSTGRESQL WORKSPACE_METRICS:');
  const workspace = await sql`SELECT * FROM workspace_metrics`;
  console.log(JSON.stringify(workspace, null, 2));

  console.log('\nNEO4J NODES COUNT:');
  const session = driver.session();
  try {
    const r = await session.run(`MATCH (r:REPOSITORY) RETURN r.name AS name, r.externalId AS externalId`);
    console.log('Neo4j Repos:', r.records.map(rec => rec.toObject()));

    const p = await session.run(`MATCH (p:PERSON) RETURN p.name AS name, p.externalId AS externalId`);
    console.log('Neo4j People:', p.records.map(rec => rec.toObject()));

    const t = await session.run(`MATCH (t:TECHNOLOGY) RETURN t.name AS name`);
    console.log('Neo4j Tech:', t.records.map(rec => rec.toObject()));
  } finally {
    await session.close();
  }
  console.log('=====================================================================');
  process.exit(0);
}

inspectDb().catch((e) => {
  console.error(e);
  process.exit(1);
});

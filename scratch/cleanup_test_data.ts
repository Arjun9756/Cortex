import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function clean() {
  const prefix = 'strict_test_';
  const repoName = prefix + 'cortex_repo';
  await sql`DELETE FROM events WHERE id LIKE ${prefix + '%'}`;
  await sql`DELETE FROM person_identity WHERE external_id LIKE ${prefix + '%'} OR external_id IN ('101', '102', '103', '99101', '99102', '99103') OR username LIKE ${prefix + '%'}`;
  await sql`DELETE FROM identity_merge_log WHERE person_a LIKE ${prefix + '%'} OR person_b LIKE ${'%' + prefix + '%'}`;
  await sql`DELETE FROM potential_duplicates WHERE person_a_username LIKE ${prefix + '%'} OR person_b_username LIKE ${prefix + '%'}`;
  await sql`DELETE FROM repo_metrics WHERE external_id = ${repoName}`;

  const session = driver.session();
  try {
    await session.run(`MATCH (p:PERSON) WHERE p.externalId IN ['99101', '99102', '99103', '101', '102', '103'] DETACH DELETE p`);
    await session.run(`MATCH (r:REPOSITORY {name: $repoName}) DETACH DELETE r`, { repoName });
    await session.run(`MATCH (c:COMMIT) WHERE c.name STARTS WITH $prefix DETACH DELETE c`, { prefix });
  } finally {
    await session.close();
  }
  console.log('✅ Test records successfully cleaned up.');
  process.exit(0);
}

clean().catch(err => {
  console.error(err);
  process.exit(1);
});

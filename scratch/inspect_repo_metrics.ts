import sql from '../apps/api/config/postgres.js';

async function check() {
  const repos = await sql`SELECT repo_name, bus_factor, risk_score, status, contributor_count, primary_owner FROM repo_metrics ORDER BY bus_factor ASC`;
  console.log('Total repos in repo_metrics:', repos.length);
  console.table(repos);
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });

import sql from '../apps/api/config/postgres.js';

async function main() {
  const repos = await sql`
    SELECT repo_name, bus_factor, risk_score, contributor_count, status 
    FROM repo_metrics 
    ORDER BY bus_factor ASC, risk_score DESC
  `;
  console.log('=== CURRENT REPO METRICS (Total: ' + repos.length + ') ===');
  console.table(repos);

  const busFactor1 = await sql`
    SELECT repo_name, bus_factor, risk_score, contributor_count, status 
    FROM repo_metrics 
    WHERE bus_factor <= 1
    ORDER BY bus_factor ASC, risk_score DESC
  `;
  console.log('=== REPOS WITH BUS FACTOR <= 1 (Total: ' + busFactor1.length + ') ===');
  console.table(busFactor1);

  process.exit(0);
}

main().catch(console.error);

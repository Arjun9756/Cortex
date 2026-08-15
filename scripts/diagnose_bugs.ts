import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import http from 'http';

async function fetchUrl(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runDiagnosis() {
  console.log('=====================================================================');
  console.log('🔍 DIAGNOSING DASHBOARD OVERVIEW VS TECHNOLOGIES VS RISK ALERTS');
  console.log('=====================================================================');

  const overview = await fetchUrl('http://localhost:3000/api/dashboard/overview');
  const techPage = await fetchUrl('http://localhost:3000/api/dashboard/technologies');

  console.log('\n--- OVERVIEW ENDPOINT RETURNED DATA ---');
  console.log('stats:', overview.stats);
  console.log('healthScore.breakdown:', overview.healthScore?.breakdown);
  console.log('riskAlerts length:', overview.riskAlerts?.length);
  console.log('riskAlerts items:', JSON.stringify(overview.riskAlerts, null, 2));
  console.log('repos count:', overview.repos?.length);
  console.log('repos bus factors:', overview.repos?.map((r: any) => ({ name: r.repo_name, bus_factor: r.bus_factor, type: typeof r.bus_factor })));
  console.log('overview.technologies count:', overview.technologies?.length);

  console.log('\n--- TECHNOLOGIES ENDPOINT RETURNED DATA ---');
  console.log('techPage.technologies count:', techPage.technologies?.length);
  console.log('techPage.technologies sample:', techPage.technologies?.slice(0, 3));

  console.log('\n--- DIRECT POSTGRESQL QUERIES ---');
  const pRepos = await sql`SELECT repo_name, bus_factor, risk_score FROM repo_metrics`;
  console.log('Postgres repo_metrics:', pRepos);

  const pTech = await sql`SELECT tech_name, usage_percent, contributor_count FROM technology_metrics`;
  console.log('Postgres technology_metrics count:', pTech.length);
  console.log('Postgres technology_metrics items:', pTech);

  console.log('\n--- DIRECT NEO4J GRAPH QUERIES ---');
  const session = driver.session();
  try {
    const neoTech = await session.run(`MATCH (t:TECHNOLOGY) RETURN t.name AS name`);
    console.log('Neo4j TECHNOLOGY nodes:', neoTech.records.map(r => r.get('name')));
  } finally {
    await session.close();
  }
  console.log('=====================================================================');
  process.exit(0);
}

runDiagnosis().catch(console.error);

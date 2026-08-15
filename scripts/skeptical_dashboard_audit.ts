import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import http from 'http';

async function fetchOverviewApi(): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/dashboard/overview', (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runSkepticalAudit() {
  console.log('================================================================================');
  console.log('🔍 SKEPTICAL BACKEND AUDIT OF COMMAND CENTER DASHBOARD DATA INTEGRITY');
  console.log('================================================================================\n');

  // 1. Fetch API response
  let apiData: any = null;
  try {
    apiData = await fetchOverviewApi();
  } catch (err: any) {
    console.error('CRITICAL: API fetch failed:', err?.message);
    process.exit(1);
  }

  // 2. Direct PostgreSQL Audits
  console.log('--- DIRECT POSTGRESQL QUERIES ---');
  const pgWorkspace = await sql`SELECT * FROM workspace_metrics ORDER BY computed_at DESC LIMIT 1`;
  const pgRepos = await sql`SELECT * FROM repo_metrics ORDER BY risk_score DESC`;
  const pgPeople = await sql`SELECT * FROM person_metrics ORDER BY risk_score DESC`;
  const pgTech = await sql`SELECT * FROM technology_metrics ORDER BY usage_percent DESC`;
  const pgEventsCount = await sql`SELECT count(*)::int as count FROM events`;

  console.log(`[Postgres] workspace_metrics count: ${pgWorkspace.length}`);
  console.log(`[Postgres] repo_metrics rows count: ${pgRepos.length}`);
  console.log(`[Postgres] person_metrics rows count: ${pgPeople.length}`);
  console.log(`[Postgres] technology_metrics rows count: ${pgTech.length}`);
  console.log(`[Postgres] events count: ${pgEventsCount[0]?.count}`);

  console.log('\n--- DIRECT NEO4J QUERIES ---');
  const session = driver.session();
  let neo4jRepoCount = 0;
  let neo4jPersonCount = 0;
  let neo4jTechCount = 0;
  let neo4jTechNames: string[] = [];

  try {
    const repoRes = await session.run(`MATCH (r:REPOSITORY) RETURN count(r) AS count`);
    neo4jRepoCount = repoRes.records[0]?.get('count')?.toNumber() ?? 0;

    const personRes = await session.run(`MATCH (p:PERSON) RETURN count(p) AS count`);
    neo4jPersonCount = personRes.records[0]?.get('count')?.toNumber() ?? 0;

    const techRes = await session.run(`MATCH (t:TECHNOLOGY) RETURN count(t) AS count, collect(t.name) AS names`);
    neo4jTechCount = techRes.records[0]?.get('count')?.toNumber() ?? 0;
    neo4jTechNames = techRes.records[0]?.get('names') ?? [];
  } catch (neoErr: any) {
    console.error('[Neo4j] Query error:', neoErr?.message);
  } finally {
    await session.close();
  }

  console.log(`[Neo4j] REPOSITORY node count: ${neo4jRepoCount}`);
  console.log(`[Neo4j] PERSON node count: ${neo4jPersonCount}`);
  console.log(`[Neo4j] TECHNOLOGY node count: ${neo4jTechCount} (${neo4jTechNames.join(', ')})`);

  console.log('\n================================================================================');
  console.log('🧐 AUDITING CONTRADICTION 1: SPOF REPOS VS RISK ALERTS LIST');
  console.log('================================================================================');
  
  // Trace SPOF Repos count logic vs Risk Alerts population logic
  console.log('\n[Postgres repo_metrics details]:');
  pgRepos.forEach((r: any) => {
    console.log(`  - Repo: ${r.repo_name} | bus_factor: ${r.bus_factor} (type: ${typeof r.bus_factor}) | risk_score: ${r.risk_score} (type: ${typeof r.risk_score})`);
  });

  const spofReposInPg = pgRepos.filter((r: any) => Number(r.bus_factor ?? 1) <= 1);
  console.log(`\nDirect JS Filter (Number(bus_factor) <= 1): ${spofReposInPg.length} SPOF repos`);
  console.log(`API returned healthScore.breakdown.spofRepoCount: ${apiData.healthScore?.breakdown?.spofRepoCount}`);
  console.log(`API returned riskAlerts array length: ${apiData.riskAlerts?.length}`);
  console.log(`API returned riskAlerts items:`, JSON.stringify(apiData.riskAlerts, null, 2));

  console.log('\n================================================================================');
  console.log('🧐 AUDITING CONTRADICTION 2: TECHNOLOGIES STAT CARD = 0');
  console.log('================================================================================');
  console.log(`[Neo4j Graph] TECHNOLOGY nodes present: ${neo4jTechCount} (${neo4jTechNames.join(', ')})`);
  console.log(`[Postgres DB] technology_metrics rows count: ${pgTech.length}`);
  console.log(`[API Response] stats.techCount: ${apiData.stats?.techCount}`);
  console.log(`[API Response] technologies array length: ${apiData.technologies?.length}`);

  console.log('\n================================================================================');
  console.log('📋 AUDITING EVERY SINGLE DASHBOARD STAT & HEALTH SCORE');
  console.log('================================================================================');

  // Audit 1: Repositories Count
  console.log('\n1. STAT CARD: REPOSITORIES');
  console.log(`   - Direct DB (Postgres repo_metrics): ${pgRepos.length}`);
  console.log(`   - Direct DB (Neo4j REPOSITORY nodes): ${neo4jRepoCount}`);
  console.log(`   - API stats.repoCount: ${apiData.stats?.repoCount}`);
  console.log(`   - Result: ${pgRepos.length === apiData.stats?.repoCount ? 'PASS' : 'FAIL'}`);

  // Audit 2: People Count
  console.log('\n2. STAT CARD: PEOPLE');
  console.log(`   - Direct DB (Postgres person_metrics): ${pgPeople.length}`);
  console.log(`   - Direct DB (Neo4j PERSON nodes): ${neo4jPersonCount}`);
  console.log(`   - API stats.peopleCount: ${apiData.stats?.peopleCount}`);
  console.log(`   - Result: ${pgPeople.length === apiData.stats?.peopleCount ? 'PASS' : 'FAIL'}`);

  // Audit 3: Technologies Count
  console.log('\n3. STAT CARD: TECHNOLOGIES');
  console.log(`   - Direct DB (Postgres technology_metrics): ${pgTech.length}`);
  console.log(`   - Direct DB (Neo4j TECHNOLOGY nodes): ${neo4jTechCount}`);
  console.log(`   - API stats.techCount: ${apiData.stats?.techCount}`);
  console.log(`   - Result: ${neo4jTechCount === apiData.stats?.techCount && pgTech.length === apiData.stats?.techCount ? 'PASS' : 'FAIL'}`);

  // Audit 4: Avg Bus Factor
  const rawBusFactors = pgRepos.map((r: any) => Number(r.bus_factor));
  const rawAvgBusFactor = rawBusFactors.length > 0 ? (rawBusFactors.reduce((a, b) => a + b, 0) / rawBusFactors.length) : 0;
  console.log('\n4. STAT CARD: AVG BUS FACTOR');
  console.log(`   - Direct DB Raw Bus Factors: [${rawBusFactors.join(', ')}]`);
  console.log(`   - Direct DB Raw Average: ${rawAvgBusFactor.toFixed(2)}`);
  console.log(`   - API stats.avgBusFactor: ${apiData.stats?.avgBusFactor}`);
  console.log(`   - Result: ${Number(rawAvgBusFactor.toFixed(1)) === apiData.stats?.avgBusFactor ? 'PASS' : 'FAIL'}`);

  // Audit 5: Avg Knowledge Risk
  const rawKnowledgeRisks = pgPeople.map((p: any) => Number(p.risk_score));
  const rawAvgKnowledgeRisk = rawKnowledgeRisks.length > 0 ? (rawKnowledgeRisks.reduce((a, b) => a + b, 0) / rawKnowledgeRisks.length) : 0;
  console.log('\n5. METRIC: AVG KNOWLEDGE RISK');
  console.log(`   - Direct DB Raw Risk Scores: [${rawKnowledgeRisks.join(', ')}]`);
  console.log(`   - Direct DB Raw Average: ${rawAvgKnowledgeRisk.toFixed(2)}%`);
  console.log(`   - API healthScore.breakdown.avgKnowledgeRisk: ${apiData.healthScore?.breakdown?.avgKnowledgeRisk}%`);
  console.log(`   - Result: ${Math.round(rawAvgKnowledgeRisk) === apiData.healthScore?.breakdown?.avgKnowledgeRisk ? 'PASS' : 'FAIL'}`);

  // Audit 6: Engineering Health Index
  console.log('\n6. METRIC: ENGINEERING HEALTH INDEX');
  const rawSpofPct = pgRepos.length > 0 ? (spofReposInPg.length / pgRepos.length) * 100 : 0;
  const rawBfPenalty = Math.max(0, 100 - rawAvgBusFactor * 25);
  const rawCompositeRisk = Math.round(0.35 * rawAvgKnowledgeRisk + 0.35 * rawSpofPct + 0.30 * rawBfPenalty);
  const expectedHealthScore = Math.max(0, Math.min(100, 100 - rawCompositeRisk));

  console.log(`   - Direct Formula Inputs: AvgKR=${rawAvgKnowledgeRisk.toFixed(2)}%, SPOF%=${rawSpofPct.toFixed(2)}%, AvgBF=${rawAvgBusFactor.toFixed(2)}`);
  console.log(`   - Formula Math: 100 - round(0.35 * ${rawAvgKnowledgeRisk.toFixed(2)} + 0.35 * ${rawSpofPct.toFixed(2)} + 0.30 * ${rawBfPenalty.toFixed(2)})`);
  console.log(`   - Direct Calculated Score: ${expectedHealthScore}`);
  console.log(`   - API healthScore.score: ${apiData.healthScore?.score}`);
  console.log(`   - Result: ${expectedHealthScore === apiData.healthScore?.score ? 'PASS' : 'FAIL'}`);

  console.log('\n================================================================================');
  process.exit(0);
}

runSkepticalAudit().catch((e) => {
  console.error('Audit Script Error:', e);
  process.exit(1);
});

import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import http from 'http';

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
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

async function auditAll() {
  console.log('=====================================================================');
  console.log('🔍 FULL AUDIT: BUG 1, BUG 2, BUG 3 & ALL REGRESSION TESTS');
  console.log('=====================================================================\n');

  // 1. AUDIT BUG 3 (Neo4j TECHNOLOGY nodes)
  console.log('--- 1. AUDITING NEO4J GRAPH FOR TECHNOLOGY NODES ---');
  const session = driver.session();
  let neoTechNames: string[] = [];
  try {
    const neoRes = await session.run(`MATCH (t:TECHNOLOGY) RETURN t.name AS name ORDER BY name ASC`);
    neoTechNames = neoRes.records.map(r => r.get('name')).filter(Boolean);
    console.log(`Total TECHNOLOGY nodes in Neo4j: ${neoTechNames.length}`);
    console.log(`Neo4j TECHNOLOGY node list:`, neoTechNames);

    // Check for case-variant duplicate pairs
    const caseGroups = new Map<string, string[]>();
    for (const name of neoTechNames) {
      const key = name.trim().toLowerCase();
      if (!caseGroups.has(key)) caseGroups.set(key, []);
      caseGroups.get(key)!.push(name);
    }
    const duplicatePairs: string[] = [];
    for (const [key, variants] of caseGroups.entries()) {
      if (variants.length > 1) {
        duplicatePairs.push(`"${key}": [${variants.map(v => `"${v}"`).join(', ')}]`);
      }
    }
    console.log(`Case-variant duplicate groups in Neo4j: ${duplicatePairs.length}`);
    if (duplicatePairs.length > 0) {
      console.log(`❌ DUPLICATE PAIRS DETECTED:`, duplicatePairs.join('; '));
    } else {
      console.log(`✅ ZERO CASE-VARIANT DUPLICATE NODES IN NEO4J GRAPH! (e.g. "Redis" and "redis" are 1 node)`);
    }
  } finally {
    await session.close();
  }

  // 2. AUDIT POSTGRESQL technology_metrics TABLE
  console.log('\n--- 2. AUDITING POSTGRESQL technology_metrics TABLE ---');
  const pTech = await sql`SELECT tech_name, usage_percent, contributor_count FROM technology_metrics ORDER BY tech_name ASC`;
  console.log(`Total rows in PostgreSQL technology_metrics: ${pTech.length}`);
  console.log(`PostgreSQL technology_metrics list:`, pTech.map((t: any) => `${t.tech_name} (usage: ${t.usage_percent}%, contributors: ${t.contributor_count})`));

  // 3. AUDIT API ENDPOINTS
  console.log('\n--- 3. AUDITING API ENDPOINTS OVERVIEW VS TECHNOLOGIES PAGE ---');
  let overview: any = null;
  let techPage: any = null;
  try {
    overview = await fetchJson('http://localhost:3000/api/dashboard/overview');
    techPage = await fetchJson('http://localhost:3000/api/dashboard/technologies');
    console.log(`Overview stats.techCount: ${overview.stats?.techCount}`);
    console.log(`Technology Stack page technologies count: ${techPage.technologies?.length}`);
    console.log(`Technology Stack page items list:`, techPage.technologies?.map((t: any) => t.tech_name || t.name));
  } catch (err: any) {
    console.error(`Failed to fetch API endpoints:`, err?.message);
  }

  // 4. RUN ALL 3 REGRESSION TESTS
  console.log('\n=====================================================================');
  console.log('🧪 RUNNING REGRESSION TESTS 1, 2, AND 3');
  console.log('=====================================================================');

  let passed = true;

  // TEST 1: SPOF Repo Count vs Risk Alerts Consistency
  const spofCountFromBreakdown = overview?.healthScore?.breakdown?.spofRepoCount ?? 0;
  const criticalSpofAlertsCount = (overview?.riskAlerts || []).filter(
    (a: any) => a.category === 'Bus Factor' && a.severity === 'critical'
  ).length;
  console.log(`\nTEST 1 (SPOF Alerts Parity): Breakdown SPOF count = ${spofCountFromBreakdown}, Critical Bus Factor Alerts = ${criticalSpofAlertsCount}`);
  if (spofCountFromBreakdown === criticalSpofAlertsCount) {
    console.log(`✅ TEST 1 PASSED`);
  } else {
    console.error(`❌ TEST 1 FAILED`);
    passed = false;
  }

  // TEST 2: Overview Tech Count vs Technology Stack Page Count Parity
  const overviewTechCount = overview?.stats?.techCount ?? 0;
  const techPageCount = techPage?.technologies?.length ?? 0;
  console.log(`\nTEST 2 (Tech Count Parity): Overview techCount = ${overviewTechCount}, Tech Page count = ${techPageCount}`);
  if (overviewTechCount === techPageCount && overviewTechCount > 0) {
    console.log(`✅ TEST 2 PASSED`);
  } else {
    console.error(`❌ TEST 2 FAILED`);
    passed = false;
  }

  // TEST 3: Neo4j Case-Variant Duplicate TECHNOLOGY Nodes Audit
  const caseDuplicateCount = neoTechNames.length - new Set(neoTechNames.map(n => n.toLowerCase())).size;
  console.log(`\nTEST 3 (Case-Variant Graph Audit): Duplicate case-insensitive TECHNOLOGY nodes = ${caseDuplicateCount}`);
  if (caseDuplicateCount === 0) {
    console.log(`✅ TEST 3 PASSED`);
  } else {
    console.error(`❌ TEST 3 FAILED`);
    passed = false;
  }

  console.log('\n=====================================================================');
  if (passed) {
    console.log('🎉 ALL 3 REGRESSION TESTS PASSED (100% VERIFIED)');
  } else {
    console.error('🚨 AUDIT FAILED');
  }
  console.log('=====================================================================\n');

  process.exit(passed ? 0 : 1);
}

auditAll().catch(console.error);

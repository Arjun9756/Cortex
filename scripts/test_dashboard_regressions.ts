import http from 'http';
import { driver } from '../apps/api/config/neo4j.js';

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

async function runRegressionTests() {
  console.log('=====================================================================');
  console.log('🧪 AUTOMATED REGRESSION TEST SUITE: DASHBOARD & ANALYTICS INTEGRITY');
  console.log('=====================================================================\n');

  let overviewData: any = null;
  let techPageData: any = null;

  try {
    overviewData = await fetchJson('http://localhost:3000/api/dashboard/overview');
    techPageData = await fetchJson('http://localhost:3000/api/dashboard/technologies');
  } catch (err: any) {
    console.error('❌ CRITICAL: Failed to connect to API server at http://localhost:3000:', err?.message);
    process.exit(1);
  }

  let passed = true;

  // TEST 1: SPOF Repo Count vs Risk Alerts Consistency
  console.log('--- TEST 1: SPOF REPO COUNT VS RISK ALERTS CONSISTENCY ---');
  const spofCountFromBreakdown = overviewData.healthScore?.breakdown?.spofRepoCount ?? 0;
  const criticalSpofAlerts = (overviewData.riskAlerts || []).filter(
    (a: any) => a.category === 'Bus Factor' && a.severity === 'critical'
  );
  const spofAlertsCount = criticalSpofAlerts.length;

  console.log(`- Header Breakdown SPOF Repos Count: ${spofCountFromBreakdown}`);
  console.log(`- Critical Bus Factor Risk Alerts Count: ${spofAlertsCount}`);
  if (spofCountFromBreakdown === spofAlertsCount) {
    console.log('✅ TEST 1 PASSED: SPOF Repo breakdown matches Critical Bus Factor Risk Alerts count.');
  } else {
    console.error(`❌ TEST 1 FAILED: Discrepancy detected! Breakdown = ${spofCountFromBreakdown}, Alerts = ${spofAlertsCount}`);
    passed = false;
  }

  // TEST 2: Overview Tech Count vs Technology Stack Page Count
  console.log('\n--- TEST 2: OVERVIEW TECH COUNT VS TECHNOLOGY STACK PAGE COUNT ---');
  const overviewTechCount = overviewData.stats?.techCount ?? 0;
  const techPageCount = techPageData.technologies?.length ?? 0;

  console.log(`- Overview Page stats.techCount: ${overviewTechCount}`);
  console.log(`- Technology Stack Page technologies.length: ${techPageCount}`);
  if (overviewTechCount === techPageCount && overviewTechCount > 0) {
    console.log(`✅ TEST 2 PASSED: Overview page techCount (${overviewTechCount}) matches Technology Stack page count (${techPageCount}).`);
  } else {
    console.error(`❌ TEST 2 FAILED: Discrepancy detected! Overview = ${overviewTechCount}, Tech Page = ${techPageCount}`);
    passed = false;
  }

  // TEST 3: Neo4j Case-Variant Duplicate TECHNOLOGY Nodes Audit
  console.log('\n--- TEST 3: CASE-VARIANT DUPLICATE TECHNOLOGY NODES AUDIT ---');
  const session = driver.session();
  let duplicateCount = 0;
  const duplicatePairs: string[] = [];

  try {
    const techRes = await session.run(`MATCH (t:TECHNOLOGY) RETURN t.name AS name`);
    const names = techRes.records.map(r => (r.get('name') as string) || '').filter(Boolean);

    const groups = new Map<string, string[]>();
    for (const name of names) {
      const key = name.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(name);
    }

    for (const [key, variants] of groups.entries()) {
      if (variants.length > 1) {
        duplicateCount += (variants.length - 1);
        duplicatePairs.push(`"${key}": [${variants.map(v => `"${v}"`).join(', ')}]`);
      }
    }

    console.log(`- Total TECHNOLOGY nodes queried in Neo4j: ${names.length}`);
    console.log(`- Case-variant duplicate groups found: ${duplicatePairs.length}`);
    if (duplicatePairs.length > 0) {
      console.log(`  Duplicates details:`, duplicatePairs.join('; '));
    }

    if (duplicateCount === 0) {
      console.log('✅ TEST 3 PASSED: Zero case-variant duplicate TECHNOLOGY nodes in Neo4j graph (e.g. "Redis" and "redis" are merged).');
    } else {
      console.error(`❌ TEST 3 FAILED: Found ${duplicateCount} duplicate TECHNOLOGY nodes matching case-insensitively!`);
      passed = false;
    }
  } catch (neoErr: any) {
    console.error('❌ TEST 3 FAILED: Neo4j query error:', neoErr?.message);
    passed = false;
  } finally {
    await session.close();
  }

  console.log('\n=====================================================================');
  if (passed) {
    console.log('🎉 ALL DASHBOARD REGRESSION TESTS PASSED (100% DATA INTEGRITY)');
  } else {
    console.error('🚨 REGRESSION DETECTED — AUDIT & FIX REQUIRED');
  }
  console.log('=====================================================================\n');

  process.exit(passed ? 0 : 1);
}

runRegressionTests().catch((e) => {
  console.error('Test Runner Error:', e);
  process.exit(1);
});

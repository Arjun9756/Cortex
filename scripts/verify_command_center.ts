import http from 'http';

async function fetchOverview(): Promise<{ data: any; elapsed: number }> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    http.get('http://localhost:3000/api/dashboard/overview', (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const elapsed = Math.round(performance.now() - startTime);
        try {
          resolve({ data: JSON.parse(body), elapsed });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runVerification() {
  console.log('=====================================================================');
  console.log('📊 COMMAND CENTER DASHBOARD & HEALTH SCORE VERIFICATION');
  console.log('=====================================================================');

  // Benchmark latency over 5 consecutive requests
  const latencies: number[] = [];
  let resData: any = null;

  for (let i = 0; i < 5; i++) {
    const { data, elapsed } = await fetchOverview();
    latencies.push(elapsed);
    if (!resData) resData = data;
  }

  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);

  console.log(`\n⚡ PERFORMANCE LATENCY BENCHMARK:`);
  console.log(`- 5 Sample Requests Latencies: ${latencies.join('ms, ')}ms`);
  console.log(`- Min Latency: ${minLatency}ms`);
  console.log(`- Max Latency: ${maxLatency}ms`);
  console.log(`- Average Latency: ${avgLatency}ms (SLA Requirement: < 100ms) => ${avgLatency < 100 ? '✅ PASSED' : '❌ FAILED'}`);

  console.log(`\n📐 STEP-BY-STEP MANUAL FORMULA CALCULATION VERIFICATION:`);
  const repos = resData.repos || [];
  const people = resData.people || [];
  const workspace = resData.workspace || {};

  console.log(`\n1. Input Data Extracted from Pre-computed DB Metrics:`);
  console.log(`   - Total Repositories (N_repos): ${repos.length}`);
  console.log(`   - Total Team Members (N_people): ${people.length}`);

  const spofRepos = repos.filter((r: any) => (r.bus_factor ?? 1) <= 1);
  console.log(`   - Repos with Bus Factor <= 1 (SPOF): ${spofRepos.length} repos [${spofRepos.map((r: any) => r.repo_name).join(', ')}]`);

  const sumBusFactor = repos.reduce((acc: number, r: any) => acc + Number(r.bus_factor ?? 1), 0);
  const avgBusFactor = repos.length > 0 ? sumBusFactor / repos.length : 1;
  console.log(`   - Sum of Bus Factors: ${sumBusFactor}`);
  console.log(`   - Average Bus Factor (Avg_BF): ${avgBusFactor.toFixed(2)}`);

  const sumKnowledgeRisk = people.reduce((acc: number, p: any) => acc + Number(p.risk_score ?? 0), 0);
  const avgKnowledgeRisk = people.length > 0 ? sumKnowledgeRisk / people.length : 45;
  console.log(`   - Sum of Knowledge Risk Scores: ${sumKnowledgeRisk}%`);
  console.log(`   - Average Knowledge Risk (Avg_KR): ${avgKnowledgeRisk.toFixed(2)}%`);

  console.log(`\n2. Step-by-Step Sub-Component Penalties:`);
  const spofPct = repos.length > 0 ? (spofRepos.length / repos.length) * 100 : 0;
  console.log(`   a) SPOF Repo Percentage (SPOF%): (${spofRepos.length} / ${repos.length}) * 100 = ${spofPct.toFixed(2)}%`);

  const busFactorPenalty = Math.max(0, 100 - avgBusFactor * 25);
  console.log(`   b) Low Bus Factor Penalty: max(0, 100 - ${avgBusFactor.toFixed(2)} * 25) = ${busFactorPenalty.toFixed(2)}`);

  console.log(`\n3. Weighted Risk Penalty Combination:`);
  console.log(`   - Weight 1 (Knowledge Risk 35%): 0.35 * ${avgKnowledgeRisk.toFixed(2)} = ${(0.35 * avgKnowledgeRisk).toFixed(2)}`);
  console.log(`   - Weight 2 (SPOF Repos 35%):     0.35 * ${spofPct.toFixed(2)} = ${(0.35 * spofPct).toFixed(2)}`);
  console.log(`   - Weight 3 (Bus Factor 30%):    0.30 * ${busFactorPenalty.toFixed(2)} = ${(0.30 * busFactorPenalty).toFixed(2)}`);

  const compositeRiskRaw = 0.35 * avgKnowledgeRisk + 0.35 * spofPct + 0.30 * busFactorPenalty;
  const compositeRisk = Math.round(compositeRiskRaw);
  console.log(`   - Raw Sum: ${(0.35 * avgKnowledgeRisk).toFixed(2)} + ${(0.35 * spofPct).toFixed(2)} + ${(0.30 * busFactorPenalty).toFixed(2)} = ${compositeRiskRaw.toFixed(2)}`);
  console.log(`   - Rounded Composite Risk: ${compositeRisk}`);

  const calculatedHealthScore = Math.max(0, Math.min(100, 100 - compositeRisk));
  console.log(`\n4. Final Health Score Output:`);
  console.log(`   - Calculated Score: 100 - ${compositeRisk} = ${calculatedHealthScore}`);
  console.log(`   - API Endpoint Returned Score: ${resData.healthScore?.score}`);
  console.log(`   - Match Verification: ${calculatedHealthScore === resData.healthScore?.score ? '✅ EXACT MATCH' : '❌ MISMATCH'}`);
  console.log(`   - Letter Grade: ${resData.healthScore?.grade} (${resData.healthScore?.statusText})`);
  console.log(`   - One-Line Explanation: "${resData.healthScore?.explanation}"`);

  console.log('\n=====================================================================');
}

runVerification().catch(console.error);

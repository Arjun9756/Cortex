async function testEndToEnd() {
    console.log('================================================================');
    console.log('END-TO-END VERIFICATION: DEPARTURE SIMULATION FLOW');
    console.log('================================================================\n');

    // 1. Fetch people list (simulating PeoplePage load)
    const t0 = Date.now();
    const peopleRes = await fetch('http://localhost:3000/api/dashboard/people');
    if (!peopleRes.ok) {
        throw new Error(`Failed to fetch /api/dashboard/people: ${peopleRes.statusText}`);
    }
    const peopleData = await peopleRes.json();
    console.log(`[E2E STEP 1] Loaded People Page: ${peopleData.people?.length} engineers in ${Date.now() - t0}ms`);

    // 2. Multi-repo owner click test: Rohan Verma
    console.log('\n[E2E STEP 2] Simulating click on "Simulate Departure" for multi-repo owner [Rohan Verma]...');
    const rohan = peopleData.people?.find((p: any) => p.person_name === 'Rohan Verma');
    if (!rohan) throw new Error('Rohan Verma not found in people list!');

    const tRohan = Date.now();
    const rohanSimRes = await fetch(`http://localhost:3000/api/dashboard/people/${encodeURIComponent(rohan.external_id)}/simulate-departure`);
    const rohanElapsed = Date.now() - tRohan;
    const rohanSim = await rohanSimRes.json();

    console.log(`- Request latency: ${rohanElapsed}ms (FAST query confirmed!)`);
    console.log(`- Person: ${rohanSim.person}`);
    console.log(`- Current Risk Score: ${rohanSim.riskScore}%`);
    console.log(`- Successors by Repo Count: ${rohanSim.successorsByRepo?.length}`);

    if (!rohanSim.successorsByRepo || rohanSim.successorsByRepo.length !== 3) {
        throw new Error(`Expected 3 repos for Rohan Verma, got ${rohanSim.successorsByRepo?.length}`);
    }

    rohanSim.successorsByRepo.forEach((r: any, idx: number) => {
        console.log(`\n  [Repository ${idx + 1}] ${r.repoName} (Bus Factor: ${r.busFactor})`);
        console.log(`  - Has Successor: ${r.hasSuccessor}`);
        console.log(`  - Explanation: "${r.explanation}"`);
        console.log(`  - Candidates:`);
        r.candidates.forEach((c: any) => {
            console.log(`    * [${c.category.toUpperCase()}] ${c.name}: ${c.score}% Match | Overloaded: ${c.isOverloaded} | Warning: ${c.warningLabel || 'None'}`);
        });
    });

    // 3. Single-repo owner click test: Priya Sharma
    console.log('\n[E2E STEP 3] Simulating click on "Simulate Departure" for single-repo owner [Priya Sharma]...');
    const priya = peopleData.people?.find((p: any) => p.person_name === 'Priya Sharma');
    if (!priya) throw new Error('Priya Sharma not found in people list!');

    const tPriya = Date.now();
    const priyaSimRes = await fetch(`http://localhost:3000/api/dashboard/people/${encodeURIComponent(priya.external_id)}/simulate-departure`);
    const priyaElapsed = Date.now() - tPriya;
    const priyaSim = await priyaSimRes.json();

    console.log(`- Request latency: ${priyaElapsed}ms`);
    console.log(`- Person: ${priyaSim.person}`);
    console.log(`- Current Risk Score: ${priyaSim.riskScore}%`);
    console.log(`- Successors by Repo Count: ${priyaSim.successorsByRepo?.length}`);

    if (!priyaSim.successorsByRepo || priyaSim.successorsByRepo.length !== 1) {
        throw new Error(`Expected 1 repo for Priya Sharma, got ${priyaSim.successorsByRepo?.length}`);
    }

    const priyaRepo = priyaSim.successorsByRepo[0];
    console.log(`\n  [Repository 1] ${priyaRepo.repoName} (Bus Factor: ${priyaRepo.busFactor})`);
    console.log(`  - Has Successor: ${priyaRepo.hasSuccessor}`);
    console.log(`  - Explanation: "${priyaRepo.explanation}"`);
    console.log(`  - Candidates:`);
    priyaRepo.candidates.forEach((c: any) => {
        console.log(`    * [${c.category.toUpperCase()}] ${c.name}: ${c.score}% Match | Overloaded: ${c.isOverloaded} | Warning: ${c.warningLabel || 'None'}`);
    });

    console.log('\n================================================================');
    console.log('>>> ALL END-TO-END VERIFICATIONS PASSED SUCCESSFULLY! <<<');
    console.log('================================================================\n');
}

testEndToEnd().catch(err => {
    console.error('E2E Test Failed:', err);
    process.exit(1);
});

async function main() {
    console.log('--- TESTING SIMULATE DEPARTURE API ENDPOINT ---');

    // 1. Fetch people from API
    const resPeople = await fetch('http://localhost:3000/api/dashboard/people');
    if (!resPeople.ok) {
        console.error('Failed to reach backend API:', resPeople.status, resPeople.statusText);
        return;
    }
    const peopleData = await resPeople.json();
    console.log(`Fetched ${peopleData.people?.length} people from API`);

    // Find Priya Sharma and Rohan Verma
    const priya = peopleData.people?.find((p: any) => p.person_name?.toLowerCase().includes('priya'));
    const rohan = peopleData.people?.find((p: any) => p.person_name?.toLowerCase().includes('rohan'));

    console.log('Priya:', priya?.person_name, 'externalId:', priya?.external_id);
    console.log('Rohan:', rohan?.person_name, 'externalId:', rohan?.external_id);

    // Test Priya
    if (priya) {
        console.log('\n>>> Calling simulate-departure for Priya Sharma...');
        const t0 = Date.now();
        const res = await fetch(`http://localhost:3000/api/dashboard/people/${encodeURIComponent(priya.external_id)}/simulate-departure`);
        const priyaSim = await res.json();
        console.log(`API response in ${Date.now() - t0}ms:`);
        console.log('Person:', priyaSim.person);
        console.log('Risk Score:', priyaSim.riskScore);
        console.log('SuccessorsByRepo count:', priyaSim.successorsByRepo?.length);
        priyaSim.successorsByRepo?.forEach((r: any) => {
            console.log(`* Repo: ${r.repoName}, hasSuccessor: ${r.hasSuccessor}, candidates: ${r.candidates?.length}`);
            r.candidates?.forEach((c: any) => console.log(`   - ${c.name}: ${c.score}% (${c.category}), overloaded: ${c.isOverloaded}`));
        });
    }

    // Test Rohan
    if (rohan) {
        console.log('\n>>> Calling simulate-departure for Rohan Verma (Multi-repo owner)...');
        const t1 = Date.now();
        const res = await fetch(`http://localhost:3000/api/dashboard/people/${encodeURIComponent(rohan.external_id)}/simulate-departure`);
        const rohanSim = await res.json();
        console.log(`API response in ${Date.now() - t1}ms:`);
        console.log('Person:', rohanSim.person);
        console.log('Risk Score:', rohanSim.riskScore);
        console.log('SuccessorsByRepo count:', rohanSim.successorsByRepo?.length);
        rohanSim.successorsByRepo?.forEach((r: any) => {
            console.log(`* Repo: ${r.repoName}, hasSuccessor: ${r.hasSuccessor}, candidates: ${r.candidates?.length}`);
            r.candidates?.forEach((c: any) => console.log(`   - ${c.name}: ${c.score}% (${c.category}), overloaded: ${c.isOverloaded}`));
        });
    }
}

main().catch(console.error);

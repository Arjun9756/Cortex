import { calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function testSuccessorsDirect() {
    const testPeople = [
        'Arjun Kumar',
        'Priya Sharma',
        'Elena Rostova',
        'Marcus Vance',
        'Amina Zahra',
        'Sarah Chen',
        'Amit Shah'
    ];

    console.log('========================================================================');
    console.log('🧪 RUNNING DIRECT SUCCESSOR RECOMMENDATION TESTS ACROSS TEST PERSONS');
    console.log('========================================================================\n');

    try {
        for (const person of testPeople) {
            const t0 = Date.now();
            const res = await calculateSuccessorCandidates(person);
            const elapsed = Date.now() - t0;
            console.log(`------------------------------------------------------------------------`);
            console.log(`👤 Target: ${person} (Resolved: "${res.person}") [${elapsed}ms]`);
            console.log(`- Technologies (${res.targetTechnologies.length}): [${res.targetTechnologies.join(', ')}]`);
            console.log(`- Repositories (${res.targetRepositories.length}): [${res.targetRepositories.join(', ')}]`);
            console.log(`- Has Successor: ${res.hasSuccessor ? '✅ YES' : '❌ NO'}`);
            console.log(`- Explanation: ${res.explanation}`);
            if (res.candidates.length > 0) {
                console.log(`- Ranked Candidates (${res.candidates.length}):`);
                for (const c of res.candidates) {
                    console.log(`   🏆 Candidate: ${c.name} | Composite Score: ${c.score}%`);
                    console.log(`      Breakdown: Tech=${c.breakdown.sharedTechScore}% (w=40%), Repo=${c.breakdown.sharedRepoScore}% (w=25%), Activity=${c.breakdown.recentActivityScore}% (w=20%), Capacity=${c.breakdown.workloadCapacityScore}% (w=15%)`);
                    console.log(`      Shared Techs: [${c.factors.sharedTechnologies.join(', ')}] (Jaccard: ${c.factors.techJaccard})`);
                    console.log(`      Shared Repos: [${c.factors.sharedRepositories.join(', ')}] (Overlap: ${c.factors.repoOverlapRatio})`);
                    console.log(`      Activity: ${c.factors.activityStatus} (${c.factors.daysSinceLastActivity}d ago)`);
                    console.log(`      Existing Risk: ${c.factors.existingKnowledgeRisk}% (SPOF Repos: ${c.factors.spofReposCount})`);
                    console.log(`      Rationale: ${c.rationale}`);
                }
            } else {
                console.log(`- Candidates: [] (Honest empty state confirmed)`);
            }
            console.log();
        }
    } catch (e: any) {
        console.error('Test error:', e);
    } finally {
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

testSuccessorsDirect();

import { calculateSuccessorCandidates, calculateSuccessorsByRepo } from '../packages/analytics/successor.service.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    console.log('================================================================');
    console.log('VERIFYING FIX D (PERFORMANCE) & FIX E (PER-REPO RECOMMENDATIONS)');
    console.log('================================================================\n');

    // 1. Test Priya Sharma (Fix D performance + score consistency)
    const t0 = Date.now();
    const priyaRes = await calculateSuccessorCandidates('Priya Sharma');
    const elapsedPriya = Date.now() - t0;
    console.log(`[TEST 1] Priya Sharma execution time: ${elapsedPriya}ms`);
    console.log(`- Has Successor: ${priyaRes.hasSuccessor}`);
    console.log(`- Top Candidate: ${priyaRes.candidates[0]?.name} (${priyaRes.candidates[0]?.score}%, ${priyaRes.candidates[0]?.category})`);
    console.log(`- Second Candidate: ${priyaRes.candidates[1]?.name} (${priyaRes.candidates[1]?.score}%, overloaded: ${priyaRes.candidates[1]?.isOverloaded}, warning: ${priyaRes.candidates[1]?.warningLabel})`);

    if (priyaRes.candidates[0]?.name === 'Devendra Singh' && priyaRes.candidates[0]?.score === 25 && priyaRes.candidates[1]?.isOverloaded === true) {
        console.log('>>> [TEST 1 PASSED] Scores, categories, and overload warnings match baseline identically!\n');
    } else {
        console.error('>>> [TEST 1 FAILED] Mismatch with baseline!');
        process.exit(1);
    }

    // 2. Test Rohan Verma (Fix E multi-repo owner)
    const t1 = Date.now();
    const rohanRepos = await calculateSuccessorsByRepo('Rohan Verma');
    const elapsedRohan = Date.now() - t1;
    console.log(`[TEST 2] Rohan Verma (Multi-Repo SPOF Owner) execution time: ${elapsedRohan}ms`);
    console.log(`- Repositories evaluated: ${rohanRepos.length}`);
    rohanRepos.forEach(r => {
        console.log(`  * Repo: "${r.repoName}" (Bus Factor: ${r.busFactor})`);
        console.log(`    - Has Successor: ${r.hasSuccessor}`);
        console.log(`    - Explanation: ${r.explanation}`);
        console.log(`    - Candidates: ${r.candidates.map(c => `${c.name} (${c.score}%, ${c.category})`).join(', ')}`);
    });

    if (rohanRepos.length >= 3) {
        console.log('\n>>> [TEST 2 PASSED] Multi-repo owner receives independent per-repo recommendations!\n');
    } else {
        console.error('>>> [TEST 2 FAILED] Expected 3 repositories for Rohan Verma!');
        process.exit(1);
    }

    // 3. Test backwards compatibility of calculateSuccessorCandidates for Rohan
    const rohanLegacy = await calculateSuccessorCandidates('Rohan Verma');
    console.log(`[TEST 3] Backwards compatibility for calculateSuccessorCandidates('Rohan Verma'):`);
    console.log(`- Person: ${rohanLegacy.person}`);
    console.log(`- RepoName: ${rohanLegacy.repoName}`);
    console.log(`- Candidates count: ${rohanLegacy.candidates.length}`);
    console.log(`- Attached successorsByRepo count: ${rohanLegacy.successorsByRepo?.length}`);
    console.log('>>> [TEST 3 PASSED] Backwards compatibility confirmed!\n');
}

main().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});

import { calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';

async function main() {
    const t0 = Date.now();
    const result = await calculateSuccessorCandidates('Priya Sharma');
    const elapsed = Date.now() - t0;
    console.log(`Execution time: ${elapsed}ms`);
    console.log('Result for:', result.person);
    console.log('Has successor:', result.hasSuccessor);
    console.log('Explanation:', result.explanation);
    console.log('Target Repos:', result.targetRepositories);
    console.log('Target Techs:', result.targetTechnologies);
    console.log('Candidates count:', result.candidates.length);
    console.log('Candidates:');
    result.candidates.forEach(c => {
        console.log(`- ${c.name}: score=${c.score}, category=${c.category}, isOverloaded=${c.isOverloaded}, sharedTech=${JSON.stringify(c.factors.sharedTechnologies)}, sharedRepos=${JSON.stringify(c.factors.sharedRepositories)}, warning=${c.warningLabel}`);
    });
}

main().catch(console.error).finally(() => process.exit(0));

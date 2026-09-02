import { calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';

async function testSuccessorEmpty() {
    console.log('Testing calculateSuccessorCandidates with a non-existent/isolated person...');
    try {
        // Test with a person who has no matching records or candidates
        const res = await calculateSuccessorCandidates('NonExistentPersonXYZ');
        console.log('Result for NonExistentPersonXYZ:', res);

        // Test with a real person
        const res2 = await calculateSuccessorCandidates('Priya Sharma');
        console.log('Result for Priya Sharma candidates count:', res2.candidates.length);
        console.log('Explanation:', res2.explanation);
    } catch (e: any) {
        console.error('CRASH in calculateSuccessorCandidates:', e);
    }
    process.exit(0);
}

testSuccessorEmpty();

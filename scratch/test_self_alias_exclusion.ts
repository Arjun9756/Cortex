import sql from '../apps/api/config/postgres.js';
import { calculateSuccessorsByRepo } from '../packages/analytics/successor.service.js';

async function main() {
    console.log('Testing Rohan Verma departure with identity resolution...');

    // Check identities in Postgres
    const identities = await sql`
        SELECT canonical_person_id, username, email, display_name, external_id 
        FROM person_identity
        WHERE canonical_person_id = 'person_465005315197085751013376'
    `;
    console.log('Rohan identities linked to same canonical person:');
    console.table(identities);

    // Current calculation
    const results = await calculateSuccessorsByRepo('Rohan Verma');
    console.log('\nCurrent recommendations for Rohan Verma:');
    for (const r of results) {
        console.log(`\nRepo: ${r.repoName} (hasSuccessor: ${r.hasSuccessor})`);
        console.log('Candidates:');
        r.candidates.forEach(c => console.log(`  - ${c.name} (${c.score}%, ${c.category})`));
    }
}

main().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});

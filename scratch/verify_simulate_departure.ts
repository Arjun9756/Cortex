import sql from '../apps/api/config/postgres.js';
import { calculateSuccessorsByRepo } from '../packages/analytics/successor.service.js';
import { calculateKnowledgeRisk } from '../packages/analytics/knowledge.service.js';

async function verify() {
    console.log('--- Testing simulate departure for Priya Sharma ---');
    const [priya] = await sql`SELECT * FROM person_metrics WHERE person_name = 'Priya Sharma'`;
    console.log('Priya row:', priya);
    const successorsPriya = await calculateSuccessorsByRepo(priya.person_name);
    console.log('Successors for Priya:', JSON.stringify(successorsPriya, null, 2));

    console.log('\n--- Testing simulate departure for Rohan Verma ---');
    const [rohan] = await sql`SELECT * FROM person_metrics WHERE person_name = 'Rohan Verma'`;
    console.log('Rohan row:', rohan);
    const successorsRohan = await calculateSuccessorsByRepo(rohan.person_name);
    console.log('Successors for Rohan:', JSON.stringify(successorsRohan, null, 2));
}

verify().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});

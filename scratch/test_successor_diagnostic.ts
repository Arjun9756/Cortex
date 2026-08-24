import { generateOffboardingHandoff } from '../packages/analytics/offboarding.service.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    console.log('Testing generateOffboardingHandoff("Arjun Kumar")...');
    try {
        const result = await generateOffboardingHandoff('Arjun Kumar');
        console.log('Result from generateOffboardingHandoff:');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

main();

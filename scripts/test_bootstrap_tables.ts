import { ensurePostgresTables } from '../packages/database/postgres/schema.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    try {
        console.log('Testing ensurePostgresTables()...');
        await ensurePostgresTables();
        console.log('ensurePostgresTables() succeeded!');
    } catch (err) {
        console.error('ensurePostgresTables() failed with:', err);
    } finally {
        await sql.end();
    }
}

main();

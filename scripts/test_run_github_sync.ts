import sql from '../apps/api/config/postgres.js';
import { directorySyncService } from '../packages/identity/directorySync.service.js';
import { reconcileWorkerService } from '../packages/identity/reconcileWorker.service.js';

async function main() {
    console.log('🚀 Running GitHub Directory Sync...');
    const ghStats = await directorySyncService.syncGitHubDirectory('backfill');
    console.log('GitHub Directory Sync Result:', ghStats);

    console.log('\n🔍 Checking person_identity table for GitHub identities:');
    const ghIdentities = await sql`
        SELECT provider, external_id, username, email, display_name, canonical_person_id, is_active, is_bot
        FROM person_identity
        WHERE provider = 'github'
        ORDER BY created_at DESC
    `;
    console.table(ghIdentities);

    console.log('\n🔄 Running Reconcile Worker...');
    const recStats = await reconcileWorkerService.runReconciliation('backfill');
    console.log('Reconciliation Stats:', recStats);

    console.log('\n✨ Verifying Unified Canonical Person (GitHub + Slack Link):');
    const arjunRows = await sql`
        SELECT provider, username, email, display_name, canonical_person_id
        FROM person_identity
        WHERE email = 'as9604793@gmail.com' OR username IN ('arjun9756', 'as9604793')
    `;
    console.table(arjunRows);

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

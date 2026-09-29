import sql from '../apps/api/config/postgres.js';
import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import { integrationService } from '../apps/api/modules/integrations/service.js';
import { directorySyncService } from '../packages/identity/directorySync.service.js';
import { reconcileWorkerService } from '../packages/identity/reconcileWorker.service.js';
import { resolveIdentity } from '../packages/identity/canonicalPerson.service.js';

async function runAudit() {
    console.log('====================================================');
    console.log('🔍 CORTEX END-TO-END AUDIT: GITHUB & EMAIL FETCHING');
    console.log('====================================================\n');

    // 1. Check Integrations Table
    console.log('--- Step 1: Checking Integrations Table in PostgreSQL ---');
    const integrations = await sql`
        SELECT provider, status, account_name, account_email, 
               webhook_registered, webhook_secret IS NOT NULL AS has_secret,
               array_length(scopes, 1) AS scopes_count, updated_at
        FROM integrations
    `;
    console.table(integrations);

    // 2. Check GitHub Connection Details
    const [ghConn] = await sql`SELECT * FROM integrations WHERE provider = 'github'`;
    if (!ghConn) {
        console.warn('⚠️ GitHub row not found in integrations table.');
    } else {
        console.log(`GitHub Status: ${ghConn.status}`);
        console.log(`GitHub Account Name: ${ghConn.account_name}`);
        console.log(`GitHub Account Email: ${ghConn.account_email || '(No public email in GitHub profile)'}`);
        console.log(`GitHub Has Access Token: ${Boolean(ghConn.access_token)}`);
        console.log(`GitHub Webhook Registered: ${ghConn.webhook_registered}`);
        console.log(`GitHub Webhook Secret in DB: ${ghConn.webhook_secret ? `${ghConn.webhook_secret.slice(0, 8)}...` : '(none)'}`);
        console.log(`GitHub Scopes: ${ghConn.scopes ? ghConn.scopes.join(', ') : 'none'}`);
    }

    // 3. Test GitHub Live API Connectivity (if token exists)
    if (ghConn && ghConn.access_token) {
        console.log('\n--- Step 2: Testing Live GitHub API & Email Fetching ---');
        try {
            const userRes = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${ghConn.access_token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'Cortex-Audit/1.0',
                },
            });
            if (userRes.ok) {
                const userData = (await userRes.json()) as any;
                console.log(`✅ GitHub Authenticated as: ${userData.login} (${userData.name || 'No Name'})`);
                console.log(`   Public Profile Email: ${userData.email || '(hidden/private)'}`);

                // Try fetching private emails with user:email scope if granted
                const emailsRes = await fetch('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `Bearer ${ghConn.access_token}`,
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'Cortex-Audit/1.0',
                    },
                });
                if (emailsRes.ok) {
                    const emails = (await emailsRes.json()) as any[];
                    console.log(`   Direct /user/emails endpoint accessible (${emails.length} emails found):`);
                    for (const em of emails) {
                        console.log(`     - ${em.email} (primary: ${em.primary}, verified: ${em.verified}, visibility: ${em.visibility})`);
                    }
                } else {
                    console.log(`   Note: /user/emails returned ${emailsRes.status} (requires 'user:email' or 'user' scope).`);
                }
            } else {
                console.warn(`   GitHub /user API returned ${userRes.status}: ${await userRes.text()}`);
            }

            // Test fetching repositories
            console.log('\n--- Testing Repository Fetching ---');
            const repos = await integrationService.getRealGitHubRepos();
            console.log(`✅ Discovered ${repos.length} GitHub repositories:`);
            repos.slice(0, 5).forEach(r => console.log(`   - ${r.fullName} (Private: ${r.private}, Stars: ${r.stars})`));
            if (repos.length > 5) console.log(`   ... and ${repos.length - 5} more`);

        } catch (apiErr: any) {
            console.error('❌ GitHub API error:', apiErr?.message);
        }
    }

    // 4. Check Person Identities & Emails in PostgreSQL
    console.log('\n--- Step 3: Checking Person Identities & Emails in PostgreSQL ---');
    const identityStats = await sql`
        SELECT 
            provider,
            count(*)::int AS total_identities,
            count(email)::int AS identities_with_email,
            count(CASE WHEN email IS NOT NULL AND email NOT LIKE '%noreply%' THEN 1 END)::int AS real_emails,
            count(CASE WHEN is_bot THEN 1 END)::int AS bots,
            count(CASE WHEN is_active THEN 1 END)::int AS active
        FROM person_identity
        GROUP BY provider
    `;
    console.table(identityStats);

    const sampleIdentities = await sql`
        SELECT provider, username, email, display_name, canonical_person_id, is_bot, is_active
        FROM person_identity
        ORDER BY created_at DESC
        LIMIT 10
    `;
    console.log('Sample Recent Person Identities:');
    console.table(sampleIdentities);

    // 5. Test Canonical Identity Resolution & Email Matching
    console.log('\n--- Step 4: Testing Identity Resolution & Email Matching Invariant ---');
    const testEmail = 'dev.test@cortex.internal';
    const testUsername = 'testdev_cortex';

    const res1 = await resolveIdentity({
        source: 'backfill',
        provider: 'github',
        externalId: 'gh_test_99901',
        username: testUsername,
        email: testEmail,
        displayName: 'Test Developer',
    });
    console.log(`1. Resolved GitHub test user -> Canonical Person ID: ${res1.canonicalPersonId} (${res1.matchedBy})`);

    // Now resolve Slack user with the same email -> MUST link to same Canonical Person!
    const res2 = await resolveIdentity({
        source: 'backfill',
        provider: 'slack',
        externalId: 'U_TEST_SLACK_99901',
        username: 'testdev_slack',
        email: testEmail,
        displayName: 'Test Developer Slack',
    });
    console.log(`2. Resolved Slack test user with same email -> Canonical Person ID: ${res2.canonicalPersonId} (${res2.matchedBy})`);

    if (res1.canonicalPersonId === res2.canonicalPersonId) {
        console.log('✅ PASS: Cross-provider email matching successfully linked GitHub and Slack to identical Canonical Person!');
    } else {
        console.error('❌ FAIL: Canonical Person IDs did not match for same email!');
    }

    // Clean up test identities
    await sql`DELETE FROM person_identity WHERE external_id IN ('gh_test_99901', 'U_TEST_SLACK_99901')`;
    await sql`DELETE FROM identity_merge_log WHERE person_b IN ('slack:U_TEST_SLACK_99901')`;

    console.log('\n====================================================');
    console.log('🎉 AUDIT COMPLETE');
    console.log('====================================================\n');
    process.exit(0);
}

runAudit().catch(err => {
    console.error('Audit fatal error:', err);
    process.exit(1);
});

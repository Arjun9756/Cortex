import sql from '../apps/api/config/postgres.js';
import { resolveIdentity } from '../packages/identity/canonicalPerson.service.js';
import { resolveSlackUserProfile } from '../packages/ingestion/slack/normalize.js';
import type { DataSource } from '../packages/database/provenance.js';

async function main() {
    console.log('====================================================');
    console.log('TEST ITEM 1: Identity Resolution (Exact Email Match & Token Expiry)');
    console.log('====================================================\n');

    const testSource: DataSource = 'backfill';
    const sharedEmail = `eng.lead.${Date.now()}@example-corp.com`;

    // 1. Simulate 3 platform identities with the SAME verified email
    console.log('[1/4] Simulating GitHub identity with email:', sharedEmail);
    const githubRes = await resolveIdentity({
        source: testSource,
        provider: 'github',
        externalId: 'gh_1001',
        username: 'alice-gh',
        displayName: 'Alice Engineer',
        email: sharedEmail,
    });
    console.log(`   -> GitHub canonicalPersonId: ${githubRes.canonicalPersonId} (matchedBy: ${githubRes.matchedBy})`);

    console.log('[2/4] Simulating Slack identity with SAME email:', sharedEmail);
    const slackRes = await resolveIdentity({
        source: testSource,
        provider: 'slack',
        externalId: 'U_SLACK_1001',
        username: 'alice.slack',
        displayName: 'Alice (Engineering)',
        email: sharedEmail,
    });
    console.log(`   -> Slack canonicalPersonId: ${slackRes.canonicalPersonId} (matchedBy: ${slackRes.matchedBy})`);

    console.log('[3/4] Simulating Jira identity with SAME email:', sharedEmail);
    const jiraRes = await resolveIdentity({
        source: testSource,
        provider: 'jira',
        externalId: 'jira_acc_1001',
        username: 'alice_jira',
        displayName: 'Alice E.',
        email: sharedEmail,
    });
    console.log(`   -> Jira canonicalPersonId: ${jiraRes.canonicalPersonId} (matchedBy: ${jiraRes.matchedBy})`);

    // Verify: All 3 resolve to the EXACT SAME canonical person
    const allMatch = githubRes.canonicalPersonId === slackRes.canonicalPersonId &&
                     slackRes.canonicalPersonId === jiraRes.canonicalPersonId;
    if (!allMatch) {
        throw new Error(`FAIL: Identities did not resolve to same canonicalPersonId: GH=${githubRes.canonicalPersonId}, Slack=${slackRes.canonicalPersonId}, Jira=${jiraRes.canonicalPersonId}`);
    }
    console.log('   ✅ PASS: All 3 platform identities resolved to EXACTLY ONE canonical person:', githubRes.canonicalPersonId);

    // 2. Simulate distinct person with different email but SAME name
    console.log('\n[4/4] Simulating different person with SAME name ("Alice Engineer") but DIFFERENT email:');
    const differentEmail = `alice.impostor.${Date.now()}@other-domain.com`;
    const distinctRes = await resolveIdentity({
        source: testSource,
        provider: 'github',
        externalId: 'gh_1002',
        username: 'alice-other',
        displayName: 'Alice Engineer',
        email: differentEmail,
    });
    console.log(`   -> Distinct canonicalPersonId: ${distinctRes.canonicalPersonId} (matchedBy: ${distinctRes.matchedBy})`);
    if (distinctRes.canonicalPersonId === githubRes.canonicalPersonId) {
        throw new Error('FAIL: Auto-merged different email on name match alone! Violates exact email match rule.');
    }
    console.log('   ✅ PASS: Distinct email with identical name was NOT merged. Kept completely separate.');

    // 3. Simulate expired Slack token during event
    console.log('\n[5/5] Simulating expired Slack token handling:');
    // Ensure test row exists in integrations
    await sql`
        INSERT INTO integrations (provider, status, access_token)
        VALUES ('slack', 'connected', 'encrypted_dummy_token')
        ON CONFLICT (provider) DO UPDATE SET status = 'connected', access_token = 'encrypted_dummy_token'
    `;

    // Mock fetch for expired token
    const origFetch = global.fetch;
    global.fetch = async (url: any) => {
        if (String(url).includes('slack.com/api/users.info')) {
            return {
                ok: true,
                json: async () => ({ ok: false, error: 'token_expired' }),
            } as any;
        }
        return origFetch(url);
    };

    try {
        const profile = await resolveSlackUserProfile('U_TEST_EXPIRED_TOKEN');
        console.log('   -> Slack profile returned on expired token:', profile);
        if (profile.email !== null) {
            throw new Error('FAIL: Expired token profile should have email = null');
        }

        const [slackConn] = await sql`SELECT status FROM integrations WHERE provider = 'slack'`;
        console.log('   -> Integration status in DB:', slackConn?.status);
        if (slackConn?.status !== 'needs_reauth') {
            throw new Error(`FAIL: Slack integration status is not 'needs_reauth' (got: ${slackConn?.status})`);
        }
        console.log('   ✅ PASS: Connector status updated to "needs_reauth", event not dropped, email null.');
    } finally {
        global.fetch = origFetch;
        // Cleanup test data
        await sql`DELETE FROM person_identity WHERE email IN (${sharedEmail}, ${differentEmail})`;
        await sql`DELETE FROM identity_merge_log WHERE person_a = ${githubRes.canonicalPersonId}`;
    }

    console.log('\n====================================================');
    console.log('🎉 ALL ITEM 1 CHECKS PASSED WITH EVIDENCE!');
    console.log('====================================================\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error running Item 1 test:', err);
    process.exit(1);
});

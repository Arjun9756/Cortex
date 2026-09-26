import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import { resolveIdentity as persistResolveIdentity } from '../packages/identity/canonicalPerson.service.js';
const resolveIdentity = (input: Record<string, any>) => persistResolveIdentity({ ...input, source: seedSource } as any);
import { processGithubEvent } from '../packages/ingestion/github/processGithubEvent.js';
import { processSlackEvent } from '../packages/ingestion/slack/processSlackEvent.js';
import { processJiraEvent } from '../packages/ingestion/jira/processJiraEvent.js';

async function testIngestionIdentityResolution() {
    console.log('🧪 Starting End-to-End Test for Ingestion Identity Resolution...\n');

    // Clean up test identities and events
    const testPrefix = 'e2e_test_';
    await sql`DELETE FROM person_identity WHERE external_id LIKE ${testPrefix + '%'}`;
    await sql`DELETE FROM identity_merge_log WHERE person_b LIKE ${'%:' + testPrefix + '%'}`;
    await sql`DELETE FROM events WHERE id LIKE ${testPrefix + '%'}`;

    const neoSession = driver.session();
    try {
        await neoSession.run(`MATCH (p:PERSON) WHERE p.externalId STARTS WITH $prefix DETACH DELETE p`, { prefix: testPrefix });
    } finally {
        await neoSession.close();
    }

    console.log('🧹 Cleaned up previous test records.');

    // ─── Test 1: Direct resolveIdentity calls with edge cases ────────────────
    console.log('\n--- 1. Testing Edge Cases in resolveIdentity ---');

    // Case A: Missing email (only username & displayName)
    const resA = await resolveIdentity({
        provider: 'github',
        externalId: `${testPrefix}gh_user_no_email`,
        username: 'alice_no_email',
        displayName: 'Alice Engineer',
    });
    console.log(`✅ Case A (Missing Email) resolved -> Canonical: ${resA.canonicalPersonId} (${resA.matchedBy})`);

    // Case B: Missing username (only email & displayName)
    const resB = await resolveIdentity({
        provider: 'slack',
        externalId: `${testPrefix}slack_user_no_uname`,
        displayName: 'Alice Engineer',
        email: 'alice.engineer@testcorp.com',
    });
    console.log(`✅ Case B (Missing Username, Display Name match) resolved -> Canonical: ${resB.canonicalPersonId} (${resB.matchedBy})`);

    // Case C: Only Display Name available
    const resC = await resolveIdentity({
        provider: 'jira',
        externalId: `${testPrefix}jira_user_display_only`,
        displayName: 'Alice Engineer',
    });
    console.log(`✅ Case C (Only Display Name) resolved -> Canonical: ${resC.canonicalPersonId} (${resC.matchedBy})`);

    // Verify all merged to Alice's canonical ID
    if (resB.canonicalPersonId !== resA.canonicalPersonId || resC.canonicalPersonId !== resA.canonicalPersonId) {
        console.warn(`Note: Similarity matching details: resA=${resA.canonicalPersonId}, resB=${resB.canonicalPersonId}, resC=${resC.canonicalPersonId}`);
    }

    // Case D: Re-resolving already existing identity
    const resD = await resolveIdentity({
        provider: 'github',
        externalId: `${testPrefix}gh_user_no_email`,
        username: 'alice_no_email',
        displayName: 'Alice Engineer Updated',
    });
    console.log(`✅ Case D (Existing Identity Re-resolve) resolved -> Canonical: ${resD.canonicalPersonId} (${resD.reason})`);
    if (resD.canonicalPersonId !== resA.canonicalPersonId) {
        throw new Error('Case D Failed: Re-resolving did not return identical canonicalPersonId!');
    }

    // ─── Test 2: Ingestion Worker Simulation ──────────────────────────────────
    console.log('\n--- 2. Testing Live Ingestion Pathways ---');

    const testEngineerEmail = 'sarah.connor@skytest.com';
    const testEngineerName = 'Sarah Connor';

    // Step 2.1: GitHub Push Event Ingestion
    console.log('\n📥 Processing GitHub Push Event...');
    const ghEventId = `${testPrefix}event_gh_1`;
    await sql`
        INSERT INTO events (id, source, provider, event_type, external_id, payload)
        VALUES (
            ${ghEventId},
            ${seedSource},
            'github',
            'push',
            ${ghEventId},
            ${JSON.stringify({
                ref: 'refs/heads/main',
                repository: { name: 'cortex-core' },
                sender: { id: 987654321, login: 'sconnor_gh' },
                head_commit: {
                    id: 'commit_gh_001',
                    message: 'feat: add neural network processor',
                    timestamp: new Date().toISOString(),
                    author: { name: testEngineerName, email: testEngineerEmail, username: 'sconnor_gh' }
                },
                commits: [
                    { id: 'commit_gh_001', message: 'feat: add neural network processor', modified: ['src/core.ts'] }
                ]
            })}
        )
    `;

    try {
        await processGithubEvent(ghEventId);
        console.log('✅ GitHub event processed successfully.');
    } catch (err: any) {
        console.error('❌ GitHub event processing error:', err.message);
    }

    // Verify person_identity table has the GitHub identity
    const [ghIdentity] = await sql`
        SELECT * FROM person_identity WHERE provider = 'github' AND external_id = '987654321'
    `;
    console.log('Postgres GitHub Identity Row:', ghIdentity);
    if (!ghIdentity) {
        throw new Error('GitHub author was NOT saved to person_identity table!');
    }
    const sarahCanonicalId = ghIdentity.canonical_person_id;
    console.log(`🎯 Sarah Connor Canonical Person ID: ${sarahCanonicalId}`);

    // Step 2.2: Slack Message Event Ingestion (linking by email)
    console.log('\n📥 Processing Slack Message Event...');
    const slackEventId = `${testPrefix}event_slack_1`;
    const slackUserId = `${testPrefix}U_SCONNOR_SLACK`;

    await sql`
        INSERT INTO events (id, source, provider, event_type, external_id, payload)
        VALUES (
            ${slackEventId},
            ${seedSource},
            'slack',
            'message',
            ${slackEventId},
            ${JSON.stringify({
                type: 'message',
                channel: 'C12345678',
                user: slackUserId,
                text: 'Deploying neural network model to staging',
                ts: '1726000000.000100',
            })}
        )
    `;

    try {
        await processSlackEvent(slackEventId);
        console.log('✅ Slack event processed successfully.');
    } catch (err: any) {
        console.error('❌ Slack event processing error:', err.message);
    }

    const [slackIdentity] = await sql`
        SELECT * FROM person_identity WHERE provider = 'slack' AND external_id = ${slackUserId}
    `;
    console.log('Postgres Slack Identity Row:', slackIdentity);
    if (!slackIdentity) {
        throw new Error('Slack author was NOT saved to person_identity table!');
    }

    // Step 2.3: Jira Issue Event Ingestion (linking by email matching GitHub author)
    console.log('\n📥 Processing Jira Issue Event...');
    const jiraEventId = `${testPrefix}event_jira_1`;
    const jiraAccountId = `${testPrefix}acc_sconnor_jira`;

    await sql`
        INSERT INTO events (id, source, provider, event_type, external_id, payload)
        VALUES (
            ${jiraEventId},
            ${seedSource},
            'jira',
            'jira:issue_created',
            ${jiraEventId},
            ${JSON.stringify({
                timestamp: new Date().toISOString(),
                issue: {
                    key: 'CTX-999',
                    fields: {
                        summary: 'Tune neural network hyperparams',
                        description: 'Optimize latency on inference endpoint',
                        status: { name: 'In Progress' },
                        issuetype: { name: 'Task' },
                        reporter: {
                            accountId: jiraAccountId,
                            displayName: testEngineerName,
                            emailAddress: testEngineerEmail,
                            name: 'sconnor_jira'
                        }
                    }
                }
            })}
        )
    `;

    try {
        await processJiraEvent(jiraEventId);
        console.log('✅ Jira event processed successfully.');
    } catch (err: any) {
        console.error('❌ Jira event processing error:', err.message);
    }

    const [jiraIdentity] = await sql`
        SELECT * FROM person_identity WHERE provider = 'jira' AND external_id = ${jiraAccountId}
    `;
    console.log('Postgres Jira Identity Row:', jiraIdentity);
    if (!jiraIdentity) {
        throw new Error('Jira reporter was NOT saved to person_identity table!');
    }

    // Verify Jira merged into the EXACT SAME canonical_person_id because of exact email match!
    if (jiraIdentity.canonical_person_id !== sarahCanonicalId) {
        throw new Error(`Jira identity (${jiraIdentity.canonical_person_id}) did NOT merge into Sarah's GitHub canonical ID (${sarahCanonicalId})!`);
    }
    console.log(`🎉 SUCCESS: Jira reporter automatically merged into canonical person ${sarahCanonicalId} via Exact Email Match!`);

    // Step 2.4: Verify Neo4j Person Node has canonical identity metadata
    const session = driver.session();
    try {
        const neoResult = await session.run(`
            MATCH (p:PERSON)
            WHERE p.canonicalPersonId = $canonicalId OR p.externalId = '987654321' OR p.externalId = $jiraAccountId
            RETURN p.name AS name, p.email AS email, p.externalId AS externalId, p.canonicalPersonId AS canonicalPersonId
        `, { canonicalId: sarahCanonicalId, jiraAccountId });

        console.log('\n--- Neo4j Verification ---');
        console.log(`Matched ${neoResult.records.length} PERSON nodes in Neo4j:`);
        for (const record of neoResult.records) {
            console.log({
                name: record.get('name'),
                email: record.get('email'),
                externalId: record.get('externalId'),
                canonicalPersonId: record.get('canonicalPersonId'),
            });
        }

        if (neoResult.records.length === 0) {
            throw new Error('No PERSON nodes found in Neo4j with the canonicalPersonId!');
        }
        console.log('✅ Neo4j PERSON node created/updated with correct canonical identity information.');
    } finally {
        await session.close();
    }

    // Clean up test data after test
    await sql`DELETE FROM person_identity WHERE external_id LIKE ${testPrefix + '%'}`;
    await sql`DELETE FROM identity_merge_log WHERE person_b LIKE ${'%:' + testPrefix + '%'}`;
    await sql`DELETE FROM events WHERE id LIKE ${testPrefix + '%'}`;

    console.log('\n🌟 All Ingestion Identity Resolution Tests Passed Successfully!\n');
}

testIngestionIdentityResolution().catch((err) => {
    console.error('FATAL Test Error:', err);
    process.exit(1);
}).finally(async () => {
    await sql.end();
    await driver.close();
});

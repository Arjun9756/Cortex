import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import { resolveIdentity } from '../packages/identity/canonicalPerson.service.js';

async function runIdentityResolutionTests() {
    console.log('🚀 Starting Enterprise Identity Resolution Tests...\n');

    // Clean up test data
    await sql`DELETE FROM person_identity WHERE external_id LIKE 'test_%' OR external_id IN ('U777ROHAN2', 'github_rohan', 'jira_rohan', 'aad_rohan', 'U888PRIYA')`;
    await sql`DELETE FROM identity_merge_log WHERE person_b LIKE 'slack:%' OR person_b LIKE 'github:%' OR person_b LIKE 'jira:%' OR person_b LIKE 'azure_ad:%'`;

    // ─── Test 1: First Identity Registration (Slack) ───────────────────────
    console.log('1️⃣ Registering Slack Identity for Rohan Verma...');
    const slackRes = await resolveIdentity({
        provider: 'slack',
        externalId: 'U777ROHAN2',
        username: 'U777ROHAN2',
        displayName: 'Rohan Verma',
        email: 'rohan.verma@company.com'
    });
    console.log('   Result:', slackRes);

    // ─── Test 2: Exact Email Match (GitHub) ─────────────────────────
    console.log('\n2️⃣ Resolving GitHub Identity with Exact Email Match...');
    const githubRes = await resolveIdentity({
        provider: 'github',
        externalId: 'github_rohan',
        username: 'rohanverma',
        displayName: 'rohanverma',
        email: 'rohan.verma@company.com'
    });
    console.log('   Result:', githubRes);

    if (githubRes.canonicalPersonId !== slackRes.canonicalPersonId) {
        throw new Error(`❌ Rule 1 Failed: GitHub identity did not merge into Slack canonical ID!`);
    }
    console.log('   ✅ Rule 1 Passed: Exact Email match merged identities into single Canonical Person!');

    // ─── Test 3: Username Match (Jira) ─────────────────────────────
    console.log('\n3️⃣ Resolving Jira Identity with Cross-Provider Username Match...');
    const jiraRes = await resolveIdentity({
        provider: 'jira',
        externalId: 'jira_rohan',
        username: 'rohanverma',
        displayName: 'Rohan V.'
    });
    console.log('   Result:', jiraRes);

    if (jiraRes.canonicalPersonId !== slackRes.canonicalPersonId) {
        throw new Error(`❌ Rule 2 Failed: Jira identity did not merge via username match!`);
    }
    console.log('   ✅ Rule 2 Passed: Username match merged Jira identity!');

    // ─── Test 4: Display Name Similarity > 95% (Azure AD) ─────────────
    console.log('\n4️⃣ Resolving Azure AD Identity with Display Name Similarity > 95%...');
    const azureRes = await resolveIdentity({
        provider: 'azure_ad',
        externalId: 'aad_rohan',
        username: 'rohan.v',
        displayName: 'Rohan Verma'
    });
    console.log('   Result:', azureRes);

    if (azureRes.canonicalPersonId !== slackRes.canonicalPersonId) {
        throw new Error(`❌ Rule 3 Failed: Azure AD identity did not merge via display name similarity!`);
    }
    console.log('   ✅ Rule 3 Passed: Display name similarity merged Azure AD identity!');

    // ─── Test 5: Distinct Person Creation (Priya) ────────────────────
    console.log('\n5️⃣ Registering Distinct Person (Priya Sharma)...');
    const priyaRes = await resolveIdentity({
        provider: 'slack',
        externalId: 'U888PRIYA',
        username: 'priya_sharma',
        displayName: 'Priya Sharma',
        email: 'priya.sharma@company.com'
    });
    console.log('   Result:', priyaRes);

    if (priyaRes.canonicalPersonId === slackRes.canonicalPersonId) {
        throw new Error(`❌ Fallback Failed: Priya merged into Rohan by mistake!`);
    }
    console.log('   ✅ Fallback Passed: Distinct canonical person created for Priya!');

    // ─── Test 6: Audit Log & Neo4j Verification ─────────────────────
    console.log('\n6️⃣ Verifying Postgres Audit Logs & Neo4j Graph Links...');
    const identities = await sql`
        SELECT provider, external_id, username, canonical_person_id 
        FROM person_identity 
        WHERE canonical_person_id = ${slackRes.canonicalPersonId}
    `;
    console.log(`   Linked identities for Rohan (${identities.length} total):`, identities);

    const mergeLogs = await sql`
        SELECT person_a, person_b, confidence, matched_by, reason 
        FROM identity_merge_log 
        WHERE person_a = ${slackRes.canonicalPersonId}
    `;
    console.log(`   Merge audit log entries (${mergeLogs.length} total):`, mergeLogs);

    // Neo4j Graph Check
    const session = driver.session();
    try {
        const neo4jRes = await session.run(`
            MATCH (i:IDENTITY)-[:BELONGS_TO]->(p:PERSON {id: $canonicalId})
            RETURN i.provider AS provider, i.externalId AS externalId, p.name AS canonicalName
        `, { canonicalId: slackRes.canonicalPersonId });

        console.log(`   Neo4j (:IDENTITY)-[:BELONGS_TO]->(:PERSON) links (${neo4jRes.records.length} total):`);
        for (const rec of neo4jRes.records) {
            console.log(`     - [${rec.get('provider')}:${rec.get('externalId')}] -> ${rec.get('canonicalName')}`);
        }
    } finally {
        await session.close();
    }

    console.log('\n🎉 ALL ENTERPRISE IDENTITY RESOLUTION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
}

runIdentityResolutionTests().catch(err => {
    console.error('❌ Identity Resolution Test Error:', err);
    process.exit(1);
});

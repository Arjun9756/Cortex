import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import { resolveIdentity as persistResolveIdentity } from '../packages/identity/canonicalPerson.service.js';
const resolveIdentity = (input: Record<string, any>) => persistResolveIdentity({ ...input, source: seedSource } as any);

async function runIdentityResolutionTests() {
    console.log('🚀 Starting Enterprise Identity Resolution Tests (Strict Policy)...\n');

    // Clean up test data
    await sql`DELETE FROM person_identity WHERE external_id LIKE 'test_%' OR external_id IN ('U777ROHAN2', 'github_rohan', 'jira_rohan', 'aad_rohan', 'U888PRIYA')`;
    await sql`DELETE FROM identity_merge_log WHERE person_b LIKE 'slack:%' OR person_b LIKE 'github:%' OR person_b LIKE 'jira:%' OR person_b LIKE 'azure_ad:%'`;
    await sql`DELETE FROM potential_duplicates WHERE person_a_username LIKE '%rohan%' OR person_b_username LIKE '%rohan%' OR person_b_name LIKE '%Rohan%'`;

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
    if (githubRes.matchedBy !== 'EXACT_EMAIL') {
        throw new Error(`❌ Rule 1 Failed: MatchedBy is not EXACT_EMAIL!`);
    }
    console.log('   ✅ Tier 1 Passed: Exact Email match merged identities into single Canonical Person!');

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
    if (jiraRes.matchedBy !== 'USERNAME_MATCH') {
        throw new Error(`❌ Rule 2 Failed: MatchedBy is not USERNAME_MATCH!`);
    }
    console.log('   ✅ Tier 2 Passed: Strong exact username match merged Jira identity!');

    // ─── Test 4: Display Name Similarity (Azure AD) — MUST NOT AUTO-MERGE ───
    console.log('\n4️⃣ Resolving Azure AD Identity with Display Name Similarity ("Rohan Verma", username "rohan.v", NO email)...');
    const azureRes = await resolveIdentity({
        provider: 'azure_ad',
        externalId: 'aad_rohan',
        username: 'rohan.v',
        displayName: 'Rohan Verma'
    });
    console.log('   Result:', azureRes);

    if (azureRes.canonicalPersonId === slackRes.canonicalPersonId) {
        throw new Error(`❌ Policy Violation: Azure AD identity AUTO-MERGED on Display Name similarity! Policy requires keeping them separate!`);
    }
    if (azureRes.matchedBy !== 'NEW_PERSON') {
        throw new Error(`❌ Policy Violation: Azure AD identity was not created as NEW_PERSON! MatchedBy was ${azureRes.matchedBy}`);
    }
    console.log('   ✅ Tier 3/4 Passed: Display Name Similarity was NOT auto-merged! Distinct canonical person created!');

    // Check potential_duplicates table
    const [potentialDup] = await sql`
        SELECT * FROM potential_duplicates 
        WHERE person_b_id = ${azureRes.canonicalPersonId}
        LIMIT 1
    `;
    if (!potentialDup) {
        throw new Error(`❌ Policy Check Failed: Name collision was NOT logged to potential_duplicates table!`);
    }
    if (potentialDup.status !== 'pending') {
        throw new Error(`❌ Policy Check Failed: potential_duplicates status is not 'pending' (got: ${potentialDup.status})`);
    }
    console.log(`   ✅ Flagged to potential_duplicates table (status: ${potentialDup.status}, score: ${potentialDup.similarity_score})`);

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

    if (priyaRes.canonicalPersonId === slackRes.canonicalPersonId || priyaRes.canonicalPersonId === azureRes.canonicalPersonId) {
        throw new Error(`❌ Fallback Failed: Priya merged into another person by mistake!`);
    }
    console.log('   ✅ Fallback Passed: Distinct canonical person created for Priya!');

    // ─── Test 6: Re-resolving existing identities (Step 0) ───────────
    console.log('\n6️⃣ Testing Re-resolving Existing Identities (Step 0 preservation)...');
    const reresolveSlack = await resolveIdentity({
        provider: 'slack',
        externalId: 'U777ROHAN2',
        username: 'U777ROHAN2',
        displayName: 'Rohan Verma (Updated Title)'
    });
    if (reresolveSlack.canonicalPersonId !== slackRes.canonicalPersonId) {
        throw new Error(`❌ Step 0 Failed: Re-resolving existing identity broke prior link!`);
    }
    console.log('   ✅ Step 0 Passed: Confirmed merge remains intact upon re-resolution!');

    // ─── Test 7: Audit Log & Neo4j Verification ─────────────────────
    console.log('\n7️⃣ Verifying Postgres Audit Logs & Neo4j Graph Isolation...');
    const rohanIdentities = await sql`
        SELECT provider, external_id, username, canonical_person_id 
        FROM person_identity 
        WHERE canonical_person_id = ${slackRes.canonicalPersonId}
    `;
    const hasAzureInRohan = rohanIdentities.some(r => r.external_id === 'aad_rohan');
    if (hasAzureInRohan) {
        throw new Error(`❌ Audit Failed: Azure AD was mistakenly merged into Rohan's canonical ID!`);
    }
    const hasSlack = rohanIdentities.some(r => r.external_id === 'U777ROHAN2');
    const hasGithub = rohanIdentities.some(r => r.external_id === 'github_rohan');
    const hasJira = rohanIdentities.some(r => r.external_id === 'jira_rohan');
    if (!hasSlack || !hasGithub || !hasJira) {
        throw new Error(`❌ Audit Failed: Expected test identities missing from Rohan!`);
    }
    console.log(`   ✅ Confirmed: Rohan contains Slack, GitHub, Jira identities. Azure AD is completely excluded!`);

    const azureIdentities = await sql`
        SELECT provider, external_id, username, canonical_person_id 
        FROM person_identity 
        WHERE canonical_person_id = ${azureRes.canonicalPersonId}
    `;
    console.log(`   Linked identities for Azure AD person (${azureIdentities.length} total, expected 1):`, azureIdentities.map(r => `${r.provider}:${r.external_id}`));
    if (azureIdentities.length !== 1) {
        throw new Error(`❌ Audit Failed: Expected exactly 1 linked identity for Azure AD person, found ${azureIdentities.length}!`);
    }

    // Neo4j Graph Check
    const session = driver.session();
    try {
        const rohanNodes = await session.run(`
            MATCH (p:PERSON {canonicalPersonId: $canonicalId})
            RETURN p.name AS name, p.canonicalPersonId AS cid
        `, { canonicalId: slackRes.canonicalPersonId });

        const azureNodes = await session.run(`
            MATCH (p:PERSON {canonicalPersonId: $canonicalId})
            RETURN p.name AS name, p.canonicalPersonId AS cid
        `, { canonicalId: azureRes.canonicalPersonId });

        console.log(`   Neo4j Person nodes: Rohan (${rohanNodes.records.length} node), Azure AD (${azureNodes.records.length} node)`);
        if (rohanNodes.records.length === 0 || azureNodes.records.length === 0) {
            throw new Error(`❌ Graph Check Failed: Separate Neo4j nodes were not created!`);
        }
    } finally {
        await session.close();
    }

    console.log('\n🎉 ALL STRICT IDENTITY RESOLUTION POLICY TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
}

runIdentityResolutionTests().catch(err => {
    console.error('❌ Identity Resolution Test Error:', err);
    process.exit(1);
});

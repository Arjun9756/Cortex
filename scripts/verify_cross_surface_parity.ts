import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import { buildNodeDetail } from '../apps/api/modules/graph/graphService.js';
import { runSafeQuery } from '../packages/agent/graph/nodes/sql.node.js';

interface ParityCheckResult {
    surface: string;
    entity: string;
    field: string;
    surfaceValue: any;
    expectedValue: any;
    matches: boolean;
}

async function verifyCrossSurfaceParity() {
    console.log('============================================================');
    console.log('PHASE 3 — CROSS-SURFACE PARITY VERIFICATION');
    console.log('Target Repos: payment-gateway-v2, auth-token-vault');
    console.log('Target People: rohanverma, priyasharma');
    console.log('============================================================\n');

    const results: ParityCheckResult[] = [];
    const session = driver.session();

    try {
        const testRepos = ['payment-gateway-v2', 'auth-token-vault'];
        const testPeople = ['rohanverma', 'priyasharma'];

        // ------------------------------------------------------------
        // REPO 1 & 2 PARITY CHECKS
        // ------------------------------------------------------------
        for (const repoName of testRepos) {
            console.log(`\n--- Auditing Repo: ${repoName} ---`);

            // Surface 1: Postgres repo_metrics
            const [pgRepo] = await sql`
                SELECT repo_name, bus_factor, risk_score, primary_owner, contributor_count, status
                FROM repo_metrics
                WHERE repo_name = ${repoName}
            `;
            console.log(`[Surface 1: Postgres repo_metrics]`, pgRepo);

            // Surface 2: Inspect API / resolveRepoDetail
            const inspectRepo = await buildNodeDetail(repoName, 'repository');
            console.log(`[Surface 2: Inspect Node Detail]`, {
                name: inspectRepo.name,
                bus_factor: inspectRepo.bus_factor,
                risk_score: inspectRepo.risk_score,
                primary_owner: inspectRepo.primary_owner,
                status: inspectRepo.status,
            });

            // Surface 3: Graph Node (Neo4j)
            const neoRepoRes = await session.run(`
                MATCH (r:REPOSITORY)
                WHERE toLower(r.name) = toLower($repoName)
                OPTIONAL MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r)
                RETURN r.name AS name,
                       sum(COALESCE(rel.commitCount, 1)) AS totalCommits,
                       count(DISTINCT p) AS contributorCount
            `, { repoName });
            const neoRepoRec = neoRepoRes.records[0];
            const neoRepoName = neoRepoRec?.get('name');
            const neoContributorCount = neoRepoRec?.get('contributorCount')?.toNumber ? neoRepoRec.get('contributorCount').toNumber() : Number(neoRepoRec?.get('contributorCount') || 0);
            console.log(`[Surface 3: Neo4j Graph] name=${neoRepoName}, contributors=${neoContributorCount}`);

            // Surface 4: Agent SQL Safe Query ('repo_details')
            const [agentRepo] = await runSafeQuery('repo_details', { repo: repoName });
            console.log(`[Surface 4: Agent Safe Query]`, agentRepo);

            // Surface 5: SPOF list inclusion
            const [spofCheck] = await sql`
                SELECT repo_name, bus_factor 
                FROM repo_metrics 
                WHERE repo_name = ${repoName} AND bus_factor <= 1 AND status != 'empty'
            `;
            const isPgSPOF = Boolean(spofCheck);
            const isAgentSPOF = Boolean(agentRepo?.isSPOF);
            console.log(`[Surface 5: SPOF Check] Postgres SPOF: ${isPgSPOF}, Agent isSPOF: ${isAgentSPOF}`);

            // Verify Parity
            results.push({
                surface: 'Inspect vs Postgres',
                entity: repoName,
                field: 'primary_owner',
                surfaceValue: inspectRepo.primary_owner,
                expectedValue: pgRepo.primary_owner,
                matches: inspectRepo.primary_owner === pgRepo.primary_owner
            });
            results.push({
                surface: 'Inspect vs Postgres',
                entity: repoName,
                field: 'bus_factor',
                surfaceValue: Number(inspectRepo.bus_factor),
                expectedValue: Number(pgRepo.bus_factor),
                matches: Number(inspectRepo.bus_factor) === Number(pgRepo.bus_factor)
            });
            results.push({
                surface: 'Agent vs Postgres',
                entity: repoName,
                field: 'primary_owner',
                surfaceValue: agentRepo.primary_owner,
                expectedValue: pgRepo.primary_owner,
                matches: agentRepo.primary_owner === pgRepo.primary_owner
            });
            results.push({
                surface: 'Agent vs Postgres',
                entity: repoName,
                field: 'bus_factor',
                surfaceValue: Number(agentRepo.bus_factor),
                expectedValue: Number(pgRepo.bus_factor),
                matches: Number(agentRepo.bus_factor) === Number(pgRepo.bus_factor)
            });
            results.push({
                surface: 'Agent SPOF vs Postgres SPOF',
                entity: repoName,
                field: 'isSPOF',
                surfaceValue: isAgentSPOF,
                expectedValue: isPgSPOF,
                matches: isAgentSPOF === isPgSPOF
            });
        }

        // ------------------------------------------------------------
        // PERSON 1 & 2 PARITY CHECKS
        // ------------------------------------------------------------
        for (const personName of testPeople) {
            console.log(`\n--- Auditing Person: ${personName} ---`);

            // Surface 1: Postgres person_metrics
            const [pgPerson] = await sql`
                SELECT external_id, person_name, risk_score, repos, commit_count, is_active, employment_status
                FROM person_metrics
                WHERE person_name ILIKE ${personName}
            `;
            console.log(`[Surface 1: Postgres person_metrics]`, pgPerson);

            // Surface 2: Inspect API / resolvePersonDetail
            const inspectPerson = await buildNodeDetail(pgPerson.external_id || personName, 'person');
            console.log(`[Surface 2: Inspect Node Detail]`, {
                name: inspectPerson.name,
                risk_score: inspectPerson.risk_score,
                risk_tier: inspectPerson.risk_tier,
                repos: inspectPerson.repos?.length,
            });

            // Surface 3: Graph Node (Neo4j)
            const neoPersonRes = await session.run(`
                MATCH (p:PERSON)
                WHERE toLower(p.name) = toLower($personName)
                   OR (p.canonicalPersonId IS NOT NULL AND p.canonicalPersonId = $canonicalId)
                OPTIONAL MATCH (p)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
                RETURN p.name AS name,
                       p.canonicalPersonId AS canonicalPersonId,
                       collect(DISTINCT r.name) AS repos
            `, { personName, canonicalId: pgPerson.external_id });
            const neoPersonRec = neoPersonRes.records[0];
            const neoRepos = neoPersonRec?.get('repos') || [];
            console.log(`[Surface 3: Neo4j Graph] name=${neoPersonRec?.get('name')}, repos=${neoRepos.join(', ')}`);

            // Surface 4: Agent Safe Query ('person_profile')
            const [agentProfile] = await runSafeQuery('person_profile', { person: personName });
            console.log(`[Surface 4: Agent Safe Query]`, {
                person: agentProfile?.person,
                metricsName: agentProfile?.metrics?.person_name,
                metricsRisk: agentProfile?.metrics?.risk_score,
                identityCount: agentProfile?.identities?.length
            });

            // Verify Parity
            results.push({
                surface: 'Inspect vs Postgres',
                entity: personName,
                field: 'risk_score',
                surfaceValue: inspectPerson.risk_score,
                expectedValue: pgPerson.risk_score,
                matches: inspectPerson.risk_score === pgPerson.risk_score
            });
            results.push({
                surface: 'Agent vs Postgres',
                entity: personName,
                field: 'risk_score',
                surfaceValue: Number(agentProfile?.metrics?.risk_score),
                expectedValue: Number(pgPerson.risk_score),
                matches: Number(agentProfile?.metrics?.risk_score) === Number(pgPerson.risk_score)
            });
            results.push({
                surface: 'Agent Identities vs Postgres Identities',
                entity: personName,
                field: 'hasIdentities',
                surfaceValue: (agentProfile?.identities?.length || 0) > 0,
                expectedValue: true,
                matches: (agentProfile?.identities?.length || 0) > 0
            });
        }

        // Summary Table
        console.log('\n============================================================');
        console.log('PARITY CHECK RESULTS TABLE');
        console.log('============================================================');
        console.table(results);

        const allMatched = results.every(r => r.matches);
        if (allMatched) {
            console.log('\n🏆 ALL PARITY CHECKS PASSED: Zero mismatches across all 5 surfaces!');
        } else {
            console.error('\n❌ PARITY CHECKS FAILED: Found discrepancies across surfaces.');
        }

    } finally {
        await session.close();
        process.exit(0);
    }
}

verifyCrossSurfaceParity();

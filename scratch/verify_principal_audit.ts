import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { driver, neo4jSession } from '../apps/api/config/neo4j.js';
import redis from '../apps/api/config/redis.js';
import { buildGraphSummary, buildNodeDetail, getGraphTopologyMetrics } from '../apps/api/modules/graph/graphService.js';
import { getRepoDetails, simulateDeparture } from '../apps/api/modules/dashboard/controller.js';
import { runSafeQuery } from '../packages/agent/graph/nodes/sql.node.js';
import { resolveIdentity } from '../packages/identity/canonicalPerson.service.js';

interface TestResult {
    category: string;
    name: string;
    passed: boolean;
    details: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details: string) {
    results.push({ category, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] [${category}] ${name}: ${details}`);
}

// Mock Express response
function createMockRes() {
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
        status(code: number) {
            statusCode = code;
            return res;
        },
        json(data: any) {
            jsonBody = data;
            return res;
        },
        getStatusCode() {
            return statusCode;
        },
        getBody() {
            return jsonBody;
        }
    };
    return res;
}

async function runAudit() {
    console.log('============================================================');
    console.log('CORTEX PRODUCTION B2B AUDIT & VERIFICATION SUITE');
    console.log('============================================================\n');

    // ─────────────────────────────────────────────────────────────
    // 1. INFRASTRUCTURE & CONNECTIVITY
    // ─────────────────────────────────────────────────────────────
    console.log('--- 1. INFRASTRUCTURE & CONNECTIVITY ---');
    try {
        const session = neo4jSession();
        try {
            const res = await session.run('RETURN 1 AS ok');
            const okVal = res.records[0]?.get('ok')?.toNumber() ?? Number(res.records[0]?.get('ok'));
            const countRes = await session.run('MATCH (n) RETURN count(n) AS total');
            const totalNodes = countRes.records[0]?.get('total')?.toNumber() ?? Number(countRes.records[0]?.get('total'));
            record('Infra', 'Neo4j Connectivity & Routing', okVal === 1 && totalNodes > 0, `Neo4j Aura session live: ok=${okVal}, totalNodes=${totalNodes}`);
        } finally {
            await session.close();
        }
    } catch (err: any) {
        record('Infra', 'Neo4j Connectivity & Routing', false, err.message);
    }

    try {
        const [repoMetricsCount] = await sql`SELECT count(*)::int AS count FROM repo_metrics`;
        const [personMetricsCount] = await sql`SELECT count(*)::int AS count FROM person_metrics`;
        const [workspaceMetricsCount] = await sql`SELECT count(*)::int AS count FROM workspace_metrics`;
        const [eventsCount] = await sql`SELECT count(*)::int AS count FROM events`;
        const ok = (repoMetricsCount?.count ?? 0) > 0 && (personMetricsCount?.count ?? 0) > 0 && (eventsCount?.count ?? 0) > 0;
        record('Infra', 'Postgres Metrics & Events Readability',
            ok,
            `repo_metrics=${repoMetricsCount?.count}, person_metrics=${personMetricsCount?.count}, workspace_metrics=${workspaceMetricsCount?.count}, events=${eventsCount?.count}`
        );
    } catch (err: any) {
        record('Infra', 'Postgres Metrics & Events Readability', false, err.message);
    }

    try {
        const testKey = `audit:test:${Date.now()}`;
        await redis.set(testKey, 'valkey_ok', 'EX', 10);
        const fetched = await redis.get(testKey);
        await redis.del(testKey);
        const deleted = await redis.get(testKey);
        record('Infra', 'Redis/Valkey Cache Get/Set/Del', fetched === 'valkey_ok' && deleted === null, 'Redis get, set with TTL, and delete verified.');
    } catch (err: any) {
        record('Infra', 'Redis/Valkey Cache Get/Set/Del', false, err.message);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. REPOSITORY & SPOF INSPECT
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. REPOSITORY SURFACES & INSPECT ---');
    try {
        const req: any = { params: { repoName: 'core-platform-gateway' } };
        const res = createMockRes();
        await getRepoDetails(req, res);
        const body = res.getBody();
        const ok = res.getStatusCode() === 200 &&
                   body.repoName === 'core-platform-gateway' &&
                   body.primaryOwner?.name === 'Rohan Verma' &&
                   body.busFactor === 1 &&
                   body.riskScore === 80;
        record('Repo', 'Inspect Fragile Repo (core-platform-gateway)', ok,
            `HTTP ${res.getStatusCode()}, owner="${body.primaryOwner?.name}", busFactor=${body.busFactor}, riskScore=${body.riskScore}%, partial=${body.partial}`
        );
    } catch (err: any) {
        record('Repo', 'Inspect Fragile Repo (core-platform-gateway)', false, err.message);
    }

    try {
        const req: any = { params: { repoName: 'cortex-core' } };
        const res = createMockRes();
        await getRepoDetails(req, res);
        const body = res.getBody();
        const ok = res.getStatusCode() === 200 &&
                   body.repoName === 'cortex-core' &&
                   body.status === 'empty' &&
                   body.riskScore === 0 &&
                   body.busFactor === 0 &&
                   body.primaryOwner === null &&
                   body.riskExplanation.isSPOF === false;
        record('Repo', 'Inspect Empty Repo (cortex-core)', ok,
            `HTTP ${res.getStatusCode()}, status="${body.status}", riskScore=${body.riskScore}, busFactor=${body.busFactor}, isSPOF=${body.riskExplanation.isSPOF}`
        );
    } catch (err: any) {
        record('Repo', 'Inspect Empty Repo (cortex-core)', false, err.message);
    }

    // Neo4j Down Simulation for Repo Inspect
    try {
        // Temporarily sabotage session
        const originalSession = driver.session;
        (driver as any).session = () => {
            throw new Error('Connection refused: neo4j down simulation');
        };
        const req: any = { params: { repoName: 'core-platform-gateway' } };
        const res = createMockRes();
        await getRepoDetails(req, res);
        // Restore session
        (driver as any).session = originalSession;

        const body = res.getBody();
        const ok = res.getStatusCode() === 200 &&
                   body.partial === true &&
                   body.primaryOwner?.name === 'Rohan Verma' &&
                   body.busFactor === 1;
        record('Repo', 'Graceful Degradation (Neo4j Down Simulation)', ok,
            `HTTP ${res.getStatusCode()}, partial=${body.partial}, owner="${body.primaryOwner?.name}", busFactor=${body.busFactor}`
        );
    } catch (err: any) {
        record('Repo', 'Graceful Degradation (Neo4j Down Simulation)', false, err.message);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. PERSON DETAILS & DEPARTURE SIMULATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. PERSON DETAILS & SIMULATE DEPARTURE ---');
    try {
        const [priya] = await sql`SELECT external_id, person_name FROM person_metrics WHERE person_name ILIKE '%Priya%' LIMIT 1`;
        if (!priya) {
            record('Person', 'Simulate Departure (Priya Sharma)', false, 'Priya Sharma not found in person_metrics');
        } else {
            const req: any = { params: { externalId: priya.external_id } };
            const res = createMockRes();
            await simulateDeparture(req, res);
            const body = res.getBody();
            const ok = res.getStatusCode() === 200 &&
                       body.person === priya.person_name &&
                       body.riskScore > 0 &&
                       Array.isArray(body.affectedRepos) &&
                       body.affectedRepos.includes('billing-engine');
            record('Person', 'Simulate Departure (Priya Sharma)', ok,
                `HTTP ${res.getStatusCode()}, person="${body.person}", riskScore=${body.riskScore}%, affectedRepos=[${body.affectedRepos.join(', ')}], successors=${body.successorsByRepo?.length || 0}`
            );
        }
    } catch (err: any) {
        record('Person', 'Simulate Departure (Priya Sharma)', false, err.message);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. KNOWLEDGE GRAPH & CACHE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. KNOWLEDGE GRAPH & CACHE ---');
    try {
        const summary = await buildGraphSummary({ limit: 100 });
        const topo = await getGraphTopologyMetrics();
        const ok = summary.status === true && summary.nodeCount > 0 && summary.edgeCount > 0;
        record('Graph', 'Graph Summary API Generation', ok,
            `Nodes=${summary.nodeCount}, Edges=${summary.edgeCount}, TopoNodes=${topo.totalNodes}, TopoEdges=${topo.totalEdges}`
        );

        // Node detail test for Person, Repo, Tech
        const personDetail = await buildNodeDetail('person_465005301842417520046080', 'PERSON');
        const repoDetail = await buildNodeDetail('core-platform-gateway', 'REPOSITORY');
        const techDetail = await buildNodeDetail('TypeScript', 'TECHNOLOGY');

        const detailsOk = personDetail.name === 'Priya Sharma' &&
                          repoDetail.name === 'core-platform-gateway' &&
                          techDetail.name.toLowerCase() === 'typescript';
        record('Graph', 'Node Details (Person, Repo, Tech)', detailsOk,
            `Person="${personDetail.name}" (neighbors=${personDetail.neighbors?.length}), Repo="${repoDetail.name}" (neighbors=${repoDetail.neighbors?.length}), Tech="${techDetail.name}" (neighbors=${techDetail.neighbors?.length})`
        );
    } catch (err: any) {
        record('Graph', 'Knowledge Graph & Detail APIs', false, err.message);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ANALYTICS & INTELLIGENCE DATA
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. ANALYTICS & INTELLIGENCE ---');
    try {
        const topo = await getGraphTopologyMetrics();
        const [eventCountRes] = await sql`SELECT count(*)::int as count FROM events`;
        const repos = await sql`SELECT repo_name, bus_factor, risk_score, status FROM repo_metrics ORDER BY risk_score DESC`;
        const activeRepos = repos.filter(r => r.status !== 'empty');
        const emptyRepos = repos.filter(r => r.status === 'empty');

        const ok = repos.length > 0 && activeRepos.length > 0 && emptyRepos.length === 2 && topo.totalNodes > 0;
        record('Analytics', 'Data Surface Aggregation & Health Alignment', ok,
            `Total repos=${repos.length} (Active=${activeRepos.length}, Empty=${emptyRepos.length}), Total events=${(eventCountRes as any)?.count || 0}, Graph nodes=${topo.totalNodes}`
        );
    } catch (err: any) {
        record('Analytics', 'Data Surface Aggregation', false, err.message);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. AI CHAT / AGENT TOOLING
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. AI CHAT / AGENT TOOLING ---');
    try {
        const repoRiskRows = await runSafeQuery('repo_risk', {});
        const reposByBusFactorRows = await runSafeQuery('repos_by_bus_factor', { threshold: 1 });

        const emptyIncludedInRisk = repoRiskRows.some((r: any) => r.status === 'empty');
        const emptyIncludedInSPOF = reposByBusFactorRows.some((r: any) => r.status === 'empty');
        const unknownOwners = repoRiskRows.filter((r: any) => !r.primary_owner || r.primary_owner === 'Unknown');

        const ok = !emptyIncludedInRisk && !emptyIncludedInSPOF && unknownOwners.length === 0;
        record('Agent', 'SQL Node Repo Risk & SPOF Source of Truth', ok,
            `repo_risk rows=${repoRiskRows.length}, repos_by_bus_factor rows=${reposByBusFactorRows.length}, emptyReposExcluded=${!emptyIncludedInRisk && !emptyIncludedInSPOF}, unknownOwners=${unknownOwners.length}`
        );

        // Display sample owners from repo_risk
        console.log('   Sample Agent Tool Owners:');
        repoRiskRows.slice(0, 5).forEach((r: any) => {
            console.log(`     - ${r.repo_name}: Primary Owner="${r.primary_owner}", Bus Factor=${r.bus_factor}, Risk=${r.risk_score}%`);
        });
    } catch (err: any) {
        record('Agent', 'SQL Node Repo Risk & SPOF', false, err.message);
    }

    // ─────────────────────────────────────────────────────────────
    // 7. PREVIOUS FIX REGRESSION CHECKS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. REGRESSION CHECKS ---');
    try {
        // Test Strict Identity Policy:
        // Exact Email match -> merge
        const canonicalA = await resolveIdentity({ source: seedSource,
            provider: 'github',
            externalId: 'test_strict_regress_1',
            username: 'regress_unique_user',
            email: 'regress_strict@example.com',
            displayName: 'Audit Person Alpha'
        });

        // Exact Email match with different name -> merges into canonicalA
        const canonicalB = await resolveIdentity({ source: seedSource,
            provider: 'slack',
            externalId: 'test_strict_regress_2',
            username: 'different_user',
            email: 'REGRESS_STRICT@example.com', // case-insensitive email
            displayName: 'Completely Different Name'
        });

        // Name-only similarity with no matching email or username -> must NOT auto-merge
        const canonicalC = await resolveIdentity({ source: seedSource,
            provider: 'jira',
            externalId: 'test_strict_regress_3',
            username: 'unrelated_user_xyz',
            email: 'unrelated_email@example.com',
            displayName: 'Audit Person Alpha' // same name, but strictly NO auto-merge
        });

        const idA = canonicalA.canonicalPersonId;
        const idB = canonicalB.canonicalPersonId;
        const idC = canonicalC.canonicalPersonId;

        const identityOk = Boolean(idA && idB && idC && idA === idB && idA !== idC);
        record('Regression', 'Strict Identity Resolution Policy', identityOk,
            `Email merge: canonicalA (${idA}) === canonicalB (${idB}) [${idA === idB}]. Name-only separate: canonicalA !== canonicalC (${idC}) [${idA !== idC}]`
        );

        // Clean up test identities from person_identity
        await sql`DELETE FROM person_identity WHERE source = ${seedSource} AND external_id IN ('test_strict_regress_1', 'test_strict_regress_2', 'test_strict_regress_3')`;
    } catch (err: any) {
        record('Regression', 'Strict Identity Resolution Policy', false, err.message);
    }

    // Print Final Summary Table
    console.log('\n============================================================');
    console.log('AUDIT VERIFICATION SUMMARY');
    console.log('============================================================');
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;
    console.table(results.map(r => ({
        Category: r.category,
        Test: r.name,
        Status: r.passed ? 'PASS' : 'FAIL',
        Details: r.details.length > 70 ? r.details.slice(0, 67) + '...' : r.details
    })));
    console.log(`\nTOTAL: ${results.length} Tests | ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log('============================================================\n');

    await driver.close();
    await sql.end();
    await redis.quit();
}

runAudit().catch(err => {
    console.error('Fatal audit error:', err);
    process.exit(1);
});

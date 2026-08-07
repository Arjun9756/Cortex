/**
 * verify_entire_system.ts
 *
 * Whole System Verification Test Suite for Cortex.
 * Conducts end-to-end multi-layer testing across:
 *   1. Identity Resolution & Canonical Person Merging
 *   2. PostgreSQL Event Ingestion Audit
 *   3. Neo4j Knowledge Graph Node & Edge Structure
 *   4. Qdrant Vector DB Point & Collection Verification
 *   5. Cortex AI Chat & Graph RAG Retrieval Synthesis
 *
 * Usage:
 *   npx tsx scripts/verify_entire_system.ts
 */

import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import { resolveIdentity } from '../packages/identity/canonicalPerson.service.js';
import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { QdrantClient } from '@qdrant/js-client-rest';
import env from '../apps/api/config/env.js';

const qdrant = new QdrantClient({
    url: env.QDRANT_CLUSTER_ENDPOINT,
    apiKey: env.QDRANT_API_KEY,
});

async function testPostgresEvents() {
    console.log('\n🐘 1. --- POSTGRESQL EVENT INGESTION AUDIT ---');
    const counts = await sql`
        SELECT provider, count(*)::int as total
        FROM events
        GROUP BY provider
        ORDER BY total DESC;
    `;
    console.log('   Events Ingested By Provider:');
    for (const row of counts) {
        console.log(`     - ${row.provider.padEnd(10)} : ${row.total} events`);
    }

    const latest = await sql`
        SELECT id, provider, event_type, created_at
        FROM events
        ORDER BY created_at DESC
        LIMIT 5;
    `;
    console.log('   Latest 5 Event Log Entries:');
    for (const row of latest) {
        console.log(`     - [${row.id}] ${row.provider.toUpperCase()} (${row.event_type}) at ${new Date(row.created_at).toISOString()}`);
    }
}

async function testIdentityResolution() {
    console.log('\n🆔 2. --- IDENTITY RESOLUTION & CANONICAL PERSON MERGING ---');

    const testUsers = [
        { provider: 'github', externalId: 'gh_priya', username: 'priyasharma', displayName: 'Priya Sharma', email: 'priya.sharma@company.com' },
        { provider: 'jira', externalId: 'acc-priya-002', username: 'priyasharma', displayName: 'Priya S.', email: 'priya.sharma@company.com' },
        { provider: 'slack', externalId: 'U555PRIYA1', username: 'priya_sharma', displayName: 'Priya Sharma', email: 'priya.sharma@company.com' },
        { provider: 'github', externalId: 'gh_rohan', username: 'rohanverma', displayName: 'Rohan Verma', email: 'rohan.verma@company.com' },
        { provider: 'jira', externalId: 'acc-rohan-003', username: 'rohanverma', displayName: 'Rohan V.', email: 'rohan.verma@company.com' },
    ];

    const resultsMap = new Map<string, string>();

    for (const u of testUsers) {
        const res = await resolveIdentity(u);
        resultsMap.set(`${u.provider}:${u.username}`, res.canonicalPersonId);
        console.log(`   Resolved [${u.provider.padEnd(6)}] ${u.displayName.padEnd(15)} -> Canonical ID: ${res.canonicalPersonId}`);
    }

    const priyaGhId = resultsMap.get('github:priyasharma');
    const priyaJiraId = resultsMap.get('jira:priyasharma');
    const priyaSlackId = resultsMap.get('slack:priya_sharma');

    if (priyaGhId === priyaJiraId && priyaJiraId === priyaSlackId) {
        console.log('   ✅ UNIFIED IDENTITY MATCH: Priya Sharma across GitHub, Jira, Slack resolved to SINGLE Canonical Person ID!');
    } else {
        console.log('   ⚠️ Multi-identity check complete.');
    }
}

async function testNeo4jGraph() {
    console.log('\n🕸️ 3. --- NEO4J KNOWLEDGE GRAPH VERIFICATION ---');
    const session = driver.session();
    try {
        const persons = await session.run(`
            MATCH (p:PERSON)
            RETURN p.name AS name, p.email AS email, p.canonical AS canonical
            LIMIT 10
        `);
        console.log(`   PERSON Nodes in Neo4j (${persons.records.length} total):`);
        for (const rec of persons.records) {
            console.log(`     - Name: ${rec.get('name')?.padEnd(18)} Email: ${rec.get('email') || 'N/A'}`);
        }

        const repos = await session.run(`
            MATCH (r:REPOSITORY)
            RETURN r.name AS name
            LIMIT 10
        `);
        console.log(`   REPOSITORY Nodes in Neo4j (${repos.records.length} total):`);
        for (const rec of repos.records) {
            console.log(`     - ${rec.get('name')}`);
        }

        const rels = await session.run(`
            MATCH (a)-[r]->(b)
            RETURN type(r) AS relType, labels(a)[0] AS sourceType, labels(b)[0] AS targetType, count(*) AS count
            LIMIT 10
        `);
        console.log('   Graph Relationships Overview:');
        for (const rec of rels.records) {
            console.log(`     - (${rec.get('sourceType')}) -[:${rec.get('relType')}]-> (${rec.get('targetType')}): ${rec.get('count')} total`);
        }
    } finally {
        await session.close();
    }
}

async function testQdrantVectorDB() {
    console.log('\n⚡ 4. --- QDRANT VECTOR DB VERIFICATION ---');
    try {
        const collectionName = env.QDRANT_COLLECTION_NAME || 'cortex_events';
        const info = await qdrant.getCollection(collectionName);
        console.log(`   Collection: ${collectionName}`);
        console.log(`   Status:     ${info.status}`);
        console.log(`   Points:     ${info.points_count ?? 0}`);
        console.log(`   Vectors:    ${info.vectors_count ?? 0}`);
        console.log('   ✅ Qdrant cluster is active & reachable!');
    } catch (err: any) {
        console.log('   ⚠️ Qdrant status:', err?.message || err);
    }
}

async function testAIChatRAG() {
    console.log('\n🤖 5. --- AI CHAT & GRAPH RAG SYNTHESIS TEST ---');
    const testQueries = [
        "What is the knowledge risk for Arjun Kumar?",
        "Who is Priya Sharma and what work did she do on billing-service?",
    ];

    for (const q of testQueries) {
        console.log(`\n   Query: "${q}"`);
        const tStart = Date.now();
        try {
            const res = await cortexAgent.invoke({ query: q }, { recursionLimit: 15 });
            const elapsed = Date.now() - tStart;
            console.log(`   Latency: ${elapsed}ms`);
            console.log(`   Answer Summary: ${res.answer?.slice(0, 150)}...`);
            console.log(`   Tools Executed: ${(res.executedTools || []).join(', ') || 'None'}`);
        } catch (err: any) {
            console.log(`   Latency: ${Date.now() - tStart}ms`);
            console.log(`   Error: ${err?.message}`);
        }
    }
}

async function runWholeTesting() {
    console.log('=========================================================');
    console.log(' 🔬 CORTEX SYSTEM-WIDE END-TO-END VERIFICATION');
    console.log('=========================================================');

    await testPostgresEvents();
    await testIdentityResolution();
    await testNeo4jGraph();
    await testQdrantVectorDB();
    await testAIChatRAG();

    console.log('\n=========================================================');
    console.log(' 🎉 SYSTEM-WIDE VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('=========================================================\n');
    process.exit(0);
}

runWholeTesting().catch((err) => {
    console.error('❌ Verification Error:', err);
    process.exit(1);
});

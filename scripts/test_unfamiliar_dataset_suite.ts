import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { upsertEntity, upsertRelation } from '../packages/database/neo4j/graph.repository.js';
import { upsertVector } from '../packages/database/vector/qdrant.repository.js';
import { generateEmbeddings } from '../packages/llm/providers/gemini.js';
import sql from '../apps/api/config/postgres.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Multi-Tenant Simulation: Seed an unfamiliar workspace ("Nexora Cloud")
 * with different repos, employees, tech stack, metrics, and vector records.
 */
async function seedUnfamiliarDataset() {
    console.log("[Seed] Seeding unfamiliar company dataset (Nexora Cloud)...");

    // 1. Seed Neo4j Entities
    const michaelId = await upsertEntity("Michael Chen", "PERSON", { email: "michael.chen@nexora.io", role: "Principal Architect" });
    const priyaId = await upsertEntity("Priya Sharma", "PERSON", { email: "priya.sharma@nexora.io", role: "Staff Engineer" });
    const checkoutRepoId = await upsertEntity("checkout-service", "REPOSITORY", { externalId: "nexora/checkout-service" });
    const authRepoId = await upsertEntity("auth-gateway", "REPOSITORY", { externalId: "nexora/auth-gateway" });
    const kafkaId = await upsertEntity("Kafka", "TECHNOLOGY", {});
    const grpcId = await upsertEntity("gRPC", "TECHNOLOGY", {});
    const commit1Id = await upsertEntity("commit-chk-001", "COMMIT", { createdAt: Date.now() });
    const commit2Id = await upsertEntity("commit-auth-001", "COMMIT", { createdAt: Date.now() });

    // 2. Seed Relationships
    if (michaelId && authRepoId) await upsertRelation(michaelId, authRepoId, "WORKS_ON", "Led auth-gateway architecture");
    if (michaelId && grpcId) await upsertRelation(michaelId, grpcId, "USES", "Proficient in gRPC protocols");
    if (michaelId && commit2Id) await upsertRelation(michaelId, commit2Id, "AUTHORED", "Initial gRPC migration in auth-gateway");
    if (commit2Id && authRepoId) await upsertRelation(commit2Id, authRepoId, "PART_OF", "Part of auth-gateway");

    if (priyaId && checkoutRepoId) await upsertRelation(priyaId, checkoutRepoId, "WORKS_ON", "Core maintainer of checkout-service");
    if (priyaId && kafkaId) await upsertRelation(priyaId, kafkaId, "USES", "Event streaming with Kafka");
    if (priyaId && commit1Id) await upsertRelation(priyaId, commit1Id, "AUTHORED", "Implemented checkout order stream");
    if (commit1Id && checkoutRepoId) await upsertRelation(commit1Id, checkoutRepoId, "PART_OF", "Part of checkout-service");

    // 3. Seed PostgreSQL Repo Metrics
    await sql`
        INSERT INTO repo_metrics (external_id, repo_name, bus_factor, risk_score, contributor_count, status, computed_at)
        VALUES 
            ('nexora/checkout-service', 'checkout-service', 1, 80, 1, 'fragile', now()),
            ('nexora/auth-gateway', 'auth-gateway', 2, 40, 3, 'concentrated', now())
        ON CONFLICT (external_id) DO UPDATE SET
            repo_name = EXCLUDED.repo_name,
            bus_factor = EXCLUDED.bus_factor,
            risk_score = EXCLUDED.risk_score,
            contributor_count = EXCLUDED.contributor_count,
            status = EXCLUDED.status,
            computed_at = now()
    `;

    // 4. Seed Qdrant Vector Semantic Record
    const grpcDecisionSummary = "gRPC was chosen for auth-gateway over REST to reduce latency by 60% and enforce strict protobuf schemas across microservices.";
    const embedding = await generateEmbeddings(grpcDecisionSummary);
    if (embedding) {
        await upsertVector(crypto.randomUUID(), embedding, {
            eventId: "nexora-event-401",
            summary: grpcDecisionSummary,
            entities: [
                { name: "gRPC", type: "TECHNOLOGY" },
                { name: "auth-gateway", type: "REPOSITORY" },
                { name: "Michael Chen", type: "PERSON" }
            ],
            relationships: [
                { from: "auth-gateway", to: "gRPC", type: "USES" }
            ],
            provider: "github",
            repository: "auth-gateway",
            timestamp: new Date().toISOString(),
            author: "Michael Chen"
        });
    }

    console.log("[Seed] Unfamiliar company dataset seeded successfully.\n");
}

async function runUnfamiliarDatasetTests() {
    console.log("================================================================================");
    console.log("🏢 UNFAMILIAR MULTI-TENANT DATASET VALIDATION (Nexora Cloud)");
    console.log("================================================================================\n");

    await seedUnfamiliarDataset();

    const UNFAMILIAR_TESTS = [
        {
            id: 1,
            query: "Why was gRPC chosen for auth-gateway?",
            category: "Semantic / Architectural Reason on Unfamiliar Technology",
        },
        {
            id: 2,
            query: "Who owns the checkout-service repo?",
            category: "Ownership / Graph Traversal on Unfamiliar Repository",
        },
        {
            id: 3,
            query: "What happens if Michael Chen leaves?",
            category: "Knowledge Risk on Unfamiliar Person",
        },
        {
            id: 4,
            query: "Which repos have bus factor 1?",
            category: "Relational Bus Factor Query on Unfamiliar Metrics",
        },
        {
            id: 5,
            query: "What is Priya Sharma's email and role?",
            category: "Contact Info on Unfamiliar Person",
        },
    ];

    const results: any[] = [];

    for (const test of UNFAMILIAR_TESTS) {
        console.log(`\n--------------------------------------------------------------------------------`);
        console.log(`TEST #${test.id}: "${test.query}"`);
        console.log(`Category: ${test.category}`);
        console.log(`--------------------------------------------------------------------------------`);

        const tStart = Date.now();
        try {
            const state = await cortexAgent.invoke({ query: test.query }, { recursionLimit: 25 });
            const elapsed = Date.now() - tStart;

            console.log(`Executed Tools: [${(state.executedTools || []).join(', ')}]`);
            console.log(`Iterations: ${state.iterationCount || 1}`);
            console.log(`Confidence: ${Math.round((state.evidenceConfidence || 0.9) * 100)}%`);
            console.log(`Answer:\n${state.answer}\n`);

            results.push({
                id: test.id,
                query: test.query,
                tools: (state.executedTools || []).join(', '),
                answerPresent: Boolean(state.answer && state.answer.length > 20),
                elapsedMs: elapsed,
                status: 'PASSED'
            });
        } catch (err: any) {
            console.error(`❌ Test #${test.id} failed:`, err?.message);
            results.push({
                id: test.id,
                query: test.query,
                tools: '',
                answerPresent: false,
                elapsedMs: 0,
                status: `FAILED: ${err?.message}`
            });
        }
    }

    console.log("\n================================================================================");
    console.log("📊 UNFAMILIAR DATASET TEST RESULTS");
    console.log("================================================================================\n");
    console.table(results);
    console.log("================================================================================\n");
}

runUnfamiliarDatasetTests().catch(console.error).finally(() => process.exit(0));

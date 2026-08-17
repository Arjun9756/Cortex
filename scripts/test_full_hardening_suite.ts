import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { upsertEntity, upsertRelation } from '../packages/database/neo4j/graph.repository.js';
import { upsertVector } from '../packages/database/vector/qdrant.repository.js';
import { generateEmbeddings } from '../packages/llm/providers/gemini.js';
import sql from '../apps/api/config/postgres.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

/**
 * 1. SEED BRAND-NEW SYNTHETIC DATASET (Quantum Nexus Workspace)
 * Entities, relations, repo metrics, and vector records that have never been tested before.
 */
async function seedNewSyntheticData() {
    console.log('\n================================================================================');
    console.log('🌱 SEEDING BRAND-NEW SYNTHETIC ENTITIES (Quantum Nexus Workspace)');
    console.log('================================================================================\n');

    // A. Neo4j Entities
    const elenaId = await upsertEntity('Elena Rostova', 'PERSON', { email: 'elena.rostova@quantum-nexus.io', role: 'Principal Security Architect' });
    const marcusId = await upsertEntity('Marcus Vance', 'PERSON', { email: 'marcus.vance@quantum-nexus.io', role: 'Staff Data Engineer' });
    const aminaId = await upsertEntity('Amina Zahra', 'PERSON', { email: 'amina.zahra@quantum-nexus.io', role: 'Senior Platform Engineer' });

    const payRepoId = await upsertEntity('payment-orchestrator', 'REPOSITORY', { externalId: 'quantum/payment-orchestrator' });
    const dataRepoId = await upsertEntity('data-pipeline-core', 'REPOSITORY', { externalId: 'quantum/data-pipeline-core' });
    const authEdgeRepoId = await upsertEntity('identity-edge', 'REPOSITORY', { externalId: 'quantum/identity-edge' });

    const rustId = await upsertEntity('Rust', 'TECHNOLOGY', {});
    const cassandraId = await upsertEntity('Cassandra', 'TECHNOLOGY', {});
    const temporalId = await upsertEntity('Temporal', 'TECHNOLOGY', {});

    const commitElena = await upsertEntity('commit-rust-001', 'COMMIT', { createdAt: Date.now() });
    const commitMarcus = await upsertEntity('commit-cass-001', 'COMMIT', { createdAt: Date.now() });
    const commitAmina = await upsertEntity('commit-temp-001', 'COMMIT', { createdAt: Date.now() });

    // B. Relationships
    if (elenaId && authEdgeRepoId) await upsertRelation(elenaId, authEdgeRepoId, 'WORKS_ON', 'Lead architect for identity-edge zero-trust gateway');
    if (elenaId && rustId) await upsertRelation(elenaId, rustId, 'USES', 'Authored core cryptographic modules in Rust');
    if (elenaId && commitElena) await upsertRelation(elenaId, commitElena, 'AUTHORED', 'Initial sub-millisecond JWT cryptographic verifier in Rust');
    if (commitElena && authEdgeRepoId) await upsertRelation(commitElena, authEdgeRepoId, 'PART_OF', 'Part of identity-edge');

    if (marcusId && dataRepoId) await upsertRelation(marcusId, dataRepoId, 'WORKS_ON', 'Core maintainer of data-pipeline-core telemetry ingester');
    if (marcusId && cassandraId) await upsertRelation(marcusId, cassandraId, 'USES', 'Designed high-throughput Cassandra write clustering');
    if (marcusId && commitMarcus) await upsertRelation(marcusId, commitMarcus, 'AUTHORED', 'Migrated telemetry storage engine from MongoDB to Cassandra');
    if (commitMarcus && dataRepoId) await upsertRelation(commitMarcus, dataRepoId, 'PART_OF', 'Part of data-pipeline-core');

    if (aminaId && payRepoId) await upsertRelation(aminaId, payRepoId, 'WORKS_ON', 'Platform owner of payment-orchestrator');
    if (aminaId && temporalId) await upsertRelation(aminaId, temporalId, 'USES', 'Implemented saga pattern using Temporal workflows');
    if (aminaId && commitAmina) await upsertRelation(aminaId, commitAmina, 'AUTHORED', 'Integrated Temporal workflow engine for distributed multi-step payments');
    if (commitAmina && payRepoId) await upsertRelation(commitAmina, payRepoId, 'PART_OF', 'Part of payment-orchestrator');

    // C. PostgreSQL Metrics
    await sql`
        INSERT INTO repo_metrics (external_id, repo_name, bus_factor, risk_score, contributor_count, status, computed_at)
        VALUES 
            ('quantum/payment-orchestrator', 'payment-orchestrator', 1, 85, 1, 'fragile', now()),
            ('quantum/data-pipeline-core', 'data-pipeline-core', 2, 45, 3, 'healthy', now()),
            ('quantum/identity-edge', 'identity-edge', 1, 90, 1, 'critical', now())
        ON CONFLICT (external_id) DO UPDATE SET
            repo_name = EXCLUDED.repo_name,
            bus_factor = EXCLUDED.bus_factor,
            risk_score = EXCLUDED.risk_score,
            contributor_count = EXCLUDED.contributor_count,
            status = EXCLUDED.status,
            computed_at = now()
    `;

    // D. Qdrant Vector Semantic Documents
    const doc1 = "Temporal was adopted in payment-orchestrator on 2026-07-15 to guarantee exactly-once workflow orchestration across distributed payment gateways and eliminate manual rollback scripts.";
    const emb1 = await generateEmbeddings(doc1);
    if (emb1) {
        await upsertVector(crypto.randomUUID(), emb1, {
            eventId: "quantum-evt-101",
            summary: doc1,
            entities: [
                { name: "Temporal", type: "TECHNOLOGY" },
                { name: "payment-orchestrator", type: "REPOSITORY" },
                { name: "Amina Zahra", type: "PERSON" }
            ],
            relationships: [{ from: "payment-orchestrator", to: "Temporal", type: "USES" }],
            provider: "github",
            repository: "payment-orchestrator",
            timestamp: "2026-07-15T14:20:00.000Z",
            author: "Amina Zahra"
        });
    }

    const doc2 = "Cassandra was migrated to from MongoDB in data-pipeline-core on 2026-06-20 to handle 10x write throughput spikes during telemetry ingestion without dropping packets.";
    const emb2 = await generateEmbeddings(doc2);
    if (emb2) {
        await upsertVector(crypto.randomUUID(), emb2, {
            eventId: "quantum-evt-102",
            summary: doc2,
            entities: [
                { name: "Cassandra", type: "TECHNOLOGY" },
                { name: "data-pipeline-core", type: "REPOSITORY" },
                { name: "Marcus Vance", type: "PERSON" }
            ],
            relationships: [{ from: "data-pipeline-core", to: "Cassandra", type: "USES" }],
            provider: "github",
            repository: "data-pipeline-core",
            timestamp: "2026-06-20T10:15:00.000Z",
            author: "Marcus Vance"
        });
    }

    const doc3 = "Rust was introduced in identity-edge by Elena Rostova on 2026-05-10 to achieve sub-millisecond JWT authentication and eliminate garbage collection pauses in edge proxy routing.";
    const emb3 = await generateEmbeddings(doc3);
    if (emb3) {
        await upsertVector(crypto.randomUUID(), emb3, {
            eventId: "quantum-evt-103",
            summary: doc3,
            entities: [
                { name: "Rust", type: "TECHNOLOGY" },
                { name: "identity-edge", type: "REPOSITORY" },
                { name: "Elena Rostova", type: "PERSON" }
            ],
            relationships: [{ from: "identity-edge", to: "Rust", type: "USES" }],
            provider: "github",
            repository: "identity-edge",
            timestamp: "2026-05-10T16:45:00.000Z",
            author: "Elena Rostova"
        });
    }

    console.log('✅ Seeding complete: Elena Rostova, Marcus Vance, Amina Zahra, Rust, Cassandra, Temporal, payment-orchestrator, data-pipeline-core, identity-edge.\n');
}

interface TestSpec {
    id: number;
    category: string;
    query: string;
    expectedAsksCount?: number;
    expectedTools?: string[];
    validateAnswer: (answer: string, state: any) => { pass: boolean; reason: string };
}

const TEST_SPECS: TestSpec[] = [
    // 1. Single Entity Lookup on New Entity
    {
        id: 1,
        category: "Single Entity Contact / Role Lookup",
        query: "What is Elena Rostova's role and email address?",
        expectedTools: ["graph_search"],
        validateAnswer: (ans) => {
            const hasRole = ans.toLowerCase().includes('security') || ans.toLowerCase().includes('architect');
            const hasEmail = ans.toLowerCase().includes('elena.rostova@quantum-nexus.io');
            return {
                pass: hasRole && hasEmail,
                reason: `Role present: ${hasRole}, Email present: ${hasEmail}`
            };
        }
    },

    // 2. Technology Usage on New Entity
    {
        id: 2,
        category: "Technology Usage on New Person",
        query: "What technologies does Marcus Vance use?",
        expectedTools: ["graph_search"],
        validateAnswer: (ans) => {
            const hasCassandra = ans.toLowerCase().includes('cassandra');
            return {
                pass: hasCassandra,
                reason: `Cassandra present: ${hasCassandra}`
            };
        }
    },

    // 3. Relational Metric / Bus Factor on New Repos
    {
        id: 3,
        category: "Relational Bus Factor Query",
        query: "Which repositories have a bus factor of 1?",
        expectedTools: ["sql_search"],
        validateAnswer: (ans) => {
            const hasSPOF = ans.toLowerCase().includes('identity-edge') || ans.toLowerCase().includes('payment-orchestrator') || ans.toLowerCase().includes('billing-service');
            return {
                pass: hasSPOF,
                reason: `Identified bus factor 1 repos: ${hasSPOF}`
            };
        }
    },

    // 4. Knowledge Departure Risk on New Person
    {
        id: 4,
        category: "Person Knowledge Departure Risk",
        query: "What is Elena Rostova's knowledge departure risk if she resigns?",
        expectedTools: ["knowledge_risk"],
        validateAnswer: (ans, state) => {
            const hasRisk = ans.toLowerCase().includes('risk') && ans.includes('%');
            return {
                pass: hasRisk,
                reason: `Risk score and breakdown present: ${hasRisk}`
            };
        }
    },

    // 5. Multi-Person Knowledge Risk Query
    {
        id: 5,
        category: "Multi-Person Knowledge Risk",
        query: "What is the knowledge departure risk for Elena Rostova and Marcus Vance?",
        expectedTools: ["knowledge_risk"],
        validateAnswer: (ans, state) => {
            const hasElena = ans.toLowerCase().includes('elena');
            const hasMarcus = ans.toLowerCase().includes('marcus');
            const hasPct = ans.includes('%');
            return {
                pass: hasElena && hasMarcus && hasPct,
                reason: `Both Elena and Marcus evaluated: ${hasElena && hasMarcus}, percentages present: ${hasPct}`
            };
        }
    },

    // 6. Semantic Architectural Rationale on New Tech
    {
        id: 6,
        category: "Semantic / Architectural Reason",
        query: "Why was Temporal adopted in payment-orchestrator and when?",
        expectedTools: ["vector_search"],
        validateAnswer: (ans) => {
            const hasReason = ans.toLowerCase().includes('orchestration') || ans.toLowerCase().includes('workflow') || ans.toLowerCase().includes('exactly-once');
            const hasDate = ans.includes('2026') || ans.toLowerCase().includes('july');
            return {
                pass: hasReason && hasDate,
                reason: `Architectural reason present: ${hasReason}, Date present: ${hasDate}`
            };
        }
    },

    // 7. Compound 2-Part Query on New Entity
    {
        id: 7,
        category: "Compound 2-Part Query",
        query: "Who is Amina Zahra and what technologies does she use?",
        expectedTools: ["graph_search"],
        validateAnswer: (ans) => {
            const hasPerson = ans.toLowerCase().includes('amina') || ans.toLowerCase().includes('platform engineer');
            const hasTech = ans.toLowerCase().includes('temporal');
            return {
                pass: hasPerson && hasTech,
                reason: `Person details: ${hasPerson}, Technology: ${hasTech}`
            };
        }
    },

    // 8. Compound 3-Part Query on New Entity
    {
        id: 8,
        category: "Compound 3-Part Query",
        query: "What is Elena Rostova's email, what is her knowledge risk, and which repo does she work on?",
        expectedTools: ["graph_search", "knowledge_risk"],
        validateAnswer: (ans) => {
            const hasEmail = ans.toLowerCase().includes('elena.rostova@quantum-nexus.io');
            const hasRisk = ans.includes('%');
            const hasRepo = ans.toLowerCase().includes('identity-edge');
            return {
                pass: hasEmail && hasRisk && hasRepo,
                reason: `Email: ${hasEmail}, Risk: ${hasRisk}, Repo: ${hasRepo}`
            };
        }
    },

    // 9. Compound 4-Part Query on New Entities
    {
        id: 9,
        category: "Compound 4-Part Query",
        query: "What is Marcus Vance's role, what tech does he use, why was Cassandra migrated to from MongoDB, and what is the bus factor of data-pipeline-core?",
        expectedTools: ["graph_search", "vector_search", "sql_search"],
        validateAnswer: (ans) => {
            const hasRole = ans.toLowerCase().includes('data engineer');
            const hasTech = ans.toLowerCase().includes('cassandra');
            const hasWhy = ans.toLowerCase().includes('throughput') || ans.toLowerCase().includes('write') || ans.toLowerCase().includes('spikes');
            const hasBF = ans.toLowerCase().includes('data-pipeline-core') || ans.includes('2');
            return {
                pass: hasRole && hasTech && hasWhy,
                reason: `Role: ${hasRole}, Tech: ${hasTech}, Migration reason: ${hasWhy}, Bus Factor: ${hasBF}`
            };
        }
    },

    // 10. Complex 5-Part Master Query on New Entities
    {
        id: 10,
        category: "Complex 5-Part Master Query",
        query: "Who is Elena Rostova, what tech does she use, what is her departure risk, what is the bus factor of identity-edge, and why was Rust introduced?",
        expectedTools: ["graph_search", "knowledge_risk", "sql_search", "vector_search"],
        validateAnswer: (ans) => {
            const hasElena = ans.toLowerCase().includes('elena');
            const hasRust = ans.toLowerCase().includes('rust');
            const hasRisk = ans.includes('%');
            const hasRepo = ans.toLowerCase().includes('identity-edge');
            const hasWhy = ans.toLowerCase().includes('jwt') || ans.toLowerCase().includes('sub-millisecond') || ans.toLowerCase().includes('garbage collection');
            return {
                pass: hasElena && hasRust && hasRisk && hasWhy,
                reason: `Elena: ${hasElena}, Rust: ${hasRust}, Risk: ${hasRisk}, Identity-edge: ${hasRepo}, Why Rust: ${hasWhy}`
            };
        }
    },

    // 11. Complex 6-Part Master Query with Familiar & New Data Combined
    {
        id: 11,
        category: "Master 6-Part Complex Query",
        query: "How many total repositories and technologies are there, which repos have a bus factor of 1, what is Priya Sharma's knowledge risk and what technologies does she use, why did we replace Redis with Valkey and when, and if Arjun Kumar leaves what breaks and who's the best successor?",
        expectedTools: ["graph_search", "sql_search", "knowledge_risk", "vector_search"],
        validateAnswer: (ans) => {
            const hasCounts = ans.toLowerCase().includes('repositories') && ans.toLowerCase().includes('technologies');
            const hasBusFactor = ans.toLowerCase().includes('bus factor');
            const hasPriya = ans.toLowerCase().includes('priya') && ans.includes('%');
            const hasValkey = ans.toLowerCase().includes('valkey') && (ans.includes('2026') || ans.toLowerCase().includes('august') || ans.toLowerCase().includes('redis'));
            const hasArjun = ans.toLowerCase().includes('arjun');
            return {
                pass: hasCounts && hasBusFactor && hasPriya && hasValkey && hasArjun,
                reason: `Counts: ${hasCounts}, BusFactor: ${hasBusFactor}, Priya: ${hasPriya}, Valkey: ${hasValkey}, Arjun: ${hasArjun}`
            };
        }
    },

    // 12. Non-existent Entity Boundary Test
    {
        id: 12,
        category: "Non-existent Entity Boundary Test",
        query: "Who is Johnathan NonexistentDoe and what is his risk score?",
        validateAnswer: (ans) => {
            const reportsNotFound = ans.toLowerCase().includes('no entity') ||
                ans.toLowerCase().includes('no indexed records') ||
                ans.toLowerCase().includes('not found') ||
                ans.toLowerCase().includes('does not exist');
            return {
                pass: reportsNotFound,
                reason: `Reports absence honestly without fabrication: ${reportsNotFound}`
            };
        }
    },

    // 13. Adversarial / Non-Engineering Domain Boundary
    {
        id: 13,
        category: "Adversarial Out-of-Domain Boundary",
        query: "What is our company's marketing budget for Q4?",
        validateAnswer: (ans) => {
            const reportsNoData = ans.toLowerCase().includes('no indexed records') ||
                ans.toLowerCase().includes('not found') ||
                ans.toLowerCase().includes('no information') ||
                ans.toLowerCase().includes('no evidence');
            return {
                pass: reportsNoData,
                reason: `Avoids fabricating financial figures: ${reportsNoData}`
            };
        }
    },

    // 14. Open-ended Multi-hop Traversal on New Entity
    {
        id: 14,
        category: "Graph Multi-hop Traversal",
        query: "Trace all connections from Elena Rostova to technologies and repositories",
        expectedTools: ["graph_search"],
        validateAnswer: (ans) => {
            const hasConnections = ans.toLowerCase().includes('identity-edge') || ans.toLowerCase().includes('rust');
            return {
                pass: hasConnections,
                reason: `Connected to identity-edge/Rust: ${hasConnections}`
            };
        }
    }
];

async function runComprehensiveHardeningSuite() {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║        CORTEX AGENTIC QUERY PIPELINE — FINAL HARDENING SUITE                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

    await seedNewSyntheticData();

    const summaryResults: any[] = [];
    let passCount = 0;
    let failCount = 0;

    for (const spec of TEST_SPECS) {
        console.log(`\n${'═'.repeat(80)}`);
        console.log(`▶ TEST #${spec.id}: [${spec.category}]`);
        console.log(`  Query: "${spec.query}"`);
        console.log(`${'═'.repeat(80)}`);

        const tStart = Date.now();
        try {
            const result = await cortexAgent.invoke({ query: spec.query }, { recursionLimit: 25 });
            const elapsed = Date.now() - tStart;

            const executed = (result.executedTools || []).join(', ') || 'LLM ONLY';
            const answer = result.answer || '';
            const validation = spec.validateAnswer(answer, result);

            console.log(`\n  ⏱️  Latency: ${elapsed}ms | Passes: ${result.iterationCount || 1}`);
            console.log(`  🛠️  Tools Executed: [${executed}]`);
            console.log(`  📋 Decomposed Subgoals (${result.subgoals?.length || 1}):`, result.subgoals?.map((g: any) => `[${g.id}] ${g.description}`) || []);
            console.log(`  🎯 Goals Covered: ${result.coveredGoals?.length || 0} / ${result.subgoals?.length || 1}`);
            console.log(`  🔍 Missing Goals: ${JSON.stringify(result.missingGoals || [])}`);
            console.log(`  📊 Answer Preview:\n${answer.slice(0, 300).replace(/\n+/g, ' ')}...`);
            console.log(`\n  Validation: ${validation.reason}`);

            if (validation.pass) {
                console.log(`  Status: ✅ PASS`);
                passCount++;
                summaryResults.push({
                    ID: spec.id,
                    Category: spec.category,
                    Latency: `${elapsed}ms`,
                    Tools: executed,
                    Asks: result.subgoals?.length || 1,
                    Covered: result.coveredGoals?.length || 1,
                    Status: '✅ PASS'
                });
            } else {
                console.log(`  Status: ❌ FAIL — ${validation.reason}`);
                failCount++;
                summaryResults.push({
                    ID: spec.id,
                    Category: spec.category,
                    Latency: `${elapsed}ms`,
                    Tools: executed,
                    Asks: result.subgoals?.length || 1,
                    Covered: result.coveredGoals?.length || 0,
                    Status: `❌ FAIL: ${validation.reason}`
                });
            }
        } catch (err: any) {
            console.error(`  Status: 💥 ERROR — ${err?.message}`);
            failCount++;
            summaryResults.push({
                ID: spec.id,
                Category: spec.category,
                Latency: `${Date.now() - tStart}ms`,
                Tools: 'ERROR',
                Asks: 0,
                Covered: 0,
                Status: `💥 ERROR: ${err?.message}`
            });
        }
    }

    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📊 FINAL HARDENING PASS SUMMARY: ${passCount}/${TEST_SPECS.length} TESTS PASSED`);
    console.log(`${'═'.repeat(80)}\n`);
    console.table(summaryResults);
    console.log(`${'═'.repeat(80)}\n`);

    process.exit(failCount === 0 ? 0 : 1);
}

runComprehensiveHardeningSuite().catch((err) => {
    console.error('Fatal suite failure:', err);
    process.exit(1);
});

import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import fs from 'fs';
import path from 'path';

interface QATestCase {
    id: number;
    category: string;
    query: string;
    note: string;
}

const testCases: QATestCase[] = [
    // 1. Simple factual lookups
    {
        id: 1,
        category: "Simple Factual Lookup",
        query: "What is Priya Sharma's email and role in the organization?",
        note: "Tests exact single-entity graph property lookup (PERSON node email and role properties)."
    },
    {
        id: 2,
        category: "Simple Factual Lookup",
        query: "Who is Arjun Kumar and what is his email?",
        note: "Tests entity profile extraction and description matching."
    },

    // 2. Global counts and lists
    {
        id: 3,
        category: "Global Counts",
        query: "How many total repositories, technologies, and people exist in the knowledge graph?",
        note: "Tests parallel label-count aggregations across REPOSITORY, TECHNOLOGY, and PERSON nodes."
    },
    {
        id: 4,
        category: "Repository-to-Technology Mapping",
        query: "List all repositories and their corresponding technologies.",
        note: "Tests multi-hop graph traversal across commits, PRs, and contributors to map full tech stacks for all 15 repos."
    },

    // 3. Relationship queries
    {
        id: 5,
        category: "Relationship Traversal",
        query: "What technologies does Priya Sharma use and what repositories does she work on?",
        note: "Tests multi-relation node traversal (USES -> TECHNOLOGY, WORKS_ON -> REPOSITORY)."
    },
    {
        id: 6,
        category: "Repository Details",
        query: "Which technologies are used in the Cortex repository?",
        note: "Tests 2-hop commit/contributor technology aggregation scoped to a specific repository."
    },

    // 4. "Why" reasoning & architectural decisions
    {
        id: 7,
        category: "Architectural Decision Archaeology",
        query: "Why was Redis removed or replaced with Valkey? What's the history, date, author, and benchmark behind it?",
        note: "Tests semantic vector embedding search retrieving commit rationale, date (2026-08-08), author (Arjun Kumar), and zero regression benchmarks."
    },
    {
        id: 8,
        category: "Decision Archaeology",
        query: "Why was OAuth2 PKCE chosen for auth-service and what was the rationale?",
        note: "Tests semantic vector search retrieving security architecture decisions."
    },

    // 5. Knowledge Risk Queries
    {
        id: 9,
        category: "Knowledge Risk Evaluation",
        query: "What is Priya Sharma's knowledge departure risk and breakdown?",
        note: "Tests deterministic 6-factor departure risk model calculation and sole-maintained item counting."
    },
    {
        id: 10,
        category: "Knowledge Risk Evaluation",
        query: "What is Arjun Kumar's knowledge departure risk and what items are at risk?",
        note: "Tests departure risk calculation and itemizes SPOFs (Cortex repo, commit a1b2c3..., issues)."
    },
    {
        id: 11,
        category: "Team-Wide Knowledge Risk",
        query: "Break down knowledge departure risk across the entire team.",
        note: "Tests whole-team aggregate calculation across all 11 engineers."
    },

    // 6. Bus Factor / SPOF Queries
    {
        id: 12,
        category: "Relational Bus Factor / SPOF",
        query: "Which repositories have a bus factor of 1 and are single points of failure?",
        note: "Tests SQL relational query on repo_metrics table filtering by bus_factor <= 1."
    },
    {
        id: 13,
        category: "Relational Risk Ranking",
        query: "Rank all repositories by their computed risk score.",
        note: "Tests SQL repo_risk template returning sorted risk ranking table."
    },

    // 7. Departure Simulation + Successor Recommendation
    {
        id: 14,
        category: "Departure Impact & Successor Recommendation",
        query: "If Arjun Kumar leaves what breaks and who is the best successor?",
        note: "Tests combined departure impact analysis, automatic repo bus factor enrichment, and 4-factor successor recommendation (recommending Priya Sharma at 36%)."
    },
    {
        id: 15,
        category: "Departure Impact & Successor Recommendation",
        query: "What happens if Priya Sharma departs and who should take over her repositories?",
        note: "Tests departure impact on 3 billing repos and reverse successor recommendation (Arjun Kumar at 36%)."
    },

    // 8. Multi-Domain Synthetic Entity / Honest Empty States
    {
        id: 16,
        category: "Zero-Hallucination Honest Empty State",
        query: "Who is the best successor for Elena Rostova if she leaves?",
        note: "Tests honest empty state for single-domain Rust engineer with zero overlapping candidates."
    },
    {
        id: 17,
        category: "Zero-Hallucination Honest Empty State",
        query: "What is Marcus Vance's departure risk and who can succeed him on Cassandra?",
        note: "Tests honest empty state for Cassandra data-pipeline-core engineer with zero overlapping candidates."
    },
    {
        id: 18,
        category: "Zero-Hallucination Honest Empty State",
        query: "What happens if Amina Zahra resigns from payment-orchestrator?",
        note: "Tests honest empty state for Temporal engineer with zero overlapping candidates."
    },

    // 9. Compound Multi-Part Queries
    {
        id: 19,
        category: "Comparative Compound Query",
        query: "Compare Arjun Kumar and Priya Sharma in terms of knowledge risk, sole-maintained repositories, and shared technologies.",
        note: "Tests comparative multi-entity extraction combining graph, analytics, and SQL evidence."
    },
    {
        id: 20,
        category: "9-Part Ultra-Master Query",
        query: "How many total repositories and technologies are there, which repos have a bus factor of 1, what is Priya Sharma's knowledge risk and what technologies does she use, why did we replace Redis with Valkey and when, and if Arjun Kumar leaves what breaks and who's the best successor?",
        note: "Tests 9 simultaneous decomposed subgoals across Graph, SQL, Vector, and Analytics engines synthesized in 1 coherent answer."
    },

    // 10. Edge Cases & Boundary Conditions
    {
        id: 21,
        category: "Non-Existent Entity Edge Case",
        query: "What is the knowledge departure risk and successor for John Doe?",
        note: "Tests strict entity resolution returning 'No indexed records found' without hallucinating."
    },
    {
        id: 22,
        category: "Out-of-Domain Question Edge Case",
        query: "What is the weather in Mumbai today?",
        note: "Tests out-of-domain boundary handling."
    }
];

async function runLiveQASuite() {
    console.log('================================================================================');
    console.log(`🚀 RUNNING COMPLETE 22-QUESTION LIVE Q&A TEST SUITE ACROSS AGENT PIPELINE`);
    console.log('================================================================================\n');

    const results: any[] = [];

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        console.log(`\n────────────────────────────────────────────────────────────────────────────────`);
        console.log(`[Q${tc.id}/22] [${tc.category}]`);
        console.log(`Query: "${tc.query}"`);
        console.log(`────────────────────────────────────────────────────────────────────────────────`);

        const t0 = Date.now();
        try {
            const res = await cortexAgent.invoke({ query: tc.query }, { recursionLimit: 25 });
            const elapsed = Date.now() - t0;

            console.log(`⏱️ Duration: ${elapsed}ms | Tools Executed: [${res.executedTools.join(', ')}]`);
            console.log(`\nAnswer Preview:\n${res.answer.slice(0, 150)}...\n`);

            results.push({
                id: tc.id,
                category: tc.category,
                query: tc.query,
                toolsExecuted: res.executedTools,
                durationMs: elapsed,
                answer: res.answer,
                note: tc.note,
                status: 'SUCCESS'
            });
        } catch (err: any) {
            console.error(`❌ Error on Q${tc.id}: ${err?.message}`);
            results.push({
                id: tc.id,
                category: tc.category,
                query: tc.query,
                toolsExecuted: [],
                durationMs: Date.now() - t0,
                answer: `ERROR: ${err?.message}`,
                note: tc.note,
                status: 'FAILED'
            });
        }

        // 4-second delay between queries to respect Groq rate limits
        if (i < testCases.length - 1) {
            await new Promise((r) => setTimeout(r, 4000));
        }
    }

    const outputPath = path.resolve(process.cwd(), 'scratch', 'live_qa_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n================================================================================`);
    console.log(`✅ Completed all 22 live questions! Saved verbatim results to ${outputPath}`);
    console.log('================================================================================\n');

    await driver.close();
    await sql.end();
    process.exit(0);
}

runLiveQASuite();

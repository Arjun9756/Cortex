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

const remainingCases: QATestCase[] = [
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

async function runRemaining() {
    const rawPath = path.resolve(process.cwd(), 'scratch', 'live_qa_results.json');
    let existing: any[] = [];
    if (fs.existsSync(rawPath)) {
        existing = JSON.parse(fs.readFileSync(rawPath, 'utf-8')).slice(0, 6); // Keep Q1-Q6
    }

    console.log('================================================================================');
    console.log(`🚀 RUNNING REMAINING LIVE QA (Q7 - Q22) WITH PRIMARY MODEL (gpt-oss-120b)`);
    console.log('================================================================================\n');

    for (let i = 0; i < remainingCases.length; i++) {
        const tc = remainingCases[i];
        if (!tc) continue;
        console.log(`\n────────────────────────────────────────────────────────────────────────────────`);
        console.log(`[Q${tc.id}/22] [${tc.category}] Query: "${tc.query}"`);
        console.log(`────────────────────────────────────────────────────────────────────────────────`);

        const t0 = Date.now();
        try {
            const res = await cortexAgent.invoke({ query: tc.query }, { recursionLimit: 25 });
            const elapsed = Date.now() - t0;
            console.log(`⏱️ Duration: ${elapsed}ms | Tools Executed: [${res.executedTools.join(', ')}]`);
            console.log(`Answer:\n${res.answer.slice(0, 200)}...\n`);

            existing.push({
                id: tc.id,
                category: tc.category,
                query: tc.query,
                toolsExecuted: res.executedTools,
                durationMs: elapsed,
                answer: res.answer,
                note: tc.note,
                status: 'SUCCESS'
            });
        } catch (e: any) {
            console.error(`Error on Q${tc.id}:`, e?.message);
            existing.push({
                id: tc.id,
                category: tc.category,
                query: tc.query,
                toolsExecuted: [],
                durationMs: Date.now() - t0,
                answer: `ERROR: ${e?.message}`,
                note: tc.note,
                status: 'FAILED'
            });
        }

        if (i < remainingCases.length - 1) {
            await new Promise((r) => setTimeout(r, 3000));
        }
    }

    fs.writeFileSync(rawPath, JSON.stringify(existing, null, 2), 'utf-8');
    console.log(`\n✅ Saved complete 22 live answers to ${rawPath}`);
    await driver.close();
    await sql.end();
    process.exit(0);
}

runRemaining();

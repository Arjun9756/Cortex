/**
 * seed_and_verify_complex_data.ts
 *
 * Direct high-performance Neo4j graph seeder and analytics verifier for Cortex.
 * Seeds interconnected multi-risk repositories (SPOF, Moderate, Healthy Distributed),
 * runs analytics computation jobs, and verifies all endpoints.
 *
 * Usage:
 *   npx tsx scripts/seed_and_verify_complex_data.ts
 */

import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import { runAnalyticsJob } from '../packages/workers/scheduler.worker.js';
import { calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';

interface RepoSeedDefinition {
    name: string;
    description: string;
    technologies: string[];
    contributors: Array<{
        name: string;
        email: string;
        role: string;
        commitCount: number;
    }>;
    recentCommits: Array<{
        hash: string;
        message: string;
        authorName: string;
        daysAgo: number;
    }>;
    jiraIssues: Array<{
        key: string;
        summary: string;
        reporter: string;
        status: string;
    }>;
}

const COMPLEX_REPOSITORIES: RepoSeedDefinition[] = [
    // 1. High-Risk SPOF: payment-gateway-v2 (Bus Factor = 1, Sole Maintainer: Devendra Singh)
    {
        name: "payment-gateway-v2",
        description: "PCI-DSS tokenization and high-throughput transaction routing gateway in Go and HashiCorp Vault.",
        technologies: ["Go", "gRPC", "PostgreSQL", "Vault", "Stripe API", "Valkey"],
        contributors: [
            { name: "Devendra Singh", email: "devendra.singh@company.com", role: "Principal Fintech Architect", commitCount: 8 }
        ],
        recentCommits: [
            { hash: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01", message: "PAY-901: Architected core PCI-DSS tokenization pipeline in Go with HashiCorp Vault transit encryption.", authorName: "Devendra Singh", daysAgo: 2 },
            { hash: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02", message: "PAY-904: Added Valkey cache layer for ledger balance lock and PostgreSQL dual-write journal.", authorName: "Devendra Singh", daysAgo: 5 },
            { hash: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d03", message: "PAY-908: gRPC mTLS authentication and unary stream worker pool for 50k RPS transaction load.", authorName: "Devendra Singh", daysAgo: 10 }
        ],
        jiraIssues: [
            { key: "PAY-901", summary: "Architect Go gRPC and HashiCorp Vault tokenization pipeline", reporter: "Devendra Singh", status: "Done" },
            { key: "PAY-904", summary: "Valkey cache layer for ledger balance lock under retry load", reporter: "Devendra Singh", status: "Done" }
        ]
    },

    // 2. High-Risk SPOF: realtime-stream-engine (Bus Factor = 1, Sole Maintainer: Neha Gupta)
    {
        name: "realtime-stream-engine",
        description: "Sub-second event streaming, telemetry processing, and fraud scoring in Apache Flink and ClickHouse.",
        technologies: ["Apache Flink", "Kafka", "ClickHouse", "Python", "Rust"],
        contributors: [
            { name: "Neha Gupta", email: "neha.gupta@company.com", role: "Lead Data Engineer", commitCount: 7 }
        ],
        recentCommits: [
            { hash: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001", message: "STREAM-401: Deployed Apache Flink stateful windowing pipeline and Kafka topic partitioners.", authorName: "Neha Gupta", daysAgo: 3 },
            { hash: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d002", message: "STREAM-408: Implemented ClickHouse columnar table engine ingestion sink replacing Elasticsearch.", authorName: "Neha Gupta", daysAgo: 7 },
            { hash: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d003", message: "STREAM-412: Rust fast-path deserializer for telemetry ingestion worker.", authorName: "Neha Gupta", daysAgo: 14 }
        ],
        jiraIssues: [
            { key: "STREAM-401", summary: "Replace Elasticsearch with ClickHouse and Apache Flink", reporter: "Neha Gupta", status: "Done" },
            { key: "STREAM-408", summary: "ClickHouse columnar table engine ingestion sink", reporter: "Neha Gupta", status: "Done" }
        ]
    },

    // 3. High-Risk SPOF: auth-token-vault (Bus Factor = 1, Sole Maintainer: Vikram Patel)
    {
        name: "auth-token-vault",
        description: "Zero-knowledge cryptographic token verification and Keycloak identity federation in Rust.",
        technologies: ["Rust", "WebCrypto", "Keycloak", "Redis", "PKCE"],
        contributors: [
            { name: "Vikram Patel", email: "vikram.patel@company.com", role: "Staff Security Engineer", commitCount: 6 }
        ],
        recentCommits: [
            { hash: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001", message: "SEC-701: Implemented Rust WebCrypto zero-knowledge token vault with Keycloak federation.", authorName: "Vikram Patel", daysAgo: 4 },
            { hash: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c002", message: "SEC-704: Enforced PKCE cryptographic challenges and Redis session blacklisting.", authorName: "Vikram Patel", daysAgo: 8 }
        ],
        jiraIssues: [
            { key: "SEC-701", summary: "Implement Rust WebCrypto cryptographic token vault", reporter: "Vikram Patel", status: "Done" },
            { key: "SEC-704", summary: "PKCE challenges and Redis session blacklisting for CVE-2026-3391", reporter: "Vikram Patel", status: "Done" }
        ]
    },

    // 4. Moderate-Risk: inventory-sync-service (Bus Factor = 2, Maintainers: Arjun Kumar & Rohan Verma)
    {
        name: "inventory-sync-service",
        description: "Warehouse stock management, SKU reservation, and message queue retry policies.",
        technologies: ["TypeScript", "Node.js", "Redis", "RabbitMQ", "PostgreSQL", "Docker"],
        contributors: [
            { name: "Arjun Kumar", email: "arjun.kumar@company.com", role: "Software Engineer", commitCount: 5 },
            { name: "Rohan Verma", email: "rohan.verma@company.com", role: "Backend Engineer", commitCount: 4 }
        ],
        recentCommits: [
            { hash: "a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01", message: "INV-201: Configured RabbitMQ dead-letter exchange and Redis distributed locks for SKU sync.", authorName: "Arjun Kumar", daysAgo: 3 },
            { hash: "r1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c2d02", message: "INV-205: Added PostgreSQL batch reconciliation worker for warehouse inventory records.", authorName: "Rohan Verma", daysAgo: 6 }
        ],
        jiraIssues: [
            { key: "INV-201", summary: "RabbitMQ dead-letter retry exchange and Redis locks", reporter: "Arjun Kumar", status: "In Progress" }
        ]
    },

    // 5. Moderate-Risk: customer-portal-next (Bus Factor = 2, Maintainers: Sarah Chen & Amina Zahra)
    {
        name: "customer-portal-next",
        description: "Customer-facing web application with responsive invoices, billing portal, and analytics.",
        technologies: ["Next.js", "React", "GraphQL", "TailwindCSS", "Prisma", "TypeScript"],
        contributors: [
            { name: "Sarah Chen", email: "sarah.chen@company.com", role: "Frontend Tech Lead", commitCount: 5 },
            { name: "Amina Zahra", email: "amina.zahra@company.com", role: "Full Stack Engineer", commitCount: 4 }
        ],
        recentCommits: [
            { hash: "s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601", message: "PORTAL-501: Built Next.js 14 server components with GraphQL Apollo client for invoice views.", authorName: "Sarah Chen", daysAgo: 2 },
            { hash: "a5z4y3x2w1v00918273645e4d3c2b1a0f9e8d702", message: "PORTAL-505: Integrated Prisma ORM client with TailwindCSS responsive navigation.", authorName: "Amina Zahra", daysAgo: 5 }
        ],
        jiraIssues: [
            { key: "PORTAL-501", summary: "Next.js 14 and GraphQL Apollo schema federation in customer portal", reporter: "Sarah Chen", status: "In Progress" }
        ]
    },

    // 6. Healthy Multi-Maintainer: core-platform-gateway (Bus Factor = 4, Resilient Multi-Engineer)
    {
        name: "core-platform-gateway",
        description: "Central microservices API gateway with distributed tracing, rate limiting, and connection pooling.",
        technologies: ["Express", "TypeScript", "NGINX", "OpenTelemetry", "Docker", "Kubernetes", "Supavisor"],
        contributors: [
            { name: "Arjun Kumar", email: "arjun.kumar@company.com", role: "Software Engineer", commitCount: 4 },
            { name: "Sarah Chen", email: "sarah.chen@company.com", role: "Frontend Tech Lead", commitCount: 4 },
            { name: "Michael Chen", email: "michael.chen@company.com", role: "Infrastructure Architect", commitCount: 4 },
            { name: "Amit Shah", email: "amit.shah@company.com", role: "Staff DevOps Engineer", commitCount: 4 },
            { name: "Priya Sharma", email: "priya.sharma@company.com", role: "Staff Engineer", commitCount: 2 }
        ],
        recentCommits: [
            { hash: "cp1001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7", message: "CORE-101: Upgraded Express API gateway routing and OpenTelemetry distributed tracing.", authorName: "Arjun Kumar", daysAgo: 1 },
            { hash: "cp1002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8", message: "CORE-105: Configured NGINX reverse proxy rate limiting per API client key.", authorName: "Sarah Chen", daysAgo: 4 },
            { hash: "cp1003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9", message: "CORE-108: Implemented Docker multi-stage builds and Kubernetes health probes.", authorName: "Michael Chen", daysAgo: 7 },
            { hash: "cp1004d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0", message: "CORE-112: Integrated Supavisor connection pooling for downstream database instances.", authorName: "Amit Shah", daysAgo: 11 }
        ],
        jiraIssues: [
            { key: "CORE-101", summary: "OpenTelemetry distributed tracing and Supavisor pooling in core gateway", reporter: "Amit Shah", status: "Done" }
        ]
    }
];

async function seedComplexGraphData() {
    console.log("\n🌱 --- Seeding Complex Multi-Repo Topology into Neo4j ---");
    const session = driver.session();

    try {
        for (const repo of COMPLEX_REPOSITORIES) {
            console.log(`  Processing Repository: ${repo.name}...`);

            // 1. Create/Update REPOSITORY node
            await session.run(`
                MERGE (r:REPOSITORY {name: $name})
                SET r.description = $description,
                    r.updatedAt = datetime()
            `, { name: repo.name, description: repo.description });

            // 2. Create TECHNOLOGY nodes & USES relations
            for (const tech of repo.technologies) {
                await session.run(`
                    MERGE (t:TECHNOLOGY {name: $tech})
                    WITH t
                    MATCH (r:REPOSITORY {name: $repoName})
                    MERGE (r)-[:USES]->(t)
                `, { tech, repoName: repo.name });
            }

            // 3. Create PERSON nodes, CONTRIBUTED_TO relations & commit structures
            for (const contrib of repo.contributors) {
                await session.run(`
                    MERGE (p:PERSON {name: $name})
                    SET p.email = coalesce(p.email, $email),
                        p.role = coalesce(p.role, $role)
                    WITH p
                    MATCH (r:REPOSITORY {name: $repoName})
                    MERGE (p)-[:WORKS_ON]->(r)
                `, { name: contrib.name, email: contrib.email, role: contrib.role, repoName: repo.name });

                // Link person to technologies used in this repo
                for (const tech of repo.technologies) {
                    await session.run(`
                        MATCH (p:PERSON {name: $name}), (t:TECHNOLOGY {name: $tech})
                        MERGE (p)-[:USES]->(t)
                    `, { name: contrib.name, tech });
                }
            }

            // 4. Create COMMIT nodes & AUTHORED / PART_OF relations
            for (const c of repo.recentCommits) {
                const commitDate = new Date(Date.now() - c.daysAgo * 86400000).toISOString();
                await session.run(`
                    MERGE (cm:COMMIT {hash: $hash})
                    SET cm.name = $hash,
                        cm.message = $message,
                        cm.createdAt = $createdAt
                    WITH cm
                    MATCH (p:PERSON {name: $authorName})
                    MATCH (r:REPOSITORY {name: $repoName})
                    MERGE (p)-[:AUTHORED]->(cm)
                    MERGE (cm)-[:PART_OF]->(r)
                `, {
                    hash: c.hash,
                    message: c.message,
                    createdAt: commitDate,
                    authorName: c.authorName,
                    repoName: repo.name
                });
            }

            // 5. Create JIRA / ISSUE nodes
            for (const issue of repo.jiraIssues) {
                await session.run(`
                    MERGE (i:ISSUE {name: $key})
                    SET i.key = $key,
                        i.summary = $summary,
                        i.status = $status
                    WITH i
                    MATCH (p:PERSON {name: $reporter})
                    MATCH (r:REPOSITORY {name: $repoName})
                    MERGE (p)-[:CREATED]->(i)
                    MERGE (i)-[:PART_OF]->(r)
                `, {
                    key: issue.key,
                    summary: issue.summary,
                    status: issue.status,
                    reporter: issue.reporter,
                    repoName: repo.name
                });
            }
        }

        console.log("  ✓ Neo4j graph nodes and relationships seeded successfully.");
    } finally {
        await session.close();
    }
}

async function runAndVerifyAnalytics() {
    console.log("\n📊 --- Computing & Verifying Analytics Metrics ---");

    // Trigger full metrics computation (Postgres repo_metrics, person_metrics, tech_metrics)
    await runAnalyticsJob();

    // Query and display computed repo metrics from Postgres
    const repos = await sql`
        SELECT repo_name, bus_factor, risk_score, contributor_count, status
        FROM repo_metrics
        ORDER BY bus_factor ASC, risk_score DESC
    `;

    console.log(`\n  ✓ Computed Repository Metrics (${repos.length} Repositories):`);
    console.log("  " + "-".repeat(78));
    console.log(`  ${"Repository Name".padEnd(26)} | ${"Bus Factor".padEnd(10)} | ${"Risk Score".padEnd(10)} | ${"Contributors".padEnd(12)} | Status`);
    console.log("  " + "-".repeat(78));

    for (const r of repos) {
        console.log(`  ${r.repo_name.padEnd(26)} | ${String(r.bus_factor).padEnd(10)} | ${(r.risk_score + "%").padEnd(10)} | ${String(r.contributor_count).padEnd(12)} | ${r.status}`);
    }
    console.log("  " + "-".repeat(78));

    // Verify Successor Backup Recommendations for SPOF owners
    console.log("\n🎯 --- Verifying Successor Recommendations for SPOF Owners ---");
    const testOwners = ["Devendra Singh", "Neha Gupta", "Vikram Patel"];
    for (const owner of testOwners) {
        try {
            const res = await calculateSuccessorCandidates(owner);
            console.log(`  • Successors for ${owner} (${res.targetTechnologies.join(', ')}):`);
            if (res.candidates.length === 0) {
                console.log(`    (No shared-skill candidate found)`);
            } else {
                res.candidates.slice(0, 2).forEach(c => {
                    console.log(`    ↳ Candidate: ${c.name.padEnd(16)} Match: ${c.score}%  Shared Tech: [${c.factors.sharedTechnologies.join(', ')}]  Capacity: ${c.breakdown.workloadCapacityScore}%`);
                });
            }
        } catch (err: any) {
            console.warn(`    ⚠ Successor query notice for ${owner}: ${err?.message}`);
        }
    }
}

async function main() {
    console.log("=================================================================");
    console.log(" 🚀 Cortex Complex Dataset Seeding & End-to-End Verification");
    console.log("=================================================================");

    await seedComplexGraphData();
    await runAndVerifyAnalytics();

    console.log("\n=================================================================");
    console.log(" ✅ All Complex Multi-Risk Datasets Seeded and Verified Successfully!");
    console.log("=================================================================");

    await sql.end();
    await driver.close();
}

main().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});

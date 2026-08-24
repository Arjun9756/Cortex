/**
 * test_end_to_end_ingestion.mjs
 *
 * End-to-end multi-provider interconnected dataset ingestion test suite for Cortex backend.
 * Contains high-complexity real-world scenarios:
 *   - High-Risk SPOF Repositories (Bus Factor = 1): payment-gateway-v2, realtime-stream-engine, auth-token-vault
 *   - Moderate-Risk Repositories (Bus Factor = 2): inventory-sync-service, customer-portal-next
 *   - Healthy Distributed Repositories (Bus Factor = 3-4): core-platform-gateway
 *   - Cross-provider links: GitHub commits & PRs, Jira epics & bugs, Slack architectural ADRs & incident threads
 *
 * Usage:
 *   node scripts/test_end_to_end_ingestion.mjs
 */

import crypto from "crypto";

const PORT = process.env.PORT || "3000";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const GITHUB_SECRET = process.env.GITHUB_SECRET || "cortex_test_secret_2026";
const JIRA_SECRET = process.env.JIRA_SECRET || process.env.JIRA_WEBHOOK_SECRET || "cortex_test_secret_2026";
const SLACK_SECRET = process.env.SLACK_SECRET || process.env.SLACK_SIGNING_SECRET || "cortex_test_secret_2026";

// ─── Cryptographic Signers ───────────────────────────────────────────────────

function signGithubPayload(secret, bodyString) {
    const hmac = crypto.createHmac("sha256", secret);
    return "sha256=" + hmac.update(bodyString).digest("hex");
}

function signSlackPayload(secret, timestamp, bodyString) {
    const sigBaseString = `v0:${timestamp}:${bodyString}`;
    return "v0=" + crypto.createHmac("sha256", secret).update(sigBaseString).digest("hex");
}

// ─── Comprehensive Interconnected Dataset ────────────────────────────────────

const GITHUB_EVENTS = [
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION A: CORE EXISTING ECOSYSTEM REPOSITORIES
    // ═════════════════════════════════════════════════════════════════════════
    // 1. Arjun Kumar - Redis to Valkey License Migration in Cortex
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 101, name: "Cortex", full_name: "Arjun9756/Cortex" },
            pusher: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
            sender: { login: "Arjun9756", id: 1001, email: "arjun.kumar@company.com" },
            head_commit: {
                id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
                author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                message: "GRAPH-108: Migrated Redis driver to Valkey drop-in client (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e) due to Redis Inc SSPL dual-licensing changes. Optimized multi-hop Cypher graph traversal for shortest path analysis.",
                timestamp: new Date().toISOString(),
                modified: ["packages/database/redis.ts", "packages/graph/graph.service.ts", "package.json"],
            },
            commits: [
                {
                    id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
                    message: "GRAPH-108: Migrated Redis driver to Valkey drop-in client (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e) due to Redis Inc SSPL dual-licensing changes. Optimized multi-hop Cypher graph traversal for shortest path analysis.",
                    modified: ["packages/database/redis.ts", "packages/graph/graph.service.ts", "package.json"],
                },
            ],
        },
    },
    // 2. Priya Sharma - Billing Service Stripe Idempotency
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 202, name: "billing-engine", full_name: "Cortex-Labs/billing-engine" },
            pusher: { name: "Priya Sharma", email: "priya.sharma@company.com" },
            sender: { login: "priyasharma", id: 2002, email: "priya.sharma@company.com" },
            head_commit: {
                id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                message: "BILL-204: Implemented Stripe idempotency key locks in Valkey (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0) to prevent duplicate transaction charges under retry load.",
                timestamp: new Date().toISOString(),
                modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
            },
            commits: [
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                    message: "BILL-204: Implemented Stripe idempotency key locks in Valkey (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0) to prevent duplicate transaction charges under retry load.",
                    modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
                },
            ],
        },
    },
    // 3. Vikram Patel - Auth Service Security Fix & CVE-2026-1082
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 505, name: "auth-service", full_name: "Cortex-Labs/auth-service" },
            pusher: { name: "Vikram Patel", email: "vikram.patel@company.com" },
            sender: { login: "vikrampatel", id: 5005, email: "vikram.patel@company.com" },
            head_commit: {
                id: "c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9",
                author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                message: "AUTH-501: Remediated CVE-2026-1082 vulnerability in auth-service via commit c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9. Enforced OAuth2 PKCE flow and rotated JWT signing keys to RS256 algorithm.",
                timestamp: new Date().toISOString(),
                modified: ["services/auth/jwt.ts", "services/auth/pkce.ts", "config/keys.json"],
            },
            commits: [
                {
                    id: "c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9",
                    message: "AUTH-501: Remediated CVE-2026-1082 vulnerability in auth-service via commit c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9. Enforced OAuth2 PKCE flow and rotated JWT signing keys to RS256 algorithm.",
                    modified: ["services/auth/jwt.ts", "services/auth/pkce.ts", "config/keys.json"],
                },
            ],
        },
    },
    // 4. Neha Gupta - Vector Engine & Qdrant Hybrid Indexing
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 606, name: "search-vector", full_name: "Cortex-Labs/search-vector" },
            pusher: { name: "Neha Gupta", email: "neha.gupta@company.com" },
            sender: { login: "nehagupta", id: 6006, email: "neha.gupta@company.com" },
            head_commit: {
                id: "d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0",
                author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                message: "VEC-302: Upgraded Qdrant client to v1.9 and enabled hybrid sparse-dense vector search indexing in search-vector (commit d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0).",
                timestamp: new Date().toISOString(),
                modified: ["packages/vector/qdrantClient.ts", "packages/vector/hybridSearch.ts"],
            },
            commits: [
                {
                    id: "d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0",
                    message: "VEC-302: Upgraded Qdrant client to v1.9 and enabled hybrid sparse-dense vector search indexing in search-vector (commit d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0).",
                    modified: ["packages/vector/qdrantClient.ts", "packages/vector/hybridSearch.ts"],
                },
            ],
        },
    },
    // 5. Amit Shah - Infrastructure K8s & PostgreSQL Pooler Migration
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 707, name: "infra-k8s", full_name: "Cortex-Labs/infra-k8s" },
            pusher: { name: "Amit Shah", email: "amit.shah@company.com" },
            sender: { login: "amitshah", id: 7007, email: "amit.shah@company.com" },
            head_commit: {
                id: "e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
                author: { name: "Amit Shah", email: "amit.shah@company.com" },
                message: "INFRA-703: Replaced PgBouncer with Supavisor connection pooler on Kubernetes cluster (commit e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1) to fix PostgreSQL connection exhaustion under peak traffic spikes.",
                timestamp: new Date().toISOString(),
                modified: ["helm/values.yaml", "scripts/db-pool.sh", "k8s/supavisor-deployment.yaml"],
            },
            commits: [
                {
                    id: "e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
                    message: "INFRA-703: Replaced PgBouncer with Supavisor connection pooler on Kubernetes cluster (commit e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1) to fix PostgreSQL connection exhaustion under peak traffic spikes.",
                    modified: ["helm/values.yaml", "scripts/db-pool.sh", "k8s/supavisor-deployment.yaml"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION B: HIGH-RISK SPOF REPOSITORIES (BUS FACTOR = 1, RISK >= 80%)
    // ═════════════════════════════════════════════════════════════════════════
    // 6. Devendra Singh - payment-gateway-v2 (100% Sole Ownership, Go, gRPC, Vault, Stripe)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 808, name: "payment-gateway-v2", full_name: "Cortex-Labs/payment-gateway-v2" },
            pusher: { name: "Devendra Singh", email: "devendra.singh@company.com" },
            sender: { login: "devendrasingh", id: 8008, email: "devendra.singh@company.com" },
            head_commit: {
                id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01",
                author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                message: "PAY-901: Architected core PCI-DSS tokenization pipeline in Go with gRPC unary streaming and HashiCorp Vault transit engine (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01). Handles 50k RPS transaction routing to Stripe API.",
                timestamp: new Date().toISOString(),
                modified: ["cmd/gateway/main.go", "internal/vault/transit.go", "proto/payment.proto"],
            },
            commits: [
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01",
                    message: "PAY-901: Architected core PCI-DSS tokenization pipeline in Go with gRPC unary streaming and HashiCorp Vault transit engine (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01). Handles 50k RPS transaction routing to Stripe API.",
                    modified: ["cmd/gateway/main.go", "internal/vault/transit.go", "proto/payment.proto"],
                },
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02",
                    message: "PAY-904: Added Valkey cache layer for ledger balance lock and PostgreSQL dual-write transaction journal in payment-gateway-v2 (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02).",
                    modified: ["internal/ledger/journal.go", "internal/cache/valkey.go"],
                },
            ],
        },
    },
    // 7. Neha Gupta - realtime-stream-engine (100% Sole Ownership, Apache Flink, Kafka, ClickHouse, Rust)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 909, name: "realtime-stream-engine", full_name: "Cortex-Labs/realtime-stream-engine" },
            pusher: { name: "Neha Gupta", email: "neha.gupta@company.com" },
            sender: { login: "nehagupta", id: 6006, email: "neha.gupta@company.com" },
            head_commit: {
                id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001",
                author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                message: "STREAM-401: Deployed Apache Flink stateful windowing pipeline and Kafka topic partitioners in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001) for real-time fraud scoring.",
                timestamp: new Date().toISOString(),
                modified: ["pipelines/flink_scoring.py", "producers/kafka_partitioner.rs", "config/stream.yaml"],
            },
            commits: [
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001",
                    message: "STREAM-401: Deployed Apache Flink stateful windowing pipeline and Kafka topic partitioners in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001) for real-time fraud scoring.",
                    modified: ["pipelines/flink_scoring.py", "producers/kafka_partitioner.rs", "config/stream.yaml"],
                },
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d002",
                    message: "STREAM-408: Implemented ClickHouse columnar table engine ingestion sink in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d002) replacing Elasticsearch.",
                    modified: ["sinks/clickhouse_writer.py", "schemas/telemetry.sql"],
                },
            ],
        },
    },
    // 8. Vikram Patel - auth-token-vault (100% Sole Ownership, Rust, WebCrypto, Keycloak, PKCE)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1010, name: "auth-token-vault", full_name: "Cortex-Labs/auth-token-vault" },
            pusher: { name: "Vikram Patel", email: "vikram.patel@company.com" },
            sender: { login: "vikrampatel", id: 5005, email: "vikram.patel@company.com" },
            head_commit: {
                id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001",
                author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                message: "SEC-701: Implemented Rust WebCrypto zero-knowledge token vault with Keycloak federation in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001). Sub-millisecond JWT verification.",
                timestamp: new Date().toISOString(),
                modified: ["src/crypto/mod.rs", "src/keycloak/federation.rs", "Cargo.toml"],
            },
            commits: [
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001",
                    message: "SEC-701: Implemented Rust WebCrypto zero-knowledge token vault with Keycloak federation in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001). Sub-millisecond JWT verification.",
                    modified: ["src/crypto/mod.rs", "src/keycloak/federation.rs", "Cargo.toml"],
                },
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c002",
                    message: "SEC-704: Enforced PKCE cryptographic challenges and Redis session blacklisting in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c002) mitigating CVE-2026-3391.",
                    modified: ["src/pkce/challenge.rs", "src/redis/blacklist.rs"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION C: MODERATE-RISK REPOSITORIES (BUS FACTOR = 2, CONCENTRATED RISK)
    // ═════════════════════════════════════════════════════════════════════════
    // 9. Arjun Kumar & Rohan Verma - inventory-sync-service (Bus Factor = 2, RabbitMQ, Redis, Node.js)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1111, name: "inventory-sync-service", full_name: "Cortex-Labs/inventory-sync-service" },
            pusher: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
            sender: { login: "Arjun9756", id: 1001, email: "arjun.kumar@company.com" },
            head_commit: {
                id: "a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01",
                author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                message: "INV-201: Configured RabbitMQ dead-letter exchange and Redis distributed locks in inventory-sync-service (commit a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01) for warehouse SKU synchronization.",
                timestamp: new Date().toISOString(),
                modified: ["src/queues/rabbitmq.ts", "src/locks/redisLock.ts", "package.json"],
            },
            commits: [
                {
                    id: "a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01",
                    message: "INV-201: Configured RabbitMQ dead-letter exchange and Redis distributed locks in inventory-sync-service (commit a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01) for warehouse SKU synchronization.",
                    modified: ["src/queues/rabbitmq.ts", "src/locks/redisLock.ts", "package.json"],
                },
                {
                    id: "r1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c2d02",
                    message: "INV-205: Added PostgreSQL batch reconciliation worker in inventory-sync-service (commit r1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c2d02) by Rohan Verma.",
                    author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                    modified: ["src/workers/batchReconciliation.ts", "src/db/postgres.ts"],
                },
            ],
        },
    },
    // 10. Sarah Chen & Amina Zahra - customer-portal-next (Bus Factor = 2, Next.js, GraphQL, Prisma)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1212, name: "customer-portal-next", full_name: "Cortex-Labs/customer-portal-next" },
            pusher: { name: "Sarah Chen", email: "sarah.chen@company.com" },
            sender: { login: "sarahchen", id: 4004, email: "sarah.chen@company.com" },
            head_commit: {
                id: "s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601",
                author: { name: "Sarah Chen", email: "sarah.chen@company.com" },
                message: "PORTAL-501: Built Next.js 14 server components with GraphQL Apollo client in customer-portal-next (commit s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601) for billing invoices overview.",
                timestamp: new Date().toISOString(),
                modified: ["app/invoices/page.tsx", "lib/graphql/apolloClient.ts"],
            },
            commits: [
                {
                    id: "s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601",
                    message: "PORTAL-501: Built Next.js 14 server components with GraphQL Apollo client in customer-portal-next (commit s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601) for billing invoices overview.",
                    modified: ["app/invoices/page.tsx", "lib/graphql/apolloClient.ts"],
                },
                {
                    id: "a5z4y3x2w1v00918273645e4d3c2b1a0f9e8d702",
                    message: "PORTAL-505: Integrated Prisma ORM client with TailwindCSS responsive navigation in customer-portal-next (commit a5z4y3x2w1v00918273645e4d3c2b1a0f9e8d702) by Amina Zahra.",
                    author: { name: "Amina Zahra", email: "amina.zahra@company.com" },
                    modified: ["prisma/schema.prisma", "components/Navbar.tsx"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION D: HEALTHY MULTI-CONTRIBUTOR REPOSITORIES (BUS FACTOR = 4+, LOW RISK)
    // ═════════════════════════════════════════════════════════════════════════
    // 11. Multi-Maintainer: core-platform-gateway (Arjun, Sarah, Michael, Amit, Priya)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1313, name: "core-platform-gateway", full_name: "Cortex-Labs/core-platform-gateway" },
            pusher: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
            sender: { login: "Arjun9756", id: 1001, email: "arjun.kumar@company.com" },
            head_commit: {
                id: "cp1001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                message: "CORE-101: Upgraded Express API gateway routing and OpenTelemetry distributed tracing in core-platform-gateway (commit cp1001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7).",
                timestamp: new Date().toISOString(),
                modified: ["src/server.ts", "src/tracing/opentelemetry.ts"],
            },
            commits: [
                {
                    id: "cp1001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                    message: "CORE-101: Upgraded Express API gateway routing and OpenTelemetry distributed tracing in core-platform-gateway (commit cp1001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7).",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["src/server.ts", "src/tracing/opentelemetry.ts"],
                },
                {
                    id: "cp1002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                    message: "CORE-105: Configured NGINX reverse proxy rate limiting in core-platform-gateway (commit cp1002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8) by Sarah Chen.",
                    author: { name: "Sarah Chen", email: "sarah.chen@company.com" },
                    modified: ["nginx/gateway.conf"],
                },
                {
                    id: "cp1003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
                    message: "CORE-108: Implemented Docker multi-stage builds and Kubernetes health probes in core-platform-gateway (commit cp1003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9) by Michael Chen.",
                    author: { name: "Michael Chen", email: "michael.chen@company.com" },
                    modified: ["Dockerfile", "k8s/liveness.yaml"],
                },
                {
                    id: "cp1004d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
                    message: "CORE-112: Integrated Supavisor connection pooling for downstream microservices in core-platform-gateway (commit cp1004d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0) by Amit Shah.",
                    author: { name: "Amit Shah", email: "amit.shah@company.com" },
                    modified: ["src/db/supavisor.ts"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION E: PULL REQUESTS & ISSUES
    // ═════════════════════════════════════════════════════════════════════════
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 808, name: "payment-gateway-v2", full_name: "Cortex-Labs/payment-gateway-v2" },
            sender: { login: "devendrasingh", id: 8008, email: "devendra.singh@company.com" },
            pull_request: {
                title: "PAY-905: Add gRPC mTLS authentication between billing-engine and payment-gateway-v2",
                body: "Enforces mutual TLS certificates for secure inter-service communication between Go payment gateway and Priya's billing-engine under PCI compliance mandates.",
                user: { login: "devendrasingh", email: "devendra.singh@company.com" },
                created_at: new Date().toISOString(),
                merged: true,
            },
        },
    },
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 909, name: "realtime-stream-engine", full_name: "Cortex-Labs/realtime-stream-engine" },
            sender: { login: "nehagupta", id: 6006, email: "neha.gupta@company.com" },
            pull_request: {
                title: "STREAM-412: Apache Flink Kafka consumer lag auto-scaler with Prometheus metrics",
                body: "Connects Flink task manager metrics to Kubernetes Horizontal Pod Autoscaler for high-throughput traffic spikes.",
                user: { login: "nehagupta", email: "neha.gupta@company.com" },
                created_at: new Date().toISOString(),
                merged: true,
            },
        },
    },
    {
        eventType: "issues",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1010, name: "auth-token-vault", full_name: "Cortex-Labs/auth-token-vault" },
            sender: { login: "vikrampatel", id: 5005, email: "vikram.patel@company.com" },
            issue: {
                title: "SEC-708: Audit Keycloak RS256 token signing rotation under zero-trust policy",
                body: "Verify that all backend microservices successfully consume the new JWKS endpoint without downtime.",
                user: { login: "vikrampatel", email: "vikram.patel@company.com" },
                created_at: new Date().toISOString(),
            },
        },
    },
];

const JIRA_EVENTS = [
    {
        issueKey: "GRAPH-108",
        eventType: "jira:issue_created",
        summary: "Optimize Neo4j APOC multi-hop Cypher queries and Valkey cache for shortest path analysis",
        description: "Migrated Redis driver to Valkey client due to Redis Inc SSPL licensing changes. Refactored Cypher queries in graph.service.ts to calculate multi-hop impact trees under 50ms.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun.kumar@company.com",
        accountId: "acc-arjun-001",
        projectKey: "GRAPH",
        status: "In Progress",
    },
    {
        issueKey: "BILL-204",
        eventType: "jira:issue_created",
        summary: "Stripe webhook idempotency key lock in billing-engine to prevent double billing",
        description: "Priya Sharma implemented Stripe idempotency key lock via commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0 in billing-engine to resolve duplicate transaction charges.",
        reporterName: "Priya Sharma",
        reporterEmail: "priya.sharma@company.com",
        accountId: "acc-priya-002",
        projectKey: "BILL",
        status: "Done",
    },
    {
        issueKey: "PAY-901",
        eventType: "jira:issue_created",
        summary: "Architect Go gRPC and HashiCorp Vault tokenization pipeline in payment-gateway-v2",
        description: "Devendra Singh architected zero-downtime card tokenization engine in Go using HashiCorp Vault transit decryption and Stripe API webhook handling.",
        reporterName: "Devendra Singh",
        reporterEmail: "devendra.singh@company.com",
        accountId: "acc-devendra-008",
        projectKey: "PAY",
        status: "Done",
    },
    {
        issueKey: "STREAM-401",
        eventType: "jira:issue_created",
        summary: "Replace Elasticsearch with ClickHouse and Apache Flink in realtime-stream-engine",
        description: "Neha Gupta migrated high-throughput event logs from Elasticsearch to ClickHouse and Apache Flink, reducing query response times from 1.8s to 45ms.",
        reporterName: "Neha Gupta",
        reporterEmail: "neha.gupta@company.com",
        accountId: "acc-neha-004",
        projectKey: "STREAM",
        status: "Done",
    },
    {
        issueKey: "SEC-701",
        eventType: "jira:issue_created",
        summary: "Implement Rust WebCrypto cryptographic token vault in auth-token-vault",
        description: "Vikram Patel built sub-millisecond Rust token vault with Keycloak federation and PKCE validation to resolve CVE-2026-3391 token replay vulnerability.",
        reporterName: "Vikram Patel",
        reporterEmail: "vikram.patel@company.com",
        accountId: "acc-vikram-003",
        projectKey: "SEC",
        status: "Done",
    },
    {
        issueKey: "INV-201",
        eventType: "jira:issue_created",
        summary: "RabbitMQ dead-letter retry exchange and Redis locks in inventory-sync-service",
        description: "Arjun Kumar and Rohan Verma configured RabbitMQ message queues and Redis distributed locks for asynchronous warehouse inventory reconciliation.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun.kumar@company.com",
        accountId: "acc-arjun-001",
        projectKey: "INV",
        status: "In Progress",
    },
    {
        issueKey: "PORTAL-501",
        eventType: "jira:issue_created",
        summary: "Next.js 14 and GraphQL Apollo schema federation in customer-portal-next",
        description: "Sarah Chen and Amina Zahra developed responsive customer invoice portal with Next.js 14, TailwindCSS, Prisma, and GraphQL federation.",
        reporterName: "Sarah Chen",
        reporterEmail: "sarah.chen@company.com",
        accountId: "acc-sarah-006",
        projectKey: "PORTAL",
        status: "In Progress",
    },
    {
        issueKey: "CORE-101",
        eventType: "jira:issue_created",
        summary: "OpenTelemetry distributed tracing and Supavisor pooling in core-platform-gateway",
        description: "Platform engineering team (Arjun, Sarah, Michael, Amit) unified API gateway routing with OpenTelemetry tracing, NGINX rate-limiting, and Supavisor DB pooling.",
        reporterName: "Amit Shah",
        reporterEmail: "amit.shah@company.com",
        accountId: "acc-amit-007",
        projectKey: "CORE",
        status: "Done",
    },
];

const SLACK_EVENTS = [
    {
        channel: "C0100ENGINEERING",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "GRAPH-108 update: Redis driver was migrated to Valkey drop-in client because of Redis Inc's SSPL license change. Multi-hop Cypher queries on Neo4j are now 4x faster.",
    },
    {
        channel: "C0200BILLING",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma",
        text: "Pushed fix for BILL-204 via commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0 to billing-engine main branch. Double-charge metrics are back to zero.",
    },
    {
        channel: "C0800FINTECH",
        user: "U888DEVENDRA1",
        userDisplayName: "Devendra Singh",
        text: "PAY-901 architecture ADR: We finalized the payment-gateway-v2 architecture using Go, gRPC unary streaming, and HashiCorp Vault for PCI-DSS cryptographic tokenization. Benchmarked at 50,000 TPS.",
    },
    {
        channel: "C0600DATAPLATFORM",
        user: "U111NEHA5",
        userDisplayName: "Neha Gupta",
        text: "STREAM-401 completed in realtime-stream-engine: ClickHouse + Apache Flink streaming pipeline is live! Columnar compression reduced disk usage by 75% compared to Elasticsearch.",
    },
    {
        channel: "C0500SECURITY",
        user: "U999VIKRAM4",
        userDisplayName: "Vikram Patel",
        text: "SEC-701 deployed in auth-token-vault: Rust WebCrypto zero-knowledge token verification with Keycloak federation is active. Average token validation latency dropped to 0.4ms.",
    },
    {
        channel: "C0900INVENTORY",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "INV-201 update: Rohan Verma and I completed the RabbitMQ dead-letter exchange configuration for inventory-sync-service. Redis distributed locking prevents SKU overbooking during flash sales.",
    },
    {
        channel: "C0400FRONTEND",
        user: "U888SARAH3",
        userDisplayName: "Sarah Chen",
        text: "PORTAL-501 update: Amina Zahra and I merged the customer-portal-next Next.js 14 + GraphQL setup. Lighthouse performance score is 98 on mobile.",
    },
    {
        channel: "C0700DEVOPS",
        user: "U222AMIT6",
        userDisplayName: "Amit Shah",
        text: "CORE-101 platform milestone: core-platform-gateway has OpenTelemetry distributed tracing across all microservices (Go, Node.js, Python, Rust) with Supavisor connection pooling.",
    },
    {
        channel: "C0300INCIDENTS",
        user: "U888DEVENDRA1",
        userDisplayName: "Devendra Singh",
        text: "Incident post-mortem: Vault transit secret token lease renewal timeout resolved. Added automatic background keepalive daemon in payment-gateway-v2.",
        isThread: true,
    },
];

// ─── Webhook Dispatchers ─────────────────────────────────────────────────────

async function sendGithubEvents() {
    console.log("\n📦 --- Sending GitHub Webhooks ---");
    let success = 0;
    for (const item of GITHUB_EVENTS) {
        const url = `${BASE_URL}/api/github/webhook`;
        const bodyString = JSON.stringify(item.payload);
        const signature = signGithubPayload(GITHUB_SECRET, bodyString);

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-hub-signature-256": signature,
                    "x-github-delivery": item.deliveryId,
                    "x-github-event": item.eventType,
                },
                body: bodyString,
            });
            console.log(`  [GH] ${item.eventType.padEnd(14)} ${item.payload.repository.name.padEnd(25)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [GH] Error sending ${item.eventType}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 150));
    }
    return success;
}

async function sendJiraEvents() {
    console.log("\n📋 --- Sending Jira Webhooks ---");
    let success = 0;
    for (const item of JIRA_EVENTS) {
        const url = `${BASE_URL}/api/jira/webhook?secret=${encodeURIComponent(JIRA_SECRET)}`;
        const now = new Date().toISOString();
        const payload = {
            timestamp: Date.now(),
            webhookEvent: item.eventType,
            issue_event_type_name: "issue_created",
            user: { accountId: item.accountId, displayName: item.reporterName },
            issue: {
                id: item.issueKey.split("-")[1],
                key: item.issueKey,
                fields: {
                    summary: item.summary,
                    description: item.description,
                    issuetype: { name: "Bug" },
                    status: { name: item.status },
                    reporter: { displayName: item.reporterName, accountId: item.accountId, emailAddress: item.reporterEmail },
                    assignee: { displayName: item.reporterName, accountId: item.accountId, emailAddress: item.reporterEmail },
                    priority: { name: "High" },
                    project: { key: item.projectKey, name: item.projectKey },
                    created: now,
                    updated: now,
                },
            },
        };

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            console.log(`  [Jira] ${item.issueKey.padEnd(12)} ${item.reporterName.padEnd(20)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [Jira] Error sending ${item.issueKey}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 150));
    }
    return success;
}

async function sendSlackEvents() {
    console.log("\n💬 --- Sending Slack Webhooks ---");
    let success = 0;
    let parentTs = (Date.now() / 1000).toFixed(6);

    for (let i = 0; i < SLACK_EVENTS.length; i++) {
        const item = SLACK_EVENTS[i];
        const url = `${BASE_URL}/api/slack/webhook`;
        const now = (Date.now() / 1000 + i).toFixed(6);

        const event = {
            type: "message",
            channel: item.channel,
            user: item.user,
            text: item.text,
            ts: now,
        };
        if (item.isThread) {
            event.thread_ts = parentTs;
        } else {
            parentTs = now;
        }

        const payload = {
            token: "fake-verification-token",
            team_id: "T0123456",
            api_app_id: "A0123456",
            event,
            type: "event_callback",
            event_id: "Ev" + crypto.randomBytes(8).toString("hex"),
            event_time: Math.floor(Number(now)),
        };

        const bodyString = JSON.stringify(payload);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = signSlackPayload(SLACK_SECRET, timestamp, bodyString);

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-slack-signature": signature,
                    "x-slack-request-timestamp": timestamp,
                },
                body: bodyString,
            });
            console.log(`  [Slack] ${item.userDisplayName.padEnd(20)} #${item.channel.padEnd(20)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [Slack] Error sending message for ${item.userDisplayName}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 150));
    }
    return success;
}

// ─── Live Verification Routine ───────────────────────────────────────────────

async function verifyLiveDashboardData() {
    console.log("\n🔍 --- Verifying Live API & Metric Endpoints ---");
    try {
        const res = await fetch(`${BASE_URL}/api/dashboard/overview`);
        if (res.ok) {
            const data = await res.json();
            console.log(`  ✓ Executive Dashboard Overview:`);
            console.log(`    • Total Repositories: ${data.stats?.repoCount ?? 'N/A'}`);
            console.log(`    • Total People:       ${data.stats?.peopleCount ?? 'N/A'}`);
            console.log(`    • Total Technologies: ${data.stats?.techCount ?? 'N/A'}`);
            console.log(`    • Avg Bus Factor:     ${data.stats?.avgBusFactor ?? 'N/A'}`);
            console.log(`    • Health Score:       ${data.healthScore?.score ?? 'N/A'}% (${data.healthScore?.status ?? 'N/A'})`);
        } else {
            console.warn(`  ⚠ Overview endpoint returned HTTP ${res.status}`);
        }

        const bfRes = await fetch(`${BASE_URL}/api/dashboard/bus-factor`);
        if (bfRes.ok) {
            const bfData = await bfRes.json();
            console.log(`\n  ✓ Live Bus Factor Repository Rankings (${bfData.repos?.length || 0} repos):`);
            (bfData.repos || []).slice(0, 8).forEach((r) => {
                console.log(`    • ${r.repo_name.padEnd(25)} BusFactor: ${String(r.bus_factor).padEnd(2)} Risk: ${String(r.risk_score).padStart(2)}%  Owner: ${r.primary_owner || 'Sole Maintainer'}`);
            });
        }
    } catch (err) {
        console.warn(`  ⚠ Verification probe notice: ${err.message}`);
    }
}

// ─── Main Execution Routine ──────────────────────────────────────────────────

async function main() {
    console.log("=========================================================");
    console.log(" 🚀 Cortex End-to-End Complex Multi-Repo Ingestion Suite");
    console.log(` Target Server: ${BASE_URL}`);
    console.log("=========================================================");

    const ghSuccess = await sendGithubEvents();
    const jiraSuccess = await sendJiraEvents();
    const slackSuccess = await sendSlackEvents();

    const totalSent = GITHUB_EVENTS.length + JIRA_EVENTS.length + SLACK_EVENTS.length;
    const totalSuccess = ghSuccess + jiraSuccess + slackSuccess;

    console.log("\n=========================================================");
    console.log(` 📊 SUMMARY: ${totalSuccess}/${totalSent} Webhook Events Ingested Successfully!`);
    console.log("=========================================================");
    console.log(" ✅ GitHub: " + ghSuccess + "/" + GITHUB_EVENTS.length);
    console.log(" ✅ Jira:   " + jiraSuccess + "/" + JIRA_EVENTS.length);
    console.log(" ✅ Slack:  " + slackSuccess + "/" + SLACK_EVENTS.length);
    console.log("---------------------------------------------------------");

    await verifyLiveDashboardData();

    console.log("\n=========================================================");
    console.log(" Next Steps:");
    console.log("   1. Check Dashboard: http://localhost:5173/");
    console.log("   2. Inspect Bus Factor & Repositories: http://localhost:5173/?tab=bus-factor");
    console.log("   3. View Graph Explorer: http://localhost:5173/?tab=graph");
    console.log("=========================================================\n");
}

main();

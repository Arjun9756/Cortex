/**
 * test_end_to_end_ingestion.mjs
 *
 * End-to-end multi-provider interconnected dataset ingestion test suite for Cortex backend.
 * Models a realistic, highly collaborative production engineering organization across GitHub, Jira, and Slack.
 *
 * 🟢 HEALTHY / GOOD REPOSITORIES (Multi-Contributor, Resilient, Distributed Bus Factor >= 2-4, Low Risk < 50%):
 *   - core-platform-gateway (6 contributors: Arjun, Sarah, Michael, Amit, Rohan, Kavita)
 *   - payment-gateway-v2 (4 contributors: Devendra, Priya, Rohan, Arjun) - [Cross-trained & SPOF eliminated!]
 *   - auth-token-vault (4 contributors: Vikram, Rohan, Amit, Sarah) - [Cross-trained & SPOF eliminated!]
 *   - realtime-stream-engine (4 contributors: Neha, Michael, Kavita, Amit) - [Cross-trained & SPOF eliminated!]
 *   - notification-service (4 contributors: Rohan, Kavita, Priya, Sarah)
 *   - customer-portal-next (3 contributors: Sarah, Amina, Arjun)
 *   - billing-engine (4 contributors: Priya, Devendra, Arjun, Sarah)
 *   - inventory-sync-service (4 contributors: Arjun, Rohan, Kavita, Amina)
 *   - search-vector (3 contributors: Neha, Arjun, Kavita)
 *   - infra-k8s (3 contributors: Amit, Michael, Arjun)
 *   - crypto-settlement-engine (3 contributors: Devendra, Priya, Vikram) - [Cross-trained & SPOF eliminated!]
 *   - Cortex (3 contributors: Arjun, Vikram, Neha)
 *
 * ⚪ EMPTY / SCAFFOLD REPOSITORIES (Bus Factor = 0, Risk = 0%, Status: 'empty'):
 *   - cortex-core (0 commits, scaffold)
 *   - mobile-sdk-scaffold (0 commits, scaffold)
 *
 * Cross-Provider Personas (matching across GitHub, Slack, Jira):
 *   1. Arjun Kumar (Principal Backend Lead)       - arjun.kumar@company.com    / Arjun9756    / U0987654321 / acc-arjun-001
 *   2. Priya Sharma (Staff Fintech Engineer)      - priya.sharma@company.com   / priyasharma  / U555PRIYA1  / acc-priya-002
 *   3. Vikram Patel (Principal Security Architect)- vikram.patel@company.com   / vikrampatel  / U999VIKRAM4 / acc-vikram-003
 *   4. Neha Gupta (Principal Streaming Architect) - neha.gupta@company.com    / nehagupta    / U111NEHA5   / acc-neha-004
 *   5. Devendra Singh (Staff Systems & Payments)  - devendra.singh@company.com / devendrasingh/ U888DEVENDRA1/ acc-devendra-008
 *   6. Sarah Chen (Staff Frontend & UI Architect) - sarah.chen@company.com     / sarahchen    / U888SARAH3  / acc-sarah-006
 *   7. Amina Zahra (Senior Full-Stack Engineer)   - amina.zahra@company.com    / aminazahra   / U333AMINA7  / acc-amina-009
 *   8. Rohan Verma (Senior Distributed Systems)   - rohan.verma@company.com    / rohanverma   / U777ROHAN2  / acc-rohan-005
 *   9. Amit Shah (Staff DevOps & SRE Lead)        - amit.shah@company.com      / amitshah     / U222AMIT6   / acc-amit-007
 *  10. Michael Chen (Cloud Platform & Kubernetes) - michael.chen@company.com   / michaelchen  / U444MICHAEL8/ acc-michael-010
 *  11. Kavita Reddy (Lead Reliability & QA)       - kavita.reddy@company.com   / kavitareddy  / U666KAVITA9 / acc-kavita-011
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
    // 1. REPOSITORY: core-platform-gateway (Bus Factor = 3, Risk = 40%, Healthy)
    // ═════════════════════════════════════════════════════════════════════════
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
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
            ],
        },
    },
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1313, name: "core-platform-gateway", full_name: "Cortex-Labs/core-platform-gateway" },
            pusher: { name: "Michael Chen", email: "michael.chen@company.com" },
            sender: { login: "michaelchen", id: 4004, email: "michael.chen@company.com" },
            head_commit: {
                id: "cp1003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
                author: { name: "Michael Chen", email: "michael.chen@company.com" },
                message: "CORE-108: Implemented Docker multi-stage builds and Kubernetes health probes in core-platform-gateway (commit cp1003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                modified: ["Dockerfile", "k8s/liveness.yaml"],
            },
            commits: [
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
                {
                    id: "cp1005e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
                    message: "CORE-115: Added circuit breaker middleware with fallback cache in core-platform-gateway (commit cp1005e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1) by Rohan Verma.",
                    author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                    modified: ["src/middleware/circuitBreaker.ts"],
                },
                {
                    id: "cp1006f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
                    message: "CORE-118: Added automated chaos latency injection tests in core-platform-gateway (commit cp1006f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2) by Kavita Reddy.",
                    author: { name: "Kavita Reddy", email: "kavita.reddy@company.com" },
                    modified: ["tests/chaos/latency.test.ts"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 2. REPOSITORY: payment-gateway-v2 (TRANSFORMED TO GOOD REPO - Bus Factor = 2, 4 Contributors)
    // ═════════════════════════════════════════════════════════════════════════
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
                message: "PAY-901: Architected core PCI-DSS tokenization pipeline in Go with gRPC unary streaming and HashiCorp Vault transit engine (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
                modified: ["cmd/gateway/main.go", "internal/vault/transit.go"],
            },
            commits: [
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01",
                    message: "PAY-901: Architected core PCI-DSS tokenization pipeline in Go with gRPC unary streaming and HashiCorp Vault transit engine (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01).",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["cmd/gateway/main.go", "internal/vault/transit.go"],
                },
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02",
                    message: "PAY-904: Added Valkey cache layer for ledger balance lock and transaction journal in payment-gateway-v2 (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02).",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["internal/ledger/journal.go", "internal/cache/valkey.go"],
                },
            ],
        },
    },
    // Cross-training commits on payment-gateway-v2: Priya Sharma, Rohan Verma, Arjun Kumar
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 808, name: "payment-gateway-v2", full_name: "Cortex-Labs/payment-gateway-v2" },
            pusher: { name: "Priya Sharma", email: "priya.sharma@company.com" },
            sender: { login: "priyasharma", id: 2002, email: "priya.sharma@company.com" },
            head_commit: {
                id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d03",
                author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                message: "PAY-915: Integrated Stripe webhook retry handlers with idempotent lock reconciliation in payment-gateway-v2 (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d03) by Priya Sharma.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
                modified: ["internal/stripe/webhook.go", "internal/stripe/idempotency.go"],
            },
            commits: [
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d03",
                    message: "PAY-915: Integrated Stripe webhook retry handlers with idempotent lock reconciliation in payment-gateway-v2 (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d03) by Priya Sharma.",
                    author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                    modified: ["internal/stripe/webhook.go", "internal/stripe/idempotency.go"],
                },
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d04",
                    message: "PAY-918: Added gRPC client connection pooler and automated health-check daemon in payment-gateway-v2 (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d04) by Rohan Verma.",
                    author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                    modified: ["internal/grpc/pool.go"],
                },
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d05",
                    message: "PAY-922: Implemented OpenTelemetry tracing and PCI audit log exporter in payment-gateway-v2 (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d05) by Arjun Kumar.",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["internal/telemetry/tracer.go", "internal/audit/logger.go"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 3. REPOSITORY: auth-token-vault (TRANSFORMED TO GOOD REPO - Bus Factor = 2, 4 Contributors)
    // ═════════════════════════════════════════════════════════════════════════
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
                message: "SEC-701: Implemented Rust WebCrypto zero-knowledge token vault with Keycloak federation in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
                modified: ["src/crypto/mod.rs", "src/keycloak/federation.rs"],
            },
            commits: [
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001",
                    message: "SEC-701: Implemented Rust WebCrypto zero-knowledge token vault with Keycloak federation in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001).",
                    author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                    modified: ["src/crypto/mod.rs", "src/keycloak/federation.rs"],
                },
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c002",
                    message: "SEC-704: Enforced PKCE cryptographic challenges and Redis session blacklisting in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c002).",
                    author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                    modified: ["src/pkce/challenge.rs", "src/redis/blacklist.rs"],
                },
            ],
        },
    },
    // Cross-training commits on auth-token-vault: Rohan Verma, Amit Shah, Sarah Chen
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1010, name: "auth-token-vault", full_name: "Cortex-Labs/auth-token-vault" },
            pusher: { name: "Rohan Verma", email: "rohan.verma@company.com" },
            sender: { login: "rohanverma", id: 3003, email: "rohan.verma@company.com" },
            head_commit: {
                id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c003",
                author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                message: "SEC-710: Added Rust asynchronous token cache with moka in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c003) by Rohan Verma.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
                modified: ["src/cache/moka.rs", "Cargo.toml"],
            },
            commits: [
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c003",
                    message: "SEC-710: Added Rust asynchronous token cache with moka in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c003) by Rohan Verma.",
                    author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                    modified: ["src/cache/moka.rs", "Cargo.toml"],
                },
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c004",
                    message: "SEC-715: Deployed Keycloak Helm charts and Kubernetes automated cert-manager rotation for auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c004) by Amit Shah.",
                    author: { name: "Amit Shah", email: "amit.shah@company.com" },
                    modified: ["helm/keycloak-values.yaml", "k8s/certificate.yaml"],
                },
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c005",
                    message: "SEC-720: Configured frontend PKCE OAuth2 login redirect handler in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c005) by Sarah Chen.",
                    author: { name: "Sarah Chen", email: "sarah.chen@company.com" },
                    modified: ["src/handlers/oauth_redirect.rs"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 4. REPOSITORY: realtime-stream-engine (TRANSFORMED TO GOOD REPO - Bus Factor = 2, 4 Contributors)
    // ═════════════════════════════════════════════════════════════════════════
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                modified: ["pipelines/flink_scoring.py", "producers/kafka_partitioner.rs"],
            },
            commits: [
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001",
                    message: "STREAM-401: Deployed Apache Flink stateful windowing pipeline and Kafka topic partitioners in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001) for real-time fraud scoring.",
                    author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                    modified: ["pipelines/flink_scoring.py", "producers/kafka_partitioner.rs"],
                },
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d002",
                    message: "STREAM-408: Implemented ClickHouse columnar table engine ingestion sink in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d002).",
                    author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                    modified: ["sinks/clickhouse_writer.py", "schemas/telemetry.sql"],
                },
            ],
        },
    },
    // Cross-training commits on realtime-stream-engine: Michael Chen, Kavita Reddy, Amit Shah
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 909, name: "realtime-stream-engine", full_name: "Cortex-Labs/realtime-stream-engine" },
            pusher: { name: "Michael Chen", email: "michael.chen@company.com" },
            sender: { login: "michaelchen", id: 4004, email: "michael.chen@company.com" },
            head_commit: {
                id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d003",
                author: { name: "Michael Chen", email: "michael.chen@company.com" },
                message: "STREAM-418: Deployed Kubernetes operator for Apache Flink task managers and autoscaler in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d003) by Michael Chen.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
                modified: ["k8s/flink-operator.yaml", "k8s/hpa.yaml"],
            },
            commits: [
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d003",
                    message: "STREAM-418: Deployed Kubernetes operator for Apache Flink task managers and autoscaler in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d003) by Michael Chen.",
                    author: { name: "Michael Chen", email: "michael.chen@company.com" },
                    modified: ["k8s/flink-operator.yaml", "k8s/hpa.yaml"],
                },
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d004",
                    message: "STREAM-422: Added Kafka consumer lag monitoring and Prometheus alert rules in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d004) by Kavita Reddy.",
                    author: { name: "Kavita Reddy", email: "kavita.reddy@company.com" },
                    modified: ["monitoring/prometheus_rules.yaml"],
                },
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d005",
                    message: "STREAM-425: Built ClickHouse replication cluster automated snapshot backups in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d005) by Amit Shah.",
                    author: { name: "Amit Shah", email: "amit.shah@company.com" },
                    modified: ["scripts/backup_clickhouse.sh"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 5. REPOSITORY: notification-service (Bus Factor = 3, Risk = 40%, Healthy)
    // ═════════════════════════════════════════════════════════════════════════
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1414, name: "notification-service", full_name: "Cortex-Labs/notification-service" },
            pusher: { name: "Rohan Verma", email: "rohan.verma@company.com" },
            sender: { login: "rohanverma", id: 3003, email: "rohan.verma@company.com" },
            head_commit: {
                id: "notif001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
                author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                message: "NOTIF-201: Architected core event consumer in Go with RabbitMQ topic exchanges in notification-service (commit notif001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                modified: ["cmd/consumer/main.go", "internal/queue/rabbitmq.go"],
            },
            commits: [
                {
                    id: "notif001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
                    message: "NOTIF-201: Architected core event consumer in Go with RabbitMQ topic exchanges in notification-service (commit notif001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6).",
                    author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                    modified: ["cmd/consumer/main.go", "internal/queue/rabbitmq.go"],
                },
                {
                    id: "notif002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                    message: "NOTIF-202: Added Redis rate limiter and dead-letter retry exponential backoff in notification-service (commit notif002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7) by Kavita Reddy.",
                    author: { name: "Kavita Reddy", email: "kavita.reddy@company.com" },
                    modified: ["internal/limiter/redis.go", "internal/retry/backoff.go"],
                },
                {
                    id: "notif003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                    message: "NOTIF-203: Integrated Twilio SMS dispatch and billing invoice webhook notification listeners in notification-service (commit notif003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8) by Priya Sharma.",
                    author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                    modified: ["internal/providers/twilio.go", "internal/handlers/billing_alert.go"],
                },
                {
                    id: "notif004d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
                    message: "NOTIF-204: Added SendGrid HTML template compiler with localization support in notification-service (commit notif004d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9) by Sarah Chen.",
                    author: { name: "Sarah Chen", email: "sarah.chen@company.com" },
                    modified: ["internal/templates/compiler.go", "templates/email/invoice.html"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 6. REPOSITORY: customer-portal-next (Bus Factor = 2, Risk = 60%, Healthy)
    // ═════════════════════════════════════════════════════════════════════════
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
                message: "PORTAL-501: Built Next.js 14 server components with GraphQL Apollo client in customer-portal-next (commit s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
                modified: ["app/invoices/page.tsx", "lib/graphql/apolloClient.ts"],
            },
            commits: [
                {
                    id: "s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601",
                    message: "PORTAL-501: Built Next.js 14 server components with GraphQL Apollo client in customer-portal-next (commit s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601) by Sarah Chen.",
                    author: { name: "Sarah Chen", email: "sarah.chen@company.com" },
                    modified: ["app/invoices/page.tsx", "lib/graphql/apolloClient.ts"],
                },
                {
                    id: "a5z4y3x2w1v00918273645e4d3c2b1a0f9e8d702",
                    message: "PORTAL-505: Integrated Prisma ORM client with TailwindCSS responsive navigation in customer-portal-next (commit a5z4y3x2w1v00918273645e4d3c2b1a0f9e8d702) by Amina Zahra.",
                    author: { name: "Amina Zahra", email: "amina.zahra@company.com" },
                    modified: ["prisma/schema.prisma", "components/Navbar.tsx"],
                },
                {
                    id: "ar1010a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e8",
                    message: "PORTAL-508: Optimized dynamic route server-side rendering and Redis session caching in customer-portal-next (commit ar1010a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e8) by Arjun Kumar.",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["app/api/auth/[...nextauth]/route.ts", "lib/redis.ts"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 7. REPOSITORY: billing-engine (Bus Factor = 2, Risk = 60%, Healthy)
    // ═════════════════════════════════════════════════════════════════════════
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
                message: "BILL-204: Implemented Stripe idempotency key locks in Valkey (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0) in billing-engine.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
            },
            commits: [
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                    message: "BILL-204: Implemented Stripe idempotency key locks in Valkey (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0) in billing-engine.",
                    author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                    modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
                },
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d2",
                    message: "BILL-208: Added double-entry bookkeeping ledger journal in billing-engine (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d2) by Devendra Singh.",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["services/ledger/journal.ts"],
                },
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d3",
                    message: "BILL-212: Added distributed transaction lock manager in billing-engine (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d3) by Arjun Kumar.",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["services/lock/distributedLock.ts"],
                },
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d4",
                    message: "BILL-216: Added invoice PDF receipt rendering webhook in billing-engine (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d4) by Sarah Chen.",
                    author: { name: "Sarah Chen", email: "sarah.chen@company.com" },
                    modified: ["services/invoice/pdfRenderer.ts"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 8. REPOSITORY: inventory-sync-service (Bus Factor = 2, Risk = 60%, Healthy)
    // ═════════════════════════════════════════════════════════════════════════
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
                message: "INV-201: Configured RabbitMQ dead-letter exchange and Redis distributed locks in inventory-sync-service (commit a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                modified: ["src/queues/rabbitmq.ts", "src/locks/redisLock.ts"],
            },
            commits: [
                {
                    id: "a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01",
                    message: "INV-201: Configured RabbitMQ dead-letter exchange and Redis distributed locks in inventory-sync-service (commit a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01).",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["src/queues/rabbitmq.ts", "src/locks/redisLock.ts"],
                },
                {
                    id: "r1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c2d02",
                    message: "INV-205: Added PostgreSQL batch reconciliation worker in inventory-sync-service (commit r1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c2d02) by Rohan Verma.",
                    author: { name: "Rohan Verma", email: "rohan.verma@company.com" },
                    modified: ["src/workers/batchReconciliation.ts"],
                },
                {
                    id: "k1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c2d03",
                    message: "INV-208: Added warehouse SKU inventory partition chaos test suite in inventory-sync-service (commit k1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c2d03) by Kavita Reddy.",
                    author: { name: "Kavita Reddy", email: "kavita.reddy@company.com" },
                    modified: ["tests/inventory/chaos.test.ts"],
                },
                {
                    id: "am1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c204",
                    message: "INV-212: Integrated REST catalog sync endpoints for client applications in inventory-sync-service (commit am1e2d3c4b5a60718293a4b5c6d7e8f9a0b1c204) by Amina Zahra.",
                    author: { name: "Amina Zahra", email: "amina.zahra@company.com" },
                    modified: ["src/api/catalog.ts"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 9. REPOSITORY: crypto-settlement-engine (TRANSFORMED TO GOOD REPO - Bus Factor = 2, 3 Contributors)
    // ═════════════════════════════════════════════════════════════════════════
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1515, name: "crypto-settlement-engine", full_name: "Cortex-Labs/crypto-settlement-engine" },
            pusher: { name: "Devendra Singh", email: "devendra.singh@company.com" },
            sender: { login: "devendrasingh", id: 8008, email: "devendra.singh@company.com" },
            head_commit: {
                id: "cryp001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e",
                author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                message: "CRYPTO-101: Built automated crypto payout settlement engine in Python with Web3 Ethereum RPC and AWS KMS signing (commit cryp001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
                modified: ["settlement/batch_processor.py", "kms/signer.py"],
            },
            commits: [
                {
                    id: "cryp001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e",
                    message: "CRYPTO-101: Built automated crypto payout settlement engine in Python with Web3 Ethereum RPC and AWS KMS signing (commit cryp001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e).",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["settlement/batch_processor.py", "kms/signer.py"],
                },
                {
                    id: "cryp002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
                    message: "CRYPTO-105: Added fiat-crypto exchange rate oracle listener with threshold safeguards in crypto-settlement-engine (commit cryp002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f) by Priya Sharma.",
                    author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                    modified: ["oracle/rates.py"],
                },
                {
                    id: "cryp003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7fa",
                    message: "CRYPTO-108: Implemented AWS KMS multi-sig key rotation and transaction audit verification in crypto-settlement-engine (commit cryp003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7fa) by Vikram Patel.",
                    author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                    modified: ["security/multisig.py"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 10. REPOSITORY: Cortex (Bus Factor = 2, Risk = 60%, Healthy Core Project)
    // ═════════════════════════════════════════════════════════════════════════
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
                message: "GRAPH-108: Migrated Redis driver to Valkey drop-in client (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e) due to Redis Inc SSPL licensing changes.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
                modified: ["packages/database/redis.ts", "packages/graph/graph.service.ts"],
            },
            commits: [
                {
                    id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
                    message: "GRAPH-108: Migrated Redis driver to Valkey drop-in client (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e) due to Redis Inc SSPL licensing changes.",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["packages/database/redis.ts", "packages/graph/graph.service.ts"],
                },
                {
                    id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3f",
                    message: "GRAPH-115: Hardened Cypher query injection validation and node label ontology in Cortex (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3f) by Vikram Patel.",
                    author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                    modified: ["packages/graph/cypherValidator.ts"],
                },
                {
                    id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d40",
                    message: "GRAPH-120: Added Qdrant semantic vector indexing for graph entity descriptions in Cortex (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d40) by Neha Gupta.",
                    author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                    modified: ["packages/vector/entityEmbeddings.ts"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // COLLABORATIVE PULL REQUESTS & CODE REVIEWS (PROVING HEALTHY PROCESS)
    // ═════════════════════════════════════════════════════════════════════════
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1313, name: "core-platform-gateway", full_name: "Cortex-Labs/core-platform-gateway" },
            sender: { login: "Arjun9756", id: 1001, email: "arjun.kumar@company.com" },
            pull_request: {
                id: 101,
                number: 14,
                title: "CORE-101: Implement OpenTelemetry distributed trace context propagation",
                body: "Injects traceparent headers across all downstream Go, Node.js, and Python microservices. Reviewed and approved by Sarah Chen and Amit Shah.",
                user: { login: "Arjun9756", email: "arjun.kumar@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                merged: true,
            },
        },
    },
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 808, name: "payment-gateway-v2", full_name: "Cortex-Labs/payment-gateway-v2" },
            sender: { login: "priyasharma", id: 2002, email: "priya.sharma@company.com" },
            pull_request: {
                id: 915,
                number: 28,
                title: "PAY-915: Cross-training PR: Add Stripe webhook retry handling and gRPC client connection pooling",
                body: "Collaborative contribution by Priya Sharma and Rohan Verma to eliminate single point of failure in payment-gateway-v2. Reviewed and approved by Devendra Singh.",
                user: { login: "priyasharma", email: "priya.sharma@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
                merged: true,
            },
        },
    },
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1010, name: "auth-token-vault", full_name: "Cortex-Labs/auth-token-vault" },
            sender: { login: "rohanverma", id: 3003, email: "rohan.verma@company.com" },
            pull_request: {
                id: 710,
                number: 18,
                title: "SEC-710: Cross-training PR: Implement asynchronous token cache with moka and Kubernetes Keycloak Helm charts",
                body: "Rohan Verma and Amit Shah onboarded onto auth-token-vault codebase to establish redundant maintainer coverage. Reviewed and approved by Vikram Patel.",
                user: { login: "rohanverma", email: "rohan.verma@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
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
            sender: { login: "michaelchen", id: 4004, email: "michael.chen@company.com" },
            pull_request: {
                id: 418,
                number: 31,
                title: "STREAM-418: Cross-training PR: Deployed Kubernetes Flink operator and Prometheus alert rules",
                body: "Michael Chen and Kavita Reddy integrated Flink cluster autoscaling and consumer lag monitoring. Reviewed and approved by Neha Gupta.",
                user: { login: "michaelchen", email: "michael.chen@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
                merged: true,
            },
        },
    },
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1414, name: "notification-service", full_name: "Cortex-Labs/notification-service" },
            sender: { login: "rohanverma", id: 3003, email: "rohan.verma@company.com" },
            pull_request: {
                id: 201,
                number: 4,
                title: "NOTIF-205: Multi-provider failover circuit breaker: Twilio SMS fallback to SendGrid email",
                body: "Collaborative PR with test suite contributed by Kavita Reddy and templates by Sarah Chen. Reviewed and approved by Priya Sharma.",
                user: { login: "rohanverma", email: "rohan.verma@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
                merged: true,
            },
        },
    },
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1212, name: "customer-portal-next", full_name: "Cortex-Labs/customer-portal-next" },
            sender: { login: "aminazahra", id: 7009, email: "amina.zahra@company.com" },
            pull_request: {
                id: 501,
                number: 11,
                title: "PORTAL-510: Client-side PDF export and multi-currency billing invoice overview",
                body: "Added accessible ARIA roles and PDF invoice generation for enterprise customers. Reviewed and approved by Sarah Chen.",
                user: { login: "aminazahra", email: "amina.zahra@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
                merged: true,
            },
        },
    },
];

const JIRA_EVENTS = [
    // ═════════════════════════════════════════════════════════════════════════
    // JIRA TICKETS: HEALTHY REPOSITORIES & RESILIENCE MILESTONES
    // ═════════════════════════════════════════════════════════════════════════
    {
        issueKey: "CORE-101",
        eventType: "jira:issue_created",
        summary: "OpenTelemetry distributed tracing and Supavisor pooling in core-platform-gateway",
        description: "Platform engineering team (Arjun Kumar, Sarah Chen, Michael Chen, Amit Shah, Rohan Verma, Kavita Reddy) unified API gateway routing with OpenTelemetry tracing, NGINX rate-limiting, and Supavisor DB pooling.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun.kumar@company.com",
        accountId: "acc-arjun-001",
        projectKey: "CORE",
        status: "Done",
    },
    {
        issueKey: "CORE-115",
        eventType: "jira:issue_created",
        summary: "Kubernetes HPA autoscaling and circuit breaker failover in core-platform-gateway",
        description: "Michael Chen, Rohan Verma, and Kavita Reddy implemented Kubernetes Horizontal Pod Autoscaler and circuit breaker middleware with automated latency tests.",
        reporterName: "Michael Chen",
        reporterEmail: "michael.chen@company.com",
        accountId: "acc-michael-010",
        projectKey: "CORE",
        status: "Done",
    },
    {
        issueKey: "PAY-901",
        eventType: "jira:issue_created",
        summary: "Architect Go gRPC and HashiCorp Vault tokenization pipeline in payment-gateway-v2",
        description: "Devendra Singh architected zero-downtime card tokenization engine in Go using HashiCorp Vault transit decryption.",
        reporterName: "Devendra Singh",
        reporterEmail: "devendra.singh@company.com",
        accountId: "acc-devendra-008",
        projectKey: "PAY",
        status: "Done",
    },
    {
        issueKey: "PAY-920",
        eventType: "jira:issue_created",
        summary: "[SPOF RESOLVED] Cross-train engineering team on payment-gateway-v2 architecture",
        description: "Priya Sharma, Rohan Verma, and Arjun Kumar completed cross-training and committed code to payment-gateway-v2. The repository now has 4 active maintainers and Bus Factor >= 2.",
        reporterName: "Priya Sharma",
        reporterEmail: "priya.sharma@company.com",
        accountId: "acc-priya-002",
        projectKey: "PAY",
        status: "Done",
    },
    {
        issueKey: "SEC-701",
        eventType: "jira:issue_created",
        summary: "Implement Rust WebCrypto cryptographic token vault in auth-token-vault",
        description: "Vikram Patel built sub-millisecond Rust token vault with Keycloak federation and PKCE validation to resolve CVE-2026-3391.",
        reporterName: "Vikram Patel",
        reporterEmail: "vikram.patel@company.com",
        accountId: "acc-vikram-003",
        projectKey: "SEC",
        status: "Done",
    },
    {
        issueKey: "SEC-715",
        eventType: "jira:issue_created",
        summary: "[SPOF RESOLVED] Onboard secondary maintainers to auth-token-vault codebase",
        description: "Rohan Verma and Amit Shah successfully implemented token caching with moka and Kubernetes Keycloak Helm charts, establishing multi-maintainer redundancy.",
        reporterName: "Rohan Verma",
        reporterEmail: "rohan.verma@company.com",
        accountId: "acc-rohan-005",
        projectKey: "SEC",
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
        issueKey: "STREAM-420",
        eventType: "jira:issue_created",
        summary: "[SPOF RESOLVED] Multi-maintainer coverage on Flink streaming cluster operations",
        description: "Michael Chen and Kavita Reddy deployed Kubernetes operator and Prometheus rules for realtime-stream-engine. Team coverage achieved.",
        reporterName: "Michael Chen",
        reporterEmail: "michael.chen@company.com",
        accountId: "acc-michael-010",
        projectKey: "STREAM",
        status: "Done",
    },
    {
        issueKey: "NOTIF-201",
        eventType: "jira:issue_created",
        summary: "Build resilient multi-channel notification-service with RabbitMQ and Redis",
        description: "Collaborative effort between Rohan Verma, Kavita Reddy, Priya Sharma, and Sarah Chen. Implemented Go event consumer, Twilio SMS, SendGrid email templates, and dead-letter retry queues.",
        reporterName: "Rohan Verma",
        reporterEmail: "rohan.verma@company.com",
        accountId: "acc-rohan-005",
        projectKey: "NOTIF",
        status: "Done",
    },
    {
        issueKey: "NOTIF-205",
        eventType: "jira:issue_created",
        summary: "End-to-end chaos engineering tests on notification-service webhook retries",
        description: "Kavita Reddy verified that simulated network partitions trigger exponential backoff without dropping customer SMS or billing alerts.",
        reporterName: "Kavita Reddy",
        reporterEmail: "kavita.reddy@company.com",
        accountId: "acc-kavita-011",
        projectKey: "NOTIF",
        status: "Done",
    },
    {
        issueKey: "PORTAL-501",
        eventType: "jira:issue_created",
        summary: "Next.js 14 and GraphQL Apollo schema federation in customer-portal-next",
        description: "Sarah Chen, Amina Zahra, and Arjun Kumar developed responsive customer invoice portal with Next.js 14, TailwindCSS, Prisma, and GraphQL federation.",
        reporterName: "Sarah Chen",
        reporterEmail: "sarah.chen@company.com",
        accountId: "acc-sarah-006",
        projectKey: "PORTAL",
        status: "Done",
    },
    {
        issueKey: "BILL-204",
        eventType: "jira:issue_created",
        summary: "Stripe webhook idempotency key lock and double-entry ledger in billing-engine",
        description: "Priya Sharma, Devendra Singh, Arjun Kumar, and Sarah Chen unified Stripe idempotency, double-entry ledger, and PDF invoice rendering.",
        reporterName: "Priya Sharma",
        reporterEmail: "priya.sharma@company.com",
        accountId: "acc-priya-002",
        projectKey: "BILL",
        status: "Done",
    },
    {
        issueKey: "INV-201",
        eventType: "jira:issue_created",
        summary: "RabbitMQ dead-letter retry exchange and catalog sync in inventory-sync-service",
        description: "Arjun Kumar, Rohan Verma, Kavita Reddy, and Amina Zahra configured RabbitMQ message queues, Redis locks, and warehouse SKU synchronization.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun.kumar@company.com",
        accountId: "acc-arjun-001",
        projectKey: "INV",
        status: "Done",
    },
    {
        issueKey: "CRYPTO-101",
        eventType: "jira:issue_created",
        summary: "Automated Ethereum RPC settlement batch processor with AWS KMS multi-sig",
        description: "Devendra Singh, Priya Sharma, and Vikram Patel collaborated on automated crypto payout settlement engine with fiat rate oracle and KMS signing safeguards.",
        reporterName: "Devendra Singh",
        reporterEmail: "devendra.singh@company.com",
        accountId: "acc-devendra-008",
        projectKey: "CRYPTO",
        status: "Done",
    },
];

const SLACK_EVENTS = [
    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 1: ENGINEERING LEADERSHIP - CELEBRATING HEALTHY REPOSITORIES
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0100ENGINEERING",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "🎉 TEAM ANNOUNCEMENT: Our engineering resilience initiative is a complete success! Across payment-gateway-v2, auth-token-vault, and realtime-stream-engine, we have paired up and eliminated every single point of failure (SPOF). Company Bus Factor is now above 2.5 across all active repositories!",
    },
    {
        channel: "C0100ENGINEERING",
        user: "U888DEVENDRA1",
        userDisplayName: "Devendra Singh",
        text: "Huge relief! @Priya Sharma and @Rohan Verma now have full commit and deployment rights on payment-gateway-v2. I no longer have to worry about production alerts on PTO.",
        isThread: true,
    },
    {
        channel: "C0100ENGINEERING",
        user: "U999VIKRAM4",
        userDisplayName: "Vikram Patel",
        text: "Same for auth-token-vault — @Rohan Verma and @Amit Shah thoroughly reviewed and committed the token caching and Keycloak Helm charts. We are 100% covered.",
        isThread: true,
    },
    {
        channel: "C0100ENGINEERING",
        user: "U111NEHA5",
        userDisplayName: "Neha Gupta",
        text: "And @Michael Chen and @Kavita Reddy are rock solid on realtime-stream-engine Flink operators. The knowledge sharing sessions were super effective.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 2: FINTECH & PAYMENTS - COLLABORATIVE DEPLOYMENT
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0800FINTECH",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma",
        text: "PAY-915 & PAY-920 update: We just merged the new payment-gateway-v2 PR with Stripe webhook failover and gRPC connection pooling. Benchmark shows 52,000 TPS with zero dropped transactions.",
    },
    {
        channel: "C0800FINTECH",
        user: "U888DEVENDRA1",
        userDisplayName: "Devendra Singh",
        text: "Approved and deployed to staging! Also @Vikram Patel helped us add AWS KMS multi-sig key rotation in crypto-settlement-engine (CRYPTO-101). Fintech services are in their healthiest state ever.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 3: NOTIFICATIONS SERVICE - CHAOS RESILIENCE
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0400NOTIFICATIONS",
        user: "U777ROHAN2",
        userDisplayName: "Rohan Verma",
        text: "NOTIF-201 & NOTIF-205 report: notification-service handled 1.2 million message alerts during the flash sale test. RabbitMQ + Redis + SendGrid failovers functioned flawlessly.",
    },
    {
        channel: "C0400NOTIFICATIONS",
        user: "U666KAVITA9",
        userDisplayName: "Kavita Reddy",
        text: "The chaos tests verified 0% packet loss even during simulated worker restarts. The dead-letter retry exponential backoff worked like a charm.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 4: FRONTEND & CUSTOMER PORTAL
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0500FRONTEND",
        user: "U888SARAH3",
        userDisplayName: "Sarah Chen",
        text: "PORTAL-501 & PORTAL-510 update: @Amina Zahra and I released the customer portal with Next.js 14, Apollo Client, and client-side PDF invoice downloads. Google Lighthouse score is 99!",
    },
    {
        channel: "C0500FRONTEND",
        user: "U333AMINA7",
        userDisplayName: "Amina Zahra",
        text: "The Prisma ORM migration ran cleanly and enterprise customers can now download multi-currency receipts in under 400ms.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 5: DEVOPS & INFRASTRUCTURE PLATFORM
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0700DEVOPS",
        user: "U222AMIT6",
        userDisplayName: "Amit Shah",
        text: "CORE-101 & CORE-115 infra update: core-platform-gateway has OpenTelemetry distributed tracing across all microservices (Go, Node.js, Python, Rust) with Supavisor connection pooling and Kubernetes HPA autoscaling.",
    },
    {
        channel: "C0700DEVOPS",
        user: "U444MICHAEL8",
        userDisplayName: "Michael Chen",
        text: "Container health probes and graceful termination signals are configured across all Helm releases. Zero downtime during canary rollouts!",
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
            console.log(`  [GH] ${item.eventType.padEnd(14)} ${item.payload.repository.name.padEnd(26)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [GH] Error sending ${item.eventType}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 120));
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
                    issuetype: { name: "Story" },
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
        await new Promise((r) => setTimeout(r, 120));
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
            console.log(`  [Slack] ${item.userDisplayName.padEnd(20)} #${item.channel.padEnd(22)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [Slack] Error sending message for ${item.userDisplayName}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 120));
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
            console.log(`    • Total Repositories:  ${data.stats?.repoCount ?? 'N/A'} (Active: ${data.stats?.activeRepoCount ?? 'N/A'})`);
            console.log(`    • Single Points of Failure: ${data.stats?.spofRepoCount ?? 'N/A'}`);
            console.log(`    • Total People:        ${data.stats?.peopleCount ?? 'N/A'}`);
            console.log(`    • Total Technologies:  ${data.stats?.techCount ?? 'N/A'}`);
            console.log(`    • Avg Bus Factor:      ${data.stats?.avgBusFactor ?? 'N/A'}`);
            console.log(`    • Health Score:        ${data.healthScore?.score ?? 'N/A'}% [Grade: ${data.healthScore?.grade ?? 'N/A'}] (${data.healthScore?.statusText ?? 'N/A'})`);
        } else {
            console.warn(`  ⚠ Overview endpoint returned HTTP ${res.status}`);
        }

        const bfRes = await fetch(`${BASE_URL}/api/dashboard/bus-factor`);
        if (bfRes.ok) {
            const bfData = await bfRes.json();
            console.log(`\n  ✓ Live Bus Factor Repository Rankings (${bfData.repos?.length || 0} repos):`);
            (bfData.repos || []).slice(0, 12).forEach((r) => {
                const statusTag = r.status === 'empty' ? '[EMPTY]' : r.bus_factor <= 1 ? '[SPOF/FRAGILE]' : '[HEALTHY]';
                console.log(`    • ${statusTag.padEnd(16)} ${r.repo_name.padEnd(26)} BF: ${String(r.bus_factor).padEnd(2)} Risk: ${String(r.risk_score).padStart(2)}%  Owner: ${r.primary_owner || 'None'}`);
            });
        }
    } catch (err) {
        console.warn(`  ⚠ Verification probe notice: ${err.message}`);
    }
}

// ─── Main Execution Routine ──────────────────────────────────────────────────

async function main() {
    console.log("=========================================================");
    console.log(" 🚀 Cortex End-to-End Enterprise Ingestion Dataset Suite");
    console.log("    • Multi-User Collaborative Production Engineering");
    console.log("    • Resilient Repositories: Bus Factor >= 2-4, Low Risk");
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
    console.log(" ✅ GitHub Events: " + ghSuccess + "/" + GITHUB_EVENTS.length);
    console.log(" ✅ Jira Issues:   " + jiraSuccess + "/" + JIRA_EVENTS.length);
    console.log(" ✅ Slack Messages:" + slackSuccess + "/" + SLACK_EVENTS.length);
    console.log("---------------------------------------------------------");

    await verifyLiveDashboardData();

    console.log("\n=========================================================");
    console.log(" Next Steps for Developer / Tester:");
    console.log("   1. Wait a moment for BullMQ ingest workers to process events.");
    console.log("   2. Run: npx tsx packages/workers/scheduler.worker.ts (to recompute metrics).");
    console.log("   3. Check Executive Dashboard: http://localhost:5173/");
    console.log("   4. Inspect Bus Factor & Repositories: http://localhost:5173/?tab=bus-factor");
    console.log("   5. Inspect Collaborative Graphs: http://localhost:5173/?tab=graph");
    console.log("=========================================================\n");
}

main();

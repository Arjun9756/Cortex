/**
 * test_end_to_end_ingestion.mjs
 *
 * End-to-end multi-provider interconnected dataset ingestion test suite for Cortex backend.
 * Models a realistic, high-complexity production engineering organization across GitHub, Jira, and Slack:
 *
 * 🟢 HEALTHY / GOOD REPOSITORIES (Multi-Contributor, Resilient, Distributed Bus Factor >= 3-4, Low Risk < 30%):
 *   - core-platform-gateway (5 contributors: Arjun, Sarah, Michael, Amit, Rohan)
 *   - notification-service (4 contributors: Rohan, Kavita, Priya, Sarah)
 *   - customer-portal-next (3 contributors: Sarah, Amina, Arjun)
 *
 * 🟡 MODERATE-RISK REPOSITORIES (Concentrated Knowledge, Bus Factor = 2, Risk ~50%):
 *   - inventory-sync-service (2 contributors: Arjun, Rohan)
 *   - billing-engine (2 contributors: Priya, Devendra)
 *
 * 🔴 FRAGILE / BAD REPOSITORIES (Critical Single Point of Failure - SPOF, Bus Factor = 1, Risk >= 80%, Lone Maintainer):
 *   - payment-gateway-v2 (100% sole owner: Devendra Singh)
 *   - auth-token-vault (100% sole owner: Vikram Patel)
 *   - realtime-stream-engine (100% sole owner: Neha Gupta)
 *   - crypto-settlement-engine (100% sole owner: Devendra Singh)
 *
 * ⚪ EMPTY / SCAFFOLD REPOSITORIES (Bus Factor = 0, Risk = 0%, Status: 'empty'):
 *   - cortex-core (0 commits, scaffold)
 *   - mobile-sdk-scaffold (0 commits, scaffold)
 *
 * Cross-Provider Personas (matching across GitHub, Slack, Jira):
 *   1. Arjun Kumar (Principal Backend Lead) - arjun.kumar@company.com / Arjun9756 / U0987654321 / acc-arjun-001
 *   2. Priya Sharma (Staff Fintech Engineer) - priya.sharma@company.com / priyasharma / U555PRIYA1 / acc-priya-002
 *   3. Vikram Patel (Principal Security Architect) - vikram.patel@company.com / vikrampatel / U999VIKRAM4 / acc-vikram-003
 *   4. Neha Gupta (Principal Streaming Architect) - neha.gupta@company.com / nehagupta / U111NEHA5 / acc-neha-004
 *   5. Devendra Singh (Staff Systems & Payment Core) - devendra.singh@company.com / devendrasingh / U888DEVENDRA1 / acc-devendra-008
 *   6. Sarah Chen (Staff Frontend & UI Architect) - sarah.chen@company.com / sarahchen / U888SARAH3 / acc-sarah-006
 *   7. Amina Zahra (Senior Full-Stack Engineer) - amina.zahra@company.com / aminazahra / U333AMINA7 / acc-amina-009
 *   8. Rohan Verma (Senior Distributed Systems) - rohan.verma@company.com / rohanverma / U777ROHAN2 / acc-rohan-005
 *   9. Amit Shah (Staff DevOps & SRE Lead) - amit.shah@company.com / amitshah / U222AMIT6 / acc-amit-007
 *  10. Michael Chen (Cloud Platform & Kubernetes) - michael.chen@company.com / michaelchen / U444MICHAEL8 / acc-michael-010
 *  11. Kavita Reddy (Lead Reliability & QA) - kavita.reddy@company.com / kavitareddy / U666KAVITA9 / acc-kavita-011
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
    // SECTION 1: HEALTHY / GOOD REPOSITORIES (MULTI-CONTRIBUTOR, DISTRIBUTED)
    // ═════════════════════════════════════════════════════════════════════════

    // 1.1 REPO: core-platform-gateway (Contributor 1: Arjun Kumar)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                modified: ["src/server.ts", "src/tracing/opentelemetry.ts"],
            },
            commits: [
                {
                    id: "cp1001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                    message: "CORE-101: Upgraded Express API gateway routing and OpenTelemetry distributed tracing in core-platform-gateway (commit cp1001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7).",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["src/server.ts", "src/tracing/opentelemetry.ts"],
                },
            ],
        },
    },

    // 1.2 REPO: core-platform-gateway (Contributor 2: Sarah Chen & Contributor 3: Michael Chen)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1313, name: "core-platform-gateway", full_name: "Cortex-Labs/core-platform-gateway" },
            pusher: { name: "Sarah Chen", email: "sarah.chen@company.com" },
            sender: { login: "sarahchen", id: 4004, email: "sarah.chen@company.com" },
            head_commit: {
                id: "cp1002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                author: { name: "Sarah Chen", email: "sarah.chen@company.com" },
                message: "CORE-105: Configured NGINX reverse proxy rate limiting in core-platform-gateway (commit cp1002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8) by Sarah Chen.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
                modified: ["nginx/gateway.conf"],
            },
            commits: [
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
            ],
        },
    },

    // 1.3 REPO: core-platform-gateway (Contributor 4: Amit Shah & Contributor 5: Rohan Verma)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1313, name: "core-platform-gateway", full_name: "Cortex-Labs/core-platform-gateway" },
            pusher: { name: "Amit Shah", email: "amit.shah@company.com" },
            sender: { login: "amitshah", id: 7007, email: "amit.shah@company.com" },
            head_commit: {
                id: "cp1004d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
                author: { name: "Amit Shah", email: "amit.shah@company.com" },
                message: "CORE-112: Integrated Supavisor connection pooling for downstream microservices in core-platform-gateway (commit cp1004d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0) by Amit Shah.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
                modified: ["src/db/supavisor.ts"],
            },
            commits: [
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
            ],
        },
    },

    // 1.4 REPO: notification-service (NEW HEALTHY REPO - Contributor 1: Rohan Verma & Contributor 2: Kavita Reddy)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
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
            ],
        },
    },

    // 1.5 REPO: notification-service (Contributor 3: Priya Sharma & Contributor 4: Sarah Chen)
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 1414, name: "notification-service", full_name: "Cortex-Labs/notification-service" },
            pusher: { name: "Priya Sharma", email: "priya.sharma@company.com" },
            sender: { login: "priyasharma", id: 2002, email: "priya.sharma@company.com" },
            head_commit: {
                id: "notif003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                message: "NOTIF-203: Integrated Twilio SMS dispatch and billing invoice webhook notification listeners in notification-service (commit notif003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8).",
                timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
                modified: ["internal/providers/twilio.go", "internal/handlers/billing_alert.go"],
            },
            commits: [
                {
                    id: "notif003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                    message: "NOTIF-203: Integrated Twilio SMS dispatch and billing invoice webhook notification listeners in notification-service (commit notif003c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8).",
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

    // 1.6 REPO: customer-portal-next (HEALTHY FRONTEND - Sarah Chen, Amina Zahra, Arjun Kumar)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
                modified: ["app/invoices/page.tsx", "lib/graphql/apolloClient.ts"],
            },
            commits: [
                {
                    id: "s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601",
                    message: "PORTAL-501: Built Next.js 14 server components with GraphQL Apollo client in customer-portal-next (commit s4c3b2a1e0f90817263544b3c2d1e0f9a8b7c601) for billing invoices overview.",
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
    // SECTION 2: MODERATE-RISK REPOSITORIES (BUS FACTOR = 2, CONCENTRATED)
    // ═════════════════════════════════════════════════════════════════════════

    // 2.1 REPO: inventory-sync-service (Arjun Kumar & Rohan Verma)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
                modified: ["src/queues/rabbitmq.ts", "src/locks/redisLock.ts"],
            },
            commits: [
                {
                    id: "a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01",
                    message: "INV-201: Configured RabbitMQ dead-letter exchange and Redis distributed locks in inventory-sync-service (commit a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f01) for warehouse SKU synchronization.",
                    author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                    modified: ["src/queues/rabbitmq.ts", "src/locks/redisLock.ts"],
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

    // 2.2 REPO: billing-engine (Priya Sharma & Devendra Singh)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
                modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
            },
            commits: [
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                    message: "BILL-204: Implemented Stripe idempotency key locks in Valkey (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0) to prevent duplicate transaction charges under retry load.",
                    author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                    modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
                },
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d2",
                    message: "BILL-208: Added double-entry bookkeeping ledger journal in billing-engine (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d2) by Devendra Singh.",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["services/ledger/journal.ts"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 3: FRAGILE / BAD REPOSITORIES (CRITICAL SPOF, BUS FACTOR = 1, 80%+ RISK)
    // ═════════════════════════════════════════════════════════════════════════

    // 3.1 REPO: payment-gateway-v2 (100% Sole Contributor: Devendra Singh - Go, gRPC, Vault, Stripe)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
                modified: ["cmd/gateway/main.go", "internal/vault/transit.go", "proto/payment.proto"],
            },
            commits: [
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01",
                    message: "PAY-901: Architected core PCI-DSS tokenization pipeline in Go with gRPC unary streaming and HashiCorp Vault transit engine (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d01). Handles 50k RPS transaction routing to Stripe API.",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["cmd/gateway/main.go", "internal/vault/transit.go", "proto/payment.proto"],
                },
                {
                    id: "f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02",
                    message: "PAY-904: Added Valkey cache layer for ledger balance lock and PostgreSQL dual-write transaction journal in payment-gateway-v2 (commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02) without peer review.",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["internal/ledger/journal.go", "internal/cache/valkey.go"],
                },
            ],
        },
    },

    // 3.2 REPO: auth-token-vault (100% Sole Contributor: Vikram Patel - Rust, WebCrypto, Keycloak, PKCE)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
                modified: ["src/crypto/mod.rs", "src/keycloak/federation.rs", "Cargo.toml"],
            },
            commits: [
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001",
                    message: "SEC-701: Implemented Rust WebCrypto zero-knowledge token vault with Keycloak federation in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c001). Sub-millisecond JWT verification.",
                    author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                    modified: ["src/crypto/mod.rs", "src/keycloak/federation.rs", "Cargo.toml"],
                },
                {
                    id: "c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c002",
                    message: "SEC-704: Enforced PKCE cryptographic challenges and Redis session blacklisting in auth-token-vault (commit c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c002) mitigating CVE-2026-3391.",
                    author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                    modified: ["src/pkce/challenge.rs", "src/redis/blacklist.rs"],
                },
            ],
        },
    },

    // 3.3 REPO: realtime-stream-engine (100% Sole Contributor: Neha Gupta - Apache Flink, Kafka, ClickHouse)
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
                timestamp: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
                modified: ["pipelines/flink_scoring.py", "producers/kafka_partitioner.rs", "config/stream.yaml"],
            },
            commits: [
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001",
                    message: "STREAM-401: Deployed Apache Flink stateful windowing pipeline and Kafka topic partitioners in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d001) for real-time fraud scoring.",
                    author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                    modified: ["pipelines/flink_scoring.py", "producers/kafka_partitioner.rs", "config/stream.yaml"],
                },
                {
                    id: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d002",
                    message: "STREAM-408: Implemented ClickHouse columnar table engine ingestion sink in realtime-stream-engine (commit d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d002) replacing Elasticsearch.",
                    author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                    modified: ["sinks/clickhouse_writer.py", "schemas/telemetry.sql"],
                },
            ],
        },
    },

    // 3.4 REPO: crypto-settlement-engine (NEW FRAGILE REPO - 100% Sole Contributor: Devendra Singh)
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
                message: "CRYPTO-101: Built automated crypto payout settlement engine in Python with Web3 Ethereum RPC and AWS KMS transaction signing (commit cryp001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e). Zero documentation or secondary maintainers.",
                timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
                modified: ["settlement/batch_processor.py", "kms/signer.py"],
            },
            commits: [
                {
                    id: "cryp001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e",
                    message: "CRYPTO-101: Built automated crypto payout settlement engine in Python with Web3 Ethereum RPC and AWS KMS transaction signing (commit cryp001a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e). Zero documentation or secondary maintainers.",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["settlement/batch_processor.py", "kms/signer.py"],
                },
                {
                    id: "cryp002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
                    message: "CRYPTO-105: Added gas fee spike ceiling protection algorithm in crypto-settlement-engine (commit cryp002b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f).",
                    author: { name: "Devendra Singh", email: "devendra.singh@company.com" },
                    modified: ["gas/optimizer.py"],
                },
            ],
        },
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 4: COLLABORATIVE PULL REQUESTS & CODE REVIEWS
    // ═════════════════════════════════════════════════════════════════════════

    // 4.1 Healthy Repo PR: core-platform-gateway (Opened by Arjun, Approved by Sarah)
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
                body: "Injects traceparent headers across all downstream Go, Node.js, and Python microservices with NGINX rate-limiting compliance. Reviewed by Sarah Chen and Amit Shah.",
                user: { login: "Arjun9756", email: "arjun.kumar@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
                merged: true,
            },
        },
    },

    // 4.2 Healthy Repo PR: notification-service (Opened by Rohan, Approved by Kavita & Priya)
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1414, name: "notification-service", full_name: "Cortex-Labs/notification-service" },
            sender: { login: "rohanverma", id: 3003, email: "rohan.verma@company.com" },
            pull_request: {
                id: 201,
                number: 3,
                title: "NOTIF-205: Add dead-letter queue circuit breaker and Twilio failover fallback",
                body: "When Twilio encounters downstream 500s or network drops, route SMS payloads to SendGrid email fallback with exponential backoff.",
                user: { login: "rohanverma", email: "rohan.verma@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
                merged: true,
            },
        },
    },

    // 4.3 Healthy Repo PR: customer-portal-next (Opened by Amina, Approved by Sarah)
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1212, name: "customer-portal-next", full_name: "Cortex-Labs/customer-portal-next" },
            sender: { login: "aminazahra", id: 7009, email: "amina.zahra@company.com" },
            pull_request: {
                id: 501,
                number: 9,
                title: "PORTAL-510: TailwindCSS accessible invoice table with PDF export",
                body: "Added accessible ARIA roles and client-side PDF export for enterprise customer billing invoices.",
                user: { login: "aminazahra", email: "amina.zahra@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
                merged: true,
            },
        },
    },

    // 4.4 Fragile Repo PR: payment-gateway-v2 (Solo Author: Devendra Singh - Merged with NO REVIEWS)
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 808, name: "payment-gateway-v2", full_name: "Cortex-Labs/payment-gateway-v2" },
            sender: { login: "devendrasingh", id: 8008, email: "devendra.singh@company.com" },
            pull_request: {
                id: 905,
                number: 22,
                title: "PAY-905: Add gRPC mTLS authentication between billing-engine and payment-gateway-v2",
                body: "Enforces mutual TLS certificates for secure inter-service communication between Go payment gateway and Priya's billing-engine under PCI compliance mandates. (Self-merged without secondary reviewer).",
                user: { login: "devendrasingh", email: "devendra.singh@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
                merged: true,
            },
        },
    },

    // 4.5 Fragile Repo Issue: auth-token-vault (Auditing single point of failure)
    {
        eventType: "issues",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 1010, name: "auth-token-vault", full_name: "Cortex-Labs/auth-token-vault" },
            sender: { login: "vikrampatel", id: 5005, email: "vikram.patel@company.com" },
            issue: {
                id: 708,
                number: 12,
                title: "SEC-708: Audit Keycloak RS256 token signing rotation under zero-trust policy",
                body: "Verify that all backend microservices successfully consume the new JWKS endpoint without downtime. Sole author: Vikram Patel.",
                user: { login: "vikrampatel", email: "vikram.patel@company.com" },
                created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
            },
        },
    },
];

const JIRA_EVENTS = [
    // ═════════════════════════════════════════════════════════════════════════
    // JIRA TICKETS: HEALTHY REPOSITORIES & MULTI-USER SPRINTS
    // ═════════════════════════════════════════════════════════════════════════
    {
        issueKey: "CORE-101",
        eventType: "jira:issue_created",
        summary: "OpenTelemetry distributed tracing and Supavisor pooling in core-platform-gateway",
        description: "Platform engineering team (Arjun Kumar, Sarah Chen, Michael Chen, Amit Shah, Rohan Verma) unified API gateway routing with OpenTelemetry tracing, NGINX rate-limiting, and Supavisor DB pooling.",
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
        description: "Michael Chen and Rohan Verma implemented Kubernetes Horizontal Pod Autoscaler and circuit breaker middleware to withstand 10x traffic spikes.",
        reporterName: "Michael Chen",
        reporterEmail: "michael.chen@company.com",
        accountId: "acc-michael-010",
        projectKey: "CORE",
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
        issueKey: "PORTAL-510",
        eventType: "jira:issue_created",
        summary: "Client-side PDF generation and internationalization for enterprise invoices",
        description: "Amina Zahra implemented PDF invoice generator with multi-currency support and locale formatting.",
        reporterName: "Amina Zahra",
        reporterEmail: "amina.zahra@company.com",
        accountId: "acc-amina-009",
        projectKey: "PORTAL",
        status: "In Progress",
    },

    // ═════════════════════════════════════════════════════════════════════════
    // JIRA TICKETS: MODERATE-RISK REPOSITORIES
    // ═════════════════════════════════════════════════════════════════════════
    {
        issueKey: "INV-201",
        eventType: "jira:issue_created",
        summary: "RabbitMQ dead-letter retry exchange and Redis locks in inventory-sync-service",
        description: "Arjun Kumar and Rohan Verma configured RabbitMQ message queues and Redis distributed locks for asynchronous warehouse inventory reconciliation.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun.kumar@company.com",
        accountId: "acc-arjun-001",
        projectKey: "INV",
        status: "Done",
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

    // ═════════════════════════════════════════════════════════════════════════
    // JIRA TICKETS: FRAGILE / BAD REPOSITORIES (SPOF BOTTLENECKS)
    // ═════════════════════════════════════════════════════════════════════════
    {
        issueKey: "PAY-901",
        eventType: "jira:issue_created",
        summary: "Architect Go gRPC and HashiCorp Vault tokenization pipeline in payment-gateway-v2",
        description: "Devendra Singh architected zero-downtime card tokenization engine in Go using HashiCorp Vault transit decryption. WARNING: Devendra is the sole engineer with knowledge of this service.",
        reporterName: "Devendra Singh",
        reporterEmail: "devendra.singh@company.com",
        accountId: "acc-devendra-008",
        projectKey: "PAY",
        status: "Done",
    },
    {
        issueKey: "PAY-911",
        eventType: "jira:issue_created",
        summary: "[CRITICAL INCIDENT] Vault transit secret lease expiration in payment-gateway-v2",
        description: "Payment gateway dropped 3% of card authorizations during lease rotation. Bottleneck: only Devendra Singh can deploy and rotate Vault credentials for payment-gateway-v2.",
        reporterName: "Amit Shah",
        reporterEmail: "amit.shah@company.com",
        accountId: "acc-amit-007",
        projectKey: "PAY",
        status: "In Progress",
    },
    {
        issueKey: "SEC-701",
        eventType: "jira:issue_created",
        summary: "Implement Rust WebCrypto cryptographic token vault in auth-token-vault",
        description: "Vikram Patel built sub-millisecond Rust token vault with Keycloak federation and PKCE validation to resolve CVE-2026-3391 token replay vulnerability. Sole maintainer: Vikram Patel.",
        reporterName: "Vikram Patel",
        reporterEmail: "vikram.patel@company.com",
        accountId: "acc-vikram-003",
        projectKey: "SEC",
        status: "Done",
    },
    {
        issueKey: "SEC-709",
        eventType: "jira:issue_created",
        summary: "Knowledge departure risk audit on auth-token-vault: Zero secondary reviewers",
        description: "Security architecture committee noted that auth-token-vault is written entirely in complex Rust with zero co-authors. Immediate cross-training required before Vikram's scheduled leave.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun.kumar@company.com",
        accountId: "acc-arjun-001",
        projectKey: "SEC",
        status: "Open",
    },
    {
        issueKey: "STREAM-401",
        eventType: "jira:issue_created",
        summary: "Replace Elasticsearch with ClickHouse and Apache Flink in realtime-stream-engine",
        description: "Neha Gupta migrated high-throughput event logs from Elasticsearch to ClickHouse and Apache Flink, reducing query response times from 1.8s to 45ms. 100% written by Neha Gupta.",
        reporterName: "Neha Gupta",
        reporterEmail: "neha.gupta@company.com",
        accountId: "acc-neha-004",
        projectKey: "STREAM",
        status: "Done",
    },
    {
        issueKey: "CRYPTO-101",
        eventType: "jira:issue_created",
        summary: "Automated Ethereum RPC transaction settlement engine in crypto-settlement-engine",
        description: "Devendra Singh deployed crypto settlement batch processor. Single Point of Failure: No other engineer has access to AWS KMS transaction signing logic.",
        reporterName: "Devendra Singh",
        reporterEmail: "devendra.singh@company.com",
        accountId: "acc-devendra-008",
        projectKey: "CRYPTO",
        status: "In Progress",
    },
];

const SLACK_EVENTS = [
    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 1: HEALTHY COLLABORATION ON core-platform-gateway
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0100ENGINEERING",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "CORE-101 milestone: The OpenTelemetry distributed tracing rollout in core-platform-gateway is live across all production clusters. Huge thanks to @Sarah Chen for the NGINX rate-limiting config and @Michael Chen for Docker health probes!",
    },
    {
        channel: "C0100ENGINEERING",
        user: "U888SARAH3",
        userDisplayName: "Sarah Chen",
        text: "Happy to help! The NGINX proxy cache dropped gateway p99 latency to 18ms. PR #14 merged smoothly with 0 regressions.",
        isThread: true,
    },
    {
        channel: "C0100ENGINEERING",
        user: "U222AMIT6",
        userDisplayName: "Amit Shah",
        text: "Verified the Supavisor connection pooler metrics in Datadog. PostgreSQL connection count stabilized at 45 even under 20k concurrent requests.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 2: HEALTHY COLLABORATION ON notification-service
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0400NOTIFICATIONS",
        user: "U777ROHAN2",
        userDisplayName: "Rohan Verma",
        text: "NOTIF-201 update: notification-service is fully deployed! We have RabbitMQ topic exchanges routing to Twilio SMS and SendGrid email. Outstanding team effort with @Kavita Reddy, @Priya Sharma, and @Sarah Chen.",
    },
    {
        channel: "C0400NOTIFICATIONS",
        user: "U666KAVITA9",
        userDisplayName: "Kavita Reddy",
        text: "Ran chaos tests simulating a complete Twilio regional blackout. The exponential backoff dead-letter queue automatically rerouted 100% of SMS alerts to SendGrid without losing a single message.",
        isThread: true,
    },
    {
        channel: "C0400NOTIFICATIONS",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma",
        text: "Billing webhook alerts are connected and tested with Stripe testmode. Invoice receipts deliver in under 800ms.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 3: HEALTHY FRONTEND ON customer-portal-next
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0500FRONTEND",
        user: "U888SARAH3",
        userDisplayName: "Sarah Chen",
        text: "PORTAL-501 & PORTAL-510 update: @Amina Zahra and I released the new customer portal with Next.js 14, Apollo Client, and Prisma. Google Lighthouse score is 99 on mobile.",
    },
    {
        channel: "C0500FRONTEND",
        user: "U333AMINA7",
        userDisplayName: "Amina Zahra",
        text: "The client-side PDF invoice export is working seamlessly across Safari, Chrome, and Firefox. Thanks @Arjun Kumar for the Redis session cache review.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 4: FRAGILE BAD REPO ALARMS - payment-gateway-v2 (SPOF BOTTLENECK)
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0300INCIDENTS",
        user: "U222AMIT6",
        userDisplayName: "Amit Shah",
        text: "🚨 P1 INCIDENT (PAY-911): payment-gateway-v2 is returning 504 Gateway Timeouts on Stripe authorization webhooks! Vault transit lease expired. @Devendra Singh are you online? You are the only person who has access to the Vault transit key!",
    },
    {
        channel: "C0300INCIDENTS",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "This is a severe Single Point of Failure (SPOF). payment-gateway-v2 has a Bus Factor of 1 with 100% sole ownership by Devendra. No secondary engineer knows the Go gRPC transit pipeline. We need to cross-train immediately.",
        isThread: true,
    },
    {
        channel: "C0300INCIDENTS",
        user: "U888DEVENDRA1",
        userDisplayName: "Devendra Singh",
        text: "Logging in now from mobile. Rotating the Vault token lease manually. Added a 24h keepalive daemon in payment-gateway-v2 commit f1a2b3c4d5e60718293a4b5c6d7e8f9a0b1c2d02.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 5: FRAGILE BAD REPO ALARMS - auth-token-vault (SPOF BOTTLENECK)
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0600SECURITY",
        user: "U999VIKRAM4",
        userDisplayName: "Vikram Patel",
        text: "SEC-701 deployed in auth-token-vault: Rust WebCrypto zero-knowledge token verification with Keycloak federation is active. Average validation latency is 0.4ms.",
    },
    {
        channel: "C0600SECURITY",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "Vikram, SEC-709 ticket was opened for a knowledge risk audit. You are going on leave next month and auth-token-vault has 0 co-maintainers. No other engineer on the team knows the Rust WebCrypto algorithms.",
        isThread: true,
    },
    {
        channel: "C0600SECURITY",
        user: "U999VIKRAM4",
        userDisplayName: "Vikram Patel",
        text: "Understood. Let's schedule a 2-hour architectural walkthrough with Rohan Verma and Devendra Singh next Tuesday to transfer ownership.",
        isThread: true,
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SLACK THREAD 6: FRAGILE BAD REPO ALARMS - realtime-stream-engine & crypto-settlement-engine
    // ═════════════════════════════════════════════════════════════════════════
    {
        channel: "C0700DATAPLATFORM",
        user: "U111NEHA5",
        userDisplayName: "Neha Gupta",
        text: "STREAM-401 completed in realtime-stream-engine: ClickHouse + Apache Flink streaming pipeline is live! Columnar compression reduced disk usage by 75% compared to Elasticsearch.",
    },
    {
        channel: "C0700DATAPLATFORM",
        user: "U666KAVITA9",
        userDisplayName: "Kavita Reddy",
        text: "Great performance Neha, but please ensure we write runbooks for the Flink stateful windowing topology. If you depart or get sick, realtime-stream-engine becomes an unowned SPOF.",
        isThread: true,
    },
    {
        channel: "C0800FINTECH",
        user: "U888DEVENDRA1",
        userDisplayName: "Devendra Singh",
        text: "CRYPTO-101 update: crypto-settlement-engine is running the Ethereum RPC settlement batch in staging with AWS KMS signing. 100% automated payouts.",
    },
    {
        channel: "C0800FINTECH",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma",
        text: "Devendra, please add me or Rohan as co-reviewer on the crypto-settlement-engine PRs. We can't have another single-owner repository in the fintech org!",
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
            (bfData.repos || []).slice(0, 10).forEach((r) => {
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
    console.log("    • Realistic Multi-User Collaboration Across GitHub, Slack & Jira");
    console.log("    • Healthy Repos (Bus Factor 3-5) vs Bad Repos (SPOF Risk >= 80%)");
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
    console.log("   1. Wait for BullMQ ingest workers to process queue events.");
    console.log("   2. Run: npx tsx packages/workers/scheduler.worker.ts (or test_enterprise_hardening.ts) to recompute metrics.");
    console.log("   3. Check Executive Dashboard: http://localhost:5173/");
    console.log("   4. Inspect Bus Factor & Repositories: http://localhost:5173/?tab=bus-factor");
    console.log("   5. Inspect Good vs Bad Repos in Graph Explorer: http://localhost:5173/?tab=graph");
    console.log("=========================================================\n");
}

main();

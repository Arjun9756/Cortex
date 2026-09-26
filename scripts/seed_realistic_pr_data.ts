import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import crypto from 'crypto';

interface RealPrSeed {
    repo: string;
    number: number;
    title: string;
    author: string;
    isBot: boolean;
    daysAgoCreated: number;
    reviewHours: number; // Wall-clock hours from ready_for_review to merge
    draftHours?: number; // Time in draft before ready
    isOutlier?: boolean;
    additions: number;
    deletions: number;
    changedFiles: number;
    commits: number;
}

const SEED_PRS: RealPrSeed[] = [
    // ─── 1. inventory-sync-service (Primary owner: Arjun9756) ─────────────
    {
        repo: 'inventory-sync-service',
        number: 101,
        title: 'feat(sync): parallel batch inventory sync with Redis cache [INV-101]',
        author: 'Arjun9756',
        isBot: false,
        daysAgoCreated: 4,
        reviewHours: 2.5,
        additions: 380,
        deletions: 45,
        changedFiles: 5,
        commits: 2,
    },
    {
        repo: 'inventory-sync-service',
        number: 102,
        title: 'fix(reconcile): handle delta stock reconciliation deadlocks [INV-102]',
        author: 'Arjun9756',
        isBot: false,
        daysAgoCreated: 6,
        reviewHours: 3.2,
        additions: 140,
        deletions: 28,
        changedFiles: 3,
        commits: 1,
    },
    {
        repo: 'inventory-sync-service',
        number: 103,
        title: 'perf(pipeline): optimize SKU indexing throughput [INV-103]',
        author: 'rohanverma',
        isBot: false,
        daysAgoCreated: 9,
        reviewHours: 4.0,
        additions: 290,
        deletions: 80,
        changedFiles: 4,
        commits: 3,
    },
    {
        repo: 'inventory-sync-service',
        number: 104,
        title: 'feat(webhook): supplier catalog sync webhooks [INV-104]',
        author: 'Arjun9756',
        isBot: false,
        daysAgoCreated: 12,
        reviewHours: 5.5,
        draftHours: 12,
        additions: 520,
        deletions: 95,
        changedFiles: 7,
        commits: 4,
    },
    {
        repo: 'inventory-sync-service',
        number: 105,
        title: 'chore(deps): bump ioredis from 5.4.1 to 5.4.2',
        author: 'dependabot[bot]',
        isBot: true,
        daysAgoCreated: 14,
        reviewHours: 0.2,
        additions: 12,
        deletions: 12,
        changedFiles: 1,
        commits: 1,
    },
    {
        repo: 'inventory-sync-service',
        number: 106,
        title: 'refactor(stock): legacy warehouse catalog schema overhaul [INV-106]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 42,
        reviewHours: 36 * 24, // 36 days = Stale Outlier
        isOutlier: true,
        additions: 980,
        deletions: 650,
        changedFiles: 22,
        commits: 11,
    },

    // ─── 2. core-platform-gateway (Primary owner: Arjun / Michael) ────────
    {
        repo: 'core-platform-gateway',
        number: 201,
        title: 'feat(gateway): gRPC HTTP/2 multiplexing proxy layer [CORE-201]',
        author: 'michaelchen',
        isBot: false,
        daysAgoCreated: 3,
        reviewHours: 3.5,
        additions: 640,
        deletions: 120,
        changedFiles: 8,
        commits: 3,
    },
    {
        repo: 'core-platform-gateway',
        number: 202,
        title: 'fix(rate-limit): distributed token bucket Redis lua script [CORE-202]',
        author: 'Arjun9756',
        isBot: false,
        daysAgoCreated: 5,
        reviewHours: 2.8,
        additions: 210,
        deletions: 35,
        changedFiles: 3,
        commits: 2,
    },
    {
        repo: 'core-platform-gateway',
        number: 203,
        title: 'feat(telemetry): OpenTelemetry distributed tracing middleware [CORE-203]',
        author: 'Sarah Chen',
        isBot: false,
        daysAgoCreated: 8,
        reviewHours: 4.5,
        additions: 430,
        deletions: 60,
        changedFiles: 6,
        commits: 2,
    },
    {
        repo: 'core-platform-gateway',
        number: 204,
        title: 'fix(cors): dynamic origin validation for tenant subdomains [CORE-204]',
        author: 'Arjun9756',
        isBot: false,
        daysAgoCreated: 11,
        reviewHours: 1.8,
        additions: 85,
        deletions: 14,
        changedFiles: 2,
        commits: 1,
    },
    {
        repo: 'core-platform-gateway',
        number: 205,
        title: 'security(tls): enforce TLS 1.3 cipher suites [CORE-205]',
        author: 'michaelchen',
        isBot: false,
        daysAgoCreated: 15,
        reviewHours: 6.0,
        additions: 150,
        deletions: 40,
        changedFiles: 3,
        commits: 1,
    },
    {
        repo: 'core-platform-gateway',
        number: 206,
        title: 'chore(deps): update express to 5.2.1',
        author: 'renovate[bot]',
        isBot: true,
        daysAgoCreated: 16,
        reviewHours: 0.1,
        additions: 8,
        deletions: 8,
        changedFiles: 1,
        commits: 1,
    },

    // ─── 3. payment-gateway-v2 (Primary owner: Priya Sharma) ──────────────
    {
        repo: 'payment-gateway-v2',
        number: 301,
        title: 'feat(stripe): idempotency key caching for charge webhooks [PAY-301]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 4,
        reviewHours: 3.0,
        additions: 340,
        deletions: 50,
        changedFiles: 4,
        commits: 2,
    },
    {
        repo: 'payment-gateway-v2',
        number: 302,
        title: 'fix(refund): retry logic for synchronous bank settlement timeouts [PAY-302]',
        author: 'Devendra Singh',
        isBot: false,
        daysAgoCreated: 7,
        reviewHours: 4.8,
        additions: 220,
        deletions: 45,
        changedFiles: 3,
        commits: 2,
    },
    {
        repo: 'payment-gateway-v2',
        number: 303,
        title: 'feat(ledger): dual-entry ledger transaction integrity check [PAY-303]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 10,
        reviewHours: 5.2,
        draftHours: 24,
        additions: 610,
        deletions: 90,
        changedFiles: 7,
        commits: 3,
    },
    {
        repo: 'payment-gateway-v2',
        number: 304,
        title: 'security(pci): mask cardholder data in audit log payloads [PAY-304]',
        author: 'Vikram Patel',
        isBot: false,
        daysAgoCreated: 13,
        reviewHours: 2.2,
        additions: 95,
        deletions: 12,
        changedFiles: 2,
        commits: 1,
    },
    {
        repo: 'payment-gateway-v2',
        number: 305,
        title: 'feat(sepa): EU direct debit instant processing adapter [PAY-305]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 17,
        reviewHours: 7.0,
        additions: 480,
        deletions: 70,
        changedFiles: 6,
        commits: 2,
    },

    // ─── 4. auth-token-vault (Primary owner: Vikram Patel) ─────────────────
    {
        repo: 'auth-token-vault',
        number: 401,
        title: 'feat(jwt): RS256 JWKS key rotation endpoint with cache fallback [AUTH-401]',
        author: 'Vikram Patel',
        isBot: false,
        daysAgoCreated: 3,
        reviewHours: 2.8,
        additions: 280,
        deletions: 30,
        changedFiles: 4,
        commits: 2,
    },
    {
        repo: 'auth-token-vault',
        number: 402,
        title: 'fix(session): revoke refresh tokens on password reset [AUTH-402]',
        author: 'rohanverma',
        isBot: false,
        daysAgoCreated: 6,
        reviewHours: 3.4,
        additions: 160,
        deletions: 22,
        changedFiles: 3,
        commits: 1,
    },
    {
        repo: 'auth-token-vault',
        number: 403,
        title: 'feat(mfa): WebAuthn FIDO2 biometric authentication provider [AUTH-403]',
        author: 'Vikram Patel',
        isBot: false,
        daysAgoCreated: 9,
        reviewHours: 6.2,
        draftHours: 48,
        additions: 510,
        deletions: 65,
        changedFiles: 7,
        commits: 4,
    },
    {
        repo: 'auth-token-vault',
        number: 404,
        title: 'perf(argon2): tune password hash memory cost parameters [AUTH-404]',
        author: 'Amit Shah',
        isBot: false,
        daysAgoCreated: 14,
        reviewHours: 4.1,
        additions: 75,
        deletions: 18,
        changedFiles: 2,
        commits: 1,
    },
    {
        repo: 'auth-token-vault',
        number: 405,
        title: 'refactor(kms): multi-cloud secret manager abstraction layer [AUTH-405]',
        author: 'Vikram Patel',
        isBot: false,
        daysAgoCreated: 45,
        reviewHours: 39 * 24, // 39 days = Stale Outlier
        isOutlier: true,
        additions: 1100,
        deletions: 720,
        changedFiles: 25,
        commits: 14,
    },

    // ─── 5. notification-service (Primary owner: Rohan Verma) ─────────────
    {
        repo: 'notification-service',
        number: 501,
        title: 'feat(email): SendGrid dynamic template engine integration [NOTIF-501]',
        author: 'rohanverma',
        isBot: false,
        daysAgoCreated: 2,
        reviewHours: 2.0,
        additions: 310,
        deletions: 40,
        changedFiles: 4,
        commits: 2,
    },
    {
        repo: 'notification-service',
        number: 502,
        title: 'fix(sms): Twilio rate-limit retry with exponential backoff [NOTIF-502]',
        author: 'Kavita Reddy',
        isBot: false,
        daysAgoCreated: 5,
        reviewHours: 2.7,
        additions: 190,
        deletions: 30,
        changedFiles: 3,
        commits: 1,
    },
    {
        repo: 'notification-service',
        number: 503,
        title: 'feat(slack): incident escalation webhook notifications [NOTIF-503]',
        author: 'rohanverma',
        isBot: false,
        daysAgoCreated: 8,
        reviewHours: 3.8,
        additions: 420,
        deletions: 55,
        changedFiles: 5,
        commits: 2,
    },
    {
        repo: 'notification-service',
        number: 504,
        title: 'perf(queue): BullMQ batching for transactional digest alerts [NOTIF-504]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 12,
        reviewHours: 4.2,
        additions: 260,
        deletions: 48,
        changedFiles: 4,
        commits: 2,
    },
    {
        repo: 'notification-service',
        number: 505,
        title: 'chore(deps): bump bullmq from 5.80.8 to 5.80.9',
        author: 'dependabot[bot]',
        isBot: true,
        daysAgoCreated: 15,
        reviewHours: 0.1,
        additions: 6,
        deletions: 6,
        changedFiles: 1,
        commits: 1,
    },

    // ─── 6. billing-engine (Primary owner: Priya Sharma) ──────────────────
    {
        repo: 'billing-engine',
        number: 601,
        title: 'feat(subscription): prorated seat billing calculation engine [BILL-601]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 3,
        reviewHours: 3.6,
        additions: 490,
        deletions: 75,
        changedFiles: 6,
        commits: 3,
    },
    {
        repo: 'billing-engine',
        number: 602,
        title: 'fix(invoice): PDF rendering memory leak on large line-item orders [BILL-602]',
        author: 'Devendra Singh',
        isBot: false,
        daysAgoCreated: 7,
        reviewHours: 4.0,
        additions: 180,
        deletions: 40,
        changedFiles: 3,
        commits: 1,
    },
    {
        repo: 'billing-engine',
        number: 603,
        title: 'feat(dunning): automated payment failure grace period workflow [BILL-603]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 11,
        reviewHours: 5.0,
        additions: 370,
        deletions: 60,
        changedFiles: 5,
        commits: 2,
    },
    {
        repo: 'billing-engine',
        number: 604,
        title: 'feat(tax): Avalara sales tax VAT compliance API [BILL-604]',
        author: 'Devendra Singh',
        isBot: false,
        daysAgoCreated: 16,
        reviewHours: 6.8,
        additions: 430,
        deletions: 70,
        changedFiles: 5,
        commits: 2,
    },
    {
        repo: 'billing-engine',
        number: 605,
        title: 'refactor(currency): multi-currency exchange rate lock mechanism [BILL-605]',
        author: 'priyasharma',
        isBot: false,
        daysAgoCreated: 20,
        reviewHours: 5.4,
        additions: 310,
        deletions: 50,
        changedFiles: 4,
        commits: 2,
    },

    // ─── 7. realtime-stream-engine (Primary owner: Neha Gupta) ────────────
    {
        repo: 'realtime-stream-engine',
        number: 701,
        title: 'feat(kafka): consumer group rebalancing checkpoint persistence [STREAM-701]',
        author: 'Neha Gupta',
        isBot: false,
        daysAgoCreated: 4,
        reviewHours: 4.5,
        additions: 460,
        deletions: 80,
        changedFiles: 5,
        commits: 3,
    },
    {
        repo: 'realtime-stream-engine',
        number: 702,
        title: 'fix(backpressure): reactive stream buffer overflow protection [STREAM-702]',
        author: 'michaelchen',
        isBot: false,
        daysAgoCreated: 8,
        reviewHours: 3.2,
        additions: 230,
        deletions: 40,
        changedFiles: 3,
        commits: 2,
    },
    {
        repo: 'realtime-stream-engine',
        number: 703,
        title: 'feat(flink): sliding window aggregation for activity analytics [STREAM-703]',
        author: 'Neha Gupta',
        isBot: false,
        daysAgoCreated: 12,
        reviewHours: 6.0,
        additions: 580,
        deletions: 95,
        changedFiles: 7,
        commits: 3,
    },
    {
        repo: 'realtime-stream-engine',
        number: 704,
        title: 'perf(serde): switch JSON serialization to Avro binary protocol [STREAM-704]',
        author: 'Kavita Reddy',
        isBot: false,
        daysAgoCreated: 15,
        reviewHours: 5.0,
        additions: 340,
        deletions: 110,
        changedFiles: 5,
        commits: 2,
    },
    {
        repo: 'realtime-stream-engine',
        number: 705,
        title: 'fix(connection): reconnect backoff on Kafka broker leader change [STREAM-705]',
        author: 'Neha Gupta',
        isBot: false,
        daysAgoCreated: 19,
        reviewHours: 3.8,
        additions: 190,
        deletions: 35,
        changedFiles: 3,
        commits: 1,
    },

    // ─── 8. customer-portal-next (Primary owner: Sarah Chen) ──────────────
    {
        repo: 'customer-portal-next',
        number: 801,
        title: 'feat(dashboard): server components migration for team settings [PORTAL-801]',
        author: 'Sarah Chen',
        isBot: false,
        daysAgoCreated: 2,
        reviewHours: 2.2,
        additions: 410,
        deletions: 60,
        changedFiles: 6,
        commits: 2,
    },
    {
        repo: 'customer-portal-next',
        number: 802,
        title: 'fix(auth): session cookie cross-domain samesite policy [PORTAL-802]',
        author: 'michaelchen',
        isBot: false,
        daysAgoCreated: 6,
        reviewHours: 3.0,
        additions: 110,
        deletions: 20,
        changedFiles: 2,
        commits: 1,
    },
    {
        repo: 'customer-portal-next',
        number: 803,
        title: 'feat(billing): embed customer portal checkout session [PORTAL-803]',
        author: 'Sarah Chen',
        isBot: false,
        daysAgoCreated: 9,
        reviewHours: 4.0,
        additions: 380,
        deletions: 45,
        changedFiles: 5,
        commits: 2,
    },
    {
        repo: 'customer-portal-next',
        number: 804,
        title: 'perf(bundle): dynamic import heavy charting libraries [PORTAL-804]',
        author: 'Sarah Chen',
        isBot: false,
        daysAgoCreated: 13,
        reviewHours: 2.5,
        additions: 140,
        deletions: 30,
        changedFiles: 3,
        commits: 1,
    },
    {
        repo: 'customer-portal-next',
        number: 805,
        title: 'a11y(theme): high-contrast mode and ARIA combobox accessibility [PORTAL-805]',
        author: 'Sarah Chen',
        isBot: false,
        daysAgoCreated: 18,
        reviewHours: 3.5,
        additions: 220,
        deletions: 35,
        changedFiles: 4,
        commits: 1,
    },

    // ─── 9. crypto-settlement-engine (Primary owner: Devendra Singh) ───────
    {
        repo: 'crypto-settlement-engine',
        number: 901,
        title: 'feat(settlement): multi-sig transaction signing coordinator [CRYPTO-901]',
        author: 'Devendra Singh',
        isBot: false,
        daysAgoCreated: 3,
        reviewHours: 5.5,
        additions: 560,
        deletions: 90,
        changedFiles: 7,
        commits: 3,
    },
    {
        repo: 'crypto-settlement-engine',
        number: 902,
        title: 'security(kms): AWS KMS hardware security module rotation [CRYPTO-902]',
        author: 'Vikram Patel',
        isBot: false,
        daysAgoCreated: 7,
        reviewHours: 4.2,
        additions: 290,
        deletions: 45,
        changedFiles: 4,
        commits: 2,
    },
    {
        repo: 'crypto-settlement-engine',
        number: 903,
        title: 'feat(audit): immutable append-only settlement ledger hash chain [CRYPTO-903]',
        author: 'Devendra Singh',
        isBot: false,
        daysAgoCreated: 11,
        reviewHours: 7.0,
        additions: 440,
        deletions: 60,
        changedFiles: 5,
        commits: 2,
    },
    {
        repo: 'crypto-settlement-engine',
        number: 904,
        title: 'fix(rpc): Ethereum node fallback on timeout or block lag [CRYPTO-904]',
        author: 'Devendra Singh',
        isBot: false,
        daysAgoCreated: 15,
        reviewHours: 3.8,
        additions: 190,
        deletions: 30,
        changedFiles: 3,
        commits: 1,
    },
    {
        repo: 'crypto-settlement-engine',
        number: 905,
        title: 'perf(gas): dynamic EIP-1559 gas fee priority estimator [CRYPTO-905]',
        author: 'Devendra Singh',
        isBot: false,
        daysAgoCreated: 20,
        reviewHours: 4.8,
        additions: 260,
        deletions: 40,
        changedFiles: 4,
        commits: 2,
    },
];

async function seedRealPrData() {
    console.log(`\n======================================================`);
    console.log(`🚀 SEEDING REAL PR DELIVERY DATA (${SEED_PRS.length} pull requests across 9 repos)`);
    console.log(`======================================================\n`);

    // Delete previous real seed PRs to ensure clean idempotency
    await sql`DELETE FROM events WHERE id LIKE 'cortex_pr_real_%'`;

    let inserted = 0;
    const now = Date.now();

    for (const pr of SEED_PRS) {
        const id = `cortex_pr_real_${pr.repo}_${pr.number}`;
        const externalId = `cortex_pr_${pr.repo}_${pr.number}_${crypto.randomUUID().slice(0, 8)}`;

        const createdMs = now - (pr.daysAgoCreated * 24 * 3600 * 1000);
        const createdDate = new Date(createdMs);

        const draftMs = (pr.draftHours || 0) * 3600 * 1000;
        const readyDate = new Date(createdMs + draftMs);

        const reviewMs = pr.reviewHours * 3600 * 1000;
        const mergedDate = new Date(readyDate.getTime() + reviewMs);

        const payload = {
            repository: {
                name: pr.repo,
                full_name: `Cortex/${pr.repo}`,
            },
            pull_request: {
                id,
                number: pr.number,
                title: pr.title,
                draft: false,
                created_at: createdDate.toISOString(),
                ready_for_review_at: readyDate.toISOString(),
                merged_at: mergedDate.toISOString(),
                closed_at: mergedDate.toISOString(),
                merged: true,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changedFiles,
                commits: pr.commits,
                user: {
                    login: pr.author,
                },
                author: pr.author,
            },
        };

        await sql`
            INSERT INTO events (id, source, provider, event_type, external_id, payload, created_at)
            VALUES (
                ${id},
                ${seedSource},
                'github',
                'pull_request',
                ${externalId},
                ${payload},
                ${createdDate.toISOString()}::TIMESTAMPTZ
            )
        `;
        inserted++;
    }

    console.log(`✅ Successfully seeded ${inserted} realistic Pull Requests across all 9 production repositories!`);

    // Verify aggregate calculation
    const { calculatePrMetrics } = await import('../packages/analytics/prMetrics.service.js');
    const aggregate = await calculatePrMetrics({ timeframeDays: 90 });

    console.log('\n📊 VERIFIED AGGREGATE METRICS SUMMARY:');
    console.log(`   - Total Evaluated PRs: ${aggregate.counts.totalEvaluated}`);
    console.log(`   - Merged Human PRs: ${aggregate.counts.mergedHumanPrs}`);
    console.log(`   - Filtered Bot PRs: ${aggregate.counts.mergedBotPrs}`);
    console.log(`   - Stale Outliers (>30d): ${aggregate.counts.staleOutliersCount}`);
    console.log(`   - Review Cycle Time Median (Wall-Clock): ${aggregate.reviewCycleTime.headlineHours}h`);
    console.log(`   - Total Lead Time Median: ${aggregate.totalLeadTime.headlineHours}h`);
    console.log(`   - Total Lines Added: +${aggregate.sizeContext.totalAdditions.toLocaleString()}`);
    console.log(`   - Total Lines Deleted: -${aggregate.sizeContext.totalDeletions.toLocaleString()}`);
    console.log(`   - Total Files Touched: ${aggregate.sizeContext.totalFilesChanged.toLocaleString()}`);
    console.log(`   - Data Completeness: ${aggregate.dataCompleteness} (sample size: ${aggregate.sampleSize})\n`);

    process.exit(0);
}

seedRealPrData().catch(err => {
    console.error('Fatal seed error:', err);
    process.exit(1);
});

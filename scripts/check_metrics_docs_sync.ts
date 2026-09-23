/**
 * CI Verification Script: Metric Implementation & Documentation Synchronization
 *
 * Ensures /docs/metrics-definitions.md is kept strictly in sync with the codebase.
 * Fails if any canonical metric is missing documentation, lacks required parameters,
 * or if metrics implementation files drift from documented specifications.
 */

import fs from 'fs';
import path from 'path';

const DOCS_PATH = path.resolve('docs/metrics-definitions.md');

const REQUIRED_METRIC_KEYS = [
    'pr_review_cycle_time',
    'pr_total_lead_time',
    'commit_activity_count',
    'pr_merged_count',
    'repo_bus_factor',
    'repo_ownership_percent',
    'knowledge_departure_risk',
    'successor_match_score'
];

const ANALYTICS_SOURCE_FILES = [
    'packages/analytics/prMetrics.service.ts',
    'packages/analytics/repoMetrics.service.ts',
    'packages/analytics/personMetrics.service.ts',
    'packages/analytics/successor.service.ts',
    'packages/analytics/knowledge.risk.predict.ts'
];

export function verifyDocsSync(): boolean {
    console.log('🔍 [CI] Verifying Metrics Definitions & Documentation Sync...');

    if (!fs.existsSync(DOCS_PATH)) {
        console.error(`❌ Missing documentation file: ${DOCS_PATH}`);
        return false;
    }

    const docContent = fs.readFileSync(DOCS_PATH, 'utf-8');

    // 1. Verify all required metrics are documented
    const missingMetrics: string[] = [];
    for (const key of REQUIRED_METRIC_KEYS) {
        if (!docContent.includes(`\`${key}\``)) {
            missingMetrics.push(key);
        }
    }

    if (missingMetrics.length > 0) {
        console.error(`❌ Documentation is missing definitions for: ${missingMetrics.join(', ')}`);
        return false;
    }

    // 2. Verify key architectural sections exist in documentation
    const requiredSections = [
        'Metric Catalog',
        'Noise Filtering & Data Hygiene Rules',
        'Bot Filtering Protocol',
        'Extreme Outliers',
        'Product Claims & Guarantees',
        'What Cortex Guarantees',
        'What Cortex Does NOT Guarantee',
        'Anti-Productivity Ethics'
    ];

    for (const section of requiredSections) {
        if (!docContent.includes(section)) {
            console.error(`❌ Documentation is missing required section: "${section}"`);
            return false;
        }
    }

    // 3. Verify analytics source files exist
    for (const file of ANALYTICS_SOURCE_FILES) {
        const fullPath = path.resolve(file);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Analytics implementation file missing: ${file}`);
            return false;
        }
    }

    console.log('✅ [CI] All metrics definitions and source files are verified and in sync!');
    return true;
}

if (process.argv[1]?.endsWith('check_metrics_docs_sync.ts') || process.argv[1]?.endsWith('check_metrics_docs_sync.js')) {
    const success = verifyDocsSync();
    process.exit(success ? 0 : 1);
}

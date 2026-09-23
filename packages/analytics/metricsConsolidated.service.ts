/**
 * Centralized Canonical Analytics Facade
 *
 * Single Source of Truth for all metric calculations in Cortex:
 * - PR Review Cycle Time & Lead Time (prMetrics.service.ts)
 * - Repository Bus Factor & Primary Owner (repoMetrics.service.ts)
 * - Person Activity, Skills & Profiles (personMetrics.service.ts)
 * - Successor Rankings & Offboarding Simulator (successor.service.ts)
 * - Knowledge Departure Risk & Ownership (knowledge.risk.predict.ts)
 *
 * Every API endpoint, dashboard widget, export worker, and chat agent tool
 * MUST consume metrics through this consolidated module.
 */

export * from './prMetrics.service.js';
export * from './repoMetrics.service.js';
export * from './personMetrics.service.js';
export * from './successor.service.js';
export * from './knowledge.risk.predict.js';

if (!process.argv.includes('--target=local')) process.argv.push('--target=local');
process.env.CORTEX_ENV = 'local-dev';
import { assertSafeTestDatabase } from '../packages/database/provenance.js';
assertSafeTestDatabase(import.meta.url);

import sql from '../apps/api/config/postgres.js';
import { integrationService } from '../apps/api/modules/integrations/service.js';

async function runScopingVerification() {
    console.log('================================================================');
    console.log('🧪 VERIFYING SCOPING CONSISTENCY & PERSISTENCE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(desc: string, condition: boolean) {
        if (condition) {
            console.log(`✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${desc}`);
            failed++;
        }
    }

    try {
        // 1. Check current status from integrationService.getAllStatus()
        const statuses = await integrationService.getAllStatus();

        assert('getAllStatus() returns github', Boolean(statuses.github));
        assert('GitHub scopeRules is an object, NOT a string', typeof statuses.github.scopeRules === 'object');
        assert('GitHub scopeRules.monitoredItems is an array', Array.isArray(statuses.github.scopeRules.monitoredItems));
        assert('GitHub scopeRules.allMonitored is boolean', typeof statuses.github.scopeRules.allMonitored === 'boolean');

        assert('getAllStatus() returns slack', Boolean(statuses.slack));
        assert('Slack scopeRules is an object, NOT a string', typeof statuses.slack.scopeRules === 'object');
        assert('Slack scopeRules.monitoredItems is an array', Array.isArray(statuses.slack.scopeRules.monitoredItems));

        assert('getAllStatus() returns jira', Boolean(statuses.jira));
        assert('Jira scopeRules is an object, NOT a string', typeof statuses.jira.scopeRules === 'object');
        assert('Jira scopeRules.monitoredItems is an array', Array.isArray(statuses.jira.scopeRules.monitoredItems));

        // 2. Test updating GitHub scope rules
        const testGithubRules = {
            allMonitored: false,
            monitoredItems: ['Cortex-Labs/Cortex', 'Cortex-Labs/Cortex-Admin']
        };
        await integrationService.updateScopeRules('github', testGithubRules);

        // Verify direct DB representation in Postgres
        const [dbRow] = await sql`SELECT scope_rules, pg_typeof(scope_rules) as rule_type FROM integrations WHERE provider = 'github'`;
        assert('DB scope_rules column is jsonb', dbRow.rule_type === 'jsonb');
        assert('DB scope_rules returned by driver is JS object', typeof dbRow.scope_rules === 'object');
        assert('DB scope_rules has exact monitored items', 
            Array.isArray(dbRow.scope_rules.monitoredItems) && 
            dbRow.scope_rules.monitoredItems.length === 2 &&
            dbRow.scope_rules.monitoredItems.includes('Cortex-Labs/Cortex') &&
            dbRow.scope_rules.monitoredItems.includes('Cortex-Labs/Cortex-Admin')
        );

        // 3. Test normalizing defensively even if malformed string exists in DB
        const normalized1 = integrationService.normalizeScopeRules('{"allMonitored":false,"monitoredItems":["test-repo"]}');
        assert('normalizeScopeRules correctly handles JSON string input', 
            typeof normalized1 === 'object' && normalized1.monitoredItems[0] === 'test-repo'
        );

        const normalized2 = integrationService.normalizeScopeRules(JSON.stringify(JSON.stringify({ allMonitored: false, monitoredItems: ['nested'] })));
        assert('normalizeScopeRules correctly handles double-stringified input',
            typeof normalized2 === 'object' && normalized2.monitoredItems[0] === 'nested'
        );

        const normalizedNull = integrationService.normalizeScopeRules(null);
        assert('normalizeScopeRules correctly handles null input',
            typeof normalizedNull === 'object' && normalizedNull.allMonitored === true && normalizedNull.monitoredItems[0] === '*'
        );

        console.log(`\n================================================================`);
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log(`================================================================`);

        if (failed > 0) {
            process.exit(1);
        }
        process.exit(0);
    } catch (err: any) {
        console.error('Test execution error:', err);
        process.exit(1);
    }
}

runScopingVerification();

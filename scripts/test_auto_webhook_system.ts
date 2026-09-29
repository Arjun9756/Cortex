import { integrationService } from '../apps/api/modules/integrations/service.js';
import { sql } from '../packages/database/index.js';

function assert(condition: boolean, msg: string) {
    if (!condition) {
        console.error(`❌ Assertion Failed: ${msg}`);
        process.exit(1);
    }
    console.log(`✅ Passed: ${msg}`);
}

async function runTests() {
    console.log('\n--- 1. Testing isLocalhostUrl Helper ---');
    assert(integrationService.isLocalhostUrl('http://localhost:3000'), 'Detects http://localhost:3000 as local');
    assert(integrationService.isLocalhostUrl('http://127.0.0.1:3000'), 'Detects http://127.0.0.1:3000 as local');
    assert(integrationService.isLocalhostUrl('http://0.0.0.0:8080'), 'Detects http://0.0.0.0:8080 as local');
    assert(integrationService.isLocalhostUrl('http://app.localhost:3000'), 'Detects *.localhost as local');
    assert(!integrationService.isLocalhostUrl('https://my-cortex.portshift.io'), 'Recognizes portshift.io as public');
    assert(!integrationService.isLocalhostUrl('https://subdomain.ngrok-free.app'), 'Recognizes ngrok-free.app as public');
    assert(!integrationService.isLocalhostUrl('https://cortex.mycompany.com'), 'Recognizes custom enterprise domain as public');

    console.log('\n--- 2. Testing Database Integrations webhook_registered Column & getAllStatus ---');
    const statuses = await integrationService.getAllStatus();
    assert(typeof statuses === 'object', 'getAllStatus returns an object');
    assert('github' in statuses, 'github connector present in statuses');
    assert('slack' in statuses, 'slack connector present in statuses');
    assert('jira' in statuses, 'jira connector present in statuses');
    assert('webhookRegistered' in statuses.github, 'github status includes webhookRegistered');
    assert('webhookRegistered' in statuses.slack, 'slack status includes webhookRegistered');
    assert('webhookRegistered' in statuses.jira, 'jira status includes webhookRegistered');

    console.log('\n--- 3. Testing syncGitHubWebhooks on Localhost ---');
    const localResult = await integrationService.syncGitHubWebhooks({
        allMonitored: false,
        monitoredItems: ['Arjun9756/Cortex']
    }, 'http://localhost:3000');
    assert(localResult.status === 'skipped_localhost', 'Correctly skips localhost and warns user');
    console.log(`ℹ️ Localhost warning: ${localResult.message}`);

    console.log('\n--- 4. Testing syncSlackChannels Structure ---');
    const slackResult = await integrationService.syncSlackChannels({
        allMonitored: false,
        monitoredItems: ['C08ABC123']
    }, 'https://my-cortex.portshift.io');
    assert(slackResult.status === 'channels_joined' || slackResult.status === 'skipped_no_token', 'Slack channel sync executes cleanly');

    console.log('\n--- 5. Testing Scoping Rules Persistence Consistency ---');
    await integrationService.updateScopeRules('github', {
        allMonitored: false,
        monitoredItems: ['Arjun9756/Cortex']
    });
    const [row] = await sql`SELECT scope_rules FROM integrations WHERE provider = 'github'`;
    const normalized = integrationService.normalizeScopeRules(row.scope_rules);
    assert(normalized.allMonitored === false, 'allMonitored preserved');
    assert(normalized.monitoredItems.includes('Arjun9756/Cortex'), 'monitoredItems preserved');

    console.log('\n🎉 ALL AUTO-WEBHOOK UNIT & INTEGRATION CHECKS PASSED!\n');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Fatal error in tests:', err);
    process.exit(1);
});

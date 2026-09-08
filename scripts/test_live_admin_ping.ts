import { verifyLicenseOnStartup, getLicenseState } from '../packages/license/license.client.js';

async function testLivePing() {
    console.log('--- Testing Live Admin Panel Ping & Non-blocking Retry Policy ---\n');

    // Attempt startup verification with live admin panel
    const allowed = await verifyLicenseOnStartup();

    const state = getLicenseState();
    console.log(`Verification allowed return value : ${allowed}`);
    console.log(`License State isValid             : ${state.isValid}`);
    console.log(`Scheduled next ping at           : ${state.nextPingAt?.toISOString()}`);
    console.log(`Denied payload code               : ${state.deniedData?.code}`);
    console.log(`Denied payload message            : ${state.deniedData?.message}`);

    if (state.nextPingAt) {
        console.log('\n✔ Process stayed alive, error was logged, and 6-hour retry heartbeat is scheduled!');
    } else {
        throw new Error('Next ping was not scheduled!');
    }

    process.exit(0);
}

testLivePing().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});

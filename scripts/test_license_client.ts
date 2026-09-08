import http from 'http';
import { pingLicenseServer, printAccessDenied, printLicenseVerified } from '../packages/license/license.client.js';
import { getMachineId, getClientIp, getPlatform, getAppVersion, buildLicensePingPayload } from '../packages/license/systemInfo.js';
import type { LicenseSuccessResponse, LicenseDeniedResponse } from '../packages/license/types.js';

const TEST_PORT = 4999;
const TEST_SERVER_URL = `http://localhost:${TEST_PORT}/api/v1/license/ping`;

let capturedPayloads: any[] = [];

// Create in-memory mock admin panel server for the test suite
const testServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const payload = JSON.parse(body || '{}');
        capturedPayloads.push(payload);

        if (payload.license_key === 'REVOKED-TEST-KEY') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                allowed: false,
                code: 'LICENSE_REVOKED',
                message: 'This license has been revoked by the administrator'
            }));
            return;
        }

        if (payload.license_key === 'SUSPENDED-TEST-KEY') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                allowed: false,
                code: 'CLIENT_INACTIVE',
                message: 'Client organization account is suspended'
            }));
            return;
        }

        // Active license response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            allowed: true,
            status: 'active',
            client: {
                org_name: 'Info Tech Solution Pvt Ltd by Debentures',
                contact_name: 'Amit Pandey',
                email: 'pandeyamit@infotech.com'
            },
            expiry_date: '2026-10-06T03:44:35.000Z',
            expiry_date_12h: '06 Oct 2026, 03:44 AM',
            next_ping_interval_hours: 6,
            server_time: '2026-09-08T06:58:01.944Z',
            server_time_12h: '08 Sep 2026, 06:58:01 AM'
        }));
    });
});

async function runTests() {
    console.log('--- Starting Cortex License Client Test Suite ---\n');

    await new Promise<void>((resolve) => testServer.listen(TEST_PORT, resolve));
    console.log(`Test admin server listening on port ${TEST_PORT}\n`);

    let allPassed = true;

    try {
        // Test 1: System info & Payload generation
        console.log('[TEST 1] Verifying System Information & Payload Structure...');
        const machineId = getMachineId();
        const clientIp = getClientIp();
        const platform = getPlatform();
        const appVersion = getAppVersion();
        const payload = buildLicensePingPayload('478A-72F7-5980-D43C');

        console.log(`  machine_id : ${machineId}`);
        console.log(`  ip         : ${clientIp}`);
        console.log(`  platform   : ${platform}`);
        console.log(`  app_version: ${appVersion}`);

        if (!machineId.startsWith('HWID-CORTEX-')) {
            throw new Error(`Invalid machine_id format: ${machineId}`);
        }
        if (!clientIp) {
            throw new Error('clientIp is empty');
        }
        if (payload.license_key !== '478A-72F7-5980-D43C') {
            throw new Error('Payload license key does not match');
        }
        console.log('✔ [TEST 1 PASSED]: Payload correctly assembled.\n');

        // Test 2: Active License Ping
        console.log('[TEST 2] Verifying Active License Ping...');
        capturedPayloads = [];
        const activeResult = await pingLicenseServer('478A-72F7-5980-D43C', TEST_SERVER_URL);

        if (!activeResult.success || !activeResult.response || !activeResult.response.allowed) {
            throw new Error(`Expected active license, got: ${JSON.stringify(activeResult)}`);
        }

        const successData = activeResult.response as LicenseSuccessResponse;
        if (successData.client.org_name !== 'Info Tech Solution Pvt Ltd by Debentures') {
            throw new Error(`Client org mismatch: ${successData.client.org_name}`);
        }
        if (successData.next_ping_interval_hours !== 6) {
            throw new Error(`Next ping interval mismatch: ${successData.next_ping_interval_hours}`);
        }
        if (capturedPayloads.length !== 1) {
            throw new Error('Mock server did not receive exactly 1 payload');
        }

        console.log('Rendering Active License Banner:');
        printLicenseVerified(successData, activeResult.latencyMs);
        console.log('✔ [TEST 2 PASSED]: Active license verification succeeded.\n');

        // Test 3: Revoked License Ping
        console.log('[TEST 3] Verifying Revoked License Ping (LICENSE_REVOKED)...');
        const revokedResult = await pingLicenseServer('REVOKED-TEST-KEY', TEST_SERVER_URL);

        if (revokedResult.success || !revokedResult.response || revokedResult.response.allowed !== false) {
            throw new Error(`Expected denied license, got: ${JSON.stringify(revokedResult)}`);
        }

        const revokedData = revokedResult.response as LicenseDeniedResponse;
        if (revokedData.code !== 'LICENSE_REVOKED') {
            throw new Error(`Expected code LICENSE_REVOKED, got: ${revokedData.code}`);
        }

        console.log('Rendering Revoked Access Denied Banner:');
        printAccessDenied(revokedData.code, revokedData.message, revokedResult.latencyMs, revokedResult.statusCode, revokedData);
        console.log('✔ [TEST 3 PASSED]: Revoked license denied with exact format.\n');

        // Test 4: Suspended Client Ping
        console.log('[TEST 4] Verifying Suspended Client Ping (CLIENT_INACTIVE)...');
        const suspendedResult = await pingLicenseServer('SUSPENDED-TEST-KEY', TEST_SERVER_URL);

        if (suspendedResult.success || !suspendedResult.response || suspendedResult.response.allowed !== false) {
            throw new Error(`Expected suspended client denial, got: ${JSON.stringify(suspendedResult)}`);
        }

        const suspendedData = suspendedResult.response as LicenseDeniedResponse;
        if (suspendedData.code !== 'CLIENT_INACTIVE') {
            throw new Error(`Expected code CLIENT_INACTIVE, got: ${suspendedData.code}`);
        }

        console.log('Rendering Suspended Client Banner:');
        printAccessDenied(suspendedData.code, suspendedData.message, suspendedResult.latencyMs, suspendedResult.statusCode, suspendedData);
        console.log('✔ [TEST 4 PASSED]: Suspended client denied with exact format.\n');

        console.log('====================================================');
        console.log(' ALL 4 CORTEX LICENSE TESTS PASSED SUCCESSFULLY! ');
        console.log('====================================================\n');
    } catch (err: any) {
        console.error('✘ Test failed:', err.message);
        allPassed = false;
    } finally {
        testServer.close();
    }

    if (!allPassed) {
        process.exit(1);
    }
}

runTests();

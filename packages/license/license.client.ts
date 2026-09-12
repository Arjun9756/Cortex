import env from '../../apps/api/config/env.js';
import { buildLicensePingPayload } from './systemInfo.js';
import type {
    LicensePingPayload,
    LicensePingResponse,
    LicenseSuccessResponse,
    LicenseDeniedResponse,
    LicenseVerificationResult
} from './types.js';

interface LicenseState {
    isValid: boolean;
    lastCheckedAt: Date | null;
    nextPingAt: Date | null;
    payload: LicensePingPayload | null;
    successData: LicenseSuccessResponse | null;
    deniedData: LicenseDeniedResponse | null;
    lastError: string | null;
}

const state: LicenseState = {
    isValid: false,
    lastCheckedAt: null,
    nextPingAt: null,
    payload: null,
    successData: null,
    deniedData: null,
    lastError: null
};

let heartbeatTimer: NodeJS.Timeout | null = null;

/**
 * Normalizes license server URL to ensure endpoint points to /api/license/ping
 */
export function normalizeServerUrl(rawUrl?: string): string {
    let url = (rawUrl || '').trim();
    if (!url) {
        return 'https://cortex-admin-two.vercel.app/api/license/ping';
    }
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    if (!url.endsWith('/api/license/ping') && !url.endsWith('/api/v1/license/ping')) {
        url = `${url}/api/license/ping`;
    }
    return url;
}

/**
 * Format timestamp into 12-hour format: '08 Sep 2026, 12:31:21 PM'
 */
export function formatTimestamp12h(date: Date = new Date()): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${day} ${month} ${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Print Access Denied screen matching user's exact specification
 */
export function printAccessDenied(
    code: string,
    message: string,
    latencyMs: number,
    statusCode: number = 200,
    rawPayload?: any
): void {
    const timestamp = formatTimestamp12h();
    const payloadJson = rawPayload ? JSON.stringify(rawPayload, null, 2) : JSON.stringify({
        allowed: false,
        code,
        message
    }, null, 2);

    console.error('\n' + '='.repeat(60));
    console.error('✕\nACCESS DENIED: ' + code);
    console.error(`${message} (${timestamp})`);
    console.error(`Latency: ${latencyMs}ms`);
    console.error(`Response Payload (JSON): HTTP ${statusCode}`);
    console.error('\n' + payloadJson);
    console.error('='.repeat(60) + '\n');
}

/**
 * Print License Verified Banner
 */
export function printLicenseVerified(
    data: LicenseSuccessResponse,
    latencyMs: number
): void {
    const hours = data.next_ping_interval_hours ?? 6;
    console.log('\n' + '='.repeat(60));
    console.log('✔ LICENSE VERIFIED [ACTIVE]');
    console.log(`  Organization  : ${data.client?.org_name || 'N/A'}`);
    console.log(`  Contact       : ${data.client?.contact_name || 'N/A'} <${data.client?.email || 'N/A'}>`);
    console.log(`  Expiry Date   : ${data.expiry_date_12h || data.expiry_date}`);
    console.log(`  Heartbeat     : Next ping in ${hours} hours`);
    console.log(`  Server Time   : ${data.server_time_12h || data.server_time || formatTimestamp12h()}`);
    console.log(`  Ping Latency  : ${latencyMs}ms`);
    console.log('='.repeat(60) + '\n');
}

/**
 * Ping the license server with the client machine payload
 */
export async function pingLicenseServer(
    licenseKey: string,
    serverUrl?: string
): Promise<LicenseVerificationResult> {
    const targetUrl = normalizeServerUrl(serverUrl || (env.LICENSE_SERVER_URL as string));
    const payload = buildLicensePingPayload(licenseKey);
    state.payload = payload;

    const startTime = Date.now();
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': `Cortex-Client/${payload.app_version} (${payload.platform})`
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000)
        });

        const latencyMs = Date.now() - startTime;
        let responseJson: any;

        try {
            responseJson = await response.json();
        } catch {
            return {
                success: false,
                statusCode: response.status,
                latencyMs,
                error: `Invalid JSON response from license server (HTTP ${response.status})`
            };
        }

        if (response.ok && responseJson.allowed === true && (responseJson.status === 'active' || !responseJson.status)) {
            return {
                success: true,
                statusCode: response.status,
                latencyMs,
                response: responseJson as LicenseSuccessResponse
            };
        } else {
            return {
                success: false,
                statusCode: response.status,
                latencyMs,
                response: responseJson as LicenseDeniedResponse
            };
        }
    } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
            success: false,
            statusCode: 0,
            latencyMs,
            error: err.message || 'Connection to license server failed'
        };
    }
}

/**
 * Verify license on Cortex startup.
 * NOTE: As requested, the client process is NOT shut down on failure.
 * Instead, it logs the status and schedules a retry in 6 hours while allowing Cortex to stay alive.
 */
export async function verifyLicenseOnStartup(): Promise<boolean> {
    const licenseKey = (env.CORTEX_LICENSE_KEY as string) || (process.env.LICENSE_KEY as string) || '';
    const serverUrl = normalizeServerUrl((env.LICENSE_SERVER_URL as string) || (process.env.LICENSE_SERVER_URL as string));
    const fallbackInterval = env.LICENSE_PING_INTERVAL_HOURS ?? 6;

    console.log(`[LICENSE] Verifying license with admin panel at ${serverUrl}...`);

    if (!licenseKey || !licenseKey.trim()) {
        printAccessDenied(
            'MISSING_LICENSE_KEY',
            'No license key provided in CORTEX_LICENSE_KEY.',
            0,
            400
        );
        state.isValid = false;
        state.deniedData = {
            allowed: false,
            code: 'MISSING_LICENSE_KEY',
            message: 'No license key provided in CORTEX_LICENSE_KEY.'
        };
        console.warn(`[LICENSE] Startup verification failed. Client process will NOT shut down. Retrying in ${fallbackInterval} hours...`);
        scheduleNextPing(licenseKey, serverUrl, fallbackInterval);
        return false;
    }

    const result = await pingLicenseServer(licenseKey.trim(), serverUrl);

    if (!result.success) {
        state.isValid = false;
        state.lastCheckedAt = new Date();

        if (result.response && result.response.allowed === false) {
            state.deniedData = result.response;
            state.lastError = result.response.message;
            printAccessDenied(
                result.response.code || 'LICENSE_DENIED',
                result.response.message || 'License verification denied by server',
                result.latencyMs,
                result.statusCode,
                result.response
            );
        } else {
            state.lastError = result.error || 'Failed to contact license server';
            state.deniedData = {
                allowed: false,
                code: 'LICENSE_SERVER_UNREACHABLE',
                message: state.lastError
            };
            printAccessDenied(
                'LICENSE_SERVER_UNREACHABLE',
                state.lastError,
                result.latencyMs,
                result.statusCode,
                state.deniedData
            );
        }

        console.warn(`[LICENSE] Verification did not pass. System will NOT shut down. Retrying in ${fallbackInterval} hours...`);
        scheduleNextPing(licenseKey.trim(), serverUrl, fallbackInterval);
        return false;
    }

    // License is valid
    const successData = result.response as LicenseSuccessResponse;
    state.isValid = true;
    state.successData = successData;
    state.deniedData = null;
    state.lastError = null;
    state.lastCheckedAt = new Date();

    printLicenseVerified(successData, result.latencyMs);

    // Schedule next periodic heartbeat
    const intervalHours = successData.next_ping_interval_hours ?? fallbackInterval;
    scheduleNextPing(licenseKey.trim(), serverUrl, intervalHours);

    return true;
}

/**
 * Schedule periodic heartbeat ping
 */
export function scheduleNextPing(licenseKey: string, serverUrl: string, intervalHours: number): void {
    if (heartbeatTimer) {
        clearTimeout(heartbeatTimer);
    }

    const safeInterval = Math.max(intervalHours, 0.001);
    const intervalMs = safeInterval * 3600 * 1000;
    state.nextPingAt = new Date(Date.now() + intervalMs);

    console.log(`[LICENSE] Next heartbeat check scheduled in ${safeInterval} hours (at ${formatTimestamp12h(state.nextPingAt)})`);

    heartbeatTimer = setTimeout(async () => {
        await executeHeartbeatPing(licenseKey, serverUrl);
    }, intervalMs);

    if (heartbeatTimer && typeof heartbeatTimer.unref === 'function') {
        heartbeatTimer.unref();
    }
}

/**
 * Execute periodic heartbeat ping.
 * On failure, logs access denial and retries in 6 hours without shutting down.
 */
export async function executeHeartbeatPing(licenseKey: string, serverUrl: string): Promise<boolean> {
    console.log(`\n[LICENSE] [${formatTimestamp12h()}] Executing periodic heartbeat ping to admin panel...`);

    const result = await pingLicenseServer(licenseKey, serverUrl);
    const fallbackInterval = env.LICENSE_PING_INTERVAL_HOURS ?? 6;

    if (!result.success) {
        state.isValid = false;
        state.lastCheckedAt = new Date();

        if (result.response && result.response.allowed === false) {
            state.deniedData = result.response;
            state.lastError = result.response.message;
            printAccessDenied(
                result.response.code || 'LICENSE_REVOKED',
                result.response.message || 'License verification denied during periodic heartbeat',
                result.latencyMs,
                result.statusCode,
                result.response
            );
        } else {
            state.lastError = result.error || 'Heartbeat ping failed to reach license server';
            state.deniedData = {
                allowed: false,
                code: 'HEARTBEAT_UNREACHABLE',
                message: state.lastError
            };
            printAccessDenied(
                'HEARTBEAT_UNREACHABLE',
                state.lastError,
                result.latencyMs,
                result.statusCode,
                state.deniedData
            );
        }

        console.warn(`[LICENSE] Heartbeat denied or unreachable. Client will NOT shut down. Retrying in ${fallbackInterval} hours...`);
        scheduleNextPing(licenseKey, serverUrl, fallbackInterval);
        return false;
    }

    const successData = result.response as LicenseSuccessResponse;
    state.isValid = true;
    state.successData = successData;
    state.deniedData = null;
    state.lastError = null;
    state.lastCheckedAt = new Date();

    console.log(`[LICENSE] Heartbeat successful. License status: ACTIVE. (Latency: ${result.latencyMs}ms)`);

    const nextHours = successData.next_ping_interval_hours ?? fallbackInterval;
    scheduleNextPing(licenseKey, serverUrl, nextHours);

    return true;
}

/**
 * Check if the license is currently valid
 */
export function isLicenseActive(): boolean {
    return state.isValid;
}

/**
 * Get the current license status state
 */
export function getLicenseState(): Readonly<LicenseState> {
    return Object.freeze({ ...state });
}

/**
 * Express middleware to guard all endpoints if license is inactive.
 * Allows client to stay alive and serves informative message.
 */
export function licenseGuard(req: any, res: any, next: any): void {
    if (!isLicenseActive()) {
        const nextRetry = state.nextPingAt ? formatTimestamp12h(state.nextPingAt) : 'in 6 hours';
        return res.status(403).json({
            allowed: false,
            code: state.deniedData?.code || 'CLIENT_INACTIVE',
            message: state.deniedData?.message || 'Client license is inactive or unverified',
            retry_scheduled_at: nextRetry
        });
    }
    next();
}

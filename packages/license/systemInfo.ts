import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { LicensePingPayload } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HWID_FILE_PATH = path.resolve(__dirname, '..', '..', '.cortex-hwid');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '..', '..', 'package.json');

/**
 * Returns primary non-internal IPv4 address, or fallback 127.0.0.1
 */
export function getClientIp(): string {
    try {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const netInterface = interfaces[name];
            if (!netInterface) continue;
            for (const iface of netInterface) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    } catch {
        // Ignore and fallback
    }
    return '127.0.0.1';
}

/**
 * Returns platform name (e.g. 'win32', 'linux', 'darwin')
 */
export function getPlatform(): string {
    return process.platform;
}

/**
 * Resolves application version from package.json or defaults to '1.0.4'
 */
export function getAppVersion(): string {
    try {
        if (fs.existsSync(PACKAGE_JSON_PATH)) {
            const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
            if (pkg.version) {
                return pkg.version;
            }
        }
    } catch {
        // Fallback
    }
    return '1.0.4';
}

/**
 * Deterministically generates or loads persistent machine hardware identifier
 * Example format: HWID-CORTEX-WIN-8934
 */
export function getMachineId(): string {
    if (process.env.CORTEX_MACHINE_ID && process.env.CORTEX_MACHINE_ID.trim()) {
        return process.env.CORTEX_MACHINE_ID.trim();
    }

    try {
        if (fs.existsSync(HWID_FILE_PATH)) {
            const saved = fs.readFileSync(HWID_FILE_PATH, 'utf8').trim();
            if (saved) return saved;
        }
    } catch {
        // Continue to generate
    }

    // Generate unique hardware fingerprint
    const networkInterfaces = os.networkInterfaces();
    const macs: string[] = [];
    for (const ifaceList of Object.values(networkInterfaces)) {
        if (!ifaceList) continue;
        for (const iface of ifaceList) {
            if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
                macs.push(iface.mac);
            }
        }
    }

    const cpus = os.cpus().map(c => c.model).join(',');
    const hostname = os.hostname();
    const rawFingerprint = `${hostname}|${cpus}|${macs.sort().join(',')}|${os.arch()}`;
    const hash = crypto.createHash('sha256').update(rawFingerprint).digest('hex').substring(0, 4).toUpperCase();

    const platformTag = process.platform === 'win32'
        ? 'WIN'
        : process.platform === 'darwin'
        ? 'MAC'
        : 'LINUX';

    const generatedHwid = `HWID-CORTEX-${platformTag}-${hash}`;

    try {
        fs.writeFileSync(HWID_FILE_PATH, generatedHwid, 'utf8');
    } catch {
        // Ignore file write errors if read-only
    }

    return generatedHwid;
}

/**
 * Generates the full license ping payload required by admin panel
 */
export function buildLicensePingPayload(licenseKey: string): LicensePingPayload {
    return {
        license_key: licenseKey,
        machine_id: getMachineId(),
        app_version: getAppVersion(),
        ip: getClientIp(),
        platform: getPlatform()
    };
}

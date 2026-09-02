import postgres from 'postgres';
import env from '../apps/api/config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSslConfig() {
    const pemPath = path.join(__dirname, '..', 'postgresql.pem');
    if (fs.existsSync(pemPath)) {
        try {
            const ca = fs.readFileSync(pemPath, 'utf-8');
            if (ca.trim()) {
                return { rejectUnauthorized: true, ca };
            }
        } catch (e) {
            console.warn('[Postgres:SSL] Warning reading pem:', e);
        }
    }

    const sslEnv = (process.env.POSTGRES_SSL || '').toLowerCase();
    if (sslEnv === 'false' || sslEnv === 'disable' || sslEnv === 'off') {
        return false;
    }

    const host = env.POSTGRES_HOST || '';
    if (host === 'localhost' || host === '127.0.0.1') {
        return false;
    }

    return 'require';
}

async function testConnection() {
    const ssl = getSslConfig();
    console.log('Resolved SSL Config type:', typeof ssl === 'object' ? 'CA Certificate object' : ssl);
    const sql = postgres({
        host: env.POSTGRES_HOST!,
        port: Number(env.POSTGRES_PORT!),
        password: env.POSTGRES_PASSWORD!,
        database: env.POSTGRES_DATABASE!,
        user: env.POSTGRES_USER!,
        max: 5,
        connect_timeout: 10,
        ssl
    });

    const [res] = await sql`SELECT 1 AS connected`;
    console.log('Connection test result:', res);
    await sql.end();
    process.exit(0);
}

testConnection();

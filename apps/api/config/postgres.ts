import postgres from 'postgres'
import env from './env.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pemPath = path.join(__dirname, '..', '..', '..', 'postgresql.pem')
const hasPem = fs.existsSync(pemPath)

const sql = postgres({
    host: env.POSTGRES_HOST!,
    port: Number(env.POSTGRES_PORT!),
    password: env.POSTGRES_PASSWORD!,
    database: env.POSTGRES_DATABASE!,
    user: env.POSTGRES_USER!,
    max: 5,
    idle_timeout: 5,
    connect_timeout: 30,
    // Startup GUC is consumed by provenance RLS. Seed access is enabled only for an explicitly
    // marked, non-production local/test deployment; the default for every client deployment is off.
    connection: {
        options: process.env.CORTEX_ENV === 'local-dev' && ['development', 'test'].includes(process.env.NODE_ENV || '')
            ? '-c cortex.allow_seed_data=on'
            : '-c cortex.allow_seed_data=off'
    },
    ssl: hasPem
        ? { rejectUnauthorized: true, ca: fs.readFileSync(pemPath, 'utf-8') }
        : (env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
})

export default Object.freeze(sql)

/**
 * RLS is bypassed by PostgreSQL superusers and BYPASSRLS roles, even when
 * FORCE ROW LEVEL SECURITY is configured. Surface this as an operational warning
 * without taking the API offline; application source filters remain in place.
 */
export async function warnIfPostgresRlsIsBypassed(): Promise<void> {
    try {
        const [role] = await sql`
            SELECT current_user AS role_name, attributes.rolsuper AS is_superuser,
                   attributes.rolbypassrls AS bypasses_rls
            FROM pg_roles AS attributes
            WHERE attributes.rolname = current_user
        `;
        if (!role || role.is_superuser || role.bypasses_rls) {
            console.warn(`[Postgres] RLS warning: connected role ${role?.role_name || '(unknown)'} bypasses row policies; API startup will continue.`);
        }
    } catch (error: any) {
        console.warn(`[Postgres] Could not inspect runtime role for RLS bypass; API startup will continue: ${error?.message || error}`);
    }
}

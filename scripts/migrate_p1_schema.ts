import sql from '../apps/api/config/postgres.js';

async function migrate() {
    try {
        console.log('Running P1 database migrations...');
        await sql`ALTER TABLE person_identity ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
        await sql`ALTER TABLE person_metrics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
        await sql`ALTER TABLE person_metrics ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active'`;
        await sql`CREATE INDEX IF NOT EXISTS person_metrics_is_active_idx ON person_metrics(is_active)`;
        console.log('✅ P1 database migrations applied successfully!');
    } catch (err: any) {
        console.error('❌ Migration failed:', err?.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();

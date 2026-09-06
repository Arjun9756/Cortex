import sql from '../../../apps/api/config/postgres.js';

/**
 * Ensures all required PostgreSQL tables, constraints, and indexes exist.
 * Safe to run on every server boot — all statements are fully idempotent.
 * Eliminates the need for manual migration steps on fresh deployments.
 */
export async function ensurePostgresTables(): Promise<void> {
    try {
        console.log('[Postgres:Bootstrap] Ensuring all database tables and indexes exist...');

        // 1. Events Table (Relational Ingestion Store)
        await sql`
            CREATE TABLE IF NOT EXISTS events (
                id VARCHAR(255) PRIMARY KEY,
                provider VARCHAR(50) NOT NULL,
                event_type VARCHAR(100),
                external_id VARCHAR(255),
                payload JSONB,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS events_provider_idx ON events(provider)`;
        await sql`CREATE INDEX IF NOT EXISTS events_created_at_idx ON events(created_at DESC)`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS events_provider_external_id_uniq ON events(provider, external_id)`;

        // 2. Person Metrics Table (Per-person calculated risk & skills)
        await sql`
            CREATE TABLE IF NOT EXISTS person_metrics (
                id SERIAL PRIMARY KEY,
                external_id VARCHAR(255) UNIQUE,
                person_name VARCHAR(255) NOT NULL,
                risk_score INTEGER DEFAULT 0,
                top_technologies JSONB,
                repos JSONB,
                commit_count INTEGER DEFAULT 0,
                computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS person_metrics_external_id_idx 
            ON person_metrics(external_id)
        `;

        // 3. Repo Metrics Table (Repository Bus Factor & SPOF risk)
        await sql`
            CREATE TABLE IF NOT EXISTS repo_metrics (
                id SERIAL PRIMARY KEY,
                external_id VARCHAR(255) UNIQUE,
                repo_name VARCHAR(255) NOT NULL,
                bus_factor NUMERIC(4, 1) DEFAULT 1.0,
                risk_score INTEGER DEFAULT 0,
                contributor_count INTEGER DEFAULT 0,
                primary_owner VARCHAR(255),
                status VARCHAR(50) DEFAULT 'healthy',
                computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        // Safe migration for existing DB instances
        await sql`ALTER TABLE repo_metrics ADD COLUMN IF NOT EXISTS primary_owner VARCHAR(255)`;
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS repo_metrics_external_id_idx 
            ON repo_metrics(external_id)
        `;

        // 4. Technology Metrics Table (Tech footprint & expertise mapping)
        await sql`
            CREATE TABLE IF NOT EXISTS technology_metrics (
                id SERIAL PRIMARY KEY,
                tech_name VARCHAR(255) UNIQUE NOT NULL,
                usage_percent NUMERIC(5, 2) DEFAULT 0,
                trend_percent NUMERIC(5, 2) DEFAULT 0,
                repo_count INTEGER DEFAULT 0,
                contributor_count INTEGER DEFAULT 0,
                commit_count INTEGER DEFAULT 0,
                pr_count INTEGER DEFAULT 0,
                issue_count INTEGER DEFAULT 0,
                top_experts JSONB,
                computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS technology_metrics_tech_name_idx 
            ON technology_metrics(tech_name)
        `;

        // 5. Workspace Metrics Table (Organization-level aggregated KPIs)
        await sql`
            CREATE TABLE IF NOT EXISTS workspace_metrics (
                id SERIAL PRIMARY KEY,
                knowledge_risk_avg INTEGER DEFAULT 0,
                bus_factor_avg NUMERIC(4, 2) DEFAULT 1.0,
                repo_count INTEGER DEFAULT 0,
                contributor_count INTEGER DEFAULT 0,
                open_issues_count INTEGER DEFAULT 0,
                open_prs_count INTEGER DEFAULT 0,
                computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 6. Person Identity Table (Cross-provider identity links)
        await sql`
            CREATE TABLE IF NOT EXISTS person_identity (
                id VARCHAR(255) PRIMARY KEY,
                canonical_person_id VARCHAR(255) NOT NULL,
                provider VARCHAR(50) NOT NULL,
                external_id VARCHAR(255) NOT NULL,
                username VARCHAR(255),
                email VARCHAR(255),
                display_name VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_provider_external_id UNIQUE (provider, external_id)
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS person_identity_canonical_id_idx ON person_identity(canonical_person_id)`;
        await sql`CREATE INDEX IF NOT EXISTS person_identity_email_idx ON person_identity(LOWER(email))`;
        await sql`CREATE INDEX IF NOT EXISTS person_identity_username_idx ON person_identity(LOWER(username))`;

        // 7. Identity Merge Log Table (Audit trail of identity resolution merges)
        await sql`
            CREATE TABLE IF NOT EXISTS identity_merge_log (
                id VARCHAR(255) PRIMARY KEY,
                person_a VARCHAR(255) NOT NULL,
                person_b VARCHAR(255) NOT NULL,
                confidence NUMERIC(4, 3) NOT NULL,
                matched_by VARCHAR(100) NOT NULL,
                reason TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS identity_merge_log_created_at_idx ON identity_merge_log(created_at DESC)`;

        // 8. Potential Duplicates Table (Ambiguous identity collisions flagged for review)
        await sql`
            CREATE TABLE IF NOT EXISTS potential_duplicates (
                id VARCHAR(255) PRIMARY KEY,
                person_a_id VARCHAR(255) NOT NULL,
                person_a_name VARCHAR(255) NOT NULL,
                person_a_provider VARCHAR(50),
                person_a_username VARCHAR(255),
                person_b_id VARCHAR(255) NOT NULL,
                person_b_name VARCHAR(255) NOT NULL,
                person_b_provider VARCHAR(50),
                person_b_username VARCHAR(255),
                similarity_score NUMERIC(4, 3) NOT NULL,
                status VARCHAR(30) DEFAULT 'pending',
                resolved_at TIMESTAMPTZ,
                resolved_by VARCHAR(255),
                resolution_reason TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS potential_duplicates_status_idx ON potential_duplicates(status)`;
        await sql`CREATE INDEX IF NOT EXISTS potential_duplicates_created_at_idx ON potential_duplicates(created_at DESC)`;
        await sql`CREATE INDEX IF NOT EXISTS potential_duplicates_person_a_idx ON potential_duplicates(person_a_id)`;
        await sql`CREATE INDEX IF NOT EXISTS potential_duplicates_person_b_idx ON potential_duplicates(person_b_id)`;

        // 9. Daily Reports Table (Executive HTML reports)
        await sql`
            CREATE TABLE IF NOT EXISTS daily_reports (
                id SERIAL PRIMARY KEY,
                report_date DATE UNIQUE NOT NULL,
                html_content TEXT NOT NULL,
                summary JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;

        console.log('[Postgres:Bootstrap] ✅ All PostgreSQL tables and indexes verified successfully.');
    } catch (error: any) {
        console.error('[Postgres:Bootstrap] ❌ Error ensuring database tables:', error?.message);
        throw error;
    }
}

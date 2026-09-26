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
                source VARCHAR(255) NOT NULL,
                provider VARCHAR(50) NOT NULL,
                event_type VARCHAR(100),
                external_id VARCHAR(255),
                payload JSONB,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS events_provider_idx ON events(provider)`;
        await sql`CREATE INDEX IF NOT EXISTS events_created_at_idx ON events(created_at DESC)`;
        await sql`DROP INDEX IF EXISTS events_provider_external_id_uniq`;

        // 2. Person Metrics Table (Per-person calculated risk & skills)
        await sql`
            CREATE TABLE IF NOT EXISTS person_metrics (
                id SERIAL PRIMARY KEY,
                source VARCHAR(255) NOT NULL,
                external_id VARCHAR(255) UNIQUE,
                person_name VARCHAR(255) NOT NULL,
                risk_score INTEGER DEFAULT 0,
                top_technologies JSONB,
                repos JSONB,
                commit_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                employment_status VARCHAR(20) DEFAULT 'active',
                computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`ALTER TABLE person_metrics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
        await sql`ALTER TABLE person_metrics ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active'`;
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS person_metrics_external_id_idx 
            ON person_metrics(external_id)
        `;
        await sql`CREATE INDEX IF NOT EXISTS person_metrics_is_active_idx ON person_metrics(is_active)`;

        // 3. Repo Metrics Table (Repository Bus Factor & SPOF risk)
        await sql`
            CREATE TABLE IF NOT EXISTS repo_metrics (
                id SERIAL PRIMARY KEY,
                source VARCHAR(255) NOT NULL,
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
        await sql`ALTER TABLE repo_metrics ADD COLUMN IF NOT EXISTS commit_count INTEGER DEFAULT 0`;
        await sql`ALTER TABLE repo_metrics ADD COLUMN IF NOT EXISTS primary_owner_percentage NUMERIC(5, 2) DEFAULT 0`;
        await sql`ALTER TABLE repo_metrics ADD COLUMN IF NOT EXISTS technologies JSONB`;
        await sql`ALTER TABLE repo_metrics ADD COLUMN IF NOT EXISTS top_contributors JSONB`;
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS repo_metrics_external_id_idx 
            ON repo_metrics(external_id)
        `;

        // 4. Technology Metrics Table (Tech footprint & expertise mapping)
        await sql`
            CREATE TABLE IF NOT EXISTS technology_metrics (
                id SERIAL PRIMARY KEY,
                source VARCHAR(255) NOT NULL,
                tech_name VARCHAR(255) UNIQUE NOT NULL,
                usage_percent NUMERIC(5, 2) DEFAULT 0,
                trend_percent NUMERIC(5, 2) DEFAULT 0,
                repo_count INTEGER DEFAULT 0,
                contributor_count INTEGER DEFAULT 0,
                commit_count INTEGER DEFAULT 0,
                pr_count INTEGER DEFAULT 0,
                issue_count INTEGER DEFAULT 0,
                top_experts JSONB,
                repos JSONB,
                computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`ALTER TABLE technology_metrics ADD COLUMN IF NOT EXISTS repos JSONB`;
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS technology_metrics_tech_name_idx 
            ON technology_metrics(tech_name)
        `;

        // 5. Workspace Metrics Table (Organization-level aggregated KPIs)
        await sql`
            CREATE TABLE IF NOT EXISTS workspace_metrics (
                id SERIAL PRIMARY KEY,
                source VARCHAR(255) NOT NULL,
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
                source VARCHAR(255) NOT NULL,
                canonical_person_id VARCHAR(255) NOT NULL,
                provider VARCHAR(50) NOT NULL,
                external_id VARCHAR(255) NOT NULL,
                username VARCHAR(255),
                email VARCHAR(255),
                display_name VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_provider_external_id UNIQUE (provider, external_id)
            )
        `;
        await sql`ALTER TABLE person_identity ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
        await sql`CREATE INDEX IF NOT EXISTS person_identity_canonical_id_idx ON person_identity(canonical_person_id)`;
        await sql`CREATE INDEX IF NOT EXISTS person_identity_email_idx ON person_identity(LOWER(email))`;
        await sql`CREATE INDEX IF NOT EXISTS person_identity_username_idx ON person_identity(LOWER(username))`;

        // 7. Identity Merge Log Table (Audit trail of identity resolution merges)
        await sql`
            CREATE TABLE IF NOT EXISTS identity_merge_log (
                id VARCHAR(255) PRIMARY KEY,
                source VARCHAR(255) NOT NULL,
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
                source VARCHAR(255) NOT NULL,
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
                source VARCHAR(255) NOT NULL,
                report_date DATE UNIQUE NOT NULL,
                html_content TEXT NOT NULL,
                summary JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 9b. Integrations Table (Real OAuth tokens, scoping rules, and connection state)
        await sql`
            CREATE TABLE IF NOT EXISTS integrations (
                id SERIAL PRIMARY KEY,
                provider VARCHAR(50) NOT NULL UNIQUE,
                status VARCHAR(50) NOT NULL DEFAULT 'not_connected',
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at TIMESTAMPTZ,
                scopes TEXT[],
                account_id VARCHAR(255),
                account_name VARCHAR(255),
                account_email VARCHAR(255),
                account_avatar VARCHAR(500),
                metadata JSONB DEFAULT '{}'::jsonb,
                scope_rules JSONB DEFAULT '{"allMonitored": true, "monitoredItems": ["*"]}'::jsonb,
                webhook_secret VARCHAR(255),
                webhook_registered BOOLEAN DEFAULT false,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS integrations_provider_idx ON integrations(provider)`;

        // Existing deployments cannot safely infer origin from provider or timestamps.
        // Quarantine all legacy rows as untrusted before enforcing source at the DB layer.
        const provenanceTables = [
            'events', 'person_metrics', 'repo_metrics', 'technology_metrics',
            'workspace_metrics', 'person_identity', 'identity_merge_log',
            'potential_duplicates', 'daily_reports'
        ] as const;
        for (const table of provenanceTables) {
            await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS source VARCHAR(255)`);
            await sql.unsafe(`UPDATE ${table} SET source = 'seed:legacy-unverified' WHERE source IS NULL`);
            await sql.unsafe(`ALTER TABLE ${table} ALTER COLUMN source SET NOT NULL`);
            await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_source_valid`);
            await sql.unsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_source_valid CHECK (source IN ('webhook', 'backfill') OR (source LIKE 'seed:%' AND length(source) > 5))`);
            await sql.unsafe(`CREATE INDEX IF NOT EXISTS ${table}_source_idx ON ${table}(source)`);
        }
        // RLS is the shared read/write boundary for every raw SQL caller. It applies even
        // when a table owner issues a query because FORCE ROW LEVEL SECURITY is enabled.
        for (const table of provenanceTables) {
            await sql.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
            await sql.unsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
            await sql.unsafe(`DROP POLICY IF EXISTS ${table}_provenance_policy ON ${table}`);
            await sql.unsafe(`CREATE POLICY ${table}_provenance_policy ON ${table} FOR ALL
                USING (source IN ('webhook', 'backfill') OR
                    (current_setting('cortex.allow_seed_data', true) = 'on' AND source LIKE 'seed:%'))
                WITH CHECK (source IN ('webhook', 'backfill') OR
                    (current_setting('cortex.allow_seed_data', true) = 'on' AND source LIKE 'seed:%'))`);
        }
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS events_provider_external_id_source_uniq ON events(provider, external_id, source)`;
        await sql`ALTER TABLE person_metrics DROP CONSTRAINT IF EXISTS person_metrics_external_id_key`;
        await sql`DROP INDEX IF EXISTS person_metrics_external_id_idx`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS person_metrics_source_external_id_uniq ON person_metrics(source, external_id)`;
        await sql`ALTER TABLE repo_metrics DROP CONSTRAINT IF EXISTS repo_metrics_external_id_key`;
        await sql`DROP INDEX IF EXISTS repo_metrics_external_id_idx`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS repo_metrics_source_external_id_uniq ON repo_metrics(source, external_id)`;
        await sql`ALTER TABLE technology_metrics DROP CONSTRAINT IF EXISTS technology_metrics_tech_name_key`;
        await sql`DROP INDEX IF EXISTS technology_metrics_tech_name_idx`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS technology_metrics_source_tech_name_uniq ON technology_metrics(source, tech_name)`;
        await sql`ALTER TABLE daily_reports DROP CONSTRAINT IF EXISTS daily_reports_report_date_key`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS daily_reports_source_date_uniq ON daily_reports(source, report_date)`;
        await sql`ALTER TABLE person_identity DROP CONSTRAINT IF EXISTS unique_provider_external_id`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS person_identity_source_provider_external_id_uniq ON person_identity(source, provider, external_id)`;

        // 10. Data Integrity Invariant Triggers & Check Constraints (Hard Real-Time Protection)
        // Guarantees that no service, webhook, or script can ever write inconsistent data
        await sql`
            CREATE OR REPLACE FUNCTION fn_enforce_repo_metrics_invariants()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Invariant 1: If commit_count is 0 or NULL, all dependent fields collapse to zero/empty
                IF NEW.commit_count IS NULL OR NEW.commit_count = 0 THEN
                    NEW.commit_count := 0;
                    NEW.contributor_count := 0;
                    NEW.primary_owner := NULL;
                    NEW.primary_owner_percentage := 0;
                    NEW.bus_factor := 0;
                    NEW.risk_score := 0;
                    NEW.status := 'empty';
                    NEW.technologies := '[]'::jsonb;
                    NEW.top_contributors := '[]'::jsonb;
                ELSE
                    -- Invariant 2 & 4: If commit_count > 0, contributor_count must be >= 1
                    IF NEW.contributor_count IS NULL OR NEW.contributor_count = 0 THEN
                        NEW.contributor_count := 1;
                    END IF;
                    -- Bus factor cannot exceed contributor_count
                    NEW.bus_factor := LEAST(COALESCE(NEW.bus_factor, 1.0), NEW.contributor_count::numeric);
                    IF NEW.bus_factor <= 0 THEN
                        NEW.bus_factor := 1.0;
                    END IF;
                    IF NEW.status IS NULL OR NEW.status = 'empty' THEN
                        NEW.status := CASE
                            WHEN COALESCE(NEW.risk_score, 0) >= 80 THEN 'fragile'
                            WHEN COALESCE(NEW.risk_score, 0) > 50 THEN 'concentrated'
                            ELSE 'healthy'
                        END;
                    END IF;
                    NEW.technologies := COALESCE(NEW.technologies, '[]'::jsonb);
                    NEW.top_contributors := COALESCE(NEW.top_contributors, '[]'::jsonb);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `;

        await sql`DROP TRIGGER IF EXISTS trg_enforce_repo_metrics_invariants ON repo_metrics;`;
        await sql`
            CREATE TRIGGER trg_enforce_repo_metrics_invariants
            BEFORE INSERT OR UPDATE ON repo_metrics
            FOR EACH ROW
            EXECUTE FUNCTION fn_enforce_repo_metrics_invariants();
        `;

        await sql`
            CREATE OR REPLACE FUNCTION fn_enforce_person_metrics_invariants()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.commit_count := GREATEST(0, COALESCE(NEW.commit_count, 0));
                NEW.repos := COALESCE(NEW.repos, '[]'::jsonb);
                NEW.top_technologies := COALESCE(NEW.top_technologies, '[]'::jsonb);
                NEW.risk_score := GREATEST(0, LEAST(100, COALESCE(NEW.risk_score, 0)));
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `;

        await sql`DROP TRIGGER IF EXISTS trg_enforce_person_metrics_invariants ON person_metrics;`;
        await sql`
            CREATE TRIGGER trg_enforce_person_metrics_invariants
            BEFORE INSERT OR UPDATE ON person_metrics
            FOR EACH ROW
            EXECUTE FUNCTION fn_enforce_person_metrics_invariants();
        `;

        await sql`
            ALTER TABLE repo_metrics 
            DROP CONSTRAINT IF EXISTS chk_repo_metrics_zero_collapse,
            ADD CONSTRAINT chk_repo_metrics_zero_collapse
            CHECK (
                (commit_count = 0 AND contributor_count = 0 AND primary_owner IS NULL AND bus_factor = 0 AND status = 'empty')
                OR
                (commit_count > 0 AND contributor_count > 0 AND bus_factor > 0 AND status <> 'empty')
            );
        `;

        await sql`
            ALTER TABLE repo_metrics 
            DROP CONSTRAINT IF EXISTS chk_repo_metrics_bus_factor_lte_contrib,
            ADD CONSTRAINT chk_repo_metrics_bus_factor_lte_contrib
            CHECK (bus_factor <= contributor_count);
        `;

        await sql`
            ALTER TABLE repo_metrics 
            DROP CONSTRAINT IF EXISTS chk_repo_metrics_non_negative,
            ADD CONSTRAINT chk_repo_metrics_non_negative
            CHECK (commit_count >= 0 AND contributor_count >= 0 AND bus_factor >= 0 AND risk_score >= 0);
        `;

        console.log('[Postgres:Bootstrap] ✅ All PostgreSQL tables, indexes, triggers, and invariant constraints verified successfully.');
    } catch (error: any) {
        console.error('[Postgres:Bootstrap] ❌ Error ensuring database tables:', error?.message);
        throw error;
    }
}

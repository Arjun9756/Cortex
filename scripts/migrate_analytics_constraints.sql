-- ============================================================
-- Cortex Analytics — Schema Migration
-- Required for Phase 4–5 analytics layer to function correctly
-- Run these statements once against your Postgres database.
-- All statements are idempotent (IF NOT EXISTS / IF NOT EXISTS).
-- ============================================================

-- person_metrics: add external_id column + UNIQUE constraint
-- Needed for ON CONFLICT (external_id) DO UPDATE in personMetrics.service.ts
ALTER TABLE person_metrics
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS person_metrics_external_id_idx
    ON person_metrics (external_id);

-- repo_metrics: add external_id column + UNIQUE constraint
-- Needed for ON CONFLICT (external_id) DO UPDATE in repoMetrics.service.ts
ALTER TABLE repo_metrics
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS repo_metrics_external_id_idx
    ON repo_metrics (external_id);

-- technology_metrics: tech_name is the natural key (technologies don't get renamed)
-- Needed for ON CONFLICT (tech_name) DO UPDATE in technologyMetrics.ts
CREATE UNIQUE INDEX IF NOT EXISTS technology_metrics_tech_name_idx
    ON technology_metrics (tech_name);

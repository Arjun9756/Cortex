-- ============================================================
-- Cortex Identity Resolution — Database Schema Migration
-- Required for Canonical Person Identity Layer
-- ============================================================

-- Table 1: person_identity
-- Stores provider-specific account identities linked to canonical person IDs
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
);

CREATE INDEX IF NOT EXISTS person_identity_canonical_id_idx ON person_identity(canonical_person_id);
CREATE INDEX IF NOT EXISTS person_identity_email_idx ON person_identity(LOWER(email));
CREATE INDEX IF NOT EXISTS person_identity_username_idx ON person_identity(LOWER(username));

-- Table 2: identity_merge_log
-- Audit log of all identity resolution merges
CREATE TABLE IF NOT EXISTS identity_merge_log (
    id VARCHAR(255) PRIMARY KEY,
    person_a VARCHAR(255) NOT NULL,
    person_b VARCHAR(255) NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    matched_by VARCHAR(100) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS identity_merge_log_created_at_idx ON identity_merge_log(created_at DESC);

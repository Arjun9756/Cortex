-- ============================================================
-- Cortex Identity Resolution — Potential Duplicates Migration
-- Stores flagged same-name-different-username cases that
-- could NOT be auto-merged safely by Rule 3.
-- ============================================================

-- Table: potential_duplicates
-- Flags cases where two identities share a display name but have
-- different usernames and no email to verify — system creates
-- separate canonical persons and flags them for later resolution.
CREATE TABLE IF NOT EXISTS potential_duplicates (
    id VARCHAR(255) PRIMARY KEY,
    person_a_id VARCHAR(255) NOT NULL,          -- existing canonical person ID
    person_a_name VARCHAR(255) NOT NULL,         -- display name of existing person
    person_a_provider VARCHAR(50),               -- provider of existing person
    person_a_username VARCHAR(255),              -- username of existing person
    person_b_id VARCHAR(255) NOT NULL,           -- newly created canonical person ID
    person_b_name VARCHAR(255) NOT NULL,         -- display name of new person
    person_b_provider VARCHAR(50),               -- provider of new person
    person_b_username VARCHAR(255),              -- username of new person
    similarity_score NUMERIC(4, 3) NOT NULL,     -- name similarity score (0.000 - 1.000)
    status VARCHAR(30) DEFAULT 'pending',        -- pending | merged | confirmed_different | dismissed
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),                    -- 'auto:context_check' | 'admin:manual' | 'llm:reconciliation'
    resolution_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS potential_duplicates_status_idx ON potential_duplicates(status);
CREATE INDEX IF NOT EXISTS potential_duplicates_created_at_idx ON potential_duplicates(created_at DESC);
CREATE INDEX IF NOT EXISTS potential_duplicates_person_a_idx ON potential_duplicates(person_a_id);
CREATE INDEX IF NOT EXISTS potential_duplicates_person_b_idx ON potential_duplicates(person_b_id);

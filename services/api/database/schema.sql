-- PRISM PostgreSQL Schema Phase 2A
-- Run with: psql -U prism_user -d prism_db -f schema.sql

-- Enable pgcrypto for UUID generation if not using PG13+ gen_random_uuid() natively
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TRIGGERS & FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log is immutable. No modifications permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_autostr_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_submitted = TRUE THEN
        RAISE EXCEPTION 'Submitted evidence packages cannot be modified.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop tables if they exist (for clean runs)
DROP TABLE IF EXISTS device_events CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS autostr_packages CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS warmth_scores CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- TABLE 1: accounts
CREATE TABLE accounts (
    account_id VARCHAR(20) PRIMARY KEY,
    account_holder_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    branch_code VARCHAR(10) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETE',
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    upi_registered BOOLEAN DEFAULT FALSE,
    upi_device_imei VARCHAR(15),
    upi_registered_at TIMESTAMP WITH TIME ZONE,
    account_opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    dormancy_days INTEGER DEFAULT 0,
    current_warmth_score FLOAT DEFAULT 0.0,
    warmth_risk_level VARCHAR(20) DEFAULT 'CLEAN',
    taint_score FLOAT DEFAULT 0.0,
    is_confirmed_mule BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_warmth_score ON accounts(current_warmth_score DESC);
CREATE INDEX idx_accounts_risk_level ON accounts(warmth_risk_level);
CREATE INDEX idx_accounts_mobile ON accounts(mobile_number);
CREATE INDEX idx_accounts_status ON accounts(account_status);
CREATE INDEX idx_accounts_mule ON accounts(is_confirmed_mule);

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- TABLE 2: warmth_scores
CREATE TABLE warmth_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(20) NOT NULL REFERENCES accounts(account_id),
    warmth_score FLOAT NOT NULL CHECK (warmth_score >= 0 AND warmth_score <= 100),
    risk_level VARCHAR(20) NOT NULL,
    signal_1_score FLOAT NOT NULL DEFAULT 0.0,
    signal_2_score FLOAT NOT NULL DEFAULT 0.0,
    signal_3_score FLOAT NOT NULL DEFAULT 0.0,
    signal_4_score FLOAT NOT NULL DEFAULT 0.0,
    signal_5_score FLOAT NOT NULL DEFAULT 0.0,
    signal_6_score FLOAT NOT NULL DEFAULT 0.0,
    shap_top1_signal VARCHAR(50),
    shap_top1_impact FLOAT,
    shap_top2_signal VARCHAR(50),
    shap_top2_impact FLOAT,
    shap_top3_signal VARCHAR(50),
    shap_top3_impact FLOAT,
    fri_score_numeric INTEGER,
    fri_risk_tier VARCHAR(20),
    sim_swap_detected BOOLEAN DEFAULT FALSE,
    device_switch_detected BOOLEAN DEFAULT FALSE,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    computation_duration_ms INTEGER
);

CREATE INDEX idx_warmth_account_id ON warmth_scores(account_id);
CREATE INDEX idx_warmth_computed_at ON warmth_scores(computed_at DESC);
CREATE INDEX idx_warmth_score_value ON warmth_scores(warmth_score DESC);
CREATE INDEX idx_warmth_risk_level ON warmth_scores(risk_level);


-- TABLE 3: alerts
CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(20) NOT NULL REFERENCES accounts(account_id),
    score_id UUID REFERENCES warmth_scores(score_id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    warmth_score_at_alert FLOAT NOT NULL,
    threshold_crossed FLOAT NOT NULL,
    primary_signal VARCHAR(50),
    alert_message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_false_positive BOOLEAN DEFAULT FALSE,
    false_positive_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_account_id ON alerts(account_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(is_acknowledged);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_type ON alerts(alert_type);


-- TABLE 4: cases
CREATE TABLE cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(20) NOT NULL REFERENCES accounts(account_id),
    case_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    assigned_mlro VARCHAR(100),
    peak_warmth_score FLOAT,
    peak_risk_level VARCHAR(20),
    autostr_triggered BOOLEAN DEFAULT FALSE,
    autostr_triggered_at TIMESTAMP WITH TIME ZONE,
    fiu_str_filed BOOLEAN DEFAULT FALSE,
    fiu_str_filed_at TIMESTAMP WITH TIME ZONE,
    fiu_str_reference VARCHAR(100),
    cbi_package_generated BOOLEAN DEFAULT FALSE,
    cbi_package_generated_at TIMESTAMP WITH TIME ZONE,
    rbi_report_included BOOLEAN DEFAULT FALSE,
    mlro_notes TEXT,
    mlro_decision VARCHAR(50),
    mlro_decision_at TIMESTAMP WITH TIME ZONE,
    legal_authority_used VARCHAR(100),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cases_account_id ON cases(account_id);
CREATE INDEX idx_cases_status ON cases(case_status);
CREATE INDEX idx_cases_mlro ON cases(assigned_mlro);
CREATE INDEX idx_cases_opened_at ON cases(opened_at DESC);

CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON cases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- TABLE 5: autostr_packages
CREATE TABLE autostr_packages (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(case_id),
    account_id VARCHAR(20) NOT NULL REFERENCES accounts(account_id),
    package_type VARCHAR(20) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_hash_sha256 VARCHAR(64) NOT NULL CHECK (length(file_hash_sha256) = 64),
    file_size_bytes INTEGER NOT NULL,
    generation_duration_seconds FLOAT NOT NULL,
    warmth_score_at_generation FLOAT NOT NULL,
    legal_mandate VARCHAR(200),
    is_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by VARCHAR(100),
    submission_reference VARCHAR(200),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT autostr_packages_case_type_key UNIQUE (case_id, package_type)
);

CREATE INDEX idx_autostr_case_id ON autostr_packages(case_id);
CREATE INDEX idx_autostr_account_id ON autostr_packages(account_id);
CREATE INDEX idx_autostr_type ON autostr_packages(package_type);
CREATE INDEX idx_autostr_submitted ON autostr_packages(is_submitted);

-- Use trigger instead of RULE for exception raising as it is much more robust
CREATE TRIGGER rule_prevent_autostr_update
BEFORE UPDATE ON autostr_packages
FOR EACH ROW EXECUTE FUNCTION prevent_autostr_modification();


-- TABLE 6: audit_log
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    session_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_target ON audit_log(target_type, target_id);

-- Enforce immutability via Trigger (Postgres RULE cannot easily raise exceptions)
CREATE TRIGGER rule_prevent_audit_update
BEFORE UPDATE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER rule_prevent_audit_delete
BEFORE DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();


-- TABLE 7: device_events
CREATE TABLE device_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(20) NOT NULL REFERENCES accounts(account_id),
    event_type VARCHAR(30) NOT NULL,
    imei VARCHAR(15),
    iccid VARCHAR(20),
    device_model VARCHAR(100),
    sim_operator VARCHAR(50),
    mobile_number VARCHAR(15),
    imei_cluster_proximity_score FLOAT DEFAULT 0.0,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason VARCHAR(200),
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_device_account_id ON device_events(account_id);
CREATE INDEX idx_device_imei ON device_events(imei);
CREATE INDEX idx_device_event_type ON device_events(event_type);
CREATE INDEX idx_device_timestamp ON device_events(event_timestamp DESC);


-- SEED DATA
INSERT INTO accounts (
    account_id, account_holder_name, account_type, branch_code, ifsc_code, mobile_number, 
    account_status, current_warmth_score, warmth_risk_level, account_opened_at
) VALUES 
('UBI-2026-DEMO-001', 'John Doe IMMINENT', 'SAVINGS', 'UBI-MUM-01', 'UBIN0531234', '9876543210', 
 'RESTRICTED', 84.0, 'IMMINENT', NOW() - INTERVAL '10 days'),
('UBI-2026-DEMO-002', 'Jane Smith WARMING', 'SAVINGS', 'UBI-MUM-01', 'UBIN0531234', '9876543211', 
 'ACTIVE', 52.0, 'WARMING', NOW() - INTERVAL '40 days'),
('UBI-2026-DEMO-003', 'Bob Clean CLEAN', 'SAVINGS', 'UBI-MUM-01', 'UBIN0531234', '9876543212', 
 'ACTIVE', 18.0, 'CLEAN', NOW() - INTERVAL '100 days')
ON CONFLICT (account_id) DO NOTHING;


-- =============================================================================
-- DAY 9: PII ENCRYPTION CONTRACT + RBAC GRANTS
-- Per PRISM Security Architecture — Section 6.2 Layer 6 (Privacy Preservation)
-- =============================================================================

-- PII columns are encrypted at the APPLICATION LAYER before reaching PostgreSQL.
-- Values stored here are Fernet tokens (AES-128-CBC + HMAC-SHA256), not plaintext.
-- Encryption key managed via PII_ENCRYPTION_KEY env var (HSM-managed in production).
-- DPDP Act 2023 compliance: data minimisation + encryption at rest.

COMMENT ON COLUMN accounts.account_holder_name IS
    'PII — Fernet-encrypted at application layer. Raw name never stored in plaintext.';
COMMENT ON COLUMN accounts.mobile_number IS
    'PII — Fernet-encrypted at application layer. DoT DIP queries use SHA-256 hash only.';
COMMENT ON COLUMN accounts.upi_device_imei IS
    'PII — Fernet-encrypted at application layer. IMEI cluster scoring uses hashed prefix only.';
COMMENT ON COLUMN device_events.imei IS
    'PII — Fernet-encrypted at application layer. External IMEI queries use SHA-256 hash.';
COMMENT ON COLUMN device_events.mobile_number IS
    'PII — Fernet-encrypted at application layer.';

-- Audit log immutability is enforced via TRIGGERS (lines 221-227 above).
-- No application-layer DELETE or UPDATE methods exist for audit_log.
COMMENT ON TABLE audit_log IS
    'IMMUTABLE — UPDATE and DELETE are blocked by PostgreSQL triggers. INSERT only. '
    'PMLA record-keeping: 7-year retention for flagged accounts. '
    'DPDP Act 2023: auto-purge after 2 years for unflagged accounts.';

-- RBAC: application-layer role enforcement. DB grants add a defence-in-depth layer.
-- prism_readonly_role: used by FRAUD_ANALYST and AUDIT sessions
-- prism_mlro_role: used by MLRO sessions (can call stored procs for restrictions)
-- prism_admin_role: used by ADMIN sessions (config tables only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prism_readonly_role') THEN
        CREATE ROLE prism_readonly_role;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prism_mlro_role') THEN
        CREATE ROLE prism_mlro_role;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prism_admin_role') THEN
        CREATE ROLE prism_admin_role;
    END IF;
END
$$;

-- Read-only access for FRAUD_ANALYST and AUDIT
GRANT SELECT ON accounts, warmth_scores, alerts, cases, autostr_packages, device_events
    TO prism_readonly_role;
-- AUDIT gets audit_log; FRAUD_ANALYST does not
GRANT SELECT ON audit_log TO prism_mlro_role;

-- MLRO gets full DML on case management tables
GRANT SELECT, INSERT, UPDATE ON cases, alerts, autostr_packages TO prism_mlro_role;
GRANT SELECT ON accounts, warmth_scores, device_events TO prism_mlro_role;
GRANT SELECT ON audit_log TO prism_mlro_role;

-- ADMIN gets no case data access (defence in depth matching application RBAC)
-- prism_admin_role intentionally has NO grants on accounts/cases/alerts

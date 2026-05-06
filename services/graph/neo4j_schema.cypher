// ============================================================
// ARGUS-PRISM — Neo4j 5.x Schema
// Account node · Transaction edge · Device node
// Run via: cypher-shell -u neo4j -p prism_password < neo4j_schema.cypher
// ============================================================

// ── Uniqueness Constraints ────────────────────────────────────────────────────

CREATE CONSTRAINT account_id_unique IF NOT EXISTS
FOR (a:Account) REQUIRE a.account_id IS UNIQUE;

CREATE CONSTRAINT device_imei_unique IF NOT EXISTS
FOR (d:Device) REQUIRE d.imei IS UNIQUE;

CREATE CONSTRAINT recruiter_id_unique IF NOT EXISTS
FOR (r:RecruiterNode) REQUIRE r.account_id IS UNIQUE;

// ── Indexes for Query Performance ─────────────────────────────────────────────

// WarmthScore index — primary alert queue ordering
CREATE INDEX account_warmth_idx IF NOT EXISTS
FOR (a:Account) ON (a.warmth_score);

// Taint score index — Taint Engine queries
CREATE INDEX account_taint_idx IF NOT EXISTS
FOR (a:Account) ON (a.taint_score);

// Account status index — freeze / restrict lookups
CREATE INDEX account_status_idx IF NOT EXISTS
FOR (a:Account) ON (a.status);

// KYC status index — re-verification queue
CREATE INDEX account_kyc_idx IF NOT EXISTS
FOR (a:Account) ON (a.kyc_status);

// Transaction timestamp — all Cypher time-window queries
CREATE INDEX txn_timestamp_idx IF NOT EXISTS
FOR ()-[t:TRANSACTED]-() ON (t.timestamp);

// Transaction channel index
CREATE INDEX txn_channel_idx IF NOT EXISTS
FOR ()-[t:TRANSACTED]-() ON (t.channel);

// Device IMEI prefix index — cluster proximity scoring
CREATE INDEX device_prefix_idx IF NOT EXISTS
FOR (d:Device) ON (d.imei_prefix);

// Last seen device index
CREATE INDEX device_last_seen_idx IF NOT EXISTS
FOR (d:Device) ON (d.last_seen);

// ── Account Node Schema ────────────────────────────────────────────────────────
//
// Properties:
//   account_id       STRING  UNIQUE — e.g. "UBI-2026-000001"
//   name             STRING          — account holder name
//   kyc_status       STRING          — PENDING | VERIFIED | RE_VERIFICATION_REQUIRED | FAILED
//   kyc_income       INTEGER         — declared annual income in INR
//   kyc_occupation   STRING          — declared occupation
//   account_type     STRING          — SAVINGS | CURRENT | JAN_DHAN | SALARY | NRE | NRO
//   branch_code      STRING          — originating branch
//   mobile_number    STRING          — SHA-256 hashed mobile (never raw)
//   imei             STRING          — SHA-256 hashed IMEI
//   imei_prefix      STRING          — first 8 digits (for cluster scoring)
//   sim_id           STRING          — SHA-256 hashed SIM ICCID
//   warmth_score     FLOAT           — 0–100, updated in real-time by WarmthScore engine
//   taint_score      FLOAT           — 0–80, assigned by Taint Propagation Engine
//   final_risk_score FLOAT           — taint * 0.6 + warmth * 0.4
//   status           STRING          — ACTIVE | FROZEN | RESTRICTED_OUTBOUND | KYC_HOLD | CLOSED
//   fri_score        INTEGER         — FRI score from DoT DIP API (mocked in demo)
//   is_mule          BOOLEAN         — confirmed mule flag
//   is_recruiter     BOOLEAN         — recruiter node flag
//   campaign_id      STRING          — which mule campaign (if any)
//   created_at       DATETIME
//   last_active      DATETIME
//
// Example CREATE:
// CREATE (a:Account {
//   account_id: "UBI-2026-DEMO-001",
//   name: "Demo Mule Account",
//   kyc_status: "VERIFIED",
//   kyc_income: 150000,
//   kyc_occupation: "student",
//   account_type: "SAVINGS",
//   branch_code: "UBI-BR-0042",
//   mobile_number: "sha256_hash_here",
//   warmth_score: 0.0,
//   taint_score: 0.0,
//   status: "ACTIVE",
//   is_mule: false,
//   created_at: datetime("2026-01-01T00:00:00")
// });

// ── Transaction Edge Schema ───────────────────────────────────────────────────
//
// Relationship: (Account)-[:TRANSACTED]->(Account)
//
// Properties:
//   txn_id           STRING  — Finacle transaction reference
//   amount           INTEGER — amount in paise (INR * 100)
//   type             STRING  — CREDIT | DEBIT
//   channel          STRING  — UPI | NEFT | RTGS | IMPS | ATM | BRANCH_COUNTER
//   timestamp        DATETIME
//   status           STRING  — SUCCESS | FAILED | PENDING | REVERSED
//   pattern_tag      STRING  — LAYERING | ROUND_TRIP | STRUCTURING | ILLICIT_CREDIT (if flagged)
//   is_test_credit   BOOLEAN — Signal 1 test credit marker
//
// Example CREATE:
// MATCH (src:Account {account_id: "UBI-2026-000001"})
// MATCH (dst:Account {account_id: "UBI-2026-000002"})
// CREATE (src)-[:TRANSACTED {
//   txn_id: "TXN-ABC123",
//   amount: 50000,
//   type: "CREDIT",
//   channel: "UPI",
//   timestamp: datetime("2026-01-01T06:00:00"),
//   status: "SUCCESS"
// }]->(dst);

// ── Device Node Schema ────────────────────────────────────────────────────────
//
// Properties:
//   imei             STRING  UNIQUE — SHA-256 hashed IMEI
//   imei_prefix      STRING         — first 8 digits
//   sim_id           STRING         — SHA-256 hashed ICCID
//   fingerprint      STRING         — device fingerprint hash
//   is_blocked_cluster BOOLEAN      — matches DoT Chakshu blocked cluster
//   last_seen        DATETIME
//
// Relationship: (Account)-[:USES_DEVICE]->(Device)
//   Properties:
//     registered_at  DATETIME — when device was bound to this account
//     event_type     STRING   — ACCOUNT_LOGIN | UPI_DEVICE_REGISTERED | UPI_DEVICE_CHANGED

// ── Recruiter Node Label ──────────────────────────────────────────────────────
//
// Recruiter accounts get an additional label: :RecruiterNode
// Applied by the Recruiter Mapper engine once classification threshold met.
//
// MATCH (a:Account {account_id: $recruiter_id})
// SET a:RecruiterNode
// SET a.recruiter_classification = "CAMPAIGN_COORDINATOR"   // or INDUSTRIAL_ORCHESTRATOR / PLATFORM_SCALE
// SET a.downstream_count = $count
// SET a.classified_at = datetime()

// ── Demo Account Seed ─────────────────────────────────────────────────────────
// The canonical demo account for the 4-minute presentation

MERGE (demo:Account {account_id: "UBI-2026-DEMO-001"})
SET demo.name = "Demo Mule Account",
    demo.kyc_status = "VERIFIED",
    demo.kyc_income = 120000,
    demo.kyc_occupation = "student",
    demo.account_type = "SAVINGS",
    demo.branch_code = "UBI-BR-0042",
    demo.mobile_number = "sha256_demo_mobile_placeholder",
    demo.warmth_score = 0.0,
    demo.taint_score = 0.0,
    demo.status = "ACTIVE",
    demo.fri_score = 8,
    demo.is_mule = false,
    demo.campaign_id = "CAMPAIGN-DEMO",
    demo.created_at = datetime("2026-01-01T00:00:00"),
    demo.last_active = null;

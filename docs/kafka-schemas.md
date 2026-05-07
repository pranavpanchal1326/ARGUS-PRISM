# ARGUS-PRISM — Kafka Topic Schemas

> **Topic namespace:** `com.argus.prism.pipeline`
> **Serialisation:** Apache Avro · Schema source: `services/pipeline/kafka_schemas/`
> **Broker:** Kafka in KRaft mode (no ZooKeeper) · `localhost:9092`

---

## Topics at a Glance

| Topic | Key | Partitions | Retention | Consumer |
|-------|-----|-----------|-----------|---------|
| `account_events` | `account_id` | 6 | 7 days | Flink Graph Writer |
| `txn_events` | `txn_id` | 12 | 7 days | Flink Graph Writer |
| `device_events` | `account_id` | 6 | 3 days | WarmthScore Engine |
| `kyc_events` | `account_id` | 6 | 30 days | WarmthScore Engine |

---

## `account_events`

Account lifecycle events from Finacle CBS — creation, KYC updates, status changes.

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | `string` | UUID for this event |
| `event_type` | `enum` | `ACCOUNT_CREATED` · `KYC_UPDATED` · `STATUS_CHANGED` · `PROFILE_UPDATED` |
| `account_id` | `string` | Unique account ID e.g. `UBI-2026-DEMO-001` |
| `name` | `string` | Account holder name |
| `kyc_status` | `enum` | `PENDING` · `VERIFIED` · `RE_VERIFICATION_REQUIRED` · `FAILED` |
| `kyc_income` | `long?` | Declared annual income in INR |
| `kyc_occupation` | `string?` | Declared occupation |
| `account_type` | `enum` | `SAVINGS` · `CURRENT` · `JAN_DHAN` · `SALARY` · `NRE` · `NRO` |
| `branch_code` | `string` | Branch where account was opened |
| `mobile_number` | `string` | **SHA-256 hashed** mobile number (DPDP Act 2023 compliant) |
| `warmth_score` | `float` | Current WarmthScore (0–100) |
| `taint_score` | `float` | Propagated taint from confirmed mule network |
| `status` | `enum` | `ACTIVE` · `FROZEN` · `RESTRICTED_OUTBOUND` · `KYC_HOLD` · `CLOSED` |
| `created_at` | `long` (timestamp-millis) | Account creation epoch ms |
| `last_active` | `long?` (timestamp-millis) | Last transaction timestamp |
| `event_timestamp` | `long` (timestamp-millis) | Finacle emission time |
| `source_system` | `string` | Default: `FINACLE` |

---

## `txn_events`

Transaction posting events — credits, debits, UPI, NEFT, RTGS, IMPS, ATM, branch counter.

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | `string` | UUID for this event |
| `txn_id` | `string` | Unique transaction reference from Finacle |
| `txn_type` | `enum` | `CREDIT` · `DEBIT` |
| `channel` | `enum` | `UPI` · `NEFT` · `RTGS` · `IMPS` · `ATM` · `BRANCH_COUNTER` · `NETBANKING` · `INTERNAL` |
| `from_account` | `string` | Source account ID |
| `to_account` | `string` | Destination account ID |
| `amount` | `long` | Amount in **paise** (INR × 100) |
| `currency` | `string` | Default: `INR` |
| `description` | `string?` | Narration / payment remark |
| `upi_vpa` | `string?` | UPI Virtual Payment Address (if `channel=UPI`) |
| `status` | `enum` | `SUCCESS` · `FAILED` · `PENDING` · `REVERSED` |
| `timestamp` | `long` (timestamp-millis) | Transaction posting time |
| `event_timestamp` | `long` (timestamp-millis) | Finacle emission time |
| `source_system` | `string` | Default: `FINACLE` |

> **Amount note:** All amounts in paise. ₹1,00,000 = `10000000` paise. Divide by 100 for display.

---

## `device_events`

Device fingerprint events — login sessions, UPI device registration, IMEI, SIM swap signals.

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | `string` | UUID for this event |
| `event_type` | `enum` | `ACCOUNT_LOGIN` · `UPI_DEVICE_REGISTERED` · `UPI_DEVICE_CHANGED` · `SIM_SWAP_DETECTED` · `IMEI_FLAGGED` · `NEW_DEVICE_LOGIN` |
| `account_id` | `string` | Account associated with this event |
| `imei` | `string` | **SHA-256 hashed** IMEI (DPDP Act 2023 compliant) |
| `imei_prefix` | `string` | First 8 digits of IMEI for cluster scoring (not PII) |
| `sim_id` | `string` | **SHA-256 hashed** SIM ICCID |
| `fingerprint` | `string` | Device fingerprint hash (OS, screen, app version) |
| `is_blocked_imei_cluster` | `boolean` | True if IMEI matches DoT Chakshu 2025 fraud cluster |
| `previous_imei` | `string?` | Previous device IMEI hash (device-change detection) |
| `sim_swap_timestamp` | `long?` | SIM swap time from DoT DIP API |
| `upi_registration_timestamp` | `long?` | UPI device binding timestamp |
| `last_seen` | `long` | Last time device was seen on this account |
| `timestamp` | `long` | Event occurrence timestamp |
| `event_timestamp` | `long` | Emission timestamp |
| `source_system` | `string` | Default: `FINACLE` |

> **Signal 2 (Device Fingerprint):** Same IMEI + multiple SIM IDs in `device_events` triggers Signal 2 score spike.
> **Signal 6 (SIM Swap Velocity):** 2+ `SIM_SWAP_DETECTED` events in 72hr = high score.

---

## `kyc_events`

KYC lifecycle events — completion, re-verification triggers, Video KYC, branch verification.

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | `string` | UUID for this event |
| `event_type` | `enum` | `KYC_COMPLETED` · `RE_VERIFICATION_TRIGGERED` · `VIDEO_KYC_INITIATED` · `VIDEO_KYC_COMPLETED` · `BRANCH_VERIFICATION_REQUESTED` · `KYC_FAILED` · `KYC_EXPIRED` |
| `account_id` | `string` | Account undergoing KYC |
| `kyc_status` | `enum` | `PENDING` · `VERIFIED` · `RE_VERIFICATION_REQUIRED` · `FAILED` · `EXPIRED` |
| `triggered_by` | `enum` | `WARMTH_SCORE_60` · `WARMTH_SCORE_75` · `WARMTH_SCORE_85` · `MANUAL_MLRO` · `SCHEDULED_REVIEW` · `DORMANCY_REACTIVATION` · `SYSTEM_INITIAL` |
| `legal_authority` | `string` | Default: `RBI KYC Master Direction 2016 S.38` |
| `mlro_id` | `string?` | MLRO who triggered (if manual) |
| `warmth_score_at_trigger` | `float?` | WarmthScore at time of trigger |
| `resolution_deadline` | `long?` | Customer KYC deadline (epoch ms) |
| `timestamp` | `long` | Event timestamp |
| `event_timestamp` | `long` | Emission timestamp |
| `source_system` | `string` | Default: `PRISM` |

> **Legal threshold mapping:**
> - `triggered_by = WARMTH_SCORE_60` → KYC Hold initiated
> - `triggered_by = WARMTH_SCORE_75` → Re-verification (RBI KYC MD S.38)
> - `triggered_by = WARMTH_SCORE_85` → Full restriction + AutoSTR (PMLA S.12)

---

## Kafka Producer Usage

```python
from services.pipeline.kafka_producer import PRISMKafkaProducer

producer = PRISMKafkaProducer()

# Produce account event
producer.produce_account_event({
    "event_id": "uuid-here",
    "event_type": "ACCOUNT_CREATED",
    "account_id": "UBI-2026-DEMO-001",
    ...
})

# Produce transaction event
producer.produce_txn_event({
    "txn_id": "TXN-001",
    "from_account": "UBI-2026-DEMO-001",
    "to_account": "UBI-2026-MULE-001",
    "amount": 5000000,  # ₹50,000 in paise
    "channel": "UPI",
    ...
})
```

---

*Generated: ARGUS-PRISM Day 7 — W1 Sync*

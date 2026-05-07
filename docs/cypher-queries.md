# ARGUS-PRISM — Cypher Query Reference

> All Neo4j Cypher queries used across the PRISM pipeline.
> Engine: Neo4j 5 · Driver: Python `neo4j` 5.x · Bolt: `localhost:7687`

---

## Neo4j Data Model

```
(Account) -[:TRANSACTED]-> (Account)
(Account) -[:USES_DEVICE]-> (Device)
(AuditEvent) [standalone node]
```

### Account Node Properties

| Property | Type | Set by |
|----------|------|--------|
| `account_id` | String | Pipeline |
| `name` | String | Pipeline |
| `kyc_status` | String | Pipeline |
| `kyc_income` | Integer | Pipeline |
| `kyc_occupation` | String | Pipeline |
| `account_type` | String | Pipeline |
| `warmth_score` | Float | WarmthScore Engine |
| `taint_score` | Float | Taint Engine |
| `final_risk_score` | Float | Taint Engine |
| `status` | String | Taint / Recruiter |
| `is_mule` | Boolean | Taint Engine |
| `is_recruiter` | Boolean | Recruiter Engine |
| `frozen_reason` | String | Recruiter Engine |
| `last_active` | DateTime | Pipeline |

### TRANSACTED Edge Properties

| Property | Type | Set by |
|----------|------|--------|
| `txn_id` | String | Pipeline |
| `amount` | Integer (paise) | Pipeline |
| `type` | String | Pipeline |
| `channel` | String | Pipeline |
| `status` | String | Pipeline |
| `timestamp` | DateTime | Pipeline |

---

## 1. FlowGraph Detectors (Day 3)

### Detector 1 — Layering
Detects 3+ account chains within a 6-hour window.

```cypher
MATCH path = (source:Account)-[:TRANSACTED*3..]->(sink:Account)
WHERE ALL(r IN relationships(path)
    WHERE r.timestamp > datetime() - duration('PT6H'))
  AND size(nodes(path)) >= 4
  AND source <> sink
RETURN path,
       [n IN nodes(path) | n.account_id] AS chain,
       length(path)                       AS hop_count
```

### Detector 2 — Round-Trip
Detects directed cycles (money returns to source) within 72 hours.

```cypher
MATCH cycle = (a:Account)-[:TRANSACTED*3..8]->(a)
WHERE ALL(r IN relationships(cycle)
    WHERE r.timestamp > datetime() - duration('PT72H'))
RETURN a.account_id                                              AS account_id,
       length(cycle)                                            AS hop_count,
       REDUCE(s=0, r IN relationships(cycle) | s + r.amount)   AS total_flow
```

### Detector 3 — Structuring
Detects sub-₹10L amount clustering (multiple transactions just below reporting threshold).

```cypher
MATCH (a:Account)-[t:TRANSACTED]->()
WHERE t.amount < 1000000
  AND t.amount > 900000
  AND t.timestamp > datetime() - duration('PT24H')
WITH a, count(t) AS txn_count, sum(t.amount) AS total
WHERE txn_count >= 3
RETURN a.account_id, txn_count, total
ORDER BY total DESC
```

### Detector 4 — Dormant Activation
Detects accounts inactive 90+ days that suddenly receive a credit.

```cypher
MATCH (a:Account)
WHERE a.last_active < datetime() - duration('P90D')
MATCH (a)<-[t:TRANSACTED]-()
WHERE t.timestamp > datetime() - duration('PT48H')
  AND t.type = 'CREDIT'
RETURN a.account_id,
       a.last_active    AS dormant_since,
       t.amount         AS reactivation_amount,
       t.timestamp      AS reactivation_at
ORDER BY t.amount DESC
```

### Detector 5 — Profile Mismatch
Detects accounts where transaction behaviour contradicts declared KYC profile.

```cypher
MATCH (a:Account)-[t:TRANSACTED]->()
WHERE t.timestamp > datetime() - duration('P30D')
WITH a, avg(t.amount) AS avg_txn, count(t) AS freq
WHERE (a.kyc_income < 300000 AND avg_txn > 500000)
   OR (a.kyc_occupation = 'student' AND freq > 50)
RETURN a.account_id,
       a.kyc_income,
       a.kyc_occupation,
       avg_txn,
       freq
ORDER BY avg_txn DESC
```

---

## 2. WarmthScore Engine (Day 4)

### Write warmth_score to Account node

```cypher
MATCH (a:Account {account_id: $account_id})
SET a.warmth_score = CASE
    WHEN a.warmth_score IS NULL THEN $score
    WHEN $score > a.warmth_score THEN $score
    ELSE a.warmth_score
END,
a.warmth_updated_at = datetime()
```

### KYC threshold trigger (score >= 60)

```cypher
MATCH (a:Account {account_id: $account_id})
WHERE a.warmth_score >= 60
SET a.status = 'KYC_HOLD',
    a.kyc_hold_at = datetime()
RETURN a.account_id, a.warmth_score, a.status
```

### Freeze trigger (score >= 80)

```cypher
MATCH (a:Account {account_id: $account_id})
WHERE a.warmth_score >= 80
SET a.status = 'FROZEN',
    a.frozen_at = datetime(),
    a.frozen_reason = 'WARMTH_THRESHOLD_80'
RETURN a.account_id, a.warmth_score, a.status
```

---

## 3. Taint Engine (Day 5)

### Back-trace 4 hops from confirmed mule

```cypher
MATCH path = (mule:Account {account_id: $mule_id})<-[:TRANSACTED*1..4]-(upstream)
WITH upstream, length(path) AS hop_distance
RETURN upstream.account_id AS uid,
       hop_distance,
       CASE hop_distance
           WHEN 1 THEN 80
           WHEN 2 THEN 55
           WHEN 3 THEN 30
           WHEN 4 THEN 15
       END AS taint_score
ORDER BY hop_distance
```

### Write taint_score (idempotent — never decreases)

```cypher
MATCH (a:Account {account_id: $account_id})
SET a.taint_score = CASE
    WHEN a.taint_score IS NULL THEN $score
    WHEN $score > a.taint_score THEN $score
    ELSE a.taint_score
END,
a.taint_updated_at = datetime()
```

### Confirm mule + freeze

```cypher
MATCH (a:Account {account_id: $mule_id})
SET a.is_mule   = true,
    a.status    = 'FROZEN',
    a.frozen_at = datetime(),
    a.frozen_reason = 'CONFIRMED_MULE'
```

### Compound risk score write

```cypher
MATCH (a:Account {account_id: $account_id})
SET a.final_risk_score = CASE
    WHEN a.taint_score IS NULL AND a.warmth_score IS NULL THEN 0.0
    WHEN a.taint_score IS NULL THEN a.warmth_score * 0.4
    WHEN a.warmth_score IS NULL THEN a.taint_score * 0.6
    ELSE CASE
        WHEN (a.taint_score * 0.6 + a.warmth_score * 0.4) > 100
        THEN 100.0
        ELSE a.taint_score * 0.6 + a.warmth_score * 0.4
    END
END
```

---

## 4. Recruiter Engine (Day 6)

### Detect all recruiter accounts

```cypher
MATCH (recruiter:Account)-[t:TRANSACTED]->(target:Account)
WHERE t.timestamp > datetime() - duration('PT48H')
  AND t.amount < 5000
  AND recruiter.account_id <> target.account_id
WITH recruiter,
     collect(DISTINCT target.account_id) AS downstream_ids,
     count(DISTINCT target)              AS cnt
WHERE cnt >= 5
RETURN recruiter.account_id AS recruiter_id,
       recruiter.status      AS recruiter_status,
       recruiter.warmth_score AS warmth_score,
       cnt                    AS downstream_count,
       downstream_ids,
       CASE WHEN cnt >= 26 THEN 'PLATFORM_SCALE'
            WHEN cnt >= 11 THEN 'INDUSTRIAL_ORCHESTRATOR'
            ELSE 'CAMPAIGN_COORDINATOR'
       END AS classification
ORDER BY cnt DESC
```

### Freeze recruiter account

```cypher
MATCH (r:Account {account_id: $recruiter_id})
SET r.status        = 'FROZEN',
    r.frozen_reason = 'RECRUITER',
    r.is_recruiter  = true,
    r.frozen_at     = datetime()
```

### Freeze all downstream campaign accounts

```cypher
MATCH (r:Account {account_id: $recruiter_id})-[t:TRANSACTED]->(target:Account)
WHERE t.amount < 5000
SET target.status        = 'FROZEN',
    target.frozen_reason = 'CAMPAIGN_CONNECTED',
    target.frozen_at     = datetime(),
    target.recruiter_id  = $recruiter_id
RETURN collect(DISTINCT target.account_id) AS frozen_targets
```

### Write AuditEvent on campaign freeze

```cypher
CREATE (audit:AuditEvent {
    event_id:  randomUUID(),
    actor:     'PRISM_RECRUITER_ENGINE',
    action:    'CAMPAIGN_FREEZE',
    target:    $recruiter_id,
    affected:  $frozen_targets,
    reason:    $reason,
    timestamp: datetime()
})
```

### Full campaign graph for a recruiter

```cypher
MATCH (r:Account {account_id: $recruiter_id})-[t:TRANSACTED]->(target:Account)
WHERE t.amount < 5000
RETURN target.account_id   AS target_id,
       target.status       AS target_status,
       target.warmth_score AS target_warmth,
       target.is_mule      AS is_mule,
       t.amount            AS amount,
       t.txn_id            AS txn_id,
       t.channel           AS channel,
       t.timestamp         AS timestamp
ORDER BY t.timestamp DESC
```

---

## 5. Utility Queries

### Count all accounts

```cypher
MATCH (a:Account) RETURN count(a) AS total_accounts
```

### Count all transactions

```cypher
MATCH ()-[t:TRANSACTED]->() RETURN count(t) AS total_transactions
```

### Find all FROZEN accounts

```cypher
MATCH (a:Account {status: 'FROZEN'})
RETURN a.account_id, a.frozen_reason, a.frozen_at
ORDER BY a.frozen_at DESC
```

### Find accounts above final_risk_score threshold

```cypher
MATCH (a:Account)
WHERE a.final_risk_score >= $threshold
RETURN a.account_id, a.final_risk_score, a.warmth_score, a.taint_score
ORDER BY a.final_risk_score DESC
LIMIT 50
```

### Full account risk profile

```cypher
MATCH (a:Account {account_id: $account_id})
RETURN a.account_id,
       a.warmth_score,
       a.taint_score,
       a.final_risk_score,
       a.status,
       a.is_mule,
       a.is_recruiter,
       a.frozen_reason,
       a.kyc_status
```

---

*Generated: ARGUS-PRISM Day 7 — W1 Sync*

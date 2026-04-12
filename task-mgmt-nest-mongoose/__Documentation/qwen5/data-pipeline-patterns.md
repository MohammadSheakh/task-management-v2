# Data Pipeline Patterns — ETL/ELT + AI Automation

# Last Updated: 12-04-26

# Version: 1.0 — Production-Grade Data Engineering for Analysts

---

## TABLE OF CONTENTS

1. [Pipeline Philosophy](#philosophy)
2. [ETL vs ELT — When to Use Which](#etl-vs-elt)
3. [6 Production Pipeline Patterns](#patterns)
4. [Pipeline 1: API → Transform → Database](#pipeline-1)
5. [Pipeline 2: Database → Aggregate → Dashboard](#pipeline-2)
6. [Pipeline 3: Multi-Source → Data Warehouse](#pipeline-3)
7. [Pipeline 4: Real-Time Stream Processing](#pipeline-4)
8. [Pipeline 5: AI-Enhanced Pipeline](#pipeline-5)
9. [Pipeline 6: Self-Healing Pipeline](#pipeline-6)
10. [Data Quality Framework](#data-quality)
11. [Pipeline Monitoring & Alerting](#monitoring)
12. [Pipeline Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## PIPELINE PHILOSOPHY <a name="philosophy"></a>

### The 7 Laws of Data Pipelines

```
1. Pipelines WILL fail — design for failure
   → Every step needs error handling
   → Every failure needs alerting
   → Every alert needs a runbook

2. Data quality degrades over time — monitor it
   → Check quality at ingestion, transformation, output
   → Alert on quality drops, not just failures

3. Schemas WILL change — handle gracefully
   → APIs add/remove fields
   → Databases change types
   → Build for schema evolution

4. Volume WILL grow — design for scale
   → 100 rows today, 1M rows tomorrow
   → Paginate API calls
   → Aggregate before loading

5. Pipelines are code — treat them like code
   → Version control (Git)
   → Code review
   → Testing
   → CI/CD

6. Documentation is not optional
   → Every pipeline needs: purpose, owner, schedule, inputs, outputs
   → Data lineage (where did this data come from?)
   → Runbook (what to do when it breaks)

7. The simplest pipeline that works is the best
   → Don't over-engineer
   → Start with cron + SQL
   → Add complexity only when needed
```

---

## ETL vs ELT — WHEN TO USE WHICH <a name="etl-vs-elt"></a>

### Comparison

| Aspect | ETL (Extract-Transform-Load) | ELT (Extract-Load-Transform) |
|--------|------------------------------|------------------------------|
| **Transform where?** | Before loading (in pipeline) | After loading (in warehouse) |
| **Best for** | Small data, simple transforms | Large data, complex analytics |
| **Tools** | n8n, Airflow, Python scripts | dbt, SQL in warehouse |
| **Flexibility** | Low (transform logic in pipeline) | High (transform in SQL, easy to change) |
| **Debugging** | Harder (transform in code) | Easier (SQL is inspectable) |
| **Performance** | Slower (transform before load) | Faster (use warehouse compute) |
| **Cost** | Cheaper (transform on small data) | More expensive (warehouse compute) |
| **When to use** | API → clean → load to DB | Multiple sources → raw → transform in warehouse |

### Recommendation for Data Analysts

```
Stage 1 (Single source, < 10K rows/day):
  → ETL with n8n (simple, visual, easy)

Stage 2 (Multiple sources, 10K-100K rows/day):
  → ELT with n8n (extract + load) + dbt (transform)

Stage 3 (Large scale, 100K+ rows/day):
  → ELT with Airflow/Prefect + dbt + data warehouse
```

---

## 6 PRODUCTION PIPELINE PATTERNS <a name="patterns"></a>

### Pattern Overview

```
Pattern 1: API → Transform → Database (ETL)
  → Most common pattern for data analysts
  → Example: Fetch sales data from CRM → Clean → Load to PostgreSQL

Pattern 2: Database → Aggregate → Dashboard (ELT)
  → Read from warehouse → Calculate KPIs → Update dashboard
  → Example: Daily KPI calculation → Dashboard update

Pattern 3: Multi-Source → Data Warehouse (ELT)
  → Combine CRM + Marketing + Finance → Unified data model
  → Example: Customer 360 pipeline

Pattern 4: Real-Time Stream Processing
  → Continuous data flow (events, clicks, transactions)
  → Example: Live website metrics → Real-time dashboard

Pattern 5: AI-Enhanced Pipeline
  → Data → AI analysis → Insights → Alert/Report
  → Example: Daily sales data → AI insights → Slack summary

Pattern 6: Self-Healing Pipeline
  → Detect issues → Auto-fix → Continue or alert
  → Example: Missing values → auto-fill → continue
```

---

## PIPELINE 1: API → TRANSFORM → DATABASE <a name="pipeline-1"></a>

### Use Case: Sync external data to your database

```
Example: Fetch daily sales from Stripe → Transform → Load to PostgreSQL

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  Stripe API  │ →  │  Transform   │ →  │  PostgreSQL  │
│  (Daily 2AM) │    │  (Payments)  │    │  (Clean)     │    │  (Upsert)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Step 1: Extract (Fetch from API)

**n8n Workflow — HTTP Request Node:**

```javascript
// Configuration:
// URL: https://api.stripe.com/v1/charges?created[gte]={yesterday}
// Method: GET
// Auth: Bearer Token (Stripe API key)

// Pagination handling (Code Node):
const allCharges = [];
let hasMore = true;
let startingAfter = null;

while (hasMore) {
  const url = startingAfter
    ? `https://api.stripe.com/v1/charges?created[gte]=${yesterday}&starting_after=${startingAfter}&limit=100`
    : `https://api.stripe.com/v1/charges?created[gte]=${yesterday}&limit=100`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_KEY}` }
  });

  allCharges.push(...response.data.data);
  hasMore = response.data.has_more;
  if (hasMore) {
    startingAfter = response.data.data[response.data.data.length - 1].id;
  }
}

return allCharges.map(charge => ({
  json: {
    charge_id: charge.id,
    amount: charge.amount / 100, // Stripe uses cents
    currency: charge.currency,
    status: charge.status,
    customer_id: charge.customer,
    created_at: new Date(charge.created * 1000).toISOString(),
    description: charge.description,
    receipt_email: charge.receipt_email,
  }
}));
```

### Step 2: Transform (Clean & Standardize)

**Code Node:**

```javascript
return items.map(item => {
  const charge = item.json;

  // Validate required fields
  if (!charge.charge_id || !charge.amount) {
    console.warn('Skipping invalid charge:', charge);
    return null;
  }

  // Standardize status
  const statusMap = {
    'succeeded': 'completed',
    'pending': 'pending',
    'failed': 'failed',
    'refunded': 'refunded',
  };

  // Clean amount (ensure positive, 2 decimal places)
  const amount = Math.abs(parseFloat(charge.amount)).toFixed(2);

  return {
    json: {
      charge_id: charge.charge_id,
      amount: parseFloat(amount),
      currency: charge.currency?.toUpperCase() || 'USD',
      status: statusMap[charge.status] || 'unknown',
      customer_id: charge.customer_id || null,
      created_at: charge.created_at,
      description: charge.description?.substring(0, 500) || null,
      receipt_email: charge.receipt_email?.toLowerCase() || null,
      // Add metadata
      source: 'stripe',
      loaded_at: new Date().toISOString(),
      load_batch_id: `${new Date().toISOString().split('T')[0]}_stripe`,
    }
  };
}).filter(item => item !== null); // Remove invalid records
```

### Step 3: Load (Upsert to Database)

**PostgreSQL Node:**

```sql
-- Operation: Upsert (Insert or Update on Conflict)
-- Table: charges
-- Conflict Column: charge_id

INSERT INTO charges (
  charge_id, amount, currency, status, customer_id,
  created_at, description, receipt_email, source,
  loaded_at, load_batch_id
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
ON CONFLICT (charge_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  loaded_at = EXCLUDED.loaded_at
```

### Error Handling

**Wrap the entire pipeline in error handling:**

```javascript
// At the start of the workflow:
try {
  // ... pipeline logic ...
} catch (error) {
  // Log error
  console.error('Pipeline failed:', error.message);

  // Alert via Slack/email
  await sendAlert({
    pipeline: 'stripe-daily-sync',
    error: error.message,
    timestamp: new Date().toISOString(),
  });

  // Re-throw for n8n error handling
  throw error;
}
```

---

## PIPELINE 2: DATABASE → AGGREGATE → DASHBOARD <a name="pipeline-2"></a>

### Use Case: Calculate daily KPIs and update dashboard

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  PostgreSQL  │ →  │  Calculate   │ →  │  Dashboard   │
│  (Daily 6AM) │    │  (Raw Data)  │    │  KPIs        │    │  (Update)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Step 1: Aggregate (SQL Query)

```sql
-- Daily KPI calculation
INSERT INTO dashboard_metrics (
  metric_name, metric_date, metric_value,
  previous_value, target_value, segment
)
SELECT
  'daily_revenue' AS metric_name,
  DATE(created_at) AS metric_date,
  SUM(amount) AS metric_value,
  LAG(SUM(amount)) OVER (ORDER BY DATE(created_at)) AS previous_value,
  NULL AS target_value,
  NULL AS segment
FROM charges
WHERE status = 'completed'
  AND DATE(created_at) = CURRENT_DATE - 1
GROUP BY DATE(created_at)
ON CONFLICT (metric_name, metric_date, segment)
DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  previous_value = EXCLUDED.previous_value;

-- Additional metrics
INSERT INTO dashboard_metrics (metric_name, metric_date, metric_value)
VALUES
  ('daily_transactions', CURRENT_DATE - 1, (
    SELECT COUNT(*) FROM charges
    WHERE DATE(created_at) = CURRENT_DATE - 1 AND status = 'completed'
  )),
  ('daily_avg_order_value', CURRENT_DATE - 1, (
    SELECT AVG(amount) FROM charges
    WHERE DATE(created_at) = CURRENT_DATE - 1 AND status = 'completed'
  )),
  ('daily_unique_customers', CURRENT_DATE - 1, (
    SELECT COUNT(DISTINCT customer_id) FROM charges
    WHERE DATE(created_at) = CURRENT_DATE - 1 AND status = 'completed'
  ));
```

### Step 2: AI Enhancement (Optional)

**After aggregation, add AI insights:**

```typescript
// n8n OpenAI Node:
const metrics = await getDashboardMetrics(); // From database

const prompt = `Today's key metrics:
- Revenue: $${metrics.daily_revenue} (${metrics.daily_revenue_vs_prior}%)
- Transactions: ${metrics.daily_transactions} (${metrics.daily_transactions_vs_prior}%)
- Avg Order Value: $${metrics.daily_aov}
- Unique Customers: ${metrics.daily_customers}

Summarize in 3 bullet points for Slack.
Be specific with numbers. Mention anything notable.`;

const insights = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
});

// Send to Slack
await slack.post({
  channel: '#daily-metrics',
  text: `📊 Daily Metrics — ${new Date().toLocaleDateString()}\n\n${insights}`,
});
```

---

## PIPELINE 3: MULTI-SOURCE → DATA WAREHOUSE <a name="pipeline-3"></a>

### Use Case: Customer 360 — Combine CRM + Billing + Support

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Salesforce  │    │  Stripe      │    │  Zendesk     │
│  (CRM)       │    │  (Billing)   │    │  (Support)   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                  │                    │
       └──────────────────┼────────────────────┘
                          │
                   ┌──────▼──────┐
                   │  n8n        │
                   │  (Extract   │
                   │   + Load)   │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  Raw Tables │
                   │  (Postgres) │
                   │  - raw_crm  │
                   │  - raw_billing│
                   │  - raw_support│
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  dbt        │
                   │  (Transform)│
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  customer_  │
                   │  360 table  │
                   └─────────────┘
```

### Step 1: Extract from Each Source

**3 parallel n8n workflows (or 1 workflow with 3 branches):**

```javascript
// Branch 1: CRM (Salesforce API)
const contacts = await salesforce.query('SELECT Id, Name, Email, Company, CreatedDate FROM Contact');

// Branch 2: Billing (Stripe API)
const customers = await stripe.customers.list({ limit: 100 });

// Branch 3: Support (Zendesk API)
const tickets = await zendesk.get('/api/v2/tickets.json?per_page=100');
```

### Step 2: Load to Raw Tables

```sql
-- Each source loads to its own raw table (no transformation yet)

CREATE TABLE raw_crm_contacts (
  source_id VARCHAR PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  company VARCHAR,
  created_at TIMESTAMP,
  raw_data JSONB,  -- Store original for reference
  loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE raw_billing_customers (
  stripe_id VARCHAR PRIMARY KEY,
  email VARCHAR,
  name VARCHAR,
  created_at TIMESTAMP,
  raw_data JSONB,
  loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE raw_support_tickets (
  ticket_id VARCHAR PRIMARY KEY,
  requester_email VARCHAR,
  status VARCHAR,
  priority VARCHAR,
  created_at TIMESTAMP,
  raw_data JSONB,
  loaded_at TIMESTAMP DEFAULT NOW()
);
```

### Step 3: Transform with dbt

```sql
-- models/customer_360.sql
WITH crm AS (
  SELECT
    email,
    name AS crm_name,
    company,
    created_at AS crm_created
  FROM raw_crm_contacts
),
billing AS (
  SELECT
    email,
    stripe_id,
    name AS billing_name,
    created_at AS billing_created
  FROM raw_billing_customers
),
support AS (
  SELECT
    requester_email AS email,
    COUNT(*) AS ticket_count,
    COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_tickets,
    MAX(created_at) AS last_ticket_date
  FROM raw_support_tickets
  GROUP BY 1
)
SELECT
  COALESCE(c.email, b.email, s.email) AS email,
  COALESCE(c.crm_name, b.billing_name) AS name,
  c.company,
  b.stripe_id,
  LEAST(c.crm_created, b.billing_created) AS first_seen_at,
  s.ticket_count,
  s.open_tickets,
  s.last_ticket_date,
  -- Calculated fields
  CASE
    WHEN s.ticket_count > 10 THEN 'high_support'
    WHEN s.ticket_count > 3 THEN 'medium_support'
    ELSE 'low_support'
  END AS support_tier,
  NOW() AS updated_at
FROM crm c
FULL OUTER JOIN billing b ON c.email = b.email
FULL OUTER JOIN support s ON COALESCE(c.email, b.email) = s.email
```

### Why ELT (not ETL) for Multi-Source?

```
✅ Raw data preserved (can re-transform without re-extracting)
✅ Transform logic is SQL (easier to change, review, test)
✅ Source data isolated (one source failing doesn't break others)
✅ History maintained (raw_data JSONB for debugging)
❌ More storage (raw + transformed = 2x storage)
❌ Requires dbt or SQL expertise
```

---

## PIPELINE 4: REAL-TIME STREAM PROCESSING <a name="pipeline-4"></a>

### Use Case: Live website metrics → Real-time dashboard

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Website     │ →  │  Kafka/      │ →  │  Stream      │ →  │  Real-Time   │
│  Events      │    │  WebSocket   │    │  Processor   │    │  Dashboard   │
│  (Clicks,    │    │  (Event      │    │  (Aggregate  │    │  (WebSocket  │
│  Purchases)  │    │  Stream)     │    │   in memory)  │    │   push)      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Implementation with n8n Webhook

```
Website → Webhook → n8n → Aggregate → WebSocket → Dashboard

Webhook Node (receives events):
URL: https://n8n.yourdomain.com/webhook/event
Method: POST
Body: { "type": "purchase", "user_id": "123", "amount": 99.99, "timestamp": "..." }
```

**Code Node (Real-time aggregation):**

```javascript
// In-memory counter (for demo — use Redis for production)
const counters = global.counters || {
  purchases_today: 0,
  revenue_today: 0,
  active_users: new Set(),
  events_by_type: {},
};
global.counters = counters;

const event = items[0].json;
const today = new Date().toISOString().split('T')[0];

if (event.type === 'purchase') {
  counters.purchases_today += 1;
  counters.revenue_today += event.amount || 0;
}

if (event.user_id) {
  counters.active_users.add(event.user_id);
}

counters.events_by_type[event.type] = (counters.events_by_type[event.type] || 0) + 1;

return [{
  json: {
    ...counters,
    active_users: counters.active_users.size,
    timestamp: new Date().toISOString(),
  }
}];
```

**WebSocket Node (push to dashboard):**
```
URL: wss://dashboard.yourdomain.com
Channel: metrics
Message: {{ $json }}
```

---

## PIPELINE 5: AI-ENHANCED PIPELINE <a name="pipeline-5"></a>

### Use Case: Data → AI Analysis → Actionable Insights

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Database    │ →  │  Aggregate   │ →  │  OpenAI      │ →  │  IF Node     │ →  │  Slack Alert │
│  (Raw Data)  │    │  (KPIs)      │    │  (Insights)  │    │  (Anomaly?)  │    │  (If anomaly)│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Implementation:

**Step 1: Aggregate Data**
```sql
SELECT
  metric_name,
  metric_value,
  previous_value,
  target_value
FROM dashboard_metrics
WHERE metric_date = CURRENT_DATE - 1;
```

**Step 2: AI Analysis**
```typescript
// OpenAI Node
const prompt = `Analyze these daily metrics:
${JSON.stringify(metrics, null, 2)}

Identify:
1. Any anomalies (values significantly different from previous or target)
2. Overall sentiment (positive, neutral, negative)
3. One-sentence summary for leadership

Respond as JSON:
{
  "anomalies": [{"metric": "...", "value": X, "expected": Y, "deviation": "Z%"}],
  "sentiment": "positive|neutral|negative",
  "summary": "..."
}`;
```

**Step 3: Conditional Alert**
```javascript
// IF Node
if (result.anomalies.length > 0 || result.sentiment === 'negative') {
  // Send to Slack
  return [{ json: { shouldAlert: true, ...result } }];
} else {
  // No alert needed
  return [{ json: { shouldAlert: false } }];
}
```

---

## PIPELINE 6: SELF-HEALING PIPELINE <a name="pipeline-6"></a>

### Use Case: Detect issues → Auto-fix → Continue

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Data Source │ →  │  Quality     │ →  │  IF Node     │
│              │    │  Check       │    │  (Pass/Fix?) │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                    ┌──────────┼──────────┐
                                    ↓          ↓          ↓
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │ Continue │ │ Auto-Fix │ │ Alert &  │
                              │ (Pass)   │ │ & Retry  │ │ Stop     │
                              └──────────┘ └──────────┘ └──────────┘
```

### Implementation:

```javascript
// Quality Check Code Node
const checks = {
  total_rows: items.length,
  null_ids: items.filter(i => !i.json.id).length,
  null_amounts: items.filter(i => i.json.amount === null).length,
  negative_amounts: items.filter(i => i.json.amount < 0).length,
  future_dates: items.filter(i => new Date(i.json.date) > new Date()).length,
};

const qualityScore = (
  1 -
  (checks.null_ids + checks.null_amounts + checks.negative_amounts + checks.future_dates) /
  (checks.total_rows * 4) // 4 checks per row
) * 100;

if (qualityScore >= 95) {
  return [{ json: { action: 'continue', qualityScore, data: items } }];
} else if (qualityScore >= 85) {
  return [{ json: { action: 'auto_fix', qualityScore, data: items, checks } }];
} else {
  return [{ json: { action: 'alert_and_stop', qualityScore, checks } }];
}
```

**Auto-Fix Code Node:**
```javascript
const fixed = items.map(item => ({
  json: {
    ...item.json,
    // Fill nulls with defaults
    id: item.json.id || `auto_${Date.now()}_${Math.random()}`,
    amount: item.json.amount || 0,
    // Remove negative amounts (log for investigation)
    amount: Math.abs(item.json.amount),
    // Cap future dates
    date: new Date(item.json.date) > new Date()
      ? new Date().toISOString()
      : item.json.date,
    // Mark as auto-fixed
    _auto_fixed: true,
  }
}));

return [{ json: { action: 'continue', data: fixed, fixes_applied: checks } }];
```

---

## DATA QUALITY FRAMEWORK <a name="data-quality"></a>

### Quality Dimensions & Checks

```
1. Completeness (are required fields populated?)
   - Check: % null/empty in critical columns
   - Threshold: < 5% missing in required fields

2. Accuracy (do values reflect reality?)
   - Check: Value ranges (age: 0-120, revenue: >= 0)
   - Check: Referential integrity (foreign keys exist)
   - Threshold: < 1% out-of-range

3. Consistency (same format, same meaning?)
   - Check: Date formats (all ISO 8601)
   - Check: Enum values (status: only 'active', 'inactive', 'deleted')
   - Threshold: < 2% inconsistent

4. Timeliness (is data fresh enough?)
   - Check: Last update timestamp
   - Threshold: < 24 hours old (or SLA-specific)

5. Uniqueness (no duplicates?)
   - Check: Primary key uniqueness
   - Check: Natural key uniqueness (email, phone)
   - Threshold: 0 duplicates
```

### Automated Quality Pipeline

```
Schedule: Every 6 hours
  ↓
Query: Run quality checks on all critical tables
  ↓
Score: Calculate overall quality score per table
  ↓
Store: Log scores to quality_scores table
  ↓
IF: Score dropped > 5% from last check
  ↓
  → Alert: Slack notification with details
  → Investigate: Link to data investigation notebook
  → Block: Downstream pipelines until resolved
```

**Quality Scores Table:**
```sql
CREATE TABLE quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  check_timestamp TIMESTAMP NOT NULL,
  completeness DECIMAL(5,2),
  accuracy DECIMAL(5,2),
  consistency DECIMAL(5,2),
  timeliness DECIMAL(5,2),
  uniqueness DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  issues JSONB,
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quality_scores_table ON quality_scores(table_name);
CREATE INDEX idx_quality_scores_time ON quality_scores(check_timestamp);
```

---

## PIPELINE MONITORING & ALERTING <a name="monitoring"></a>

### What to Monitor

```
Pipeline Execution:
- Success/failure rate (target: > 95%)
- Execution time (track trends, alert on spikes)
- Data volume (rows processed — alert on significant changes)
- Data quality score (alert on drops)

Data Freshness:
- Last update time per table
- Alert if data is older than SLA

Data Quality:
- Completeness, accuracy, consistency scores
- Alert if any dimension drops below threshold

Downstream Impact:
- How many dashboards/reports depend on this pipeline?
- Alert affected stakeholders on failure
```

### n8n Monitoring Workflow

```
Schedule: Daily 9 AM
  ↓
Query: Pipeline execution history
  ↓
Calculate: Success rate, avg duration, data volumes
  ↓
Compare: vs last week averages
  ↓
Report: Email/Slack daily pipeline health summary
```

**Daily Report Generation:**
```typescript
const report = {
  date: today,
  pipelines: pipelines.map(p => ({
    name: p.name,
    success_rate: `${p.successes / p.total * 100}%`,
    avg_duration: `${p.avgDuration}s`,
    last_run: p.lastRun,
    status: p.success_rate >= 95 ? '✅' : p.success_rate >= 90 ? '⚠️' : '❌',
  })),
  alerts: pipelines.filter(p => p.success_rate < 90),
};
```

---

## PIPELINE TESTING <a name="testing"></a>

### Types of Pipeline Tests

```
1. Unit Tests (individual transformations)
   → Test each Code Node's logic
   → Test with edge cases (nulls, empty, extreme values)

2. Integration Tests (end-to-end pipeline)
   → Run full pipeline with test data
   → Verify output matches expected results

3. Data Quality Tests (ongoing)
   → Run quality checks on every execution
   → Alert on threshold violations

4. Load Tests (performance)
   → Run pipeline with 10x normal data volume
   → Verify it completes within SLA time
```

### Example: Unit Test for Transform Node

```typescript
// Test: Revenue calculation
describe('Revenue Transform', () => {
  it('should convert cents to dollars', () => {
    const input = [{ json: { amount_cents: 1999 } }];
    const output = transformRevenue(input);
    expect(output[0].json.amount_dollars).toBe(19.99);
  });

  it('should handle null amounts', () => {
    const input = [{ json: { amount_cents: null } }];
    const output = transformRevenue(input);
    expect(output[0].json.amount_dollars).toBe(0);
  });

  it('should handle negative amounts (refunds)', () => {
    const input = [{ json: { amount_cents: -500 } }];
    const output = transformRevenue(input);
    expect(output[0].json.amount_dollars).toBe(0);
    expect(output[0].json.is_refund).toBe(true);
  });
});
```

---

## TROUBLESHOOTING <a name="troubleshooting"></a>

### Common Pipeline Issues

| Issue | Symptoms | Fix |
|-------|----------|-----|
| **API rate limit** | 429 errors, partial data | Add pagination + rate limiting + retry |
| **Schema change** | New/missing columns, type errors | Add schema validation + fallback defaults |
| **Data volume spike** | Slow pipeline, memory issues | Add batching + pagination |
| **Duplicate data** | Double-counted metrics | Add idempotency (upsert, dedup) |
| **Stale data** | Dashboard shows old data | Add freshness check + alert |
| **Pipeline timeout** | Execution killed mid-run | Optimize query + increase timeout |
| **Silent failure** | No errors but wrong data | Add data quality checks + validation |

### Debugging Checklist

```
1. Check execution logs (n8n → Executions)
2. Check input data (is source data correct?)
3. Test each node individually (isolate the issue)
4. Test with small data sample (easier to debug)
5. Check downstream impact (did bad data propagate?)
6. Verify with source system (is the issue upstream?)
```

---

-date-month-last two digit of year: 12-04-26

# n8n Automation Mastery — Data Analyst / BI Analyst Edition

# Last Updated: 12-04-26

# Version: 1.0 — From Basics to Production Pipelines

---

## TABLE OF CONTENTS

1. [Why n8n for Data Analysts?](#why-n8n)
2. [n8n Architecture Deep Dive](#architecture)
3. [Core Concepts Mastery](#core-concepts)
4. [Data Pipeline Patterns](#pipeline-patterns)
5. [5 Production-Ready Workflow Templates](#workflow-templates)
6. [OpenAI Integration in n8n](#openai-integration)
7. [Error Handling & Reliability](#error-handling)
8. [Performance Optimization](#performance)
9. [Monitoring & Alerting](#monitoring)
10. [Advanced Patterns](#advanced-patterns)
11. [Troubleshooting Guide](#troubleshooting)
12. [Best Practices Checklist](#best-practices)

---

## WHY N8N FOR DATA ANALYSTS? <a name="why-n8n"></a>

### The Problem Data Analysts Face

```
Traditional Data Pipeline Setup:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Data Source │ →  │  Python ETL  │ →  │  Dashboard   │
│  (APIs, DB)  │    │  Script      │    │  (Power BI)  │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                    ┌──────▼──────┐
                    │  Cron Job   │
                    │  (Linux)    │
                    └─────────────┘

Problems:
❌ Scripts break silently (no monitoring)
❌ Hard to debug (need SSH, logs)
❌ Scheduling requires cron knowledge
❌ Error handling is manual (try/catch + email)
❌ Adding AI requires separate script
❌ Sharing workflows requires code review
```

### Why n8n Solves This

```
n8n Data Pipeline:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Data Source │ →  │  Transform   │ →  │  AI Analyze  │ →  │  Alert/Report│
│  (Node UI)   │    │  (Node UI)   │    │  (Node UI)   │    │  (Node UI)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                              │
                       Visual Monitoring
                       Error Notifications
                       Execution History
                       One-Click Retry
```

### n8n vs Alternatives

| Feature | n8n | Airflow | Python Scripts | Zapier |
|---------|-----|---------|----------------|--------|
| **Visual UI** | ✅ Yes | ❌ Code-only | ❌ Code-only | ✅ Yes |
| **Self-Hosted** | ✅ Free | ✅ Free | ✅ Free | ❌ No |
| **AI Integration** | ✅ Native | ⚠️ Custom | ✅ Custom | ⚠️ Limited |
| **Database Nodes** | ✅ Built-in | ⚠️ Custom | ✅ Custom | ❌ No |
| **Error Handling** | ✅ Visual | ✅ Python | ⚠️ Manual | ⚠️ Basic |
| **Learning Curve** | 🟢 Low | 🔴 High | 🟡 Medium | 🟢 Low |
| **Cost at Scale** | 💚 Free | 💚 Free | 💚 Free | 💰 Expensive |
| **Best For** | **Analysts** | Engineers | Engineers | Non-technical |

**Verdict:** n8n is the **sweet spot** for data analysts — visual enough to build quickly, powerful enough for production pipelines.

---

## N8N ARCHITECTURE DEEP DIVE <a name="architecture"></a>

### 3.1 Deployment Options

**Option A: n8n Cloud (Easiest)**
```
Pros:
- Zero setup (sign up, start building)
- Managed infrastructure (no server maintenance)
- Auto-scaling, backups, updates
- Free tier: 1,000 executions/month

Cons:
- Paid plans start at $20/month
- Data leaves your infrastructure
- Limited customization

Best for: Prototyping, small teams, non-sensitive data
```

**Option B: Self-Hosted (Recommended for Production)**
```
Docker Compose (Simplest self-hosted):

version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - N8N_SECURE_COOKIE=false
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n_password
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - GENERIC_TIMEZONE=UTC
      - TZ=UTC
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n_password
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  n8n_data:
  postgres_data:
  redis_data:

Pros:
- Free (open-source)
- Full control (custom nodes, integrations)
- Data stays in your infrastructure
- Unlimited executions

Cons:
- Requires server management
- You handle backups, updates, scaling

Best for: Production pipelines, sensitive data, cost optimization
```

**Option C: n8n Desktop (Local Development)**
```
- Install via npm: npm install n8n -g
- Run: n8n start
- Access: http://localhost:5678
- Best for: Building and testing workflows locally
```

### 3.2 n8n Data Model

**How Data Flows Through n8n:**

```javascript
// Every node receives and returns an ARRAY of items:

Input to node:
[
  { json: { column1: 'value1', column2: 123 } },
  { json: { column1: 'value2', column2: 456 } },
  { json: { column1: 'value3', column2: 789 } }
]

// Each item can also have binary data (files):
[
  {
    json: { filename: 'report.csv', url: 'https://...' },
    binary: {
      data: {
        mimeType: 'text/csv',
        data: <Buffer ...>,
        fileExtension: 'csv'
      }
    }
  }
]

// Return transformed data:
return items.map(item => ({
  json: {
    ...item.json,
    calculated_field: item.json.column2 * 2
  }
}));
```

**Key Insight:** n8n processes data as an **array of items**, NOT as a single object. This is crucial for understanding transformations.

### 3.3 Execution Modes

```
Mode 1: Regular Execution (Default)
- Processes all items in parallel
- Fast but can overwhelm APIs
- Good for small datasets (< 100 items)

Mode 2: Batch Execution
- Processes items in batches
- Prevents API rate limits
- Good for large datasets (1000+ items)

Mode 3: Queue Mode (Production)
- Uses Redis + BullMQ for execution queue
- Multiple workers process jobs
- Survives server restarts
- Required for: High volume, reliability, scaling

Enable Queue Mode:
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=redis
```

---

## CORE CONCEPTS MASTERY <a name="core-concepts"></a>

### 4.1 Node Types Every Data Analyst Must Know

**Data Source Nodes:**
```
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL / MySQL / MongoDB                           │
│  - Execute queries, fetch rows                          │
│  - Return as JSON items                                 │
│  - Pagination for large result sets                     │
├─────────────────────────────────────────────────────────┤
│  HTTP Request                                           │
│  - REST API calls (GET, POST, PUT, DELETE)              │
│  - Authentication (API key, OAuth, Bearer)              │
│  - Pagination (offset, cursor, page-based)              │
│  - Rate limiting (wait between requests)                │
├─────────────────────────────────────────────────────────┤
│  Google Sheets                                          │
│  - Read/write rows, ranges                              │
│  - Authentication via service account                   │
│  - Good for: Ad-hoc reporting, collaboration            │
├─────────────────────────────────────────────────────────┤
│  S3 / Google Cloud Storage                              │
│  - Read/write files (CSV, JSON, Parquet)                │
│  - List files, filter by prefix/date                    │
│  - Good for: Data lake integration                      │
└─────────────────────────────────────────────────────────┘
```

**Transformation Nodes:**
```
┌─────────────────────────────────────────────────────────┐
│  Code Node (JavaScript)                                 │
│  - Most powerful node (write any JS logic)              │
│  - Access: items, $input, $node, $workflow             │
│  - Return: Array of items (must match input structure)  │
│  - Use for: Complex transformations, calculations       │
├─────────────────────────────────────────────────────────┤
│  Aggregate Node                                         │
│  - Group by field, calculate sums/averages              │
│  - Good for: Pivot tables, rollups                      │
│  - Alternative: Do aggregation in SQL (faster)          │
├─────────────────────────────────────────────────────────┤
│  Filter Node                                            │
│  - Keep/drop items based on conditions                  │
│  - Good for: Data quality checks, segmentation          │
├─────────────────────────────────────────────────────────┤
│  Merge Node                                             │
│  - Join two data streams (inner, left, right, outer)    │
│  - Good for: Combining data from multiple sources       │
│  - Alternative: Do joins in SQL (faster, more reliable) │
├─────────────────────────────────────────────────────────┤
│  Sort Node                                              │
│  - Sort by field(s), ascending/descending               │
│  - Good for: Ranking, top-N analysis                    │
├─────────────────────────────────────────────────────────┤
│  Split Out Node                                         │
│  - Expand arrays into separate items                    │
│  - Good for: Normalizing nested JSON                    │
└─────────────────────────────────────────────────────────┘
```

**AI/ML Nodes:**
```
┌─────────────────────────────────────────────────────────┐
│  OpenAI Node                                            │
│  - Chat completions (GPT-4, GPT-3.5)                    │
│  - Embeddings (text similarity, clustering)             │
│  - Image generation (DALL-E for reports)                │
│  - Good for: Insights, summaries, categorization        │
├─────────────────────────────────────────────────────────┤
│  Hugging Face Node                                      │
│  - Pre-trained models (sentiment, NER, classification)  │
│  - Good for: NLP tasks without OpenAI cost              │
├─────────────────────────────────────────────────────────┤
│  HTTP Request (Custom AI)                               │
│  - Connect to local LLMs (Ollama, vLLM)                 │
│  - Connect to Claude, Gemini, custom models             │
│  - Good for: Cost optimization, privacy                 │
└─────────────────────────────────────────────────────────┘
```

**Output Nodes:**
```
┌─────────────────────────────────────────────────────────┐
│  Email (SMTP, SendGrid, SES)                            │
│  - Send HTML reports, CSV attachments                   │
│  - Good for: Scheduled reporting                        │
├─────────────────────────────────────────────────────────┤
│  Slack / Discord                                        │
│  - Post messages, files, charts                         │
│  - Good for: Real-time alerts, team updates             │
├─────────────────────────────────────────────────────────┤
│  Webhook                                                │
│  - POST results to dashboard API                        │
│  - Good for: Real-time dashboard updates                │
├─────────────────────────────────────────────────────────┤
│  Database (Write)                                       │
│  - Insert/update aggregated results                     │
│  - Good for: Storing analysis outputs                   │
├─────────────────────────────────────────────────────────┤
│  Google Sheets (Write)                                  │
│  - Append rows, update ranges                           │
│  - Good for: Collaborative reporting                    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Expressions — The Secret Sauce

**Expression Syntax:**
```javascript
// Access previous node's output:
{{ $node["PostgreSQL"].json["column_name"] }}

// Access current item's field:
{{ $json["column_name"] }}

// Access workflow variables:
{{ $workflow.data.myVariable }}

// Access environment variables:
{{ $env.MY_SECRET_KEY }}

// JavaScript expressions:
{{ Math.round($json["revenue"] * 100) / 100 }}
{{ new Date().toISOString().split('T')[0] }}

// Conditional logic:
{{ $json["status"] === 'active' ? '✅' : '❌' }}

// Array operations:
{{ $json["tags"].join(', ') }}
{{ $json["items"].length }}
```

**Common Expression Patterns:**

```javascript
// 1. Date Formatting
{{ new Date($json["created_at"]).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}) }}
// Output: "Apr 12, 2026"

// 2. Currency Formatting
{{ new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format($json["revenue"]) }}
// Output: "$1,234.56"

// 3. Percentage Calculation
{{ (($json["converted"] / $json["total"]) * 100).toFixed(1) + '%' }}
// Output: "45.2%"

// 4. Conditional Status
{{ $json["value"] >= $json["target"] ? '🟢' :
   $json["value"] >= $json["target"] * 0.8 ? '🟡' : '🔴' }}

// 5. Dynamic SQL Query (use with caution — SQL injection risk)
{{ `SELECT * FROM users WHERE created_at >= '${$workflow.data.startDate}'` }}
```

### 4.3 Workflow Variables

**Types:**
```
1. Static Variables (defined in workflow settings)
   - Use for: Config values, thresholds, API keys
   - Access: {{ $workflow.data.variableName }}

2. Dynamic Variables (set during execution)
   - Use for: Intermediate results, timestamps, counters
   - Set with: "Set" node
   - Access: {{ $workflow.data.variableName }}

3. Environment Variables (from .env file)
   - Use for: Secrets, credentials, endpoints
   - Set in: Docker environment or server .env
   - Access: {{ $env.VARIABLE_NAME }}
```

**Best Practice:**
```
✅ Use environment variables for:
   - Database credentials
   - API keys (OpenAI, Slack, etc.)
   - Webhook URLs

✅ Use workflow variables for:
   - Date ranges (start_date, end_date)
   - Thresholds (alert if revenue < $X)
   - Recipient emails (who gets the report)

❌ Don't hardcode:
   - Credentials in workflow JSON
   - URLs that change between environments
   - Thresholds that need frequent adjustment
```

---

## DATA PIPELINE PATTERNS <a name="pipeline-patterns"></a>

### 5.1 Pattern 1: ETL Pipeline (Extract → Transform → Load)

**Use Case:** Sync data from external API to data warehouse

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  HTTP Request│ →  │  Code Node   │ →  │  PostgreSQL  │
│  (Daily 2AM) │    │  (Fetch API) │    │  (Transform) │    │  (Insert)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Implementation:**

```
Node 1: Schedule Trigger
- Cron: 0 2 * * * (every day at 2 AM)

Node 2: HTTP Request
- Method: GET
- URL: https://api.example.com/sales?date={{ new Date().toISOString().split('T')[0] }}
- Authentication: Bearer Token ({{ $env.API_KEY }})
- Pagination: Offset-based (loop until no more results)

Node 3: Code Node (Transform)
Code:
```javascript
// Clean and transform API response
return items.map(item => ({
  json: {
    // Standardize field names
    transaction_id: item.json.id,
    customer_id: item.json.customer_id,
    product_name: item.json.product?.name || 'Unknown',
    revenue: parseFloat(item.json.amount) || 0,
    currency: item.json.currency || 'USD',
    transaction_date: new Date(item.json.created_at).toISOString(),

    // Add metadata
    loaded_at: new Date().toISOString(),
    source: 'api.example.com',

    // Calculate derived fields
    revenue_usd: item.json.currency === 'USD'
      ? parseFloat(item.json.amount)
      : parseFloat(item.json.amount) * (item.json.exchange_rate || 1),
  }
}));
```

Node 4: PostgreSQL
- Operation: Insert
- Table: raw_transactions
- Columns: Map from transformed JSON
- On Conflict: Do nothing (prevent duplicates)
```

### 5.2 Pattern 2: Automated Reporting Pipeline

**Use Case:** Generate and email weekly sales report

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  PostgreSQL  │ →  │  Code Node   │ →  │  OpenAI      │ →  │  Email       │
│  (Mon 9AM)   │    │  (Aggregate) │    │  (Format)    │    │  (Summary)   │    │  (Send)      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Implementation:**

```
Node 1: Schedule Trigger
- Cron: 0 9 * * 1 (every Monday at 9 AM)

Node 2: PostgreSQL (Query)
```sql
SELECT
  DATE_TRUNC('week', transaction_date) AS week,
  COUNT(*) AS total_transactions,
  SUM(revenue) AS total_revenue,
  AVG(revenue) AS avg_transaction_value,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM raw_transactions
WHERE transaction_date >= NOW() - INTERVAL '8 weeks'
GROUP BY 1
ORDER BY 1 DESC;
```

Node 3: Code Node (Format for AI)
```javascript
// Format data as a summary for OpenAI
const data = items.map(item => item.json);

const summary = {
  period: 'Last 8 weeks',
  current_week: data[0],
  previous_week: data[1],
  trend: {
    revenue_change: ((data[0].total_revenue - data[1].total_revenue) / data[1].total_revenue * 100).toFixed(1),
    transaction_change: ((data[0].total_transactions - data[1].total_transactions) / data[1].total_transactions * 100).toFixed(1),
    customer_change: ((data[0].unique_customers - data[1].unique_customers) / data[1].unique_customers * 100).toFixed(1),
  },
  weekly_data: data.map(d => ({
    week: d.week,
    revenue: d.total_revenue,
    transactions: d.total_transactions,
    customers: d.unique_customers,
  }))
};

return [{ json: { summary: JSON.stringify(summary, null, 2) } }];
```

Node 4: OpenAI (Generate Summary)
- Model: gpt-4-turbo
- System Prompt:
```
You are a senior business analyst. Write a concise executive summary
(3 paragraphs, max 200 words) from the provided weekly sales data.

Structure:
1. Overall performance (revenue vs prior week)
2. Key highlights and concerns
3. Recommendation for leadership

Be data-driven, specific, and action-oriented.
```

Node 5: Email (Send Report)
- To: {{ $env.SALES_VP_EMAIL }}
- Subject: Weekly Sales Report — {{ new Date().toLocaleDateString() }}
- HTML Body:
```html
<h1>Weekly Sales Report</h1>
<p>{{ $node["OpenAI"].json["content"] }}</p>
<hr>
<h2>Key Metrics</h2>
<table>
  <tr><th>Metric</th><th>This Week</th><th>Last Week</th><th>Change</th></tr>
  <tr>
    <td>Revenue</td>
    <td>${{ $json.current_week.total_revenue.toLocaleString() }}</td>
    <td>${{ $json.previous_week.total_revenue.toLocaleString() }}</td>
    <td>{{ $json.trend.revenue_change }}%</td>
  </tr>
</table>
```
```

### 5.3 Pattern 3: Anomaly Detection + Alerting Pipeline

**Use Case:** Monitor real-time metrics, alert on anomalies

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  PostgreSQL  │ →  │  Code Node   │ →  │  IF Node     │ →  │  Slack Alert │
│  (Every 5min)│    │  (Fetch)     │    │  (Detect)    │    │  (Anomaly?)  │    │  (If yes)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                   │
                                                            No Anomaly → End
```

**Implementation:**

```
Node 1: Schedule Trigger
- Cron: */5 * * * * (every 5 minutes)

Node 2: PostgreSQL (Fetch Recent Metrics)
```sql
SELECT
  metric_name,
  metric_value,
  recorded_at
FROM metrics
WHERE metric_name IN ('api_response_time', 'error_rate', 'active_users')
  AND recorded_at >= NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC;
```

Node 3: Code Node (Statistical Anomaly Detection)
```javascript
const _ = require('lodash'); // Available in n8n

function detectAnomalies(data, metricName) {
  const values = data
    .filter(d => d.json.metric_name === metricName)
    .map(d => d.json.metric_value)
    .sort((a, b) => a - b);

  if (values.length < 10) return null; // Need enough data

  // Calculate statistics
  const mean = _.mean(values);
  const std = _.stdDev ? _.stdDev(values) : Math.sqrt(_.mean(values.map(v => (v - mean) ** 2)));
  const latest = values[values.length - 1];

  // Z-score anomaly detection
  const zScore = Math.abs((latest - mean) / std);

  return {
    metric: metricName,
    latest: latest,
    mean: mean.toFixed(2),
    std: std.toFixed(2),
    zScore: zScore.toFixed(2),
    isAnomaly: zScore > 3, // 3 standard deviations = anomaly
    direction: latest > mean ? 'above' : 'below',
  };
}

const metrics = ['api_response_time', 'error_rate', 'active_users'];
const anomalies = metrics
  .map(m => detectAnomalies(items, m))
  .filter(a => a !== null && a.isAnomaly);

if (anomalies.length > 0) {
  return [{ json: { anomalies, hasAnomalies: true } }];
} else {
  return [{ json: { hasAnomalies: false } }];
}
```

Node 4: IF Node
- Condition: {{ $json["hasAnomalies"] === true }}
- True → Slack Alert
- False → End (no alert needed)

Node 5: Slack Alert
- Channel: #data-alerts
- Message:
```
🚨 *ANOMALY DETECTED*

{{ $json.anomalies.map(a => `
*${a.metric}*: ${a.latest.toFixed(2)}
- Expected: ~${a.mean} (±${a.std})
- Z-Score: ${a.zScore}
- Direction: ${a.direction} normal
`).join('\n') }}

Investigate: https://dashboard.example.com/metrics
```
```

### 5.4 Pattern 4: Multi-Source Data Aggregation

**Use Case:** Combine data from multiple sources for unified analysis

```
┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │  Google      │
│  (Sales)     │    │  Sheets      │    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│              │ →  │  (Marketing) │ →  │  Merge Node  │ →  │  Code Node   │ →  │  Dashboard   │
│              │    │              │    │  (Join)      │    │  (Aggregate) │    │  (Webhook)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Implementation:**

```
Node 1: PostgreSQL (Sales Data)
```sql
SELECT
  DATE_TRUNC('day', transaction_date) AS date,
  COUNT(*) AS sales_count,
  SUM(revenue) AS sales_revenue
FROM transactions
WHERE transaction_date >= NOW() - INTERVAL '30 days'
GROUP BY 1;
```

Node 2: Google Sheets (Marketing Spend)
- Spreadsheet ID: {{ $env.MARKETING_SHEET_ID }}
- Range: 'Daily Spend!A:D'
- Returns: Array of rows with date, channel, spend, clicks

Node 3: Merge Node
- Mode: Combine
- Combines sales + marketing data by date

Node 4: Code Node (Calculate ROI)
```javascript
const salesData = items.filter(i => i.json.source === 'postgresql');
const marketingData = items.filter(i => i.json.source === 'google_sheets');

// Aggregate marketing spend by date
const spendByDate = {};
marketingData.forEach(item => {
  const date = item.json.date.split('T')[0];
  if (!spendByDate[date]) spendByDate[date] = 0;
  spendByDate[date] += parseFloat(item.json.spend) || 0;
});

// Merge with sales and calculate ROI
return salesData.map(item => {
  const date = item.json.date.split('T')[0];
  const revenue = parseFloat(item.json.sales_revenue) || 0;
  const spend = spendByDate[date] || 0;
  const roi = spend > 0 ? ((revenue - spend) / spend * 100).toFixed(1) : null;

  return {
    json: {
      date,
      sales_count: item.json.sales_count,
      revenue,
      marketing_spend: spend,
      roi: roi ? parseFloat(roi) : null,
      efficiency: spend > 0 ? (revenue / spend).toFixed(2) : null,
    }
  };
});
```

Node 5: Webhook (Update Dashboard)
- Method: POST
- URL: {{ $env.DASHBOARD_API_URL }}/api/v1/metrics/roi
- Body: {{ $json }}
```

### 5.5 Pattern 5: Data Quality Monitoring Pipeline

**Use Case:** Continuously validate data quality, alert on issues

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  Data Quality│ →  │  Code Node   │ →  │  IF Node     │
│  (Every 6hr) │    │  Checks      │    │  (Score)     │    │  (Score < 90?)│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                   │
                                              ┌────────────────────┼────────────────────┐
                                              ↓                    ↓                    ↓
                                       ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                                       │  Email Report│    │  Slack Alert │    │  Log to DB   │
                                       │  (Always)    │    │  (If fail)   │    │  (Always)    │
                                       └──────────────┘    └──────────────┘    └──────────────┘
```

---

## OPENAI INTEGRATION IN N8N <a name="openai-integration"></a>

### 6.1 Setup OpenAI in n8n

**Step 1: Get OpenAI API Key**
```
1. Go to https://platform.openai.com/
2. Sign up / Log in
3. Navigate to API Keys
4. Create new secret key
5. Copy key (you won't see it again!)
```

**Step 2: Add Credential in n8n**
```
1. n8n → Credentials → Add Credential
2. Select "OpenAI API"
3. Name: "openai-production"
4. API Key: Paste your key
5. Save
```

**Step 3: Use in Workflow**
```
1. Add OpenAI node to workflow
2. Select credential: "openai-production"
3. Choose operation: Chat, Embedding, Image, etc.
4. Configure prompt, model, parameters
```

### 6.2 Use Case 1: Automated Insight Generation

**Scenario:** You have a weekly sales report. Instead of manually analyzing it, let AI generate insights.

**n8n Workflow:**

```
PostgreSQL (Fetch weekly data) → Code (Calculate stats) → OpenAI (Generate insights) → Slack (Post insights)
```

**OpenAI Node Configuration:**
```
Resource: Chat
Operation: Complete
Model: gpt-4-turbo

System Message:
You are a senior data analyst specializing in sales analytics.
Analyze the provided weekly sales data and identify:
1. Key trends (revenue, volume, customer count)
2. Anomalies (unexpected spikes or drops)
3. Actionable insights (what business should do)

Respond in this JSON format:
{
  "summary": "2-3 sentence overview",
  "trends": ["trend 1 with data", "trend 2 with data"],
  "anomalies": ["anomaly 1 with explanation"],
  "insights": ["insight 1 with recommendation"],
  "risks": ["risk 1 if applicable"]
}

User Message:
Weekly Sales Data (last 4 weeks):
{{ $json["weekly_data"] }}

Current Week vs Prior Week:
- Revenue: {{ $json.current_revenue }} vs {{ $json.prior_revenue }} ({{ $json.revenue_change }}%)
- Transactions: {{ $json.current_txns }} vs {{ $json.prior_txns }} ({{ $json.txn_change }}%)
- Customers: {{ $json.current_customers }} vs {{ $json.prior_customers }} ({{ $json.customer_change }}%)

Top Product: {{ $json.top_product }} ({{ $json.top_product_revenue }})
Bottom Product: {{ $json.bottom_product }} ({{ $json.bottom_product_revenue }})
```

**Expected Output:**
```json
{
  "summary": "Revenue grew 12% WoW to $45.2K, driven by strong performance in Enterprise segment. However, customer acquisition slowed, suggesting growth is from existing customer expansion rather than new logos.",
  "trends": [
    "Revenue growth accelerating: 5% → 8% → 12% over 3 weeks",
    "Enterprise segment up 25%, SMB flat at 2%",
    "Average deal size increasing: $1,200 → $1,450 → $1,680"
  ],
  "anomalies": [
    "Tuesday spike ($12K vs $6K avg) — traced to 3 Enterprise renewals"
  ],
  "insights": [
    "Focus on Enterprise renewals (highest ROI) — assign dedicated CSMs",
    "SMB acquisition stalling — review pricing or add self-serve option"
  ],
  "risks": [
    "Growth concentration risk: Top 3 customers = 45% of revenue"
  ]
}
```

### 6.3 Use Case 2: Text-to-SQL (Natural Language Querying)

**Scenario:** Non-technical stakeholders want to query the database without knowing SQL.

**n8n Workflow:**

```
Webhook (Receive question) → OpenAI (Convert to SQL) → PostgreSQL (Execute) → OpenAI (Explain results) → Webhook (Return answer)
```

**OpenAI Node 1 (Text-to-SQL):**
```
System Message:
You are a PostgreSQL expert. Convert natural language questions to SQL queries.

Database Schema:
- Table: users (id, name, email, created_at, plan, status)
- Table: transactions (id, user_id, amount, currency, created_at, status)
- Table: subscriptions (id, user_id, plan, start_date, end_date, status)

Rules:
1. Use PostgreSQL dialect
2. Include LIMIT 100 for safety
3. Use table aliases for readability
4. Add comments explaining the query
5. Return ONLY the SQL, no explanation

User Message:
"Show me the top 10 customers by total spending in the last 30 days"

Expected Output:
```sql
-- Top 10 customers by total spending (last 30 days)
SELECT
  u.name,
  u.email,
  COUNT(t.id) AS transaction_count,
  SUM(t.amount) AS total_spent,
  AVG(t.amount) AS avg_transaction
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND t.status = 'completed'
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC
LIMIT 10;
```
```

**OpenAI Node 2 (Explain Results):**
```
System Message:
You are a data analyst explaining results to a non-technical stakeholder.
Summarize the query results in plain English. Highlight key findings.

User Message:
Question: "Show me the top 10 customers by total spending in the last 30 days"

Results:
{{ $json.rows }}

Expected Output:
"Here are your top 10 customers from the last 30 days:

🥇 John Smith — $12,450 (15 transactions, avg $830)
🥈 Sarah Johnson — $9,800 (8 transactions, avg $1,225)
...

Key Insights:
- Top 10 customers generated $68.2K (32% of total revenue)
- Sarah Johnson has highest avg transaction ($1,225) — potential Enterprise upgrade candidate
- 3 of top 10 are on Basic plan — upsell opportunity
"
```

### 6.4 Use Case 3: Automated Report Summarization

**Scenario:** You generate a 50-page monthly report. Executives want a 1-page summary.

**n8n Workflow:**

```
Google Drive (Fetch report PDF) → Extract text → OpenAI (Summarize) → Email (Send summary)
```

**OpenAI Node Configuration:**
```
Model: gpt-4-turbo (128K context for long reports)

System Message:
You are a Chief of Staff preparing a board-ready executive summary.
Create a 1-page summary (max 500 words) from the monthly report.

Structure:
1. Performance vs Plan (are we on track?)
2. Key Wins (what went well, with numbers)
3. Key Concerns (what's off-track, with impact)
4. Recommendations (prioritized, actionable)

Tone: Professional, data-driven, direct
Audience: Board of Directors (assume business savvy, no jargon)

User Message:
{{ $json.report_text }}

Expected Output:
"Executive Summary — April 2026

Performance vs Plan:
Revenue at $1.2M (95% of plan), slightly behind due to Enterprise sales cycle extension. Gross margin at 78% (vs 80% target), pressured by infrastructure cost increases. Net revenue retention at 112% (above 110% target), driven by upsells.

Key Wins:
- Launched Product X, acquired 500 customers in first month
- Reduced churn from 5.2% to 4.1% (annualized $240K savings)
- Expanded into EU market, 50 enterprise trials initiated

Key Concerns:
- Sales cycle lengthening (45 → 62 days), pushing Q2 revenue to Q3
- Customer acquisition cost up 15% ($450 → $520), driven by paid channel saturation
- Engineering headcount 10% below plan, risking product roadmap

Recommendations:
1. Hire 3 AEs immediately (pipeline can support, capacity is bottleneck)
2. Shift 20% paid budget to organic content (CAC efficiency)
3. Accelerate EU hiring (demand exceeds supply, first-mover advantage)
"
```

---

## ERROR HANDLING & RELIABILITY <a name="error-handling"></a>

### 7.1 Error Handling Strategies

**Strategy 1: Try-Catch in Code Node**
```javascript
try {
  // Your data processing logic
  const result = processData(items);
  return result;
} catch (error) {
  // Return error for downstream handling
  return [{
    json: {
      error: true,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      input_count: items.length,
    }
  }];
}
```

**Strategy 2: n8n Error Trigger Workflow**
```
1. Create a separate workflow for error handling
2. Set trigger: "On Error" (fires when any workflow fails)
3. Actions:
   - Log error to database
   - Send Slack alert with error details
   - Retry the failed workflow (optional)
   - Notify workflow owner
```

**Error Trigger Workflow Example:**
```
Trigger: On Error
  ↓
Code Node (Format Error)
```javascript
const error = $input.first().json;
return [{
  json: {
    workflow_name: error.workflow?.name || 'Unknown',
    error_message: error.message,
    error_node: error.node?.name || 'Unknown',
    timestamp: new Date().toISOString(),
    severity: error.message.includes('timeout') ? 'high' : 'medium',
  }
}];
```
  ↓
Slack (Alert)
Message:
```
⚠️ *Workflow Error*

Workflow: {{ $json.workflow_name }}
Node: {{ $json.error_node }}
Error: {{ $json.error_message }}
Time: {{ new Date($json.timestamp).toLocaleString() }}
Severity: {{ $json.severity === 'high' ? '🔴' : '🟡' }}

Check execution logs: https://n8n.yourdomain.com/executions
```
  ↓
PostgreSQL (Log)
Table: workflow_errors
Columns: workflow_name, error_message, error_node, timestamp, severity
```

**Strategy 3: Retry Logic for External APIs**
```
HTTP Request Node Settings:
- Retry on Fail: ✅ Enabled
- Max Retries: 3
- Backoff: Exponential (1s, 2s, 4s)
- Retry Conditions: 429 (rate limit), 500-599 (server errors)

Don't retry:
- 400 (Bad Request) — fix the request
- 401 (Unauthorized) — fix credentials
- 404 (Not Found) — fix the URL
- 422 (Validation Error) — fix the payload
```

### 7.2 Data Quality Checks

**Add these checks before processing data:**

```javascript
// Code Node: Data Quality Gate
const checks = {
  input_count: items.length,
  missing_values: 0,
  null_ids: 0,
  out_of_range: 0,
  duplicates: 0,
};

// Check for missing/null values
items.forEach(item => {
  Object.values(item.json).forEach(val => {
    if (val === null || val === undefined || val === '') {
      checks.missing_values++;
    }
  });

  // Check for null IDs
  if (!item.json.id) {
    checks.null_ids++;
  }

  // Check for out-of-range values
  if (item.json.revenue && (item.json.revenue < 0 || item.json.revenue > 1000000)) {
    checks.out_of_range++;
  }
});

// Check for duplicates
const ids = items.map(i => i.json.id);
const uniqueIds = new Set(ids);
checks.duplicates = ids.length - uniqueIds.size;

// Calculate quality score
const totalChecks = items.length * 4; // 4 checks per item
const issues = checks.missing_values + checks.null_ids + checks.out_of_range + checks.duplicates;
const qualityScore = ((totalChecks - issues) / totalChecks * 100).toFixed(1);

if (qualityScore < 90) {
  // Quality below threshold — alert and stop
  return [{
    json: {
      quality_check: 'FAILED',
      quality_score: parseFloat(qualityScore),
      checks,
      action: 'ALERT_AND_STOP',
    }
  }];
}

// Quality OK — continue
return [{
  json: {
    quality_check: 'PASSED',
    quality_score: parseFloat(qualityScore),
    checks,
    action: 'CONTINUE',
    data: items,
  }
}];
```

---

## PERFORMANCE OPTIMIZATION <a name="performance"></a>

### 8.1 Optimizing Large Data Volumes

**Problem:** n8n loads ALL items into memory. Large datasets (10K+ rows) can crash.

**Solution 1: Paginate API Calls**
```
HTTP Request Node:
- Use pagination parameters (limit, offset)
- Loop through all pages
- Process each page separately

Implementation:
1. HTTP Request (Page 1: limit=1000, offset=0)
2. IF Node: Has more pages? (response.length === 1000)
3. Yes → HTTP Request (Page 2: limit=1000, offset=1000)
4. Merge all pages
5. Process
```

**Solution 2: Aggregate in Database (not n8n)**
```
❌ BAD: Fetch 100K rows → Aggregate in n8n Code Node
✅ GOOD: Aggregate in SQL → Fetch 100 rows → Process in n8n

-- Instead of:
SELECT * FROM transactions WHERE date >= '2026-01-01';

-- Do:
SELECT
  DATE_TRUNC('day', date) AS day,
  COUNT(*) AS count,
  SUM(amount) AS total,
  AVG(amount) AS avg
FROM transactions
WHERE date >= '2026-01-01'
GROUP BY 1;
-- Returns 365 rows instead of 100K
```

**Solution 3: Use Queue Mode**
```
For workflows processing 1K+ items:
- Enable queue mode (Redis + workers)
- Configure parallel processing
- Monitor queue depth

docker-compose.yml:
  n8n:
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168  # 7 days
```

### 8.2 Workflow Optimization Tips

```
1. Filter early, process later
   ❌ Fetch 10K rows → Filter in Code Node
   ✅ Fetch 100 rows (filtered in SQL) → Process

2. Use SQL aggregations
   ❌ Fetch all rows → Count in Code Node
   ✅ SELECT COUNT(*) in SQL

3. Batch API requests
   ❌ 100 individual API calls
   ✅ 1 API call with bulk endpoint

4. Cache repeated lookups
   ❌ Query database for each item
   ✅ Query once → Store in variable → Reference

5. Limit OpenAI calls
   ❌ Call OpenAI for each row
   ✅ Aggregate → Single OpenAI call for summary

6. Set execution timeouts
   Workflow Settings → Timeout: 300 seconds
   (Prevents runaway workflows)
```

---

## MONITORING & ALERTING <a name="monitoring"></a>

### 9.1 n8n Built-in Monitoring

**Executions Dashboard:**
```
- View all workflow executions
- Filter by status (success, error, waiting)
- View execution details (time, data, errors)
- Retry failed executions
```

**Key Metrics to Track:**
```
- Success rate: > 95% (alert if drops below)
- Average execution time: Track trends (alert if spikes)
- Failed executions: Review daily (root cause analysis)
- Queue depth (if queue mode): Alert if > 100 pending
```

### 9.2 Custom Monitoring with n8n + OpenAI

**Automated Workflow Health Report:**

```
Schedule: Daily 9 AM
  ↓
Query n8n API (get execution stats)
  ↓
Code Node (Calculate metrics)
```javascript
const executions = $input.all().map(i => i.json);

const total = executions.length;
const success = executions.filter(e => e.status === 'success').length;
const failed = executions.filter(e => e.status === 'error').length;
const successRate = (success / total * 100).toFixed(1);
const avgDuration = executions.reduce((sum, e) => sum + e.duration, 0) / total;

return [{
  json: {
    date: new Date().toISOString().split('T')[0],
    total_executions: total,
    success_count: success,
    failed_count: failed,
    success_rate: parseFloat(successRate),
    avg_duration_ms: Math.round(avgDuration),
    status: successRate >= 95 ? 'healthy' : 'degraded',
  }
}];
```
  ↓
OpenAI (Generate insights)
  ↓
Email/Slack (Send daily report)
```

### 9.3 Alerting Rules

```
Create these alerts in n8n:

1. Workflow Failure (Immediate)
   Trigger: On Error
   Action: Slack alert with error details

2. Low Success Rate (Daily)
   Trigger: Schedule (daily 9 AM)
   Condition: Success rate < 95%
   Action: Email report + Slack alert

3. Long Execution Time (Per execution)
   Trigger: Workflow completion
   Condition: Duration > 2x average
   Action: Log to database + Slack if critical

4. Data Quality Drop (Every 6 hours)
   Trigger: Schedule
   Condition: Quality score < 90%
   Action: Slack alert + stop downstream workflows

5. API Rate Limit Hit (Per execution)
   Trigger: HTTP Request error (429)
   Action: Wait and retry + alert if persistent
```

---

## ADVANCED PATTERNS <a name="advanced-patterns"></a>

### 10.1 Pattern: Self-Healing Pipeline

```
A pipeline that detects and fixes its own issues:

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Data Source │ →  │  Quality     │ →  │  IF Node     │
│              │    │  Check       │    │  (Pass/Fail?)│
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                    ┌──────────┼──────────┐
                                    ↓          ↓          ↓
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │ Continue │ │ Auto-Fix │ │ Alert &  │
                              │ (Pass)   │ │ & Retry  │ │ Stop     │
                              └──────────┘ └──────────┘ └──────────┘
```

**Implementation:**
```
Quality Check Results:
- Pass (> 95% quality): Continue
- Minor issues (90-95%): Auto-fix (fill missing values, deduplicate)
- Major issues (< 90%): Alert and stop

Auto-Fix Code Node:
```javascript
return items.map(item => ({
  json: {
    ...item.json,
    // Fill missing values with defaults
    revenue: item.json.revenue || 0,
    customer_id: item.json.customer_id || 'unknown',
    status: item.json.status || 'pending',

    // Fix date formats
    created_at: new Date(item.json.created_at).toISOString(),

    // Remove duplicates (keep first occurrence)
    // (handled by dedup node downstream)
  }
}));
```
```

### 10.2 Pattern: Multi-Environment Workflows

```
Same workflow, different configs per environment:

Development:
- Test data (sample of production)
- Lower thresholds (catch more issues)
- Slack: #data-dev-alerts
- No email reports (avoid noise)

Staging:
- Recent production snapshot
- Production-like thresholds
- Slack: #data-staging-alerts
- Weekly email report

Production:
- Full data
- Production thresholds
- Slack: #data-alerts (critical only)
- Daily/weekly reports to stakeholders
```

**Implementation:**
```
Use environment variables:
- ENVIRONMENT=development|staging|production
- SLACK_CHANNEL={{ $env.ENVIRONMENT === 'production' ? '#data-alerts' : '#data-dev-alerts' }}
- DATA_LIMIT={{ $env.ENVIRONMENT === 'development' ? 1000 : null }}
- ALERT_THRESHOLD={{ $env.ENVIRONMENT === 'development' ? 90 : 95 }}
```

### 10.3 Pattern: Workflow Versioning

```
n8n workflows can be exported as JSON. Use Git for version control:

1. Export workflow: n8n UI → Export → JSON
2. Save to Git: workflows/daily-sales-report-v1.json
3. Document changes: Changelog in workflow description
4. Rollback if needed: Import previous version
```

**Workflow Description Template:**
```
Name: daily-sales-report-v2
Purpose: Automated daily sales report with AI insights
Owner: data-team@company.com
Schedule: Daily 8 AM
Inputs: PostgreSQL (transactions table)
Outputs: Slack (#sales-reports), Email (sales-vp@company.com)
Changelog:
  v2 (2026-04-12): Added OpenAI insight generation
  v1 (2026-03-01): Initial version — basic aggregation + email
```

---

## TROUBLESHOOTING GUIDE <a name="troubleshooting"></a>

### 12.1 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Workflow runs but produces no output** | Code Node returns undefined | Ensure Code Node returns `[{ json: { ... } }]` |
| **"Cannot read property of undefined"** | Missing field in data | Add null checks: `item.json.field || default` |
| **API returns 401 Unauthorized** | Expired/invalid API key | Re-check credentials, rotate key |
| **Workflow times out** | Too much data, slow API | Paginate, aggregate in DB, increase timeout |
| **Duplicate data in database** | Workflow runs twice | Add idempotency checks (upsert instead of insert) |
| **OpenAI returns empty response** | Invalid prompt, wrong model | Check prompt format, verify model name |
| **n8n crashes on large data** | Memory limit | Use queue mode, paginate, aggregate in DB |
| **Schedule doesn't fire** | Wrong cron expression, timezone | Verify cron syntax, check server timezone |

### 12.2 Debugging Techniques

```
1. Use "Debug" mode in n8n
   - Execute node-by-node
   - Inspect data at each step
   - Identify exactly where issue occurs

2. Add logging in Code Node
```javascript
console.log('Input count:', items.length);
console.log('First item:', items[0]?.json);
console.log('Processing...');
// Your code
console.log('Output count:', result.length);
return result;
```

3. Check execution history
   - n8n → Executions → Filter by workflow
   - View input/output of each node
   - Identify data transformation issues

4. Test with minimal data
   - Instead of 10K rows, test with 10
   - Isolate the issue faster
   - Once fixed, run with full data

5. Use "Wait" node for rate limiting
   - If API has rate limit (e.g., 100/min)
   - Add Wait node between batches
   - Wait: 60 seconds per 100 requests
```

---

## BEST PRACTICES CHECKLIST <a name="best-practices"></a>

### Workflow Design
```
□ Meaningful workflow name (purpose + version)
□ Description (what, why, who, schedule)
□ Error handling at every critical step
□ Retry logic for external API calls
□ Timeout configured (prevent runaways)
□ Data quality checks before processing
□ Logging at key steps (for debugging)
□ Version control (export JSON to Git)
```

### Data Handling
```
□ Paginate large API responses
□ Aggregate in database (not n8n)
□ Filter early, process later
□ Handle null/missing values gracefully
□ Validate data types (numbers, dates, strings)
□ Deduplicate before writing to database
□ Use transactions for multi-step writes
```

### OpenAI Integration
```
□ Use structured outputs (JSON schema)
□ Clear system prompt (role, task, format)
□ Temperature=0 for deterministic tasks
□ Validate AI outputs (don't trust blindly)
□ Monitor token usage (cost control)
□ Fallback behavior if API fails
□ Human-in-the-loop for critical decisions
```

### Security
```
□ No hardcoded credentials (use env vars)
□ No sensitive data in logs
□ API keys rotated quarterly
□ Webhook URLs validated
□ Database queries parameterized (no SQL injection)
□ Access control (who can edit/run workflows)
□ Audit trail (who changed what, when)
```

### Monitoring
```
□ Success rate tracked (target: > 95%)
□ Execution time monitored (alert on spikes)
□ Error notifications configured (Slack/email)
□ Data quality scores tracked
□ Pipeline freshness monitored (data not stale)
□ Monthly workflow review (optimize, clean up)
□ Quarterly access review (who has access)
```

---

-date-month-last two digit of year: 12-04-26

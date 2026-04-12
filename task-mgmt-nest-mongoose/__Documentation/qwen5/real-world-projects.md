# Real-World Project Templates — 6 Complete Projects

# Last Updated: 12-04-26

# Version: 1.0 — Portfolio-Ready, Production-Grade Projects

---

## PROJECT INDEX

| # | Project | Difficulty | Skills Demonstrated | Portfolio Value |
|---|---------|------------|--------------------|--------------------|
| 1 | Automated Daily Sales Report + AI Insights | Beginner | n8n, SQL, OpenAI, Email | ⭐⭐⭐⭐ |
| 2 | Customer Churn Prediction + Alert System | Intermediate | Python, ML, n8n, Slack | ⭐⭐⭐⭐⭐ |
| 3 | Marketing Campaign ROI Dashboard | Intermediate | SQL, BI, Data Modeling | ⭐⭐⭐⭐ |
| 4 | Real-Time Anomaly Detection Pipeline | Advanced | Streaming, Stats, OpenAI | ⭐⭐⭐⭐⭐ |
| 5 | Customer 360 with AI Health Scoring | Advanced | Multi-source, AI, Dashboard | ⭐⭐⭐⭐⭐ |
| 6 | Predictive Revenue Forecasting System | Expert | Time Series, AI, Automation | ⭐⭐⭐⭐⭐ |

---

## PROJECT 1: Automated Daily Sales Report + AI Insights <a name="project-1"></a>

**Difficulty:** Beginner
**Time to Build:** 2-3 hours
**Tools:** n8n, PostgreSQL, OpenAI, Email

### Business Problem

```
The sales VP checks revenue numbers every morning at 9 AM.
Currently: Analyst manually runs SQL queries → copies to spreadsheet → emails.
Time spent: 30 minutes/day = 10 hours/month.

Solution: Fully automated daily report with AI-generated insights.
```

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  PostgreSQL  │ →  │  OpenAI      │ →  │  Format      │ →  │  Email       │
│  (Daily 8AM) │    │  (Aggregate) │    │  (Insights)  │    │  (HTML)      │    │  (Send)      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Implementation

**Step 1: Schedule Trigger (n8n)**
```
Cron: 0 8 * * 1-5 (weekdays at 8 AM)
```

**Step 2: PostgreSQL Query**
```sql
-- Yesterday's sales summary
SELECT
  COUNT(*) AS total_orders,
  SUM(amount) AS total_revenue,
  AVG(amount) AS avg_order_value,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
WHERE DATE(created_at) = CURRENT_DATE - 1
  AND status = 'completed';

-- Top 5 products
SELECT
  p.name,
  COUNT(o.id) AS orders,
  SUM(o.amount) AS revenue
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE DATE(o.created_at) = CURRENT_DATE - 1
  AND o.status = 'completed'
GROUP BY p.id, p.name
ORDER BY revenue DESC
LIMIT 5;

-- 7-day trend
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS orders,
  SUM(amount) AS revenue
FROM orders
WHERE created_at >= CURRENT_DATE - 7
  AND status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date;
```

**Step 3: Format Data for AI (Code Node)**
```javascript
const summary = items[0].json;
const topProducts = items.filter(i => i.json.name);
const trend = items.filter(i => i.json.date);

const yesterday = trend[trend.length - 2];
const dayBefore = trend[trend.length - 3] || yesterday;
const revenueChange = yesterday
  ? ((yesterday.revenue - dayBefore.revenue) / dayBefore.revenue * 100).toFixed(1)
  : 0;

return [{
  json: {
    data: {
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      summary: {
        orders: summary.total_orders,
        revenue: summary.total_revenue,
        aov: summary.avg_order_value,
        customers: summary.unique_customers,
        revenue_change: revenueChange,
      },
      top_products: topProducts.map(p => ({
        name: p.name,
        orders: p.orders,
        revenue: p.revenue,
      })),
      trend: trend.map(t => ({
        date: t.date,
        revenue: t.revenue,
        orders: t.orders,
      })),
    }
  }
}];
```

**Step 4: OpenAI Insight Generation**
```
Model: gpt-4o-mini
Temperature: 0.3

System Prompt:
You are a sales analyst. Write a 3-paragraph daily sales summary.

Paragraph 1: Revenue performance (specific numbers, vs prior day)
Paragraph 2: Top product highlights
Paragraph 3: Any concerns or notable patterns

Be concise (max 150 words total). Data-driven. No fluff.
```

**Step 5: Format HTML Email**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; }
    .metric { background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
    .insights { padding: 16px; background: #fff3cd; border-radius: 8px; margin: 16px; }
    .products { padding: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h2>📊 Daily Sales Report — {{ $json.data.date }}</h2>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="metric-value">${{ $json.data.summary.revenue.toLocaleString() }}</div>
      <div class="metric-label">Revenue ({{ $json.data.summary.revenue_change }}%)</div>
    </div>
    <div class="metric">
      <div class="metric-value">{{ $json.data.summary.orders }}</div>
      <div class="metric-label">Orders</div>
    </div>
    <div class="metric">
      <div class="metric-value">${{ $json.data.summary.aov.toFixed(0) }}</div>
      <div class="metric-label">Avg Order Value</div>
    </div>
    <div class="metric">
      <div class="metric-value">{{ $json.data.summary.customers }}</div>
      <div class="metric-label">Unique Customers</div>
    </div>
  </div>

  <div class="insights">
    <h3>🤖 AI Insights</h3>
    <p>{{ $json.ai_insights }}</p>
  </div>

  <div class="products">
    <h3>Top Products</h3>
    <table>
      <tr><th>Product</th><th>Orders</th><th>Revenue</th></tr>
      {{ $json.data.top_products.map(p => `<tr><td>${p.name}</td><td>${p.orders}</td><td>$${p.revenue}</td></tr>`).join('') }}
    </table>
  </div>
</body>
</html>
```

**Step 6: Send Email**
```
To: sales-vp@company.com
CC: data-team@company.com
Subject: 📊 Daily Sales Report — {{ $json.data.date }}
Body: HTML from Step 5
```

### Project Outcome

```
Time Saved: 10 hours/month
Automation: 100% (zero manual work)
AI Value: Provides context that raw numbers don't
Error Rate: 0% (vs manual copy-paste errors)
```

---

## PROJECT 2: Customer Churn Prediction + Alert System <a name="project-2"></a>

**Difficulty:** Intermediate
**Time to Build:** 1-2 days
**Tools:** Python, Scikit-learn, n8n, Slack, PostgreSQL

### Business Problem

```
The company loses 5% of customers monthly ($50K MRR churn).
Most churn is preventable — customers show warning signs before leaving.

Solution: Predict at-risk customers daily and alert the CS team.
```

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Schedule    │ →  │  Feature     │ →  │  ML Model    │ →  │  Risk        │ →  │  Slack       │
│  (Daily 7AM) │    │  Extraction  │    │  (Scoring)   │    │  Segmentation│    │  Alert       │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Implementation

**Step 1: Feature Extraction (SQL)**
```sql
-- Customer features for churn prediction
SELECT
  c.id AS customer_id,
  c.email,
  c.name,
  c.created_at AS signup_date,
  -- Activity metrics
  DATEDIFF(CURRENT_DATE, MAX(o.created_at)) AS days_since_last_order,
  COUNT(o.id) AS total_orders,
  COUNT(CASE WHEN o.created_at >= CURRENT_DATE - 30 THEN 1 END) AS orders_last_30d,
  COUNT(CASE WHEN o.created_at >= CURRENT_DATE - 90 THEN 1 END) AS orders_last_90d,
  SUM(o.amount) AS lifetime_value,
  AVG(o.amount) AS avg_order_value,
  -- Support metrics
  COUNT(DISTINCT t.id) AS support_tickets,
  COUNT(DISTINCT CASE WHEN t.status = 'open' THEN t.id END) AS open_tickets,
  -- Engagement
  MAX(s.last_login) AS last_login,
  DATEDIFF(CURRENT_DATE, MAX(s.last_login)) AS days_since_login
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'completed'
LEFT JOIN support_tickets t ON c.id = t.customer_id
LEFT JOIN sessions s ON c.id = s.customer_id
WHERE c.status = 'active'
GROUP BY c.id, c.email, c.name, c.created_at
HAVING COUNT(o.id) > 0; -- Only customers with at least one order
```

**Step 2: ML Scoring (Python Script)**
```python
import pandas as pd
import joblib
import json
import sys
from datetime import datetime

# Load model (trained separately)
model = joblib.load('churn_model.pkl')

# Read input from stdin (n8n passes data)
input_data = json.loads(sys.stdin.read())
df = pd.DataFrame([item['json'] for item in input_data])

# Feature engineering
df['order_velocity_30d'] = df['orders_last_30d'] / 30
df['order_velocity_90d'] = df['orders_last_90d'] / 90
df['velocity_change'] = (df['order_velocity_30d'] - df['order_velocity_90d']) / (df['order_velocity_90d'] + 1e-8)
df['days_since_last_order'] = df['days_since_last_order'].fillna(999)
df['days_since_login'] = df['days_since_login'].fillna(999)

# Prepare features
features = [
    'days_since_last_order', 'total_orders', 'orders_last_30d',
    'orders_last_90d', 'lifetime_value', 'avg_order_value',
    'support_tickets', 'open_tickets', 'days_since_login',
    'order_velocity_30d', 'order_velocity_90d', 'velocity_change'
]

X = df[features].fillna(0)

# Predict churn probability
df['churn_probability'] = model.predict_proba(X)[:, 1]

# Risk categories
df['risk_level'] = pd.cut(
    df['churn_probability'],
    bins=[0, 0.2, 0.5, 0.8, 1.0],
    labels=['low', 'medium', 'high', 'critical']
)

# Output results
output = df[['customer_id', 'name', 'email', 'churn_probability', 'risk_level',
             'days_since_last_order', 'lifetime_value', 'open_tickets']].to_dict('records')

print(json.dumps(output, indent=2, default=str))
```

**Step 3: Risk Segmentation (n8n IF Node)**
```javascript
// Split customers by risk level
const atRisk = items.filter(i =>
  i.json.risk_level === 'high' || i.json.risk_level === 'critical'
);

const lowRisk = items.filter(i =>
  i.json.risk_level === 'low' || i.json.risk_level === 'medium'
);

// Return high-risk customers for alerting
return atRisk.map(item => ({
  json: {
    ...item.json,
    action_needed: item.json.risk_level === 'critical'
      ? '🚨 IMMEDIATE outreach required'
      : '⚠️ Proactive check-in recommended',
  }
}));
```

**Step 4: Slack Alert**
```
Channel: #customer-success-alerts

Message:
🔔 *Churn Risk Alert — {{ new Date().toLocaleDateString() }}

{{ $json.length }} customers at high risk of churn:

{{ $json.map(c => `
*${c.name}* (${c.email})
Risk: ${c.risk_level === 'critical' ? '🔴 CRITICAL' : '🟡 HIGH'}
Churn Probability: ${(c.churn_probability * 100).toFixed(0)}%
Last Order: ${c.days_since_last_order} days ago
Lifetime Value: $${c.lifetime_value}
Open Tickets: ${c.open_tickets}
Action: ${c.action_needed}
`).join('\n')}

📋 Full list: https://dashboard.company.com/churn-risk
```

**Step 5: Save to Database**
```sql
-- Store churn scores for tracking
INSERT INTO churn_predictions (
  customer_id, churn_probability, risk_level,
  predicted_at, features
) VALUES (
  $1, $2, $3, NOW(), $4
)
ON CONFLICT (customer_id, DATE(predicted_at))
DO UPDATE SET churn_probability = EXCLUDED.churn_probability;
```

### Model Training (One-Time Setup)

```python
# Train churn model with historical data
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# Load historical data (churned vs retained customers)
df = pd.read_sql("""
  SELECT
    -- Same features as above
    -- Label: 1 if churned within 30 days, 0 if retained
    CASE WHEN churned_at IS NOT NULL AND churned_at < signup_date + 90 THEN 1 ELSE 0 END AS churned
  FROM customer_history
""", db_connection)

X = df.drop(['customer_id', 'churned'], axis=1)
y = df['churned']

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# Save model
joblib.dump(model, 'churn_model.pkl')
```

### Project Outcome

```
Churn Reduction: 5% → 3.5% (25-30% reduction)
MRR Saved: ~$12-15K/month
Alert Accuracy: 78% (precision), 85% (recall)
CS Team Efficiency: 40% less time identifying at-risk customers
```

---

## PROJECT 3: Marketing Campaign ROI Dashboard <a name="project-3"></a>

**Difficulty:** Intermediate
**Time to Build:** 1-2 days
**Tools:** SQL, Power BI/Metabase, Python, n8n

### Business Problem

```
Marketing spends $100K/month across 5 channels (Google, Facebook, Email, SEO, Partnerships).
Leadership doesn't know which channels are working.
Currently: Monthly manual spreadsheet, no real-time visibility.

Solution: Automated ROI dashboard updated daily with channel comparison.
```

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Ad Platforms│ →  │  n8n ETL     │ →  │  Data        │ →  │  Dashboard   │
│  (APIs)      │    │  (Extract +  │    │  Warehouse   │    │  (Metabase)  │
│  Google Ads  │    │   Load)      │    │  (Postgres)  │    │              │
│  Facebook    │    │              │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Data Model

```sql
-- Unified marketing spend table
CREATE TABLE marketing_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel VARCHAR(50) NOT NULL,  -- google, facebook, email, seo, partnerships
  spend DECIMAL(12,2) NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  leads INTEGER,
  customers INTEGER,
  revenue DECIMAL(12,2),
  campaign_name VARCHAR(100),
  raw_data JSONB,
  loaded_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(date, channel, campaign_name)
);

-- ROI calculation view
CREATE VIEW marketing_roi AS
SELECT
  date,
  channel,
  spend,
  revenue,
  revenue - spend AS profit,
  CASE WHEN spend > 0 THEN (revenue - spend) / spend ELSE NULL END AS roi,
  CASE WHEN clicks > 0 THEN spend / clicks ELSE NULL END AS cpc,
  CASE WHEN leads > 0 THEN spend / leads ELSE NULL END AS cpl,
  CASE WHEN customers > 0 THEN spend / customers ELSE NULL END AS cac,
  CASE WHEN impressions > 0 THEN clicks / impressions::float * 100 ELSE NULL END AS ctr
FROM marketing_spend;
```

### n8n ETL Workflow

**Google Ads Extract:**
```javascript
// HTTP Request Node:
// URL: https://googleads.googleapis.com/v16/customers/{customer_id}/googleAds:search
// Method: POST
// Auth: OAuth2

// Response transformation:
return response.data.results.map(r => ({
  json: {
    date: r.segments.date,
    channel: 'google',
    campaign_name: r.campaign.name,
    spend: r.metrics.cost_micros / 1000000,
    impressions: r.metrics.impressions,
    clicks: r.metrics.clicks,
    leads: r.metrics.conversions,
    raw_data: r,
  }
}));
```

**Facebook Ads Extract:**
```javascript
// HTTP Request Node:
// URL: https://graph.facebook.com/v18.0/act_{ad_account_id}/insights
// Method: GET
// Auth: Access Token

return response.data.data.map(r => ({
  json: {
    date: r.date_start,
    channel: 'facebook',
    campaign_name: r.campaign_name,
    spend: parseFloat(r.spend),
    impressions: r.impressions,
    clicks: r.link_clicks,
    leads: r.actions?.find(a => a.action_type === 'lead')?.value || 0,
    raw_data: r,
  }
}));
```

**Load to Database:**
```sql
-- Upsert with ON CONFLICT
INSERT INTO marketing_spend (date, channel, campaign_name, spend, impressions, clicks, leads, raw_data)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (date, channel, campaign_name)
DO UPDATE SET
  spend = EXCLUDED.spend,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  leads = EXCLUDED.leads,
  raw_data = EXCLUDED.raw_data;
```

### Dashboard Design

```
┌─────────────────────────────────────────────────────────┐
│  Marketing ROI Dashboard                                  │
│  Filters: [Date Range ▼] [Channel ▼] [Campaign ▼]       │
├─────────────────────────────────────────────────────────┤
│  Total Spend: $98.5K  |  Total Revenue: $312K  |  ROI: 217% │
├─────────────────────────────────────────────────────────┤
│  ROI by Channel (sorted)                                │
│  📊 [Horizontal bar chart]                              │
│  Email:     ████████████████████████████ 450% ROI       │
│  Google:    ████████████████████ 210% ROI               │
│  Facebook:  ████████████ 120% ROI                       │
│  SEO:       ████████ 85% ROI                            │
│  Partners:  ████ 45% ROI                                │
├────────────────────┬────────────────────────────────────┤
│  Spend vs Revenue  │  CPA by Channel                    │
│  (Stacked area)    │  (Scatter: spend vs CPA)           │
├────────────────────┴────────────────────────────────────┤
│  Campaign Performance Table                              │
│  [Campaign] [Channel] [Spend] [Revenue] [ROI] [Trend]   │
│  [Sort by ROI descending] [Export CSV]                  │
└─────────────────────────────────────────────────────────┘
```

### AI Budget Recommendation

```typescript
// Weekly: AI recommends budget reallocation
const prompt = `Current marketing performance this week:
${JSON.stringify(channelPerformance, null, 2)}

Total budget: $100K/month.
Current allocation: ${JSON.stringify(currentAllocation)}

Recommend optimal budget reallocation based on ROI.
Constraints:
- Minimum 10% per channel (don't cut any channel entirely)
- Maximum 40% per channel (don't over-concentrate)
- Consider diminishing returns (ROI drops at scale)

Return JSON:
{
  "recommendations": [
    {"channel": "google", "current_budget": 30000, "recommended": 35000, "reason": "..."}
  ],
  "expected_impact": "Projected revenue increase: +X%"
}`;
```

### Project Outcome

```
Budget Optimization: Shifted $15K from low-ROI to high-ROI channels
Revenue Impact: +$45K/month (+14%)
Visibility: Real-time (vs monthly manual)
Decision Speed: Hours instead of weeks
```

---

## PROJECT 4: Real-Time Anomaly Detection Pipeline <a name="project-4"></a>

**Difficulty:** Advanced
**Time to Build:** 2-3 days
**Tools:** Python, n8n, OpenAI, Slack, PostgreSQL

### Business Problem

```
The operations team discovers issues hours after they happen.
By the time they notice the problem, customers are already affected.

Solution: Detect anomalies in real-time, explain them with AI, and alert immediately.
```

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Metrics     │ →  │  Statistical │ →  │  IF Node     │ →  │  OpenAI      │
│  (Every 5m)  │    │  Detection   │    │  (Anomaly?)  │    │  (Explain)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                   │
                                                            ┌──────▼──────┐
                                                            │  Slack      │
                                                            │  Alert +    │
                                                            │  Explanation│
                                                            └─────────────┘
```

### Implementation

**Step 1: Fetch Recent Metrics (Every 5 Minutes)**
```sql
SELECT
  metric_name,
  metric_value,
  recorded_at
FROM metrics_stream
WHERE metric_name IN (
  'api_response_time',
  'error_rate',
  'active_users',
  'request_rate',
  'queue_depth'
)
AND recorded_at >= NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC;
```

**Step 2: Statistical Anomaly Detection (Python)**
```python
import json
import sys
import numpy as np
from scipy import stats

def detect_anomalies(data, metric_name):
    values = [d['json']['metric_value'] for d in data
              if d['json']['metric_name'] == metric_name]

    if len(values) < 20:
        return None  # Not enough data

    values = np.array(values)
    latest = values[-1]

    # Use rolling window (last 20 data points)
    window = values[-20:]
    mean = np.mean(window[:-1])  # Exclude latest
    std = np.std(window[:-1])

    if std == 0:
        return None

    z_score = abs((latest - mean) / std)

    # Isolation Forest for complex patterns
    from sklearn.ensemble import IsolationForest
    if len(window) >= 10:
        iso = IsolationForest(contamination=0.1, random_state=42)
        iso.fit(window[:-1].reshape(-1, 1))
        iso_prediction = iso.predict([[latest]])[0]  # 1 = normal, -1 = anomaly
    else:
        iso_prediction = 1

    return {
        'metric': metric_name,
        'current_value': float(latest),
        'rolling_mean': float(mean),
        'rolling_std': float(std),
        'z_score': float(z_score),
        'is_zscore_anomaly': z_score > 3,
        'is_isolation_anomaly': iso_prediction == -1,
        'is_anomaly': z_score > 3 or iso_prediction == -1,
        'direction': 'above' if latest > mean else 'below',
        'deviation_percent': float(abs((latest - mean) / mean) * 100),
    }

# Read input
input_data = json.loads(sys.stdin.read())

# Check each metric
metrics = ['api_response_time', 'error_rate', 'active_users', 'request_rate', 'queue_depth']
anomalies = []

for metric in metrics:
    result = detect_anomalies(input_data, metric)
    if result and result['is_anomaly']:
        anomalies.append(result)

# Output
if anomalies:
    print(json.dumps({'has_anomalies': True, 'anomalies': anomalies}))
else:
    print(json.dumps({'has_anomalies': False}))
```

**Step 3: AI Explanation (OpenAI Node)**
```
Model: gpt-4o-mini
Temperature: 0.2

System Prompt:
You are a Site Reliability Engineer investigating a metric anomaly.
Explain what happened, possible causes, and recommended action.

Be specific with numbers. Keep it under 100 words.

User Prompt:
Metric: {{ $json.anomalies[0].metric }}
Current Value: {{ $json.anomalies[0].current_value }}
Expected (rolling avg): {{ $json.anomalies[0].rolling_mean.toFixed(2) }}
Deviation: {{ $json.anomalies[0].deviation_percent.toFixed(1) }}%
Direction: {{ $json.anomalies[0].direction }} normal
Z-Score: {{ $json.anomalies[0].z_score.toFixed(2) }}

Provide:
1. What happened (plain English)
2. 2-3 possible causes
3. Immediate action to take
```

**Step 4: Slack Alert**
```
Channel: #ops-alerts

🚨 *ANOMALY DETECTED* — {{ new Date().toLocaleTimeString() }}

*{{ $json.anomalies[0].metric }}*: {{ $json.anomalies[0].current_value }}
Expected: ~{{ $json.anomalies[0].rolling_mean.toFixed(2) }} ({{ $json.anomalies[0].deviation_percent.toFixed(1) }}% deviation)
Z-Score: {{ $json.anomalies[0].z_score.toFixed(2) }}

🤖 *AI Analysis:*
{{ $json.ai_explanation }}

🔗 Dashboard: https://grafana.company.com/metrics
📋 Runbook: https://wiki.company.com/runbooks/{{ $json.anomalies[0].metric }}
```

### Project Outcome

```
Detection Time: < 5 minutes (vs hours manually)
False Positive Rate: 8% (statistical + AI filtering)
MTTR Reduction: 40% (faster root cause identification)
On-Call Burden: 60% fewer false alerts (AI filters noise)
```

---

## PROJECT 5: Customer 360 with AI Health Scoring <a name="project-5"></a>

**Difficulty:** Advanced
**Time to Build:** 3-4 days
**Tools:** Python, SQL, n8n, OpenAI, Dashboard

### Business Problem

```
Customer data is spread across 5 systems: CRM, billing, support, product, email.
No one has a complete view of customer health.
CSM's spend hours compiling customer profiles before meetings.

Solution: Unified customer view with AI-generated health scores and recommendations.
```

### Architecture

```
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│  CRM   │  │Billing │  │Support │  │Product │  │  Email │
│(Salesf.)│ │Stripe  │  │Zendesk │  │  Mixpanel│ │SendGrid│
└───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
    │           │           │           │           │
    └───────────┴───────────┴───────────┴───────────┘
                        │
                 ┌──────▼──────┐
                 │  n8n        │
                 │  (Extract + │
                 │   Load)     │
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │  Raw Tables │
                 │  (Postgres) │
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │  dbt        │
                 │  (Transform │
                 │   → cust_360)│
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │  OpenAI     │
                 │  (Health    │
                 │   Score +   │
                 │   Recs)     │
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │  Dashboard  │
                 │  (Per-cust  │
                 │   profile)  │
                 └─────────────┘
```

### Data Model (dbt)

```sql
-- models/customer_360.sql
WITH crm AS (
  SELECT customer_id, company_name, industry, company_size,
         account_owner, contract_value, contract_start, contract_end
  FROM raw_crm_accounts
),
billing AS (
  SELECT customer_id,
         SUM(amount) AS total_revenue,
         AVG(amount) AS avg_monthly_spend,
         COUNT(DISTINCT invoice_id) AS invoice_count,
         MAX(invoice_date) AS last_invoice_date,
         SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) AS overdue_amount,
         COUNT(CASE WHEN status = 'overdue' THEN 1 END) AS overdue_count
  FROM raw_billing_invoices
  GROUP BY customer_id
),
support AS (
  SELECT customer_id,
         COUNT(*) AS total_tickets,
         COUNT(CASE WHEN status IN ('open', 'pending') THEN 1 END) AS open_tickets,
         AVG(resolution_time_hours) AS avg_resolution_time,
         AVG(satisfaction_score) AS avg_satisfaction,
         COUNT(CASE WHEN satisfaction_score <= 2 THEN 1 END) AS negative_feedback_count
  FROM raw_support_tickets
  GROUP BY customer_id
),
product AS (
  SELECT customer_id,
         COUNT(DISTINCT user_id) AS active_users,
         AVG(session_duration_minutes) AS avg_session_duration,
         COUNT(DISTINCT feature_used) AS features_adopted,
         MAX(last_active_at) AS last_active_at,
         DATEDIFF(CURRENT_DATE, MAX(last_active_at)) AS days_since_active
  FROM raw_product_usage
  GROUP BY customer_id
)
SELECT
  COALESCE(c.customer_id, b.customer_id, s.customer_id, p.customer_id) AS customer_id,
  c.company_name,
  c.industry,
  c.company_size,
  c.account_owner,
  c.contract_value,
  -- Billing metrics
  b.total_revenue,
  b.avg_monthly_spend,
  b.overdue_count,
  -- Support metrics
  s.total_tickets,
  s.open_tickets,
  s.avg_resolution_time,
  s.avg_satisfaction,
  s.negative_feedback_count,
  -- Product metrics
  p.active_users,
  p.avg_session_duration,
  p.features_adopted,
  p.days_since_active,
  -- Calculated scores
  -- Revenue health
  CASE
    WHEN b.avg_monthly_spend > 5000 THEN 'enterprise'
    WHEN b.avg_monthly_spend > 1000 THEN 'mid-market'
    ELSE 'smb'
  END AS tier,
  -- Engagement score (0-100)
  LEAST(100, GREATEST(0,
    COALESCE(p.active_users * 10, 0) +
    COALESCE(p.features_adopted * 5, 0) +
    CASE WHEN COALESCE(p.days_since_active, 999) < 7 THEN 20
         WHEN COALESCE(p.days_since_active, 999) < 30 THEN 10
         ELSE 0 END
  )) AS engagement_score,
  NOW() AS updated_at
FROM crm c
FULL OUTER JOIN billing b ON c.customer_id = b.customer_id
FULL OUTER JOIN support s ON COALESCE(c.customer_id, b.customer_id) = s.customer_id
FULL OUTER JOIN product p ON COALESCE(c.customer_id, b.customer_id, s.customer_id) = p.customer_id
```

### AI Health Scoring

```typescript
// For each customer, generate health assessment
async function scoreCustomerHealth(customer: Customer360) {
  const prompt = `Evaluate customer health based on these metrics:

Customer: ${customer.company_name} (${customer.tier})
Contract Value: $${customer.contract_value}
Monthly Spend: $${customer.avg_monthly_spend}
Engagement Score: ${customer.engagement_score}/100
Active Users: ${customer.active_users}
Days Since Active: ${customer.days_since_active}
Open Support Tickets: ${customer.open_tickets}
Avg Satisfaction: ${customer.avg_satisfaction}/5
Overdue Invoices: ${customer.overdue_count}
Features Adopted: ${customer.features_adopted}

Provide:
1. Health score (0-100)
2. Health status (healthy, at-risk, critical)
3. Key strengths (what's going well)
4. Key risks (what needs attention)
5. Specific recommendations for the CSM

Return JSON:
{
  "health_score": number,
  "health_status": "healthy|at-risk|critical",
  "strengths": string[],
  "risks": string[],
  "recommendations": string[],
  "next_action": "immediate|within_week|routine"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Dashboard View

```
┌─────────────────────────────────────────────────────────┐
│  Customer 360: Acme Corp                                 │
│  Health: 🟢 Healthy (82/100)  |  Tier: Enterprise       │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Contract    │  MRR         │  Active      │  Days      │
│  $120K/yr    │  $12,500     │  Users: 45   │  Active: 2 │
├──────────────┴──────────────┴──────────────┴────────────┤
│  Engagement Score: ████████████░░░░ 72/100              │
│  Satisfaction: ⭐⭐⭐⭐ 4.2/5                              │
│  Features Adopted: 12/20 (60%)                          │
├────────────────────┬────────────────────────────────────┤
│  AI Assessment     │  Recommendations                   │
│                    │                                    │
│  Strengths:        │  1. Schedule QBR (contract renews  │
│  - High engagement │     in 60 days)                    │
│  - 12 features     │  2. Introduce 8 unused features    │
│    adopted         │  3. Connect with new VP of Ops     │
│                    │                                    │
│  Risks:            │  Next Action: Schedule QBR         │
│  - 3 open tickets  │  Priority: Within this week        │
│  - 2 features      │                                    │
│    never used      │                                    │
└────────────────────┴────────────────────────────────────┘
```

### Project Outcome

```
CSM Preparation Time: 2 hours → 5 minutes per customer
Churn Prevention: Identified 8 at-risk accounts (saved $48K MRR)
Upsell Opportunities: Found 12 expansion leads ($120K pipeline)
Customer Satisfaction: +0.5 NPS points (proactive outreach)
```

---

## PROJECT 6: Predictive Revenue Forecasting System <a name="project-6"></a>

**Difficulty:** Expert
**Time to Build:** 4-5 days
**Tools:** Python, Prophet/ARIMA, n8n, OpenAI, Dashboard

### Business Problem

```
Leadership asks "what will revenue be next quarter?" and gets a gut-feel answer.
Actual forecasts take days of manual analysis.
Budget planning and hiring decisions are based on inaccurate projections.

Solution: Automated ML-powered revenue forecast with scenario analysis and AI commentary.
```

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Historical  │ →  │  ML Models   │ →  │  Ensemble    │
│  Revenue     │    │  (Prophet,   │    │  (Weighted   │
│  (24 months) │    │   ARIMA,     │    │   Average)   │
│              │    │   LSTM)      │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Scenario   │
                                        │  Analysis   │
                                        │  (Base,     │
                                        │   Optimistic│
                                        │   Pessimistic)│
                                        └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │  OpenAI     │
                                        │  (Forecast  │
                                        │   Context + │
                                        │   Qualitative│
                                        │   Factors)  │
                                        └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Forecast   │
                                        │  Dashboard  │
                                        │  + PDF      │
                                        │  Report     │
                                        └─────────────┘
```

### Implementation

**Step 1: Data Preparation**
```sql
-- Monthly historical revenue
SELECT
  DATE_TRUNC('month', created_at) AS month,
  SUM(amount) AS revenue,
  COUNT(*) AS transactions,
  COUNT(DISTINCT customer_id) AS customers,
  AVG(amount) AS avg_transaction
FROM orders
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

**Step 2: ML Forecasting (Python)**
```python
import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.ensemble import RandomForestRegressor
import warnings
warnings.filterwarnings('ignore')

def forecast_revenue(historical_data, months_ahead=6):
    # Prepare data for Prophet
    df = historical_data.rename(columns={'month': 'ds', 'revenue': 'y'})

    # Prophet model
    prophet = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        interval_width=0.95,
    )

    # Add regressors (leading indicators)
    if 'customers' in df.columns:
        df['customer_count'] = df['customers']
        prophet.add_regressor('customer_count')

    prophet.fit(df)

    # Future dataframe
    future = prophet.make_future_dataframe(periods=months_ahead, freq='MS')

    # Add future regressor values (use recent average as estimate)
    if 'customer_count' in future.columns:
        future['customer_count'] = df['customer_count'].tail(3).mean()

    # Predict
    forecast = prophet.predict(future)

    # Extract predictions
    predictions = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(months_ahead)

    return {
        'model': 'prophet',
        'forecast': predictions.to_dict('records'),
        'components': prophet.plot_components(forecast),
    }

# Scenario analysis
def scenario_analysis(base_forecast, scenarios):
    """
    scenarios = {
        'optimistic': {'growth_multiplier': 1.2, 'churn_reduction': 0.8},
        'pessimistic': {'growth_multiplier': 0.8, 'churn_increase': 1.3},
    }
    """
    results = {}

    for name, params in scenarios.items():
        adjusted = []
        for month in base_forecast:
            base_revenue = month['yhat']
            adjusted_revenue = base_revenue * params.get('growth_multiplier', 1.0)
            adjusted.append({
                **month,
                'yhat': adjusted_revenue,
                'scenario': name,
            })
        results[name] = adjusted

    return results

# Run forecast
historical = pd.read_sql("SELECT ... FROM orders ...", db_connection)
result = forecast_revenue(historical, months_ahead=6)

# Scenarios
scenarios = {
    'optimistic': {'growth_multiplier': 1.15},
    'base': {'growth_multiplier': 1.0},
    'pessimistic': {'growth_multiplier': 0.85},
}

scenario_results = scenario_analysis(result['forecast'], scenarios)
```

**Step 3: AI Context & Commentary**
```typescript
const prompt = `Revenue forecast for next 6 months:

Historical Revenue (last 12 months):
${JSON.stringify(historical.slice(-12), null, 2)}

Forecast:
- Base case: ${JSON.stringify(scenario_results.base)}
- Optimistic: ${JSON.stringify(scenario_results.optimistic)}
- Pessimistic: ${JSON.stringify(scenario_results.pessimistic)}

Business Context:
- New product launch planned in Month 2
- Competitor X just lowered prices by 15%
- Hiring 5 new sales reps (ramp time: 3 months)
- Entering EU market in Month 4

Provide:
1. Forecast summary (expected revenue range, confidence level)
2. Key risks that could derail the forecast
3. Key opportunities that could exceed the forecast
4. Recommendation for leadership (hiring, spending, targets)

Keep it under 200 words. Be specific with numbers.`;
```

**Step 4: Forecast Dashboard**
```
┌─────────────────────────────────────────────────────────┐
│  Revenue Forecast — Next 6 Months                        │
│  Generated: {{ new Date().toLocaleDateString() }}        │
├─────────────────────────────────────────────────────────┤
│  📈 Revenue Projection                                   │
│  [Line chart with 3 scenarios + confidence bands]       │
│                                                          │
│  Historical ────  Base ───  Optimistic ---  Pessimistic │
│                                                          │
│  Month 1: $1.05M - $1.25M  (base: $1.15M)              │
│  Month 2: $1.10M - $1.35M  (base: $1.22M)              │
│  Month 3: $1.15M - $1.45M  (base: $1.30M)              │
│  ...                                                      │
├────────────────────┬────────────────────────────────────┤
│  AI Commentary     │  Scenario Comparison                │
│                    │                                    │
│  "Base case projects│  [Stacked area: 3 scenarios]      │
│  Q3 revenue of      │                                   │
│  $3.8M (+18% YoY).  │  Optimistic: $4.2M (+28%)        │
│  Confidence: 85%    │  Base: $3.8M (+18%)              │
│                     │  Pessimistic: $3.1M (+5%)         │
│  Key risk: Compet-  │                                   │
│  itor pricing may   │  Recommended: Plan at base case   │
│  impact growth      │  but maintain hiring for          │
│  by 10-15%          │  optimistic scenario              │
└────────────────────┴────────────────────────────────────┘
```

### Project Outcome

```
Forecast Accuracy: ±8% (vs ±25% manual estimates)
Planning Time: 3 days → 30 minutes
Decision Quality: Hiring, budget, and targets now data-driven
Leadership Confidence: Forecast cited in board meetings and investor updates
Scenario Planning: "What if" analysis in minutes, not days
```

---

## HOW TO USE THESE PROJECTS

### For Your Portfolio

```
Each project can be showcased as:

1. GitHub Repository
   - Complete code (n8n workflows, Python scripts, SQL)
   - README with architecture diagram, setup instructions
   - Sample data and screenshots

2. Blog Post / Case Study
   - Business problem
   - Solution architecture
   - Implementation details
   - Results and impact
   - Lessons learned

3. Live Demo
   - Host the dashboard on a free tier (Render, Railway)
   - Share a recorded walkthrough (Loom, YouTube)
   - Interactive sample (Metabase public dashboard)
```

### Recommended Order to Build

```
Start: Project 1 (Daily Sales Report) → Learn n8n basics
Then: Project 3 (Marketing ROI) → Learn data modeling
Then: Project 2 (Churn Prediction) → Learn ML integration
Then: Project 5 (Customer 360) → Learn multi-source integration
Then: Project 4 (Anomaly Detection) → Learn real-time processing
Finally: Project 6 (Revenue Forecast) → Advanced ML + AI
```

---

-date-month-last two digit of year: 12-04-26

# BI Dashboard Architecture & Design Patterns

# Last Updated: 12-04-26

# Version: 1.0 — From Wireframes to Production Dashboards

---

## TABLE OF CONTENTS

1. [Dashboard Philosophy](#philosophy)
2. [The 5 Dashboard Types](#dashboard-types)
3. [KPI Selection Framework](#kpi-framework)
4. [Chart Selection Matrix](#chart-matrix)
5. [Layout Patterns That Work](#layout-patterns)
6. [Color & Visual Hierarchy](#visual-hierarchy)
7. [Dashboard Architecture (Technical)](#technical-architecture)
8. [Real-Time Dashboard Design](#real-time)
9. [Mobile-Responsive Dashboards](#mobile)
10. [Dashboard Performance Optimization](#performance)
11. [Common Dashboard Anti-Patterns](#anti-patterns)
12. [Dashboard Evaluation Checklist](#checklist)

---

## DASHBOARD PHILOSOPHY <a name="philosophy"></a>

### The Golden Rules

```
1. A dashboard answers questions — it doesn't display data
   ❌ "Show all metrics"
   ✅ "Are we on track to hit our quarterly target?"

2. One dashboard = one audience
   ❌ Combined dashboard for CEO + engineers
   ✅ Separate dashboards per role

3. Less is more (5-second rule)
   If a stakeholder can't understand the dashboard in 5 seconds → redesign

4. Every metric needs context
   ❌ "Revenue: $1.2M"
   ✅ "Revenue: $1.2M (+12% vs target, +5% vs last month)"

5. Dashboards drive action
   If no decision changes based on the dashboard → it shouldn't exist
```

### The Dashboard Design Process

```
Step 1: Identify the audience
         ↓
Step 2: List their top 5 questions
         ↓
Step 3: Map each question to a metric + visualization
         ↓
Step 4: Design layout (most important → top-left)
         ↓
Step 5: Prototype (sketch → wireframe → build)
         ↓
Step 6: Validate with audience (do they understand in 5 sec?)
         ↓
Step 7: Iterate based on feedback
         ↓
Step 8: Automate (n8n + OpenAI for insights)
```

---

## THE 5 DASHBOARD TYPES <a name="dashboard-types"></a>

### Type 1: Strategic (Executive) Dashboard

```
Audience: C-suite, VPs, Board
Purpose: Monitor company health, make strategic decisions
Update: Daily or weekly
Time horizon: 12+ months (trends)
Detail level: High-level (aggregated)

Key Characteristics:
- 6-8 metrics maximum
- North Star metric (biggest, top-center)
- Trend lines (12-month view)
- Red/green indicators (vs target)
- No raw data tables
- AI-generated insights (optional)

Example Metrics:
┌─────────────────────────────────────────────────────────┐
│  🎯 Annual Recurring Revenue: $12.5M                    │
│     (+18% vs plan, +12% YoY)  [🟢 On Track]            │
├──────────┬──────────┬──────────┬────────────────────────┤
│  MRR     │  NRR     │  CAC     │  Net New Customers    │
│  $1.04M  │  112%    │  $520    │  380                  │
│  🟢+8%   │  🟢+2%   │  🟡+8%   │  🟢+15%              │
├──────────┴──────────┴──────────┴────────────────────────┤
│  Revenue Trend (12 months)                              │
│  📈 [Line chart showing monthly revenue vs target]      │
├─────────────────────────┬───────────────────────────────┤
│  Revenue by Segment    │  Revenue by Region             │
│  📊 [Stacked bar]      │  📊 [Horizontal bar]           │
└─────────────────────────┴───────────────────────────────┘
```

### Type 2: Operational Dashboard

```
Audience: Operations managers, support, on-call teams
Purpose: Real-time monitoring, immediate action needed
Update: Every 5-15 minutes (real-time)
Time horizon: Last 24-48 hours
Detail level: Granular (individual incidents)

Key Characteristics:
- Status indicators (up/down/warning)
- Current values + thresholds
- Alert feed (recent incidents)
- Queue/backlog visibility
- Auto-refresh
- Mobile-responsive (on-the-go access)

Example Layout:
┌─────────────────────────────────────────────────────────┐
│  System Status: 🟢 Healthy  |  Incidents (24h): 3       │
├──────────┬──────────┬──────────┬────────────────────────┤
│  API     │  Error   │  Active  │  Avg Response          │
│  Uptime  │  Rate    │  Users   │  Time                  │
│  99.97%  │  0.12%   │  2,450   │  145ms                 │
│  🟢      │  🟢      │  🟢      │  🟡                    │
├──────────┴──────────┴──────────┴────────────────────────┤
│  Response Time (last 6 hours)                           │
│  📈 [Sparkline with threshold line at 200ms]            │
├─────────────────────────┬───────────────────────────────┤
│  Queue Depth            │  Recent Alerts                │
│  📊 [Gauge]             │  ⚠️ High latency (14:32)     │
│  Current: 45 jobs       │  ⚠️ Error spike (12:15)      │
│  Threshold: 200         │  ✅ Resolved (11:00)          │
└─────────────────────────┴───────────────────────────────┘
```

### Type 3: Analytical Dashboard

```
Audience: Data analysts, strategists, product managers
Purpose: Deep analysis, hypothesis testing, exploration
Update: Weekly or on-demand
Time horizon: Flexible (user selects range)
Detail level: Detailed (with drill-down)

Key Characteristics:
- Interactive filters (date, segment, metric)
- Multiple chart types (scatter, heatmap, cohort)
- Statistical output (correlations, significance)
- Export capability (download data, charts)
- Documentation (methodology, assumptions)

Example Layout:
┌─────────────────────────────────────────────────────────┐
│  Customer Cohort Analysis                               │
│  Filters: [Date Range ▼] [Segment ▼] [Region ▼]        │
├─────────────────────────────────────────────────────────┤
│  Cohort Retention Heatmap                               │
│  📊 [Triangle heatmap: cohort vs month, % retention]   │
├─────────────────────────────────────────────────────────┤
│  Customer Lifetime Value Distribution                   │
│  📊 [Histogram with LTV segments overlaid]              │
├──────────────────────┬──────────────────────────────────┤
│  Feature Adoption     │  Correlation Matrix              │
│  (Sankey diagram)    │  (LTV vs usage, support, NPS)    │
├──────────────────────┴──────────────────────────────────┤
│  Statistical Output                                     │
│  "Cohort Jan 2026 has 15% higher retention (p<0.01)     │
│   correlated with onboarding flow v2 launch"            │
└─────────────────────────────────────────────────────────┘
```

### Type 4: Tactical (Department) Dashboard

```
Audience: Department heads (Sales, Marketing, Engineering)
Purpose: Track department performance, identify issues
Update: Daily
Time horizon: Current quarter + trend
Detail level: Department-specific metrics

Example — Sales Dashboard:
┌─────────────────────────────────────────────────────────┐
│  Q2 Pipeline: $4.2M (85% of $5M target)  [🟡 At Risk]  │
├──────────┬──────────┬──────────┬────────────────────────┤
│  Deals   │  Avg     │  Win     │  Sales Cycle           │
│  Closed  │  Deal    │  Rate    │                        │
│  45/60   │  $93K    │  32%     │  42 days               │
│  🟡 75%  │  🟢+12%  │  🟢+5%   │  🟡+3 days            │
├──────────┴──────────┴──────────┴────────────────────────┤
│  Pipeline by Stage                                      │
│  📊 [Funnel chart: Lead → Qualified → Proposal → Close] │
├──────────────────────┬──────────────────────────────────┤
│  Top 10 Deals        │  Rep Performance                  │
│  (Table: name,       │  (Bar chart: deals closed per    │
│  value, stage,       │   rep, vs quota)                  │
│  probability)        │                                   │
└──────────────────────┴──────────────────────────────────┘
```

### Type 5: Self-Service (Ad-Hoc) Dashboard

```
Audience: Business users (non-technical)
Purpose: Answer their own questions without waiting for analysts
Update: Real-time (query on demand)
Time horizon: User-selected
Detail level: User-selected

Key Characteristics:
- Drag-and-drop interface
- Pre-built metric library
- Natural language query (Text-to-SQL via OpenAI)
- Saved views/bookmarks
- Share via link

Example:
┌─────────────────────────────────────────────────────────┐
│  Ask a question about your data...                      │
│  [ "Show me revenue by product for last 30 days" ] 🔍  │
├─────────────────────────────────────────────────────────┤
│  Results:                                               │
│  📊 [Auto-generated bar chart based on query]           │
├─────────────────────────────────────────────────────────┤
│  Saved Reports:                                         │
│  📄 Monthly Revenue  📄 Customer Churn  📄 CAC Trends   │
├─────────────────────────────────────────────────────────┤
│  Metric Library:                                        │
│  [Revenue] [Customers] [Churn] [CAC] [LTV] [NPS]       │
└─────────────────────────────────────────────────────────┘
```

---

## KPI SELECTION FRAMEWORK <a name="kpi-framework"></a>

### The KPI Hierarchy

```
Company Vision
    ↓
North Star Metric (1 metric that captures core value)
    ↓
Level 1: Strategic KPIs (5-8 metrics)
    ↓
Level 2: Department KPIs (10-20 metrics)
    ↓
Level 3: Operational Metrics (50-100 metrics)
```

### North Star Metric Examples

| Company Type | North Star Metric | Why |
|-------------|-------------------|-----|
| **SaaS** | Monthly Recurring Revenue (MRR) | Captures growth + retention |
| **Marketplace** | Gross Merchandise Value (GMV) | Captures both sides of market |
| **E-commerce** | Orders per month | Captures demand + fulfillment |
| **Social Media** | Daily Active Users (DAU) | Captures engagement + retention |
| **B2B Service** | Net Revenue Retention (NRR) | Captures expansion + retention |

### KPI Selection Criteria (The SMART+ Framework)

```
S — Specific: Clearly defined, not ambiguous
M — Measurable: Can be quantified and tracked
A — Actionable: If it changes, someone does something
R — Relevant: Directly tied to business outcomes
T — Timely: Available frequently enough to act on
+ C — Comparable: Can compare to prior periods, targets, benchmarks
+ U — Understandable: A 10-year-old could explain it
```

### KPI Card Anatomy

```
Every KPI card should show:

┌─────────────────────────────┐
│  Metric Name                │  ← Clear, jargon-free
│                             │
│  $1,234,567                │  ← Current value (large font)
│  ↑ 12.3% vs last month     │  ← Trend (vs prior period)
│  ↑ 8.5% vs target          │  ← Progress (vs goal)
│                             │
│  🟢 On Track               │  ← Status indicator
│  ──────────────────────     │
│  ▓▓▓▓▓▓▓▓░░░░ 75%          │  ← Progress bar (if applicable)
│                             │
│  Last updated: 2 min ago   │  ← Data freshness
└─────────────────────────────┘
```

### Metrics That Matter (By Department)

**Sales:**
```
Primary: Revenue, Pipeline Coverage, Win Rate
Secondary: Average Deal Size, Sales Cycle Length, Quota Attainment
Leading: Pipeline Created, Meetings Booked, Proposals Sent
Lagging: Revenue Closed, Churned Customers
```

**Marketing:**
```
Primary: CAC, Marketing Qualified Leads (MQLs), ROI
Secondary: Cost per Lead, Conversion Rate, Brand Awareness
Leading: Website Traffic, Content Downloads, Ad Spend
Lagging: Customer Acquisition, Revenue Attribution
```

**Product:**
```
Primary: DAU/MAU, Feature Adoption Rate, NPS
Secondary: Time to Value, Retention Rate, Bug Count
Leading: Feature Usage, Session Duration, Engagement Score
Lagging: Churn Rate, Customer Satisfaction, Revenue Impact
```

**Customer Success:**
```
Primary: Net Revenue Retention (NRR), Churn Rate, Time to Resolution
Secondary: Customer Health Score, Support Tickets, CSAT
Leading: Product Usage Decl, Support Ticket Volume, Negative Feedback
Lagging: Churned Revenue, Downgrade Revenue
```

**Engineering:**
```
Primary: Deployment Frequency, Lead Time, Change Failure Rate
Secondary: Mean Time to Recovery (MTTR), Uptime, Bug Escape Rate
Leading: PR Size, Code Review Time, Test Coverage
Lagging: Production Incidents, Customer-Impacting Bugs
```

---

## CHART SELECTION MATRIX <a name="chart-matrix"></a>

### Choose the Right Chart for the Right Question

| Question | Best Chart | Example | Avoid |
|----------|-----------|---------|-------|
| **How much?** (single value) | Big number + indicator | "Revenue: $1.2M ↑12%" | Pie chart |
| **Trend over time?** | Line chart | Monthly revenue trend | Pie chart |
| **Compare categories?** | Bar chart (horizontal) | Revenue by product | Pie chart (>5 categories) |
| **Part of whole?** | Stacked bar (not pie!) | Revenue mix by segment | Pie chart |
| **Distribution?** | Histogram | Deal size distribution | Bar chart |
| **Correlation?** | Scatter plot | Marketing spend vs revenue | Line chart |
| **Funnel/conversion?** | Funnel chart | Lead → Customer journey | Bar chart |
| **Geographic?** | Map | Revenue by country | Bar chart |
| **Composition change?** | Stacked area | Revenue mix over time | Multiple pie charts |
| **Retention?** | Cohort heatmap | User retention by month | Line chart |
| **Flow/process?** | Sankey diagram | Customer journey | Bar chart |
| **Performance vs target?** | Bullet chart | KPI vs target | Gauge chart |
| **Ranking?** | Sorted bar chart | Top 10 customers | Table |
| **Relationships?** | Heatmap/correlation matrix | Metric correlations | Scatter (for >50 points) |

### Chart Design Rules

```
1. Always start bar charts at ZERO
   → Truncating Y-axis misrepresents differences

2. Use color purposefully
   → Highlight the insight, don't decorate
   → Red = bad, Green = good, Gray = neutral

3. Label directly (not via legend)
   → Put labels on bars/lines, not in a separate legend

4. Sort bar charts
   → By value (ascending/descending), not alphabetically

5. Limit data points
   → Line chart: Max 5-7 lines
   → Bar chart: Max 10-12 bars
   → Pie chart: Max 5 slices (or don't use pie)

6. Add context annotations
   → "Campaign launch", "Price change", "Holiday"

7. Use consistent scales across dashboards
   → Don't change Y-axis between views (misleading)
```

### Chart Examples (ASCII)

**Good Bar Chart (sorted, labeled, zero-baseline):**
```
Revenue by Product

Enterprise  ████████████████████████████████ $4.2M
Mid-Market  ████████████████████ $2.8M
SMB         ████████████ $1.5M
Self-Serve  ████████ $1.1M

            $0    $1M    $2M    $3M    $4M    $5M
```

**Bad Bar Chart (alphabetical, no labels, truncated axis):**
```
Revenue

Enterprise  ████████
Mid-Market  ███████
SMB         ████
Self-Serve  ███

            $800K  $1M  $1.2M  $1.4M  $1.6M  (truncated!)
```

**Good Line Chart (annotated, limited lines):**
```
Monthly Revenue

$1.5M ┤                                    ╭────
      │                              ╭─────╯
$1.0M ┤                        ╭─────╯
      │                  ╭─────╯
$0.5M ┤            ╭─────╯
      │      ╭─────╯
$0.0M ┼──────╯
      Jan    Feb    Mar    Apr    May    Jun

      ↑ New product launch
```

---

## LAYOUT PATTERNS THAT WORK <a name="layout-patterns"></a>

### Pattern 1: F-Pattern (Western Reading Pattern)

```
People scan dashboards in an F-shape:

┌─────────────────────────────────────────┐
│  NORTH STAR METRIC (big, top-center)    │  ← First thing seen
├──────────┬──────────┬──────────┬────────┤
│  KPI 1   │  KPI 2   │  KPI 3   │  KPI 4 │  ← Second scan line
├──────────┴──────────┴──────────┴────────┤
│  Primary Trend Chart (wide)             │  ← Third scan line
├────────────────────┬────────────────────┤
│  Secondary Chart A │  Secondary Chart B │  ← Bottom corners
└────────────────────┴────────────────────┘

Rules:
- Most important metric: Top-center (biggest)
- Supporting KPIs: Top row (left to right, by priority)
- Trends: Full width below KPIs
- Breakdowns: Bottom row (left to right, by importance)
```

### Pattern 2: Z-Pattern (Scanning Pattern)

```
Used for simpler dashboards with 4 quadrants:

┌────────────────────┬────────────────────┐
│  Top-Left:          │  Top-Right:        │  ← Top priority
│  Current status     │  Trend              │
│  (Where are we?)    │  (Are we improving?)│
├────────────────────┼────────────────────┤
│  Bottom-Left:       │  Bottom-Right:     │  ← Secondary
│  Breakdown          │  Action items      │
│  (What's driving?)  │  (What to do?)     │
└────────────────────┴────────────────────┘
```

### Pattern 3: Dashboard-in-a-Box (Modular)

```
Each "box" is a self-contained module:

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Revenue    │  │  Customers  │  │  Churn      │
│  Module     │  │  Module     │  │  Module     │
│             │  │             │  │             │
│  Big number │  │  Big number │  │  Big number │
│  Trend      │  │  Trend      │  │  Trend      │
│  Breakdown  │  │  Breakdown  │  │  Breakdown  │
└─────────────┘  └─────────────┘  └─────────────┘

Benefits:
- Each module can be developed independently
- Easy to add/remove modules
- Consistent sizing and layout
- Works well with component-based frameworks
```

### Pattern 4: Drill-Down Hierarchy

```
Level 1: Executive Summary (6-8 metrics)
         ↓ Click on any metric
Level 2: Metric Detail (trend, breakdown, drivers)
         ↓ Click on any segment
Level 3: Raw Data (table with filters, export)

Example:
Level 1: "Revenue: $1.2M ↑12%"
Level 2: Revenue trend + by product + by region
Level 3: Transaction-level table (filterable, exportable)
```

---

## COLOR & VISUAL HIERARCHY <a name="visual-hierarchy"></a>

### Color System for Dashboards

```
Status Colors (universal):
🟢 Green: #22C55E — On track, good, improving
🟡 Yellow: #EAB308 — At risk, warning, needs attention
🔴 Red: #EF4444 — Off track, bad, urgent action needed
🔵 Blue: #3B82F6 — Neutral, informational
⚪ Gray: #6B7280 — Baseline, comparison, disabled

Brand Colors (use sparingly):
- Primary brand color: Key highlights, selected elements
- Never use brand color for status (conflicts with green/red)

Background Colors:
- Primary background: #FFFFFF (white)
- Secondary background: #F9FAFB (light gray)
- Card border: #E5E7EB (subtle)

Text Colors:
- Primary text: #111827 (near black)
- Secondary text: #6B7280 (gray)
- Disabled text: #9CA3AF (light gray)
```

### Visual Hierarchy Rules

```
1. Size = Importance
   - North Star: 36-48px
   - KPI values: 24-32px
   - Labels: 14-16px
   - Annotations: 12px

2. Position = Priority
   - Top-left: Most viewed (F-pattern)
   - Top-center: Highest impact
   - Bottom-right: Least viewed

3. Contrast = Attention
   - High contrast: Draws attention (use for alerts)
   - Low contrast: Background elements
   - Don't make everything high contrast (nothing stands out)

4. Whitespace = Clarity
   - More space between sections than within sections
   - Cards should breathe (padding: 16-24px minimum)
   - Crowded dashboards = overwhelming dashboards
```

### Accessibility Rules

```
□ Color is NOT the only indicator (add icons, text)
  → "🟢 On Track" not just a green dot
  → Color-blind users (8% of men) can't distinguish red/green

□ Minimum contrast ratio: 4.5:1 (WCAG AA)
  → Text on background must be readable

□ Responsive font sizes
  → Min 12px, max 48px

□ Alt text for charts
  → Screen readers need descriptions

□ Keyboard navigation
  → Tab through filters, controls
```

---

## DASHBOARD ARCHITECTURE (TECHNICAL) <a name="technical-architecture"></a>

### 8.1 Dashboard Data Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Source DB   │ →  │  Transform   │ →  │  Dashboard   │
│  (PostgreSQL)│    │  (SQL/ELT)   │    │  (Frontend)  │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                    ┌──────▼──────┐
                    │  Cache      │
                    │  (Redis)    │
                    └─────────────┘
```

### 8.2 Data Model for Dashboards

```sql
-- Dashboard metrics table (pre-aggregated, fast reads)
CREATE TABLE dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_date DATE NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    previous_value DECIMAL(15,2),
    target_value DECIMAL(15,2),
    segment VARCHAR(50),
    region VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),

    -- Indexes for fast queries
    UNIQUE (metric_name, metric_date, segment, region)
);

CREATE INDEX idx_metrics_date ON dashboard_metrics(metric_date);
CREATE INDEX idx_metrics_name_date ON dashboard_metrics(metric_name, metric_date);

-- Refresh: Run via n8n workflow (daily/hourly)
-- INSERT INTO dashboard_metrics
-- SELECT
--   'revenue' AS metric_name,
--   DATE_TRUNC('day', created_at) AS metric_date,
--   SUM(amount) AS metric_value,
--   LAG(SUM(amount)) OVER (ORDER BY DATE_TRUNC('day', created_at)) AS previous_value,
--   NULL AS target_value,
--   NULL AS segment,
--   NULL AS region
-- FROM transactions
-- WHERE created_at >= NOW() - INTERVAL '90 days'
-- GROUP BY 1, 2
-- ON CONFLICT (metric_name, metric_date, segment, region)
-- DO UPDATE SET metric_value = EXCLUDED.metric_value;
```

### 8.3 API Design for Dashboard

```typescript
// Express API for dashboard data
import express from 'express';
const router = express.Router();

// Get all KPIs for a dashboard
router.get('/api/dashboard/kpis', async (req, res) => {
  const { date_from, date_to, segment } = req.query;

  const query = `
    SELECT
      metric_name,
      metric_value,
      previous_value,
      target_value,
      segment
    FROM dashboard_metrics
    WHERE metric_date = (
      SELECT MAX(metric_date)
      FROM dashboard_metrics
      WHERE metric_date <= $1
    )
    AND ($2::text IS NULL OR segment = $2)
  `;

  const result = await pool.query(query, [date_to, segment]);
  res.json(result.rows);
});

// Get trend data for a specific metric
router.get('/api/dashboard/trends/:metric', async (req, res) => {
  const { metric } = req.params;
  const { date_from, date_to, granularity = 'day' } = req.query;

  const query = `
    SELECT
      DATE_TRUNC($1, metric_date) AS date,
      SUM(metric_value) AS value,
      AVG(metric_value) AS avg_value
    FROM dashboard_metrics
    WHERE metric_name = $2
      AND metric_date >= $3
      AND metric_date <= $4
    GROUP BY 1
    ORDER BY 1
  `;

  const result = await pool.query(query, [granularity, metric, date_from, date_to]);
  res.json(result.rows);
});

// Get breakdown (by segment, region, etc.)
router.get('/api/dashboard/breakdown/:metric', async (req, res) => {
  const { metric } = req.params;
  const { dimension = 'segment', date } = req.query;

  const query = `
    SELECT
      ${dimension} AS name,
      SUM(metric_value) AS value
    FROM dashboard_metrics
    WHERE metric_name = $1
      AND metric_date = $2
    GROUP BY ${dimension}
    ORDER BY value DESC
  `;

  const result = await pool.query(query, [metric, date]);
  res.json(result.rows);
});

export default router;
```

### 8.4 Frontend Component Structure (React)

```typescript
// Dashboard component tree
//
// DashboardPage
// ├── DashboardHeader (title, date range, filters)
// ├── KPIRow
// │   ├── KPICard (revenue, customers, churn, etc.)
// │   └── KPICard
// ├── TrendChart
// │   └── LineChart (revenue trend)
// ├── BreakdownRow
// │   ├── BreakdownChart (by segment)
// │   └── BreakdownChart (by region)
// └── DataTable (optional, with export)

// KPICard component
interface KPICardProps {
  title: string;
  value: number;
  previousValue: number;
  targetValue: number;
  format: 'currency' | 'number' | 'percentage';
}

function KPICard({ title, value, previousValue, targetValue, format }: KPICardProps) {
  const changePercent = ((value / previousValue) - 1) * 100;
  const vsTarget = ((value / targetValue) - 1) * 100;
  const status = vsTarget >= -5 ? 'good' : vsTarget >= -15 ? 'warning' : 'critical';

  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{formatValue(value, format)}</div>
      <div className={`kpi-trend ${status}`}>
        {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}% vs prior
      </div>
      <div className="kpi-status">
        {status === 'good' ? '🟢 On Track' : status === 'warning' ? '🟡 At Risk' : '🔴 Off Track'}
      </div>
    </div>
  );
}
```

---

## REAL-TIME DASHBOARD DESIGN <a name="real-time"></a>

### When to Use Real-Time vs Batch

```
Use Real-Time (WebSocket/SSE) when:
✅ Monitoring operational metrics (uptime, errors, queue depth)
✅ Alerts need immediate action (incident response)
✅ Live events (product launch, campaign go-live)
✅ Trading/financial dashboards

Use Batch (poll every 5-15 min) when:
✅ Strategic metrics (revenue, customers, churn)
✅ Daily/weekly reporting
✅ Metrics that don't change minute-by-minute
✅ Cost optimization (fewer DB queries)
```

### Real-Time Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Application │ →  │  WebSocket   │ →  │  Dashboard   │
│  (Emits      │    │  Server      │    │  (Receives   │
│   metrics)   │    │  (Socket.IO) │    │   updates)   │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                    ┌──────▼──────┐
                    │  Redis      │
                    │  Pub/Sub    │
                    │  (Scale     │
                    │   across    │
                    │   servers)  │
                    └─────────────┘
```

**Backend (Node.js + Socket.IO):**
```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

const io = new Server(3001, {
  adapter: createAdapter(pubClient, subClient),
  cors: { origin: 'https://dashboard.yourdomain.com' },
});

// Emit metrics every 30 seconds
setInterval(async () => {
  const metrics = await getCurrentMetrics(); // Query DB
  io.to('dashboard-room').emit('metrics-update', metrics);
}, 30000);

// Client joins room
io.on('connection', (socket) => {
  socket.join('dashboard-room');
  console.log('Client connected to dashboard');
});
```

**Frontend (React):**
```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function RealTimeDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const socket = io('https://api.yourdomain.com:3001');

    socket.on('metrics-update', (data) => {
      setMetrics(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div>
      <KPICard title="Active Users" value={metrics.activeUsers} />
      <KPICard title="Error Rate" value={metrics.errorRate} />
      <KPICard title="Response Time" value={metrics.responseTime} />
    </div>
  );
}
```

---

## MOBILE-RESPONSIVE DASHBOARDS <a name="mobile"></a>

### Mobile Dashboard Rules

```
1. Single column layout (no side-by-side on mobile)
2. Larger touch targets (min 44px × 44px)
3. Simplified KPIs (show 3-4, not 8)
4. Swipe navigation between sections
5. No hover-dependent interactions (use tap)
6. Vertical scrolling (not horizontal)
7. Condensed charts (remove labels, use tooltips)
```

### Responsive Breakpoints

```
Desktop (> 1200px):
┌────────┬────────┬────────┬────────┐
│  KPI 1 │  KPI 2 │  KPI 3 │  KPI 4 │
├────────┴────────┴────────┴────────┤
│         Trend Chart               │
├────────────────────┬──────────────┤
│  Breakdown A       │  Breakdown B │
└────────────────────┴──────────────┘

Tablet (768px - 1200px):
┌────────┬────────┐  ┌────────┬────────┐
│  KPI 1 │  KPI 2 │  │  KPI 3 │  KPI 4 │
├────────┴────────┤  ├────────┴────────┤
│  Trend Chart    │  │  Breakdown A    │
└─────────────────┘  └─────────────────┘
                      ┌─────────────────┐
                      │  Breakdown B    │
                      └─────────────────┘

Mobile (< 768px):
┌─────────────────────┐
│  KPI 1              │
├─────────────────────┤
│  KPI 2              │
├─────────────────────┤
│  KPI 3              │
├─────────────────────┤
│  KPI 4              │
├─────────────────────┤
│  Trend Chart        │
├─────────────────────┤
│  Breakdown A        │
├─────────────────────┤
│  Breakdown B        │
└─────────────────────┘
```

---

## DASHBOARD PERFORMANCE OPTIMIZATION <a name="performance"></a>

### Performance Targets

```
Dashboard load time: < 2 seconds
Chart render time: < 500ms
Filter response: < 1 second
Data freshness: < 5 minutes old (batch) or real-time (WebSocket)
```

### Optimization Techniques

```
1. Pre-aggregate data (don't query raw data on every load)
   → Use dashboard_metrics table (updated via n8n)

2. Cache query results (Redis)
   → TTL: 5 minutes for batch, no cache for real-time
   → Key: dashboard:{dashboard_id}:{filters_hash}

3. Lazy load charts (render visible charts first)
   → Use Intersection Observer API

4. Paginate data tables (don't load 10K rows)
   → Load 50 rows, fetch more on scroll

5. Use Web Workers for heavy calculations
   → Keep UI thread responsive

6. Compress chart data (reduce payload)
   → Round numbers (1234.56 → 1235)
   → Remove unnecessary precision

7. Use CDN for static assets (JS, CSS, fonts)
   → CloudFront, Cloudflare
```

**Caching Example:**
```typescript
import { redisClient } from './redis';

async function getDashboardData(filters: any) {
  // Create cache key
  const cacheKey = `dashboard:main:${JSON.stringify(filters)}`;

  // Try cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query database
  const data = await queryDatabase(filters);

  // Cache for 5 minutes
  await redisClient.setex(cacheKey, 300, JSON.stringify(data));

  return data;
}
```

---

## COMMON DASHBOARD ANTI-PATTERNS <a name="anti-patterns"></a>

### Anti-Pattern 1: The Data Dump

```
❌ Problem: Every metric on one page
   "If everything is important, nothing is important"

✅ Fix: Prioritize (5-8 metrics per dashboard)
   Create separate dashboards for different audiences
```

### Anti-Pattern 2: Vanity Metrics

```
❌ Problem: Metrics that look good but don't drive action
   "Total registered users" (cumulative, always growing)

✅ Fix: Use actionable metrics
   "Active users this month" (can go up or down, drives action)
```

### Anti-Pattern 3: No Context

```
❌ Problem: Numbers without comparison
   "Revenue: $1.2M" (Is that good? Bad?)

✅ Fix: Always show context
   "Revenue: $1.2M (+12% vs target, +5% vs last month)"
```

### Anti-Pattern 4: Pie Chart Abuse

```
❌ Problem: Pie charts for > 5 categories, similar values
   Humans are bad at comparing angles

✅ Fix: Use bar charts
   Easier to compare lengths than angles
```

### Anti-Pattern 5: Stale Data

```
❌ Problem: Dashboard shows data from 3 days ago
   Users lose trust, stop using dashboard

✅ Fix: Show data freshness
   "Last updated: 2 minutes ago"
   Auto-refresh or alert if data is stale
```

### Anti-Pattern 6: No Mobile Support

```
❌ Problem: Dashboard only works on desktop
   Executives check dashboards on phones

✅ Fix: Responsive design
   Single column, touch-friendly, simplified for mobile
```

---

## DASHBOARD EVALUATION CHECKLIST <a name="checklist"></a>

### Before Launch

```
Content:
□ Answers a specific question (not "show all data")
□ 5-8 metrics maximum per dashboard
□ Each metric has context (vs target, vs prior period)
□ Status indicators are clear (green/yellow/red)
□ No vanity metrics (all metrics drive action)

Visual Design:
□ F-pattern or Z-pattern layout
□ Most important metric is largest and top-center
□ Color used purposefully (status, not decoration)
□ Charts labeled directly (no separate legend)
□ Sufficient whitespace (not crowded)

Data Quality:
□ Data is accurate (spot-checked against source)
□ Data is fresh (< 5 min for real-time, < 1 hour for batch)
□ Edge cases handled (no data, null values, zero division)
□ Historical data available (minimum 3 months trend)

Technical:
□ Loads in < 2 seconds
□ Works on mobile (responsive)
□ Auto-refresh configured (if real-time)
□ Error states handled (what if API fails?)
□ Logged for monitoring (who views, what filters)

User Validation:
□ Target audience understands it in 5 seconds
□ Can explain the dashboard to someone else
□ Knows what action to take if metric turns red
□ Has given feedback and approved
```

### Post-Launch Review (Monthly)

```
Usage Metrics:
□ How many unique viewers per week?
□ Which metrics are most viewed?
□ Which filters are most used?
□ Average session duration?
□ Bounce rate (view once and leave)?

Feedback:
□ Are users acting on the data?
□ Are there requests for new metrics?
□ Are there complaints about speed/accuracy?
□ Is the dashboard being shared? (indicates value)

Maintenance:
□ Any broken data sources?
□ Any stale metrics (no longer relevant)?
□ Any new metrics needed?
□ Can any metrics be removed? (simplify)
```

---

-date-month-last two digit of year: 12-04-26

# OpenAI SDK for Data Analysis — Production Mastery

# Last Updated: 12-04-26

# Version: 1.0 — From Basics to Production-Grade AI-Powered Analytics

---

## TABLE OF CONTENTS

1. [Why OpenAI for Data Analysis?](#why-openai)
2. [SDK Setup & Configuration](#setup)
3. [Core Patterns Every Analyst Must Know](#core-patterns)
4. [Text-to-SQL — Production Implementation](#text-to-sql)
5. [Automated Insight Generation](#insights)
6. [Data Cleaning & Enrichment with AI](#data-cleaning)
7. [Anomaly Detection & Explanation](#anomaly-detection)
8. [Automated Report Generation](#report-generation)
9. [Embeddings for Data Analysis](#embeddings)
10. [Function Calling for Structured Outputs](#function-calling)
11. [Cost Optimization Strategies](#cost-optimization)
12. [Error Handling & Reliability](#error-handling)
13. [Security & Privacy](#security)
14. [Performance Optimization](#performance)
15. [Production Architecture](#production-architecture)
16. [Troubleshooting Guide](#troubleshooting)

---

## WHY OPENAI FOR DATA ANALYSIS? <a name="why-openai"></a>

### Where AI Adds Value vs Where It Doesn't

```
✅ USE AI FOR:
┌────────────────────────────────────────────────────────────┐
│  Task                      │ Why AI?                       │
├────────────────────────────────────────────────────────────┤
│  Insight generation        │ Finds patterns humans miss    │
│  Anomaly explanation       │ Contextualizes statistical    │
│                            │ findings in business terms    │
│  Report summarization      │ Condenses 50 pages to 1 page  │
│  Text-to-SQL               │ Democratizes data access      │
│  Data categorization       │ Sentiment, topic, intent      │
│  Data cleaning             │ Imputation, dedup, standardize│
│  Forecasting augmentation  │ Adds qualitative factors      │
│  Customer feedback analysis│ NLP at scale                  │
│  Code generation           │ Data transformations, charts  │
└────────────────────────────────────────────────────────────┘

❌ DON'T USE AI FOR:
┌────────────────────────────────────────────────────────────┐
│  Task                      │ Why Not?                      │
├────────────────────────────────────────────────────────────┤
│  Simple aggregations       │ SQL is faster, cheaper, exact │
│  Precise calculations      │ LLMs hallucinate numbers      │
│  Deterministic transforms  │ Code is reliable, testable    │
│  Large-scale processing    │ Too slow, expensive           │
│  PII/sensitive data        │ Privacy, compliance risks     │
└────────────────────────────────────────────────────────────┘
```

### ROI Framework

```
Before AI:
- Analyst spends 4 hours/week writing report summaries
- 2 hours/week investigating anomalies manually
- Business users wait 2 days for ad-hoc queries
- Data cleaning takes 30% of analyst time

After AI:
- Report summaries: 4 hours → 0 (automated)
- Anomaly investigation: 2 hours → 30 min (AI pre-analyzes)
- Ad-hoc queries: 2 days → 2 minutes (Text-to-SQL)
- Data cleaning: 30% → 10% (AI categorization)

Time saved: ~6 hours/week per analyst = $15K/year saved
Cost: ~$200/month OpenAI API = $2.4K/year
ROI: 525% in year one
```

---

## SDK SETUP & CONFIGURATION <a name="setup"></a>

### 2.1 Installation & Setup

```bash
# Node.js/TypeScript
npm install openai

# Python
pip install openai
```

### 2.2 Client Configuration (Production-Ready)

**TypeScript:**
```typescript
import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Production configuration with all options
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  baseURL: process.env.OPENAI_BASE_URL, // For proxies/alternatives
  maxRetries: 3, // Built-in retry logic
  timeout: 60000, // 60 second timeout
  httpAgent: process.env.HTTPS_PROXY
    ? new HttpsProxyAgent(process.env.HTTPS_PROXY)
    : undefined,

  // For local LLMs (Ollama, vLLM)
  // baseURL: 'http://localhost:11434/v1',
  // apiKey: 'ollama',
});

export default openai;
```

**Python:**
```python
import os
from openai import OpenAI, AsyncOpenAI

# Sync client (for scripts)
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    organization=os.getenv("OPENAI_ORG_ID"),
    max_retries=3,
    timeout=60.0,
)

# Async client (for production servers)
async_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    organization=os.getenv("OPENAI_ORG_ID"),
    max_retries=3,
    timeout=60.0,
)
```

### 2.3 Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-proj-your_key_here
OPENAI_ORG_ID=org-your_org_id
OPENAI_BASE_URL=https://api.openai.com/v1  # Default

# Rate limiting
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT_SECONDS=60

# Cost controls
OPENAI_MONTHLY_BUDGET=500  # Alert if exceeded
OPENAI_MAX_TOKENS_PER_REQUEST=4000

# Model defaults
OPENAI_CHAT_MODEL=gpt-4-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 2.4 Model Selection Guide

| Model | Use Case | Speed | Cost | Max Tokens |
|-------|----------|-------|------|------------|
| **GPT-4o** | Best overall (analysis, insights) | Fast | $2.50/1M in | 128K |
| **GPT-4o-mini** | Cost-effective (categorization, cleaning) | Fastest | $0.15/1M in | 128K |
| **o3-mini** | Reasoning-heavy tasks | Medium | $1.10/1M in | 200K |
| **o1** | Complex analysis, multi-step | Slow | $15/1M in | 200K |
| **text-embedding-3-small** | Similarity, search, clustering | Fast | $0.02/1M | 8191 |
| **text-embedding-3-large** | Higher-quality embeddings | Fast | $0.13/1M | 8191 |

**Decision Matrix:**
```
Need structured output? → GPT-4o with JSON schema
Need reasoning? → o3-mini or o1
Need speed? → GPT-4o-mini
Need cheap? → GPT-4o-mini ($0.15/1M)
Need long context? → GPT-4o (128K) or o1 (200K)
Need embeddings? → text-embedding-3-small
```

---

## CORE PATTERNS EVERY ANALYST MUST KNOW <a name="core-patterns"></a>

### 3.1 Pattern 1: Structured JSON Output

**Most Important Pattern — Never parse free text in production!**

```typescript
import OpenAI from 'openai';
const openai = new OpenAI();

// ✅ CORRECT: Force JSON output with schema
async function analyzeMetrics(data: object) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a data analyst. Analyze the provided metrics data.
        Return ONLY valid JSON matching this schema. No markdown, no explanation.

        Required schema:
        {
          "summary": string,
          "trends": string[],
          "anomalies": string[],
          "recommendations": string[]
        }`
      },
      {
        role: 'user',
        content: JSON.stringify(data, null, 2)
      }
    ],
    response_format: { type: 'json_object' }, // Force JSON
    temperature: 0, // Deterministic output
  });

  // Parse and validate
  const result = JSON.parse(response.choices[0].message.content);

  // Validate against expected schema
  if (!result.summary || !Array.isArray(result.trends)) {
    throw new Error('Invalid response format from OpenAI');
  }

  return result;
}
```

**Python Equivalent:**
```python
import json
from openai import OpenAI

client = OpenAI()

def analyze_metrics(data: dict) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": """You are a data analyst. Analyze the provided metrics data.
                Return ONLY valid JSON matching this schema. No markdown, no explanation.

                Required schema:
                {
                    "summary": string,
                    "trends": string[],
                    "anomalies": string[],
                    "recommendations": string[]
                }"""
            },
            {
                "role": "user",
                "content": json.dumps(data, indent=2)
            }
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    result = json.loads(response.choices[0].message.content)

    # Validate
    if not all(k in result for k in ["summary", "trends", "anomalies", "recommendations"]):
        raise ValueError("Invalid response format from OpenAI")

    return result
```

### 3.2 Pattern 2: Function Calling (Tool Use)

**Best for: Multi-step analysis, structured outputs, tool use**

```typescript
// Define tools for the AI
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_sales_data',
      description: 'Get sales metrics for a date range',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          metrics: {
            type: 'array',
            items: { type: 'string', enum: ['revenue', 'orders', 'customers', 'aov'] },
          },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_churn_data',
      description: 'Get customer churn metrics',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
        },
        required: ['period'],
      },
    },
  },
];

// Use function calling
async function analyzeBusiness(question: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: question }],
    tools,
    tool_choice: 'auto', // Let AI decide which tools to use
  });

  const message = response.choices[0].message;

  // Check if AI wants to call a function
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Execute the actual function
      let result;
      if (functionName === 'get_sales_data') {
        result = await getSalesData(functionArgs);
      } else if (functionName === 'get_churn_data') {
        result = await getChurnData(functionArgs);
      }

      // Send result back to AI for analysis
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: question },
          message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          },
        ],
        tools,
      });

      return finalResponse.choices[0].message.content;
    }
  }

  return message.content;
}

// Actual data functions
async function getSalesData(args: any) {
  // Your database query here
  return { revenue: 125000, orders: 450, customers: 380, aov: 278 };
}

async function getChurnData(args: any) {
  return { churn_rate: 4.2, lost_revenue: 8500 };
}
```

### 3.3 Pattern 3: Streaming for Long Responses

```typescript
// For reports or analyses that produce long text
async function generateReportStream(data: object) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a senior analyst writing a detailed report...'
      },
      {
        role: 'user',
        content: `Generate a comprehensive report from this data: ${JSON.stringify(data)}`
      }
    ],
    stream: true, // Enable streaming
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;

    // Send to client in real-time (WebSocket, SSE, etc.)
    process.stdout.write(content);
  }

  return fullResponse;
}
```

### 3.4 Pattern 4: Batch Processing for Cost Savings

```typescript
// OpenAI Batch API — 50% discount, async processing
import fs from 'fs';

async function batchAnalyzeSentiments(reviews: string[]) {
  // 1. Create batch input file (JSONL format)
  const inputFile = reviews.map((review, index) => ({
    custom_id: `review-${index}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Classify the sentiment as positive, negative, or neutral. Return JSON: {"sentiment": "...", "confidence": 0-1}'
        },
        { role: 'user', content: review }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    },
  }));

  // 2. Upload file
  const file = await openai.files.create({
    file: new Blob([inputFile.map(r => JSON.stringify(r)).join('\n')], { type: 'application/jsonl' }),
    purpose: 'batch',
  });

  // 3. Create batch job
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
  });

  console.log(`Batch job created: ${batch.id}`);
  console.log(`Check status: await openai.batches.retrieve('${batch.id}')`);

  // 4. Check status (poll or webhook)
  // const result = await openai.batches.retrieve(batch.id);
  // if (result.status === 'completed') {
  //   const outputFile = await openai.files.content(result.output_file_id);
  // }

  return batch;
}

// Cost comparison:
// Regular API: 1000 reviews × $0.005 = $5.00
// Batch API: 1000 reviews × $0.0025 = $2.50 (50% savings)
```

---

## TEXT-TO-SQL — PRODUCTION IMPLEMENTATION <a name="text-to-sql"></a>

### 4.1 Basic Text-to-SQL

```typescript
async function textToSQL(question: string, schema: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a PostgreSQL expert. Convert natural language to SQL.

Database Schema:
${schema}

Rules:
1. Use PostgreSQL dialect
2. Include LIMIT 100 for safety
3. Add comments explaining the query
4. Return ONLY the SQL, no explanation
5. Use table aliases for readability
6. Handle date ranges properly (use CURRENT_DATE - INTERVAL)
7. Always filter out deleted/soft-deleted records`
      },
      { role: 'user', content: question }
    ],
    temperature: 0, // Deterministic
  });

  return response.choices[0].message.content.trim();
}

// Example usage:
const sql = await textToSQL(
  "Show me top 10 customers by revenue in the last 30 days",
  `
  Table: users (id, name, email, created_at, status)
  Table: orders (id, user_id, amount, currency, created_at, status)
  Table: products (id, name, category, price)
  `
);

console.log(sql);
// Output:
// -- Top 10 customers by revenue (last 30 days)
// SELECT
//   u.name,
//   u.email,
//   COUNT(o.id) AS order_count,
//   SUM(o.amount) AS total_revenue
// FROM users u
// JOIN orders o ON u.id = o.user_id
// WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
//   AND o.status = 'completed'
//   AND u.status = 'active'
// GROUP BY u.id, u.name, u.email
// ORDER BY total_revenue DESC
// LIMIT 10;
```

### 4.2 Advanced Text-to-SQL with Validation

```typescript
import { z } from 'zod';

// Schema for SQL validation
const SQLResult = z.object({
  query: z.string(),
  tables_used: z.array(z.string()),
  explanation: z.string(),
  risk_level: z.enum(['low', 'medium', 'high']),
});

async function textToSQLAdvanced(
  question: string,
  schema: string,
  examples: string[] = []
) {
  const examplesPrompt = examples.length > 0
    ? `\nExamples:\n${examples.map((e, i) => `Q: ${e}`).join('\n')}`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a senior data engineer. Convert natural language to PostgreSQL.

Database Schema:
${schema}

Output JSON format:
{
  "query": "the SQL query",
  "tables_used": ["table1", "table2"],
  "explanation": "what this query does",
  "risk_level": "low|medium|high"
}

Rules:
- Risk is "high" if: DELETE, UPDATE, DROP, or no WHERE clause on large tables
- Risk is "medium" if: Multiple JOINs, subqueries, aggregations on full table
- Risk is "low" if: Simple SELECT with WHERE clause and LIMIT
${examplesPrompt}`
      },
      { role: 'user', content: question }
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const result = SQLResult.parse(JSON.parse(response.choices[0].message.content));

  // Block high-risk queries
  if (result.risk_level === 'high') {
    throw new Error(`Query blocked: ${result.explanation} (risk: high)`);
  }

  return result;
}

// Usage:
const result = await textToSQLAdvanced(
  "What's our total revenue this month?",
  `
  Table: users (id, name, email, created_at, status)
    - status: 'active', 'inactive', 'deleted'
  Table: orders (id, user_id, amount, currency, created_at, status)
    - status: 'pending', 'completed', 'cancelled', 'refunded'
  Table: products (id, name, category, price, status)
  `
);

console.log(result.query);
console.log(`Risk: ${result.risk_level}`);
console.log(`Explanation: ${result.explanation}`);
```

### 4.3 Execute & Explain Results

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function queryAndExplain(question: string) {
  // Step 1: Convert to SQL
  const sqlResult = await textToSQLAdvanced(question, DATABASE_SCHEMA);

  // Step 2: Execute query safely
  let rows;
  try {
    const result = await pool.query(sqlResult.query);
    rows = result.rows;
  } catch (error) {
    return {
      error: true,
      message: `Query execution failed: ${error.message}`,
      query: sqlResult.query,
    };
  }

  // Step 3: AI explains results
  const explanation = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a data analyst explaining query results to a non-technical stakeholder.
        Summarize the findings in plain English. Include:
        1. Direct answer to their question
        2. Key numbers/trends
        3. Actionable insights
        Keep it under 150 words.`
      },
      {
        role: 'user',
        content: `Question: ${question}

Query Results (${rows.length} rows):
${JSON.stringify(rows.slice(0, 10), null, 2)}
${rows.length > 10 ? `... and ${rows.length - 10} more rows` : ''}`
      }
    ],
    temperature: 0.3,
  });

  return {
    error: false,
    query: sqlResult.query,
    data: rows,
    explanation: explanation.choices[0].message.content,
    row_count: rows.length,
  };
}

// Usage:
const answer = await queryAndExplain("What's our total revenue this month?");
console.log(answer.explanation);
// "This month's total revenue is $342,500, up 12% from last month ($305,800).
// We processed 1,247 orders with an average order value of $275.
//
// Key insight: The increase is driven by Enterprise segment (up 28%),
// while SMB remained flat. Consider investigating SMB acquisition channels.
//
// Top 3 customers this month contributed 15% of total revenue."
```

---

## AUTOMATED INSIGHT GENERATION <a name="insights"></a>

### 5.1 Statistical Insight + AI Enhancement

```typescript
interface InsightResult {
  summary: string;
  trends: string[];
  anomalies: string[];
  correlations: string[];
  recommendations: string[];
  statistical_notes: string[];
}

async function generateInsights(data: {
  metrics: Record<string, number[]>;
  dates: string[];
  context?: string;
}): Promise<InsightResult> {
  // Calculate basic statistics first (AI doesn't do math well)
  const stats = calculateStats(data.metrics);

  const prompt = `Analyze this time series data and provide structured insights.

Data Summary (pre-calculated statistics):
${JSON.stringify(stats, null, 2)}

${data.context ? `Business Context: ${data.context}\n` : ''}

Data (last 30 days, showing key points):
${JSON.stringify(data.metrics, null, 2)}

Provide insights in this JSON format:
{
  "summary": "1-2 sentence overview",
  "trends": ["trend with supporting data"],
  "anomalies": ["unexpected patterns with dates"],
  "correlations": ["relationships between metrics"],
  "recommendations": ["actionable next steps"],
  "statistical_notes": ["p-values, confidence intervals if notable"]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a senior data analyst. Identify patterns in the data. Be specific with numbers. Avoid generic statements like "increased" — say "increased 12% from X to Y".'
      },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2, // Slight creativity for insight phrasing
  });

  return JSON.parse(response.choices[0].message.content);
}

// Helper: Calculate statistics (AI is bad at math)
function calculateStats(metrics: Record<string, number[]>) {
  const stats: Record<string, any> = {};

  for (const [name, values] of Object.entries(metrics)) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const std = Math.sqrt(
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
    );
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const growth = values.length >= 2
      ? ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1)
      : null;

    stats[name] = {
      mean: mean.toFixed(2),
      median,
      std: std.toFixed(2),
      min,
      max,
      growth: growth ? `${growth}%` : 'N/A',
      latest: values[values.length - 1],
      previous: values.length >= 2 ? values[values.length - 2] : null,
    };
  }

  return stats;
}
```

### 5.2 Cohort Analysis + AI Insights

```typescript
async function analyzeCohorts(cohortData: {
  cohorts: string[];
  periods: number[];
  retention: number[][];
}) {
  const prompt = `Analyze this cohort retention data.

Cohort Retention Table (% of users active after N periods):
${cohortData.cohorts.map((cohort, i) =>
  `${cohort}: ${cohortData.retention[i].map(r => `${r}%`).join(', ')}`
).join('\n')}

Periods: ${cohortData.periods.join(', ')}

Identify:
1. Which cohorts have best/worst retention?
2. Is there a pattern (e.g., newer cohorts retaining better)?
3. When is the biggest drop-off?
4. Recommendations for improving retention`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a product analyst specializing in cohort retention analysis. Be specific with percentages and time periods.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content;
}
```

---

## DATA CLEANING & ENRICHMENT WITH AI <a name="data-cleaning"></a>

### 6.1 Data Standardization

```typescript
async function standardizeCategories(categories: string[]): Promise<{
  original: string;
  standardized: string;
  confidence: number;
}[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Cheaper model for categorization
    messages: [
      {
        role: 'system',
        content: `You are a data cleaning assistant. Standardize the following categories to a consistent format.

Rules:
- Use title case
- Remove special characters
- Map similar categories to the same standard name
- Return as JSON array with original, standardized, and confidence (0-1)

Example:
Input: ["Software Eng.", "software engineer", "SWE", "Soft. Engineer"]
Output: [
  {"original": "Software Eng.", "standardized": "Software Engineer", "confidence": 0.95},
  {"original": "software engineer", "standardized": "Software Engineer", "confidence": 0.99},
  {"original": "SWE", "standardized": "Software Engineer", "confidence": 0.85},
  {"original": "Soft. Engineer", "standardized": "Software Engineer", "confidence": 0.90}
]`
      },
      {
        role: 'user',
        content: `Standardize these categories: ${JSON.stringify(categories)}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.standardizations;
}

// Usage:
const categories = ["Software Eng.", "software engineer", "SWE", "Data Sci", "data science", "DS"];
const standardized = await standardizeCategories(categories);
console.log(standardized);
// [
//   { original: "Software Eng.", standardized: "Software Engineer", confidence: 0.95 },
//   { original: "software engineer", standardized: "Software Engineer", confidence: 0.99 },
//   { original: "SWE", standardized: "Software Engineer", confidence: 0.85 },
//   { original: "Data Sci", standardized: "Data Science", confidence: 0.93 },
//   { original: "data science", standardized: "Data Science", confidence: 0.99 },
//   { original: "DS", standardized: "Data Science", confidence: 0.80 }
// ]
```

### 6.2 Missing Value Imputation

```typescript
async function suggestImputation(
  columnName: string,
  existingValues: number[],
  missingContext: { related_columns: Record<string, any>[] }
): Promise<{ method: string; suggested_values: number[]; confidence: number }> {
  const stats = {
    mean: existingValues.reduce((a, b) => a + b, 0) / existingValues.length,
    median: [...existingValues].sort((a, b) => a - b)[Math.floor(existingValues.length / 2)],
    std: Math.sqrt(existingValues.reduce((s, v) => s + (v - existingValues.reduce((a, b) => a + b, 0) / existingValues.length) ** 2, 0) / existingValues.length),
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a data scientist recommending imputation strategies for missing values.

Return JSON:
{
  "method": "mean|median|interpolate|predict",
  "suggested_values": [value1, value2, ...],
  "confidence": 0-1,
  "explanation": "why this method"
}`
      },
      {
        role: 'user',
        content: `Column: ${columnName}
Existing values statistics:
  Mean: ${stats.mean.toFixed(2)}
  Median: ${stats.median}
  Std Dev: ${stats.std.toFixed(2)}
  Count: ${existingValues.length}

Related columns (for context):
${JSON.stringify(missingContext.related_columns.slice(0, 5), null, 2)}

Recommend imputation method and values for 3 missing rows.`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 6.3 Deduplication

```typescript
async function detectDuplicates(records: Array<Record<string, any>>) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a data quality expert. Identify duplicate or near-duplicate records.

Return JSON:
{
  "duplicate_groups": [
    {
      "record_ids": [id1, id2, ...],
      "reason": "why these are duplicates",
      "keep_id": id,  // which record to keep
      "confidence": 0-1
    }
  ]
}

Rules:
- Records are duplicates if they represent the same entity (same person, company, etc.)
- Consider fuzzy matching on names, emails, phone numbers
- Keep the most complete record`
      },
      {
        role: 'user',
        content: `Analyze these ${records.length} records for duplicates:
${JSON.stringify(records.slice(0, 50), null, 2)}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## ANOMALY DETECTION & EXPLANATION <a name="anomaly-detection"></a>

### 7.1 Statistical Detection + AI Explanation

```typescript
interface AnomalyResult {
  metric: string;
  value: number;
  expected_range: [number, number];
  z_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  possible_causes: string[];
  recommended_action: string;
}

async function detectAndExplainAnomalies(
  timeSeries: number[],
  labels: string[],
  current_value: number,
  metric_name: string
): Promise<AnomalyResult> {
  // Step 1: Statistical detection
  const mean = timeSeries.reduce((a, b) => a + b, 0) / timeSeries.length;
  const std = Math.sqrt(
    timeSeries.reduce((s, v) => s + (v - mean) ** 2, 0) / timeSeries.length
  );
  const zScore = Math.abs((current_value - mean) / std);

  // Determine severity
  let severity: AnomalyResult['severity'];
  if (zScore > 4) severity = 'critical';
  else if (zScore > 3) severity = 'high';
  else if (zScore > 2) severity = 'medium';
  else severity = 'low';

  // Not anomalous enough
  if (zScore < 2) {
    return {
      metric: metric_name,
      value: current_value,
      expected_range: [mean - 2 * std, mean + 2 * std],
      z_score: zScore,
      severity: 'low',
      explanation: 'Value within normal range',
      possible_causes: [],
      recommended_action: 'No action needed',
    };
  }

  // Step 2: AI explanation
  const recentTrend = timeSeries.slice(-7).join(', ');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a data analyst investigating anomalies.

The metric "${metric_name}" has a value of ${current_value},
which is a Z-score of ${zScore.toFixed(2)} (expected range: ${(mean - 2*std).toFixed(2)} to ${(mean + 2*std).toFixed(2)}).

Recent 7-day trend: ${recentTrend}

Provide:
1. Plain-English explanation of what happened
2. Possible causes (business context)
3. Recommended action`
      },
      {
        role: 'user',
        content: `Metric: ${metric_name}
Current value: ${current_value}
Z-score: ${zScore.toFixed(2)}
Historical mean: ${mean.toFixed(2)}
Historical std: ${std.toFixed(2)}
Recent trend: ${recentTrend}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const aiResult = JSON.parse(response.choices[0].message.content);

  return {
    metric: metric_name,
    value: current_value,
    expected_range: [mean - 2 * std, mean + 2 * std],
    z_score: zScore,
    severity,
    explanation: aiResult.explanation,
    possible_causes: aiResult.possible_causes,
    recommended_action: aiResult.recommended_action,
  };
}

// Usage:
const dailyRevenue = [1000, 1100, 1050, 1200, 1150, 1080, 1250, 1100, 1050, 1200, 5000];
const result = await detectAndExplainAnomalies(
  dailyRevenue.slice(0, -1), // Historical data
  dailyRevenue.map((_, i) => `Day ${i+1}`),
  dailyRevenue[dailyRevenue.length - 1], // Current value
  'Daily Revenue'
);

console.log(result);
// {
//   metric: "Daily Revenue",
//   value: 5000,
//   expected_range: [702, 1528],
//   z_score: 4.12,
//   severity: "critical",
//   explanation: "Revenue spiked to $5,000 — 4.1 standard deviations above the mean of $1,115. This is a significant anomaly.",
//   possible_causes: [
//     "Large Enterprise deal closed",
//     "Billing error (duplicate charges)",
//     "End-of-quarter rush"
//   ],
//   recommended_action: "Investigate immediately. Check: 1) Large transactions in billing system, 2) Duplicate charges, 3) New customer onboarding."
// }
```

---

## AUTOMATED REPORT GENERATION <a name="report-generation"></a>

### 8.1 Executive Summary Generator

```typescript
async function generateExecutiveSummary(reportData: {
  period: string;
  kpis: Record<string, { current: number; previous: number; target: number }>;
  highlights: string[];
  concerns: string[];
  top_line_revenue?: number;
  growth_rate?: number;
}): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Chief of Staff preparing an executive summary for the CEO.

Write a 3-paragraph summary (max 200 words total):

Paragraph 1: Overall performance vs targets and prior period
Paragraph 2: Key highlights and concerns (be specific with numbers)
Paragraph 3: Top recommendation (what leadership should do)

Tone: Professional, data-driven, direct
Audience: CEO/Board (assume business savvy, skip obvious context)
Format: Plain text paragraphs, no bullet points`
      },
      {
        role: 'user',
        content: `Period: ${reportData.period}

KPIs:
${Object.entries(reportData.kpis).map(([name, data]) =>
  `- ${name}: ${data.current} (prior: ${data.previous}, target: ${data.target}, vs target: ${((data.current/data.target)*100).toFixed(0)}%, vs prior: ${((data.current/data.previous - 1)*100).toFixed(1)}%)`
).join('\n')}

${reportData.top_line_revenue ? `Top-line revenue: $${reportData.top_line_revenue.toLocaleString()}` : ''}
${reportData.growth_rate ? `Growth rate: ${reportData.growth_rate}%` : ''}

Highlights:
${reportData.highlights.map(h => `- ${h}`).join('\n')}

Concerns:
${reportData.concerns.map(c => `- ${c}`).join('\n')}`
      }
    ],
    temperature: 0.5, // More creative for narrative
  });

  return response.choices[0].message.content;
}

// Usage:
const summary = await generateExecutiveSummary({
  period: 'Q1 2026 (Jan-Mar)',
  kpis: {
    revenue: { current: 1250000, previous: 1100000, target: 1300000 },
    customers: { current: 4500, previous: 4200, target: 4800 },
    churn: { current: 4.2, previous: 5.1, target: 4.0 },
    cac: { current: 520, previous: 480, target: 500 },
  },
  highlights: [
    'Enterprise segment grew 28% QoQ',
    'Churn reduced from 5.1% to 4.2%',
    'Launched in 2 new markets (EU, APAC)',
  ],
  concerns: [
    'CAC increased 8% (paid channel saturation)',
    'Missed revenue target by 4%',
    'Engineering headcount 15% below plan',
  ],
  top_line_revenue: 1250000,
  growth_rate: 13.6,
});

console.log(summary);
// "Q1 revenue reached $1.25M, up 13.6% QoQ, though 4% below the $1.3M target.
// Customer base grew to 4,500 (+7%), and churn improved significantly from 5.1% to 4.2%,
// now approaching the 4.0% target. Enterprise was the standout performer at +28% QoQ.
//
// Two concerns warrant leadership attention: CAC rose 8% to $520 as paid channels
// show saturation signals, and we're 15% behind engineering hiring plan, which
// risks the Q2 product roadmap. EU and APAC launches went smoothly but haven't
// yet contributed meaningfully to revenue.
//
// Priority recommendation: Reallocate 20% of paid budget to organic/content channels
// to improve CAC efficiency, while accelerating engineering hiring to unblock
// the product roadmap. Enterprise momentum should be doubled down on — this
// segment can absorb higher CAC and drives the strongest unit economics."
```

### 8.2 Full Report Generator (Markdown/HTML)

```typescript
async function generateFullReport(data: {
  title: string;
  period: string;
  summary: string;
  sections: Array<{
    title: string;
    metrics: Record<string, any>;
    chart_data?: any[];
  }>;
}): Promise<string> {
  const sectionsPrompt = data.sections.map(section => `
Section: ${section.title}
Metrics: ${JSON.stringify(section.metrics)}
`).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Generate a comprehensive business report in Markdown format.

Structure:
# {title}
## Period: {period}

## Executive Summary
{summary}

## Key Metrics
{for each section, create a subsection with analysis}

## Recommendations
{prioritized, actionable}

Rules:
- Use Markdown formatting
- Include data tables where relevant
- Be specific with numbers (don't say "increased" — say "increased 12%")
- Keep sections under 300 words each`
      },
      {
        role: 'user',
        content: `Title: ${data.title}
Period: ${data.period}
Summary: ${data.summary}

Sections:
${sectionsPrompt}`
      }
    ],
    temperature: 0.4,
  });

  return response.choices[0].message.content;
}
```

---

## EMBEDDINGS FOR DATA ANALYSIS <a name="embeddings"></a>

### 9.1 Semantic Search on Text Data

```typescript
// Find similar customer reviews, feedback, or survey responses
async function findSimilarTexts(
  query: string,
  documents: string[],
  topK: number = 5
) {
  // 1. Get embedding for query
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 1536,
  });

  // 2. Get embeddings for all documents
  const docEmbeddings = await Promise.all(
    documents.map(async (doc) => {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: doc,
        dimensions: 1536,
      });
      return { text: doc, embedding: embedding.data[0].embedding };
    })
  );

  // 3. Calculate cosine similarity
  const similarities = docEmbeddings.map(doc => ({
    text: doc.text,
    similarity: cosineSimilarity(queryEmbedding.data[0].embedding, doc.embedding),
  }));

  // 4. Sort and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Usage:
const reviews = [
  "Great product, love the interface",
  "Customer support was terrible, waited 2 hours",
  "Best value for money in the market",
  "The app crashes frequently on Android",
  "Would recommend to anyone looking for this solution",
];

const similar = await findSimilarTexts(
  "How is the product quality?",
  reviews,
  3
);

console.log(similar);
// [
//   { text: "Great product, love the interface", similarity: 0.78 },
//   { text: "Best value for money in the market", similarity: 0.71 },
//   { text: "Would recommend to anyone...", similarity: 0.65 },
// ]
```

### 9.2 Clustering Customer Feedback

```typescript
async function clusterFeedback(feedback: string[], numClusters: number = 5) {
  // 1. Get embeddings
  const embeddings = await Promise.all(
    feedback.map(async (text) => {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return { text, embedding: embedding.data[0].embedding };
    })
  );

  // 2. K-Means clustering (simplified)
  // In production, use a proper ML library
  const clusters = kMeans(embeddings.map(e => e.embedding), numClusters);

  // 3. Label clusters with AI
  const labeledClusters = await Promise.all(
    clusters.map(async (cluster, idx) => {
      const clusterTexts = cluster.indices.map(i => feedback[i]).slice(0, 5);

      const label = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Label this group of customer feedback with a short topic name (2-5 words). Examples: "Pricing Concerns", "App Crashes", "Support Experience"'
          },
          { role: 'user', content: clusterTexts.join('\n') }
        ],
        temperature: 0,
      });

      return {
        cluster_id: idx,
        label: label.choices[0].message.content,
        count: cluster.indices.length,
        examples: clusterTexts.slice(0, 3),
      };
    })
  );

  return labeledClusters;
}
```

---

## FUNCTION CALLING FOR STRUCTURED OUTPUTS <a name="function-calling"></a>

### 10.1 Multi-Step Analysis Pipeline

```typescript
// Define analysis tools
const analysisTools = [
  {
    type: 'function' as const,
    function: {
      name: 'calculate_stats',
      description: 'Calculate statistical summary of a numeric column',
      parameters: {
        type: 'object',
        properties: {
          column: { type: 'string' },
          group_by: { type: 'string', description: 'Optional column to group by' },
        },
        required: ['column'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'identify_trend',
      description: 'Identify trend direction and magnitude',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          time_period: { type: 'string' },
        },
        required: ['metric', 'time_period'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_anomalies',
      description: 'Find outlier data points',
      parameters: {
        type: 'object',
        properties: {
          column: { type: 'string' },
          threshold_std: { type: 'number', default: 3 },
        },
        required: ['column'],
      },
    },
  },
];

async function automatedAnalysis(
  question: string,
  data: Record<string, any>[],
  schema: string
) {
  const messages = [
    {
      role: 'system',
      content: `You are a data analyst with access to analysis tools.
      Answer the user's question using the available tools.
      Call tools as needed — you can call multiple tools in sequence.

      Data Schema: ${schema}
      Data (first 5 rows): ${JSON.stringify(data.slice(0, 5))}`
    },
    { role: 'user', content: question },
  ];

  let finalResponse;
  let iterations = 0;

  while (iterations < 5) { // Prevent infinite loops
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: analysisTools,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;

    if (!message.tool_calls) {
      // No more tool calls — this is the final answer
      finalResponse = message.content;
      break;
    }

    // Execute tool calls
    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      let result;

      switch (toolCall.function.name) {
        case 'calculate_stats':
          result = calculateStats(data, args.column, args.group_by);
          break;
        case 'identify_trend':
          result = identifyTrend(data, args.metric, args.time_period);
          break;
        case 'find_anomalies':
          result = findAnomalies(data, args.column, args.threshold_std);
          break;
      }

      messages.push(message);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    iterations++;
  }

  return finalResponse;
}

// Tool implementations
function calculateStats(data: any[], column: string, groupBy?: string) {
  const values = data.map(d => d[column]).filter(v => typeof v === 'number');
  return {
    count: values.length,
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function identifyTrend(data: any[], metric: string, timePeriod: string) {
  const values = data.map(d => d[metric]).filter(v => typeof v === 'number');
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const change = ((avg2 - avg1) / avg1 * 100).toFixed(1);

  return {
    trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
    change_percent: change,
    first_half_avg: avg1,
    second_half_avg: avg2,
  };
}
```

---

## COST OPTIMIZATION STRATEGIES <a name="cost-optimization"></a>

### 11.1 Token Budgeting

```typescript
class TokenBudget {
  private monthlyBudget: number;
  private monthlyUsage: number = 0;

  constructor(monthlyBudget: number) {
    this.monthlyBudget = monthlyBudget;
  }

  trackUsage(tokens: number, costPerToken: number) {
    this.monthlyUsage += tokens * costPerToken;
  }

  isWithinBudget(): boolean {
    return this.monthlyUsage < this.monthlyBudget;
  }

  getRemainingBudget(): number {
    return this.monthlyBudget - this.monthlyUsage;
  }

  getUsagePercentage(): number {
    return (this.monthlyUsage / this.monthlyBudget) * 100;
  }

  // Alert when approaching budget
  checkBudget(): string | null {
    const pct = this.getUsagePercentage();
    if (pct >= 100) return '🔴 Budget exceeded!';
    if (pct >= 90) return '🟡 90%+ of budget used';
    if (pct >= 75) return '⚠️ 75%+ of budget used';
    return null;
  }
}

// Usage
const budget = new TokenBudget(500); // $500/month

async function trackedCompletion(prompt: string) {
  const alert = budget.checkBudget();
  if (alert) {
    console.error(alert);
    // Fallback to cheaper model or skip
    return useCheaperModel(prompt);
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  const tokens = response.usage?.total_tokens || 0;
  budget.trackUsage(tokens, 0.0000025); // GPT-4o: $2.50/1M tokens

  return response;
}
```

### 11.2 Model Selection Strategy

```typescript
// Choose model based on task complexity
function selectModel(task: {
  type: 'categorization' | 'insight' | 'summary' | 'reasoning' | 'sql';
  data_size: 'small' | 'medium' | 'large';
  precision_required: boolean;
}): { model: string; estimated_cost: number } {
  const config = {
    categorization: {
      model: 'gpt-4o-mini',
      cost_per_1k: 0.00015,
    },
    insight: {
      model: 'gpt-4o',
      cost_per_1k: 0.0025,
    },
    summary: {
      model: 'gpt-4o-mini',
      cost_per_1k: 0.00015,
    },
    reasoning: {
      model: 'o3-mini',
      cost_per_1k: 0.0011,
    },
    sql: {
      model: 'gpt-4o',
      cost_per_1k: 0.0025,
    },
  };

  return {
    model: config[task.type].model,
    estimated_cost: config[task.type].cost_per_1k,
  };
}
```

### 11.3 Caching Strategy

```typescript
import crypto from 'crypto';

interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number; // Time-to-live in seconds
}

const cache = new Map<string, CacheEntry>();

async function cachedCompletion(
  model: string,
  messages: any[],
  ttl: number = 3600 // 1 hour default
): Promise<string> {
  // Create cache key from messages
  const cacheKey = crypto
    .createHash('md5')
    .update(JSON.stringify({ model, messages }))
    .digest('hex');

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
    console.log('Cache hit:', cacheKey.substring(0, 8));
    return cached.response;
  }

  // Call OpenAI
  const response = await openai.chat.completions.create({
    model,
    messages,
  });

  const content = response.choices[0].message.content;

  // Store in cache
  cache.set(cacheKey, {
    response: content,
    timestamp: Date.now(),
    ttl,
  });

  return content;
}

// Savings example:
// Without cache: 1000 identical queries = 1000 × $0.01 = $10
// With cache: 1 query + 999 cache hits = 1 × $0.01 = $0.01
// Savings: 99.9%
```

---

## ERROR HANDLING & RELIABILITY <a name="error-handling"></a>

### 12.1 Robust Error Handling

```typescript
class OpenAIError extends Error {
  constructor(
    message: string,
    public type: 'rate_limit' | 'timeout' | 'invalid_request' | 'api_error',
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

async function reliableCompletion(
  config: {
    model: string;
    messages: any[];
    maxRetries?: number;
    timeout?: number;
    fallbackResponse?: string;
  }
): Promise<string> {
  const maxRetries = config.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: config.messages,
        timeout: config.timeout || 60000,
      });

      return response.choices[0].message.content;

    } catch (error: any) {
      lastError = error;

      if (error.status === 429) {
        // Rate limit — wait and retry
        const waitTime = (error.headers?.['retry-after'] || attempt * 2) * 1000;
        console.warn(`Rate limited. Waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      if (error.code === 'ECONNABORTED' || error.type === 'timeout') {
        // Timeout — retry with longer timeout
        console.warn(`Timeout on attempt ${attempt}. Retrying...`);
        continue;
      }

      if (error.status === 400) {
        // Invalid request — don't retry, throw
        throw new OpenAIError(error.message, 'invalid_request');
      }

      if (attempt === maxRetries) {
        // Max retries reached — use fallback or throw
        if (config.fallbackResponse) {
          console.warn('Max retries reached, using fallback response');
          return config.fallbackResponse;
        }
        throw new OpenAIError(error.message, 'api_error');
      }

      // Other errors — exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## SECURITY & PRIVACY <a name="security"></a>

### 13.1 Data Sanitization Before Sending to OpenAI

```typescript
// NEVER send PII to OpenAI without sanitization
function sanitizeForAI(data: any): any {
  const sensitiveFields = [
    'email', 'phone', 'ssn', 'password', 'token',
    'api_key', 'credit_card', 'address', 'name',
  ];

  if (typeof data === 'string') {
    // Mask emails
    data = data.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
    // Mask phones
    data = data.replace(/[\d\-\(\)\s]{10,}/g, '[PHONE]');
    // Mask potential credit cards
    data = data.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForAI(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForAI(value);
      }
    }
    return sanitized;
  }

  return data;
}

// Usage:
const rawData = {
  customer_name: "John Smith",
  email: "john@example.com",
  revenue: 1250,
  feedback: "Great product! My email john@example.com was confirmed quickly.",
};

const safeData = sanitizeForAI(rawData);
console.log(safeData);
// {
//   customer_name: "[REDACTED]",
//   email: "[REDACTED]",
//   revenue: 1250,
//   feedback: "Great product! My email [EMAIL] was confirmed quickly.",
// }

// Now safe to send to OpenAI
const insights = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: JSON.stringify(safeData) }],
});
```

### 13.2 Compliance Checklist

```
Before sending data to OpenAI:
□ No PII (names, emails, phones, SSNs)
□ No financial data (credit cards, bank accounts)
□ No health data (HIPAA)
□ No credentials (passwords, API keys, tokens)
□ Data encrypted in transit (HTTPS — default)
□ Review OpenAI's data usage policy (opt-out of training if needed)
□ Log what was sent (for audit trail)
□ Have user consent (if analyzing user-generated content)
```

---

## PRODUCTION ARCHITECTURE <a name="production-architecture"></a>

### 14.1 Full Production Stack

```
┌───────────────────────────────────────────────────────────────┐
│                     Application Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │  Dashboard │  │  n8n       │  │  CLI Tool  │              │
│  │  (React)   │  │  Workflows │  │  (Python)  │              │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘              │
│        │               │               │                       │
│        └───────────────┼───────────────┘                       │
│                        │                                       │
│                  ┌─────▼──────┐                               │
│                  │  API Layer │  (Express/FastAPI)            │
│                  │  /ai/query │                               │
│                  │  /ai/insight│                              │
│                  │  /ai/report│                               │
│                  └─────┬──────┘                               │
│                        │                                       │
│        ┌───────────────┼───────────────┐                     │
│        ↓               ↓               ↓                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│  │ OpenAI   │   │ Cache    │   │ Database │                 │
│  │ API      │   │ (Redis)  │   │ (PostgreSQL)│              │
│  │          │   │          │   │           │                 │
│  └──────────┘   └──────────┘   └──────────┘                 │
└───────────────────────────────────────────────────────────────┘
```

### 14.2 API Endpoint for AI Queries

```typescript
// Express route for Text-to-SQL
import express from 'express';
const router = express.Router();

router.post('/ai/query', async (req, res) => {
  try {
    const { question, schema } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Execute query with AI
    const result = await queryAndExplain(question, schema);

    // Log for monitoring
    logger.info('AI query executed', {
      question,
      model: 'gpt-4o',
      row_count: result.row_count,
      error: result.error,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('AI query failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Rate limiting for AI endpoints
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many AI requests, please try again later' },
});

router.use('/ai/', aiRateLimiter);
```

---

## TROUBLESHOOTING GUIDE <a name="troubleshooting"></a>

### 15.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **JSON parsing fails** | AI returns markdown or extra text | Use `response_format: {type: 'json_object'}` + strip markdown |
| **Hallucinated numbers** | AI bad at math | Pre-calculate stats, ask AI to interpret not compute |
| **Slow responses** | Long prompt, large model | Use gpt-4o-mini, shorten prompt, enable streaming |
| **Rate limit (429)** | Too many requests | Implement retry with backoff, use Batch API |
| **Inconsistent outputs** | Temperature too high | Set temperature=0 for deterministic tasks |
| **SQL errors** | Wrong schema, ambiguous question | Provide clearer schema, add examples to prompt |
| **Token limit exceeded** | Prompt + response too long | Truncate data, use summary instead of raw data |
| **High costs** | Using GPT-4 for everything | Use gpt-4o-mini for categorization, cache results |

### 15.2 Debug Mode

```typescript
async function debugCompletion(prompt: string) {
  console.log('=== DEBUG ===');
  console.log('Prompt:', prompt);
  console.log('Prompt tokens:', estimateTokens(prompt));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  console.log('Response:', response.choices[0].message.content);
  console.log('Usage:', response.usage);
  console.log('Cost:', calculateCost(response.usage, 'gpt-4o'));
  console.log('=============');

  return response;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function calculateCost(usage: any, model: string): number {
  const costs: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'o3-mini': { input: 0.0011, output: 0.0044 },
  };

  const cost = costs[model];
  if (!cost) return 0;

  return (usage.prompt_tokens * cost.input + usage.completion_tokens * cost.output) / 1000;
}
```

---

-date-month-last two digit of year: 12-04-26

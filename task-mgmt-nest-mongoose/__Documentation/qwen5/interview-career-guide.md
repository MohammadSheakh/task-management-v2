# Interview Prep & Career Growth — Data Analyst / BI Analyst

# Last Updated: 12-04-26

# Version: 1.0 — From Job Hunting to Senior/Staff Level

---

## TABLE OF CONTENTS

1. [Career Roadmap](#career-roadmap)
2. [Skills Matrix by Level](#skills-matrix)
3. [Portfolio That Gets Interviews](#portfolio)
4. [Interview Question Bank (100+ Questions)](#questions)
5. [SQL Interview Mastery](#sql-interview)
6. [Case Study Interview Framework](#case-study)
7. [Take-Home Assignment Guide](#take-home)
8. [Salary Negotiation](#salary)
9. [Growth to Senior/Staff Level](#growth)
10. [Networking & Personal Branding](#networking)

---

## CAREER ROADMAP <a name="career-roadmap"></a>

### Typical Progression

```
Level 1: Junior Data Analyst (0-2 years)
  → Basic SQL, Excel, visualization
  → Ad-hoc reports, dashboard maintenance
  → Works under guidance of senior analyst
  Salary: $50-70K (US), varies by location

Level 2: Data Analyst (2-4 years)
  → Independent SQL, Python, BI tools
  → Owns dashboards, regular reporting
  → Partners with stakeholders on analysis
  Salary: $70-95K

Level 3: Senior Data Analyst (4-7 years)
  → Advanced SQL, statistical analysis, data modeling
  → Leads major analysis projects
  → Mentors junior analysts, influences decisions
  Salary: $95-130K

Level 4: Staff/Principal Data Analyst (7-10+ years)
  → Cross-functional data strategy
  → Builds data infrastructure, pipelines
  → Organization-wide impact
  Salary: $130-180K

Level 5: Head of Data / Director (10+ years)
  → Manages data team
  → Sets data strategy for organization
  → Reports to VP/C-suite
  Salary: $150-250K+

Alternative Path: Data Engineer / Data Scientist
  → More technical, less stakeholder-facing
  → Focus on infrastructure or ML
  → Similar compensation bands
```

### Specialization Paths

```
Business Intelligence Analyst
  → Dashboard expertise, stakeholder management
  → Power BI/Tableau specialist
  → High visibility, direct business impact

Data Analyst + Automation (Your Path)
  → n8n, OpenAI, automated pipelines
  → Unique differentiator in the market
  → Higher value = higher compensation

Product Analyst
  → Product metrics, A/B testing, user behavior
  → Works closely with PM and engineering
  → Common at tech companies

Marketing Analyst
  → Campaign ROI, attribution, customer acquisition
  → Media mix modeling, experimentation
  → Common at e-commerce, DTC companies

Financial Analyst (Data-Focused)
  → Revenue forecasting, unit economics
  → FP&A + data engineering skills
  → Common at startups, fintech

Revenue/Operations Analyst
  → Revenue ops, pipeline analysis, forecasting
  → Cross-functional (sales, marketing, CS)
  → Common at SaaS companies
```

---

## SKILLS MATRIX BY LEVEL <a name="skills-matrix"></a>

### What You Need at Each Level

| Skill Category | Junior | Mid | Senior | Staff |
|---------------|--------|-----|--------|-------|
| **SQL** | SELECT, JOIN, GROUP BY | Window functions, CTEs, subqueries | Query optimization, data modeling | Schema design, data architecture |
| **Python** | Basic pandas, scripts | ETL, APIs, statistical analysis | ML basics, production code | Data platform, architecture |
| **BI Tools** | Build charts from template | Design dashboards, data modeling | Dashboard strategy, governance | Tool evaluation, org rollout |
| **Statistics** | Mean, median, basic tests | Regression, hypothesis testing | Experiment design, causal inference | Statistical consulting |
| **Automation** | Manual processes | Scheduled reports, basic scripts | n8n/Airflow pipelines, AI integration | Data platform automation |
| **Communication** | Email findings | Present to team | Present to leadership | Influence org strategy |
| **Stakeholder Mgmt** | Receives requests | Manages requests | Proactively identifies needs | Strategic partnership |
| **Business Acumen** | Understands own work | Understands team goals | Understands company strategy | Industry expertise |

### Skills That Differentiate You

```
Top 10% Analysts Have:
✅ Business context (not just data skills)
✅ Automation mindset (eliminate manual work)
✅ Storytelling ability (insights → action)
✅ Technical depth (can build pipelines, not just queries)
✅ AI literacy (uses AI to 10x output)
✅ Product thinking (builds tools people actually use)
✅ Cross-functional collaboration (not just data team)
```

---

## PORTFOLIO THAT GETS INTERVIEWS <a name="portfolio"></a>

### The 3-Project Portfolio Rule

```
Recruiters spend 30 seconds on your portfolio.
Show 3 projects that demonstrate range:

Project 1: Business Impact
  → "Automated X, saving Y hours/month"
  → Shows automation + ROI thinking

Project 2: Technical Depth
  → Complex analysis with clear methodology
  → Shows SQL/Python/stats skills

Project 3: Dashboard/Product
  → Live dashboard or data product
  → Shows visualization + user empathy
```

### Portfolio Format

```
GitHub Repository Structure:

project-name/
├── README.md              ← Business problem, solution, results
├── architecture.png       ← System diagram
├── notebook/
│   └── analysis.ipynb     ← Full analysis (clean, commented)
├── pipelines/
│   └── workflow.json      ← n8n workflow export
├── dashboard/
│   └── screenshot.png     ← Dashboard screenshot
├── results/
│   └── report.pdf         ← Sample output
└── setup.md               ← How to run this project
```

### README Template (Every Project)

```markdown
# Project Name

## Problem
One sentence: What business problem does this solve?

## Solution
One paragraph: How did you solve it? (tools, approach)

## Architecture
[Diagram showing data flow from source to insight]

## Results
- Metric 1: Before → After (impact)
- Metric 2: Before → After (impact)
- Key insight that drove a business decision

## Technical Details
- Tools: n8n, Python, SQL, OpenAI, Metabase
- Data: 100K rows, 5 sources
- Pipeline: Daily automated, 5 min runtime
- Dashboard: 500+ views/month

## How to Run
1. Clone repo
2. Setup instructions
3. Run pipeline
4. View dashboard

## Lessons Learned
One thing you'd do differently, one thing you're proud of.
```

### Where to Host

```
GitHub (mandatory): Code, README, architecture
Metabase Cloud (free): Live dashboard demos
Observable (free): Interactive notebooks
Personal Website (optional): Blog posts, case studies
LinkedIn Featured Section: Pin your best projects
```

---

## INTERVIEW QUESTION BANK (100+ Questions) <a name="questions"></a>

### SQL Questions (25 Questions)

**Basic:**
```
1. Find the top 3 customers by total spending
2. Calculate month-over-month revenue growth
3. Find customers who haven't ordered in 90 days
4. Calculate rolling 7-day average of daily revenue
5. Find duplicate records (same email, different IDs)
```

**Intermediate:**
```
6. Calculate cohort retention (% active after N months)
7. Find the median time between signup and first purchase
8. Identify customers whose spending declined 3+ consecutive months
9. Calculate customer lifetime value by acquisition channel
10. Find the top product category per customer (tie-breaking)
```

**Advanced:**
```
11. Calculate month-over-month retention using self-join
12. Find gaps in sequential IDs (missing records)
13. Calculate running total with reset condition
14. Identify sessions from clickstream data (30-min gap rule)
15. Calculate weighted average by group
```

### Statistics Questions (15 Questions)

```
1. Explain p-value to a non-technical stakeholder
2. When would you use median vs mean?
3. What's the difference between correlation and causation?
4. How do you design an A/B test?
5. What's statistical power and why does it matter?
6. How do you handle outliers in analysis?
7. Explain confidence intervals
8. What's Simpson's Paradox? Give an example
9. How do you determine sample size for an experiment?
10. What's the difference between Type I and Type II error?
```

### Product/Business Questions (20 Questions)

```
1. Revenue is down 15% WoW. How do you investigate?
2. How would you measure the success of a new feature?
3. What metrics would you track for a marketplace?
4. How do you calculate Customer Lifetime Value?
5. Churn increased from 4% to 6%. What do you do?
6. How would you price a new product?
7. What's the North Star Metric for [company]?
8. How do you measure user engagement?
9. A/B test shows 5% lift with p=0.06. Ship or not?
10. How do you prioritize which analysis to do first?
```

### Technical/Tool Questions (15 Questions)

```
1. How do you optimize a slow SQL query?
2. When would you use Python vs SQL for analysis?
3. How do you handle missing data?
4. What's the difference between ETL and ELT?
5. How do you ensure data quality in a pipeline?
6. Explain a time you automated a manual process
7. How do you version control your analysis?
8. What's your approach to dashboard design?
9. How do you handle a request for "all the data"?
10. How would you build a real-time dashboard?
```

### Behavioral Questions (15 Questions)

```
1. Tell me about a time your analysis changed a business decision
2. Describe a time you disagreed with a stakeholder's request
3. Tell me about a project that failed. What happened?
4. How do you handle competing priorities?
5. Describe a time you had to explain complex data simply
6. Tell me about a time you found an unexpected insight
7. How do you stay current with new tools/techniques?
8. Describe your process for starting a new analysis
9. How do you handle ambiguous requests?
10. Tell me about a time you went above and beyond
```

### n8n + AI Questions (10 Questions) — Your Differentiator

```
1. How have you used automation to improve analysis?
2. Describe a data pipeline you've built end-to-end
3. How would you integrate AI into a reporting workflow?
4. What's the difference between automating a report vs. building a dashboard?
5. How do you ensure quality in automated pipelines?
6. How would you build a self-healing data pipeline?
7. What AI use cases have you implemented for data analysis?
8. How do you validate AI-generated insights?
9. When should you NOT use AI for analysis?
10. How do you measure the ROI of data automation?
```

---

## SQL INTERVIEW MASTERY <a name="sql-interview"></a>

### The SQL Interview Framework

```
When given a SQL problem:

1. Clarify (30 seconds)
   → What tables exist? What columns?
   → What's the expected output format?
   → Any edge cases (nulls, duplicates)?

2. Plan (30 seconds)
   → What's the approach? (JOIN, aggregate, window function)
   → What order of operations?

3. Write (2-3 minutes)
   → Write clean, readable SQL
   → Use CTEs for complex queries
   → Comment your logic

4. Test (30 seconds)
   → Walk through with sample data
   → Check edge cases
   → Verify output matches expectations

5. Optimize (if asked)
   → Explain time/space complexity
   → Suggest indexes
   → Alternative approaches
```

### Top 10 SQL Patterns to Know

```
Pattern 1: Ranking (ROW_NUMBER, RANK, DENSE_RANK)
-- Top N per group
SELECT customer_id, revenue,
  RANK() OVER (PARTITION BY region ORDER BY revenue DESC) as rank
FROM customer_revenue;

Pattern 2: Running Total
SELECT date, revenue,
  SUM(revenue) OVER (ORDER BY date) as running_total
FROM daily_revenue;

Pattern 3: Gap Analysis (LAG/LEAD)
SELECT date, revenue,
  LAG(revenue) OVER (ORDER BY date) as prev_revenue,
  revenue - LAG(revenue) OVER (ORDER BY date) as growth
FROM daily_revenue;

Pattern 4: Cohort Analysis
SELECT
  DATE_TRUNC('month', signup_date) as cohort,
  EXTRACT(MONTH FROM AGE(transaction_date, signup_date)) as month_number,
  COUNT(DISTINCT customer_id) as active_customers
FROM customers c
JOIN transactions t ON c.id = t.customer_id
GROUP BY 1, 2;

Pattern 5: Self-Join (consecutive days)
SELECT DISTINCT a.customer_id
FROM activity a
JOIN activity b ON a.customer_id = b.customer_id
  AND b.date = a.date + INTERVAL '1 day'
JOIN activity c ON a.customer_id = c.customer_id
  AND c.date = a.date + INTERVAL '2 days';

Pattern 6: Deduplication
SELECT DISTINCT ON (email) *
FROM customers
ORDER BY email, created_at DESC;

Pattern 7: Conditional Aggregation
SELECT
  region,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  AVG(CASE WHEN status = 'active' THEN revenue END) as active_avg
FROM customers
GROUP BY region;

Pattern 8: Date Bucketing
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as orders,
  SUM(amount) as revenue
FROM orders
GROUP BY 1;

Pattern 9: Pivoting
SELECT
  customer_id,
  MAX(CASE WHEN month = 1 THEN revenue END) as jan,
  MAX(CASE WHEN month = 2 THEN revenue END) as feb,
  MAX(CASE WHEN month = 3 THEN revenue END) as mar
FROM monthly_revenue
GROUP BY customer_id;

Pattern 10: Recursive CTE (hierarchical data)
WITH RECURSIVE org_chart AS (
  SELECT id, name, manager_id, 1 as level
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, o.level + 1
  FROM employees e
  JOIN org_chart o ON e.manager_id = o.id
)
SELECT * FROM org_chart;
```

---

## CASE STUDY INTERVIEW FRAMEWORK <a name="case-study"></a>

### The Framework

```
Case: "Revenue dropped 20% last week. Investigate."

Step 1: Clarify the Problem (1-2 minutes)
→ "When exactly did the drop start?"
→ "Is this across all products/regions or concentrated?"
→ "Any known changes (pricing, outages, campaigns)?"
→ "What data sources can I access?"

Step 2: Form Hypotheses (2-3 minutes)
→ Volume issue (fewer customers, fewer orders)
→ Value issue (smaller orders, more discounts)
→ Technical issue (data quality, tracking broken)
→ External factor (seasonality, competitor, economy)

Step 3: Analyze Systematically (10-15 minutes)

  3a. Verify the drop
  SELECT SUM(amount), COUNT(*) FROM orders
  WHERE created_at >= 'last_week';
  → Confirm the 20% number

  3b. Segment the drop
  SELECT region, SUM(amount), COUNT(*)
  FROM orders WHERE created_at >= 'last_week'
  GROUP BY region;
  → Is it everywhere or concentrated?

  SELECT product_category, SUM(amount), COUNT(*)
  FROM orders WHERE created_at >= 'last_week'
  GROUP BY product_category;
  → Is it a specific product?

  3c. Check leading indicators
  SELECT DATE(created_at), COUNT(*), SUM(amount)
  FROM orders WHERE created_at >= '30_days_ago'
  GROUP BY DATE(created_at) ORDER BY 1;
  → When exactly did it start?

  3d. Check external factors
  → Any marketing campaign changes?
  → Any website outages?
  → Any competitor moves?

Step 4: Synthesize Findings (3-5 minutes)
→ "The 20% drop is real, concentrated in Region X"
→ "Started on Tuesday, correlates with [specific event]"
→ "Root cause appears to be [specific finding]"
→ "Recommend [specific action]"

Step 5: Recommend Next Steps (2 minutes)
→ Immediate: Fix the issue (if technical) or communicate (if external)
→ Short-term: Monitor recovery, prevent recurrence
→ Long-term: Build alerting for this type of issue
```

---

## TAKE-HOME ASSIGNMENT GUIDE <a name="take-home"></a>

### Common Assignment Types

```
Type 1: SQL Analysis (2-4 hours)
  → Given a database, answer business questions
  → Deliverable: SQL file + brief summary

Type 2: Dashboard Build (4-6 hours)
  → Given data, build a dashboard
  → Deliverable: Dashboard file or link

Type 3: End-to-End Analysis (1-2 days)
  → Given a problem, do full analysis
  → Deliverable: Notebook + presentation

Type 4: Pipeline Build (2-3 days)
  → Build an automated data pipeline
  → Deliverable: Code + documentation
```

### Submission Checklist

```
□ README with setup instructions
□ Clean, commented code (no dead code)
□ Results clearly presented
□ Edge cases handled
□ Error messages are clear
□ No hardcoded credentials
□ Git history (not just final commit)
□ Bonus: Automation (script, not manual steps)
□ Bonus: AI insights (show you can use AI effectively)
□ Bonus: Dashboard (show data communication skills)
```

### What Interviewers Look For

```
Must Have:
✅ Correct results (accuracy)
✅ Clean, readable code
✅ Handles edge cases (nulls, empties)
✅ Clear communication of findings

Nice to Have:
✅ Efficient code (good SQL, not brute force)
✅ Error handling
✅ Documentation/comments
✅ Visualization
✅ Bonus: Automation or AI integration

Red Flags:
❌ Incorrect results
❌ Messy, unreadable code
❌ No comments or documentation
❌ Didn't follow instructions
❌ Hardcoded values
❌ No error handling
```

---

## SALARY NEGOTIATION <a name="salary"></a>

### Market Rates (US, 2026)

| Level | Base Range | Equity | Total Comp | Remote Adjustment |
|-------|-----------|--------|------------|------------------|
| Junior | $50-70K | Minimal | $55-75K | -10 to -20% |
| Mid | $70-95K | 0.01-0.05% | $80-105K | -10 to -15% |
| Senior | $95-130K | 0.02-0.1% | $110-150K | -5 to -10% |
| Staff | $130-180K | 0.05-0.15% | $150-220K | -5% |
| Principal | $160-220K | 0.1-0.25% | $200-300K | 0% |

### Negotiation Framework

```
Step 1: Know Your Number
→ Research on levels.fyi, Glassdoor, BuiltIn
→ Factor in: location, experience, skills, competition
→ Set: Minimum acceptable, target, stretch

Step 2: Don't Give the First Number
→ "What's the budgeted range for this role?"
→ If pressed: "I'm flexible based on the total package"

Step 3: Negotiate the Full Package
→ Base salary (primary)
→ Signing bonus (easier to get than base increase)
→ Equity (meaningful at startups)
→ Remote work flexibility
→ Professional development budget
→ Extra vacation days

Step 4: Use Competing Offers
→ "I have another offer at $X — can you match?"
→ Only if true (they may ask for proof)

Step 5: Be Willing to Walk
→ If they won't meet your minimum
→ If culture/red flags appear
→ If growth trajectory is wrong
```

### Script Examples

```
When asked about salary expectations:
"I'm excited about this role and the impact I can make.
I'd love to learn more about the responsibilities first.
What range has been budgeted for this position?"

When making a counter-offer:
"Thank you for the offer — I'm really excited about the
opportunity. Based on my research and experience with
[specific skills, impact], I was expecting something
closer to $X. Is there flexibility in the base?"

When negotiating equity:
"I appreciate the offer. Since this is an early-stage
company, equity is particularly important to me.
Could we discuss increasing the equity component?
I'm comfortable being slightly flexible on base if
the equity reflects the impact I'll have."
```

---

## GROWTH TO SENIOR/STAFF LEVEL <a name="growth"></a>

### From Mid to Senior (2-3 Years)

```
What Changes:
- From: Executes analyses → To: Identifies what to analyze
- From: Answers questions → To: Asks better questions
- From: Uses existing data → To: Builds new data sources
- From: Individual contributor → To: Multiplier (mentors, influences)

How to Get There:
1. Own a major analysis end-to-end
   → Define the question
   → Gather data (may require building new pipelines)
   → Analyze and present
   → Drive a decision based on findings

2. Build reusable infrastructure
   → Not just one-off analyses
   → Dashboards, pipelines, data models
   → Things other analysts can use

3. Develop stakeholder relationships
   → Not just responding to requests
   → Proactively identifying opportunities
   → Becoming a trusted advisor

4. Mentor junior analysts
   → Code reviews
   → Teaching sessions
   → Helping with their projects

5. Develop a specialty
   → Become "the go-to person" for something
   → Examples: Experimentation, forecasting, ML, data quality
```

### From Senior to Staff (3-5 More Years)

```
What Changes:
- From: Team-level impact → To: Organization-level impact
- From: Data problems → To: Data strategy
- From: Analysis → To: Data product design
- From: Internal → To: External (community, industry)

How to Get There:
1. Cross-functional projects
   → Work with engineering on data infrastructure
   → Work with product on metric definitions
   → Work with leadership on strategy

2. Data quality and governance
   → Own data quality for key metrics
   → Establish metric definitions and documentation
   → Build trust in data across the org

3. Thought leadership
   → Write blog posts, speak at meetups
   → Contribute to open-source data tools
   → Build a reputation in the data community

4. Technical depth
   → Learn data engineering (Airflow, dbt, Spark)
   → Learn ML/MLOps (model deployment, monitoring)
   → Understand data architecture (warehouses, lakes)

5. Business acumen
   → Understand the business model deeply
   → Understand unit economics
   → Can translate data to strategy
```

### Skills to Invest In (2026+)

```
Highest ROI Skills:
1. AI/ML for Analysis (using LLMs, AutoML)
   → Not building models — using them to 10x your output
   → Text-to-SQL, automated insights, AI-enhanced reports

2. Data Engineering Basics (dbt, Airflow, SQL optimization)
   → Can build reliable pipelines
   → Understand data architecture

3. Data Product Thinking
   → Build tools people love to use
   → Not just dashboards — data products

4. Statistical Rigor
   → Experimentation design
   → Causal inference
   → Bayesian analysis

5. Communication & Storytelling
   → Can make data compelling
   → Can influence decisions, not just inform them
```

---

## NETWORKING & PERSONAL BRANDING <a name="networking"></a>

### Building Your Brand

```
LinkedIn Strategy:
- Post analysis tips, automation wins, dashboard designs
- Share project screenshots with lessons learned
- Comment thoughtfully on industry leaders' posts
- Connect with other analysts (peers, seniors, recruiters)

GitHub Strategy:
- Open-source your n8n workflows
- Contribute to data analysis libraries
- Clean, documented repositories

Content Creation:
- Write blog posts about interesting analyses
- Create YouTube/Loom tutorials of your projects
- Share templates (SQL snippets, dashboard designs)

Community:
- Join data communities (Locally Optimistic, DataTalks.Club)
- Attend meetups (SQL, BI, Python, n8n)
- Participate in #MakeOverMonday (weekly viz challenges)
- Contribute to Stack Overflow (SQL, Python tags)
```

### Networking That Actually Works

```
Cold Outreach Template:
"Hi [Name], I'm a data analyst who admires your work
on [specific thing]. I noticed you built [specific
project] and would love to learn about your approach.
Would you be open to a 15-minute chat sometime?
No agenda — just curious about your experience."

Informational Interview:
- Ask about their career path
- Ask about their team's challenges
- Ask what skills they value most
- Don't ask for a job (let it come naturally)

Following Up:
- Thank them within 24 hours
- Share something relevant (article, tool)
- Check in quarterly with updates
- Offer value before asking for anything
```

### Resume That Gets Past ATS

```
Format:
- 1 page (0-5 years), 2 pages (5+ years)
- Reverse chronological (most recent first)
- Action + Metric + Impact for each bullet

Bullet Formula:
Action Verb + What You Did + How + Impact

Examples:
❌ "Created dashboards for sales team"
✅ "Built automated daily sales dashboard (n8n + SQL +
   Metabase) used by 15 stakeholders, saving 10 hrs/week
   and identifying $50K in pipeline risks"

❌ "Analyzed customer churn data"
✅ "Developed churn prediction model (Python, RandomForest)
   achieving 78% precision, enabling CS team to proactively
   retain 200+ at-risk customers quarterly ($30K MRR saved)"

Keywords (ATS-Optimized):
SQL, Python, R, Tableau, Power BI, Looker, dbt,
Airflow, n8n, statistics, A/B testing, ETL, ELT,
data modeling, data visualization, stakeholder management
```

---

## FINAL CHECKLIST — ARE YOU READY? <a name="final-checklist"></a>

### Before Applying

```
Technical:
□ Can solve medium SQL problems in < 10 minutes
□ Can build a dashboard from scratch in your tool of choice
□ Can write a Python script to fetch data from an API
□ Can explain a statistical concept simply
□ Have 2-3 portfolio projects with clear documentation

Business:
□ Can analyze a business metric end-to-end
□ Can communicate findings to non-technical audience
□ Have an opinion on what makes a good dashboard
□ Understand basic business metrics (LTV, CAC, churn, NRR)

Mindset:
□ Comfortable with ambiguity (not all questions have clear answers)
□ Curious (asks "why" before "how")
□ Pragmatic (good enough > perfect)
□ Collaborative (works well with non-data people)
```

### Red Flags to Watch For (In Companies)

```
🚩 "We need someone who can just pull data" (data monkey)
🚩 No existing data infrastructure (you'll be building everything)
🚩 Data team reports to IT (not product/business)
🚩 "Fast-paced" with no processes (chaos)
🚩 Can't name a recent data-driven decision (data isn't valued)
🚩 High turnover on data team (toxic culture)

✅ "We want someone to help us make better decisions"
✅ Clear data team structure and career path
✅ Data team reports to business/product leadership
✅ Examples of data-driven decisions they've made
✅ Investment in data tools and infrastructure
✅ Low turnover, people who've been promoted internally
```

---

-date-month-last two digit of year: 12-04-26

# ✅ Admin Dashboard Complete APIs - UPDATED

**Date:** 24-03-26  
**Status:** ✅ COMPLETE WITH CHARTS  
**Figma:** `main-admin-dashboard/dashboard-section-flow.png`

---

## 📋 Overview

Complete API implementation for **Admin Dashboard** with **flexible chart data**:

### **NEW: Chart Data Endpoints**
- **Monthly view:** Current year, month-by-month data
- **Yearly view:** Last 5 years, year-by-year data
- Query parameter `type` controls the view

---

## 🔌 All API Endpoints

### **1. Main Dashboard Overview**
```
GET /analytics/admin/dashboard
```
Returns: Complete dashboard with user counts by role, revenue summary, task metrics

### **2. User Registration Chart (NEW)**
```
GET /analytics/admin/user-registration-chart?type=monthly|yearly&year=2026
```
Returns: Bar chart data for user registrations

### **3. Income/Revenue Chart (NEW)**
```
GET /analytics/admin/income-chart?type=monthly|yearly
```
Returns: Bar chart data for revenue with today/weekly/monthly totals

---

## 📊 Endpoint Details

### **1️⃣ GET /analytics/admin/dashboard**

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "overview": {
      "totalUsers": 2543,
      "totalTasks": 15847,
      "usersByRole": {
        "individual": 850,
        "child": 1200,
        "business": 450,
        "admin": 43
      }
    },
    "revenue": {
      "mrr": 45000,
      "arr": 540000,
      "thisMonth": 45000,
      "growthRate": 18.42
    }
  }
}
```

---

### **2️⃣ GET /analytics/admin/user-registration-chart**

**Query Parameters:**
- `type` (optional): `'monthly'` or `'yearly'` (default: `'monthly'`)
- `year` (optional): Specific year (default: current year for monthly)

#### **Example 1: Monthly View (Current Year)**

```bash
GET /analytics/admin/user-registration-chart?type=monthly
```

**Response:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "type": "monthly",
    "data": [
      { "period": "1", "label": "Jan", "count": 180 },
      { "period": "2", "label": "Feb", "count": 210 },
      { "period": "3", "label": "Mar", "count": 250 },
      { "period": "4", "label": "Apr", "count": 195 },
      { "period": "5", "label": "May", "count": 220 },
      { "period": "6", "label": "Jun", "count": 240 },
      { "period": "7", "label": "Jul", "count": 185 },
      { "period": "8", "label": "Aug", "count": 200 },
      { "period": "9", "label": "Sep", "count": 230 },
      { "period": "10", "label": "Oct", "count": 260 },
      { "period": "11", "label": "Nov", "count": 190 },
      { "period": "12", "label": "Dec", "count": 183 }
    ],
    "totalUsers": 2543,
    "growthRate": 18.42
  }
}
```

#### **Example 2: Yearly View (Last 5 Years)**

```bash
GET /analytics/admin/user-registration-chart?type=yearly
```

**Response:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "type": "yearly",
    "data": [
      { "period": "2022", "label": "2022", "count": 1200 },
      { "period": "2023", "label": "2023", "count": 1800 },
      { "period": "2024", "label": "2024", "count": 2543 }
    ],
    "totalUsers": 5543,
    "growthRate": 41.28
  }
}
```

---

### **3️⃣ GET /analytics/admin/income-chart**

**Query Parameters:**
- `type` (optional): `'monthly'` or `'yearly'` (default: `'monthly'`)

#### **Example 1: Monthly View**

```bash
GET /analytics/admin/income-chart?type=monthly
```

**Response:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "type": "monthly",
    "data": [
      { "period": "1", "label": "Jan", "amount": 32000 },
      { "period": "2", "label": "Feb", "amount": 38000 },
      { "period": "3", "label": "Mar", "amount": 45000 },
      { "period": "4", "label": "Apr", "amount": 42000 },
      { "period": "5", "label": "May", "amount": 48000 },
      { "period": "6", "label": "Jun", "amount": 52000 },
      { "period": "7", "label": "Jul", "amount": 39000 },
      { "period": "8", "label": "Aug", "amount": 41000 },
      { "period": "9", "label": "Sep", "amount": 46000 },
      { "period": "10", "label": "Oct", "amount": 53000 },
      { "period": "11", "label": "Nov", "amount": 44000 },
      { "period": "12", "label": "Dec", "amount": 47000 }
    ],
    "todayAmount": 1200,
    "weeklyAmount": 8500,
    "monthlyAmount": 45000,
    "growthRate": 18.42
  }
}
```

#### **Example 2: Yearly View**

```bash
GET /analytics/admin/income-chart?type=yearly
```

**Response:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "type": "yearly",
    "data": [
      { "period": "2022", "label": "2022", "amount": 380000 },
      { "period": "2023", "label": "2023", "amount": 456000 },
      { "period": "2024", "label": "2024", "amount": 540000 }
    ],
    "todayAmount": 1200,
    "weeklyAmount": 8500,
    "monthlyAmount": 45000,
    "growthRate": 18.42
  }
}
```

---

## 🎨 Frontend Integration

### **React Component Example:**

```typescript
// AdminDashboard.tsx
const AdminDashboard = () => {
  const [chartType, setChartType] = useState<'monthly' | 'yearly'>('monthly');
  const [userChartData, setUserChartData] = useState<any>(null);
  const [incomeChartData, setIncomeChartData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Fetch dashboard overview
  useEffect(() => {
    api.get('/analytics/admin/dashboard').then(res => {
      setDashboardData(res.data.data);
    });
  }, []);

  // Fetch user registration chart
  useEffect(() => {
    api.get(`/analytics/admin/user-registration-chart?type=${chartType}`)
      .then(res => setUserChartData(res.data.data));
  }, [chartType]);

  // Fetch income chart
  useEffect(() => {
    api.get(`/analytics/admin/income-chart?type=${chartType}`)
      .then(res => setIncomeChartData(res.data.data));
  }, [chartType]);

  return (
    <div>
      {/* Top Cards - User Count by Role */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="Individual Users" 
          value={dashboardData?.overview.usersByRole.individual}
          icon={<UserIcon />}
        />
        <StatCard 
          title="Child Users" 
          value={dashboardData?.overview.usersByRole.child}
          icon={<ChildIcon />}
        />
        <StatCard 
          title="Business Users" 
          value={dashboardData?.overview.usersByRole.business}
          icon={<BriefcaseIcon />}
        />
        <StatCard 
          title="Admin Users" 
          value={dashboardData?.overview.usersByRole.admin}
          icon={<ShieldIcon />}
        />
      </div>

      {/* Monthly Income Section */}
      <div className="mt-8">
        <MonthlyIncome 
          today={incomeChartData?.todayAmount}
          weekly={incomeChartData?.weeklyAmount}
          monthly={incomeChartData?.monthlyAmount}
          growthRate={incomeChartData?.growthRate}
        />
      </div>

      {/* User Ratio Chart with Toggle */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">User Registration Trend</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('monthly')}
              className={`px-4 py-2 rounded ${
                chartType === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setChartType('yearly')}
              className={`px-4 py-2 rounded ${
                chartType === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Annually
            </button>
          </div>
        </div>
        
        <BarChart
          data={userChartData?.data.map(d => ({
            label: d.label,
            value: d.count,
          }))}
          height={300}
        />
      </div>

      {/* Income Chart */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        <BarChart
          data={incomeChartData?.data.map(d => ({
            label: d.label,
            value: d.amount / 1000, // Convert to K
          }))}
          height={300}
          yAxisLabel="Revenue ($K)"
        />
      </div>
    </div>
  );
};
```

---

## 📊 Chart.js Integration

### **User Registration Chart:**

```typescript
// Chart configuration
const userChartConfig = {
  type: 'bar' as const,
  data: {
    labels: userChartData?.data.map(d => d.label) || [],
    datasets: [{
      label: 'New Users',
      data: userChartData?.data.map(d => d.count) || [],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.raw} users`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  },
};
```

### **Income Chart:**

```typescript
const incomeChartConfig = {
  type: 'bar' as const,
  data: {
    labels: incomeChartData?.data.map(d => d.label) || [],
    datasets: [{
      label: 'Revenue',
      data: incomeChartData?.data.map(d => d.amount) || [],
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `$${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `$${value / 1000}K`,
        },
      },
    },
  },
};
```

---

## 🧪 Testing

### **Test Case 1: Get Dashboard Overview**

```bash
curl -X GET "http://localhost:5000/api/v1/analytics/admin/dashboard" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

### **Test Case 2: Get Monthly User Registration Chart**

```bash
curl -X GET "http://localhost:5000/api/v1/analytics/admin/user-registration-chart?type=monthly" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

### **Test Case 3: Get Yearly Income Chart**

```bash
curl -X GET "http://localhost:5000/api/v1/analytics/admin/income-chart?type=yearly" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `adminAnalytics.service.ts` | Added `getUserRegistrationChartData()` and `getIncomeChartData()` |
| `adminAnalytics.controller.ts` | Added controller methods for chart endpoints |
| `adminAnalytics.route.ts` | Added `/user-registration-chart` and `/income-chart` routes |

---

## ✅ Complete API List

| Endpoint | Method | Purpose | Query Params |
|----------|--------|---------|--------------|
| `/admin/dashboard` | GET | Complete dashboard overview | - |
| `/admin/user-registration-chart` | GET | User registration bar chart | `type`, `year` |
| `/admin/income-chart` | GET | Revenue bar chart | `type` |
| `/admin/user-growth` | GET | User growth analytics | - |
| `/admin/revenue` | GET | Revenue analytics | - |
| `/admin/task-metrics` | GET | Task metrics | - |
| `/admin/engagement` | GET | User engagement | - |
| `/admin/user-ratio` | GET | User ratio chart | `type` |

---

## 🎯 Response Data Structure

### **User Registration Chart:**
```typescript
{
  type: 'monthly' | 'yearly';
  data: {
    period: string;      // "1"-"12" for monthly, "2022" for yearly
    label: string;       // "Jan"-"Dec" or "2022"
    count: number;
  }[];
  totalUsers: number;
  growthRate: number;
}
```

### **Income Chart:**
```typescript
{
  type: 'monthly' | 'yearly';
  data: {
    period: string;
    label: string;
    amount: number;
  }[];
  todayAmount: number;
  weeklyAmount: number;
  monthlyAmount: number;
  growthRate: number;
}
```

---

## ✅ Summary

### **What Was Added:**

1. ✅ **User Registration Chart Endpoint**
   - Monthly view: 12 months of current year
   - Yearly view: Last 5 years
   - Includes growth rate calculation

2. ✅ **Income/Revenue Chart Endpoint**
   - Monthly view: Revenue by month
   - Yearly view: Revenue by year
   - Includes today/weekly/monthly totals
   - Growth rate calculation

3. ✅ **Flexible Query Parameters**
   - `type` parameter for view switching
   - `year` parameter for custom year filtering

### **Benefits:**

- ✅ **Single endpoint** for both monthly/yearly views
- ✅ **Chart-ready data** format
- ✅ **Growth rate** included for trend analysis
- ✅ **Cached responses** for performance
- ✅ **Complete dashboard** coverage

---

**All admin dashboard APIs are production-ready with full chart support!** 🎉

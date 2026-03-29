# 📊 Task Monitoring Dashboard - API Requirements

**Date**: 17-03-26  
**Figma Reference**: `figma-asset/teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png`  
**Status**: ⚠️ **MISSING - NEEDS IMPLEMENTATION**

---

## 📸 **Figma Screen Analysis**

### **Page**: Task Monitoring (Parent/Business User View)

**Purpose**: Track and analyze task performance across your team (children)

---

## 🔴 **Missing APIs**

### **1. Top Statistics Cards**

**Endpoint Needed**: `GET /v1/analytics/task-monitoring/summary/:businessUserId`

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "notStartedTasks": 4,      // Children's pending tasks
    "inProgressTasks": 4,       // Children's in-progress tasks
    "myTasks": 4,               // Parent's personal tasks
    "completedTasks": 4,        // Children's completed tasks
    "totalTasks": 16            // Sum of all
  }
}
```

**Logic**:
- `notStartedTasks`: Count tasks where `assignedUserIds` includes any child AND `status = 'pending'`
- `inProgressTasks`: Count tasks where `assignedUserIds` includes any child AND `status = 'inProgress'`
- `myTasks`: Count tasks where `ownerUserId = businessUserId` AND `taskType = 'personal'`
- `completedTasks`: Count tasks where `assignedUserIds` includes any child AND `status = 'completed'`

---

### **2. Task Activity Chart (Monthly/Annual)**

**Endpoint Needed**: `GET /v1/analytics/task-monitoring/activity/:businessUserId`

**Query Parameters**:
- `period`: `'monthly'` | `'annual'` (default: `'monthly'`)
- `year`: Number (optional, default: current year)

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "year": 2026,
    "chartData": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      "datasets": [
        {
          "label": "Tasks Created",
          "data": [130, 170, 220, 170, 120, 170, 90, 120, 150, 190, 95, 140],
          "color": "#3B82F6"
        }
      ]
    },
    "statistics": {
      "totalTasks": 1765,
      "averagePerMonth": 147,
      "peakMonth": "Mar",
      "growthPercentage": 46
    }
  }
}
```

**Logic**:
- Group tasks by `createdAt` month
- Filter: `assignedUserIds` includes any of business user's children
- Aggregate by month (12 months for annual, 30 days for monthly)
- Calculate growth percentage vs previous period

---

### **3. Tasks Activity List**

**Endpoint**: Already exists! ✅
```http
GET /v1/tasks/dashboard/children-tasks
```

**Query Parameters**:
- `status`: `'all'` | `'pending'` | `'inProgress'` | `'completed'`
- `taskType`: `'children'` | `'personal'`
- `page`, `limit`, `sortBy`
- `search`: String (search by title)

**Response**: Already returns paginated task list with filters

---

## 📊 **Complete API Specification**

### **Endpoint 1: Task Monitoring Summary**

```typescript
// Route
GET /v1/analytics/task-monitoring/summary/:businessUserId

// Controller
async getTaskMonitoringSummary(req, res) {
  const { businessUserId } = req.params;
  
  const result = await analyticsService.getTaskMonitoringSummary(businessUserId);
  
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task monitoring summary retrieved successfully',
  });
}

// Service Method
async getTaskMonitoringSummary(businessUserId: string) {
  // Get all children for this business user
  const childrenRelations = await ChildrenBusinessUser.find({
    parentBusinessUserId: new Types.ObjectId(businessUserId),
    status: 'active',
    isDeleted: false,
  }).select('childUserId').lean();
  
  const childUserIds = childrenRelations.map(rel => rel.childUserId);
  
  // Get task counts
  const [
    notStartedCount,
    inProgressCount,
    completedCount,
    myTasksCount
  ] = await Promise.all([
    // Not Started (pending tasks assigned to children)
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      status: 'pending',
      isDeleted: false,
    }),
    
    // In Progress (tasks assigned to children)
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      status: 'inProgress',
      isDeleted: false,
    }),
    
    // Completed (tasks assigned to children)
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      status: 'completed',
      isDeleted: false,
    }),
    
    // My Tasks (parent's personal tasks)
    Task.countDocuments({
      ownerUserId: new Types.ObjectId(businessUserId),
      taskType: 'personal',
      isDeleted: false,
    }),
  ]);
  
  return {
    notStartedTasks: notStartedCount,
    inProgressTasks: inProgressCount,
    myTasks: myTasksCount,
    completedTasks: completedCount,
    totalTasks: notStartedCount + inProgressCount + completedCount + myTasksCount,
  };
}
```

---

### **Endpoint 2: Task Activity Chart**

```typescript
// Route
GET /v1/analytics/task-monitoring/activity/:businessUserId
  ?period=monthly
  &year=2026

// Controller
async getTaskActivityChart(req, res) {
  const { businessUserId } = req.params;
  const { period = 'monthly', year } = req.query;
  
  const result = await analyticsService.getTaskActivityChart(
    businessUserId,
    period,
    year ? parseInt(year) : undefined
  );
  
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task activity chart data retrieved successfully',
  });
}

// Service Method
async getTaskActivityChart(
  businessUserId: string,
  period: 'monthly' | 'annual' = 'monthly',
  year?: number
) {
  const currentYear = year || new Date().getFullYear();
  
  // Get all children for this business user
  const childrenRelations = await ChildrenBusinessUser.find({
    parentBusinessUserId: new Types.ObjectId(businessUserId),
    status: 'active',
    isDeleted: false,
  }).select('childUserId').lean();
  
  const childUserIds = childrenRelations.map(rel => rel.childUserId);
  
  // Build aggregation pipeline
  const pipeline: any[] = [
    {
      $match: {
        assignedUserIds: { $in: childUserIds },
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          $month: '$createdAt',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ];
  
  const taskCounts = await Task.aggregate(pipeline);
  
  // Create month labels
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  // Fill in missing months with 0
  const data = monthLabels.map((_, index) => {
    const monthData = taskCounts.find(t => t._id === index + 1);
    return monthData ? monthData.count : 0;
  });
  
  // Calculate statistics
  const totalTasks = data.reduce((sum, count) => sum + count, 0);
  const averagePerMonth = Math.round(totalTasks / 12);
  const peakMonthIndex = data.indexOf(Math.max(...data));
  const peakMonth = monthLabels[peakMonthIndex];
  
  // Calculate growth (compare to previous year if available)
  const growthPercentage = await this.calculateGrowthPercentage(
    childUserIds,
    currentYear,
    period
  );
  
  return {
    period,
    year: currentYear,
    chartData: {
      labels: monthLabels,
      datasets: [
        {
          label: 'Tasks Created',
          data,
          color: '#3B82F6',
        },
      ],
    },
    statistics: {
      totalTasks,
      averagePerMonth,
      peakMonth,
      growthPercentage,
    },
  };
}

private async calculateGrowthPercentage(
  childUserIds: Types.ObjectId[],
  currentYear: number,
  period: string
): Promise<number> {
  // Compare current year to previous year
  const [currentYearTasks, previousYearTasks] = await Promise.all([
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      isDeleted: false,
      createdAt: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    }),
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      isDeleted: false,
      createdAt: {
        $gte: new Date(`${currentYear - 1}-01-01`),
        $lte: new Date(`${currentYear - 1}-12-31`),
      },
    }),
  ]);
  
  if (previousYearTasks === 0) return 0;
  
  return Math.round(((currentYearTasks - previousYearTasks) / previousYearTasks) * 100);
}
```

---

## 📝 **Implementation Plan**

### **Files to Create/Modify:**

1. **`src/modules/analytics.module/taskMonitoring/taskMonitoring.service.ts`** (NEW)
   - `getTaskMonitoringSummary()`
   - `getTaskActivityChart()`

2. **`src/modules/analytics.module/taskMonitoring/taskMonitoring.controller.ts`** (NEW)
   - `getTaskMonitoringSummary`
   - `getTaskActivityChart`

3. **`src/modules/analytics.module/taskMonitoring/taskMonitoring.route.ts`** (NEW)
   - `GET /summary/:businessUserId`
   - `GET /activity/:businessUserId`

4. **`src/modules/analytics.module/analytics.module.ts`** (MODIFY)
   - Import taskMonitoring routes

---

## 🎯 **Frontend Usage**

### **Dashboard Component** (React/Flutter)

```javascript
// 1. Fetch summary statistics
const fetchSummary = async () => {
  const response = await fetch(
    `/v1/analytics/task-monitoring/summary/${businessUserId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  
  setState({
    notStarted: data.data.notStartedTasks,
    inProgress: data.data.inProgressTasks,
    myTasks: data.data.myTasks,
    completed: data.data.completedTasks,
  });
};

// 2. Fetch activity chart data
const fetchActivityChart = async (period = 'monthly') => {
  const response = await fetch(
    `/v1/analytics/task-monitoring/activity/${businessUserId}?period=${period}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  
  setChartData({
    labels: data.data.chartData.labels,
    datasets: data.data.chartData.datasets,
  });
};

// 3. Fetch task list (already exists)
const fetchTasks = async (filters) => {
  const response = await fetch(
    `/v1/tasks/dashboard/children-tasks?${new URLSearchParams(filters)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  
  setTasks(data.data.tasks);
};
```

---

## ✅ **Status**

- [ ] Create `taskMonitoring.service.ts`
- [ ] Create `taskMonitoring.controller.ts`
- [ ] Create `taskMonitoring.route.ts`
- [ ] Register routes in analytics module
- [ ] Add Redis caching
- [ ] Add rate limiting
- [ ] Test endpoints
- [ ] Update Postman collection

---

**Priority**: 🔴 **HIGH** - Required for Task Monitoring dashboard  
**Estimated Time**: 2-3 hours  
**Complexity**: Medium

---
-17-03-26

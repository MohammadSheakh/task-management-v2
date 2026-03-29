# 📊 API Flow: Analytics & Charts

**Role:** All Users (User Analytics), Admin (Platform Analytics)  
**Figma Reference:** All dashboard screens  
**Module:** Analytics (Chart Aggregation)  
**Date:** 15-03-26  
**Version:** 1.0 - Complete Flow  

---

## 🎯 Overview

This flow covers all **10 chart aggregation endpoints** for dashboard visualizations.

---

## 📍 Chart Endpoints (All Users)

### 1. User Growth Chart
```http
GET /v1/analytics/charts/user-growth?days=30
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Line Chart  
**Purpose:** Show new user trends over last N days

---

### 2. Task Status Distribution
```http
GET /v1/analytics/charts/task-status
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Pie/Doughnut Chart  
**Purpose:** Show task distribution by status

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "distribution": [
      {"status": "pending", "count": 45, "percentage": 30},
      {"status": "inProgress", "count": 55, "percentage": 36.67},
      {"status": "completed", "count": 50, "percentage": 33.33}
    ]
  }
}
```

---

### 3. Monthly Income Chart
```http
GET /v1/analytics/charts/monthly-income?months=12
Authorization: Bearer {{adminToken}}
```
**Chart Type:** Bar Chart  
**Purpose:** Show revenue trends

---

### 4. User Ratio Chart
```http
GET /v1/analytics/charts/user-ratio
Authorization: Bearer {{adminToken}}
```
**Chart Type:** Pie Chart  
**Purpose:** Individual vs Business user ratio

---

### 5. Family Activity Chart
```http
GET /v1/analytics/charts/family-activity/:businessUserId
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Bar/Line Chart  
**Purpose:** Show family member activity

---

### 6. Child Progress Chart
```http
GET /v1/analytics/charts/child-progress/:businessUserId
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Line Chart  
**Purpose:** Track child's task completion over time

---

### 7. Status by Child Chart
```http
GET /v1/analytics/charts/status-by-child/:businessUserId
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Stacked Bar Chart  
**Purpose:** Task status breakdown per child

---

### 8. Completion Trend Chart
```http
GET /v1/analytics/charts/completion-trend/:userId
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Line Chart  
**Purpose:** User's completion rate trend

---

### 9. Activity Heatmap Chart
```http
GET /v1/analytics/charts/activity-heatmap/:userId
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Heatmap  
**Purpose:** Show activity by day/hour

---

### 10. Collaborative Progress Chart
```http
GET /v1/analytics/charts/collaborative-progress/:taskId
Authorization: Bearer {{accessToken}}
```
**Chart Type:** Progress Bar  
**Purpose:** Show progress on collaborative tasks

---

## 📍 Admin Analytics Endpoints

See: `flow/10-admin-dashboard/10-admin-dashboard-flow.md`

- `/analytics/admin/dashboard` - Complete overview
- `/analytics/admin/user-growth` - User growth stats
- `/analytics/admin/revenue` - Revenue analytics
- `/analytics/admin/task-metrics` - Task statistics
- `/analytics/admin/engagement` - Engagement metrics
- `/analytics/admin/user-ratio` - User ratio charts

---

## 📊 Chart.js Integration Example

```javascript
// Fetch task status data
const response = await fetch('/v1/analytics/charts/task-status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();

// Create Chart.js pie chart
new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: data.distribution.map(d => d.status),
    datasets: [{
      data: data.distribution.map(d => d.count),
      backgroundColor: ['#FCD34D', '#3B82F6', '#10B981']
    }]
  }
});
```

---

**Status:** ✅ **COMPLETE**  
**Last Updated:** 15-03-26

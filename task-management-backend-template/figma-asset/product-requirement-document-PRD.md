# Product Requirements Document (PRD)

## Task Management Platform — askfemi

---

**Document Version:** 1.0  
**Date:** April 8, 2026  
**Prepared By:** Senior Backend Engineer  
**Based On:** Figma UI Assets + Backend Codebase Analysis  
**Master System Prompt:** `__Documentation/qwen/masterSystemPrompt.md` (V2.0)  
**Scale Targets:** 100,000+ concurrent users | 10M+ tasks | <200ms reads | 99.9% uptime

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Personas](#2-user-personas)
3. [User Journeys](#3-user-journeys)
4. [Feature Specifications — Admin Dashboard](#4-feature-specifications--admin-dashboard)
5. [Feature Specifications — Teacher/Parent Dashboard](#5-feature-specifications--teacherparent-dashboard)
6. [Feature Specifications — Mobile App (App Users)](#6-feature-specifications--mobile-app-app-users)
7. [Permission & Access Control Model](#7-permission--access-control-model)
8. [Subscription & Monetization](#8-subscription--monetization)
9. [Notification & Communication System](#9-notification--communication-system)
10. [Task Management Core Logic](#10-task-management-core-logic)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Edge Cases & Error Handling](#12-edge-cases--error-handling)
13. [API Requirements Matrix](#13-api-requirements-matrix)
14. [Future Features (Out of Scope)](#14-future-features-out-of-scope)
15. [Glossary](#15-glossary)

---

## 1. Product Vision

### 1.1 Problem Statement

Parents and teachers struggle to:
- Assign tasks to children/students and track completion
- Motivate children with different support styles
- Monitor multiple children's progress in one place
- Manage permissions (who can create/assign tasks)
- Maintain consistent task management across web and mobile

### 1.2 Solution

**askfemi** is a multi-role task management platform providing:

- **Admin Dashboard:** Platform administration, user management, subscription oversight, analytics
- **Teacher/Parent Dashboard:** Task creation, team monitoring, permission management
- **Mobile App:** Individual task management with personalized support modes

### 1.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task Completion Rate | > 70% within due date | Completed tasks / Total tasks |
| Parent Dashboard Engagement | > 80% weekly active | WAU / Total parents |
| Mobile App DAU | > 60% daily active | DAU / Total children |
| API Response Time (p95) | < 200ms (reads), < 500ms (writes) | APM monitoring |
| System Uptime | 99.9% | Health check monitoring |
| Support Mode Impact | +15% completion rate for encouraged mode | A/B testing |

---

## 2. User Personas

### 2.1 Platform Administrator (Admin)

**Role:** `admin`  
**Interface:** Main Admin Dashboard (Web)  
**Goals:**
- Monitor platform health and growth
- Manage users (individual + business accounts)
- Oversee subscription plans and revenue
- Handle support escalations

**Pain Points:**
- No visibility into user activity without proper analytics
- Manual subscription management
- Difficult to identify struggling users (low engagement)

**Key Actions:**
- View dashboard analytics (user stats, monthly income, user ratio)
- Search/filter user list
- View user details (profile, tasks, subscriptions, activity)
- Create/edit subscription plans
- Update platform settings (privacy policy, terms, contact info)

---

### 2.2 Teacher/Parent (Business User)

**Role:** `business`  
**Interface:** Teacher/Parent Dashboard (Web)  
**Subscription:** Group Plan ($29.99/mo — up to 5 users: 1 Primary + 4 Secondary)  
**Goals:**
- Create and assign tasks to children/team members
- Monitor task completion in real-time
- Manage team member permissions
- Motivate children with different support styles

**Pain Points:**
- Can't track multiple children's progress from one place
- No way to control which children can create tasks
- Difficult to assign collaborative tasks (multiple children working together)
- Need different motivational approaches for different children

**Key Actions:**
- View dashboard (member cards, task summaries, live activity feed)
- Create tasks (3 types: Single Assignment, Collaborative, Personal)
- Monitor tasks by status (Not Started, In Progress, Completed)
- Manage team members (add/edit/remove)
- Configure permissions (which secondary users can create/assign tasks)
- View/manage subscription plan

---

### 2.3 Individual User (Child/Group Member — With Permission)

**Role:** `child` (isSecondaryUser: true)  
**Interface:** Mobile App (Flutter)  
**Goals:**
- View my tasks and track progress
- Create tasks for myself and others (if permitted)
- Complete subtasks and mark progress
- Customize my support mode and notification preferences

**Pain Points:**
- Overwhelmed by too many tasks
- Need motivation (different styles work for different people)
- Can't see what others are doing (collaborative tasks)

**Key Actions:**
- View home screen (task list, daily progress)
- Create tasks (Single/Collaborative/Personal — with permission)
- Update task status (Pending → In Progress → Completed)
- Track subtask progress
- View profile (support mode: Calm/Encouraging/Logical, notification style)

---

### 2.4 Individual User (Child/Group Member — Without Permission)

**Role:** `child` (isSecondaryUser: false)  
**Interface:** Mobile App (Flutter)  
**Goals:**
- View my assigned tasks
- Complete tasks and subtasks
- Track my own progress

**Pain Points:**
- Can't create tasks (parent hasn't granted permission)
- Only see personal tasks
- Limited control over task management

**Key Actions:**
- View home screen (task list, daily progress)
- Create Personal tasks only (no Single/Collaborative)
- Update task status
- Track subtask progress
- View profile (support mode, notification style)

---

## 3. User Journeys

### 3.1 Admin User Journey

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Login     │────▶│  Dashboard   │────▶│   User List   │────▶│ User Details │
│  (Admin)    │     │  (Analytics) │     │ (Search/Filter)│     │  (Full Info) │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                                                                   │
                        ┌──────────────┐                          │
                        │   Settings   │◀─────────────────────────┘
                        │  (Platform)  │
                        └──────────────┘
```

**Journey Steps:**

1. **Login** — Admin enters credentials → JWT issued → Redirected to dashboard
2. **Dashboard** — View platform analytics:
   - Total users (individual vs business breakdown)
   - Monthly income (subscription revenue)
   - User ratio charts (growth trends)
   - Recent activity feed
3. **User List** — Search/filter users:
   - Filter by role (individual/business/admin)
   - Filter by subscription status (active/expired/free trial)
   - Search by name/email/phone
   - Paginated list (20 per page)
4. **User Details** — View comprehensive user profile:
   - Personal info (name, email, phone, avatar)
   - Task statistics (created, completed, overdue)
   - Subscription history (plans, payments, renewals)
   - Activity timeline (logins, task actions, notifications)
5. **Subscription Plans** — Create/edit plans:
   - Plan name, type (individual/business), price
   - Billing period (monthly/annual)
   - Features list
   - Max users allowed
6. **Settings** — Update platform content:
   - About Us, Contact Us
   - Privacy Policy, Terms & Conditions

---

### 3.2 Teacher/Parent User Journey

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Login     │────▶│  Dashboard   │────▶│ Create Task   │────▶│ Task Monitor │
│  (Parent)   │     │  (Overview)  │     │  (3 Types)    │     │  (Status)    │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                                                                   │
                        ┌──────────────┐                          │
                        │   Settings   │◀──┐                      │
                        │ (Permissions)│   │                      │
                        └──────────────┘   │                      │
                               │           │                      │
                               ▼           │                      │
                        ┌──────────────┐   │                      │
                        │ Team Members │───┘                      │
                        │  (Manage)    │                          │
                        └──────────────┘                          │
                               │                                  │
                               ▼                                  │
                        ┌──────────────┐                          │
                        │ Subscription │                          │
                        │  (View Plan) │                          │
                        └──────────────┘◀─────────────────────────┘
```

**Journey Steps:**

1. **Login** — Parent enters credentials → JWT issued → Redirected to dashboard
2. **Dashboard** — View team overview:
   - Member cards (avatar, name, task completion %)
   - Task summaries (total, completed, overdue)
   - Live activity feed (recent completions, new tasks)
   - Quick assign (create task for member directly)
3. **Create Task** — Choose task type:
   - **Single Assignment:** Assign to one member
   - **Collaborative Task:** Assign to multiple members (each tracks own progress)
   - **Personal Task:** For parent themselves (not assigned to anyone)
4. **Task Monitoring** — Track progress:
   - Filter by status (Not Started, In Progress, Completed, My Tasks)
   - View activity charts (completion trends over time)
   - See per-member breakdown (who completed what)
5. **Team Members** — Manage team:
   - Add member (invite via email)
   - Edit member details
   - Remove member (soft delete relationship)
   - View member's tasks and progress
6. **Settings/Permissions** — Control access:
   - Toggle: Which secondary users can create tasks?
   - Toggle: Which secondary users can assign tasks to others?
   - Toggle: Which secondary users can view other members' tasks?
7. **Subscription** — View current plan:
   - Plan name, price, renewal date
   - Usage (X of 5 users active)
   - Upgrade/downgrade options

---

### 3.3 App User Journey (With Permission — Secondary User)

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Login     │────▶│    Home      │────▶│  Add Task     │────▶│    Status    │
│  (Child)    │     │  (Task List) │     │ (Permission)  │     │ (Subtasks)   │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                                                                   │
                        ┌──────────────┐                          │
                        │   Profile    │◀─────────────────────────┘
                        │ (Settings)   │
                        └──────────────┘
```

**Journey Steps:**

1. **Login** — Child enters credentials → JWT issued → Redirected to home
2. **Home** — View daily tasks:
   - Task list (title, description, due date, status)
   - Daily progress bar (completed / total)
   - Support mode selector (Calm/Encouraging/Logical)
   - Quick filters (Pending, In Progress, Completed)
3. **Add Task** — Create tasks (permission-based):
   - **With Permission:** Can create Single/Collaborative/Personal tasks
   - **Without Permission:** Can only create Personal tasks
   - Task details: title, description, due date, priority, subtasks, attachments
4. **Status** — View tasks by status:
   - Pending (not started)
   - In Progress (started, not completed)
   - Completed (finished)
   - Subtask tracking (checklist progress)
5. **Profile** — Personal settings:
   - Name, email, phone, avatar
   - Support mode: Calm/Encouraging/Logical
   - Notification style: Push/Email/In-app preferences

---

### 3.4 App User Journey (Without Permission — Regular Child)

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Login     │────▶│    Home      │────▶│  Add Task     │────▶│    Status    │
│  (Child)    │     │  (Task List) │     │ (Personal Only)│    │ (Subtasks)   │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                                                                   │
                        ┌──────────────┐                          │
                        │   Profile    │◀─────────────────────────┘
                        │ (Settings)   │
                        └──────────────┘
```

**Journey Steps:**

1. **Login** — Same as above
2. **Home** — Same as above
3. **Add Task** — Limited to Personal tasks only:
   - Cannot assign to others
   - Cannot create collaborative tasks
   - Only for self-management
4. **Status** — Same as above
5. **Profile** — Same as above

---

## 4. Feature Specifications — Admin Dashboard

### 4.1 Dashboard Section

**Figma Reference:** `figma-asset/main-admin-dashboard/dashboard-section-flow.png`

**Purpose:** Provide platform-wide analytics at a glance.

**Data Points:**

| Widget | Data Source | Update Frequency | Cache TTL |
|--------|-------------|------------------|-----------|
| Total Users | `User.countDocuments({ isDeleted: false })` | Real-time | 2 min |
| Monthly Income | `Payment.aggregate([{ $match: currentMonth }, { $group: { $sum: amount } }])` | Real-time | 5 min |
| User Ratio Chart | `User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])` | Real-time | 5 min |
| New Users (This Month) | `User.countDocuments({ createdAt: { $gte: monthStart } })` | Real-time | 2 min |
| Active Subscriptions | `UserSubscription.countDocuments({ status: 'active' })` | Real-time | 5 min |
| Revenue Trend (6 months) | `Payment.aggregate([{ $match: last6Months }, { $group: { _id: '$month', total: { $sum: '$amount' } } }])` | Real-time | 10 min |

**API Endpoint:**
```
GET /analytics/admin/overview
Auth: admin only
Response: {
  totalUsers: { individual: 1200, business: 350, admin: 5 },
  monthlyIncome: { current: 15980.50, previous: 14200.00, growth: 12.5 },
  userRatio: { labels: ['Individual', 'Business', 'Admin'], data: [1200, 350, 5] },
  newUsersThisMonth: 85,
  activeSubscriptions: 1450,
  revenueTrend: [12000, 12800, 13200, 13900, 14200, 15980]
}
```

**Performance Requirements:**
- Target response time: < 200ms (cached)
- Heavy aggregation (>10K records) → BullMQ job, return 202 Accepted + jobId
- Cache keys: `admin:dashboard:overview`, `admin:dashboard:revenue`

---

### 4.2 User List Section

**Figma Reference:** `figma-asset/main-admin-dashboard/user-list-flow.png`

**Purpose:** Browse, search, and filter all users on the platform.

**Features:**

| Feature | Description | Backend Support |
|---------|-------------|-----------------|
| User Table | Paginated list (20 per page) showing name, email, role, subscription status | `GET /users/paginate` with aggregation |
| Search | Search by name, email, phone | Text index on User collection |
| Filter by Role | Individual, Business, Admin | Query filter: `{ role: 'individual' }` |
| Filter by Subscription | Active, Expired, Free Trial, None | Query filter: `{ subscriptionStatus: 'active' }` |
| Sort | By name, email, created date, subscription expiry | Sort options passed to pagination |
| Bulk Actions | Select multiple users → Export, Suspend, Delete | BullMQ job for bulk operations |

**API Endpoints:**
```
GET /users/paginate?page=1&limit=20&role=individual&subscription=active&search=john&sortBy=-createdAt
Auth: admin only
Response: Paginated user list

GET /users/export?role=individual&subscription=active
Auth: admin only
Response: 202 Accepted + { jobId: 'abc123' }
→ BullMQ job exports to CSV → Download link via notification
```

**Performance Requirements:**
- Pagination: < 200ms
- Export (large dataset): 202 Accepted → BullMQ → Complete within 30 seconds
- Cache: `admin:users:list:{filters_hash}` — TTL: 2 min

---

### 4.3 Get User Details Section

**Figma Reference:** `figma-asset/main-admin-dashboard/get-user-details-flow.png`

**Purpose:** View comprehensive user profile for administrative oversight.

**Data Displayed:**

| Section | Data | API Source |
|---------|------|------------|
| Personal Info | Name, email, phone, avatar, role | `GET /users/:id` |
| Task Statistics | Tasks created, completed, overdue, avg completion time | `GET /analytics/users/:id/tasks` |
| Subscription History | Current plan, past plans, payment history | `GET /user-subscriptions/user/:id` |
| Activity Timeline | Logins, task actions, notifications sent | `GET /analytics/users/:id/activity` |
| Team Members (if business) | Children/team members under this user | `GET /children-business-users/parent/:id` |

**API Endpoint:**
```
GET /users/:id/details
Auth: admin only
Response: {
  user: { /* full user object */ },
  taskStats: {
    created: 150,
    completed: 120,
    overdue: 10,
    completionRate: 80,
    avgCompletionTime: '2.5 days'
  },
  subscription: {
    currentPlan: 'Group Plan',
    status: 'active',
    renewalDate: '2026-05-08',
    paymentHistory: [ /* last 10 payments */ ]
  },
  activityTimeline: [
    { action: 'login', timestamp: '2026-04-08T10:00:00Z' },
    { action: 'task_completed', taskId: 'abc123', timestamp: '2026-04-08T09:30:00Z' },
    // ... last 50 activities
  ],
  teamMembers: [ /* if business user */ ]
}
```

**Performance Requirements:**
- Target: < 300ms (aggregates multiple collections)
- Cache: `admin:user:{userId}:details` — TTL: 5 min
- Cache invalidation: On user update, task completion, subscription change

---

### 4.4 Subscription Plans Section

**Figma Reference:** `figma-asset/main-admin-dashboard/subscription-flow.png`

**Purpose:** Create and manage subscription plans available to users.

**Features:**

| Feature | Description | Backend Support |
|---------|-------------|-----------------|
| Plan List | All active/inactive plans | `GET /subscription-plans/paginate` |
| Create Plan | Define new plan | `POST /subscription-plans` |
| Edit Plan | Update plan details | `PUT /subscription-plans/:id` |
| Toggle Status | Activate/deactivate plan | `PUT /subscription-plans/:id/status` |
| View Plan Details | Features, pricing, user limits | `GET /subscription-plans/:id` |

**Plan Schema:**
```typescript
{
  name: string,                    // "Individual Plan", "Group Plan"
  type: 'individual' | 'business_starter' | 'business_level1' | 'business_level2',
  price: number,                   // 10.99, 29.99
  billingPeriod: 'monthly' | 'annual',
  annualDiscount: number,          // 20% off for annual
  features: string[],              // List of features included
  maxUsers: number,                // 1 for individual, 5 for group
  trialDays: number,               // 7 days free trial
  stripePriceId: string,           // Stripe Price object ID
  revenueCatProductId: string,     // RevenueCat Product ID
  isActive: boolean,
  sortOrder: number,               // Display order in UI
  createdAt: Date,
  updatedAt: Date
}
```

**API Endpoints:**
```
POST /subscription-plans
Auth: admin only
Body: { name, type, price, billingPeriod, features, maxUsers, trialDays }

GET /subscription-plans/paginate?page=1&limit=20&isActive=true
Auth: admin only
Response: Paginated plan list

PUT /subscription-plans/:id
Auth: admin only
Body: { /* fields to update */ }

PUT /subscription-plans/:id/status
Auth: admin only
Body: { isActive: false }
```

**Business Rules:**
- Cannot deactivate plan if users have active subscriptions to it
- Price changes only apply to new subscriptions (existing users keep current price)
- Stripe + RevenueCat products must be created when plan is created

---

### 4.5 Settings Section

**Figma Reference:** Admin dashboard settings screen

**Purpose:** Manage platform-wide static content.

**Fields:**
- About Us (rich text)
- Contact Us (email, phone, address)
- Privacy Policy (rich text)
- Terms & Conditions (rich text)

**API Endpoints:**
```
GET /settings
Auth: public (no auth required)
Response: { aboutUs, contactUs, privacyPolicy, termsAndConditions }

PUT /settings
Auth: admin only
Body: { /* fields to update */ }
```

**Pattern:** Singleton — uses `createOrUpdate` (only one document exists)

---

## 5. Feature Specifications — Teacher/Parent Dashboard

### 5.1 Dashboard Section

**Figma Reference:** `figma-asset/teacher-parent-dashboard/dashboard/`

**Purpose:** Provide parent with team overview at a glance.

**Widgets:**

| Widget | Data | Update Frequency | Cache TTL |
|--------|------|------------------|-----------|
| Member Cards | Avatar, name, task completion %, active tasks count | Real-time | 2 min |
| Task Summary | Total tasks, completed, overdue, completion rate | Real-time | 2 min |
| Live Activity Feed | Recent completions, new tasks, member joins | Real-time (Socket.IO) | No cache |
| Quick Assign | Dropdown: Select member → Create task | Static | 30 min |

**Member Card Data:**
```json
{
  "_userId": "abc123",
  "name": "John Doe",
  "avatar": "https://...",
  "role": "child",
  "isSecondaryUser": true,
  "taskCompletion": {
    "total": 25,
    "completed": 18,
    "overdue": 2,
    "percentage": 72
  },
  "activeTasks": 5,
  "lastActiveAt": "2026-04-08T09:30:00Z"
}
```

**API Endpoints:**
```
GET /analytics/group/dashboard
Auth: business (parent) only
Response: {
  memberCards: [ /* array above */ ],
  taskSummary: {
    total: 150,
    completed: 120,
    overdue: 10,
    completionRate: 80
  },
  liveActivityFeed: [
    {
      type: 'task_completed',
      userId: 'abc123',
      userName: 'John Doe',
      taskId: 'xyz789',
      taskTitle: 'Complete homework',
      timestamp: '2026-04-08T10:00:00Z'
    },
    // ... last 20 activities
  ]
}
```

**Performance Requirements:**
- Target: < 200ms (cached)
- Live activity feed: Socket.IO real-time (no caching)
- Cache: `parent:{parentId}:dashboard:overview` — TTL: 2 min

---

### 5.2 Task Monitoring Section

**Figma Reference:** `figma-asset/teacher-parent-dashboard/task-monitoring/`

**Purpose:** Track all team tasks with status filtering and activity visualization.

**Features:**

| Feature | Description | Backend Support |
|---------|-------------|-----------------|
| Task List | Paginated list of all team tasks | `GET /tasks/paginate?ownerUserId={parentId}` |
| Status Filters | Not Started, In Progress, Completed, My Tasks | Query filter: `{ status: 'pending' }` |
| Member Filter | Filter by team member | Query filter: `{ assignedUserIds: { $in: [userId] } }` |
| Date Filter | Filter by due date range | Query filter: `{ dueDate: { $gte, $lte } }` |
| Activity Charts | Task completion trends (daily/weekly/monthly) | `GET /analytics/tasks/monitoring` |
| Task Details | View task + subtasks + per-member progress | `GET /tasks/:id` with population |

**Status Breakdown:**
```json
{
  "notStarted": { count: 15, percentage: 30 },
  "inProgress": { count: 10, percentage: 20 },
  "completed": { count: 25, percentage: 50 },
  "myTasks": { count: 5 }  // Tasks created by parent (not assigned)
}
```

**API Endpoints:**
```
GET /tasks/paginate?status=pending&assignedUserId=abc123&from=2026-04-01&to=2026-04-30&page=1&limit=20
Auth: business (parent) only
Response: Paginated task list with subtasks + progress

GET /analytics/tasks/monitoring?group=daily&from=2026-04-01&to=2026-04-08
Auth: business (parent) only
Response: {
  labels: ['Apr 1', 'Apr 2', 'Apr 3', ...],
  completed: [5, 8, 3, 6, 10, 7, 4],
  created: [6, 5, 4, 7, 8, 5, 6]
}
```

**Performance Requirements:**
- Task list pagination: < 200ms
- Activity charts: < 300ms (aggregation query)
- Cache: `parent:{parentId}:tasks:{filters_hash}` — TTL: 2 min

---

### 5.3 Create Task Section

**Figma Reference:** Task creation flow in Teacher/Parent Dashboard

**Purpose:** Create tasks for team members with three assignment types.

**Task Types:**

| Type | Description | assignedUserIds | Visibility |
|------|-------------|-----------------|------------|
| **Personal Task** | For parent themselves | Empty array or null | Only parent sees it |
| **Single Assignment** | Assigned to one member | `[childUserId]` | Parent + assigned child |
| **Collaborative Task** | Assigned to multiple members | `[child1, child2, ...]` | Parent + all assigned children (each tracks own progress) |

**Task Schema (Creation):**
```json
{
  "title": "Complete math homework",
  "description": "Chapter 5, exercises 1-10",
  "taskType": "collaborative",
  "assignedUserIds": ["child1", "child2"],
  "dueDate": "2026-04-10T23:59:59Z",
  "priority": "high",
  "subtasks": [
    { "title": "Read chapter 5", "sortOrder": 1 },
    { "title": "Solve exercises 1-5", "sortOrder": 2 },
    { "title": "Solve exercises 6-10", "sortOrder": 3 }
  ],
  "attachments": [ /* optional */ ],
  "reminder": {
    "enabled": true,
    "remindAt": "2026-04-10T09:00:00Z"
  }
}
```

**API Endpoint:**
```
POST /tasks
Auth: business (parent) or child (with permission)
Body: Task schema above
Response: Created task with subtasks + TaskProgress records (for collaborative)
```

**Business Logic:**
1. Create Task record
2. Create SubTask records (if subtasks provided)
3. If Collaborative → Create TaskProgress records for each assigned user
4. If Reminder enabled → Add to `taskRemindersQueue` (BullMQ)
5. Send notification to assigned users (BullMQ → `notificationQueue`)
6. Invalidate cache: `parent:{parentId}:tasks:list`, `child:{childId}:tasks:list`

**Performance Requirements:**
- Target: < 500ms (write operation)
- If > 50 assigned users → 202 Accepted → BullMQ job
- Cache invalidation: Immediate

---

### 5.4 Team Members Section

**Figma Reference:** `figma-asset/teacher-parent-dashboard/team-members/`

**Purpose:** Add, edit, remove team members and view their details.

**Features:**

| Feature | Description | Backend Support |
|---------|-------------|-----------------|
| Member List | All team members under this parent | `GET /children-business-users/parent/:parentId` |
| Add Member | Invite via email | `POST /children-business-users` (creates invitation) |
| Edit Member | Update name, avatar, permissions | `PUT /children-business-users/:id` |
| Remove Member | Soft delete relationship | `DELETE /children-business-users/:id` |
| View Details | Member's tasks, progress, activity | `GET /children-business-users/:id/details` |
| Permission Toggle | Grant/revoke task creation rights | `PUT /children-business-users/:id/permissions` |

**Member Schema:**
```json
{
  "_childrenBusinessUserId": "abc123",
  "childUserId": {
    "_userId": "child123",
    "name": "John Doe",
    "avatar": "https://...",
    "email": "john@example.com"
  },
  "status": "active",
  "isSecondaryUser": true,
  "permissions": {
    "canCreateTask": true,
    "canAssignTask": false,
    "canViewOtherTasks": false
  },
  "invitedAt": "2026-03-01T10:00:00Z",
  "acceptedAt": "2026-03-01T12:00:00Z"
}
```

**API Endpoints:**
```
POST /children-business-users
Auth: business (parent) only
Body: { childEmail: 'john@example.com', isSecondaryUser: false }
Response: Invitation sent (or error if user not found)

PUT /children-business-users/:id/permissions
Auth: business (parent) only
Body: { canCreateTask: true, canAssignTask: false, canViewOtherTasks: false }
Response: Updated permissions

DELETE /children-business-users/:id
Auth: business (parent) only
Response: Soft deleted (isDeleted: true)
```

**Business Rules:**
- Only ONE secondary user per parent (isSecondaryUser: true)
- Invitation flow: If email not registered, create pending invitation
- When child accepts invitation → Create ChildrenBusinessUser record
- Removing member doesn't delete their tasks (tasks remain, assignedUserIds updated)

**Performance Requirements:**
- Member list: < 200ms
- Permission update: < 300ms
- Cache: `parent:{parentId}:team:members` — TTL: 15 min

---

### 5.5 Settings/Permissions Section

**Figma Reference:** `figma-asset/teacher-parent-dashboard/settings-permission-section/`

**Purpose:** Control which secondary users can create/assign tasks.

**Permission Matrix:**

| Secondary User | canCreateTask | canAssignTask | canViewOtherTasks |
|----------------|---------------|---------------|-------------------|
| Secondary User 1 | ✅ | ❌ | ❌ |
| Secondary User 2 | ❌ | ❌ | ❌ |
| Secondary User 3 | ✅ | ✅ | ✅ |

**Rules:**
- Only ONE user can be "Secondary User" (isSecondaryUser: true) at a time
- Secondary user gets elevated permissions (configurable by parent)
- Non-secondary users can only view/complete their own tasks

**API Endpoint:**
```
PUT /children-business-users/:id/permissions
Auth: business (parent) only
Body: {
  isSecondaryUser: true,  // This will demote previous secondary user
  permissions: {
    canCreateTask: true,
    canAssignTask: true,
    canViewOtherTasks: true
  }
}
```

**Business Logic:**
1. If setting `isSecondaryUser: true`:
   - Find existing secondary user for this parent → Demote (isSecondaryUser: false)
   - Set permissions for new secondary user
2. Send notification to affected users (permission changed)
3. Invalidate cache: `child:{childId}:permissions`

---

### 5.6 Subscription Section

**Figma Reference:** `figma-asset/teacher-parent-dashboard/subscription/`

**Purpose:** View current subscription plan and manage upgrades/downgrades.

**Data Displayed:**

| Field | Description |
|-------|-------------|
| Current Plan | Group Plan ($29.99/mo) |
| Status | Active / Expired / Cancelled |
| Renewal Date | Next billing date |
| Usage | 3 of 5 users active |
| Payment History | Last 10 transactions |
| Upgrade Options | Business Level 1 ($49.99/mo — 10 users) |
| Downgrade Options | Individual ($10.99/mo — 1 user) |

**API Endpoints:**
```
GET /user-subscriptions/me
Auth: business (parent) only
Response: {
  currentPlan: {
    name: 'Group Plan',
    type: 'business_starter',
    price: 29.99,
    billingPeriod: 'monthly',
    maxUsers: 5
  },
  status: 'active',
  renewalDate: '2026-05-08',
  usage: { active: 3, max: 5 },
  paymentHistory: [ /* last 10 transactions */ ],
  availableUpgrades: [
    { name: 'Business Level 1', price: 49.99, maxUsers: 10 }
  ],
  availableDowngrades: [
    { name: 'Individual', price: 10.99, maxUsers: 1 }
  ]
}
```

**Business Rules:**
- Upgrade: Immediate effect, prorate remaining balance
- Downgrade: Effective at next billing cycle (no proration)
- Cancel: Access until end of current billing period
- Exceed user limit: Prompt upgrade (block adding new members)

---

## 6. Feature Specifications — Mobile App (App Users)

### 6.1 Home Screen

**Figma Reference:** 
- `figma-asset/app-user/individual-user/home-flow.png`
- `figma-asset/app-user/group-children-user/home-flow.png`

**Purpose:** Display daily tasks and progress for the logged-in child.

**Components:**

| Component | Description | Data Source |
|-----------|-------------|-------------|
| Task List | Paginated list of tasks (title, description, due date, status) | `GET /tasks/paginate?assignedUserId={childId}` |
| Daily Progress | Progress bar (completed / total for today) | Aggregation from task list |
| Support Mode Selector | Calm/Encouraging/Logical (affects motivational messages) | `GET /users/me/profile` → `supportMode` field |
| Quick Filters | Pending, In Progress, Completed | Query filter: `{ status: 'pending' }` |
| Pull to Refresh | Refresh task list | Cache invalidation + refetch |

**Task Card:**
```json
{
  "_taskId": "abc123",
  "title": "Complete math homework",
  "description": "Chapter 5, exercises 1-10",
  "status": "in_progress",
  "dueDate": "2026-04-10T23:59:59Z",
  "priority": "high",
  "taskType": "collaborative",
  "createdBy": {
    "name": "Parent Name",
    "avatar": "https://..."
  },
  "subtaskProgress": {
    "completed": 2,
    "total": 3
  },
  "myProgress": {
    "status": "in_progress",
    "startedAt": "2026-04-08T09:00:00Z"
  }
}
```

**API Endpoints:**
```
GET /tasks/paginate?assignedUserId={childId}&status=pending&page=1&limit=20&sortBy=dueDate
Auth: child (individual) only
Response: Paginated task list with subtask progress + daily progress summary
```

**Support Mode Behavior:**

| Mode | Motivational Style | Example Message |
|------|-------------------|-----------------|
| **Calm** | Gentle, non-pressuring | "Take your time, you're doing great" |
| **Encouraging** | Enthusiastic, positive | "You're almost there! Keep going! 🎉" |
| **Logical** | Fact-based, structured | "2 of 3 subtasks complete. 1 remaining." |

**Backend Support:**
- Support mode stored in `UserProfile.supportMode`
- Motivational messages generated server-side (based on mode + task progress)
- Messages included in task list response or separate endpoint

**Performance Requirements:**
- Target: < 200ms (cached)
- Cache: `child:{childId}:tasks:home` — TTL: 2 min
- Pull to refresh: Cache invalidation + refetch

---

### 6.2 Add Task Screen

**Figma Reference:**
- `figma-asset/app-user/individual-user/add-task-flow.png`
- `figma-asset/app-user/group-children-user/add-task-flow-for-permission-account-interface.png`

**Purpose:** Allow child to create tasks (permission-based).

**Permission-Based UI:**

| Permission Level | Task Types Available | UI Behavior |
|------------------|---------------------|-------------|
| **No Permission** | Personal only | Show only "Personal Task" option |
| **With Permission** | Personal + Single + Collaborative | Show all 3 options |

**Task Creation Flow:**

1. **Check Permission:**
   ```
   GET /children-business-users/me/permissions
   Response: { canCreateTask: true, canAssignTask: false }
   ```

2. **Select Task Type:**
   - Personal (always available)
   - Single Assignment (if `canCreateTask: true`)
   - Collaborative (if `canCreateTask: true`)

3. **Fill Task Details:**
   - Title (required)
   - Description (optional)
   - Due date (optional)
   - Priority (low/medium/high)
   - Subtasks (optional, add multiple)
   - Attachments (optional, upload to Cloudinary)

4. **Assign (if Single/Collaborative):**
   - Select team member(s) from dropdown
   - Only members under same parent visible

5. **Submit:**
   ```
   POST /tasks
   Body: { /* task schema */ }
   Response: Created task
   ```

**Permission Check Middleware:**
```typescript
// In route handler
router.post('/tasks',
  auth(TRole.child),
  checkTaskCreationPermission,  // Custom middleware
  validateTaskCreation,         // Zod validation
  controller.create
);

// Middleware logic
async function checkTaskCreationPermission(req, res, next) {
  if (req.body.taskType !== 'personal') {
    const permissions = await getPermissionsForUser(req.userId);
    if (!permissions.canCreateTask) {
      throw new ForbiddenError('You do not have permission to create tasks for others');
    }
  }
  next();
}
```

**Performance Requirements:**
- Permission check: < 100ms (cached)
- Task creation: < 500ms
- Cache invalidation: `parent:{parentId}:tasks:list`, `child:{childId}:tasks:home`

---

### 6.3 Status Screen

**Figma Reference:** Status flow in mobile app

**Purpose:** View tasks by status with subtask tracking.

**Status Filters:**
- Pending (not started)
- In Progress (started, not completed)
- Completed (finished)

**Subtask Tracking:**
```
Task: Complete math homework
├── ✅ Read chapter 5 (completed)
├── ✅ Solve exercises 1-5 (completed)
└── ⬜ Solve exercises 6-10 (pending)
```

**API Endpoints:**
```
GET /tasks/paginate?assignedUserId={childId}&status=in_progress&page=1&limit=20
Auth: child (individual) only
Response: Paginated task list with subtask details

PUT /tasks/:id/status
Auth: child (individual) only
Body: { status: 'completed' }
Response: Updated task

PUT /subtasks/:id/progress
Auth: child (individual) only
Body: { status: 'completed' }
Response: Updated subtask progress
```

**Business Logic:**
- When all subtasks completed → Auto-complete parent task
- When task completed → Update TaskProgress record
- Send notification to parent (task completed by child)
- Invalidate cache: `child:{childId}:tasks:home`, `parent:{parentId}:dashboard:overview`

---

### 6.4 Profile Screen

**Figma Reference:**
- `figma-asset/app-user/individual-user/profile.png`
- `figma-asset/app-user/group-children-user/profile-permission-account-interface.png`
- `figma-asset/app-user/group-children-user/profile-without-permission-interface.png`

**Purpose:** View/edit personal info and preferences.

**Sections:**

| Section | Fields | Editable |
|---------|--------|----------|
| Personal Info | Name, email, phone, avatar | Yes |
| Support Mode | Calm/Encouraging/Logical | Yes |
| Notification Style | Push/Email/In-app toggles | Yes |
| Permissions (read-only) | canCreateTask, canAssignTask, canViewOtherTasks | No (parent controls) |
| Subscription (read-only) | Current plan, renewal date | No (parent manages) |

**API Endpoints:**
```
GET /users/me/profile
Auth: child (individual) only
Response: {
  user: { name, email, phone, avatar },
  profile: {
    supportMode: 'encouraging',
    notificationStyle: {
      push: true,
      email: false,
      inApp: true
    }
  },
  permissions: {
    canCreateTask: true,
    canAssignTask: false,
    canViewOtherTasks: false
  },
  subscription: {
    planName: 'Group Plan',
    renewalDate: '2026-05-08'
  }
}

PUT /users/me/profile
Auth: child (individual) only
Body: { supportMode: 'logical' }
Response: Updated profile
```

**Business Logic:**
- Support mode change → Invalidates motivational messages cache
- Notification style change → Updates notification delivery preferences
- Permissions/Subscription: Read-only (managed by parent)

---

## 7. Permission & Access Control Model

### 7.1 Role Hierarchy

```
admin (highest)
  └── business (parent/teacher)
        └── child (group member)
              └── individual (standalone user, not in group)
```

### 7.2 Role Capabilities

| Capability | admin | business | child (secondary) | child (regular) | individual |
|------------|-------|----------|-------------------|-----------------|------------|
| View platform analytics | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage all users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage subscription plans | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create tasks for self | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create tasks for others | ✅ | ✅ | ✅ (if permitted) | ❌ | ❌ |
| Assign tasks to others | ✅ | ✅ | ✅ (if permitted) | ❌ | ❌ |
| View team members' tasks | ✅ | ✅ | ❌ (unless permitted) | ❌ | ❌ |
| Manage own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage team members | ❌ | ✅ | ❌ | ❌ | ❌ |
| Set permissions for children | ❌ | ✅ | ❌ | ❌ | ❌ |

### 7.3 Permission Flags (ChildrenBusinessUser Model)

```typescript
{
  isSecondaryUser: boolean,      // Only ONE per parent
  permissions: {
    canCreateTask: boolean,      // Can create tasks for others
    canAssignTask: boolean,      // Can assign tasks to team members
    canViewOtherTasks: boolean   // Can view other members' tasks
  }
}
```

### 7.4 Ownership Verification

**Middleware: `checkPermissionToManipulateModel`**

Logic:
1. Extract `userId` from JWT
2. Extract `resourceId` from request params
3. Query resource → Check `createdById` or `ownerUserId` matches `userId`
4. If match → Allow
5. If not → Check if user has admin/business role with override permissions
6. If no permissions → Return 403 Forbidden

---

## 8. Subscription & Monetization

### 8.1 Plan Structure

| Plan | Type | Price (Monthly) | Price (Annual) | Max Users | Free Trial |
|------|------|-----------------|----------------|-----------|------------|
| Individual | individual | $10.99 | $109.90 (save 17%) | 1 | 7 days |
| Group Plan | business_starter | $29.99 | $299.90 (save 17%) | 5 | 7 days |
| Business Level 1 | business_level1 | $49.99 | $499.90 (save 17%) | 10 | 7 days |
| Business Level 2 | business_level2 | $79.99 | $799.90 (save 17%) | 25 | 7 days |

### 8.2 Payment Flow

**Web (Stripe):**
1. User selects plan → Create Stripe Checkout Session
2. Redirect to Stripe Checkout
3. User completes payment
4. Stripe webhook → `/api/v1/stripe/webhook`
5. Create Payment + PaymentTransaction records
6. Create/Update UserSubscription
7. Send notification (email + in-app)

**Mobile (RevenueCat):**
1. User selects plan in app → RevenueCat handles purchase
2. RevenueCat webhook → `/api/v1/revenuecat-webhook`
3. Sync with backend (create/update UserSubscription)
4. Update `hasUsedFreeTrial` flag if first-time
5. Send notification

### 8.3 Subscription Lifecycle

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ Free Trial │────▶│  Active   │────▶│  Renewed  │────▶│  Active   │
│  (7 days)  │     │  (Paid)   │     │  (Auto)   │     │  (Paid)   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                       │
                       ▼
                ┌───────────┐     ┌───────────┐
                │  Expired  │────▶│ Cancelled │
                │ (Payment  │     │ (Manual)  │
                │  Failed)  │     └───────────┘
                └───────────┘
```

**Business Rules:**
- Free trial: One-time per user (tracked via `hasUsedFreeTrial` flag)
- Auto-renewal: Default ON, user can disable
- Payment failure: 3-day grace period → Expire subscription
- Cancellation: Access until end of billing period
- Upgrade: Immediate effect, prorate remaining balance
- Downgrade: Effective next billing cycle

---

## 9. Notification & Communication System

### 9.1 Notification Types

| Type | Trigger | Channel | Priority | Queue |
|------|---------|---------|----------|-------|
| Task Assigned | Parent creates task for child | In-app + Push | High | notificationQueue |
| Task Completed | Child completes task | In-app + Push (parent) | Medium | notificationQueue |
| Task Overdue | Task past due date, not completed | In-app + Email | High | notificationQueue |
| Task Reminder | Scheduled reminder before due date | In-app + Push | Medium | taskRemindersQueue |
| Permission Changed | Parent changes child's permissions | In-app | Low | notificationQueue |
| Subscription Renewed | Payment successful | Email + In-app | Medium | notificationQueue |
| Subscription Expired | Payment failed | Email + In-app | High | notificationQueue |
| Invitation Sent | Parent invites child | Email | Medium | notificationQueue |
| Invitation Accepted | Child accepts invitation | In-app + Push (parent) | Medium | notificationQueue |

### 9.2 Notification Schema

```typescript
{
  receiverId: ObjectId,
  senderId: ObjectId,
  title: string,
  message: string,
  type: NotificationType,
  channel: ('in-app' | 'email' | 'push' | 'sms')[],
  status: 'pending' | 'sent' | 'failed',
  scheduledAt?: Date,
  sentAt?: Date,
  readAt?: Date,
  metadata: {
    taskId?: ObjectId,
    subscriptionId?: ObjectId,
    // ... contextual data
  }
}
```

### 9.3 Notification Delivery (BullMQ Worker)

**Flow:**
1. Job added to `notificationQueue`
2. Worker picks up job
3. Determine delivery channels (from user's notification preferences)
4. Send via each channel:
   - In-app: Socket.IO emit
   - Push: FCM send
   - Email: Nodemailer send
   - SMS: Twilio send (not active)
5. Update notification status
6. Log success/failure

**Retry Logic:**
- Attempts: 3
- Backoff: Exponential (2s, 4s, 8s)
- On final failure: Mark as failed, log error

---

## 10. Task Management Core Logic

### 10.1 Task Lifecycle

```
┌───────────┐     ┌─────────────┐     ┌───────────┐
│  Created  │────▶│ Not Started │────▶│ In Progress│
│           │     │  (Default)  │     │            │
└───────────┘     └─────────────┘     └───────────┘
                                             │
                                             ▼
                                      ┌───────────┐
                                      │ Completed │
                                      └───────────┘
```

**Status Transitions:**
- Created → Not Started (automatic)
- Not Started → In Progress (user action)
- In Progress → Completed (user action)
- In Progress → Not Started (revert, allowed)
- Completed → Not Started (revert, allowed with parent permission)

### 10.2 Collaborative Task Progress

**Per-User Tracking:**
```
Task: "Clean the house" (Collaborative, assigned to Child A + Child B)

Child A's Progress:
├── TaskProgress: In Progress
├── SubTask 1: "Clean kitchen" → Completed
├── SubTask 2: "Clean bathroom" → In Progress
└── SubTask 3: "Clean living room" → Not Started

Child B's Progress:
├── TaskProgress: Not Started
├── SubTask 1: "Clean kitchen" → Not Started
├── SubTask 2: "Clean bathroom" → Not Started
└── SubTask 3: "Clean living room" → Not Started
```

**Parent View:**
```
Task: "Clean the house"
├── Child A: In Progress (33% complete)
└── Child B: Not Started (0% complete)
Overall: 17% complete (1 of 6 subtasks done)
```

### 10.3 Task Completion Rules

- Task is "completed" when:
  - Personal task: User marks as completed
  - Single assignment: Assigned user marks as completed
  - Collaborative task: Each user's TaskProgress is independent
    - Task itself shows "completed" when ALL assigned users complete their progress

- Subtask auto-completion:
  - When all subtasks completed → Parent task auto-completed
  - Exception: Collaborative tasks — each user completes own subtasks independently

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (reads) | < 200ms (p95) | APM monitoring |
| API Response Time (writes) | < 500ms (p95) | APM monitoring |
| Heavy Operations | 202 Accepted → BullMQ → Complete within SLA | Queue monitoring |
| Database Query Time | < 100ms (p95) | MongoDB profiling |
| Cache Hit Rate | > 80% | Redis monitoring |
| Socket.IO Latency | < 50ms | Socket.IO monitoring |

### 11.2 Scalability

| Metric | Target | Strategy |
|--------|--------|----------|
| Concurrent Users | 100,000+ | Stateless app, horizontal scaling |
| Total Tasks | 10,000,000+ | Indexing, pagination, aggregation |
| Daily Active Users | 50,000+ | Redis caching, connection pooling |
| Notifications/Day | 500,000+ | BullMQ, FCM batching |

### 11.3 Reliability

| Metric | Target | Strategy |
|--------|--------|----------|
| Uptime | 99.9% | Health checks, monitoring, alerting |
| Data Loss | Zero | MongoDB replication, Redis persistence |
| Queue Job Failure | < 5% | Retry logic, dead letter queue |
| Payment Failure | < 2% | Retry logic, fallback gateways |

### 11.4 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT + Redis sessions, OAuth (Google/Apple) |
| Authorization | Role-based access, ownership verification |
| Input Validation | Zod (100% endpoint coverage) |
| NoSQL Injection | Sanitize inputs, validate filter objects |
| Rate Limiting | Redis-backed sliding window |
| HTTPS | TLS 1.2+ on all endpoints |
| Data Encryption | Passwords (bcrypt), PII (field-level — future) |
| Audit Logging | Structured JSON logs, correlation IDs |

### 11.5 Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| GDPR | ⚠️ Partial | Right to deletion implemented (soft delete) |
| COPPA (Children's Privacy) | ⚠️ Needs Review | Platform serves children — parental consent required |
| PCI DSS | ✅ Compliant | Stripe handles payment data (no raw card storage) |
| CCPA | ⚠️ Partial | Data export/deletion needs implementation |

---

## 12. Edge Cases & Error Handling

### 12.1 Authentication Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid credentials | Return 401, log attempt, rate limit |
| Expired JWT | Return 401, client should refresh token |
| Expired refresh token | Return 401, client should re-login |
| Refresh token reuse (replay attack) | Invalidate entire session, force re-login |
| Concurrent logins (multiple devices) | Allowed, each device gets unique session |
| FCM token expired | Remove from user's fcmTokens array |

### 12.2 Task Management Edge Cases

| Scenario | Handling |
|----------|----------|
| Task created with invalid assignedUserId | Return 400, validate user exists under same parent |
| Task due date in past | Allow (parent may be logging overdue task) |
| Subtask deleted after partial progress | Archive subtask progress (don't delete) |
| Collaborative task, one user completes | Mark that user's TaskProgress as completed, task remains active for others |
| Task assigned to removed team member | Keep task, assignedUserIds updated, TaskProgress archived |
| Bulk task status update (>100 tasks) | 202 Accepted → BullMQ job |

### 12.3 Subscription Edge Cases

| Scenario | Handling |
|----------|----------|
| Payment fails (insufficient funds) | 3-day grace period → Notify user → Expire subscription |
| User exceeds plan user limit | Prompt upgrade, block adding new members |
| Plan deactivated while users subscribed | Grandfather existing users, block new signups |
| Duplicate webhook from Stripe/RevenueCat | Idempotency check (transactionId), ignore duplicate |
| Subscription upgrade mid-billing cycle | Prorate remaining balance, immediate effect |
| Subscription downgrade | Effective next billing cycle, no proration |

### 12.4 Notification Edge Cases

| Scenario | Handling |
|----------|----------|
| FCM push notification fails | Retry 3 times → Fall back to email |
| User has no notification preferences | Use defaults (in-app: true, push: true, email: false) |
| Scheduled notification, user deleted before send | Cancel notification, remove from queue |
| Notification sent but not read | Mark as "sent" (not "read"), show in unread count |
| Duplicate notification (queue retry) | Idempotency check (notificationId), skip if already sent |

### 12.5 Permission Edge Cases

| Scenario | Handling |
|----------|----------|
| Parent revokes child's task creation permission | Child can no longer create tasks for others (existing tasks remain) |
| Secondary user changed to different child | Demote previous secondary user, promote new one, update permissions |
| Child removed from team | Soft delete ChildrenBusinessUser, child's tasks remain (not deleted) |
| Parent account deleted | All team members' relationships removed, children become individual users |

---

## 13. API Requirements Matrix

### 13.1 Admin Dashboard APIs

| Method | Endpoint | Auth | Description | Rate Limit |
|--------|----------|------|-------------|------------|
| GET | `/analytics/admin/overview` | admin | Platform analytics | 100/min |
| GET | `/users/paginate` | admin | User list with pagination | 100/min |
| GET | `/users/:id/details` | admin | User comprehensive details | 100/min |
| PUT | `/users/:id` | admin | Update user details | 100/min |
| POST | `/subscription-plans` | admin | Create subscription plan | 100/min |
| GET | `/subscription-plans/paginate` | admin | Plan list | 100/min |
| PUT | `/subscription-plans/:id` | admin | Update plan | 100/min |
| PUT | `/subscription-plans/:id/status` | admin | Toggle plan active/inactive | 100/min |
| GET | `/settings` | public | Platform settings | 30/min |
| PUT | `/settings` | admin | Update settings | 100/min |
| POST | `/users/export` | admin | Export users to CSV (async) | 10/min |

### 13.2 Teacher/Parent Dashboard APIs

| Method | Endpoint | Auth | Description | Rate Limit |
|--------|----------|------|-------------|------------|
| GET | `/analytics/group/dashboard` | business | Parent dashboard overview | 100/min |
| GET | `/tasks/paginate` | business | Team task list | 100/min |
| POST | `/tasks` | business | Create task | 100/min |
| GET | `/tasks/:id` | business | Task details with progress | 100/min |
| PUT | `/tasks/:id` | business | Update task | 100/min |
| PUT | `/tasks/:id/status` | business | Update task status | 100/min |
| DELETE | `/tasks/:id` | business | Soft delete task | 100/min |
| GET | `/analytics/tasks/monitoring` | business | Task activity charts | 100/min |
| GET | `/children-business-users/parent/:id` | business | Team member list | 100/min |
| POST | `/children-business-users` | business | Invite/add team member | 30/min |
| PUT | `/children-business-users/:id` | business | Update member details | 100/min |
| PUT | `/children-business-users/:id/permissions` | business | Update permissions | 30/min |
| DELETE | `/children-business-users/:id` | business | Remove member | 30/min |
| GET | `/user-subscriptions/me` | business | Current subscription details | 100/min |

### 13.3 Mobile App (App User) APIs

| Method | Endpoint | Auth | Description | Rate Limit |
|--------|----------|------|-------------|------------|
| GET | `/tasks/paginate` | child | My task list | 100/min |
| POST | `/tasks` | child | Create task (permission-based) | 100/min |
| GET | `/tasks/:id` | child | Task details | 100/min |
| PUT | `/tasks/:id/status` | child | Update my task status | 100/min |
| PUT | `/subtasks/:id/progress` | child | Update subtask progress | 100/min |
| GET | `/users/me/profile` | child | My profile | 100/min |
| PUT | `/users/me/profile` | child | Update profile (support mode) | 30/min |
| GET | `/children-business-users/me/permissions` | child | My permissions | 100/min |
| GET | `/notifications/paginate` | child | My notifications | 100/min |
| PUT | `/notifications/:id/read` | child | Mark notification as read | 100/min |

### 13.4 Shared APIs (All Roles)

| Method | Endpoint | Auth | Description | Rate Limit |
|--------|----------|------|-------------|------------|
| POST | `/auth/register` | public | Register new user | 5/min |
| POST | `/auth/login` | public | Login | 5/min |
| POST | `/auth/refresh-token` | public | Refresh JWT | 10/min |
| POST | `/auth/forgot-password` | public | Request password reset | 5/min |
| POST | `/auth/verify-otp` | public | Verify OTP | 10/min |
| POST | `/auth/reset-password` | public | Reset password | 5/min |
| POST | `/auth/google` | public | Google OAuth | 5/min |
| POST | `/auth/apple` | public | Apple Sign-In | 5/min |
| GET | `/health` | public | Health check | 30/min |
| POST | `/attachments/upload` | any | Upload file | 30/min |

---

## 14. Future Features (Out of Scope)

### 14.1 Chat/Messaging

**Status:** Backend module exists (`chatting.module`), but NOT in Figma

**Decision:** Archive or confirm with product team

**If Implemented:**
- Direct messaging between parent and children
- Group chat for team members
- File sharing in chat
- Read receipts, typing indicators

---

### 14.2 Advanced Analytics

**Status:** Partially implemented (basic analytics exist)

**Future Enhancements:**
- Predictive task completion time (ML-based)
- User behavior pattern analysis
- Engagement scoring
- Churn prediction
- Task difficulty estimation

---

### 14.3 Multi-Tenancy

**Status:** Single-tenant currently

**Future Enhancements:**
- Organization/workspace concept
- Cross-organization task sharing
- Organization-level admin role

---

### 14.4 Gamification

**Status:** Not implemented

**Future Enhancements:**
- Points/badges for task completion
- Leaderboards (team-wide, family-wide)
- Streaks (consecutive days completing tasks)
- Achievement milestones

---

### 14.5 Third-Party Integrations

**Status:** Not implemented

**Future Enhancements:**
- Google Calendar sync (tasks → calendar events)
- Slack/Discord notifications
- Zapier integration
- API for third-party developers

---

### 14.6 AI-Powered Features

**Status:** Not implemented

**Future Enhancements:**
- Auto-suggest task descriptions
- Smart task prioritization
- Natural language task creation
- AI motivational messages (personalized)

---

## 15. Glossary

| Term | Definition |
|------|------------|
| **Parent/Teacher** | Business user who manages team members and creates tasks |
| **Child/Group Member** | Individual user (child role) who receives/completes tasks |
| **Secondary User** | One child per parent with elevated permissions (task creation rights) |
| **Personal Task** | Task for self only (not assigned to anyone) |
| **Single Assignment** | Task assigned to one team member |
| **Collaborative Task** | Task assigned to multiple members, each tracks own progress |
| **Support Mode** | Motivational style (Calm/Encouraging/Logical) |
| **TaskProgress** | Per-user progress tracking on collaborative tasks |
| **SubTaskProgress** | Per-user progress tracking on subtasks |
| **Free Trial** | 7-day trial period before subscription required |
| **BullMQ** | Redis-backed job queue for async operations |
| **FCM** | Firebase Cloud Messaging (push notifications) |
| **RevenueCat** | Mobile app subscription management (iOS/Android) |
| **Stripe** | Web payment processing |

---

**Document Generated:** April 8, 2026  
**Next Step:** Generate `development-plan.md`  
**Status:** Awaiting permission to proceed ⏸️

---

**Appendix A: Figma Asset Mapping**

| Figma File | Screens | Mapped To PRD Section |
|------------|---------|----------------------|
| `main-admin-dashboard/dashboard-section-flow.png` | Analytics dashboard, user stats, revenue charts | Section 4.1 |
| `main-admin-dashboard/user-list-flow.png` | User list, search, filter, pagination | Section 4.2 |
| `main-admin-dashboard/get-user-details-flow.png` | User details, task stats, subscription history | Section 4.3 |
| `main-admin-dashboard/subscription-flow.png` | Subscription plan management | Section 4.4 |
| `teacher-parent-dashboard/dashboard/*` | Member cards, task summary, activity feed | Section 5.1 |
| `teacher-parent-dashboard/task-monitoring/*` | Task list, status filters, activity charts | Section 5.2 |
| `teacher-parent-dashboard/team-members/*` | Member management, invite, permissions | Section 5.4 |
| `teacher-parent-dashboard/settings-permission-section/*` | Permission toggles | Section 5.5 |
| `teacher-parent-dashboard/subscription/*` | Subscription details, upgrade/downgrade | Section 5.6 |
| `app-user/individual-user/home-flow.png` | Home screen, task list, progress | Section 6.1 |
| `app-user/individual-user/add-task-flow.png` | Task creation (individual) | Section 6.2 |
| `app-user/individual-user/profile*.png` | Profile settings, support mode | Section 6.4 |
| `app-user/group-children-user/home-flow.png` | Home screen (group member) | Section 6.1 |
| `app-user/group-children-user/add-task-flow-for-permission-account-interface.png` | Task creation (with permission) | Section 6.2 |
| `app-user/group-children-user/profile-permission-account-interface.png` | Profile (with permissions) | Section 6.4 |
| `app-user/group-children-user/profile-without-permission-interface.png` | Profile (without permissions) | Section 6.4 |
| `app-user/group-children-user/edit-update-task-flow.png` | Task editing | Section 6.3 |

---

**END OF DOCUMENT**
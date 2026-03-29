# 📊 Task & SubTask Tracking for Parent Dashboard

**Date**: 09-03-26  
**Purpose**: Explain how parents can track children's task completion

---

## 🎯 Requirements from Figma

Based on `figma-asset/teacher-parent-dashboard/`:

### **Parent Needs to Know:**

1. ✅ **Which children completed their part of collaborative task?**
2. ✅ **How many subtasks each child completed?**
3. ✅ **Overall task progress (X/Y subtasks completed)**
4. ✅ **Individual child's task completion history**
5. ✅ **Real-time activity feed (who completed what)**

---

## ✅ **What Already Exists**

### **1. Task Module - Progress Tracking**

```typescript
// src/modules/task.module/task/task.interface.ts
interface ITask {
  totalSubtasks: Number;        // ✅ Total subtasks
  completedSubtasks: Number;    // ✅ Completed count
  subtasks?: ISubTask[];        // ✅ Embedded subtasks
  
  // Auto-updated when subtask changes
  status: 'pending' | 'inProgress' | 'completed';
  completedTime?: Date;
}
```

**Existing Endpoints**:
```typescript
GET /tasks/statistics              // ✅ Task counts by status
GET /tasks/daily-progress          // ✅ Daily completion progress
GET /tasks/:id                     // ✅ Task details with subtasks
```

---

### **2. SubTask Module - Individual Tracking**

```typescript
// src/modules/task.module/subTask/subTask.interface.ts
interface ISubTask {
  _id: ObjectId;
  taskId: ObjectId;                 // ✅ Parent task
  assignedToUserId: ObjectId;       // ✅ Who is responsible
  isCompleted: Boolean;             // ✅ Completion status
  completedAt: Date;                // ✅ When completed
  title: String;
  duration: String;
}
```

**Existing Endpoints**:
```typescript
GET /subtasks?taskId=xxx           // ✅ All subtasks of a task
GET /subtasks/statistics           // ✅ Subtask completion stats
PUT /subtasks/:id/toggle           // ✅ Toggle completion
```

---

### **3. Analytics Module**

```typescript
// src/modules/analytics.module/taskAnalytics/taskAnalytics.service.ts
async getOverview(): Promise<ITaskOverviewAnalytics>
// ✅ Platform-wide task statistics
```

---

## ❌ **What's Missing**

### **Parent Needs These Endpoints:**

#### **1. Get Collaborative Task Progress with Child Details**

```typescript
GET /tasks/:id/collaborative-progress

Response:
{
  taskId: "...",
  title: "Clean the house",
  taskType: "collaborative",
  totalSubtasks: 3,
  completedSubtasks: 2,
  progressPercentage: 66.67,
  
  // ✅ WHO COMPLETED WHAT
  subtaskBreakdown: [
    {
      subtaskId: "...",
      title: "Clean living room",
      assignedTo: {
        _id: "child1Id",
        name: "John"
      },
      isCompleted: true,
      completedAt: "2026-03-09T10:00:00Z",
      duration: "30 min"
    },
    {
      subtaskId: "...",
      title: "Clean kitchen",
      assignedTo: {
        _id: "child2Id",
        name: "Jane"
      },
      isCompleted: true,
      completedAt: "2026-03-09T11:00:00Z",
      duration: "45 min"
    },
    {
      subtaskId: "...",
      title: "Clean bedrooms",
      assignedTo: {
        _id: "child3Id",
        name: "Bob"
      },
      isCompleted: false,
      completedAt: null,
      duration: "1 hour"
    }
  ],
  
  // ✅ SUMMARY BY CHILD
  completionByChild: [
    {
      childId: "child1Id",
      childName: "John",
      assignedSubtasks: 1,
      completedSubtasks: 1,
      completionRate: 100
    },
    {
      childId: "child2Id",
      childName: "Jane",
      assignedSubtasks: 1,
      completedSubtasks: 1,
      completionRate: 100
    },
    {
      childId: "child3Id",
      childName: "Bob",
      assignedSubtasks: 1,
      completedSubtasks: 0,
      completionRate: 0
    }
  ]
}
```

---

#### **2. Get Child's Task Completion History**

```typescript
GET /children/:id/task-history?range=7d

Response:
{
  childId: "child1Id",
  childName: "John",
  
  // ✅ SUMMARY
  summary: {
    totalTasksAssigned: 15,
    totalTasksCompleted: 12,
    completionRate: 80,
    totalSubtasksAssigned: 25,
    totalSubtasksCompleted: 20,
    subtaskCompletionRate: 80
  },
  
  // ✅ RECENT ACTIVITY
  recentActivity: [
    {
      taskId: "...",
      taskTitle: "Clean the house",
      subtaskId: "...",
      subtaskTitle: "Clean living room",
      completedAt: "2026-03-09T10:00:00Z",
      taskType: "collaborative"
    },
    {
      taskId: "...",
      taskTitle: "Homework",
      subtaskId: null,
      subtaskTitle: null,
      completedAt: "2026-03-08T15:00:00Z",
      taskType: "personal"
    }
  ],
  
  // ✅ DAILY BREAKDOWN (for chart)
  dailyCompletion: [
    { date: "2026-03-03", tasksCompleted: 2, subtasksCompleted: 3 },
    { date: "2026-03-04", tasksCompleted: 1, subtasksCompleted: 2 },
    { date: "2026-03-05", tasksCompleted: 3, subtasksCompleted: 4 },
    // ...
  ]
}
```

---

#### **3. Get All Children's Task Overview (Parent Dashboard)**

```typescript
GET /parent/my-children/task-overview

Response:
{
  // ✅ LIST OF ALL CHILDREN WITH THEIR TASK STATS
  children: [
    {
      childId: "child1Id",
      childName: "John",
      
      tasks: {
        total: 10,
        pending: 2,
      inProgress: 3,
        completed: 5,
        overdue: 1
      },
      
      subtasks: {
        total: 20,
        completed: 15,
        completionRate: 75
      },
      
      streak: {
        current: 5,  // 5 days in a row
        longest: 12
      },
      
      lastActive: "2026-03-09T10:00:00Z"
    },
    {
      childId: "child2Id",
      childName: "Jane",
      // ... same structure
    },
    {
      childId: "child3Id",
      childName: "Bob",
      // ... same structure
    }
  ],
  
  // ✅ AGGREGATE STATS
  overall: {
    totalChildren: 3,
    totalTasks: 30,
    totalCompleted: 20,
    overallCompletionRate: 66.67
  }
}
```

---

#### **4. Real-time Activity Feed**

```typescript
GET /parent/activity-feed?limit=20

Response:
{
  activities: [
    {
      _id: "...",
      type: "subtask_completed",
      timestamp: "2026-03-09T10:00:00Z",
      
      actor: {
        _id: "child1Id",
        name: "John",
        role: "child"
      },
      
      task: {
        _id: "taskId",
        title: "Clean the house",
        taskType: "collaborative"
      },
      
      subtask: {
        _id: "subtaskId",
        title: "Clean living room"
      },
      
      message: "John completed 'Clean living room' in 'Clean the house'"
    },
    {
      _id: "...",
      type: "task_completed",
      timestamp: "2026-03-09T09:00:00Z",
      
      actor: {
        _id: "child2Id",
        name: "Jane",
        role: "child"
      },
      
      task: {
        _id: "taskId",
        title: "Homework",
        taskType: "personal"
      },
      
      message: "Jane completed 'Homework'"
    }
  ]
}
```

---

## 🔧 **Implementation Plan**

### **Option 1: Add to Existing Modules** ✅ (Recommended)

**Add to task.module**:
```typescript
// src/modules/task.module/task/task.service.ts

/**
 * Get collaborative task progress with child breakdown
 */
async getCollaborativeTaskProgress(taskId: string, userId: string) {
  // 1. Get task with subtasks
  const task = await Task.findById(taskId)
    .populate('assignedUserIds', 'name email')
    .populate('createdById', 'name email');
  
  // 2. Get subtask breakdown
  const subtaskBreakdown = await SubTask.find({ taskId })
    .populate('assignedToUserId', 'name email profileImage')
    .sort({ order: 1 });
  
  // 3. Calculate completion by child
  const completionByChild = this.calculateCompletionByChild(subtaskBreakdown);
  
  return {
    taskId: task._id,
    title: task.title,
    totalSubtasks: task.totalSubtasks,
    completedSubtasks: task.completedSubtasks,
    progressPercentage: (task.completedSubtasks / task.totalSubtasks) * 100,
    subtaskBreakdown,
    completionByChild
  };
}

/**
 * Helper: Calculate completion stats by child
 */
private calculateCompletionByChild(subtasks: any[]) {
  const childStats = new Map();
  
  subtasks.forEach(subtask => {
    const childId = subtask.assignedToUserId._id.toString();
    
    if (!childStats.has(childId)) {
      childStats.set(childId, {
        childId,
        childName: subtask.assignedToUserId.name,
        assignedSubtasks: 0,
        completedSubtasks: 0,
      });
    }
    
    const stats = childStats.get(childId);
    stats.assignedSubtasks++;
    if (subtask.isCompleted) {
      stats.completedSubtasks++;
    }
  });
  
  // Calculate completion rate
  return Array.from(childStats.values()).map(stats => ({
    ...stats,
    completionRate: (stats.completedSubtasks / stats.assignedSubtasks) * 100
  }));
}
```

---

### **Option 2: Create New Child Analytics Module**

```
src/modules/childAnalytics.module/
├── childTaskAnalytics/
│   ├── childTaskAnalytics.service.ts
│   ├── childTaskAnalytics.controller.ts
│   └── childTaskAnalytics.route.ts
└── ...
```

**Better for**: Large-scale analytics, separate from task logic

---

## 🎯 **My Recommendation**

### **Use Option 1** (Add to task.module) ✅

**Why**:
- ✅ Simpler (no new module needed)
- ✅ Task service already has all the data
- ✅ Faster to implement
- ✅ Easier to maintain

### **Add These Endpoints to task.route.ts**:

```typescript
// src/modules/task.module/task/task.route.ts

/*-─────────────────────────────────
|  Parent | 01-XX | Get collaborative task progress
|  Role: Business User | Module: Task
|  Action: See which children completed their parts
|  Auth: Required
|  Figma: task-details-with-subTasks.png
└──────────────────────────────────*/
router.route('/:id/collaborative-progress').get(
  auth(TRole.commonUser),
  verifyTaskAccess,
  controller.getCollaborativeTaskProgress
);

/*-─────────────────────────────────
|  Parent | 01-XX | Get child's task history
|  Role: Business User | Module: Task
|  Action: See child's completion history
|  Auth: Required
|  Figma: team-member-flow-01.png
└──────────────────────────────────*/
router.route('/child/:childId/history').get(
  auth(TRole.commonUser),
  controller.getChildTaskHistory
);

/*-─────────────────────────────────
|  Parent | 01-XX | Get all children overview
|  Role: Business User | Module: Task
|  Action: Dashboard overview of all children
|  Auth: Required
|  Figma: dashboard-flow-01.png
└──────────────────────────────────*/
router.route('/parent/my-children/overview').get(
  auth(TRole.commonUser),
  controller.getChildrenOverview
);

/*-─────────────────────────────────
|  Parent | 01-XX | Get activity feed
|  Role: Business User | Module: Task
|  Action: Real-time activity of children
|  Auth: Required
|  Figma: dashboard-flow-01.png (activity feed)
└──────────────────────────────────*/
router.route('/parent/activity-feed').get(
  auth(TRole.commonUser),
  controller.getActivityFeed
);
```

---

## 📊 **Database Queries**

### **For Collaborative Task Progress**:

```typescript
// Aggregation pipeline for detailed breakdown
const pipeline = [
  {
    $match: {
      _id: new Types.ObjectId(taskId),
      isDeleted: false
    }
  },
  {
    $lookup: {
      from: 'subtasks',
      localField: '_id',
      foreignField: 'taskId',
      as: 'subtasks'
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'subtasks.assignedToUserId',
      foreignField: '_id',
      as: 'subtasks.assignedToUser'
    }
  },
  {
    $project: {
      title: 1,
      taskType: 1,
      totalSubtasks: 1,
      completedSubtasks: 1,
      subtasks: {
        _id: 1,
        title: 1,
        isCompleted: 1,
        completedAt: 1,
        duration: 1,
        assignedToUser: {
          _id: 1,
          name: 1,
          email: 1
        }
      }
    }
  }
];

const result = await Task.aggregate(pipeline);
```

---

## ✅ **Next Steps**

**Shall I implement these tracking endpoints?**

1. ✅ Add `getCollaborativeTaskProgress()` to task.service.ts
2. ✅ Add `getChildTaskHistory()` to task.service.ts
3. ✅ Add `getChildrenOverview()` to task.service.ts
4. ✅ Add `getActivityFeed()` to task.service.ts
5. ✅ Add corresponding routes
6. ✅ Add corresponding controllers
7. ✅ Update documentation

**This will give parents complete visibility into:**
- ✅ Which child completed what
- ✅ How many subtasks each child did
- ✅ Overall task progress
- ✅ Individual child performance
- ✅ Real-time activity feed

**Let me know if you want me to implement these!** 🚀

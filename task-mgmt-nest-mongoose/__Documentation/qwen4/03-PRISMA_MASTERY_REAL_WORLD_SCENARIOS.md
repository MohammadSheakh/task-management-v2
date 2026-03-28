# 📘 PRISMA MASTERY WITH NESTJS & EXPRESS.JS
## Volume 3: Real-World Project Scenarios

**Industry-Use Cases from Task Management Systems**

---

## 📖 TABLE OF CONTENTS

1. [Task Management System - Complete Implementation](#1-task-management-system)
2. [User Management & Authentication](#2-user-management--authentication)
3. [Collaborative Features & Permissions](#3-collaborative-features--permissions)
4. [Notification System](#4-notification-system)
5. [Analytics & Reporting Dashboard](#5-analytics--reporting-dashboard)
6. [File Attachments & Storage](#6-file-attachments--storage)
7. [Search & Filtering](#7-search--filtering)
8. [Data Export & Import](#8-data-export--import)
9. [Background Jobs & Queues](#9-background-jobs--queues)
10. [API Versioning & Migration](#10-api-versioning--migration)

---

## 1. TASK MANAGEMENT SYSTEM

### 1.1 Complete Task Creation Flow

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Create Task with Subtasks & Assignments
// ─────────────────────────────────────────────────────────────
interface CreateTaskDTO {
  title: string;
  description: string;
  taskType: 'PERSONAL' | 'SINGLE_ASSIGNMENT' | 'COLLABORATIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startTime: Date;
  dueDate?: Date;
  assignedUserIds?: string[];
  subtasks?: Array<{
    title: string;
    duration?: number;
  }>;
  reminders?: Array<{
    type: 'EMAIL' | 'PUSH';
    time: Date;
  }>;
}

class TaskService {
  async createTask(userId: string, data: CreateTaskDTO) {
    return prisma.$transaction(async (tx) => {
      // 1. Create task
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          taskType: data.taskType,
          priority: data.priority,
          startTime: data.startTime,
          dueDate: data.dueDate,
          createdById: userId,
          // Auto-set owner for personal tasks
          ownerId: data.taskType === 'PERSONAL' ? userId : null,
        },
      });

      // 2. Assign users (if collaborative or single assignment)
      if (data.assignedUserIds?.length && data.taskType !== 'PERSONAL') {
        await tx.task.update({
          where: { id: task.id },
          data: {
            assignedUsers: {
              connect: data.assignedUserIds.map(id => ({ id })),
            },
          },
        });

        // 3. Create TaskProgress for each assigned user (collaborative only)
        if (data.taskType === 'COLLABORATIVE') {
          await tx.taskProgress.createMany({
            data: data.assignedUserIds.map(userId => ({
              taskId: task.id,
              userId,
              status: 'NOT_STARTED',
              progressPercentage: 0,
            })),
          });
        }
      }

      // 4. Create subtasks
      if (data.subtasks?.length) {
        await tx.subTask.createMany({
          data: data.subtasks.map((st, index) => ({
            taskId: task.id,
            title: st.title,
            order: index + 1,
            duration: st.duration,
          })),
        });
      }

      // 5. Create activity log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'TASK_CREATED',
          taskId: task.id,
          metadata: {
            title: task.title,
            taskType: task.taskType,
          },
        },
      });

      // 6. Send notifications (if assigned)
      if (data.assignedUserIds?.length) {
        await tx.notification.createMany({
          data: data.assignedUserIds.map(assigneeId => ({
            userId: assigneeId,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assigned',
            message: `You've been assigned to: ${task.title}`,
            taskId: task.id,
          })),
        });
      }

      return task;
    });
  }
}
```

### 1.2 Task Update with Optimistic Locking

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Update Task with Version Control
// ─────────────────────────────────────────────────────────────
interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  version: number; // Optimistic locking version
}

async function updateTaskWithLock(
  taskId: string,
  userId: string,
  data: UpdateTaskDTO
) {
  try {
    const updated = await prisma.task.update({
      where: {
        id: taskId,
        // Optimistic locking check
        version: data.version,
      },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        version: { increment: 1 },
        // Auto-set completedAt when status changes to COMPLETED
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // Log the update
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'TASK_UPDATED',
        taskId,
        metadata: {
          changes: Object.keys(data).filter(k => k !== 'version'),
        },
      },
    });

    return updated;
  } catch (error) {
    if (error.code === 'P2024') {
      throw new ConflictException(
        'Task was modified by another user. Please refresh and try again.'
      );
    }
    throw error;
  }
}
```

### 1.3 Task Dashboard Query

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Parent Dashboard - Get All Children's Tasks
// ─────────────────────────────────────────────────────────────
interface DashboardFilters {
  status?: 'all' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  taskType?: 'children' | 'personal';
  page?: number;
  limit?: number;
  sortBy?: string;
}

async function getTaskDashboard(
  businessUserId: string,
  filters: DashboardFilters
) {
  const {
    status = 'all',
    taskType = 'children',
    page = 1,
    limit = 20,
    sortBy = '-startTime',
  } = filters;

  // 1. Get all children for this business user
  const children = await prisma.childrenBusinessUser.findMany({
    where: {
      parentBusinessUserId: businessUserId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      childUserId: true,
    },
  });

  const childUserIds = children.map(c => c.childUserId);

  // 2. Build query based on taskType
  let whereClause: any = { deletedAt: null };

  if (taskType === 'personal') {
    // Parent's personal tasks
    whereClause = {
      ...whereClause,
      ownerId: businessUserId,
      taskType: 'PERSONAL',
    };
  } else {
    // Children's tasks
    whereClause.assignedUserIds = {
      in: childUserIds,
    };
  }

  // 3. Apply status filter
  if (status !== 'all') {
    whereClause.status = status;
  }

  // 4. Execute paginated query
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedUsers: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            // Include progress for collaborative tasks
            taskProgress: {
              where: { deletedAt: null },
              select: {
                status: true,
                progressPercentage: true,
                completedSubtaskCount: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subtasks: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            subtasks: true,
          },
        },
      },
      orderBy: {
        [sortBy.replace('-', '')]: sortBy.startsWith('-') ? 'desc' : 'asc',
      },
    }),
    prisma.task.count({
      where: whereClause,
    }),
  ]);

  // 5. Get status counts for dashboard tabs
  const statusCounts = await prisma.task.groupBy({
    by: ['status'],
    where: whereClause,
    _count: true,
  });

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      status,
      taskType,
    },
    counts: {
      total,
      byStatus: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}
```

---

## 2. USER MANAGEMENT & AUTHENTICATION

### 2.1 User Registration with Profile

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Complete User Registration Flow
// ─────────────────────────────────────────────────────────────
interface RegisterUserDTO {
  email: string;
  password: string;
  role: 'USER' | 'BUSINESS';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

async function registerUser(data: RegisterUserDTO) {
  return prisma.$transaction(async (tx) => {
    // 1. Check if email exists
    const existing = await tx.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3. Create user with profile
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: data.role,
        status: 'PENDING', // Require email verification
        profile: {
          create: {
            firstName: data.profile.firstName,
            lastName: data.profile.lastName,
            phone: data.profile.phone,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // 4. Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await tx.verificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // 5. Send verification email (queue this in production)
    await sendVerificationEmail(user.email, verificationToken);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}
```

### 2.2 User with Task Statistics

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Get User Profile with Task Analytics
// ─────────────────────────────────────────────────────────────
async function getUserWithAnalytics(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          avatarUrl: true,
          bio: true,
        },
      },
      // Task statistics via aggregation
      tasks: {
        select: {
          status: true,
          priority: true,
          createdAt: true,
        },
        where: {
          deletedAt: null,
        },
      },
      // Count assigned tasks
      assignedTasks: {
        where: { deletedAt: null },
        _count: true,
      },
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Calculate statistics
  const stats = {
    totalTasks: user.tasks.length,
    byStatus: user.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byPriority: user.tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    completionRate: user.tasks.length > 0
      ? Math.round(
          (user.tasks.filter(t => t.status === 'COMPLETED').length / user.tasks.length) * 100
        )
      : 0,
  };

  // Remove tasks array from response
  const { tasks, ...userWithoutTasks } = user;

  return {
    ...userWithoutTasks,
    statistics: stats,
  };
}
```

---

## 3. COLLABORATIVE FEATURES & PERMISSIONS

### 3.1 Permission Checking Middleware

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Check Task Access Permission
// ─────────────────────────────────────────────────────────────
enum Permission {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  ASSIGN = 'ASSIGN',
}

async function checkTaskPermission(
  userId: string,
  taskId: string,
  requiredPermission: Permission
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      createdById: true,
      ownerId: true,
      taskType: true,
      assignedUsers: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!task) {
    throw new NotFoundException('Task not found');
  }

  // Owner/Creator has all permissions
  if (task.createdById === userId || task.ownerId === userId) {
    return true;
  }

  // Check assigned users
  const isAssigned = task.assignedUsers.some(u => u.id === userId);

  if (!isAssigned) {
    throw new ForbiddenException('Access denied');
  }

  // Permission matrix based on task type
  switch (requiredPermission) {
    case Permission.VIEW:
      return true; // All assigned users can view

    case Permission.EDIT:
      // Only creator can edit task details
      return task.createdById === userId;

    case Permission.DELETE:
      // Only creator can delete
      return task.createdById === userId;

    case Permission.ASSIGN:
      // Only creator can assign users
      return task.createdById === userId;

    default:
      return false;
  }
}

// Usage in controller
async function updateTask(
  userId: string,
  taskId: string,
  data: any
) {
  // Check permission
  await checkTaskPermission(userId, taskId, Permission.EDIT);

  // Proceed with update
  return prisma.task.update({
    where: { id: taskId },
    data,
  });
}
```

### 3.2 Collaborative Task Progress

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Update Individual Progress on Collaborative Task
// ─────────────────────────────────────────────────────────────
interface UpdateProgressDTO {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedSubtaskIndexes?: number[];
  note?: string;
}

async function updateMyTaskProgress(
  taskId: string,
  userId: string,
  data: UpdateProgressDTO
) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify task is collaborative
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { taskType: true, assignedUserIds: true },
    });

    if (task?.taskType !== 'COLLABORATIVE') {
      throw new BadRequestException('Not a collaborative task');
    }

    // 2. Verify user is assigned
    if (!task.assignedUserIds.includes(userId)) {
      throw new ForbiddenException('Not assigned to this task');
    }

    // 3. Update or create progress record
    const progress = await tx.taskProgress.upsert({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
      update: {
        status: data.status,
        completedSubtaskIndexes: data.completedSubtaskIndexes || [],
        progressPercentage: data.completedSubtaskIndexes
          ? Math.round((data.completedSubtaskIndexes.length / (task.subtasks?.length || 1)) * 100)
          : 0,
        note: data.note,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
        startedAt: data.status === 'IN_PROGRESS' && !data.note ? new Date() : undefined,
      },
      create: {
        taskId,
        userId,
        status: data.status,
        completedSubtaskIndexes: data.completedSubtaskIndexes || [],
        progressPercentage: 0,
        note: data.note,
      },
    });

    // 4. Update parent task status if all children completed
    const allProgress = await tx.taskProgress.findMany({
      where: { taskId, deletedAt: null },
    });

    const allCompleted = allProgress.every(p => p.status === 'COMPLETED');
    const anyInProgress = allProgress.some(p => p.status === 'IN_PROGRESS');

    if (allCompleted && task.status !== 'COMPLETED') {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    } else if (anyInProgress && task.status === 'PENDING') {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: 'IN_PROGRESS',
        },
      });
    }

    return progress;
  });
}
```

---

## 4. NOTIFICATION SYSTEM

### 4.1 Batch Notification Creation

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Send Notifications to Multiple Users
// ─────────────────────────────────────────────────────────────
interface NotificationBatch {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  taskId?: string;
  metadata?: any;
}

async function sendBatchNotifications(data: NotificationBatch) {
  return prisma.$transaction(async (tx) => {
    // 1. Create notifications in batch
    await tx.notification.createMany({
      data: data.userIds.map(userId => ({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        taskId: data.taskId,
        metadata: data.metadata,
        read: false,
      })),
      skipDuplicates: true, // Avoid duplicates
    });

    // 2. Log the batch operation
    await tx.notificationBatch.create({
      data: {
        type: data.type,
        recipientCount: data.userIds.length,
        status: 'SENT',
      },
    });

    return { success: true, count: data.userIds.length };
  });
}

// Usage: Notify all assigned users about task update
async function notifyTaskUpdate(taskId: string, updateType: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      assignedUserIds: true,
    },
  });

  await sendBatchNotifications({
    userIds: task.assignedUserIds,
    type: 'TASK_UPDATED',
    title: 'Task Updated',
    message: `The task "${task.title}" has been ${updateType}`,
    taskId,
  });
}
```

### 4.2 Unread Notification Count with Real-time Update

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Get Unread Notification Count
// ─────────────────────────────────────────────────────────────
async function getUnreadNotificationCount(userId: string) {
  const count = await prisma.notification.count({
    where: {
      userId,
      read: false,
      deletedAt: null,
    },
  });

  return { count };
}

// ─────────────────────────────────────────────────────────────
// Use Case: Mark Notification as Read
// ─────────────────────────────────────────────────────────────
async function markNotificationAsRead(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Use Case: Mark All as Read
// ─────────────────────────────────────────────────────────────
async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  return { markedCount: result.count };
}
```

---

## 5. ANALYTICS & REPORTING DASHBOARD

### 5.1 Task Completion Analytics

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Get Task Completion Trends
// ─────────────────────────────────────────────────────────────
async function getTaskCompletionTrends(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const trends = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "completedAt") as date,
      COUNT(*) as completed_count,
      AVG(EXTRACT(EPOCH FROM ("completedAt" - "startTime"))) / 3600 as avg_hours
    FROM tasks
    WHERE "createdById" = ${userId}
      OR "ownerId" = ${userId}
      AND status = 'COMPLETED'
      AND "deletedAt" IS NULL
      AND "completedAt" >= ${startDate}
      AND "completedAt" <= ${endDate}
    GROUP BY DATE_TRUNC('day', "completedAt")
    ORDER BY date DESC
  `;

  return trends;
}

// ─────────────────────────────────────────────────────────────
// Use Case: Get Productivity Score
// ─────────────────────────────────────────────────────────────
async function getProductivityScore(userId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [taskStats, subtaskStats] = await Promise.all([
    // Task statistics
    prisma.task.groupBy({
      by: ['status'],
      where: {
        OR: [{ createdById: userId }, { ownerId: userId }],
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      _count: true,
    }),
    // Subtask completion rate
    prisma.subTask.findMany({
      where: {
        task: {
          OR: [{ createdById: userId }, { ownerId: userId }],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
    }),
  ]);

  const totalTasks = taskStats.reduce((sum, s) => sum + s._count, 0);
  const completedTasks = taskStats.find(s => s.status === 'COMPLETED')?._count || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalSubtasks = subtaskStats.length;
  const completedSubtasks = subtaskStats.filter(s => s.isCompleted).length;
  const subtaskCompletionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  // Calculate productivity score (0-100)
  const productivityScore = Math.round(
    (completionRate * 0.6) + (subtaskCompletionRate * 0.4)
  );

  return {
    productivityScore,
    taskCompletionRate: Math.round(completionRate),
    subtaskCompletionRate: Math.round(subtaskCompletionRate),
    totalTasks,
    completedTasks,
    totalSubtasks,
    completedSubtasks,
  };
}
```

---

## 6. FILE ATTACHMENTS & STORAGE

### 6.1 Attachment Management

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Upload Task Attachment
// ─────────────────────────────────────────────────────────────
interface UploadAttachmentDTO {
  taskId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
}

async function uploadTaskAttachment(data: UploadAttachmentDTO) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify task exists
    const task = await tx.task.findUnique({
      where: { id: data.taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 2. Create attachment record
    const attachment = await tx.attachment.create({
      data: {
        taskId: data.taskId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        url: data.url,
        uploadedById: data.uploadedBy,
      },
    });

    // 3. Update task attachment count
    await tx.task.update({
      where: { id: data.taskId },
      data: {
        attachmentCount: { increment: 1 },
      },
    });

    return attachment;
  });
}

// ─────────────────────────────────────────────────────────────
// Use Case: Get Task with Attachments
// ─────────────────────────────────────────────────────────────
async function getTaskWithAttachments(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      attachments: {
        where: { deletedAt: null },
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}
```

---

## 7. SEARCH & FILTERING

### 7.1 Full-Text Search Implementation

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Advanced Task Search
// ─────────────────────────────────────────────────────────────
interface SearchFilters {
  query?: string;
  status?: string[];
  priority?: string[];
  taskType?: string[];
  assignedToUserId?: string;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

async function searchTasks(filters: SearchFilters) {
  const {
    query,
    status,
    priority,
    taskType,
    assignedToUserId,
    createdById,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = filters;

  // Build dynamic where clause
  const where: any = {
    deletedAt: null,
  };

  // Full-text search
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  // Filter arrays
  if (status?.length) {
    where.status = { in: status };
  }
  if (priority?.length) {
    where.priority = { in: priority };
  }
  if (taskType?.length) {
    where.taskType = { in: taskType };
  }

  // User filters
  if (assignedToUserId) {
    where.assignedUserIds = { has: assignedToUserId };
  }
  if (createdById) {
    where.createdById = createdById;
  }

  // Date range
  if (dateFrom || dateTo) {
    where.startTime = {};
    if (dateFrom) where.startTime.gte = dateFrom;
    if (dateTo) where.startTime.lte = dateTo;
  }

  // Execute search
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedUsers: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            subtasks: true,
            attachments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters,
  };
}
```

---

## 8. DATA EXPORT & IMPORT

### 8.1 Export User Data

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Export All User Tasks to CSV
// ─────────────────────────────────────────────────────────────
import { Parser } from 'json2csv';

async function exportUserTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ createdById: userId }, { ownerId: userId }],
      deletedAt: null,
    },
    include: {
      assignedUsers: {
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      subtasks: {
        where: { deletedAt: null },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform for CSV
  const csvData = tasks.map(task => ({
    ID: task.id,
    Title: task.title,
    Description: task.description,
    Status: task.status,
    Priority: task.priority,
    Type: task.taskType,
    'Created At': task.createdAt.toISOString(),
    'Due Date': task.dueDate?.toISOString() || '',
    'Assigned To': task.assignedUsers
      .map(u => `${u.profile.firstName} ${u.profile.lastName}`)
      .join(', '),
    'Subtask Count': task.subtasks.length,
  }));

  const parser = new Parser();
  const csv = parser.parse(csvData);

  return csv;
}
```

---

## 9. BACKGROUND JOBS & QUEUES

### 9.1 Scheduled Task Reminders

```typescript
// ─────────────────────────────────────────────────────────────
// Use Case: Send Daily Task Reminders
// ─────────────────────────────────────────────────────────────
async function sendDailyTaskReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find tasks due tomorrow
  const tasksDue = await prisma.task.findMany({
    where: {
      dueDate: {
        gte: today,
        lt: tomorrow,
      },
      status: {
        not: 'COMPLETED',
      },
      deletedAt: null,
    },
    include: {
      assignedUsers: {
        select: {
          id: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          email: true,
        },
      },
    },
  });

  // Send reminders
  for (const task of tasksDue) {
    await prisma.notification.createMany({
      data: task.assignedUsers.map(user => ({
        userId: user.id,
        type: 'TASK_DUE_SOON',
        title: 'Task Due Tomorrow',
        message: `"${task.title}" is due tomorrow`,
        taskId: task.id,
      })),
    });
  }

  console.log(`Sent ${tasksDue.length} task reminders`);
}

// Schedule with cron job
// import { CronJob } from 'cron';
// const job = new CronJob('0 9 * * *', sendDailyTaskReminders); // Daily at 9 AM
// job.start();
```

---

## 10. API VERSIONING & MIGRATION

### 10.1 API Versioning Strategy

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: URL Versioning with Prisma
// ─────────────────────────────────────────────────────────────
// routes/v1/tasks.ts
router.get('/tasks', v1TaskController.getTasks);

// routes/v2/tasks.ts
router.get('/tasks', v2TaskController.getTasks); // Enhanced response

// ─────────────────────────────────────────────────────────────
// Use Case: Backward-Compatible Response
// ─────────────────────────────────────────────────────────────
class TaskControllerV2 {
  async getTasks(req: Request, res: Response) {
    const tasks = await prisma.task.findMany({
      where: { deletedAt: null },
      include: {
        assignedUsers: true,
        subtasks: true,
        // V2: Add new fields
        progress: true,
        attachments: true,
      },
    });

    // Support both V1 and V2 clients
    const acceptVersion = req.headers['api-version'] || 'v2';

    if (acceptVersion === 'v1') {
      // Return V1 format (backward compatible)
      const v1Response = tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignedUserIds: t.assignedUsers.map(u => u.id),
        subtaskCount: t.subtasks.length,
      }));

      return res.json({ data: v1Response });
    }

    // Return V2 format (full response)
    return res.json({ data: tasks });
  }
}
```

---

## 📚 SUMMARY

This volume covered **10 real-world scenarios** from production task management systems:

1. ✅ Complete task creation with assignments and notifications
2. ✅ User registration with verification
3. ✅ Permission-based access control
4. ✅ Collaborative progress tracking
5. ✅ Batch notification system
6. ✅ Analytics and productivity scoring
7. ✅ File attachment management
8. ✅ Advanced search with filters
9. ✅ Data export functionality
10. ✅ Background job scheduling
11. ✅ API versioning strategies

---

**Next Steps:**
- Implement these patterns in your project
- Adapt to your specific business requirements
- Add comprehensive error handling
- Set up monitoring and alerting
- Document your API endpoints

**Remember**: These are production-tested patterns. Use them as a foundation and customize based on your needs.

---

**Volume 4 Coming Soon**: Testing & Debugging Database Operations

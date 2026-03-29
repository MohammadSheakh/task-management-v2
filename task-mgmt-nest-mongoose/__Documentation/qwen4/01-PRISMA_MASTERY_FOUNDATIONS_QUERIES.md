# 📘 PRISMA MASTERY WITH NESTJS & EXPRESS.JS
## Volume 1: Foundations & Critical Query Patterns

**Industry-Level Database Operations for Production Applications**

---

## 📖 TABLE OF CONTENTS

1. [Prisma Architecture & Production Setup](#1-prisma-architecture--production-setup)
2. [Critical Query Patterns - Real World Scenarios](#2-critical-query-patterns)
3. [Advanced Relations & Joins](#3-advanced-relations--joins)
4. [Transaction Management](#4-transaction-management)
5. [Query Optimization & Performance](#5-query-optimization--performance)
6. [Complex Aggregations & Analytics](#6-complex-aggregations--analytics)
7. [Soft Delete & Data Archival](#7-soft-delete--data-archival)
8. [Bulk Operations & Batch Processing](#8-bulk-operations--batch-processing)
9. [Database Migrations in Production](#9-database-migrations-in-production)
10. [Security & SQL Injection Prevention](#10-security--sql-injection-prevention)

---

## 1. PRISMA ARCHITECTURE & PRODUCTION SETUP

### 1.1 Understanding Prisma's Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  (NestJS Controllers / Express Routes)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                             │
│  (Business Logic + Prisma Client)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  PRISMA CLIENT                              │
│  (Type-safe Query Builder)                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               PRISMA ENGINE                                 │
│  (Query Optimization + Connection Pooling)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  POSTGRESQL                                 │
│  (Relational Database)                                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Production-Ready Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema", "tracing"]
  output          = "../src/generated/prisma"
}

datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DATABASE_DIRECT_URL") // For migrations
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // For dev migrations
  relationMode      = "prisma" // or "foreignKeys"
}

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phone         String?   @unique
  password      String
  role          Role      @default(USER)
  status        UserStatus @default(PENDING)
  
  // ─── Relations ─────────────────────────────────────────────
  tasks         Task[]    @relation("TaskCreator")
  assignedTasks Task[]    @relation("AssignedTasks")
  profile       UserProfile?
  
  // ─── Timestamps ────────────────────────────────────────────
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  
  // ─── Indexes ───────────────────────────────────────────────
  @@index([email])
  @@index([status])
  @@index([deletedAt])
  @@map("users")
}

model UserProfile {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstName    String
  lastName     String
  avatarUrl    String?
  bio          String?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@map("user_profiles")
}

// ─────────────────────────────────────────────────────────────
// TASK MANAGEMENT (Complex Relations)
// ─────────────────────────────────────────────────────────────

model Task {
  id              String        @id @default(uuid())
  title           String
  description     String?
  status          TaskStatus    @default(PENDING)
  priority        Priority      @default(MEDIUM)
  taskType        TaskType      @default(SINGLE_ASSIGNMENT)
  
  // ─── Foreign Keys ──────────────────────────────────────────
  createdById     String
  ownerId         String?
  
  // ─── Relations ─────────────────────────────────────────────
  createdBy       User          @relation("TaskCreator", fields: [createdById], references: [id])
  owner           User?         @relation("TaskOwner", fields: [ownerId], references: [id])
  assignedUsers   User[]        @relation("AssignedTasks")
  subtasks        SubTask[]
  progress        TaskProgress?
  
  // ─── Timestamps ────────────────────────────────────────────
  startTime       DateTime?
  dueDate         DateTime?
  completedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
  
  // ─── Indexes ───────────────────────────────────────────────
  @@index([status])
  @@index([priority])
  @@index([taskType])
  @@index([createdById])
  @@index([ownerId])
  @@index([startTime, dueDate])
  @@index([deletedAt])
  @@map("tasks")
}

model SubTask {
  id          String   @id @default(uuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  title       String
  isCompleted Boolean  @default(false)
  order       Int
  completedAt DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  @@index([taskId])
  @@index([isCompleted])
  @@map("subtasks")
}

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  USER
  BUSINESS
}

enum UserStatus {
  PENDING
  ACTIVE
  SUSPENDED
  DELETED
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskType {
  PERSONAL
  SINGLE_ASSIGNMENT
  COLLABORATIVE
}
```

### 1.3 Production Prisma Client Setup (NestJS)

```typescript
// src/prisma/prisma.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Enable query logging in development
    if (process.env.NODE_ENV === 'development') {
      this.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        console.log(
          `Query ${params.model}.${params.action} took ${after - before}ms`,
        );
        return result;
      });
    }

    // Enable connection pooling
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Enable shutdown hooks
  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  // Transaction helper
  async transaction<T>(fn: (tx: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }

  // Batch queries
  async batch<T>(queries: Promise<T>[]): Promise<T[]> {
    return this.$transaction(queries);
  }
}
```

### 1.4 Production Prisma Client Setup (Express)

```typescript
// src/database/prisma.ts

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Connection pooling configuration
// Add to .env:
// DATABASE_URL="postgresql://user:password@localhost:5432/dbname?connection_limit=10&pool_timeout=20&connect_timeout=10"

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
```

### 1.5 Environment Configuration (.env)

```bash
# ─────────────────────────────────────────────────────────────
# DATABASE CONFIGURATION
# ─────────────────────────────────────────────────────────────

# Main connection (with connection pooling)
DATABASE_URL="postgresql://postgres:password@localhost:5432/taskdb?connection_limit=10&pool_timeout=20&connect_timeout=10"

# Direct connection for migrations (bypasses pooler)
DATABASE_DIRECT_URL="postgresql://postgres:password@localhost:5432/taskdb"

# Shadow database for dev migrations
SHADOW_DATABASE_URL="postgresql://postgres:password@localhost:5432/taskdb_shadow"

# ─────────────────────────────────────────────────────────────
# CONNECTION POOL SETTINGS (Production)
# ─────────────────────────────────────────────────────────────

# PgBouncer settings (if using)
# DATABASE_URL="postgresql://postgres:password@pgbouncer:6543/taskdb?connection_limit=20"

# Pool settings
PG_POOL_MIN=2
PG_POOL_MAX=10
PG_IDLE_TIMEOUT=30000
PG_CONNECTION_TIMEOUT=10000

# ─────────────────────────────────────────────────────────────
# PRISMA SETTINGS
# ─────────────────────────────────────────────────────────────

# Enable query logging
PRISMA_QUERY_LOG=true

# Enable tracing
PRISMA_TRACING=true
```

---

## 2. CRITICAL QUERY PATTERNS

### 2.1 Complex Filtering with OR/AND Logic

```typescript
// ❌ BAD: Inefficient filtering
const tasks = await prisma.task.findMany({
  where: {
    OR: [
      { status: 'PENDING' },
      { status: 'IN_PROGRESS' },
      { status: 'COMPLETED' },
    ],
  },
});

// ✅ GOOD: Use IN operator
const tasks = await prisma.task.findMany({
  where: {
    status: {
      in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    },
  },
});

// ✅ ADVANCED: Complex business logic
const tasks = await prisma.task.findMany({
  where: {
    AND: [
      {
        OR: [
          { status: 'IN_PROGRESS' },
          { 
            AND: [
              { status: 'PENDING' },
              { priority: { in: ['HIGH', 'URGENT'] } },
            ]
          },
        ],
      },
      {
        OR: [
          { dueDate: { lte: new Date() } }, // Overdue
          { 
            AND: [
              { dueDate: { gte: new Date() } },
              { startTime: { lte: new Date() } },
            ]
          },
        ],
      },
      { deletedAt: null }, // Not deleted
    ],
  },
  orderBy: {
    priority: 'desc',
  },
});
```

### 2.2 Pagination Patterns (Production-Ready)

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Offset-based Pagination (Simple but slower)
// ─────────────────────────────────────────────────────────────
interface OffsetPagination {
  page: number;
  limit: number;
}

async function getTasksOffset({ page, limit }: OffsetPagination) {
  const skip = (page - 1) * limit;
  
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      skip,
      take: limit,
      where: { deletedAt: null },
      include: {
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
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({
      where: { deletedAt: null },
    }),
  ]);

  return {
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + tasks.length < total,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Cursor-based Pagination (Better for large datasets)
// ─────────────────────────────────────────────────────────────
interface CursorPagination {
  limit: number;
  cursor?: string; // Task ID
  direction?: 'forward' | 'backward';
}

async function getTasksCursor({ limit, cursor, direction = 'forward' }: CursorPagination) {
  const tasks = await prisma.task.findMany({
    take: direction === 'forward' ? limit + 1 : -limit - 1,
    skip: cursor ? 1 : 0, // Skip cursor itself
    cursor: cursor ? { id: cursor } : undefined,
    where: { deletedAt: null },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
      _count: {
        select: {
          subtasks: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let hasMore = false;
  let nextCursor: string | undefined;
  let prevCursor: string | undefined;

  if (direction === 'forward' && tasks.length > limit) {
    const nextItem = tasks.pop();
    hasMore = true;
    nextCursor = nextItem?.id;
  }

  if (tasks.length > 0) {
    prevCursor = tasks[0].id;
    if (direction === 'backward') {
      tasks.reverse();
    }
  }

  return {
    data: tasks,
    pagination: {
      limit,
      hasMore,
      nextCursor,
      prevCursor,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Keyset Pagination (Best for infinite scroll)
// ─────────────────────────────────────────────────────────────
interface KeysetPagination {
  limit: number;
  lastId?: string;
  lastCreatedAt?: Date;
}

async function getTasksKeyset({ limit, lastId, lastCreatedAt }: KeysetPagination) {
  const tasks = await prisma.task.findMany({
    take: limit + 1,
    where: {
      deletedAt: null,
      ...(lastId && lastCreatedAt
        ? {
            OR: [
              {
                createdAt: { lt: lastCreatedAt },
              },
              {
                createdAt: lastCreatedAt,
                id: { lt: lastId },
              },
            ],
          }
        : {}),
    },
    include: {
      assignedUsers: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
  });

  const hasMore = tasks.length > limit;
  const nextItems = hasMore ? tasks.slice(0, -1) : tasks;

  const nextCursor = hasMore
    ? {
        lastId: tasks[tasks.length - 1].id,
        lastCreatedAt: tasks[tasks.length - 1].createdAt,
      }
    : undefined;

  return {
    data: nextItems,
    pagination: {
      limit,
      hasMore,
      nextCursor,
    },
  };
}
```

### 2.3 Advanced Relations & Nested Queries

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Eager Loading with Selective Fields
// ─────────────────────────────────────────────────────────────
async function getTaskWithDetails(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      startTime: true,
      dueDate: true,
      // Nested relations with field selection
      createdBy: {
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
        },
      },
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
      subtasks: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          order: true,
        },
      },
      // Aggregations
      _count: {
        select: {
          subtasks: true,
        },
      },
    },
  });

  return task;
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Filtering Relations
// ─────────────────────────────────────────────────────────────
async function getUserWithActiveTasks(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      // Filter related records
      tasks: {
        where: {
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
          deletedAt: null,
        },
        orderBy: { priority: 'desc' },
        take: 10, // Limit results
      },
      assignedTasks: {
        where: {
          status: 'IN_PROGRESS',
          deletedAt: null,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return user;
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Many-to-Many with Filter
// ─────────────────────────────────────────────────────────────
async function getCollaborativeTasksWithMembers(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedUsers: {
        where: {
          status: 'ACTIVE', // Filter active users only
        },
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          // Nested aggregation
          _count: {
            select: {
              tasks: {
                where: {
                  status: 'IN_PROGRESS',
                },
              },
            },
          },
        },
      },
    },
  });

  return task;
}
```

### 2.4 Raw SQL Queries (When Prisma Isn't Enough)

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Raw Query with Parameters (SQL Injection Safe)
// ─────────────────────────────────────────────────────────────
async function getTaskStatisticsRaw(userId: string) {
  const stats = await prisma.$queryRaw`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
    FROM tasks
    WHERE "createdById" = ${userId}
      AND "deletedAt" IS NULL
    GROUP BY status
    ORDER BY count DESC
  `;

  return stats;
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Raw Query with Complex Joins
// ─────────────────────────────────────────────────────────────
async function getTaskCompletionAnalytics(startDate: Date, endDate: Date) {
  const analytics = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', t."completedAt") as date,
      COUNT(*) as completed_count,
      AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."startTime"))) / 3600 as avg_hours,
      u.email as creator_email,
      p."firstName",
      p."lastName"
    FROM tasks t
    INNER JOIN users u ON t."createdById" = u.id
    LEFT JOIN "user_profiles" p ON u.id = p."userId"
    WHERE t.status = 'COMPLETED'
      AND t."completedAt" >= ${startDate}
      AND t."completedAt" <= ${endDate}
      AND t."deletedAt" IS NULL
    GROUP BY 
      DATE_TRUNC('day', t."completedAt"),
      u.email,
      p."firstName",
      p."lastName"
    ORDER BY date DESC, completed_count DESC
  `;

  return analytics;
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Raw Mutation with RETURNING
// ─────────────────────────────────────────────────────────────
async function bulkUpdateTaskStatus(taskIds: string[], status: string) {
  const updated = await prisma.$executeRaw`
    UPDATE tasks
    SET 
      status = ${status}::"TaskStatus",
      "completedAt" = CASE 
        WHEN ${status}::"TaskStatus" = 'COMPLETED' THEN NOW()
        ELSE NULL
      END,
      "updatedAt" = NOW()
    WHERE id = ANY(${taskIds})
      AND "deletedAt" IS NULL
    RETURNING id, status, "completedAt"
  `;

  return updated;
}

// ─────────────────────────────────────────────────────────────
// Pattern 4: Unsafe Raw Query (Use with EXTREME Caution)
// ─────────────────────────────────────────────────────────────
async function searchTasksUnsafe(searchTerm: string) {
  // ⚠️ WARNING: Only use when you absolutely need dynamic SQL
  // ⚠️ Validate and sanitize ALL inputs
  const sanitizedTerm = searchTerm.replace(/['";]/g, '');
  
  const tasks = await prisma.$queryRawUnsafe(`
    SELECT * FROM tasks
    WHERE title ILIKE '%${sanitizedTerm}%'
      AND "deletedAt" IS NULL
    ORDER BY ts_rank(
      to_tsvector('english', title || ' ' || COALESCE(description, '')),
      to_tsquery('english', '${sanitizedTerm}')
    ) DESC
    LIMIT 20
  `);

  return tasks;
}
```

---

## 3. ADVANCED RELATIONS & JOINS

### 3.1 Self-Referencing Relations

```typescript
// Schema
model Comment {
  id        String    @id @default(uuid())
  content   String
  parentId  String?
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  
  @@map("comments")
}

// Query: Get comment with nested replies (recursive)
async function getCommentWithReplies(commentId: string, maxDepth: number = 3) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          replies: maxDepth > 1 ? {
            include: {
              replies: maxDepth > 2 ? true : undefined,
            },
          } : undefined,
        },
      },
    },
  });

  return comment;
}
```

### 3.2 Polymorphic Relations

```typescript
// Schema - Using union table pattern
model Attachment {
  id        String   @id @default(uuid())
  url       String
  type      String   // 'TASK', 'SUBTASK', 'COMMENT'
  taskId    String?
  task      Task?    @relation(fields: [taskId], references: [id])
  subtaskId String?
  // ... other fields
  
  @@map("attachments")
}

// Query: Get all attachments for a task
async function getTaskAttachments(taskId: string) {
  const attachments = await prisma.attachment.findMany({
    where: {
      taskId: taskId,
      type: 'TASK',
    },
    orderBy: { createdAt: 'desc' },
  });

  return attachments;
}
```

### 3.3 Many-to-Many with Extra Fields

```typescript
// Schema
model Task {
  id          String           @id @default(uuid())
  assignments TaskAssignment[]
}

model User {
  id          String           @id @default(uuid())
  assignments TaskAssignment[]
}

model TaskAssignment {
  id          String   @id @default(uuid())
  taskId      String
  userId      String
  role        String   @default('MEMBER') // ADMIN, MEMBER, VIEWER
  assignedAt  DateTime @default(now())
  accepted    Boolean  @default(false)
  
  task        Task     @relation(fields: [taskId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
  
  @@unique([taskId, userId])
  @@map("task_assignments")
}

// Query: Get task with assignment details
async function getTaskWithAssignments(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: {
        include: {
          user: {
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
        where: {
          accepted: true, // Only accepted assignments
        },
        orderBy: {
          role: 'asc', // Admins first
        },
      },
    },
  });

  return task;
}

// Mutation: Assign user to task with role
async function assignUserToTask(
  taskId: string,
  userId: string,
  role: string = 'MEMBER'
) {
  const assignment = await prisma.taskAssignment.create({
    data: {
      taskId,
      userId,
      role,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return assignment;
}
```

---

## 4. TRANSACTION MANAGEMENT

### 4.1 Interactive Transactions

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Basic Transaction with Error Handling
// ─────────────────────────────────────────────────────────────
async function createTaskWithSubtasks(
  userId: string,
  taskData: any,
  subtasksData: any[]
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create task
      const task = await tx.task.create({
        data: {
          ...taskData,
          createdById: userId,
        },
      });

      // 2. Create subtasks
      if (subtasksData.length > 0) {
        await tx.subTask.createMany({
          data: subtasksData.map((st, index) => ({
            taskId: task.id,
            title: st.title,
            order: index + 1,
            isCompleted: false,
          })),
        });
      }

      // 3. Create activity log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'TASK_CREATED',
          taskId: task.id,
        },
      });

      return task;
    }, {
      timeout: 10000, // 10 seconds
      maxWait: 5000,  // 5 seconds
      isolationLevel: 'ReadCommitted',
    });

    return result;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw new Error('Failed to create task with subtasks');
  }
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Transaction with Optimistic Locking
// ─────────────────────────────────────────────────────────────
async function updateTaskWithVersionCheck(
  taskId: string,
  updateData: any,
  version: number
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check version
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: { version: true },
      });

      if (!task || task.version !== version) {
        throw new Error('Task has been modified by another user');
      }

      // 2. Update task with version increment
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          ...updateData,
          version: version + 1,
        },
      });

      return updated;
    });

    return result;
  } catch (error) {
    if (error.message.includes('modified')) {
      throw new ConflictException('Task was modified concurrently');
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Batch Transaction with Rollback Logic
// ─────────────────────────────────────────────────────────────
async function bulkDeleteTasks(taskIds: string[], userId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Soft delete tasks
      await tx.task.updateMany({
        where: {
          id: { in: taskIds },
          createdById: userId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // 2. Delete related subtasks
      await tx.subTask.updateMany({
        where: {
          taskId: { in: taskIds },
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // 3. Log deletion
      await tx.activityLog.createMany({
        data: taskIds.map(taskId => ({
          userId,
          action: 'TASK_DELETED',
          taskId,
        })),
      });
    });

    return { success: true, deletedCount: taskIds.length };
  } catch (error) {
    console.error('Bulk delete failed:', error);
    throw new Error('Failed to delete tasks');
  }
}
```

### 4.2 Batch Queries (Non-Transactional)

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Parallel Batch Queries
// ─────────────────────────────────────────────────────────────
async function getDashboardData(userId: string) {
  const [
    tasks,
    taskCount,
    subtasks,
    notifications,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { createdById: userId },
          { ownerId: userId },
        ],
        deletedAt: null,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({
      where: {
        OR: [
          { createdById: userId },
          { ownerId: userId },
        ],
        deletedAt: null,
      },
    }),
    prisma.subTask.findMany({
      where: {
        task: {
          OR: [
            { createdById: userId },
            { ownerId: userId },
          ],
        },
        deletedAt: null,
      },
      take: 20,
    }),
    prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      take: 5,
    }),
  ]);

  return {
    tasks,
    taskCount,
    subtasks,
    notifications,
  };
}
```

---

## 5. QUERY OPTIMIZATION & PERFORMANCE

### 5.1 Index Optimization

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Covering Index for Common Queries
// ─────────────────────────────────────────────────────────────
// In schema.prisma:
/*
model Task {
  // ... fields
  
  @@index([status, priority, createdAt])
  @@index([createdById, status])
  @@index([taskType, deletedAt, startTime])
}
*/

// Query optimized for index
async function getActiveTasksByPriority(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      createdById: userId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      deletedAt: null,
    },
    orderBy: { priority: 'desc' },
    // This query uses the index [createdById, status]
  });

  return tasks;
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Partial Index for Soft Deletes
// ─────────────────────────────────────────────────────────────
// In schema.prisma:
/*
model Task {
  // ... fields
  
  @@index([status]) where: "(\"deletedAt\" IS NULL)"
}
*/

// Query benefits from partial index
async function getActiveTasks() {
  const tasks = await prisma.task.findMany({
    where: {
      status: 'IN_PROGRESS',
      deletedAt: null,
    },
  });

  return tasks;
}
```

### 5.2 Query Optimization Techniques

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Avoid N+1 Query Problem
// ─────────────────────────────────────────────────────────────

// ❌ BAD: N+1 Query
async function getTasksWithCreatorsBad() {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
  });

  // N+1 queries here!
  const tasksWithCreators = await Promise.all(
    tasks.map(async (task) => {
      const creator = await prisma.user.findUnique({
        where: { id: task.createdById },
      });
      return { ...task, creator };
    })
  );

  return tasksWithCreators;
}

// ✅ GOOD: Single Query with Include
async function getTasksWithCreatorsGood() {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  return tasks;
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Select Only Needed Fields
// ─────────────────────────────────────────────────────────────

// ❌ BAD: Fetching all fields
async function getUserTasksBad(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { ownerId: userId },
  });

  return tasks;
}

// ✅ GOOD: Select only needed fields
async function getUserTasksGood(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      _count: {
        select: {
          subtasks: true,
        },
      },
    },
  });

  return tasks;
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Use findFirst instead of findMany when expecting one
// ─────────────────────────────────────────────────────────────

// ❌ BAD
async function getActiveTaskBad(taskId: string) {
  const tasks = await prisma.task.findMany({
    where: { id: taskId, deletedAt: null },
    take: 1,
  });

  return tasks[0] || null;
}

// ✅ GOOD
async function getActiveTaskGood(taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
  });

  return task;
}
```

### 5.3 Connection Pool Optimization

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Connection Pool Configuration
// ─────────────────────────────────────────────────────────────

// For production with PgBouncer:
/*
DATABASE_URL="postgresql://user:pass@pgbouncer:6543/dbname?connection_limit=20"

// PgBouncer settings:
[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
*/

// Prisma Client configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// Monitor connection pool
async function monitorConnectionPool() {
  const stats = await prisma.$queryRaw`
    SELECT 
      count(*) as total_connections,
      count(*) FILTER (WHERE state = 'active') as active,
      count(*) FILTER (WHERE state = 'idle') as idle,
      count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
    FROM pg_stat_activity
    WHERE datname = current_database()
  `;

  return stats;
}
```

---

## 6. COMPLEX AGGREGATIONS & ANALYTICS

### 6.1 Advanced Aggregations

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Group By with Aggregations
// ─────────────────────────────────────────────────────────────
async function getTaskAnalyticsByStatus(userId: string) {
  const analytics = await prisma.task.groupBy({
    by: ['status'],
    where: {
      createdById: userId,
      deletedAt: null,
    },
    _count: {
      id: true,
    },
    _avg: {
      priority: true,
    },
    _min: {
      createdAt: true,
    },
    _max: {
      dueDate: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

  return analytics;
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Date-based Aggregations
// ─────────────────────────────────────────────────────────────
async function getTaskCompletionByMonth(userId: string, year: number) {
  const stats = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "completedAt") as month,
      COUNT(*) as completed_count,
      AVG(EXTRACT(EPOCH FROM ("completedAt" - "startTime"))) / 3600 as avg_completion_hours
    FROM tasks
    WHERE "createdById" = ${userId}
      AND status = 'COMPLETED'
      AND "deletedAt" IS NULL
      AND EXTRACT(YEAR FROM "completedAt") = ${year}
    GROUP BY DATE_TRUNC('month', "completedAt")
    ORDER BY month DESC
  `;

  return stats;
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Window Functions
// ─────────────────────────────────────────────────────────────
async function getTaskRanking(userId: string) {
  const tasks = await prisma.$queryRaw`
    SELECT 
      id,
      title,
      status,
      priority,
      "createdAt",
      ROW_NUMBER() OVER (ORDER BY priority DESC, "createdAt" DESC) as rank,
      COUNT(*) OVER () as total_count,
      PERCENT_RANK() OVER (ORDER BY priority DESC, "createdAt" DESC) as percentile
    FROM tasks
    WHERE "createdById" = ${userId}
      AND "deletedAt" IS NULL
    ORDER BY rank
    LIMIT 100
  `;

  return tasks;
}
```

---

## 7. SOFT DELETE & DATA ARCHIVAL

### 7.1 Soft Delete Pattern

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Global Soft Delete Middleware
// ─────────────────────────────────────────────────────────────

// In prisma.service.ts
prisma.$use(async (params, next) => {
  // Intercept delete operations
  if (params.action === 'delete') {
    params.action = 'update';
    params.args['data'] = { deletedAt: new Date() };
  }

  // Intercept deleteMany operations
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (params.args.data !== undefined) {
      params.args.data['deletedAt'] = new Date();
    } else {
      params.args['data'] = { deletedAt: new Date() };
    }
  }

  // Filter out soft-deleted records
  if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
    if (!params.args.where) {
      params.args.where = { deletedAt: null };
    } else if (params.args.where.deletedAt === undefined) {
      params.args.where['deletedAt'] = null;
    }
  }

  return next(params);
});

// ─────────────────────────────────────────────────────────────
// Pattern: Soft Delete with Cascade
// ─────────────────────────────────────────────────────────────
async function softDeleteTask(taskId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Soft delete subtasks
    await tx.subTask.updateMany({
      where: { taskId },
      data: { deletedAt: new Date() },
    });

    // 2. Soft delete task
    const task = await tx.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    // 3. Log deletion
    await tx.activityLog.create({
      data: {
        userId,
        action: 'TASK_DELETED',
        taskId,
      },
    });

    return task;
  });
}

// ─────────────────────────────────────────────────────────────
// Pattern: Restore Soft-Deleted Record
// ─────────────────────────────────────────────────────────────
async function restoreTask(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: null },
    include: {
      subtasks: {
        where: { deletedAt: null },
      },
    },
  });

  return task;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Permanent Delete (Cleanup Old Records)
// ─────────────────────────────────────────────────────────────
async function permanentDeleteOldRecords(daysOld: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.task.deleteMany({
    where: {
      deletedAt: {
        lte: cutoffDate,
      },
    },
  });

  return result;
}
```

---

## 8. BULK OPERATIONS & BATCH PROCESSING

### 8.1 Bulk Create Patterns

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: createMany with Skip Duplicates
// ─────────────────────────────────────────────────────────────
async function bulkCreateSubtasks(taskId: string, subtasks: any[]) {
  const result = await prisma.subTask.createMany({
    data: subtasks.map((st, index) => ({
      taskId,
      title: st.title,
      order: index + 1,
      isCompleted: false,
    })),
    skipDuplicates: true, // Skip if unique constraint violated
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Upsert (Update or Insert)
// ─────────────────────────────────────────────────────────────
async function upsertTaskAssignment(
  taskId: string,
  userId: string,
  role: string
) {
  const assignment = await prisma.taskAssignment.upsert({
    where: {
      taskId_userId: {
        taskId,
        userId,
      },
    },
    update: {
      role,
      accepted: false, // Reset acceptance on reassignment
    },
    create: {
      taskId,
      userId,
      role,
    },
  });

  return assignment;
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Batch Updates with Different Values
// ─────────────────────────────────────────────────────────────
async function bulkUpdateTaskPriorities(updates: Array<{ id: string; priority: string }>) {
  const operations = updates.map(update =>
    prisma.task.update({
      where: { id: update.id },
      data: { priority: update.priority },
    })
  );

  const results = await prisma.$transaction(operations);
  return results;
}
```

---

## 9. DATABASE MIGRATIONS IN PRODUCTION

### 9.1 Migration Strategy

```bash
# ─────────────────────────────────────────────────────────────
# Development Migrations
# ─────────────────────────────────────────────────────────────

# Create migration
npx prisma migrate dev --name add_task_priority

# Reset database (dev only)
npx prisma migrate reset

# ─────────────────────────────────────────────────────────────
# Production Migrations
# ─────────────────────────────────────────────────────────────

# Generate migration without applying
npx prisma migrate dev --create-only

# Apply migration in production
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### 9.2 Safe Production Migration Script

```typescript
// scripts/migrate.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting production migration...');

  try {
    // 1. Create backup
    console.log('Creating database backup...');
    execSync('pg_dump -h localhost -U postgres taskdb > backup.sql');

    // 2. Run migrations
    console.log('Running migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // 3. Validate migration
    console.log('Validating migration...');
    const count = await prisma.task.count();
    console.log(`✓ Migration successful. Task count: ${count}`);

  } catch (error) {
    console.error('Migration failed:', error);
    console.log('Rolling back...');
    // execSync('psql -h localhost -U postgres taskdb < backup.sql');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

---

## 10. SECURITY & SQL INJECTION PREVENTION

### 10.1 SQL Injection Prevention

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern 1: Always Use Parameterized Queries
// ─────────────────────────────────────────────────────────────

// ✅ SAFE: Parameterized query
async function searchTasksSafe(searchTerm: string) {
  const tasks = await prisma.$queryRaw`
    SELECT * FROM tasks
    WHERE title ILIKE ${`%${searchTerm}%`}
      AND "deletedAt" IS NULL
  `;

  return tasks;
}

// ❌ UNSAFE: String concatenation
async function searchTasksUnsafe(searchTerm: string) {
  const tasks = await prisma.$queryRawUnsafe(
    `SELECT * FROM tasks WHERE title ILIKE '%${searchTerm}%'`
  );

  return tasks;
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Input Validation
// ─────────────────────────────────────────────────────────────
import { z } from 'zod';

const taskSearchSchema = z.object({
  searchTerm: z.string().min(1).max(100),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

async function searchTasksWithValidation(input: any) {
  const validated = taskSearchSchema.parse(input);
  
  const tasks = await prisma.task.findMany({
    where: {
      title: {
        contains: validated.searchTerm,
      },
      status: validated.status,
      priority: validated.priority,
      deletedAt: null,
    },
  });

  return tasks;
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Field Whitelisting for Sorting
// ─────────────────────────────────────────────────────────────
const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'dueDate'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

async function getTasksWithSorting(
  sortBy: string = 'createdAt',
  order: string = 'desc'
) {
  // Validate sort field
  if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
    sortBy = 'createdAt';
  }

  // Validate order
  if (!ALLOWED_SORT_ORDERS.includes(order)) {
    order = 'desc';
  }

  const tasks = await prisma.task.findMany({
    orderBy: {
      [sortBy]: order,
    },
    where: {
      deletedAt: null,
    },
  });

  return tasks;
}
```

---

## 📚 CONTINUING EDUCATION

This is **Volume 1** of the Prisma Mastery series. Continue with:

- **Volume 2**: Advanced Patterns & Performance Tuning
- **Volume 3**: Microservices & Database Sharding
- **Volume 4**: Real-time Queries & Subscriptions
- **Volume 5**: Testing & Debugging Database Operations

---

**🎯 Key Takeaways:**

1. ✅ Always use parameterized queries
2. ✅ Implement soft deletes for audit trails
3. ✅ Use transactions for data integrity
4. ✅ Optimize queries with proper indexing
5. ✅ Select only needed fields
6. ✅ Avoid N+1 queries with includes
7. ✅ Validate all inputs
8. ✅ Use connection pooling in production
9. ✅ Test migrations before production
10. ✅ Monitor query performance

---

**Next Steps:**
- Practice each pattern in a real project
- Review query logs regularly
- Set up query performance monitoring
- Create a query optimization checklist

**Remember**: The best query is the one you don't have to run. Cache aggressively, index wisely, and always think about scale.

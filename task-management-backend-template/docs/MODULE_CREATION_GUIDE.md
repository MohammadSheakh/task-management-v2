# 🏗️ Senior-Level Module Creation Guide

**Version**: 1.0.0  
**Date**: 26-03-23  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Module Structure](#module-structure)
3. [Step-by-Step Creation Process](#step-by-step-creation-process)
4. [File-by-File Implementation Guide](#file-by-file-implementation-guide)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [Checklist](#checklist)
8. [Examples](#examples)

---

## 🎯 Overview

This guide provides a **complete, battle-tested framework** for creating production-ready modules in the Task Management System. Following these patterns ensures:

- ✅ **Consistency** across all modules
- ✅ **Scalability** for 100K+ users
- ✅ **Maintainability** for long-term development
- ✅ **Security** with built-in protections
- ✅ **Performance** with Redis caching and BullMQ
- ✅ **Testability** with comprehensive test suites

### What Makes a Module "Senior-Level"?

1. **Complete File Structure** - All necessary files
2. **Redis Caching** - For read operations
3. **Rate Limiting** - Prevent abuse
4. **Validation** - Input validation with Zod
5. **Error Handling** - Comprehensive error management
6. **Logging** - Winston logging throughout
7. **Testing** - Full test coverage
8. **Documentation** - API docs and guides
9. **Type Safety** - TypeScript interfaces
10. **Security** - Authentication and authorization

---

## 📁 Module Structure

### Standard Module Layout

```
src/modules/[moduleName].module/
│
├── [moduleName]/                          # Main module folder
│   ├── [moduleName].constant.ts           # Enums, constants, config
│   ├── [moduleName].interface.ts          # TypeScript interfaces
│   ├── [moduleName].model.ts              # Mongoose schema & model
│   ├── [moduleName].validation.ts         # Zod validation schemas
│   ├── [moduleName].service.ts            # Business logic
│   ├── [moduleName].controller.ts         # HTTP handlers
│   ├── [moduleName].route.ts              # API routes
│   ├── [moduleName].middleware.ts         # Custom middleware (optional)
│   └── [moduleName].test.ts               # Test suite
│
├── doc/                                   # Documentation
│   ├── API_DOCUMENTATION.md               # Complete API reference
│   ├── [MODULE]_ARCHITECTURE.md           # Architecture guide
│   ├── [MODULE]_SYSTEM_GUIDE.md           # System guide
│   └── dia/                               # Mermaid diagrams
│       ├── [moduleName]-schema.mermaid
│       ├── [moduleName]-flow.mermaid
│       └── ...
│
└── [subModules]/                          # Related sub-modules (optional)
    ├── [subModuleName]/
    │   ├── [subModuleName].constant.ts
    │   ├── [subModuleName].interface.ts
    │   ├── [subModuleName].model.ts
    │   ├── [subModuleName].service.ts
    │   ├── [subModuleName].controller.ts
    │   ├── [subModuleName].route.ts
    │   └── [subModuleName].test.ts
    └── ...
```

### Example: Task Module Structure

```
src/modules/task.module/
│
├── task/
│   ├── task.constant.ts          ✅
│   ├── task.interface.ts         ✅
│   ├── task.model.ts             ✅
│   ├── task.validation.ts        ✅
│   ├── task.service.ts           ✅
│   ├── task.controller.ts        ✅
│   ├── task.route.ts             ✅
│   ├── task.middleware.ts        ✅
│   └── task.test.ts              ✅
│
├── subTask/                       # Sub-module
│   ├── subTask.constant.ts       ✅
│   ├── subTask.interface.ts      ✅
│   ├── subTask.model.ts          ✅
│   ├── subTask.validation.ts     ✅
│   ├── subTask.service.ts        ✅
│   ├── subTask.controller.ts     ✅
│   ├── subTask.route.ts          ✅
│   └── subTask.test.ts           ✅
│
├── subTaskProgress/               # Sub-module
│   └── ...
│
└── doc/
    ├── API_DOCUMENTATION.md
    ├── TASK_MODULE_ARCHITECTURE.md
    └── dia/
```

---

## 🚀 Step-by-Step Creation Process

### Phase 1: Planning (Before Coding)

#### Step 1.1: Define Module Purpose

Answer these questions:
- What problem does this module solve?
- What are the main entities?
- What are the relationships with other modules?
- Who are the users (roles)?
- What are the main operations (CRUD)?

**Example**: Task Module
```
Purpose: Manage tasks and subtasks for users
Entities: Task, SubTask, TaskProgress
Relationships: User (owner, assignee), Group, Notification
Roles: child, business, admin
Operations: Create, Read, Update, Delete, Complete, Assign
```

#### Step 1.2: Design Database Schema

Create ER diagram showing:
- Collections/Tables
- Fields with types
- Relationships (1:1, 1:M, M:M)
- Indexes

**Tool**: Use Mermaid in `doc/dia/[module]-schema.mermaid`

#### Step 1.3: Define API Endpoints

List all endpoints:
```
POST   /[module]              - Create
GET    /[module]              - Get all (with filters)
GET    /[module]/:id          - Get one
PATCH  /[module]/:id          - Update
DELETE /[module]/:id          - Delete
```

---

### Phase 2: Implementation (Coding)

#### Step 2.1: Create Module Folder Structure

```bash
# Navigate to modules directory
cd src/modules

# Create main module folder
mkdir [moduleName].module
cd [moduleName].module

# Create sub-folders
mkdir doc
mkdir doc/dia
mkdir [moduleName]  # Main module files

# Create files (use templates from Section 4)
touch [moduleName]/[moduleName].constant.ts
touch [moduleName]/[moduleName].interface.ts
touch [moduleName]/[moduleName].model.ts
touch [moduleName]/[moduleName].validation.ts
touch [moduleName]/[moduleName].service.ts
touch [moduleName]/[moduleName].controller.ts
touch [moduleName]/[moduleName].route.ts
touch [moduleName]/[moduleName].middleware.ts
touch [moduleName]/[moduleName].test.ts

# Create documentation
touch doc/API_DOCUMENTATION.md
touch doc/[MODULE]_ARCHITECTURE.md
```

---

#### Step 2.2: Implement Constants & Enums

**File**: `[moduleName].constant.ts`

**Purpose**: Centralized configuration, enums, and constants

**Template**:
```typescript
/**
 * [ModuleName] Module Constants
 * Centralized configuration for [moduleName]-related limits and defaults
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

/**
 * [ModuleName] Status Enum
 * Defines the status of [moduleName]
 */
export enum [ModuleName]Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * [ModuleName] Priority Enum
 * Determines urgency level
 */
export enum [ModuleName]Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Type exports from enums
 */
export type T[ModuleName]Status = `${[ModuleName]Status}`;
export type T[ModuleName]Priority = `${[ModuleName]Priority}`;

/**
 * [ModuleName] Limits Configuration
 */
export const [MODULE_NAME]_LIMITS = {
  /**
   * Maximum [moduleName] to keep per user
   */
  MAX_PER_USER: 1000,

  /**
   * Maximum title length
   */
  MAX_TITLE_LENGTH: 200,

  /**
   * Maximum description length
   */
  MAX_DESCRIPTION_LENGTH: 5000,

  /**
   * Days to keep completed [moduleName]
   */
  COMPLETED_RETENTION_DAYS: 90,
} as const;

/**
 * Cache Configuration for Redis
 */
export const [MODULE_NAME]_CACHE_CONFIG = {
  /**
   * Cache TTL for single [moduleName] (seconds)
   */
  DETAIL_TTL: 300, // 5 minutes

  /**
   * Cache TTL for [moduleName] list (seconds)
   */
  LIST_TTL: 60, // 1 minute

  /**
   * Cache key prefix
   */
  PREFIX: '[moduleName]',
} as const;
```

**Example**: `task.constant.ts`
```typescript
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
}

export enum TaskType {
  PERSONAL = 'personal',
  SINGLE_ASSIGNMENT = 'singleAssignment',
  COLLABORATIVE = 'collaborative',
}

export const TASK_LIMITS = {
  MAX_PER_USER: 1000,
  MAX_TITLE_LENGTH: 200,
  DAILY_LIMIT: 10,
} as const;

export const TASK_CACHE_CONFIG = {
  DETAIL_TTL: 300,
  LIST_TTL: 60,
  PREFIX: 'task',
} as const;
```

---

#### Step 2.3: Define TypeScript Interfaces

**File**: `[moduleName].interface.ts`

**Purpose**: Type safety and documentation

**Template**:
```typescript
/**
 * [ModuleName] Module Interfaces
 * TypeScript interfaces for type safety
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { Document, Types } from 'mongoose';
import { T[ModuleName]Status, T[ModuleName]Priority } from './[moduleName].constant';

/**
 * [ModuleName] Interface
 * Defines the structure of a [moduleName] document
 */
export interface I[ModuleName] {
  // ─── Basic Information ───────────────────────────────────────
  title: string;
  description?: string;
  
  // ─── Status & Priority ───────────────────────────────────────
  status: T[ModuleName]Status;
  priority: T[ModuleName]Priority;
  
  // ─── Relationships ───────────────────────────────────────────
  ownerUserId?: Types.ObjectId;
  createdById: Types.ObjectId;
  
  // ─── Timestamps ──────────────────────────────────────────────
  completedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * [ModuleName] Document
 * Mongoose document interface
 */
export interface I[ModuleName]Document extends I[ModuleName], Document {
  _id: Types.ObjectId;
  
  // Methods
  isCompleted(): boolean;
  canEdit(userId: string): boolean;
}

/**
 * [ModuleName] Creation Data
 * Data required to create a [moduleName]
 */
export interface I[ModuleName]CreateData {
  title: string;
  description?: string;
  status?: T[ModuleName]Status;
  priority?: T[ModuleName]Priority;
  ownerUserId?: string;
}

/**
 * [ModuleName] Update Data
 * Data allowed to update a [moduleName]
 */
export interface I[ModuleName]UpdateData {
  title?: string;
  description?: string;
  status?: T[ModuleName]Status;
  priority?: T[ModuleName]Priority;
  completedAt?: Date;
}

/**
 * [ModuleName] Query Options
 * Options for querying [moduleName]
 */
export interface I[ModuleName]QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  status?: T[ModuleName]Status;
  priority?: T[ModuleName]Priority;
  from?: Date;
  to?: Date;
}
```

---

#### Step 2.4: Create Mongoose Model

**File**: `[moduleName].model.ts`

**Purpose**: Database schema with validation and indexes

**Template**:
```typescript
/**
 * [ModuleName] Model
 * Mongoose schema and model for [moduleName]
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { Schema, model, Types } from 'mongoose';
import { I[ModuleName]Document } from './[moduleName].interface';
import { [ModuleName]Status, [ModuleName]Priority } from './[moduleName].constant';

/**
 * [ModuleName] Schema
 */
const [moduleName]Schema = new Schema<I[ModuleName]Document>(
  {
    // ─── Basic Information ───────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    
    // ─── Status & Priority ───────────────────────────────────────
    status: {
      type: String,
      enum: Object.values([ModuleName]Status),
      default: [ModuleName]Status.PENDING,
    },
    
    priority: {
      type: String,
      enum: Object.values([ModuleName]Priority),
      default: [ModuleName]Priority.MEDIUM,
    },
    
    // ─── Relationships ───────────────────────────────────────────
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },
    
    // ─── Timestamps ──────────────────────────────────────────────
    completedAt: {
      type: Date,
      required: false,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
    },
    
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
/**
 * Primary query: Get user's [moduleName]
 */
[moduleName]Schema.index(
  { ownerUserId: 1, createdAt: -1, isDeleted: false },
  { name: 'user_[moduleName]s_index' }
);

/**
 * Status-based queries
 */
[moduleName]Schema.index(
  { ownerUserId: 1, status: 1, isDeleted: false },
  { name: 'status_[moduleName]s_index' }
);

/**
 * Cleanup queries
 */
[moduleName]Schema.index(
  { createdAt: 1, isDeleted: false },
  { name: 'cleanup_index' }
);

// ─── Methods ─────────────────────────────────────────────────────
/**
 * Check if [moduleName] is completed
 */
[moduleName]Schema.methods.isCompleted = function(): boolean {
  return this.status === [ModuleName]Status.COMPLETED;
};

/**
 * Check if user can edit [moduleName]
 */
[moduleName]Schema.methods.canEdit = function(userId: string): boolean {
  return this.createdById.toString() === userId || this.ownerUserId?.toString() === userId;
};

// ─── Static Methods ──────────────────────────────────────────────
/**
 * Get [moduleName]s for user with pagination
 */
[moduleName]Schema.statics.getUser[ModuleName]s = async function(
  userId: Types.ObjectId,
  options: any
) {
  const query = {
    ownerUserId: userId,
    isDeleted: false,
  };
  
  if (options.status) {
    query['status'] = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 10)
    .skip((options.page - 1) * options.limit);
};

// ─── Middleware ──────────────────────────────────────────────────
/**
 * Pre-save middleware
 */
[moduleName]Schema.pre('save', function(next) {
  // Auto-set completedAt when status changes to COMPLETED
  if (this.isModified('status') && this.status === [ModuleName]Status.COMPLETED) {
    this.completedAt = new Date();
  }
  next();
});

// ─── Model Export ────────────────────────────────────────────────
export const [ModuleName] = model<I[ModuleName]Document>(
  '[moduleName]',
  [moduleName]Schema
);
```

---

#### Step 2.5: Create Validation Schemas

**File**: `[moduleName].validation.ts`

**Purpose**: Input validation with Zod

**Template**:
```typescript
/**
 * [ModuleName] Validation Schemas
 * Zod schemas for input validation
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { z } from 'zod';

/**
 * Create [ModuleName] Validation Schema
 */
export const create[ModuleName]ValidationSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: 'Title is required',
      })
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title cannot exceed 200 characters'),
    
    description: z
      .string()
      .max(5000, 'Description cannot exceed 5000 characters')
      .optional(),
    
    status: z
      .enum(['pending', 'inProgress', 'completed'])
      .default('pending')
      .optional(),
    
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .default('medium')
      .optional(),
    
    ownerUserId: z
      .string()
      .optional(),
  }),
});

/**
 * Update [ModuleName] Validation Schema
 */
export const update[ModuleName]ValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid [moduleName] ID'),
  }),
  body: z.object({
    title: z
      .string()
      .min(2)
      .max(200)
      .optional(),
    
    description: z
      .string()
      .max(5000)
      .optional(),
    
    status: z
      .enum(['pending', 'inProgress', 'completed'])
      .optional(),
    
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional(),
  }),
});

/**
 * Query [ModuleName] Validation Schema
 */
export const query[ModuleName]ValidationSchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform((val) => parseInt(val))
      .default('1')
      .optional(),
    
    limit: z
      .string()
      .transform((val) => parseInt(val))
      .default('10')
      .optional(),
    
    sortBy: z.string().default('-createdAt').optional(),
    
    status: z
      .enum(['pending', 'inProgress', 'completed'])
      .optional(),
    
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional(),
    
    from: z.string().optional(), // ISO date
    to: z.string().optional(),   // ISO date
  }),
});
```

---

#### Step 2.6: Implement Service Layer

**File**: `[moduleName].service.ts`

**Purpose**: Business logic, Redis caching, database operations

**Template**:
```typescript
/**
 * [ModuleName] Service
 * Handles business logic for [moduleName] operations
 *
 * Features:
 * - Redis caching for read operations
 * - Automatic cache invalidation on writes
 * - [Specific feature 1]
 * - [Specific feature 2]
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { [ModuleName] } from './[moduleName].model';
import { I[ModuleName], I[ModuleName]Document, I[ModuleName]QueryOptions } from './[moduleName].interface';
import ApiError from '../../errors/ApiError';
import { redisClient } from '../../helpers/redis/redis';
import { [MODULE_NAME]_CACHE_CONFIG } from './[moduleName].constant';
import { logger, errorLogger } from '../../shared/logger';
import { GenericService } from '../../_generic-module/generic.services';

export class [ModuleName]Service extends GenericService<typeof [ModuleName], I[ModuleName]Document> {
  constructor() {
    super([ModuleName]);
  }

  /**
   * Cache Key Generator
   */
  private getCacheKey(type: string, id?: string, userId?: string): string {
    const prefix = [MODULE_NAME]_CACHE_CONFIG.PREFIX;
    
    if (type === 'detail' && id) {
      return `${prefix}:detail:${id}`;
    }
    if (type === 'list' && userId) {
      return `${prefix}:user:${userId}:list`;
    }
    return `${prefix}:unknown`;
  }

  /**
   * Get from Cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(cachedData) as T;
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set in Cache
   */
  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      logger.debug(`Cached ${key} for ${ttl}s`);
    } catch (error) {
      errorLogger.error('Redis SET error:', error);
    }
  }

  /**
   * Invalidate Cache
   */
  private async invalidateCache(userId: string, [moduleName]Id?: string): Promise<void> {
    try {
      const keysToDelete = [
        this.getCacheKey('list', undefined, userId),
      ];

      if ([moduleName]Id) {
        keysToDelete.push(this.getCacheKey('detail', [moduleName]Id));
      }

      await redisClient.del(keysToDelete);
      logger.info(`Invalidated ${keysToDelete.length} cache keys for user ${userId}`);
    } catch (error) {
      errorLogger.error('Redis DELETE error:', error);
    }
  }

  /**
   * Create a new [moduleName]
   *
   * @param data - [ModuleName] data
   * @param userId - ID of the user creating
   * @returns Created [moduleName]
   */
  async create[ModuleName](
    data: Partial<I[ModuleName]>,
    userId: Types.ObjectId,
  ): Promise<I[ModuleName]Document> {
    // Validate data
    if (!data.title) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Title is required');
    }

    // Create [moduleName]
    const [moduleName] = await this.model.create({
      ...data,
      createdById: userId,
    });

    // Invalidate cache
    await this.invalidateCache(userId.toString(), [moduleName]._id.toString());

    return [moduleName];
  }

  /**
   * Get [moduleName] by ID with caching
   *
   * @param id - [ModuleName] ID
   * @returns [ModuleName] document
   */
  async get[ModuleName]ById(id: string): Promise<I[ModuleName]Document | null> {
    const cacheKey = this.getCacheKey('detail', id);

    // Try cache first
    const cached = await this.getFromCache<I[ModuleName]Document>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const [moduleName] = await this.model.findById(id);

    if ([moduleName]) {
      // Cache the result
      await this.setInCache(cacheKey, [moduleName], [MODULE_NAME]_CACHE_CONFIG.DETAIL_TTL);
    }

    return [moduleName];
  }

  /**
   * Get user's [moduleName]s with filtering
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of [moduleName]s
   */
  async getUser[ModuleName]s(
    userId: Types.ObjectId,
    options: I[ModuleName]QueryOptions,
  ): Promise<I[ModuleName]Document[]> {
    const cacheKey = this.getCacheKey('list', undefined, userId.toString());

    // Try cache first (only for first page)
    if (options.page === 1) {
      const cached = await this.getFromCache<I[ModuleName]Document[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build query
    const query: any = {
      ownerUserId: userId,
      isDeleted: false,
    };

    if (options.status) {
      query.status = options.status;
    }

    if (options.priority) {
      query.priority = options.priority;
    }

    // Query database
    const [moduleName]s = await this.model.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 10);

    // Cache first page
    if (options.page === 1) {
      await this.setInCache(cacheKey, [moduleName]s, [MODULE_NAME]_CACHE_CONFIG.LIST_TTL);
    }

    return [moduleName]s;
  }

  /**
   * Update [moduleName]
   *
   * @param id - [ModuleName] ID
   * @param userId - User ID (for validation)
   * @param data - Update data
   * @returns Updated [moduleName]
   */
  async update[ModuleName](
    id: string,
    userId: string,
    data: Partial<I[ModuleName]>,
  ): Promise<I[ModuleName]Document | null> {
    const [moduleName] = await this.model.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (![moduleName]) {
      throw new ApiError(StatusCodes.NOT_FOUND, '[ModuleName] not found');
    }

    // Check permission
    if (![moduleName].canEdit(userId)) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to edit this [moduleName]');
    }

    // Update
    Object.assign([moduleName], data);
    await [moduleName].save();

    // Invalidate cache
    await this.invalidateCache(userId, id);

    return [moduleName];
  }

  /**
   * Delete [moduleName] (soft delete)
   *
   * @param id - [ModuleName] ID
   * @param userId - User ID
   * @returns Deleted [moduleName]
   */
  async delete[ModuleName](id: string, userId: string): Promise<I[ModuleName]Document | null> {
    const [moduleName] = await this.model.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (![moduleName]) {
      throw new ApiError(StatusCodes.NOT_FOUND, '[ModuleName] not found');
    }

    // Invalidate cache
    await this.invalidateCache(userId, id);

    return [moduleName];
  }
}
```

---

#### Step 2.7: Implement Controller Layer

**File**: `[moduleName].controller.ts`

**Purpose**: HTTP request handlers

**Template**:
```typescript
/**
 * [ModuleName] Controller
 * Handles HTTP requests for [moduleName] operations
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { [ModuleName]Service } from './[moduleName].service';
import { I[ModuleName]QueryOptions } from './[moduleName].interface';
import { Types } from 'mongoose';

const service = new [ModuleName]Service();

/**
 * Create [ModuleName]
 * POST /[moduleName]
 */
const create[ModuleName] = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).userId;
  const data = req.body;

  const result = await service.create[ModuleName](data, new Types.ObjectId(userId));

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: '[ModuleName] created successfully',
    data: result,
    success: true,
  });
});

/**
 * Get [ModuleName] by ID
 * GET /[moduleName]/:id
 */
const get[ModuleName]ById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await service.get[ModuleName]ById(id);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: '[ModuleName] retrieved successfully',
    data: result,
    success: true,
  });
});

/**
 * Get User's [ModuleName]s
 * GET /[moduleName]
 */
const getUser[ModuleName]s = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).userId;
  
  const options: I[ModuleName]QueryOptions = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    sortBy: req.query.sortBy as string || '-createdAt',
    status: req.query.status as any,
    priority: req.query.priority as any,
  };

  const result = await service.getUser[ModuleName]s(new Types.ObjectId(userId), options);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: '[ModuleName]s retrieved successfully',
    data: result,
    success: true,
  });
});

/**
 * Update [ModuleName]
 * PATCH /[moduleName]/:id
 */
const update[ModuleName] = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.user as any).userId;
  const data = req.body;

  const result = await service.update[ModuleName](id, userId, data);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: '[ModuleName] updated successfully',
    data: result,
    success: true,
  });
});

/**
 * Delete [ModuleName]
 * DELETE /[moduleName]/:id
 */
const delete[ModuleName] = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.user as any).userId;

  const result = await service.delete[ModuleName](id, userId);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: '[ModuleName] deleted successfully',
    data: result,
    success: true,
  });
});

export const [ModuleName]Controller = {
  create[ModuleName],
  get[ModuleName]ById,
  getUser[ModuleName]s,
  update[ModuleName],
  delete[ModuleName],
};
```

---

#### Step 2.8: Create Routes

**File**: `[moduleName].route.ts`

**Purpose**: API route definitions with rate limiting and middleware

**Template**:
```typescript
/**
 * [ModuleName] Routes
 * API route definitions for [moduleName] operations
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import express from 'express';
import { [ModuleName]Controller } from './[moduleName].controller';
import auth from '../../middlewares/auth';
import { TRole } from '../../middlewares/roles';
import validateRequest from '../../shared/validateRequest';
import * as validation from './[moduleName].validation';
import { rateLimiter } from '../../middlewares/rateLimiterRedis';

const router = express.Router();

// ─── Rate Limiters ───────────────────────────────────────────────
/**
 * Rate limiters using centralized rateLimiter with Redis
 */
const create[ModuleName]Limiter = rateLimiter('strict');  // 10 per hour
const [moduleName]Limiter = rateLimiter('user');          // 30 per minute

/*-─────────────────────────────────
|  [Role] | [ModuleName] | [Flow Diagram] | Create [moduleName]
|  @desc Create a new [moduleName]
|  @auth [Required role]
|  @rateLimit [Limit]
└──────────────────────────────────*/
router.post(
  '/',
  auth(TRole.[role]),
  create[ModuleName]Limiter,
  validateRequest(validation.create[ModuleName]ValidationSchema),
  [ModuleName]Controller.create[ModuleName],
);

/*-─────────────────────────────────
|  [Role] | [ModuleName] | [Flow Diagram] | Get all [moduleName]s
|  @desc Get all [moduleName]s with pagination
|  @auth [Required role]
|  @rateLimit [Limit]
└──────────────────────────────────*/
router.get(
  '/',
  auth(TRole.[role]),
  [moduleName]Limiter,
  validateRequest(validation.query[ModuleName]ValidationSchema),
  [ModuleName]Controller.getUser[ModuleName]s,
);

/*-─────────────────────────────────
|  [Role] | [ModuleName] | [Flow Diagram] | Get [moduleName] by ID
|  @desc Get [moduleName] details by ID
|  @auth [Required role]
|  @rateLimit [Limit]
└──────────────────────────────────*/
router.get(
  '/:id',
  auth(TRole.[role]),
  [moduleName]Limiter,
  [ModuleName]Controller.get[ModuleName]ById,
);

/*-─────────────────────────────────
|  [Role] | [ModuleName] | [Flow Diagram] | Update [moduleName]
|  @desc Update [moduleName] details
|  @auth [Required role]
|  @rateLimit [Limit]
└──────────────────────────────────*/
router.patch(
  '/:id',
  auth(TRole.[role]),
  [moduleName]Limiter,
  validateRequest(validation.update[ModuleName]ValidationSchema),
  [ModuleName]Controller.update[ModuleName],
);

/*-─────────────────────────────────
|  [Role] | [ModuleName] | [Flow Diagram] | Delete [moduleName]
|  @desc Delete [moduleName] (soft delete)
|  @auth [Required role]
|  @rateLimit [Limit]
└──────────────────────────────────*/
router.delete(
  '/:id',
  auth(TRole.[role]),
  [moduleName]Limiter,
  [ModuleName]Controller.delete[ModuleName],
);

export const [ModuleName]Routes = router;
```

---

#### Step 2.9: Create Middleware (Optional)

**File**: `[moduleName].middleware.ts`

**Purpose**: Custom middleware for validation, permissions, etc.

**Template**:
```typescript
/**
 * [ModuleName] Middleware
 * Custom middleware for [moduleName] operations
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { StatusCodes } from 'http-status-codes';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import ApiError from '../../errors/ApiError';
import { [ModuleName] } from './[moduleName].model';

/**
 * Verify [ModuleName] Access
 * Checks if user has permission to access [moduleName]
 */
export const verify[ModuleName]Access = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  const userId = (req.user as any).userId;

  const [moduleName] = await [ModuleName].findOne({
    _id: new Types.ObjectId(id),
    isDeleted: false,
  });

  if (![moduleName]) {
    throw new ApiError(StatusCodes.NOT_FOUND, '[ModuleName] not found');
  }

  // Check permission
  const hasPermission = [moduleName].canEdit(userId);
  if (!hasPermission) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You do not have permission to access this [moduleName]'
    );
  }

  next();
};

/**
 * Validate [ModuleName] Status Transition
 * Ensures status changes follow valid transitions
 */
export const validateStatusTransition = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { status } = req.body;
  const currentStatus = (req as any).currentStatus;

  // Define valid transitions
  const validTransitions: Record<string, string[]> = {
    pending: ['inProgress', 'cancelled'],
    inProgress: ['completed', 'cancelled'],
    completed: [],
    cancelled: ['pending'],
  };

  if (status && !validTransitions[currentStatus]?.includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot transition from ${currentStatus} to ${status}`
    );
  }

  next();
};
```

---

#### Step 2.10: Create Test Suite

**File**: `[moduleName].test.ts`

**Purpose**: Comprehensive integration tests

**Template**: See existing test files (auth.test.ts, task.test.ts, etc.)

---

#### Step 2.11: Create Documentation

**Files**:
- `doc/API_DOCUMENTATION.md` - Complete API reference
- `doc/[MODULE]_ARCHITECTURE.md` - Architecture guide
- `doc/dia/[moduleName]-schema.mermaid` - ER diagram
- `doc/dia/[moduleName]-flow.mermaid` - Flow diagram

---

### Phase 3: Integration

#### Step 3.1: Register Routes

**File**: `src/routes/index.ts`

```typescript
import { [ModuleName]Routes } from '../modules/[moduleName].module/[moduleName]/[moduleName].route';

// Register routes
app.use('/api/v1/[moduleName]s', [ModuleName]Routes);
```

---

#### Step 3.2: Register in App Module (Optional)

If using module-based architecture:

```typescript
// src/modules/index.ts
export { [ModuleName]Routes } from './[moduleName].module/[moduleName]/[moduleName].route';
```

---

#### Step 3.3: Update Environment Variables

**File**: `.env.example`

```bash
# [ModuleName] Module
[MODULE_NAME]_CACHE_TTL=300
[MODULE_NAME]_LIST_CACHE_TTL=60
[MODULE_NAME]_DAILY_LIMIT=10
```

---

## ✅ Best Practices

### 1. Naming Conventions

```typescript
// Files: kebab-case
task.service.ts
task.controller.ts

// Classes: PascalCase
export class TaskService {}

// Interfaces: PascalCase with I prefix
export interface ITask {}

// Enums: PascalCase
export enum TaskStatus {}

// Constants: UPPER_SNAKE_CASE
export const TASK_LIMITS = {}

// Variables: camelCase
const userId = '123';

// Functions: camelCase
async function createTask() {}
```

---

### 2. Error Handling

```typescript
// ✅ GOOD: Use ApiError
throw new ApiError(StatusCodes.BAD_REQUEST, 'Title is required');

// ❌ BAD: Generic errors
throw new Error('Something went wrong');
```

---

### 3. Logging

```typescript
// ✅ GOOD: Structured logging
logger.info(`Task created: ${task._id}`);
errorLogger.error('Redis error:', error);

// ❌ BAD: Console.log
console.log('Task created');
```

---

### 4. Caching

```typescript
// ✅ GOOD: Cache with TTL
await redisClient.setEx(key, 300, JSON.stringify(data));

// ❌ BAD: No TTL
await redisClient.set(key, JSON.stringify(data));
```

---

### 5. Validation

```typescript
// ✅ GOOD: Validate all inputs
validateRequest(validation.createTaskValidationSchema)

// ❌ BAD: No validation
router.post('/', controller.create)
```

---

## 📋 Module Creation Checklist

### Before Starting
- [ ] Define module purpose
- [ ] Design database schema
- [ ] Define API endpoints
- [ ] Identify relationships

### Implementation
- [ ] Create folder structure
- [ ] Create constants/enums
- [ ] Create interfaces
- [ ] Create Mongoose model
- [ ] Create validation schemas
- [ ] Implement service layer
- [ ] Implement controller layer
- [ ] Create routes
- [ ] Create middleware (if needed)
- [ ] Create test suite
- [ ] Create documentation

### Integration
- [ ] Register routes
- [ ] Update .env.example
- [ ] Add to module index
- [ ] Test locally
- [ ] Run tests
- [ ] Review code

### Documentation
- [ ] API documentation
- [ ] Architecture guide
- [ ] ER diagrams
- [ ] Flow diagrams
- [ ] Update README

---

## 📚 Examples

### Example 1: Simple Module (Token)

```
token/
├── token.constant.ts
├── token.interface.ts
├── token.model.ts
├── token.service.ts
└── token.test.ts
```

**Characteristics**:
- No controller (internal use only)
- No routes (service only)
- Simple CRUD
- Redis caching

---

### Example 2: Medium Module (Auth)

```
auth/
├── auth.constant.ts
├── auth.interface.ts
├── auth.service.ts
├── auth.controller.ts
├── auth.routes.ts
├── auth.validations.ts
└── auth.test.ts
```

**Characteristics**:
- Full CRUD
- Complex business logic
- OAuth integration
- OTP with Redis
- JWT tokens

---

### Example 3: Complex Module (Task)

```
task.module/
├── task/
│   ├── task.constant.ts
│   ├── task.interface.ts
│   ├── task.model.ts
│   ├── task.validation.ts
│   ├── task.service.ts
│   ├── task.controller.ts
│   ├── task.route.ts
│   ├── task.middleware.ts
│   └── task.test.ts
│
├── subTask/
│   └── ... (same structure)
│
├── subTaskProgress/
│   └── ... (same structure)
│
└── doc/
    ├── API_DOCUMENTATION.md
    └── dia/
```

**Characteristics**:
- Multiple sub-modules
- Complex relationships
- Redis caching
- BullMQ queues
- Real-time updates
- Permissions system

---

**Created**: 26-03-23  
**Author**: Senior Engineering Team  
**Status**: ✅ Production Ready  
**Version**: 1.0.0

---

**Ready to build senior-level modules! 🚀**

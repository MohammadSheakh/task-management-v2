# 🛡️ Senior-Level Module Patterns Guide

**Version**: 1.0.0  
**Date**: 26-03-23  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Rate Limiting Patterns](#rate-limiting-patterns)
2. [BullMQ Queue Patterns](#bullmq-queue-patterns)
3. [Testing Patterns](#testing-patterns)
4. [Error Handling Patterns](#error-handling-patterns)
5. [Logging Patterns](#logging-patterns)
6. [Permission Patterns](#permission-patterns)

---

## 🚦 Rate Limiting Patterns

### Overview

Rate limiting prevents abuse and ensures fair usage. Our system uses **Redis-based rate limiting** for distributed environments.

### Rate Limiter Configuration

**File**: `src/middlewares/rateLimiterRedis.ts`

```typescript
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../helpers/redis/redis';

/**
 * Centralized Rate Limiter Factory
 * 
 * @param type - Type of rate limiter
 * @returns Rate limit middleware
 */
export const rateLimiter = (type: RateLimitType) => {
  const config = RATE_LIMIT_CONFIG[type];
  
  return rateLimit({
    store: new RedisStore({
      // @ts-ignore
      client: redisClient,
      prefix: `ratelimit:${type}:`,
    }),
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      message: `Too many requests, please try again after ${config.windowMs / 60000} minutes`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Rate Limit Configuration
 */
const RATE_LIMIT_CONFIG = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
  },
  strict: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests
  },
  user: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests
  },
};

type RateLimitType = 'auth' | 'strict' | 'user' | 'api';
```

### Usage in Routes

```typescript
// ─── Rate Limiters ───────────────────────────────────────────────
const loginLimiter = rateLimiter('auth');        // 5 per 15 min
const createLimiter = rateLimiter('strict');     // 10 per hour
const taskLimiter = rateLimiter('user');         // 30 per min
const apiLimiter = rateLimiter('api');           // 100 per min

// Login route (strict)
router.post('/login', loginLimiter, controller.login);

// Create task (prevent spam)
router.post('/tasks', createLimiter, controller.createTask);

// Get tasks (more lenient)
router.get('/tasks', taskLimiter, controller.getTasks);

// General API
router.get('/tasks/:id', apiLimiter, controller.getTaskById);
```

### Best Practices

```typescript
// ✅ GOOD: Different limits for different operations
const createLimiter = rateLimiter('strict');  // Write operations
const readLimiter = rateLimiter('user');      // Read operations

// ✅ GOOD: Stricter limits for auth
const loginLimiter = rateLimiter('auth');     // 5 attempts
const registerLimiter = rateLimiter('strict'); // 10 per hour

// ❌ BAD: Same limiter for everything
const limiter = rateLimiter('api');
router.post('/login', limiter, controller.login); // Too lenient!
```

---

## 🟡 BullMQ Queue Patterns

### Overview

BullMQ provides async processing for heavy operations, scheduled tasks, and background jobs.

### Queue Configuration

**File**: `src/helpers/bullmq/bullmq.ts`

```typescript
import { Queue, Worker } from 'bullmq';
import { redisClient } from '../redis/redis';

/**
 * Queue Configuration
 */
const queueConfig = {
  connection: redisClient.options,
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds base delay
    },
    removeOnComplete: {
      age: 3600, // Remove after 1 hour
    },
    removeOnFail: {
      age: 86400, // Remove failed after 24 hours
    },
  },
};

/**
 * Create Queue
 */
export const notificationQueue = new Queue(
  'notifications-queue',
  queueConfig
);

export const taskRemindersQueue = new Queue(
  'task-reminders-queue',
  queueConfig
);

export const emailQueue = new Queue(
  'notification-emails-queue',
  queueConfig
);
```

### Worker Implementation

```typescript
/**
 * Start Notification Worker
 */
export const startNotificationWorker = () => {
  const worker = new Worker(
    'notifications-queue',
    async (job) => {
      const { notificationId, channels, receiverId } = job.data;
      
      logger.info(`Processing notification ${notificationId}`);
      
      try {
        // Process each channel
        for (const channel of channels) {
          switch (channel) {
            case 'in_app':
              await sendInApp(notificationId, receiverId);
              break;
            case 'email':
              await sendEmail(notificationId, receiverId);
              break;
            case 'push':
              await sendPush(notificationId, receiverId);
              break;
          }
        }
        
        logger.info(`✅ Notification ${notificationId} sent`);
      } catch (error) {
        errorLogger.error(`Notification failed:`, error);
        throw error; // Trigger retry
      }
    },
    {
      connection: redisClient.options,
      concurrency: 10, // Process 10 jobs simultaneously
    }
  );
  
  // Event handlers
  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });
  
  worker.on('failed', (job, err) => {
    errorLogger.error(`Job ${job?.id} failed:`, err);
  });
  
  worker.on('error', (err) => {
    errorLogger.error('Worker error:', err);
  });
};
```

### Adding Jobs to Queue

```typescript
/**
 * Queue Notification for Async Processing
 */
async queueNotification(notification: INotification): Promise<void> {
  try {
    await notificationQueue.add(
      'sendNotification',
      {
        notificationId: notification._id.toString(),
        receiverId: notification.receiverId?.toString(),
        channels: notification.channels,
        priority: notification.priority,
      },
      {
        delay: notification.scheduledFor
          ? notification.scheduledFor.getTime() - Date.now()
          : 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
    
    logger.info(`📧 Notification queued: ${notification._id}`);
  } catch (error) {
    errorLogger.error('Failed to queue notification:', error);
    // Don't throw - notification is still valid
  }
}
```

### Scheduled Jobs

```typescript
/**
 * Schedule Task Reminder
 */
async scheduleReminder(
  reminderId: string,
  reminderTime: Date,
  taskId: string,
  userId: string,
): Promise<void> {
  const delay = reminderTime.getTime() - Date.now();
  
  await taskRemindersQueue.add(
    'processReminder',
    {
      reminderId,
      taskId,
      userId,
    },
    {
      delay, // Execute at reminderTime
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );
  
  logger.info(`⏰ Reminder scheduled for ${reminderTime}`);
}
```

### Monitoring Queues

```typescript
/**
 * Get Queue Statistics
 */
async getQueueStats(queue: Queue) {
  const jobCounts = await queue.getJobCounts();
  
  return {
    waiting: jobCounts.waiting,
    active: jobCounts.active,
    completed: jobCounts.completed,
    failed: jobCounts.failed,
    delayed: jobCounts.delayed,
  };
}

// Usage
const stats = await getQueueStats(notificationQueue);
logger.info('Queue stats:', stats);
// { waiting: 5, active: 2, completed: 100, failed: 1, delayed: 3 }
```

---

## 🧪 Testing Patterns

### Test Structure

```typescript
describe('[ModuleName] Module Tests', () => {
  // Setup
  beforeAll(async () => {
    await mongoose.connect(testDbUrl);
    await redisClient.connect();
    await cleanupDatabase();
  });

  // Teardown
  afterAll(async () => {
    await cleanupDatabase();
    await mongoose.connection.close();
    await redisClient.quit();
  });

  // Reset state
  beforeEach(async () => {
    const keys = await redisClient.keys('*');
    if (keys.length > 0) await redisClient.del(keys);
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  // Tests
  describe('POST /[module]', () => {
    it('should create successfully', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      const data = createTestData();

      // Act
      const response = await request(app)
        .post('/api/v1/[module]')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
```

### Test Data Generators

```typescript
/**
 * Generate unique email
 */
const generateUniqueEmail = () => 
  `test.${Date.now()}@example.com`;

/**
 * Generate unique name
 */
const generateUniqueName = (prefix = 'Test') => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create test user helper
 */
const createTestUser = async (role = 'child') => {
  const email = generateUniqueEmail();
  const profile = await UserProfile.create({ acceptTOC: true });
  
  const user = await User.create({
    email,
    password: 'TestPassword123!',
    name: generateUniqueName(),
    role,
    profileId: profile._id,
    isEmailVerified: true,
  });
  
  return { user, profile };
};

/**
 * Create test data helper
 */
const createTestData = (overrides = {}) => ({
  title: generateUniqueName('Task'),
  description: 'Test description',
  status: 'pending',
  priority: 'medium',
  ...overrides,
});
```

### Test Scenarios

```typescript
describe('CRUD Operations', () => {
  it('should create successfully');
  it('should get by id');
  it('should get all with pagination');
  it('should update');
  it('should delete (soft)');
});

describe('Validation', () => {
  it('should reject invalid data');
  it('should reject duplicate');
  it('should reject missing required fields');
});

describe('Permissions', () => {
  it('should allow owner');
  it('should allow assigned user');
  it('should reject unauthorized');
});

describe('Caching', () => {
  it('should cache after retrieval');
  it('should invalidate after update');
  it('should invalidate after delete');
});
```

---

## ⚠️ Error Handling Patterns

### ApiError Class

**File**: `src/errors/ApiError.ts`

```typescript
class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
```

### Usage in Service

```typescript
async getTaskById(id: string): Promise<ITask | null> {
  // Validation
  if (!id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Task ID is required');
  }

  // Not found
  const task = await this.model.findById(id);
  if (!task) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
  }

  // Permission
  if (!task.canEdit(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You do not have permission to access this task'
    );
  }

  return task;
}
```

### Global Error Handler

**File**: `src/middlewares/globalErrorHandler.ts`

```typescript
const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Operational errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Unknown errors
  errorLogger.error('Unknown error:', err);
  
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

export default globalErrorHandler;
```

---

## 📝 Logging Patterns

### Winston Logger Setup

**File**: `src/shared/logger.ts`

```typescript
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    // Console
    new winston.transports.Console(),
    
    // Daily rotating file
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

export { logger, errorLogger };
```

### Usage

```typescript
// Info logging
logger.info(`Task created: ${task._id}`);

// Debug logging
logger.debug(`Cache hit for key: ${cacheKey}`);

// Error logging
try {
  await riskyOperation();
} catch (error) {
  errorLogger.error('Risky operation failed:', error);
  throw error;
}

// With metadata
logger.info('User logged in', {
  userId: user._id,
  email: user.email,
  timestamp: new Date(),
});
```

---

## 🔐 Permission Patterns

### Role-Based Access Control

**File**: `src/middlewares/auth.ts`

```typescript
const auth = (...roles: TRole[]) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Get token
    const tokenWithBearer = req.headers.authorization;
    if (!tokenWithBearer) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }

    // Verify token
    const verifyUser = await TokenService.verifyToken(
      tokenWithBearer.split(' ')[1],
      config.jwt.accessSecret as Secret,
      TokenType.ACCESS
    );

    req.user = verifyUser;

    // Check role
    if (roles.length) {
      const userRole = roleRights.get(verifyUser?.role);
      const hasRole = userRole?.some(role => roles.includes(role));
      
      if (!hasRole) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          `You don't have permission to access this API`
        );
      }
    }

    next();
  });
```

### Usage in Routes

```typescript
// Business user only
router.get('/dashboard', auth(TRole.business), controller.dashboard);

// Common user (child or business)
router.get('/tasks', auth(TRole.commonUser), controller.getTasks);

// Admin only
router.delete('/admin/:id', auth(TRole.admin), controller.delete);

// Any authenticated user
router.get('/profile', auth(TRole.common), controller.profile);
```

### Resource-Based Permissions

```typescript
// In model
taskSchema.methods.canEdit = function(userId: string): boolean {
  return (
    this.createdById.toString() === userId ||
    this.ownerUserId?.toString() === userId
  );
};

// In service
async updateTask(id: string, userId: string, data: any) {
  const task = await this.model.findById(id);
  
  if (!task.canEdit(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You do not have permission to edit this task'
    );
  }
  
  return await this.model.findByIdAndUpdate(id, data, { new: true });
}
```

---

**Created**: 26-03-23  
**Author**: Senior Engineering Team  
**Status**: ✅ Production Ready  
**Version**: 1.0.0

---

**Master these patterns for senior-level development! 🚀**

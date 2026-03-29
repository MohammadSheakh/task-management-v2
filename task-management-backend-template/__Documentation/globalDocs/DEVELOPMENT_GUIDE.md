# 🛠️ Development Guide

**Version**: 1.0  
**Last Updated**: 08-03-26  
**Status**: ✅ Production Ready

---

## 🎯 Overview

This guide covers development workflows, coding standards, best practices, and tools for developing the Task Management Backend system.

---

## 📋 Table of Contents

1. [Development Setup](#development-setup)
2. [Coding Standards](#coding-standards)
3. [Git Workflow](#git-workflow)
4. [Testing Strategy](#testing-strategy)
5. [Debugging](#debugging)
6. [Code Review](#code-review)
7. [Module Development](#module-development)
8. [API Development](#api-development)

---

## 💻 Development Setup

### IDE Setup

**Recommended**: VS Code

**Required Extensions**:
```bash
# Essential
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- TypeScript (vscode.typescript-language-features)

# Recommended
- MongoDB for VS Code (mongodb.mongodb-vscode)
- Thunder Client (rangav.vscode-thunder-client)
- GitLens (eamodio.gitlens)
- Mermaid Markdown Syntax (bpruitt-goddard.mermaid-markdown-syntax-highlighting)
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

---

## 📝 Coding Standards

### TypeScript Standards

#### 1. Use Explicit Types

```typescript
// ✅ Good
const getUserById = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  return user;
};

// ❌ Bad
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  return user;
};
```

#### 2. No `any` Type

```typescript
// ✅ Good
interface ITask {
  _id: Types.ObjectId;
  title: string;
  status: TTaskStatus;
}

// ❌ Bad
interface ITask {
  _id: any;
  title: any;
  status: any;
}
```

#### 3. Use `const` Over `let`

```typescript
// ✅ Good
const MAX_TASKS = 50;
const user = await User.findById(id);

// ❌ Bad
let MAX_TASKS = 50;
let user = await User.findById(id);
```

#### 4. Explicit Return Types on Functions

```typescript
// ✅ Good
async function createTask(data: ITaskData): Promise<ITask> {
  return await Task.create(data);
}

// ❌ Bad
async function createTask(data) {
  return await Task.create(data);
}
```

### File Naming Conventions

```typescript
// Interfaces
user.interface.ts
task.interface.ts

// Constants
task.constant.ts
notification.constant.ts

// Services
task.service.ts
user.service.ts

// Controllers
task.controller.ts
user.controller.ts

// Routes
task.route.ts
user.route.ts

// Models
task.model.ts
user.model.ts

// Validation
task.validation.ts
user.validation.ts
```

### Code Organization

```typescript
// 1. Imports (grouped by type)
import { StatusCodes } from 'http-status-codes';
import { Task } from './task.model';
import { ITask } from './task.interface';
import { GenericService } from '../../_generic-module/generic.services';
import ApiError from '../../../errors/ApiError';
import { Types } from 'mongoose';

// 2. Constants
const DAILY_TASK_LIMIT = 50;

// 3. Class/Function Definition
export class TaskService extends GenericService<typeof Task, ITask> {
  // Implementation
}
```

---

## 🌿 Git Workflow

### Branch Naming

```bash
# Format: <type>/<description>
feature/add-task-analytics
bugfix/fix-notification-cache
hotfix/critical-security-fix
refactor/improve-query-performance
docs/update-api-documentation
```

### Commit Message Format

```bash
# Format: <type>(<scope>): <description>

# Examples
feat(task): add daily progress endpoint
fix(notification): fix redis cache invalidation
docs(api): update authentication docs
refactor(analytics): improve aggregation performance
test(group): add member management tests
```

### Pull Request Process

```bash
# 1. Create feature branch
git checkout -b feature/add-task-analytics

# 2. Make changes and commit
git add .
git commit -m "feat(task): add daily progress endpoint"

# 3. Push to remote
git push origin feature/add-task-analytics

# 4. Create Pull Request
# - Title: Follow commit message format
# - Description: What, Why, How
# - Reviewers: At least 1 team member
# - Labels: feature, bugfix, etc.

# 5. Address review comments
# 6. Merge after approval
```

---

## 🧪 Testing Strategy

### Test File Structure

```typescript
// task.service.test.ts
import { TaskService } from './task.service';
import { Task } from './task.model';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
  });

  describe('createTask', () => {
    it('should create task with valid data', async () => {
      // Arrange
      const taskData = {
        title: 'Test Task',
        taskType: 'personal',
        startTime: new Date()
      };

      // Act
      const task = await taskService.createTask(taskData, userId);

      // Assert
      expect(task).toBeDefined();
      expect(task.title).toBe('Test Task');
    });

    it('should reject task if daily limit exceeded', async () => {
      // Test implementation
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- task.service.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test suite
npm test -- -t "createTask"
```

### Test Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| **Lines** | 80% | 90% |
| **Functions** | 80% | 90% |
| **Branches** | 70% | 85% |
| **Statements** | 80% | 90% |

---

## 🐛 Debugging

### Debug Mode

```bash
# Start with debug logging
NODE_ENV=development npm run dev

# Enable detailed logging
DEBUG=* npm run dev
```

### Common Debugging Scenarios

#### 1. Database Query Issues

```typescript
// Enable query logging
mongoose.set('debug', true);

// Or log specific queries
const tasks = await Task.find({ userId });
console.log('Query result:', tasks);
```

#### 2. Redis Cache Issues

```typescript
// Log cache operations
const cached = await redisClient.get(key);
console.log('Cache hit:', cached ? 'YES' : 'NO');

// Check cache key format
console.log('Cache key:', key);
```

#### 3. API Request Issues

```typescript
// Log request details
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});
```

### Using VS Code Debugger

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "nodemon",
      "restart": true,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## 🔍 Code Review

### Review Checklist

#### Code Quality
- [ ] Follows TypeScript standards
- [ ] No `any` types used
- [ ] Explicit return types
- [ ] Proper error handling
- [ ] No console.log in production code

#### Testing
- [ ] Tests written for new features
- [ ] Test coverage > 80%
- [ ] Edge cases covered
- [ ] Tests passing

#### Documentation
- [ ] Code comments for complex logic
- [ ] API documentation updated
- [ ] README updated if needed

#### Security
- [ ] Input validation added
- [ ] Authentication checks in place
- [ ] No sensitive data logged
- [ ] SQL/NoSQL injection prevented

### Review Response Time

| Priority | Response Time |
|----------|---------------|
| **Critical** | < 4 hours |
| **High** | < 24 hours |
| **Medium** | < 48 hours |
| **Low** | < 1 week |

---

## 📦 Module Development

### Creating a New Module

```bash
# 1. Create module folder
mkdir -p src/modules/new-module/{doc/dia,doc/perf}

# 2. Create standard files
touch src/modules/new-module/new-module.{interface,constant,model,service,controller,route,validation}.ts

# 3. Update main router
# Add to src/routes/index.ts

# 4. Create documentation
# Add to doc/ folder
```

### Module Structure Template

```typescript
// new-module.interface.ts
import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';

export interface INewModule {
  _id?: Types.ObjectId;
  // ... fields
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INewModuleModel extends Model<INewModule> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<INewModule>>;
}
```

```typescript
// new-module.constant.ts
export const NEW_MODULE_CONFIG = {
  MAX_LIMIT: 100,
  CACHE_TTL: 300,
} as const;
```

```typescript
// new-module.service.ts
import { GenericService } from '../../_generic-module/generic.services';
import { NewModule } from './new-module.model';
import { INewModule } from './new-module.interface';

export class NewModuleService extends GenericService<typeof NewModule, INewModule> {
  constructor() {
    super(NewModule);
  }

  // Custom methods
  async customMethod(data: any): Promise<any> {
    // Implementation
  }
}
```

---

## 📡 API Development

### Creating New Endpoint

```typescript
// 1. Add route (task.route.ts)
/*-─────────────────────────────────
|  User | 01-01 | Create a new task
|  @module Task
|  @figmaIndex 01-01
|  @desc Create personal, single assignment, or collaborative task
└──────────────────────────────────*/
router.route('/').post(
  auth(TRole.commonUser),
  validateRequest(validation.createTaskValidationSchema),
  controller.create
);

// 2. Add controller method (task.controller.ts)
create = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const taskData = req.body;

  const task = await this.taskService.createTask(taskData, userId);

  sendResponse(res, {
    code: StatusCodes.CREATED,
    data: task,
    message: 'Task created successfully',
    success: true,
  });
});

// 3. Add service method (task.service.ts)
async createTask(data: Partial<ITask>, userId: Types.ObjectId): Promise<ITask> {
  // Business logic
  const task = await this.model.create({
    ...data,
    createdById: userId,
  });

  return task;
}

// 4. Add validation (task.validation.ts)
export const createTaskValidationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  taskType: z.enum(['personal', 'singleAssignment', 'collaborative']),
  startTime: z.date(),
});
```

### API Versioning

```typescript
// Current version: v1
// Base URL: /v1

// Future versions:
// /v2/tasks
// /v3/tasks
```

### Error Handling

```typescript
// Custom error class
class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Usage
if (!user) {
  throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
}
```

---

## 📊 Performance Best Practices

### Database Queries

```typescript
// ✅ Good: Use .lean() and select
const tasks = await Task.find({ userId })
  .select('title status startTime')
  .lean();

// ❌ Bad: Fetch entire documents
const tasks = await Task.find({ userId });
```

### Caching

```typescript
// ✅ Good: Cache-aside pattern
async getTaskById(id: string) {
  const cacheKey = `task:${id}:detail`;
  const cached = await redisClient.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const task = await Task.findById(id).lean();
  await redisClient.setEx(cacheKey, 300, JSON.stringify(task));
  
  return task;
}
```

### Aggregation

```typescript
// ✅ Good: Use indexes and limit
const stats = await Task.aggregate([
  { $match: { userId, isDeleted: false } },
  { $group: { _id: '$status', count: { $sum: 1 } } },
  { $limit: 10 }
]);
```

---

## 🔗 Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [API Overview](./API_OVERVIEW.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Complete

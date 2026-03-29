# 📚 Express → NestJS Migration Guide

**Learn NestJS by comparing with Express.js patterns**

---

## 🎯 **Why Migrate?**

| Aspect | Express.js | NestJS |
|--------|-----------|--------|
| **Structure** | Flexible, unstructured | Opinionated, modular |
| **Dependency Injection** | Manual | Automatic |
| **TypeScript** | Optional | First-class |
| **Testing** | Manual setup | Built-in support |
| **Scalability** | Good | Excellent |
| **Learning Curve** | Easy | Moderate |

---

## 📋 **Module-by-Module Migration Plan**

### **Phase 1: Foundation** 🟡 IN PROGRESS

| # | Module | Express Location | NestJS Location | Status |
|---|--------|-----------------|-----------------|--------|
| 1 | **Project Setup** | N/A | `task-mgmt-nest-mongoose/` | ✅ Complete |
| 2 | **Auth Module** | `src/modules/auth/` | `src/modules/auth/` | ⏳ Next |
| 3 | **Config Module** | `src/config/` | `src/config/` | ⏳ Pending |

### **Phase 2: Core Modules** ⚪

| # | Module | Express Location | NestJS Location | Status |
|---|--------|-----------------|-----------------|--------|
| 4 | **User Module** | `src/modules/user.module/` | `src/modules/user/` | ⏳ Pending |
| 5 | **Task Module** | `src/modules/task.module/` | `src/modules/task/` | ⏳ Pending |
| 6 | **ChildrenBusinessUser** | `src/modules/childrenBusinessUser.module/` | `src/modules/childrenBusinessUser/` | ⏳ Pending |

### **Phase 3: Advanced Modules** ⚪

| # | Module | Express Location | NestJS Location | Status |
|---|--------|-----------------|-----------------|--------|
| 7 | **Analytics Module** | `src/modules/analytics.module/` | `src/modules/analytics/` | ⏳ Pending |
| 8 | **Notification Module** | `src/modules/notification.module/` | `src/modules/notification/` | ⏳ Pending |
| 9 | **Subscription Module** | `src/modules/subscription.module/` | `src/modules/subscription/` | ⏳ Pending |

---

## 🔧 **Key Pattern Changes**

### **1. Routing**

#### Express.js
```typescript
// task.route.ts
router.get(
  '/',
  auth(TRole.commonUser),
  rateLimiter('user'),
  controller.getMyTasks
);
```

#### NestJS
```typescript
// task.controller.ts
@Get()
@UseGuards(AuthGuard, RoleGuard('commonUser'))
@RateLimit('user')
async getMyTasks(@User() user: UserPayload) {
  return this.taskService.getMyTasks(user.userId);
}
```

**Migration Notes**:
- ✅ Routes become decorators (`@Get`, `@Post`)
- ✅ Middleware becomes guards/interceptors
- ✅ Request params become decorators (`@User()`, `@Body()`)

---

### **2. Controllers**

#### Express.js
```typescript
// task.controller.ts
export class TaskController extends GenericController<typeof Task, ITask> {
  getMyTasks = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;
    const filters = omit(req.query, ['sortBy', 'limit', 'page']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    
    const result = await this.taskService.getMyTasks(userId, filters, options);
    
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Tasks retrieved successfully',
    });
  });
}
```

#### NestJS
```typescript
// task.controller.ts
@Controller('tasks')
export class TaskController {
  constructor(private taskService: TaskService) {}
  
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMyTasks(
    @User() user: UserPayload,
    @Query() query: TaskQueryDto,
  ) {
    const result = await this.taskService.getMyTasks(user.userId, query);
    return result;
  }
}
```

**Migration Notes**:
- ✅ No more `req`, `res` - use decorators
- ✅ Automatic validation with DTOs
- ✅ Dependency injection via constructor
- ✅ No need for `catchAsync` - NestJS handles errors

---

### **3. Services**

#### Express.js
```typescript
// task.service.ts
export class TaskService extends GenericService<typeof Task, ITask> {
  constructor() {
    super(Task);
  }
  
  async getMyTasks(userId: string, filters: any, options: any) {
    const query = {
      $or: [
        { ownerUserId: userId },
        { assignedUserIds: userId },
      ],
      isDeleted: false,
    };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    return await this.model.paginate(query, options);
  }
}
```

#### NestJS
```typescript
// task.service.ts
@Injectable()
export class TaskService {
  constructor(
    @InjectModel('Task') private taskModel: Model<TaskDocument>,
  ) {}
  
  async getMyTasks(userId: string, query: TaskQueryDto) {
    const filter: Filter<TaskDocument> = {
      $or: [
        { ownerUserId: userId },
        { assignedUserIds: userId },
      ],
      isDeleted: false,
    };
    
    if (query.status) {
      filter.status = query.status;
    }
    
    return await this.taskModel.paginate(filter, query);
  }
}
```

**Migration Notes**:
- ✅ `@Injectable()` decorator
- ✅ Model injection via constructor
- ✅ Type-safe queries with interfaces
- ✅ Same business logic, better structure

---

### **4. Middleware → Guards/Interceptors**

#### Express.js Middleware
```typescript
// auth.ts
const auth = (...roles: TRole[]) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new ApiError(401, 'Unauthorized');
    
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = decoded;
    
    next();
  });
```

#### NestJS Guard
```typescript
// auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) throw new UnauthorizedException();
    
    const payload = await this.jwtService.verifyAsync(token);
    request['user'] = payload;
    
    return true;
  }
}
```

**Migration Notes**:
- ✅ Guards implement `CanActivate` interface
- ✅ Cleaner separation of concerns
- ✅ Better testability
- ✅ Reusable across controllers

---

### **5. Validation**

#### Express.js (Zod)
```typescript
// task.validation.ts
export const createTaskValidationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  taskType: z.enum(['personal', 'singleAssignment', 'collaborative']),
  assignedUserIds: z.array(z.string()).optional(),
});
```

#### NestJS (class-validator)
```typescript
// create-task.dto.ts
export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;
  
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;
  
  @IsEnum(TaskType)
  taskType: TaskType;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedUserIds?: string[];
}
```

**Migration Notes**:
- ✅ Decorator-based validation
- ✅ Type-safe with TypeScript
- ✅ Auto-generated Swagger docs
- ✅ Better IDE support

---

## 🎓 **Learning Path**

### **Step 1: Understand NestJS Basics**
1. Modules (`@Module()`)
2. Controllers (`@Controller()`, `@Get()`, `@Post()`)
3. Providers (Services, `@Injectable()`)
4. Dependency Injection

### **Step 2: Learn Advanced Patterns**
1. Guards (`CanActivate`)
2. Interceptors (`NestInterceptor`)
3. Pipes (`PipeTransform`)
4. Filters (`ExceptionFilter`)

### **Step 3: Master Database Integration**
1. Mongoose with `@nestjs/mongoose`
2. Repository Pattern
3. Virtual Populate
4. Transactions

### **Step 4: Infrastructure**
1. Redis caching
2. BullMQ queues
3. Rate limiting
4. Health checks

---

## 📊 **Comparison Table**

| Feature | Express.js | NestJS | Benefit |
|---------|-----------|--------|---------|
| **Boilerplate** | Low | High | Better structure |
| **Flexibility** | High | Medium | More conventions |
| **Type Safety** | Manual | Automatic | Fewer bugs |
| **Testing** | Manual setup | Built-in | Faster tests |
| **Learning** | Easy | Moderate | Better long-term |
| **Scalability** | Good | Excellent | Enterprise-ready |

---

## ⚠️ **Common Pitfalls**

### **1. Over-Engineering**
```typescript
// ❌ BAD: Too many layers for simple CRUD
@Controller('tasks')
export class TaskController {
  constructor(
    private taskService: TaskService,
    private taskRepository: TaskRepository,
    private taskMapper: TaskMapper,
    private taskValidator: TaskValidator,
  ) {}
}

// ✅ GOOD: Start simple
@Controller('tasks')
export class TaskController {
  constructor(private taskService: TaskService) {}
}
```

### **2. Not Using Decorators**
```typescript
// ❌ BAD: Manual extraction
@Get(':id')
async getTask(@Req() req: Request) {
  const id = req.params.id;
}

// ✅ GOOD: Use decorators
@Get(':id')
async getTask(@Param('id') id: string) {
}
```

### **3. Ignoring Built-in Features**
```typescript
// ❌ BAD: Manual error handling
@Get()
async getTasks() {
  try {
    return await this.taskService.findAll();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ✅ GOOD: Let NestJS handle it
@Get()
async getTasks() {
  return await this.taskService.findAll();
}
```

---

## 🚀 **Next Steps**

1. ✅ **Foundation Complete** - Project structure ready
2. ⏳ **Next**: Auth Module migration
3. ⏳ **Then**: User Module
4. ⏳ **Finally**: Task Module

---

**Last Updated**: 17-03-26  
**Status**: 🟡 In Progress  
**Next Module**: Auth Module

---
-17-03-26
